import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { playTrackNow } from '../redux/features/playerSlice';
import SongCard from '../components/SongCard';
import SongRow from '../components/SongRow';
import ArtistCard from '../components/ArtistCard';
import { FaPlay, FaFire, FaMusic } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { normalizeSong } from '../utils/normalizeSong';
import { API_BASE } from '../services/apiConfig';

// Instant seed Indian tracks for 0ms initial render
const instantTrendingSeeds = [
  {
    videoId: 'BddP6PYo2gs',
    title: 'Kesariya (From "Brahmastra")',
    artist: 'Pritam, Arijit Singh, Amitabh Bhattacharya',
    thumbnail: 'https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg',
    duration: '4:28',
  },
  {
    videoId: 'LK7-_dgAVQE',
    title: 'Tauba Tauba (From "Bad Newz")',
    artist: 'Karan Aujla',
    thumbnail: 'https://i.ytimg.com/vi/LK7-_dgAVQE/hqdefault.jpg',
    duration: '3:32',
  },
  {
    videoId: 'cl0a3i2wFcc',
    title: 'Lover',
    artist: 'Diljit Dosanjh',
    thumbnail: 'https://i.ytimg.com/vi/cl0a3i2wFcc/hqdefault.jpg',
    duration: '3:05',
  },
  {
    videoId: 'ElZfdU54Cp8',
    title: 'Apna Bana Le (From "Bhediya")',
    artist: 'Arijit Singh, Sachin-Jigar',
    thumbnail: 'https://i.ytimg.com/vi/ElZfdU54Cp8/hqdefault.jpg',
    duration: '4:21',
  },
  {
    videoId: 'cWMxCE2HTag',
    title: 'Softly',
    artist: 'Karan Aujla, Ikky',
    thumbnail: 'https://i.ytimg.com/vi/cWMxCE2HTag/hqdefault.jpg',
    duration: '2:36',
  },
  {
    videoId: 'RLzC55ai0eo',
    title: 'Heeriye (feat. Arijit Singh)',
    artist: 'Jasleen Royal, Arijit Singh',
    thumbnail: 'https://i.ytimg.com/vi/RLzC55ai0eo/hqdefault.jpg',
    duration: '3:15',
  },
];

const instantPunjabiSeeds = [
  {
    videoId: 'vX2cDW8LUWk',
    title: '52 Bars',
    artist: 'Karan Aujla, Ikky',
    thumbnail: 'https://i.ytimg.com/vi/vX2cDW8LUWk/hqdefault.jpg',
    duration: '3:45',
  },
  {
    videoId: 'dCmp56tSSmA',
    title: 'Hass Hass',
    artist: 'Diljit Dosanjh, Sia',
    thumbnail: 'https://i.ytimg.com/vi/dCmp56tSSmA/hqdefault.jpg',
    duration: '2:34',
  },
  {
    videoId: 'Tpu8Pz_pAqw',
    title: 'Cheques',
    artist: 'Shubh',
    thumbnail: 'https://i.ytimg.com/vi/Tpu8Pz_pAqw/hqdefault.jpg',
    duration: '3:03',
  },
  {
    videoId: 'tms3r96Qn6M',
    title: 'With You',
    artist: 'AP Dhillon',
    thumbnail: 'https://i.ytimg.com/vi/tms3r96Qn6M/hqdefault.jpg',
    duration: '2:33',
  },
];

const indianGenres = [
  { name: 'Bollywood Romance', query: 'bollywood romantic hits songs', color: 'from-rose-600 to-red-900' },
  { name: 'Punjabi Fire', query: 'punjabi party hits diljit karan aujla', color: 'from-amber-600 to-orange-900' },
  { name: 'Desi Hip-Hop', query: 'desi hip hop divine seedhe maut', color: 'from-red-700 to-neutral-900' },
  { name: 'Sufi & Ghazals', query: 'soulful sufi ghazals rahat nusrat', color: 'from-emerald-700 to-teal-950' },
  { name: 'South Chartbusters', query: 'tamil telugu top hit songs anirudh', color: 'from-violet-700 to-purple-950' },
  { name: '90s Nostalgia', query: '90s evergreen bollywood classics sonu alka', color: 'from-pink-700 to-rose-950' },
];

