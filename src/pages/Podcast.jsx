import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { playSong } from '../redux/features/playerSlice';
import SongCard from '../components/SongCard';
import { FaPodcast, FaPlay } from 'react-icons/fa';
import { normalizeSong } from '../utils/normalizeSong';
import { API_BASE } from '../services/apiConfig';

const categories = [
  'Tiny Desk Concert acoustic live',
  'Lo-Fi hip hop live stream',
  'EDM festival live DJ set',
  'Ambient study music session',
  'Coke Studio acoustic songs',
];

const Podcast = () => {
  const dispatch = useDispatch();
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`${API_BASE}/api/search?q=${encodeURIComponent('acoustic live session tiny desk')}&filter=songs&language=en&hl=en`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const tracks = (data?.results || []).map(normalizeSong).filter(Boolean);
        setSets(tracks);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-8 pb-20 select-none animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 p-6 md:p-8 rounded-3xl bg-gradient-to-r from-purple-500/20 via-tunetide-500/10 to-transparent border border-white/10">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
            <FaPodcast className="text-4xl" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
              Live Sets & Shows
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mt-1">Podcasts & Sessions</h1>
            <p className="text-xs md:text-sm text-slate-400 mt-2">
              Uncut live acoustic performances, DJ sets, and podcast streams
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {sets.map((song, i) => (
            <SongCard key={song.videoId || i} song={song} songs={sets} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Podcast;
