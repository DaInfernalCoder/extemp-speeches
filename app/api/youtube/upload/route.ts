import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

// Disable body parser for this route to handle large files
export const runtime = 'nodejs';
export const maxDuration = 600; // 10 minutes for large uploads

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

// Helper function to handle chunk upload response
async function handleChunkResponse(
  response: Response,
  uploadUrl: string,
  accessToken: string,
  refreshToken: string | undefined,
  oauth2Client: OAuth2Client,
  uploadedBytes: number,
  chunkSize: number,
  totalSize: number,
  chunk: Uint8Array,
  contentRange: string
): Promise<{ complete: boolean; youtubeUrl?: string; newAccessToken?: string; nextByte: number }> {
  // Handle token expiration during chunk upload
  let currentResponse = response;
  if (response.status === 401 && refreshToken) {
    try {
      const newToken = await refreshAccessToken(oauth2Client, refreshToken);
      // Retry this chunk with refreshed token
      const retryResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'Content-Length': chunkSize.toString(),
          'Content-Range': contentRange,
        },
        body: Buffer.from(chunk),
      });

      if (!retryResponse.ok && retryResponse.status !== 308 && retryResponse.status !== 201 && retryResponse.status !== 200) {
        const errorData = await retryResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to upload chunk after token refresh');
      }
      
      currentResponse = retryResponse;
      accessToken = newToken;
    } catch (refreshError) {
      throw new Error('YouTube access token expired during upload. Please log out and log in again.');
    }
  }

  // 308 Resume Incomplete - continue with next chunk
  if (currentResponse.status === 308) {
    const rangeHeader = currentResponse.headers.get('Range');
    let nextByte = uploadedBytes + chunkSize;
    if (rangeHeader) {
      // YouTube tells us what bytes were received
      const match = rangeHeader.match(/bytes=0-(\d+)/);
      if (match) {
        nextByte = parseInt(match[1], 10) + 1;
      }
    }
    return { complete: false, newAccessToken: accessToken, nextByte };
  }
  // 201/200 Created/OK - upload complete
  else if (currentResponse.status === 201 || currentResponse.status === 200) {
    const videoData = await currentResponse.json();
    const videoId = videoData.id;
    
    if (!videoId) {
      throw new Error('Failed to get video ID from YouTube');
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    return { complete: true, youtubeUrl, nextByte: totalSize };
  }
  // Error status
  else {
    const errorData = await currentResponse.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Upload failed with status ${currentResponse.status}`);
  }
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

    // Get the video file from form data
    const formData = await request.formData();
    const videoFile = formData.get('video_file') as File | null;

    if (!videoFile) {
      return NextResponse.json(
        { error: 'Video file is required' },
        { status: 400 }
      );
    }

    // Validate file size (1.5 GB max)
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

    // Step 1: Initialize resumable upload session
    // POST to YouTube API with metadata to get upload URL
    const initResponse = await fetch(
      `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': videoFile.type,
          'X-Upload-Content-Length': videoFile.size.toString(),
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
              'X-Upload-Content-Type': videoFile.type,
              'X-Upload-Content-Length': videoFile.size.toString(),
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

    // Step 2: Upload video in chunks using streaming
    // Stream the file instead of loading entire file into memory
    const fileStream = videoFile.stream();
    const reader = fileStream.getReader();
    
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    const totalSize = videoFile.size;
    let uploadedBytes = 0;
    let chunkBuffer: Uint8Array[] = [];
    let chunkBufferSize = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Upload remaining buffered data if any
          if (chunkBufferSize > 0) {
            const finalChunk = new Uint8Array(chunkBufferSize);
            let offset = 0;
            for (const buf of chunkBuffer) {
              finalChunk.set(buf, offset);
              offset += buf.length;
            }
            
            const contentRange = `bytes ${uploadedBytes}-${uploadedBytes + chunkBufferSize - 1}/${totalSize}`;
            
            const uploadResponse = await fetch(uploadUrl, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Length': chunkBufferSize.toString(),
                'Content-Range': contentRange,
              },
              body: finalChunk,
            });
            
            const result = await handleChunkResponse(
              uploadResponse,
              uploadUrl,
              accessToken,
              refreshToken || undefined,
              oauth2Client,
              uploadedBytes,
              chunkBufferSize,
              totalSize,
              finalChunk,
              contentRange
            );
            if (result.complete) {
              return NextResponse.json(
                { success: true, youtube_url: result.youtubeUrl! },
                { status: 200 }
              );
            }
            if (result.newAccessToken) {
              accessToken = result.newAccessToken;
            }
            uploadedBytes = result.nextByte;
          }
          break;
        }
        
        // Add to chunk buffer
        chunkBuffer.push(value);
        chunkBufferSize += value.length;
        
        // Upload when chunk size reached
        if (chunkBufferSize >= chunkSize) {
          // Combine buffers into single chunk
          const chunk = new Uint8Array(chunkBufferSize);
          let offset = 0;
          for (const buf of chunkBuffer) {
            chunk.set(buf, offset);
            offset += buf.length;
          }
          
          const contentRange = `bytes ${uploadedBytes}-${uploadedBytes + chunkBufferSize - 1}/${totalSize}`;
          
          const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Length': chunkBufferSize.toString(),
              'Content-Range': contentRange,
            },
            body: chunk,
          });
          
          const result = await handleChunkResponse(
            uploadResponse,
            uploadUrl,
            accessToken,
            refreshToken || undefined,
            oauth2Client,
            uploadedBytes,
            chunkBufferSize,
            totalSize,
            chunk,
            contentRange
          );
          if (result.complete) {
            return NextResponse.json(
              { success: true, youtube_url: result.youtubeUrl! },
              { status: 200 }
            );
          }
          if (result.newAccessToken) {
            accessToken = result.newAccessToken;
          }
          uploadedBytes = result.nextByte;
          
          // Reset chunk buffer
          chunkBuffer = [];
          chunkBufferSize = 0;
        }
      }
    } finally {
      reader.releaseLock();
    }

    // If we exit the loop without getting completion, something went wrong
    return NextResponse.json(
      { error: 'Upload incomplete - failed to complete chunked upload' },
      { status: 500 }
    );
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    console.error('YouTube upload error:', error);

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
      { error: err.message || 'Failed to upload video to YouTube' },
      { status: 500 }
    );
  }
}

