import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type RpcLeaderboardEntry = {
  speech_details?: Array<{
    ballots?: Array<{
      id?: string;
    }>;
  }>;
};

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

    // Always use direct query to ensure ballot IDs are included
    // RPC function might not include ballot IDs which breaks delete functionality
    // Query to get leaderboard data with weekly and all-time counts
    const { data, error } = await supabase.rpc('get_leaderboard', {
      current_week_start: weekStartDate
    });

    // Always use direct query to ensure we have ballot IDs
    // Uncomment the line below if RPC doesn't include ballot IDs
    if (true || error) {
      // If the RPC function doesn't exist, fall back to a direct query
      console.log('Using direct query to ensure ballot IDs are included');
      
      const { data: speeches, error: speechesError } = await supabase
        .from('speeches')
        .select(`
          id,
          user_id,
          speech_url,
          week_start_date,
          submitted_at,
          ballots(
            id,
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
          )
        `);

      if (speechesError) {
        console.error('Error fetching speeches:', speechesError);
        return NextResponse.json(
          { error: 'Failed to fetch leaderboard data' },
          { status: 500 }
        );
      }

      // Get all unique user IDs from speeches
      const userIds = new Set<string>();
      speeches?.forEach((speech: { user_id: string }) => {
        userIds.add(speech.user_id);
      });

      // Fetch user information for all speakers
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .in('id', Array.from(userIds));

      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      const userMap = new Map(
        users?.map(u => [u.id, { name: u.name, avatar_url: u.avatar_url }]) || []
      );

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
        submitted_at: string;
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
        const user = userMap.get(userId);
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
          submitted_at: speech.submitted_at,
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

    // If RPC function succeeded (shouldn't reach here due to forced fallback above)
    // but handle it just in case - ensure ballots have IDs
    if (data && Array.isArray(data)) {
      // Check if ballots are missing IDs and warn
      const hasMissingIds = (data as RpcLeaderboardEntry[]).some((entry) =>
        entry.speech_details?.some((speechDetail) =>
          speechDetail.ballots?.some((ballot) => !ballot.id)
        )
      );
      
      if (hasMissingIds) {
        console.warn('RPC function returned ballots without IDs, falling back to direct query');
        // Force fallback to direct query by setting error condition
      } else {
        return NextResponse.json({ data });
      }
    }

    return NextResponse.json({ data: [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

