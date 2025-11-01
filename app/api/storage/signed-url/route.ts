import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

    const { fileName, fileSize, fileType, bucket } = await request.json();

    // Validate inputs
    if (!fileName || !fileSize || !fileType || !bucket) {
      return NextResponse.json(
        { error: 'fileName, fileSize, fileType, and bucket are required' },
        { status: 400 }
      );
    }

    // Validate bucket name
    const validBuckets = ['speech-audio'];
    if (!validBuckets.includes(bucket)) {
      return NextResponse.json(
        { error: 'Invalid bucket' },
        { status: 400 }
      );
    }

    // Validate file size based on bucket
    const maxSize = 50 * 1024 * 1024; // 50 MB default for audio
    if (bucket === 'speech-audio' && fileSize > maxSize) {
      return NextResponse.json(
        { error: `File must be less than ${maxSize / 1024 / 1024} MB` },
        { status: 400 }
      );
    }

    // Validate file type based on bucket
    if (bucket === 'speech-audio' && !fileType.startsWith('audio/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an audio file.' },
        { status: 400 }
      );
    }

    // Generate unique file path
    const fileExt = fileName.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    // Verify bucket exists and is accessible
    const { error: bucketError } = await supabase.storage
      .from(bucket)
      .list('', { limit: 1, offset: 0 });

    if (bucketError) {
      console.error('Error accessing bucket:', {
        bucket,
        error: bucketError,
        message: bucketError.message,
        details: bucketError,
      });
      
      // If bucket doesn't exist, provide helpful error
      const errorMessage = bucketError.message?.toLowerCase() || '';
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        return NextResponse.json(
          { 
            error: `Bucket "${bucket}" not found. Please ensure the bucket exists in Supabase Storage.`,
            details: bucketError.message,
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to access storage bucket',
          details: bucketError.message,
        },
        { status: 500 }
      );
    }

    // Get signed upload URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(filePath, {
        upsert: false,
      });

    if (error) {
      console.error('Error creating signed URL:', {
        bucket,
        filePath,
        error: error,
        message: error.message,
        details: error,
      });
      
      // Check for bucket not found errors
      const errorMessage = error.message?.toLowerCase() || '';
      const isNotFound = errorMessage.includes('not found') || errorMessage.includes('404');
      
      return NextResponse.json(
        { 
          error: 'Failed to create upload URL',
          details: error.message || 'Unknown error',
        },
        { status: isNotFound ? 404 : 500 }
      );
    }

    // Get public URL for the file (will be available after upload)
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      signed_url: data.signedUrl,
      public_url: publicUrl,
      file_path: filePath,
    });
  } catch (error) {
    console.error('Unexpected error:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
