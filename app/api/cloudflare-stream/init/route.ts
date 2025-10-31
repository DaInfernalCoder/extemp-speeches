import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60; // Fast endpoint, only initializes upload

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the video file metadata from request
    const body = await request.json();
    const { fileName, fileSize, fileType } = body;

    if (!fileName || !fileSize || !fileType) {
      return NextResponse.json(
        { error: 'File metadata (fileName, fileSize, fileType) is required' },
        { status: 400 }
      );
    }

    // Validate file size (1.5 GB max)
    const maxSize = 1.5 * 1024 * 1024 * 1024;
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: 'Video file must be less than 1.5 GB' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!fileType.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a video file.' },
        { status: 400 }
      );
    }

    // Get Cloudflare credentials
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

    if (!accountId || !apiToken) {
      const missingVars = [];
      if (!accountId) missingVars.push('CLOUDFLARE_ACCOUNT_ID');
      if (!apiToken) missingVars.push('CLOUDFLARE_STREAM_API_TOKEN');
      
      console.error('Cloudflare Stream configuration missing:', {
        missing: missingVars,
        accountIdSet: !!accountId,
        apiTokenSet: !!apiToken,
      });
      
      return NextResponse.json(
        { 
          error: `Cloudflare Stream configuration missing: ${missingVars.join(', ')}. Please check your environment variables.`,
          missing: missingVars,
        },
        { status: 500 }
      );
    }

    // For files >200MB, we need to use TUS protocol
    // For files <=200MB, we can use direct upload
    const useDirectUpload = fileSize <= 200 * 1024 * 1024;

    if (useDirectUpload) {
      // Create direct upload URL (for files <=200MB)
      const directUploadResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            maxDurationSeconds: 3600, // 1 hour max duration
          }),
        }
      );

      if (!directUploadResponse.ok) {
        const errorData = await directUploadResponse.json().catch(() => ({}));
        console.error('Cloudflare Stream direct upload error:', errorData);
        return NextResponse.json(
          { error: errorData.errors?.[0]?.message || 'Failed to initialize Cloudflare Stream upload' },
          { status: directUploadResponse.status }
        );
      }

      const uploadData = await directUploadResponse.json();
      
      return NextResponse.json(
        {
          success: true,
          upload_url: uploadData.result?.uploadURL,
          uid: uploadData.result?.uid,
          upload_type: 'direct',
        },
        { status: 200 }
      );
    } else {
      // For TUS resumable upload (for files >200MB)
      // Return the base TUS endpoint - tus-js-client will create the upload session
      // Note: The client will need to include Authorization header when using tus-js-client
      // For now, we'll create the session server-side and return the upload URL
      const tusEndpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`;
      
      const tusResponse = await fetch(tusEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Tus-Resumable': '1.0.0',
          'Upload-Length': fileSize.toString(),
          'Upload-Metadata': Buffer.from(`filename ${fileName},content-type ${fileType}`).toString('base64'),
        },
      });

      if (!tusResponse.ok) {
        const errorData = await tusResponse.json().catch(() => ({}));
        console.error('Cloudflare Stream TUS upload error:', errorData);
        return NextResponse.json(
          { error: errorData.errors?.[0]?.message || 'Failed to initialize Cloudflare Stream TUS upload' },
          { status: tusResponse.status }
        );
      }

      const uploadLocation = tusResponse.headers.get('Location');
      
      if (!uploadLocation) {
        return NextResponse.json(
          { error: 'Failed to get upload URL from Cloudflare Stream' },
          { status: 500 }
        );
      }

      // Construct full URL if Location header is relative
      const tusUploadUrl = uploadLocation.startsWith('http')
        ? uploadLocation
        : `https://api.cloudflare.com${uploadLocation}`;

      // Return the upload URL and indicate it's TUS
      // The client will use this URL with tus-js-client
      return NextResponse.json(
        {
          success: true,
          upload_url: tusUploadUrl,
          upload_type: 'tus',
          // Also include auth token for client to use (though tus-js-client handles this differently)
          account_id: accountId,
        },
        { status: 200 }
      );
    }
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Cloudflare Stream upload init error:', error);

    return NextResponse.json(
      { error: err.message || 'Failed to initialize Cloudflare Stream upload' },
      { status: 500 }
    );
  }
}

