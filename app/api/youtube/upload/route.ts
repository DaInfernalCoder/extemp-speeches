import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user, session }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the video file from form data
    const formData = await request.formData();
    const videoFile = formData.get('video_file') as File | null;

    if (!videoFile) {
      return NextResponse.json(
        { error: 'Video file is required' },
        { status: 400 }
      );
    }

    // Validate file size (1.5 GB max for serverless)
    const maxSize = 1.5 * 1024 * 1024 * 1024;
    if (videoFile.size > maxSize) {
      return NextResponse.json(
        { error: 'Video file must be less than 1.5 GB' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!videoFile.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a video file.' },
        { status: 400 }
      );
    }

    // Get OAuth access token from Supabase session
    const accessToken = session.provider_token;
    const refreshToken = session.provider_refresh_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'YouTube access token not found. Please log out and log in again to grant YouTube permissions.' },
        { status: 403 }
      );
    }

    // Set up OAuth2 client with tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Create YouTube API client
    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    // Convert File to stream
    const arrayBuffer = await videoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    // Generate title with timestamp
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const title = `Extemp Speech - ${dateStr} ${timeStr}`;

    // Upload video to YouTube
    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: title,
          description: 'Extemporaneous speech recording',
        },
        status: {
          privacyStatus: 'unlisted',
        },
      },
      media: {
        body: stream,
      },
    });

    const videoId = response.data.id;
    if (!videoId) {
      return NextResponse.json(
        { error: 'Failed to get video ID from YouTube' },
        { status: 500 }
      );
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    return NextResponse.json(
      { success: true, youtube_url: youtubeUrl },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    console.error('YouTube upload error:', error);

    // Handle token expiration
    if (err.code === 401 || err.message?.includes('invalid_grant')) {
      return NextResponse.json(
        { error: 'YouTube access token expired. Please log out and log in again.' },
        { status: 401 }
      );
    }

    // Handle quota exceeded
    if (err.code === 403 && err.message?.includes('quota')) {
      return NextResponse.json(
        { error: 'YouTube API quota exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: err.message || 'Failed to upload video to YouTube' },
      { status: 500 }
    );
  }
}

