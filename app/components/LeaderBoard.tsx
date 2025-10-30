import React from 'react';

interface LeaderBoardEntry {
  name: string;
  place: number;
  speeches: number;
  avatar?: string;
}

const leaderboardData: LeaderBoardEntry[] = [
  { name: 'Brook', place: 1, speeches: 3 },
  { name: 'Robert', place: 2, speeches: 2 },
  { name: 'Darrell', place: 3, speeches: 1 },
  { name: 'Jerome Bell', place: 4, speeches: 0 },
  { name: 'Annette Black', place: 5, speeches: 0 },
];

const podiumData = [
  { name: 'Brook', place: 1, speeches: 3, position: '1st' },
  { name: 'Robert', place: 2, speeches: 2, position: '2nd' },
  { name: 'Darrell', place: 3, speeches: 1, position: '3rd' },
];

const PodiumCard: React.FC<{ data: typeof podiumData[0]; height: string; gradient: string; avatarRing: string }> = ({
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
        <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center shadow-inner">
          <div className={`${data.place === 1 ? 'w-10 h-10' : 'w-8 h-8'} bg-gradient-to-br from-gray-500 to-gray-700 rounded-full`}></div>
        </div>
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
  return (
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
          className="px-6 py-3 rounded-lg font-normal text-base hover:opacity-90 transition-opacity"
          style={{
            backgroundColor: '#2C2C2C',
            color: '#F5F5F5'
          }}
        >
          New Speech
        </button>
        <button
          className="px-6 py-3 rounded-lg font-normal text-base hover:opacity-90 transition-opacity"
          style={{
            backgroundColor: '#2C2C2C',
            color: '#F5F5F5'
          }}
        >
          Log In
        </button>
      </div>

      {/* Podium Section */}
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

      {/* Leaderboard Table */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Table Header - Desktop */}
          <div className="hidden sm:flex">
            {/* Name Header */}
            <div className="flex-1 bg-gray-50 rounded-l-lg px-6 py-3 flex items-center gap-2 border-r border-gray-200">
              <span className="text-sm font-medium text-gray-600">Name</span>
            </div>

            {/* Place Header */}
            <div className="flex-1 bg-gray-50 px-6 py-3 flex items-center justify-center gap-2 border-r border-gray-200">
              <span className="text-sm font-medium text-gray-600 capitalize">Place</span>
            </div>

            {/* Speeches Header */}
            <div className="flex-1 bg-gray-50 rounded-r-lg px-6 py-3 flex items-center justify-center gap-2">
              <span className="text-sm font-medium text-gray-600">Speeches</span>
            </div>
          </div>

          {/* Table Body */}
          <div>
            {leaderboardData.map((entry, index) => (
              <div key={index} className="border-b border-gray-100 last:border-b-0">
                {/* Desktop View */}
                <div className="hidden sm:flex items-center">
                  {/* Name and Avatar */}
                  <div className="flex-1 px-6 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <div className="w-6 h-6 bg-gray-500 rounded-full"></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{entry.name}</span>
                  </div>

                  {/* Place */}
                  <div className="flex-1 px-6 py-4 text-center">
                    <span className="text-sm font-normal text-gray-700">{entry.place}</span>
                  </div>

                  {/* Speeches */}
                  <div className="flex-1 px-6 py-4 text-center">
                    <span className="text-sm font-normal text-gray-700">{entry.speeches}</span>
                  </div>
                </div>

                {/* Mobile View */}
                <div className="sm:hidden p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <div className="w-6 h-6 bg-gray-500 rounded-full"></div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700 block">{entry.name}</span>
                        <span className="text-xs text-gray-500">Place: {entry.place}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-normal text-gray-700">{entry.speeches} Speech{entry.speeches !== 1 ? 'es' : ''}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderBoard;
