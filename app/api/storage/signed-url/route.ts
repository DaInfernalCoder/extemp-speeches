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

    // Get signed upload URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(filePath, {
        upsert: false,
      });

    if (error) {
      console.error('Error creating signed URL:', error);
      return NextResponse.json(
        { error: 'Failed to create upload URL' },
        { status: 500 }
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
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
