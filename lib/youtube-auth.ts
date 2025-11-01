import { createClient } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';

const YOUTUBE_UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload';

/**
 * Check if the user's session has the YouTube upload scope in their provider token
 */
export async function hasYouTubeUploadScope(): Promise<boolean> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.provider_token) {
    return false;
  }

  // Decode the JWT token to check scopes
  try {
    const tokenParts = session.provider_token.split('.');
    if (tokenParts.length !== 3) {
      return false;
    }

    const payload = JSON.parse(atob(tokenParts[1]));
    const scopes = payload.scope || payload.scopes || '';
    
    return typeof scopes === 'string' && scopes.includes(YOUTUBE_UPLOAD_SCOPE);
  } catch (error) {
    console.error('Error checking YouTube scope:', error);
    return false;
  }
}

/**
 * Get the Google provider access token from the Supabase session
 */
export async function getGoogleAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  return session?.provider_token || null;
}

/**
 * Trigger re-authentication with Google to request YouTube upload scope
 * Returns the auth URL that the user should be redirected to
 */
export async function requestYouTubeUploadAuth(): Promise<string | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      scopes: YOUTUBE_UPLOAD_SCOPE,
    },
  });

  if (error) {
    console.error('Error requesting YouTube upload auth:', error.message);
    return null;
  }

  return data.url || null;
}

