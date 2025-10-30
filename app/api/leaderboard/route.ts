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
        .select('user_id, speech_url, week_start_date, users(name, avatar_url)');

      if (speechesError) {
        console.error('Error fetching speeches:', speechesError);
        return NextResponse.json(
          { error: 'Failed to fetch leaderboard data' },
          { status: 500 }
        );
      }

      // Calculate stats in JavaScript
      const userStats = new Map();
      
      speeches?.forEach((speech: any) => {
        const userId = speech.user_id;
        if (!userStats.has(userId)) {
          userStats.set(userId, {
            name: speech.users?.name || 'Anonymous',
            avatar_url: speech.users?.avatar_url,
            all_time_speeches: 0,
            weekly_speeches: 0,
            speech_urls: [],
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

