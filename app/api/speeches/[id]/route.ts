import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

    // Note: We're not deleting from Cloudflare Stream as that would require additional API calls
    // and Cloudflare Stream storage is relatively cheap. If you want to delete from Cloudflare,
    // you would need to make an API call to Cloudflare Stream API here.

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
