import { NextResponse } from 'next/server';
import { sendDailyReminderEmail } from '@/lib/resend';
import { emailRateLimiter } from '@/lib/email-rate-limiter';

// Shared function to verify cron authorization
function verifyCronAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    return false;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

// Shared function to process daily reminder emails
async function processDailyReminders() {
  // Use service role client since this is called by cron (no user session)
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get today's date (start of day in UTC)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // Get users who:
  // 1. Have email_reminders_enabled = true
  // 2. Haven't submitted a speech today
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, name, email_reminders_enabled')
    .eq('email_reminders_enabled', true);

  if (usersError) {
    console.error('Error fetching users:', usersError);
    throw new Error('Failed to fetch users');
  }

  if (!users || users.length === 0) {
    return {
      message: 'No users with reminders enabled',
      results: [],
    };
  }

  // For each user, check if they submitted a speech today
  const usersToEmail = [];
  
  for (const user of users) {
    const { data: speeches } = await supabase
      .from('speeches')
      .select('id')
      .eq('user_id', user.id)
      .gte('submitted_at', todayStr)
      .limit(1);

    // If no speeches today, add to email list
    if (!speeches || speeches.length === 0) {
      usersToEmail.push(user);
    }
  }

  console.log(`Found ${usersToEmail.length} users to email`);

  // Send emails
  const results = [];
  for (const user of usersToEmail) {
    try {
      await emailRateLimiter.waitForRateLimit();
      await sendDailyReminderEmail(
        user.email,
        user.name || 'there'
      );
      
      // Update last_reminder_sent_at
      await supabase
        .from('users')
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq('id', user.id);

      results.push({ email: user.email, success: true });
      console.log(`Sent reminder to ${user.email}`);
    } catch (error) {
      console.error(`Failed to send email to ${user.email}:`, error);
      results.push({ 
        email: user.email, 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  return {
    message: `Processed ${usersToEmail.length} users`,
    results,
  };
}

// GET handler for Vercel cron jobs
export async function GET(request: Request) {
  try {
    // Verify the request has authorization (from Vercel cron)
    if (!verifyCronAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await processDailyReminders();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in daily-reminder:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST handler for backward compatibility (manual testing, Supabase pg_cron)
export async function POST(request: Request) {
  try {
    // Verify the request has authorization (from pg_cron or manual testing)
    if (!verifyCronAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await processDailyReminders();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in daily-reminder:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

