'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Ballot {
  id: string;
  speech_id: string;
  gestures: number;
  delivery: number;
  pauses: number;
  content: number;
  entertaining: number;
  feedback_text?: string;
  better_than_last: boolean;
  focus_area_rating?: number | null;
  created_at: string;
  reviewer_name: string;
  reviewer_id: string;
  speech_url?: string;
  speech_submitted_at?: string;
}

interface NewBallotNotificationProps {
  onBallotsClick: (ballots: Ballot[]) => void;
  refreshTrigger?: number;
}

export default function NewBallotNotification({ onBallotsClick, refreshTrigger }: NewBallotNotificationProps) {
  const [newBallots, setNewBallots] = useState<Ballot[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    fetchNewBallots();

    // Subscribe to real-time changes for ballots
    const channel = supabase
      .channel('new-ballots-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ballots' }, () => {
        fetchNewBallots();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refreshTrigger]);

  const fetchNewBallots = async () => {
    try {
      const response = await fetch('/api/users/ballots');
      if (!response.ok) {
        setLoading(false);
        return;
      }

      const result = await response.json();
      const allBallots: Ballot[] = result.ballots || [];

      // Get last view timestamp from localStorage
      const lastViewTimestamp = typeof window !== 'undefined' 
        ? localStorage.getItem('lastBallotViewTimestamp') 
        : null;

      if (!lastViewTimestamp) {
        // If no timestamp, initialize it to current time so existing ballots aren't marked as new
        // Future ballots will be detected as new
        if (typeof window !== 'undefined') {
          localStorage.setItem('lastBallotViewTimestamp', new Date().toISOString());
        }
        setNewBallots([]);
        setLoading(false);
        return;
      }

      // Filter ballots created after last view timestamp
      const newBallotsList = allBallots.filter((ballot: Ballot) => {
        const ballotDate = new Date(ballot.created_at);
        const lastViewDate = new Date(lastViewTimestamp);
        return ballotDate > lastViewDate;
      });

      // Sort by created_at descending (newest first)
      newBallotsList.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });

      setNewBallots(newBallotsList);
    } catch (error) {
      console.error('Error fetching new ballots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (newBallots.length > 0) {
      onBallotsClick(newBallots);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-end">
        <p className="text-sm font-bold" style={{ color: '#1a1a1a' }}>—</p>
      </div>
    );
  }

  if (newBallots.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 flex justify-end">
      <button
        onClick={handleClick}
        className="brutal-button px-4 py-2 text-sm sm:text-base"
        style={{
          backgroundColor: 'var(--primary)',
          color: '#ffffff'
        }}
      >
        {newBallots.length} new ballot{newBallots.length !== 1 ? 's' : ''} received
      </button>
    </div>
  );
}

