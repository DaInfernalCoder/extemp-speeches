import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Fetch email preferences
  const { data: userData, error } = await supabase
    .from('users')
    .select('email_reminders_enabled')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching email preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email preferences' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    email_reminders_enabled: userData?.email_reminders_enabled ?? true,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { enabled: boolean }' },
        { status: 400 }
      );
    }

    // Update email preferences
    const { error: updateError } = await supabase
      .from('users')
      .update({ email_reminders_enabled: enabled })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating email preferences:', updateError);
      return NextResponse.json(
        { error: 'Failed to update email preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      email_reminders_enabled: enabled 
    });
  } catch (error) {
    console.error('Error parsing request:', error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

