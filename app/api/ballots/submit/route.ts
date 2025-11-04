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
      focus_area_rating,
      new_focus_area,
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

    // Get speaker's focus area to determine validation rules
    const { data: speaker } = await supabase
      .from('users')
      .select('focus_area')
      .eq('id', speech.user_id)
      .single();

    let hasFocusArea = speaker?.focus_area && speaker.focus_area.trim().length > 0;

    // Validate focus area fields based on whether speaker has one
    if (!hasFocusArea) {
      // If speaker has no focus area, require new_focus_area
      if (!new_focus_area || typeof new_focus_area !== 'string' || new_focus_area.trim().length === 0) {
        return NextResponse.json(
          { error: 'Focus area is required. Please specify what the speaker should focus on.' },
          { status: 400 }
        );
      }
      // Validate focus_area_rating should not be provided if no focus area exists
      if (focus_area_rating !== undefined && focus_area_rating !== null) {
        return NextResponse.json(
          { error: 'Focus area rating cannot be provided when speaker has no focus area' },
          { status: 400 }
        );
      }
    } else {
      // If speaker has focus area, require focus_area_rating
      if (focus_area_rating === undefined || focus_area_rating === null) {
        return NextResponse.json(
          { error: 'Focus area rating is required' },
          { status: 400 }
        );
      }
      if (typeof focus_area_rating !== 'number' || focus_area_rating < 1 || focus_area_rating > 10) {
        return NextResponse.json(
          { error: 'Focus area rating must be a number between 1 and 10' },
          { status: 400 }
        );
      }
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

    // Update speaker's focus area BEFORE inserting ballot to ensure data consistency
    // If speaker had no focus area, this update is critical and must succeed
    if (new_focus_area && typeof new_focus_area === 'string' && new_focus_area.trim().length > 0) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ focus_area: new_focus_area.trim() })
        .eq('id', speech.user_id);

      if (updateError) {
        console.error('Error updating focus area:', updateError);
        // If speaker had no focus area, this update is critical - fail the request
        // This ensures data consistency: if someone sets a focus area via ballot, it must be saved
        if (!hasFocusArea) {
          return NextResponse.json(
            { error: 'Failed to save focus area. Please try again.' },
            { status: 500 }
          );
        }
        // If speaker already had a focus area, log but don't fail (just updating it)
      } else {
        // Update hasFocusArea if we just set it
        if (!hasFocusArea) {
          hasFocusArea = true;
        }
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
        focus_area_rating: hasFocusArea ? focus_area_rating : null,
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

    // Get speech owner email from auth.users using service role client
    // This ensures we get the exact email from the authenticated account
    let speechOwnerEmail: string | null = null;
    try {
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(speech.user_id);
      
      if (authUserError) {
        console.error('Error fetching email from auth.users:', authUserError);
      } else {
        speechOwnerEmail = authUser.user?.email || null;
      }
    } catch (adminError) {
      console.error('Error creating admin client or fetching auth user:', adminError);
    }

    // Get speech owner name from users table for display purposes
    const { data: speechOwner } = await supabase
      .from('users')
      .select('name')
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

    // Debug logging
    console.log('Email notification check:', {
      hasEmail: !!speechOwnerEmail,
      email: speechOwnerEmail,
      hasSpeakerName: !!speechOwner?.name,
      speakerName: speechOwner?.name,
      hasReviewerName: !!reviewer?.name,
      reviewerName: reviewer?.name,
      hasSpeechUrl: !!speechDetails?.speech_url,
      speechUrl: speechDetails?.speech_url,
    });

    // Send email notification to speech owner
    if (speechOwnerEmail && reviewer?.name && speechDetails?.speech_url) {
      try {
        console.log('Attempting to send ballot notification email to:', speechOwnerEmail);
        await sendBallotNotificationEmail(
          speechOwnerEmail,
          speechOwner?.name || 'Speaker',
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
        console.log('Successfully sent ballot notification email to:', speechOwnerEmail);
      } catch (emailError) {
        console.error('Error sending ballot notification email:', emailError);
        // Don't fail the request if email fails
      }
    } else {
      console.log('Skipping email notification - missing required data');
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

