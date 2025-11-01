'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

interface FocusAreaData {
  focus_area: string | null;
  focus_area_ratings: Array<{
    rating: number;
    created_at: string;
  }>;
  total_ratings: number;
  recent_average: number | null;
  previous_average: number | null;
  growth_percentage: number | null;
}

export default function FocusAreaDisplay() {
  const [data, setData] = useState<FocusAreaData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    fetchFocusAreaData();

    // Subscribe to real-time changes for users (focus_area updates) and ballots (focus_area_rating updates)
    const channel = supabase
      .channel('focus-area-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchFocusAreaData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ballots' }, () => {
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
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching focus area:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (!data || !data.focus_area) {
    return null; // Don't show if no focus area
  }

  const showGrowth = data.total_ratings >= 2 && data.growth_percentage !== null;
  const isPositiveGrowth = data.growth_percentage !== null && data.growth_percentage > 0;

  // Get recent ratings (last 5) for progress bars
  const recentRatings = data.focus_area_ratings.slice(-5);

  return (
    <div className="brutal-card p-4 sm:p-6 mb-6 sm:mb-8">
      {/* Fire Animation & Growth Badge */}
      {showGrowth && (
        <div className="flex items-center justify-center gap-3 mb-4">
          {/* Fire Animation */}
          <div className="relative">
            <div className="fire-animation">
              <span className="text-2xl sm:text-3xl">🔥</span>
            </div>
          </div>
          
          {/* Growth Percentage Badge */}
          {data.growth_percentage !== null && (
            <div
              className="px-3 py-1 rounded-lg brutal-border font-bold text-sm sm:text-base"
              style={{
                backgroundColor: isPositiveGrowth ? 'var(--success)' : '#FFD233',
                color: '#1a1a1a',
                boxShadow: 'var(--shadow-brutal)'
              }}
            >
              {isPositiveGrowth ? '+' : ''}
              {data.growth_percentage.toFixed(1)}% Growth
            </div>
          )}
        </div>
      )}

      {/* Focus Area Text */}
      <div className="text-center mb-4">
        <h3 className="text-lg sm:text-xl font-extrabold mb-2" style={{ color: '#1a1a1a' }}>
          Today I need to Focus On:
        </h3>
        <p className="text-base sm:text-lg font-bold" style={{ color: 'var(--primary)' }}>
          {data.focus_area}
        </p>
      </div>

      {/* Progress Bars - Recent Ratings */}
      {recentRatings.length > 0 && (
        <div className="mt-4">
          <p className="text-xs sm:text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
            Recent Progress:
          </p>
          <div className="flex flex-col gap-2">
            {recentRatings.map((rating, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1 bg-white rounded-lg brutal-border p-1" style={{ boxShadow: '2px 2px 0px #000' }}>
                  <div
                    className="h-4 rounded"
                    style={{
                      width: `${(rating.rating / 10) * 100}%`,
                      backgroundColor: rating.rating >= 7 ? 'var(--success)' : rating.rating >= 5 ? 'var(--secondary)' : 'var(--error)',
                      transition: 'width 0.3s ease-out'
                    }}
                  />
                </div>
                <span className="text-xs sm:text-sm font-bold w-8 text-right" style={{ color: '#1a1a1a' }}>
                  {rating.rating}/10
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {data.total_ratings > 0 && (
        <div className="mt-4 pt-4 border-t-2 border-black">
          <div className="flex justify-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium" style={{ color: '#1a1a1a' }}>
            <span>Total Ratings: <strong>{data.total_ratings}</strong></span>
            {data.recent_average !== null && (
              <span>Avg: <strong>{data.recent_average.toFixed(1)}</strong></span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

