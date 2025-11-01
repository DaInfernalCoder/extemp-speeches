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

    // Get user's focus area
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('focus_area')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user focus area:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch focus area' },
        { status: 500 }
      );
    }

    const focusArea = userData?.focus_area || null;

    // If no focus area, return early
    if (!focusArea) {
      return NextResponse.json({
        focus_area: null,
        focus_area_ratings: [],
        total_ratings: 0,
        recent_average: null,
        previous_average: null,
        growth_percentage: null,
      });
    }

    // Get all speeches by this user
    const { data: speeches, error: speechesError } = await supabase
      .from('speeches')
      .select('id')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: true });

    if (speechesError) {
      console.error('Error fetching speeches:', speechesError);
      return NextResponse.json(
        { error: 'Failed to fetch speech data' },
        { status: 500 }
      );
    }

    const speechIds = speeches?.map(s => s.id) || [];

    // Get all focus area ratings for this user's speeches
    const { data: ballots, error: ballotsError } = await supabase
      .from('ballots')
      .select('focus_area_rating, created_at')
      .in('speech_id', speechIds)
      .not('focus_area_rating', 'is', null)
      .order('created_at', { ascending: true });

    if (ballotsError) {
      console.error('Error fetching focus area ratings:', ballotsError);
      return NextResponse.json(
        { error: 'Failed to fetch rating data' },
        { status: 500 }
      );
    }

    const ratings = ballots?.map(b => ({
      rating: b.focus_area_rating!,
      created_at: b.created_at,
    })) || [];

    // Calculate growth percentage if we have 2+ ratings
    let growthPercentage = null;
    let recentAverage = null;
    let previousAverage = null;

    if (ratings.length >= 2) {
      // Split ratings into recent and previous halves
      const midpoint = Math.floor(ratings.length / 2);
      const previousRatings = ratings.slice(0, midpoint);
      const recentRatings = ratings.slice(midpoint);

      previousAverage = previousRatings.reduce((sum, r) => sum + r.rating, 0) / previousRatings.length;
      recentAverage = recentRatings.reduce((sum, r) => sum + r.rating, 0) / recentRatings.length;

      // Calculate percentage growth
      if (previousAverage > 0) {
        growthPercentage = ((recentAverage - previousAverage) / previousAverage) * 100;
      }
    } else if (ratings.length === 1) {
      recentAverage = ratings[0].rating;
    }

    return NextResponse.json({
      focus_area: focusArea,
      focus_area_ratings: ratings,
      total_ratings: ratings.length,
      recent_average: recentAverage,
      previous_average: previousAverage,
      growth_percentage: growthPercentage,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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

    const body = await request.json();
    const { focus_area } = body;

    // Validate focus_area
    if (focus_area !== null && focus_area !== undefined) {
      if (typeof focus_area !== 'string') {
        return NextResponse.json(
          { error: 'Focus area must be a string' },
          { status: 400 }
        );
      }
      
      const trimmed = focus_area.trim();
      if (trimmed.length === 0) {
        return NextResponse.json(
          { error: 'Focus area cannot be empty' },
          { status: 400 }
        );
      }
    }

    // Update user's focus area
    const { error: updateError } = await supabase
      .from('users')
      .update({ focus_area: focus_area ? focus_area.trim() : null })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating focus area:', updateError);
      return NextResponse.json(
        { error: 'Failed to update focus area' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      focus_area: focus_area ? focus_area.trim() : null,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

