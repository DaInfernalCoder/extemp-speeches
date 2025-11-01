'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: User | null } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((
      _event: AuthChangeEvent,
      session: Session | null
    ) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: 'https://www.googleapis.com/auth/youtube.upload',
      },
    });
    if (error) {
      console.error('Error signing in:', error.message);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    }
  };

  if (loading) {
    return (
      <button
        disabled
        className="brutal-button px-6 py-3 text-base opacity-50 cursor-not-allowed bg-gray-200"
        style={{
          color: '#1a1a1a'
        }}
      >
        Loading...
      </button>
    );
  }

  if (user) {
    return (
      <button
        onClick={handleSignOut}
        className="brutal-button px-6 py-3 text-base"
        style={{
          backgroundColor: 'var(--accent-pink)',
          color: '#1a1a1a'
        }}
      >
        Sign Out
      </button>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      className="brutal-button px-6 py-3 text-base"
      style={{
        backgroundColor: 'var(--accent-teal)',
        color: '#1a1a1a'
      }}
    >
      Log In
    </button>
  );
}

