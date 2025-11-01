import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Helper function to get the Monday of the current week
function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

export async function GET() {
  try {
    const supabase = await createClient();
    const weekStartDate = getWeekStartDate(new Date());

    // Query to get leaderboard data with weekly and all-time counts
    const { data, error } = await supabase.rpc('get_leaderboard', {
      current_week_start: weekStartDate
    });

    if (error) {
      // If the RPC function doesn't exist, fall back to a direct query
      console.log('RPC function not found, using direct query');
      
      const { data: speeches, error: speechesError } = await supabase
        .from('speeches')
        .select(`
          id,
          user_id,
          speech_url,
          week_start_date,
          users(name, avatar_url),
          ballots(
            id,
            gestures,
            delivery,
            pauses,
            content,
            entertaining,
            feedback_text,
            better_than_last,
            created_at,
            reviewer_id
          )
        `);

      if (speechesError) {
        console.error('Error fetching speeches:', speechesError);
        return NextResponse.json(
          { error: 'Failed to fetch leaderboard data' },
          { status: 500 }
        );
      }

      // First, get all reviewer names for ballots
      const reviewerIds = new Set<string>();
      speeches?.forEach((speech: { ballots?: Array<{ reviewer_id: string }> }) => {
        speech.ballots?.forEach((ballot: { reviewer_id: string }) => {
          reviewerIds.add(ballot.reviewer_id);
        });
      });

      // Fetch reviewer information
      const { data: reviewers } = await supabase
        .from('users')
        .select('id, name')
        .in('id', Array.from(reviewerIds));

      const reviewerMap = new Map(
        reviewers?.map(r => [r.id, r.name]) || []
      );

      // Calculate stats in JavaScript
      const userStats = new Map();
      
      speeches?.forEach((speech: {
        user_id: string;
        id: string;
        speech_url: string;
        week_start_date: string;
        users?: Array<{ name?: string; avatar_url?: string }>;
        ballots?: Array<{
          id: string;
          reviewer_id: string;
          gestures: number;
          delivery: number;
          pauses: number;
          content: number;
          entertaining: number;
          feedback_text?: string;
          better_than_last: boolean;
          created_at: string;
        }>;
      }) => {
        const userId = speech.user_id;
        const user = speech.users?.[0];
        if (!userStats.has(userId)) {
          userStats.set(userId, {
            name: user?.name || 'Anonymous',
            avatar_url: user?.avatar_url,
            all_time_speeches: 0,
            weekly_speeches: 0,
            speech_urls: [],
            speech_details: [],
          });
        }
        
        const stats = userStats.get(userId);
        stats.all_time_speeches++;
        if (speech.week_start_date === weekStartDate) {
          stats.weekly_speeches++;
        }
        
        // Add speech URL to the array
        if (speech.speech_url && !stats.speech_urls.includes(speech.speech_url)) {
          stats.speech_urls.push(speech.speech_url);
        }

        // Store speech details with ballots
        const ballotsWithReviewers = speech.ballots?.map((ballot: {
          id: string;
          reviewer_id: string;
          gestures: number;
          delivery: number;
          pauses: number;
          content: number;
          entertaining: number;
          feedback_text?: string;
          better_than_last: boolean;
          created_at: string;
        }) => ({
          ...ballot,
          reviewer_name: reviewerMap.get(ballot.reviewer_id) || 'Anonymous',
        })) || [];

        stats.speech_details.push({
          speech_id: speech.id,
          speech_url: speech.speech_url,
          user_id: speech.user_id,
          ballots: ballotsWithReviewers,
        });
      });

      // Convert to array and sort by all-time speeches
      const leaderboard = Array.from(userStats.values())
        .sort((a, b) => b.all_time_speeches - a.all_time_speeches)
        .map((user, index) => ({
          ...user,
          place: index + 1,
        }));

      return NextResponse.json({ data: leaderboard });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

