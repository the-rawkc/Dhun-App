import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { playSong } from '../redux/features/playerSlice';
import SongRow from '../components/SongRow';
import { FaHistory, FaPlay } from 'react-icons/fa';

const Recent = () => {
  const dispatch = useDispatch();
  const { recentTracks } = useSelector((state) => state.player);

  const handlePlayAll = () => {
    if (recentTracks.length > 0) {
      dispatch(playSong({ song: recentTracks[0], songs: recentTracks, index: 0 }));
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-20 select-none animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 p-6 md:p-8 rounded-3xl bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-transparent border border-white/10">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/20">
            <FaHistory className="text-4xl" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              History
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mt-1">Recently Played</h1>
            <p className="text-xs md:text-sm text-slate-400 mt-2">
              Songs you have listened to recently on Dhun
            </p>
          </div>
        </div>

        {recentTracks.length > 0 && (
          <button
            onClick={handlePlayAll}
            className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-tunetide-500 to-emerald-400 text-dark-950 font-bold text-sm shadow-lg shadow-tunetide-500/30 hover:scale-105 active:scale-95 transition-all"
          >
            <FaPlay className="text-xs" />
            <span>Play History</span>
          </button>
        )}
      </div>

      {recentTracks.length > 0 ? (
        <div className="space-y-1">
          {recentTracks.map((song, i) => (
            <SongRow key={song.videoId || i} song={song} index={i} songs={recentTracks} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
          <FaHistory className="text-4xl text-slate-600" />
          <h3 className="text-base font-bold text-slate-300">No playback history yet</h3>
          <p className="text-xs text-slate-500">Play any track to start building your listening history.</p>
        </div>
      )}
    </div>
  );
};

export default Recent;
