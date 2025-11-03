'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import NeobrutalistFire from './NeobrutalistFire';

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_streak_date: string | null;
  streak_updated_at: string | null;
}

export default function StreakDisplay() {
  const [data, setData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    fetchStreakData();

    // Subscribe to real-time changes for speeches (new submissions) and users (streak updates)
    const channel = supabase
      .channel('streak-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'speeches' }, () => {
        fetchStreakData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchStreakData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const fetchStreakData = async () => {
    try {
      const response = await fetch('/api/users/streak');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching streak data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center">
        <p className="text-sm font-bold" style={{ color: '#1a1a1a' }}>—</p>
      </div>
    );
  }

  const currentStreak = data?.current_streak || 0;
  const longestStreak = data?.longest_streak || 0;
  // Calculate fire intensity based on streak (clamp to 0-10, cap at 10 for visual consistency)
  const fireIntensity = Math.min(currentStreak, 10); // Max intensity at 10 day streak

  return (
    <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3">
      {/* Fire Animation */}
      <div className="relative">
        <NeobrutalistFire size={32} intensity={fireIntensity} />
      </div>
      
      {/* Streak Text */}
      <div className="text-center">
        <p className="text-sm sm:text-base font-extrabold" style={{ color: '#1a1a1a' }}>
          {currentStreak > 0 ? (
            <>
              {currentStreak} Day{currentStreak !== 1 ? 's' : ''} Streak
            </>
          ) : (
            <>Start Your Streak!</>
          )}
        </p>
        {longestStreak > currentStreak && longestStreak > 0 && (
          <p className="text-xs font-medium mt-0.5" style={{ color: '#666' }}>
            Best: {longestStreak} days
          </p>
        )}
      </div>
    </div>
  );
}
