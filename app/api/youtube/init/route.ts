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
      console.error('[DEBUG] Auth failed:', authError?.message);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get session to access provider_token
    const { data: { session } } = await supabase.auth.getSession();

    // Get provider token (Google OAuth access token)
    if (!session?.provider_token) {
      return NextResponse.json(
        { error: 'Google OAuth token not found. Please sign in with Google and grant YouTube upload permissions.' },
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

    // Initialize YouTube resumable upload session
    // YouTube API v3 resumable upload endpoint
    const youtubeInitUrl = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable';

    // Extract video title from filename (remove extension)
    const videoTitle = fileName.replace(/\.[^/.]+$/, '') || 'Untitled Speech';

    // Prepare video metadata
    const videoMetadata = {
      snippet: {
        title: videoTitle,
        description: `Extemporaneous speech uploaded on ${new Date().toLocaleDateString()}`,
      },
      status: {
        privacyStatus: 'unlisted',
      },
    };

    console.log('[DEBUG] Initializing YouTube resumable upload:', {
      fileName,
      fileSize,
      fileType,
      videoTitle,
    });

    // Create resumable upload session
    const initResponse = await fetch(youtubeInitUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.provider_token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': fileType,
        'X-Upload-Content-Length': fileSize.toString(),
      },
      body: JSON.stringify(videoMetadata),
    });

    if (!initResponse.ok) {
      const errorData = await initResponse.json().catch(() => ({
        error: {
          message: initResponse.statusText,
          code: initResponse.status,
        },
      }));

      console.error('YouTube upload init error:', {
        status: initResponse.status,
        statusText: initResponse.statusText,
        error: errorData,
      });

      // Handle specific error cases
      if (initResponse.status === 401) {
        return NextResponse.json(
          { error: 'Invalid or expired Google OAuth token. Please sign in again and grant YouTube upload permissions.' },
          { status: 401 }
        );
      }

      if (initResponse.status === 403) {
        return NextResponse.json(
          { error: 'YouTube upload permission not granted. Please sign in again and grant YouTube upload access.' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to initialize YouTube upload' },
        { status: initResponse.status }
      );
    }

    // Get resumable upload URL from Location header
    const uploadUrl = initResponse.headers.get('Location');

    if (!uploadUrl) {
      return NextResponse.json(
        { error: 'Failed to get upload URL from YouTube API' },
        { status: 500 }
      );
    }

    console.log('[DEBUG] YouTube resumable upload URL obtained:', {
      uploadUrl: uploadUrl.substring(0, 100) + '...',
    });

    return NextResponse.json(
      {
        success: true,
        upload_url: uploadUrl,
        upload_type: 'resumable',
        file_size: fileSize,
        file_type: fileType,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('YouTube upload init error:', error);

    return NextResponse.json(
      { error: err.message || 'Failed to initialize YouTube upload' },
      { status: 500 }
    );
  }
}

