'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AuthButton from './AuthButton';
import SpeechSubmitModal from './SpeechSubmitModal';
import BallotSubmitModal from './BallotSubmitModal';
import BallotViewModal from './BallotViewModal';
import FeatureRequestModal from './FeatureRequestModal';
import FocusAreaDisplay from './FocusAreaDisplay';
import StreakDisplay from './StreakDisplay';
import NewBallotNotification from './NewBallotNotification';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

interface Ballot {
  id: string;
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
}

interface SpeechDetails {
  speech_id: string;
  speech_url: string;
  user_id: string;
  submitted_at: string;
  ballots: Ballot[];
}

interface LeaderBoardEntry {
  name: string;
  place: number;
  all_time_speeches: number;
  weekly_speeches: number;
  avatar_url?: string;
  speech_urls: string[];
  speech_details: SpeechDetails[];
}

interface PodiumData {
  name: string;
  place: number;
  all_time_speeches: number;
  position: string;
  avatar_url?: string;
}

const PodiumCard: React.FC<{ data: PodiumData; height: string; bgColor: string; borderColor: string }> = ({
  data,
  height,
  bgColor
}) => (
  <div className={`flex flex-col items-center ${height} relative transition-all duration-200`}>
    {/* Avatar */}
    <div className="flex flex-col items-center gap-2 mb-3 relative z-10">
      <div
        className={`${data.place === 1 ? 'w-12 sm:w-16 h-12 sm:h-16' : 'w-11 sm:w-14 h-11 sm:h-14'} rounded-full p-1 brutal-border`}
        style={{
          background: bgColor,
          boxShadow: 'var(--shadow-brutal)'
        }}
      >
        {data.avatar_url ? (
          <Image
            src={data.avatar_url}
            alt={data.name}
            width={64}
            height={64}
            className="w-full h-full rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center">
            <div className={`${data.place === 1 ? 'w-7 sm:w-10 h-7 sm:h-10' : 'w-6 sm:w-8 h-6 sm:h-8'} bg-gray-500 rounded-full`}></div>
          </div>
        )}
      </div>
      <span className={`${data.place === 1 ? 'text-sm sm:text-base font-bold' : 'text-xs sm:text-sm font-bold'}`} style={{ color: '#1a1a1a' }}>{data.name}</span>
    </div>

    {/* Podium */}
    <div
      className="w-[110px] sm:w-[130px] rounded-t-2xl flex flex-col items-center justify-end pb-5 relative brutal-border-thick"
      style={{
        height: 'calc(100% - 90px)',
        background: bgColor,
        boxShadow: 'var(--shadow-brutal-lg)',
        borderBottom: 'none'
      }}
    >
      {/* Position number */}
      <span
        className={`${data.place === 1 ? 'text-base sm:text-lg font-extrabold' : 'text-sm sm:text-base font-bold'}`}
        style={{ color: '#1a1a1a' }}
      >
        {data.position}
      </span>
    </div>
  </div>
);

