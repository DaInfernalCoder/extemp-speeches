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
        className="px-6 py-3 rounded-lg font-normal text-base opacity-50 cursor-not-allowed"
        style={{
          backgroundColor: '#2C2C2C',
          color: '#F5F5F5'
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
        className="px-6 py-3 rounded-lg font-normal text-base hover:opacity-90 transition-opacity"
        style={{
          backgroundColor: '#2C2C2C',
          color: '#F5F5F5'
        }}
      >
        Sign Out
      </button>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      className="px-6 py-3 rounded-lg font-normal text-base hover:opacity-90 transition-opacity"
      style={{
        backgroundColor: '#2C2C2C',
        color: '#F5F5F5'
      }}
    >
      Log In
    </button>
  );
}

