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

    // Get user&apos;s streak data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('current_streak, longest_streak, last_streak_date, streak_updated_at')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user streak:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch streak data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      current_streak: userData?.current_streak || 0,
      longest_streak: userData?.longest_streak || 0,
      last_streak_date: userData?.last_streak_date || null,
      streak_updated_at: userData?.streak_updated_at || null,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

