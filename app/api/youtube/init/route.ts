import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

export const runtime = 'nodejs';
export const maxDuration = 60; // Fast endpoint, only initializes upload

// Helper function to refresh OAuth token
async function refreshAccessToken(
  oauth2Client: OAuth2Client,
  refreshToken: string
): Promise<string> {
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token');
  }
  return credentials.access_token;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Check authentication and get session with provider tokens
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session || !session.user) {
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

    // Get OAuth access token from Supabase session
    let accessToken = session.provider_token;
    const refreshToken = session.provider_refresh_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'YouTube access token not found. Please log out and log in again to grant YouTube permissions.' },
        { status: 403 }
      );
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Generate title with timestamp
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const title = `Extemp Speech - ${dateStr} ${timeStr}`;

    // Initialize resumable upload session
    // POST to YouTube API with metadata to get upload URL
    const initResponse = await fetch(
      `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': fileType,
          'X-Upload-Content-Length': fileSize.toString(),
        },
        body: JSON.stringify({
          snippet: {
            title: title,
            description: 'Extemporaneous speech recording',
          },
          status: {
            privacyStatus: 'unlisted',
          },
        }),
      }
    );

    // Handle token expiration during initialization
    let finalInitResponse = initResponse;
    if (initResponse.status === 401 && refreshToken) {
      try {
        accessToken = await refreshAccessToken(oauth2Client, refreshToken);
        // Retry initialization with refreshed token
        const retryResponse = await fetch(
          `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json; charset=UTF-8',
              'X-Upload-Content-Type': fileType,
              'X-Upload-Content-Length': fileSize.toString(),
            },
            body: JSON.stringify({
              snippet: {
                title: title,
                description: 'Extemporaneous speech recording',
              },
              status: {
                privacyStatus: 'unlisted',
              },
            }),
          }
        );
        
        if (!retryResponse.ok) {
          const errorData = await retryResponse.json().catch(() => ({}));
          throw new Error(errorData.error?.message || 'Failed to initialize upload after token refresh');
        }
        
        finalInitResponse = retryResponse;
      } catch (refreshError) {
        return NextResponse.json(
          { error: 'YouTube access token expired. Please log out and log in again.' },
          { status: 401 }
        );
      }
    }

    if (!finalInitResponse.ok) {
      const errorData = await finalInitResponse.json().catch(() => ({}));
      
      // Handle quota exceeded
      if (finalInitResponse.status === 403) {
        return NextResponse.json(
          { error: 'YouTube API quota exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      throw new Error(errorData.error?.message || 'Failed to initialize YouTube upload');
    }

    // Get upload URL from Location header
    const uploadUrl = finalInitResponse.headers.get('Location');
    if (!uploadUrl) {
      return NextResponse.json(
        { error: 'Failed to get upload URL from YouTube' },
        { status: 500 }
      );
    }

    // Return upload URL to client for direct upload
    return NextResponse.json(
      { 
        success: true, 
        upload_url: uploadUrl,
        file_size: fileSize,
        file_type: fileType,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    console.error('YouTube upload init error:', error);

    // Handle token expiration
    if (err.code === 401 || err.message?.includes('invalid_grant') || err.message?.includes('token')) {
      return NextResponse.json(
        { error: 'YouTube access token expired. Please log out and log in again.' },
        { status: 401 }
      );
    }

    // Handle quota exceeded
    if (err.code === 403 || err.message?.includes('quota')) {
      return NextResponse.json(
        { error: 'YouTube API quota exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: err.message || 'Failed to initialize YouTube upload' },
      { status: 500 }
    );
  }
}

