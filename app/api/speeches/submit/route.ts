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

    const contentType = request.headers.get('content-type') || '';
    let speechUrl: string;

    // Handle multipart/form-data (audio file upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const audioFile = formData.get('audio_file') as File | null;

      if (!audioFile) {
        return NextResponse.json(
          { error: 'Audio file is required' },
          { status: 400 }
        );
      }

      // Validate file size (50 MB)
      const maxSize = 50 * 1024 * 1024;
      if (audioFile.size > maxSize) {
        return NextResponse.json(
          { error: 'Audio file must be less than 50 MB' },
          { status: 400 }
        );
      }

      // Validate file type
      if (!audioFile.type.startsWith('audio/')) {
        return NextResponse.json(
          { error: 'Invalid file type. Please upload an audio file.' },
          { status: 400 }
        );
      }

      // Upload to Supabase Storage
      const fileExt = audioFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('speech-audio')
        .upload(fileName, audioFile, {
          contentType: audioFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading audio:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload audio file' },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('speech-audio')
        .getPublicUrl(uploadData.path);

      speechUrl = publicUrl;
    } 
    // Handle application/json (YouTube URL)
    else {
      const body = await request.json();
      const { speech_url } = body;

      if (!speech_url) {
        return NextResponse.json(
          { error: 'YouTube URL is required' },
          { status: 400 }
        );
      }

      // Validate YouTube URL format
      if (!isValidYouTubeUrl(speech_url)) {
        return NextResponse.json(
          { error: 'Invalid YouTube URL format. Please provide a valid YouTube link.' },
          { status: 400 }
        );
      }

      speechUrl = speech_url;
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

