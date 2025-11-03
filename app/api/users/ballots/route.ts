import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
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

    // Get all speeches by this user
    const { data: speeches, error: speechesError } = await supabase
      .from('speeches')
      .select('id, speech_url, submitted_at')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false });

    if (speechesError) {
      console.error('Error fetching speeches:', speechesError);
      return NextResponse.json(
        { error: 'Failed to fetch speeches' },
        { status: 500 }
      );
    }

    if (!speeches || speeches.length === 0) {
      return NextResponse.json({ ballots: [] });
    }

    const speechIds = speeches.map(s => s.id);

    // Get all ballots for this user's speeches
    const { data: ballots, error: ballotsError } = await supabase
      .from('ballots')
      .select(`
        id,
        speech_id,
        gestures,
        delivery,
        pauses,
        content,
        entertaining,
        feedback_text,
        better_than_last,
        focus_area_rating,
        created_at,
        reviewer_id
      `)
      .in('speech_id', speechIds)
      .order('created_at', { ascending: false });

    if (ballotsError) {
      console.error('Error fetching ballots:', ballotsError);
      return NextResponse.json(
        { error: 'Failed to fetch ballots' },
        { status: 500 }
      );
    }

    // Get reviewer names
    const reviewerIds = new Set<string>();
    ballots?.forEach((ballot: { reviewer_id: string }) => {
      if (ballot.reviewer_id) {
        reviewerIds.add(ballot.reviewer_id);
      }
    });

    const { data: reviewers } = await supabase
      .from('users')
      .select('id, name')
      .in('id', Array.from(reviewerIds));

    const reviewerMap = new Map(
      reviewers?.map(r => [r.id, r.name]) || []
    );

    // Create a map of speech_id to speech details
    const speechMap = new Map(
      speeches.map(s => [s.id, { speech_url: s.speech_url, submitted_at: s.submitted_at }])
    );

    // Combine ballots with reviewer names and speech details
    const ballotsWithDetails = ballots?.map((ballot: {
      id: string;
      speech_id: string;
      gestures: number;
      delivery: number;
      pauses: number;
      content: number;
      entertaining: number;
      feedback_text?: string;
      better_than_last: boolean;
      focus_area_rating?: number | null;
      created_at: string;
      reviewer_id: string;
    }) => ({
      ...ballot,
      reviewer_name: reviewerMap.get(ballot.reviewer_id) || 'Anonymous',
      speech_url: speechMap.get(ballot.speech_id)?.speech_url,
      speech_submitted_at: speechMap.get(ballot.speech_id)?.submitted_at,
    })) || [];

    return NextResponse.json({ ballots: ballotsWithDetails });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