const topIndianArtists = [
  { name: 'Arijit Singh', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80', subscribers: '38M+ Listeners' },
  { name: 'Diljit Dosanjh', image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&auto=format&fit=crop&q=80', subscribers: '24M+ Listeners' },
  { name: 'Shreya Ghoshal', image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&auto=format&fit=crop&q=80', subscribers: '22M+ Listeners' },
  { name: 'Karan Aujla', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop&q=80', subscribers: '18M+ Listeners' },
  { name: 'Anirudh Ravichander', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80', subscribers: '19M+ Listeners' },
  { name: 'Sid Sriram', image: 'https://images.unsplash.com/photo-1445985543470-41fdd6ce388d?w=300&auto=format&fit=crop&q=80', subscribers: '15M+ Listeners' },
];

const Home = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Read fast cache from sessionStorage if available
  const getCached = (key, fallback) => {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  };

  const [trendingIndia, setTrendingIndia] = useState(() => getCached('tt_trending', instantTrendingSeeds));
  const [punjabiHits, setPunjabiHits] = useState(() => getCached('tt_punjabi', instantPunjabiSeeds));

  useEffect(() => {
    let mounted = true;

    // Parallel background fetch - 0 wait time, UI is already interactive!
    Promise.all([
      fetch(`${API_BASE}/api/search?q=trending+hindi+bollywood+songs+india&filter=songs&language=en&hl=en`)
        .then((r) => r.json())
        .catch(() => null),
      fetch(`${API_BASE}/api/search?q=punjabi+top+trending+songs&filter=songs&language=en&hl=en`)
        .then((r) => r.json())
        .catch(() => null),
    ]).then(([trendData, punjabiData]) => {
      if (!mounted) return;

      if (trendData?.results?.length > 0) {
        const norm = trendData.results.map(normalizeSong).filter(Boolean);
        setTrendingIndia(norm);
        try { sessionStorage.setItem('tt_trending', JSON.stringify(norm)); } catch {}
      }

      if (punjabiData?.results?.length > 0) {
        const norm = punjabiData.results.map(normalizeSong).filter(Boolean);
        setPunjabiHits(norm);
        try { sessionStorage.setItem('tt_punjabi', JSON.stringify(norm)); } catch {}
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handlePlayTrending = () => {
    if (trendingIndia.length > 0) {
      dispatch(playTrackNow({ song: trendingIndia[0], songs: trendingIndia, index: 0 }));
    }
  };

  return (
    <div className="flex flex-col gap-7 pb-28 select-none animate-fade-in">
      {/* ─── Hero Indian Banner (Compact & Sleek) ───────────────────── */}
      <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-rose-900/35 via-red-950/50 to-dark-900 border border-rose-500/20 shadow-md">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-semibold mb-1.5">
            <HiSparkles className="text-xs" />
            <span>Desi Beats • Bollywood • Punjabi • South</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight theme-text-main">
            India's Music Hub, <span className="text-rose-500">Free & Lossless</span>
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={handlePlayTrending}
              disabled={trendingIndia.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
            >
              <FaPlay className="text-[10px]" />
              <span>Play India Trending</span>
            </button>

            <button
              onClick={() => navigate('/charts')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-500/10 hover:bg-slate-500/20 theme-text-main font-semibold text-xs border theme-border transition-all"
            >
              <FaFire className="text-rose-500 text-xs" />
              <span>India Top 50</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Indian Moods & Genres ──────────────────────────────────── */}
      <div>
        <h2 className="text-base md:text-lg font-bold theme-text-main mb-2.5">
          Popular Desi Genres
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {indianGenres.map((genre) => (
            <div
              key={genre.name}
              onClick={() => navigate(`/search/${encodeURIComponent(genre.query)}`)}
              className={`relative overflow-hidden p-3 rounded-xl bg-gradient-to-br ${genre.color} cursor-pointer group shadow hover:scale-[1.03] transition-all`}
            >
              <span className="font-bold text-xs text-white block z-10 relative">
                {genre.name}
              </span>
              <span className="text-[9px] text-white/70 block mt-0.5 z-10 relative">
                Curated
              </span>
              <div className="absolute -bottom-2 -right-2 text-white/20 text-3xl transform rotate-12 group-hover:scale-125 transition-transform">
                <FaMusic />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Trending in India ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-500">
              <FaFire className="text-sm" />
            </div>
            <div>
              <h2 className="text-base md:text-xl font-bold theme-text-main">Trending in India</h2>
              <p className="text-[11px] theme-text-muted">Today's top streamed Bollywood & viral tracks</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/charts')}
            className="text-xs font-semibold text-rose-500 hover:text-rose-400"
          >
            See all
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 sm:gap-3">
          {trendingIndia.slice(0, 24).map((song, i) => (
            <SongCard key={song.videoId || i} song={song} songs={trendingIndia} index={i} />
          ))}
        </div>
      </div>

      {/* ─── Featured Indian Artists ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base md:text-xl font-bold theme-text-main">Top Indian Artists</h2>
            <p className="text-[11px] theme-text-muted">Follow your favorite singers and composers</p>
          </div>
          <button
            onClick={() => navigate('/artists')}
            className="text-xs font-semibold text-rose-500 hover:text-rose-400"
          >
            All Artists
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 sm:gap-3">
          {topIndianArtists.map((artist, i) => (
            <ArtistCard key={i} artist={artist} />
          ))}
        </div>
      </div>

      {/* ─── Punjabi Wave Hits ──────────────────────────────────────── */}
      {punjabiHits.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold theme-text-main">Punjabi Wave</h2>
              <p className="text-xs theme-text-muted">High-energy bangers from Punjab</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {punjabiHits.slice(0, 12).map((song, i) => (
              <SongRow key={song.videoId || i} song={song} index={i} songs={punjabiHits} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
