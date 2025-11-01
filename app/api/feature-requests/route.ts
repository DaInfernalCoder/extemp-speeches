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

  // Fetch all feature requests
  const { data: featureRequests, error } = await supabase
    .from('feature_requests')
    .select('id, title, description, created_at, user_id')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching feature requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature requests' },
      { status: 500 }
    );
  }

  // Get all unique user IDs from feature requests
  const userIds = new Set<string>();
  featureRequests?.forEach((req: { user_id: string }) => {
    userIds.add(req.user_id);
  });

  // Fetch user information for all submitters
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', Array.from(userIds));

  if (usersError) {
    console.error('Error fetching users:', usersError);
  }

  const userMap = new Map(
    users?.map(u => [u.id, { name: u.name, email: u.email }]) || []
  );

  // Combine feature requests with user info
  const featureRequestsWithUsers = featureRequests?.map((req: {
    id: string;
    title: string;
    description: string;
    created_at: string;
    user_id: string;
  }) => {
    const user = userMap.get(req.user_id);
    return {
      id: req.id,
      title: req.title,
      description: req.description,
      created_at: req.created_at,
      user: {
        name: user?.name || null,
        email: user?.email || '',
      },
    };
  }) || [];

  return NextResponse.json({ featureRequests: featureRequestsWithUsers });
}

