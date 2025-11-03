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

    const { id: ballotId } = await context.params;

    // Fetch the ballot to verify ownership
    const { data: ballot, error: fetchError } = await supabase
      .from('ballots')
      .select('id, reviewer_id')
      .eq('id', ballotId)
      .single();

    if (fetchError || !ballot) {
      return NextResponse.json(
        { error: 'Ballot not found' },
        { status: 404 }
      );
    }

    // Verify the user owns this ballot (only the reviewer can delete their ballot)
    if (ballot.reviewer_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own ballots' },
        { status: 403 }
      );
    }

    // Delete the ballot
    const { error: deleteError } = await supabase
      .from('ballots')
      .delete()
      .eq('id', ballotId);

    if (deleteError) {
      console.error('Error deleting ballot:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete ballot' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Ballot deleted successfully' },
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