const LeaderBoard: React.FC = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderBoardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBallotModalOpen, setIsBallotModalOpen] = useState(false);
  const [isFeatureRequestModalOpen, setIsFeatureRequestModalOpen] = useState(false);
  const [isBallotViewModalOpen, setIsBallotViewModalOpen] = useState(false);
  const [selectedBallots, setSelectedBallots] = useState<Ballot[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [emailRemindersEnabled, setEmailRemindersEnabled] = useState(true);
  const [updatingPreferences, setUpdatingPreferences] = useState(false);
  const [preselectedSpeechId, setPreselectedSpeechId] = useState<string | undefined>(undefined);
  const [isNewBallotsMode, setIsNewBallotsMode] = useState(false);
  const [ballotNotificationRefresh, setBallotNotificationRefresh] = useState(0);
  const supabase = useMemo(() => createClient(), []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch('/api/leaderboard', { cache: 'no-store' });
      if (!response.ok) {
        console.error('Failed to fetch leaderboard:', response.status, response.statusText);
        setLoading(false);
        return;
      }
      const result = await response.json();
      if (result.data) {
        setLeaderboardData(result.data);
      } else {
        console.warn('Leaderboard response missing data:', result);
        setLeaderboardData([]);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmailPreferences = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/users/email-preferences');
      if (response.ok) {
        const data = await response.json();
        setEmailRemindersEnabled(data.email_reminders_enabled ?? true);
      }
    } catch (error) {
      console.error('Error fetching email preferences:', error);
    }
  }, [user]);

  const handleEmailToggle = async (enabled: boolean) => {
    if (!user) return;
    
    setUpdatingPreferences(true);
    try {
      const response = await fetch('/api/users/email-preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        setEmailRemindersEnabled(enabled);
      } else {
        const data = await response.json();
        console.error('Error updating email preferences:', data.error);
        alert('Failed to update email preferences. Please try again.');
      }
    } catch (error) {
      console.error('Error updating email preferences:', error);
      alert('Failed to update email preferences. Please try again.');
    } finally {
      setUpdatingPreferences(false);
    }
  };

  // Separate effect for auth and email preferences
  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: User | null } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((
      _event: AuthChangeEvent,
      session: Session | null
    ) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setEmailRemindersEnabled(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Fetch email preferences when user changes
  useEffect(() => {
    if (user) {
      fetchEmailPreferences();
    }
  }, [user, fetchEmailPreferences]);

  // Set up leaderboard fetching and real-time subscriptions
  useEffect(() => {
    // Fetch leaderboard immediately
    fetchLeaderboard();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('speeches-and-ballots-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'speeches' }, () => {
        fetchLeaderboard();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ballots' }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchLeaderboard]);

  const handleNewSpeech = () => {
    if (!user) {
      alert('Please log in to submit a speech');
      return;
    }
    setIsModalOpen(true);
  };

  const handleMakeBallot = () => {
    if (!user) {
      alert('Please log in to submit a ballot');
      return;
    }
    setPreselectedSpeechId(undefined);
    setIsBallotModalOpen(true);
  };

  const handleQuickBallot = (speechId: string) => {
    if (!user) {
      alert('Please log in to submit a ballot');
      return;
    }
    setPreselectedSpeechId(speechId);
    setIsBallotModalOpen(true);
  };

  const handleFeatureRequest = () => {
    if (!user) {
      alert('Please log in to submit a feature request');
      return;
    }
    setIsFeatureRequestModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchLeaderboard();
  };

  const openBallotViewModal = (ballots: Ballot[], newBallotsMode = false) => {
    setSelectedBallots(ballots);
    setIsNewBallotsMode(newBallotsMode);
    setIsBallotViewModalOpen(true);
  };

  const handleNewBallotsClick = (newBallots: Ballot[]) => {
    openBallotViewModal(newBallots, true);
  };

  const handleMarkBallotsAsViewed = () => {
    // Trigger refresh of ballot notification
    setBallotNotificationRefresh(prev => prev + 1);
  };

  const handleDeleteSpeech = async (speechId: string) => {
    if (!confirm('Are you sure you want to delete this recording? This will also delete any ballots associated with it.')) {
      return;
    }

    try {
      const response = await fetch(`/api/speeches/${speechId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        alert(`Failed to delete speech: ${data.error || 'Unknown error'}`);
        return;
      }

      // Refresh the leaderboard after successful deletion
      fetchLeaderboard();
    } catch (error) {
      console.error('Error deleting speech:', error);
      alert('Failed to delete speech. Please try again.');
    }
  };

  const handleDeleteBallot = async (ballotId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    if (!ballotId) {
      console.error('Ballot ID is missing');
      alert('Error: Ballot ID is missing. Please try again.');
      return;
    }

    if (!confirm('Are you sure you want to delete this ballot?')) {
      return;
    }

    try {
      console.log('Deleting ballot with ID:', ballotId);
      const response = await fetch(`/api/ballots/${ballotId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Delete failed:', response.status, data);
        alert(`Failed to delete ballot: ${data.error || 'Unknown error'}`);
        return;
      }

      console.log('Ballot deleted successfully:', data);
      // Refresh the leaderboard after successful deletion
      fetchLeaderboard();
    } catch (error) {
      console.error('Error deleting ballot:', error);
      alert('Failed to delete ballot. Please try again.');
    }
  };

  const podiumData: PodiumData[] = leaderboardData.slice(0, 3).map((entry, index) => ({
    name: entry.name,
    place: entry.place,
    all_time_speeches: entry.all_time_speeches,
    position: index === 0 ? '1st' : index === 1 ? '2nd' : '3rd',
    avatar_url: entry.avatar_url,
  }));

  return (
    <>
      <SpeechSubmitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
      <BallotSubmitModal
        isOpen={isBallotModalOpen}
        onClose={() => {
          setIsBallotModalOpen(false);
          setPreselectedSpeechId(undefined);
        }}
        onSuccess={handleModalSuccess}
        preselectedSpeechId={preselectedSpeechId}
      />
      <FeatureRequestModal
        isOpen={isFeatureRequestModalOpen}
        onClose={() => setIsFeatureRequestModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
      <BallotViewModal
        isOpen={isBallotViewModalOpen}
        onClose={() => {
          setIsBallotViewModalOpen(false);
          setIsNewBallotsMode(false);
        }}
        ballots={selectedBallots}
        speechTitle=""
        isNewBallotsMode={isNewBallotsMode}
        onMarkAsViewed={handleMarkBallotsAsViewed}
        currentUserId={user?.id}
        onBallotDeleted={handleModalSuccess}
      />

      <div
        className="min-h-screen p-4 sm:p-8"
      >
        {/* Focus Area, Streak, and New Ballot Notification */}
        {user && (
          <div className="max-w-4xl mx-auto mb-6 sm:mb-8">
            <div className="brutal-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <FocusAreaDisplay />
                <StreakDisplay />
                <NewBallotNotification onBallotsClick={handleNewBallotsClick} refreshTrigger={ballotNotificationRefresh} />
              </div>
            </div>
          </div>
        )}

        {/* Top Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 mb-8">
          <button
            onClick={handleNewSpeech}
            className="brutal-button px-6 py-3 text-base bg-white hover:bg-gray-50"
            style={{
              color: '#1a1a1a'
            }}
          >
            New Speech
          </button>
          <button
            onClick={handleMakeBallot}
            className="brutal-button px-6 py-3 text-base"
            style={{
              backgroundColor: 'var(--primary)',
              color: '#ffffff'
            }}
          >
            Make a Ballot
          </button>
          <button
            onClick={handleFeatureRequest}
            className="brutal-button px-6 py-3 text-base"
            style={{
              backgroundColor: 'var(--secondary)',
              color: '#1a1a1a'
            }}
          >
            Feature Request
          </button>
          <AuthButton />
          
          {/* Email Preferences Toggle */}
          {user && (
            <div className="brutal-card flex items-center gap-3 px-4 py-2">
              <label htmlFor="email-reminders-toggle" className="text-sm font-bold cursor-pointer" style={{ color: '#1a1a1a' }}>
                Daily Reminder Emails
              </label>
              <button
                id="email-reminders-toggle"
                type="button"
                onClick={() => handleEmailToggle(!emailRemindersEnabled)}
                disabled={updatingPreferences}
                className={`relative inline-flex h-7 w-12 items-center rounded-lg transition-all brutal-border ${
                  emailRemindersEnabled ? 'bg-brutal-primary' : 'bg-gray-200'
                } ${updatingPreferences ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                style={{
                  boxShadow: emailRemindersEnabled ? 'var(--shadow-brutal)' : '2px 2px 0px #000'
                }}
                aria-label="Toggle daily reminder emails"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-md bg-white transition-transform brutal-border`}
                  style={{
                    transform: emailRemindersEnabled ? 'translateX(22px)' : 'translateX(2px)'
                  }}
                />
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex justify-center items-center min-h-[400px]">
            <p className="text-gray-600">Loading leaderboard...</p>
          </div>
        )}

      {/* Podium Section */}
      {!loading && podiumData.length >= 3 && (
        <div className="flex flex-col sm:flex-row justify-center items-center sm:items-end gap-4 sm:gap-6 mb-16">
          {/* 2nd Place */}
          <PodiumCard
            data={podiumData[1]}
            height="h-[200px] sm:h-[230px]"
            bgColor="var(--accent-teal)"
            borderColor="#000000"
          />

          {/* 1st Place */}
          <PodiumCard
            data={podiumData[0]}
            height="h-[240px] sm:h-[280px]"
            bgColor="var(--secondary)"
            borderColor="#000000"
          />

          {/* 3rd Place */}
          <PodiumCard
            data={podiumData[2]}
            height="h-[160px] sm:h-[190px]"
            bgColor="var(--accent-pink)"
            borderColor="#000000"
          />
        </div>
      )}

      {/* Leaderboard Table */}
      {!loading && (
        <div className="max-w-6xl mx-auto px-4">
          <div className="brutal-card overflow-hidden">
            {/* Table Header - Desktop */}
            <div className="hidden sm:grid sm:grid-cols-6">
              {/* Name Header */}
              <div className="px-6 py-3 flex items-center gap-2 border-r-[3px] border-black" style={{ backgroundColor: '#FFF8F0' }}>
                <span className="text-sm font-bold" style={{ color: '#1a1a1a' }}>Name</span>
              </div>

              {/* Place Header */}
              <div className="px-6 py-3 flex items-center justify-center gap-2 border-r-[3px] border-black" style={{ backgroundColor: '#FFF8F0' }}>
                <span className="text-sm font-bold capitalize" style={{ color: '#1a1a1a' }}>Place</span>
              </div>

              {/* Weekly Header */}
              <div className="px-6 py-3 flex items-center justify-center gap-2 border-r-[3px] border-black" style={{ backgroundColor: '#FFF8F0' }}>
                <span className="text-sm font-bold" style={{ color: '#1a1a1a' }}>Weekly</span>
              </div>

              {/* All Time Header */}
              <div className="px-6 py-3 flex items-center justify-center gap-2 border-r-[3px] border-black" style={{ backgroundColor: '#FFF8F0' }}>
                <span className="text-sm font-bold" style={{ color: '#1a1a1a' }}>All Time</span>
              </div>

              {/* Recordings and Ballots Combined Header */}
              <div className="px-6 py-3 col-span-2 border-r-[3px] border-black" style={{ backgroundColor: '#FFF8F0' }}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-center">
                    <span className="text-sm font-bold" style={{ color: '#1a1a1a' }}>Recordings</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-sm font-bold" style={{ color: '#1a1a1a' }}>Ballots</span>
                  </div>
                </div>
              </div>
            </div>

          {/* Table Body */}
          <div>
            {leaderboardData.map((entry, index) => (
              <div key={index} className="border-t-[3px] border-black">
                {/* Desktop View */}
                <div className="hidden sm:grid sm:grid-cols-6 items-start bg-white">
                  {/* Name and Avatar */}
                  <div className="px-6 py-4 flex items-center gap-3 border-r-[3px] border-black">
                    {entry.avatar_url ? (
                      <Image
                        src={entry.avatar_url}
                        alt={entry.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover brutal-border"
                        loading="lazy"
                        style={{ boxShadow: '2px 2px 0px #000' }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 brutal-border flex items-center justify-center" style={{ boxShadow: '2px 2px 0px #000' }}>
                        <div className="w-6 h-6 bg-gray-500 rounded-full"></div>
                      </div>
                    )}
                    <span className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{entry.name}</span>
                  </div>

                  {/* Place */}
                  <div className="px-6 py-4 text-center border-r-[3px] border-black">
                    <span className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{entry.place}</span>
                  </div>

                  {/* Weekly */}
                  <div className="px-6 py-4 text-center border-r-[3px] border-black">
                    <span className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{entry.weekly_speeches}</span>
                  </div>

                  {/* All Time */}
                  <div className="px-6 py-4 text-center border-r-[3px] border-black">
                    <span className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{entry.all_time_speeches}</span>
                  </div>

                  {/* Speech URLs and Ballots Combined */}
                  <div className="px-6 py-4 border-r-[3px] border-black col-span-2">
                    <div className="flex flex-col gap-2">
                      {entry.speech_details && entry.speech_details.length > 0 ? (
                        entry.speech_details.map((speechDetail, urlIndex) => {
                          const formattedDate = new Date(speechDetail.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          const hasUserBallot = user && speechDetail.ballots?.some(ballot => ballot.reviewer_id === user.id);
                          const ballotCount = speechDetail.ballots?.length || 0;

                          return (
                          <div key={urlIndex} className="grid grid-cols-2 gap-4 items-center">
                            {/* Recording Link and Buttons */}
                            <div className="flex items-center gap-2 justify-center">
                              <a
                                href={speechDetail.speech_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm leading-normal inline-block align-baseline font-bold hover:underline transition-colors"
                                style={{ color: 'var(--primary)' }}
                              >
                                Recording {urlIndex + 1} - {formattedDate}
                              </a>
                              {user && user.id === speechDetail.user_id && (
                                <button
                                  onClick={() => handleDeleteSpeech(speechDetail.speech_id)}
                                  className="flex items-center justify-center w-5 h-5 rounded brutal-border bg-red-500 hover:bg-red-600 transition-colors"
                                  style={{ boxShadow: '2px 2px 0px #000' }}
                                  title="Delete recording"
                                  aria-label="Delete recording"
                                >
                                  <span className="text-white text-xs font-bold leading-none">×</span>
                                </button>
                              )}
                              {user && user.id !== speechDetail.user_id && !hasUserBallot && (
                                <button
                                  onClick={() => handleQuickBallot(speechDetail.speech_id)}
                                  className="flex items-center justify-center w-5 h-5 rounded brutal-border transition-colors"
                                  style={{
                                    backgroundColor: 'var(--primary)',
                                    boxShadow: '2px 2px 0px #000'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#0052CC';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--primary)';
                                  }}
                                  title="Add ballot"
                                  aria-label="Add ballot"
                                >
                                  <span className="text-white text-xs font-bold leading-none">+</span>
                                </button>
                              )}
                            </div>

                            {/* Ballots */}
                            <div className="flex items-center gap-2 justify-center">
                              {ballotCount > 0 ? (
                                <>
                                  <button
                                    onClick={() => openBallotViewModal(speechDetail.ballots)}
                                    className="inline-block align-baseline font-bold hover:underline transition-colors p-0 m-0 text-sm"
                                    style={{ color: 'var(--primary)' }}
                                  >
                                    {ballotCount} ballot{ballotCount !== 1 ? 's' : ''}
                                  </button>
                                  {user && speechDetail.ballots?.map((ballot) => {
                                    if (!ballot.id) {
                                      console.warn('Ballot missing ID:', ballot);
                                      return null;
                                    }
                                    return ballot.reviewer_id === user.id ? (
                                      <button
                                        key={ballot.id}
                                        onClick={(e) => handleDeleteBallot(ballot.id, e)}
                                        className="flex items-center justify-center w-5 h-5 rounded brutal-border bg-red-500 hover:bg-red-600 transition-colors"
                                        style={{ boxShadow: '2px 2px 0px #000' }}
                                        title="Delete ballot"
                                        aria-label="Delete ballot"
                                      >
                                        <span className="text-white text-xs font-bold leading-none">×</span>
                                      </button>
                                    ) : null;
                                  })}
                                </>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </div>
                          </div>
                          );
                        })
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile View */}
                <div className="sm:hidden p-4 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {entry.avatar_url ? (
                        <Image
                          src={entry.avatar_url}
                          alt={entry.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover brutal-border"
                          loading="lazy"
                          style={{ boxShadow: '2px 2px 0px #000' }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 brutal-border flex items-center justify-center" style={{ boxShadow: '2px 2px 0px #000' }}>
                          <div className="w-6 h-6 bg-gray-500 rounded-full"></div>
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-bold block" style={{ color: '#1a1a1a' }}>{entry.name}</span>
                        <span className="text-xs font-medium" style={{ color: '#1a1a1a' }}>Place: {entry.place}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 justify-between text-xs font-medium mb-2" style={{ color: '#1a1a1a' }}>
                    <span>Weekly: {entry.weekly_speeches}</span>
                    <span>All Time: {entry.all_time_speeches}</span>
                  </div>
                  {entry.speech_details && entry.speech_details.length > 0 && (
                    <div className="mt-2 pt-2 border-t-2 border-black">
                      <span className="text-xs font-bold mb-1 block" style={{ color: '#1a1a1a' }}>Recordings:</span>
                      <div className="flex flex-col items-center gap-2">
                        {entry.speech_details.map((speechDetail, urlIndex) => {
                          const ballotCount = speechDetail.ballots?.length || 0;
                          const formattedDate = new Date(speechDetail.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          const hasUserBallot = user && speechDetail.ballots?.some(ballot => ballot.reviewer_id === user.id);

                          return (
                            <div key={urlIndex} className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-2">
                                <a
                                  href={speechDetail.speech_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold hover:underline transition-colors"
                                  style={{ color: 'var(--primary)' }}
                                >
                                  Recording {urlIndex + 1} - {formattedDate}
                                </a>
                                {user && user.id === speechDetail.user_id && (
                                  <button
                                    onClick={() => handleDeleteSpeech(speechDetail.speech_id)}
                                    className="flex items-center justify-center w-4 h-4 rounded brutal-border bg-red-500 hover:bg-red-600 transition-colors"
                                    style={{ boxShadow: '1px 1px 0px #000' }}
                                    title="Delete recording"
                                    aria-label="Delete recording"
                                  >
                                    <span className="text-white text-xs font-bold leading-none">×</span>
                                  </button>
                                )}
                                {user && user.id !== speechDetail.user_id && !hasUserBallot && (
                                  <button
                                    onClick={() => handleQuickBallot(speechDetail.speech_id)}
                                    className="flex items-center justify-center w-4 h-4 rounded brutal-border transition-colors"
                                    style={{ 
                                      backgroundColor: 'var(--primary)',
                                      boxShadow: '1px 1px 0px #000'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#0052CC';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'var(--primary)';
                                    }}
                                    title="Add ballot"
                                    aria-label="Add ballot"
                                  >
                                    <span className="text-white text-xs font-bold leading-none">+</span>
                                  </button>
                                )}
                                {ballotCount > 0 && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => openBallotViewModal(speechDetail.ballots)}
                                      className="inline-block align-baseline text-xs font-bold hover:underline p-0 m-0"
                                      style={{ color: 'var(--primary)' }}
                                    >
                                      ({ballotCount} ballot{ballotCount !== 1 ? 's' : ''})
                                    </button>
                                    {user && speechDetail.ballots?.map((ballot) => {
                                      if (!ballot.id) {
                                        console.warn('Ballot missing ID:', ballot);
                                        return null;
                                      }
                                      return ballot.reviewer_id === user.id ? (
                                        <button
                                          key={ballot.id}
                                          onClick={(e) => handleDeleteBallot(ballot.id, e)}
                                          className="flex items-center justify-center w-4 h-4 rounded brutal-border bg-red-500 hover:bg-red-600 transition-colors"
                                          style={{ boxShadow: '1px 1px 0px #000' }}
                                          title="Delete ballot"
                                          aria-label="Delete ballot"
                                        >
                                          <span className="text-white text-xs font-bold leading-none">×</span>
                                        </button>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
        )}

        {/* Footer with Privacy Policy Link */}
        <div className="max-w-4xl mx-auto mt-12 mb-8 text-center">
          <Link
            href="/privacy"
            className="text-sm font-bold hover:underline transition-colors"
            style={{ color: 'var(--primary)' }}
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </>
  );
};

export default LeaderBoard;
