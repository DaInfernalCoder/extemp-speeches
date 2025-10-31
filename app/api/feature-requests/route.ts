import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

  // Fetch all feature requests with user info
  const { data: featureRequests, error } = await supabase
    .from('feature_requests')
    .select(`
      id,
      title,
      description,
      created_at,
      user:users!feature_requests_user_id_fkey (
        name,
        email
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching feature requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature requests' },
      { status: 500 }
    );
  }

  return NextResponse.json({ featureRequests });
}

