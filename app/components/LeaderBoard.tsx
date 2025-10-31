'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import AuthButton from './AuthButton';
import SpeechSubmitModal from './SpeechSubmitModal';
import BallotSubmitModal from './BallotSubmitModal';
import BallotViewModal from './BallotViewModal';
import FeatureRequestModal from './FeatureRequestModal';
import type { User } from '@supabase/supabase-js';

interface Ballot {
  id: string;
  gestures: number;
  delivery: number;
  pauses: number;
  content: number;
  entertaining: number;
  feedback_text?: string;
  better_than_last: boolean;
  created_at: string;
  reviewer_name: string;
}

interface SpeechDetails {
  speech_id: string;
  speech_url: string;
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

const PodiumCard: React.FC<{ data: PodiumData; height: string; gradient: string; avatarRing: string }> = ({
  data,
  height,
  gradient,
  avatarRing
}) => (
  <div className={`flex flex-col items-center ${height} relative transition-transform hover:scale-105 duration-300`}>
    {/* Avatar */}
    <div className="flex flex-col items-center gap-2 mb-3 relative z-10">
      <div
        className={`${data.place === 1 ? 'w-12 sm:w-16 h-12 sm:h-16' : 'w-11 sm:w-14 h-11 sm:h-14'} rounded-full p-1 shadow-lg`}
        style={{ background: avatarRing }}
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
          <div className="w-full h-full rounded-full bg-linear-to-br from-gray-400 to-gray-600 flex items-center justify-center shadow-inner">
            <div className={`${data.place === 1 ? 'w-7 sm:w-10 h-7 sm:h-10' : 'w-6 sm:w-8 h-6 sm:h-8'} bg-linear-to-br from-gray-500 to-gray-700 rounded-full`}></div>
          </div>
        )}
      </div>
      <span className={`${data.place === 1 ? 'text-sm sm:text-base font-semibold' : 'text-xs sm:text-sm font-medium'} text-gray-800`}>{data.name}</span>
    </div>

    {/* Podium */}
    <div
      className={`w-[110px] sm:w-[130px] rounded-t-2xl flex flex-col items-center justify-end ${data.place === 3 ? 'pb-5' : 'pb-5'} relative shadow-xl transition-shadow hover:shadow-2xl`}
      style={{
        height: 'calc(100% - 90px)',
        background: gradient,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), inset 0 2px 10px rgba(255, 255, 255, 0.2)'
      }}
    >
      {/* Position number */}
      <span
        className={`${data.place === 1 ? 'text-base sm:text-lg font-bold' : 'text-sm sm:text-base font-semibold'} text-gray-800 drop-shadow-sm`}
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
  const supabase = createClient();

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      const result = await response.json();
      if (result.data) {
        setLeaderboardData(result.data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchEmailPreferences();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchEmailPreferences();
      } else {
        setEmailRemindersEnabled(true);
      }
    });

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
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchEmailPreferences]);

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

  const openBallotViewModal = (ballots: Ballot[]) => {
    setSelectedBallots(ballots);
    setIsBallotViewModalOpen(true);
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
        onClose={() => setIsBallotModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
      <FeatureRequestModal
        isOpen={isFeatureRequestModalOpen}
        onClose={() => setIsFeatureRequestModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
      <BallotViewModal
        isOpen={isBallotViewModalOpen}
        onClose={() => setIsBallotViewModalOpen(false)}
        ballots={selectedBallots}
        speechTitle=""
      />

      <div
        className="min-h-screen p-4 sm:p-8"
        style={{
          background: 'linear-gradient(185deg, rgba(255, 255, 255, 1) 0%, rgba(200, 204, 71, 0) 100%)',
          borderRadius: '62px'
        }}
      >
        {/* Top Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 mb-8">
          <button
            onClick={handleNewSpeech}
            className="px-6 py-3 rounded-lg font-normal text-base hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: '#2C2C2C',
              color: '#F5F5F5'
            }}
          >
            New Speech
          </button>
          <button
            onClick={handleMakeBallot}
            className="px-6 py-3 rounded-lg font-normal text-base hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: '#2C2C2C',
              color: '#F5F5F5'
            }}
          >
            Make a Ballot
          </button>
          <button
            onClick={handleFeatureRequest}
            className="px-6 py-3 rounded-lg font-normal text-base hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: '#2C2C2C',
              color: '#F5F5F5'
            }}
          >
            Feature Request
          </button>
          <AuthButton />
          
          {/* Email Preferences Toggle */}
          {user && (
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
              <label htmlFor="email-reminders-toggle" className="text-sm font-medium text-gray-700 cursor-pointer">
                Daily Reminder Emails
              </label>
              <button
                id="email-reminders-toggle"
                type="button"
                onClick={() => handleEmailToggle(!emailRemindersEnabled)}
                disabled={updatingPreferences}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  emailRemindersEnabled ? 'bg-blue-600' : 'bg-gray-300'
                } ${updatingPreferences ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                aria-label="Toggle daily reminder emails"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    emailRemindersEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
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
            gradient="linear-gradient(180deg, rgba(190, 190, 190, 1) 0%, rgba(160, 160, 160, 1) 50%, rgba(200, 200, 200, 1) 100%)"
            avatarRing="linear-gradient(135deg, rgba(192, 192, 192, 1) 0%, rgba(220, 220, 220, 1) 100%)"
          />

          {/* 1st Place */}
          <PodiumCard
            data={podiumData[0]}
            height="h-[240px] sm:h-[280px]"
            gradient="linear-gradient(180deg, rgba(255, 215, 0, 1) 0%, rgba(255, 193, 7, 1) 50%, rgba(255, 223, 77, 1) 100%)"
            avatarRing="linear-gradient(135deg, rgba(255, 215, 0, 1) 0%, rgba(255, 193, 7, 1) 100%)"
          />

          {/* 3rd Place */}
          <PodiumCard
            data={podiumData[2]}
            height="h-[160px] sm:h-[190px]"
            gradient="linear-gradient(180deg, rgba(205, 127, 50, 1) 0%, rgba(184, 115, 51, 1) 50%, rgba(210, 150, 100, 1) 100%)"
            avatarRing="linear-gradient(135deg, rgba(205, 127, 50, 1) 0%, rgba(184, 115, 51, 1) 100%)"
          />
        </div>
      )}

      {/* Leaderboard Table */}
      {!loading && (
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Table Header - Desktop */}
            <div className="hidden sm:grid sm:grid-cols-6">
              {/* Name Header */}
              <div className="bg-gray-50 rounded-l-lg px-6 py-3 flex items-center gap-2 border-r border-gray-200">
                <span className="text-sm font-medium text-gray-600">Name</span>
              </div>

              {/* Place Header */}
              <div className="bg-gray-50 px-6 py-3 flex items-center justify-center gap-2 border-r border-gray-200">
                <span className="text-sm font-medium text-gray-600 capitalize">Place</span>
              </div>

              {/* Weekly Header */}
              <div className="bg-gray-50 px-6 py-3 flex items-center justify-center gap-2 border-r border-gray-200">
                <span className="text-sm font-medium text-gray-600">Weekly</span>
              </div>

              {/* All Time Header */}
              <div className="bg-gray-50 px-6 py-3 flex items-center justify-center gap-2 border-r border-gray-200">
                <span className="text-sm font-medium text-gray-600">All Time</span>
              </div>

              {/* Speech URLs Header */}
              <div className="bg-gray-50 px-6 py-3 flex items-center justify-center gap-2 border-r border-gray-200">
                <span className="text-sm font-medium text-gray-600">Recordings</span>
              </div>

              {/* Ballots Header */}
              <div className="bg-gray-50 rounded-r-lg px-6 py-3 flex items-center justify-center gap-2">
                <span className="text-sm font-medium text-gray-600">Ballots</span>
              </div>
            </div>

          {/* Table Body */}
          <div>
            {leaderboardData.map((entry, index) => (
              <div key={index} className="border-b border-gray-100 last:border-b-0">
                {/* Desktop View */}
                <div className="hidden sm:grid sm:grid-cols-6 items-start">
                  {/* Name and Avatar */}
                  <div className="px-6 py-4 flex items-center gap-3">
                    {entry.avatar_url ? (
                      <Image
                        src={entry.avatar_url}
                        alt={entry.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <div className="w-6 h-6 bg-gray-500 rounded-full"></div>
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700">{entry.name}</span>
                  </div>

                  {/* Place */}
                  <div className="px-6 py-4 text-center">
                    <span className="text-sm font-normal text-gray-700">{entry.place}</span>
                  </div>

                  {/* Weekly */}
                  <div className="px-6 py-4 text-center">
                    <span className="text-sm font-normal text-gray-700">{entry.weekly_speeches}</span>
                  </div>

                  {/* All Time */}
                  <div className="px-6 py-4 text-center">
                    <span className="text-sm font-normal text-gray-700">{entry.all_time_speeches}</span>
                  </div>

                  {/* Speech URLs */}
                  <div className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      {entry.speech_details && entry.speech_details.length > 0 ? (
                        entry.speech_details.map((speechDetail, urlIndex) => (
                          <a
                            key={urlIndex}
                            href={speechDetail.speech_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                          >
                            Recording {urlIndex + 1}
                          </a>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </div>
                  </div>

                  {/* Ballots */}
                  <div className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      {entry.speech_details && entry.speech_details.length > 0 ? (
                        entry.speech_details.map((speechDetail, speechIndex) => {
                          const ballotCount = speechDetail.ballots?.length || 0;

                          return (
                            <div key={speechIndex} className="text-sm">
                              {ballotCount > 0 ? (
                                <button
                                  onClick={() => openBallotViewModal(speechDetail.ballots)}
                                  className="text-blue-600 hover:text-blue-800 active:text-blue-900 transition-colors text-left py-2 px-2 -ml-2 rounded hover:bg-blue-50 active:bg-blue-100"
                                >
                                  {ballotCount} ballot{ballotCount !== 1 ? 's' : ''}
                                </button>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
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
                <div className="sm:hidden p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {entry.avatar_url ? (
                        <Image
                          src={entry.avatar_url}
                          alt={entry.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <div className="w-6 h-6 bg-gray-500 rounded-full"></div>
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-medium text-gray-700 block">{entry.name}</span>
                        <span className="text-xs text-gray-500">Place: {entry.place}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 justify-between text-xs text-gray-600 mb-2">
                    <span>Weekly: {entry.weekly_speeches}</span>
                    <span>All Time: {entry.all_time_speeches}</span>
                  </div>
                  {entry.speech_details && entry.speech_details.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500 mb-1 block">Recordings:</span>
                      <div className="space-y-2">
                        {entry.speech_details.map((speechDetail, urlIndex) => {
                          const ballotCount = speechDetail.ballots?.length || 0;

                          return (
                            <div key={urlIndex} className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <a
                                  href={speechDetail.speech_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                >
                                  Recording {urlIndex + 1}
                                </a>
                                {ballotCount > 0 && (
                                  <button
                                    onClick={() => openBallotViewModal(speechDetail.ballots)}
                                    className="text-xs text-gray-600 hover:text-gray-800 active:text-gray-900 py-2 px-2 -ml-2 rounded hover:bg-gray-50 active:bg-gray-100"
                                  >
                                    ({ballotCount} ballot{ballotCount !== 1 ? 's' : ''})
                                  </button>
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
      </div>
    </>
  );
};

export default LeaderBoard;
