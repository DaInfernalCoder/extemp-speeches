import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { sendBallotNotificationEmail } from '@/lib/resend';

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
    const {
      speech_id,
      gestures,
      delivery,
      pauses,
      content,
      entertaining,
      feedback_text,
      better_than_last,
    } = body;

    // Validate required fields
    if (!speech_id) {
      return NextResponse.json(
        { error: 'Speech ID is required' },
        { status: 400 }
      );
    }

    // Validate ratings are within range
    const ratings = { gestures, delivery, pauses, content, entertaining };
    for (const [key, value] of Object.entries(ratings)) {
      if (typeof value !== 'number' || value < 1 || value > 10) {
        return NextResponse.json(
          { error: `${key} must be a number between 1 and 10` },
          { status: 400 }
        );
      }
    }

    // Check if speech exists and get its details
    const { data: speech, error: speechError } = await supabase
      .from('speeches')
      .select('id, user_id')
      .eq('id', speech_id)
      .single();

    if (speechError || !speech) {
      return NextResponse.json(
        { error: 'Speech not found' },
        { status: 404 }
      );
    }

    // Prevent users from reviewing their own speeches
    if (speech.user_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot review your own speech' },
        { status: 403 }
      );
    }

    // Check if user has already submitted a ballot for this speech
    const { data: existingBallot } = await supabase
      .from('ballots')
      .select('id')
      .eq('speech_id', speech_id)
      .eq('reviewer_id', user.id)
      .single();

    if (existingBallot) {
      return NextResponse.json(
        { error: 'You have already submitted a ballot for this speech' },
        { status: 409 }
      );
    }

    // If better_than_last is true, verify that the speaker has previous speeches
    if (better_than_last) {
      const { data: previousSpeeches } = await supabase
        .from('speeches')
        .select('id, submitted_at')
        .eq('user_id', speech.user_id)
        .order('submitted_at', { ascending: true });

      if (!previousSpeeches || previousSpeeches.length <= 1) {
        return NextResponse.json(
          { error: 'Cannot mark as better than last - speaker has no previous speeches' },
          { status: 400 }
        );
      }

      // Check if current speech is not the first one
      const currentSpeechIndex = previousSpeeches.findIndex(s => s.id === speech_id);
      if (currentSpeechIndex === 0) {
        return NextResponse.json(
          { error: 'Cannot mark as better than last - this is the speaker&apos;s first speech' },
          { status: 400 }
        );
      }
    }

    // Insert the ballot
    const { data, error } = await supabase
      .from('ballots')
      .insert({
        speech_id,
        reviewer_id: user.id,
        gestures,
        delivery,
        pauses,
        content,
        entertaining,
        feedback_text: feedback_text || null,
        better_than_last: better_than_last || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting ballot:', error);
      return NextResponse.json(
        { error: 'Failed to submit ballot' },
        { status: 500 }
      );
    }

    // Get speech owner details and reviewer name for email notification
    const { data: speechOwner } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', speech.user_id)
      .single();

    const { data: reviewer } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();

    const { data: speechDetails } = await supabase
      .from('speeches')
      .select('speech_url')
      .eq('id', speech_id)
      .single();

    // Send email notification to speech owner
    if (speechOwner?.email && reviewer?.name && speechDetails?.speech_url) {
      try {
        await sendBallotNotificationEmail(
          speechOwner.email,
          speechOwner.name || 'Speaker',
          {
            reviewerName: reviewer.name,
            gestures,
            delivery,
            pauses,
            content,
            entertaining,
            betterThanLast: better_than_last || false,
            feedbackText: feedback_text || null,
            speechUrl: speechDetails.speech_url,
          }
        );
      } catch (emailError) {
        console.error('Error sending ballot notification email:', emailError);
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

