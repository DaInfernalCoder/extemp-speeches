import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Helper function to extract Cloudflare Stream video UID from URL
function extractCloudflareStreamUid(url: string): string | null {
  // Pattern 1: https://iframe.videodelivery.net/{uid} or with query params
  const videodeliveryMatch = url.match(/videodelivery\.net\/([a-f0-9]{32})/i);
  if (videodeliveryMatch) {
    return videodeliveryMatch[1];
  }

  // Pattern 2: https://*.cloudflarestream.com/{uid}/watch
  const cloudflarestreamMatch = url.match(/cloudflarestream\.com\/([a-f0-9]{32})\/watch/i);
  if (cloudflarestreamMatch) {
    return cloudflarestreamMatch[1];
  }

  // Pattern 3: Just the UID itself (32-char hex string)
  const uidOnlyMatch = url.match(/^([a-f0-9]{32})$/i);
  if (uidOnlyMatch) {
    return uidOnlyMatch[1];
  }

  return null;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id: speechId } = await context.params;

    // Fetch the speech to verify ownership and get the URL
    const { data: speech, error: fetchError } = await supabase
      .from('speeches')
      .select('id, user_id, speech_url')
      .eq('id', speechId)
      .single();

    if (fetchError || !speech) {
      return NextResponse.json(
        { error: 'Speech not found' },
        { status: 404 }
      );
    }

    // Verify the user owns this speech
    if (speech.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own speeches' },
        { status: 403 }
      );
    }

    // Delete associated ballots first (due to foreign key constraints)
    const { error: ballotsDeleteError } = await supabase
      .from('ballots')
      .delete()
      .eq('speech_id', speechId);

    if (ballotsDeleteError) {
      console.error('Error deleting associated ballots:', ballotsDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete associated ballots' },
        { status: 500 }
      );
    }

    // Check if the speech URL is from Supabase storage (audio file)
    // Supabase storage URLs contain the bucket name 'speech-audio'
    const isSupabaseStorage = speech.speech_url.includes('speech-audio');

    if (isSupabaseStorage) {
      // Extract the file path from the public URL
      // URL format: https://{project-ref}.supabase.co/storage/v1/object/public/speech-audio/{path}
      const urlParts = speech.speech_url.split('/speech-audio/');
      if (urlParts.length === 2) {
        const filePath = urlParts[1];

        // Delete the file from storage
        const { error: storageDeleteError } = await supabase.storage
          .from('speech-audio')
          .remove([filePath]);

        if (storageDeleteError) {
          console.error('Error deleting audio file from storage:', storageDeleteError);
          // Continue with speech deletion even if storage deletion fails
        }
      }
    }

    // Check if the speech URL is from Cloudflare Stream
    const cloudflareUid = extractCloudflareStreamUid(speech.speech_url);

    if (cloudflareUid) {
      // Get Cloudflare credentials
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

      if (accountId && apiToken) {
        try {
          const deleteResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${cloudflareUid}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${apiToken}`,
              },
            }
          );

          if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json().catch(() => ({}));
            console.error('Error deleting video from Cloudflare Stream:', {
              uid: cloudflareUid,
              status: deleteResponse.status,
              error: errorData.errors?.[0]?.message || 'Unknown error',
            });
            // Continue with speech deletion even if Cloudflare deletion fails
          }
        } catch (error) {
          console.error('Error calling Cloudflare Stream API:', error);
          // Continue with speech deletion even if Cloudflare deletion fails
        }
      } else {
        console.warn('Cloudflare Stream credentials not configured. Skipping video deletion.');
      }
    }

    // Delete the speech record
    const { error: deleteError } = await supabase
      .from('speeches')
      .delete()
      .eq('id', speechId);

    if (deleteError) {
      console.error('Error deleting speech:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete speech' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Speech deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
