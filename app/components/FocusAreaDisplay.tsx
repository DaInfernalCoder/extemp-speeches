'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

interface FocusAreaData {
  focus_area: string | null;
}

export default function FocusAreaDisplay() {
  const [data, setData] = useState<FocusAreaData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    fetchFocusAreaData();

    // Subscribe to real-time changes for users (focus_area updates)
    const channel = supabase
      .channel('focus-area-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchFocusAreaData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const fetchFocusAreaData = async () => {
    try {
      const response = await fetch('/api/users/focus-area');
      if (response.ok) {
        const result = await response.json();
        setData({ focus_area: result.focus_area });
      }
    } catch (error) {
      console.error('Error fetching focus area:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1">
        <p className="text-sm font-bold" style={{ color: '#1a1a1a' }}>Focus Area: —</p>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <p className="text-sm sm:text-base font-bold" style={{ color: '#1a1a1a' }}>
        Focus Area: {data?.focus_area || 'blank'}
      </p>
    </div>
  );
}

