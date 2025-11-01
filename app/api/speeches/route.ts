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

    // Fetch all speeches, ordered by user and submitted_at
    const { data: speeches, error } = await supabase
      .from('speeches')
      .select(`
        id,
        speech_url,
        submitted_at,
        user_id
      `)
      .order('user_id')
      .order('submitted_at', { ascending: true });

    if (error) {
      console.error('Error fetching speeches:', error);
      return NextResponse.json(
        { error: 'Failed to fetch speeches' },
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

    // Group speeches by user and date to generate titles
    interface Speech {
      id: string;
      speech_url: string;
      submitted_at: string;
      user_id: string;
    }
    
    const groupedByUser = new Map<string, Speech[]>();
    
    speeches?.forEach((speech: Speech) => {
      const userId = speech.user_id;
      if (!groupedByUser.has(userId)) {
        groupedByUser.set(userId, []);
      }
      groupedByUser.get(userId)!.push(speech);
    });

    // Format speeches with titles like "User Name - Oct 30 -1"
    interface FormattedSpeech {
      id: string;
      title: string;
      speech_url: string;
      user_id: string;
      user_name: string;
      submitted_at: string;
      has_previous_speeches: boolean;
    }
    
    const formattedSpeeches: FormattedSpeech[] = [];
    
    groupedByUser.forEach((userSpeeches) => {
      // Group by date
      const byDate = new Map<string, Speech[]>();
      
      userSpeeches.forEach((speech: Speech) => {
        const date = new Date(speech.submitted_at);
        const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        if (!byDate.has(dateKey)) {
          byDate.set(dateKey, []);
        }
        byDate.get(dateKey)!.push(speech);
      });

      // Create titles with counters
      byDate.forEach((dateSpeeches, dateKey) => {
        dateSpeeches.forEach((speech, index) => {
          const user = userMap.get(speech.user_id);
          const userName = user?.name || 'Anonymous';
          const counter = dateSpeeches.length > 1 ? ` -${index + 1}` : '';
          const title = `${userName} - ${dateKey}${counter}`;
          
          // Check if there are previous speeches for this user
          const userSpeechesArray = groupedByUser.get(speech.user_id) || [];
          const speechIndex = userSpeechesArray.findIndex(s => s.id === speech.id);
          const hasPreviousSpeeches = speechIndex > 0;
          
          formattedSpeeches.push({
            id: speech.id,
            title,
            speech_url: speech.speech_url,
            user_id: speech.user_id,
            user_name: userName,
            submitted_at: speech.submitted_at,
            has_previous_speeches: hasPreviousSpeeches,
          });
        });
      });
    });

    // Sort by submitted_at descending (most recent first)
    formattedSpeeches.sort((a, b) => 
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );

    return NextResponse.json({ data: formattedSpeeches });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

