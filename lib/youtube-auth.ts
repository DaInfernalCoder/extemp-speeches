import { createClient } from '@/lib/supabase/client';

const YOUTUBE_UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload';

/**
 * Check if the user's session has the YouTube upload scope in their provider token
 * Uses Google's tokeninfo API to verify the token's scopes
 */
export async function hasYouTubeUploadScope(): Promise<boolean> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.provider_token) {
    return false;
  }

  // Use Google's tokeninfo API to verify the token has the required scope
  try {
    const tokeninfoUrl = `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${session.provider_token}`;
    const response = await fetch(tokeninfoUrl);

    if (!response.ok) {
      // Token is invalid or expired
      return false;
    }

    const tokenInfo = await response.json();
    const scopes = tokenInfo.scope || '';
    
    // Check if the token has the YouTube upload scope
    const hasScope = typeof scopes === 'string' && scopes.includes(YOUTUBE_UPLOAD_SCOPE);
    
    return hasScope;
  } catch (error) {
    console.error('[YouTube Auth] Error checking YouTube scope:', error);
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

