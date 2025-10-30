'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import AuthButton from './AuthButton';
import SpeechSubmitModal from './SpeechSubmitModal';
import type { User } from '@supabase/supabase-js';

interface LeaderBoardEntry {
  name: string;
  place: number;
  all_time_speeches: number;
  weekly_speeches: number;
  avatar_url?: string;
  youtube_urls: string[];
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
        className={`${data.place === 1 ? 'w-16 h-16' : 'w-14 h-14'} rounded-full p-1 shadow-lg`}
        style={{ background: avatarRing }}
      >
        {data.avatar_url ? (
          <img 
            src={data.avatar_url} 
            alt={data.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-linear-to-br from-gray-400 to-gray-600 flex items-center justify-center shadow-inner">
            <div className={`${data.place === 1 ? 'w-10 h-10' : 'w-8 h-8'} bg-linear-to-br from-gray-500 to-gray-700 rounded-full`}></div>
          </div>
        )}
      </div>
      <span className={`${data.place === 1 ? 'text-base font-semibold' : 'text-sm font-medium'} text-gray-800`}>{data.name}</span>
    </div>

    {/* Podium */}
    <div
      className={`w-[130px] rounded-t-2xl flex flex-col items-center justify-end ${data.place === 3 ? 'pb-5' : 'pb-5'} relative shadow-xl transition-shadow hover:shadow-2xl`}
      style={{
        height: 'calc(100% - 90px)',
        background: gradient,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), inset 0 2px 10px rgba(255, 255, 255, 0.2)'
      }}
    >
      {/* Position number */}
      <span 
        className={`${data.place === 1 ? 'text-lg font-bold' : 'text-base font-semibold'} text-gray-800 drop-shadow-sm`}
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
  const [user, setUser] = useState<User | null>(null);
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

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    fetchLeaderboard();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('speeches-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'speeches' }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleNewSpeech = () => {
    if (!user) {
      alert('Please log in to submit a speech');
      return;
    }
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchLeaderboard();
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
      
      <div
        className="min-h-screen p-4 sm:p-8"
        style={{
          background: 'linear-gradient(185deg, rgba(255, 255, 255, 1) 0%, rgba(200, 204, 71, 0) 100%)',
          borderRadius: '62px'
        }}
      >
        {/* Top Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8 mb-8">
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
          <AuthButton />
        </div>

        {loading && (
          <div className="flex justify-center items-center min-h-[400px]">
            <p className="text-gray-600">Loading leaderboard...</p>
          </div>
        )}

      {/* Podium Section */}
      {!loading && podiumData.length >= 3 && (
        <div className="flex flex-col sm:flex-row justify-center items-center sm:items-end gap-6 sm:gap-6 mb-16">
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
            <div className="hidden sm:grid sm:grid-cols-5">
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

              {/* YouTube URLs Header */}
              <div className="bg-gray-50 rounded-r-lg px-6 py-3 flex items-center justify-center gap-2">
                <span className="text-sm font-medium text-gray-600">Videos</span>
              </div>
            </div>

          {/* Table Body */}
          <div>
            {leaderboardData.map((entry, index) => (
              <div key={index} className="border-b border-gray-100 last:border-b-0">
                {/* Desktop View */}
                <div className="hidden sm:grid sm:grid-cols-5 items-center">
                  {/* Name and Avatar */}
                  <div className="px-6 py-4 flex items-center gap-3">
                    {entry.avatar_url ? (
                      <img
                        src={entry.avatar_url}
                        alt={entry.name}
                        className="w-10 h-10 rounded-full object-cover"
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

                  {/* YouTube URLs */}
                  <div className="px-6 py-4 text-center">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {entry.youtube_urls && entry.youtube_urls.length > 0 ? (
                        entry.youtube_urls.map((url, urlIndex) => (
                          <a
                            key={urlIndex}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                          >
                            Video {urlIndex + 1}
                          </a>
                        ))
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
                        <img
                          src={entry.avatar_url}
                          alt={entry.name}
                          className="w-10 h-10 rounded-full object-cover"
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
                  {entry.youtube_urls && entry.youtube_urls.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500 mb-1 block">Videos:</span>
                      <div className="flex flex-wrap gap-2">
                        {entry.youtube_urls.map((url, urlIndex) => (
                          <a
                            key={urlIndex}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                          >
                            Video {urlIndex + 1}
                          </a>
                        ))}
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
