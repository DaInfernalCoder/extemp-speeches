import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300; // Allow longer duration for large chunk uploads

export async function PUT(request: Request) {
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

    // Get session to access provider_token
    const { data: { session } } = await supabase.auth.getSession();

    // Get provider token (Google OAuth access token)
    if (!session?.provider_token) {
      return NextResponse.json(
        { error: 'Google OAuth token not found. Please sign in with Google and grant YouTube upload permissions.' },
        { status: 401 }
      );
    }

    // Get chunk data and metadata from request
    const body = await request.json();
    const { 
      chunkData, // Base64 encoded chunk
      resumableUploadUrl,
      contentRange,
      contentType
    } = body;

    if (!chunkData || !resumableUploadUrl || !contentRange || !contentType) {
      return NextResponse.json(
        { error: 'chunkData, resumableUploadUrl, contentRange, and contentType are required' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    let chunkBuffer: Buffer;
    try {
      // Remove data URL prefix if present (e.g., "data:video/quicktime;base64,")
      const base64Data = chunkData.includes(',') ? chunkData.split(',')[1] : chunkData;
      chunkBuffer = Buffer.from(base64Data, 'base64');
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid chunk data format' },
        { status: 400 }
      );
    }

    // Forward chunk to YouTube
    // Convert Buffer to Uint8Array for fetch (compatible with BodyInit)
    const uint8Array = new Uint8Array(chunkBuffer);
    
    const youtubeResponse = await fetch(resumableUploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.provider_token}`,
        'Content-Type': contentType,
        'Content-Range': contentRange,
      },
      body: uint8Array,
    });

    // Get response headers
    const rangeHeader = youtubeResponse.headers.get('Range');

    // Handle different response statuses
    if (youtubeResponse.status === 200) {
      // Upload complete - return video data
      const videoData = await youtubeResponse.json();
      return NextResponse.json(
        {
          success: true,
          status: 200,
          videoData,
          rangeHeader: rangeHeader || null,
        }
      );
    } else if (youtubeResponse.status === 308) {
      // Resume incomplete - return Range header in response body
      return NextResponse.json(
        {
          success: true,
          status: 308,
          rangeHeader: rangeHeader || null,
        }
      );
    } else {
      // Error response
      let errorMessage = '';
      try {
        const errorData = await youtubeResponse.json();
        errorMessage = errorData.error?.message || youtubeResponse.statusText;
      } catch {
        errorMessage = youtubeResponse.statusText;
      }

      // Handle specific error cases
      if (youtubeResponse.status === 401) {
        return NextResponse.json(
          { error: 'YouTube authentication failed. Please sign in again and grant YouTube upload permissions.' },
          { status: 401 }
        );
      }

      if (youtubeResponse.status === 403) {
        const errorMessageLower = errorMessage.toLowerCase();
        if (errorMessageLower.includes('quota') || errorMessageLower.includes('daily') || errorMessageLower.includes('limit')) {
          return NextResponse.json(
            { error: 'YouTube upload quota exceeded. Please try again later or contact support.' },
            { status: 403 }
          );
        }
        return NextResponse.json(
          { error: 'YouTube rejected the upload. Your account may have exceeded its upload quota.' },
          { status: 403 }
        );
      }

      if (youtubeResponse.status === 429) {
        return NextResponse.json(
          { error: 'YouTube API rate limit exceeded. Please wait a few minutes and try again.' },
          { status: 429 }
        );
      }

      if (youtubeResponse.status === 503) {
        return NextResponse.json(
          { error: 'YouTube service is temporarily unavailable. Please try again in a few minutes.' },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: errorMessage || `YouTube upload failed (status ${youtubeResponse.status})` },
        { status: youtubeResponse.status }
      );
    }
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('YouTube chunk upload proxy error:', error);

    return NextResponse.json(
      { error: err.message || 'Failed to upload chunk to YouTube' },
      { status: 500 }
    );
  }
}

