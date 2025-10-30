import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Helper function to get the Monday of the current week
function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

// Validate YouTube URL
function isValidYouTubeUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^https?:\/\/youtu\.be\/[\w-]+/,
  ];
  return patterns.some(pattern => pattern.test(url));
}

export async function POST(request: Request) {
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
    const { youtube_url } = body;

    if (!youtube_url) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Validate YouTube URL format
    if (!isValidYouTubeUrl(youtube_url)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL format. Please provide a valid YouTube link.' },
        { status: 400 }
      );
    }

    // Check for duplicate URL for this user
    const { data: existingSpeech } = await supabase
      .from('speeches')
      .select('id')
      .eq('user_id', user.id)
      .eq('youtube_url', youtube_url)
      .single();

    if (existingSpeech) {
      return NextResponse.json(
        { error: 'You have already submitted this YouTube URL' },
        { status: 409 }
      );
    }

    // Calculate week start date
    const weekStartDate = getWeekStartDate(new Date());

    // Insert the speech
    const { data, error } = await supabase
      .from('speeches')
      .insert({
        user_id: user.id,
        youtube_url,
        week_start_date: weekStartDate,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting speech:', error);
      return NextResponse.json(
        { error: 'Failed to submit speech' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

