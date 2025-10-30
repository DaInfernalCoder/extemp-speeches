import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      // Create or update user profile in public.users table
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata.full_name || data.user.user_metadata.name || data.user.email?.split('@')[0],
          avatar_url: data.user.user_metadata.avatar_url || data.user.user_metadata.picture,
        }, {
          onConflict: 'id',
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}`);
}

