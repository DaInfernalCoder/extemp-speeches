import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { sendSpeechSubmissionAlert } from '@/lib/resend';

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
  return patterns.some(pattern => pattern.test(url.trim()));
}

// Validate Cloudflare Stream URL or UID (for video uploads)
function isValidCloudflareStreamUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/.*\.cloudflarestream\.com\/[\w-]+\/watch/,
    /^https?:\/\/.*\.videodelivery\.net\/[\w-]+/,
    /^[\w-]+$/, // Just a video UID
  ];
  return patterns.some(pattern => pattern.test(url.trim()));
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

    // Handle application/json (YouTube URL, Stream UID, or Supabase Storage URL)
    const body = await request.json();
    const { speech_url } = body;

    if (!speech_url) {
      return NextResponse.json(
        { error: 'Speech URL is required' },
        { status: 400 }
      );
    }

    let speechUrl: string;

    // Check if it's a YouTube URL
    if (isValidYouTubeUrl(speech_url)) {
      speechUrl = speech_url;
    }
    // Check if it's a Cloudflare Stream UID/URL
    else if (isValidCloudflareStreamUrl(speech_url)) {
      speechUrl = speech_url;
    }
    // Check if it's a Supabase Storage URL (audio file uploaded via signed URL)
    else if (speech_url.includes('supabase') && speech_url.includes('storage')) {
      speechUrl = speech_url;
    }
    else {
      return NextResponse.json(
        { error: 'Invalid URL format. Please provide a valid YouTube link, Cloudflare Stream URL/UID, or audio file URL.' },
        { status: 400 }
      );
    }

    // Check for duplicate URL for this user
    const { data: existingSpeech } = await supabase
      .from('speeches')
      .select('id')
      .eq('user_id', user.id)
      .eq('speech_url', speechUrl)
      .single();

    if (existingSpeech) {
      return NextResponse.json(
        { error: 'You have already submitted this recording' },
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
        speech_url: speechUrl,
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

    // Get user name for email notification
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();

    // Send email notification to Arnav and Sumit
    if (userData?.name) {
      try {
        await sendSpeechSubmissionAlert({
          speakerName: userData.name,
          speechUrl: speechUrl,
          submittedAt: new Date().toISOString(),
        });
      } catch (emailError) {
        console.error('Error sending speech submission alert:', emailError);
        // Don't fail the request if email fails
      }
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

