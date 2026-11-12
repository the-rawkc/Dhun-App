import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { playTrackNow } from '../redux/features/playerSlice';
import SongRow from '../components/SongRow';
import { FaFire, FaPlay } from 'react-icons/fa';
import { normalizeSong } from '../utils/normalizeSong';
import { API_BASE } from '../services/apiConfig';

const instantChartSeeds = [
  { videoId: 'BddP6PYo2gs', title: 'Kesariya (From "Brahmastra")', artist: 'Pritam, Arijit Singh', thumbnail: 'https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg', duration: '4:28' },
  { videoId: 'LK7-_dgAVQE', title: 'Tauba Tauba (From "Bad Newz")', artist: 'Karan Aujla', thumbnail: 'https://i.ytimg.com/vi/LK7-_dgAVQE/hqdefault.jpg', duration: '3:32' },
  { videoId: 'cl0a3i2wFcc', title: 'Lover', artist: 'Diljit Dosanjh', thumbnail: 'https://i.ytimg.com/vi/cl0a3i2wFcc/hqdefault.jpg', duration: '3:05' },
  { videoId: 'ElZfdU54Cp8', title: 'Apna Bana Le (From "Bhediya")', artist: 'Arijit Singh, Sachin-Jigar', thumbnail: 'https://i.ytimg.com/vi/ElZfdU54Cp8/hqdefault.jpg', duration: '4:21' },
  { videoId: 'cWMxCE2HTag', title: 'Softly', artist: 'Karan Aujla, Ikky', thumbnail: 'https://i.ytimg.com/vi/cWMxCE2HTag/hqdefault.jpg', duration: '2:36' },
  { videoId: 'RLzC55ai0eo', title: 'Heeriye (feat. Arijit Singh)', artist: 'Jasleen Royal, Arijit Singh', thumbnail: 'https://i.ytimg.com/vi/RLzC55ai0eo/hqdefault.jpg', duration: '3:15' },
  { videoId: 'vX2cDW8LUWk', title: '52 Bars', artist: 'Karan Aujla, Ikky', thumbnail: 'https://i.ytimg.com/vi/vX2cDW8LUWk/hqdefault.jpg', duration: '3:45' },
  { videoId: 'dCmp56tSSmA', title: 'Hass Hass', artist: 'Diljit Dosanjh, Sia', thumbnail: 'https://i.ytimg.com/vi/dCmp56tSSmA/hqdefault.jpg', duration: '2:34' },
];

const chartTabs = [
  { name: 'India Top 50', query: 'top 50 hindi songs 2026' },
  { name: 'Bollywood Hits', query: 'bollywood top weekly songs' },
  { name: 'Punjabi Hot 20', query: 'punjabi top 20 trending songs' },
  { name: 'South India Top 20', query: 'tamil telugu top 20 songs anirudh' },
];

const Charts = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState(chartTabs[0]);
  const [continuationToken, setContinuationToken] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  const getCached = (key) => {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  };

  const [tracks, setTracks] = useState(() => getCached(`tt_chart_${activeTab.name}`) || instantChartSeeds);

  useEffect(() => {
    let mounted = true;
    const cacheKey = `tt_chart_${activeTab.name}`;
    const cached = getCached(cacheKey);
    if (cached) {
      setTracks(cached);
    }

    const loadChartData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(activeTab.query)}&filter=songs&language=en&hl=en`);
        const data = await res.json();
        if (!mounted) return;

        let songList = [];
        let nextTok = data?.continuationToken || null;

        if (data?.results?.length > 0) {
          songList = data.results.map(normalizeSong).filter(Boolean);
        }

        // For "India Top 50" (or if song list is under 35), auto-fetch continuation immediately so all 50 songs show
        if (nextTok && songList.length < 35) {
          try {
            const nextRes = await fetch(`${API_BASE}/api/search?continuationToken=${encodeURIComponent(nextTok)}&language=en&hl=en`);
            const nextData = await nextRes.json();
            if (nextData?.results?.length > 0) {
              const moreSongs = nextData.results.map(normalizeSong).filter(Boolean);
              const seen = new Set(songList.map((s) => s.videoId));
              moreSongs.forEach((s) => {
                if (!seen.has(s.videoId)) {
                  seen.add(s.videoId);
                  songList.push(s);
                }
              });
              nextTok = nextData.continuationToken || null;
            }
          } catch (e) {}
        }

        if (mounted && songList.length > 0) {
          setTracks(songList);
          setContinuationToken(nextTok);
          try { sessionStorage.setItem(cacheKey, JSON.stringify(songList)); } catch {}
        }
      } catch (err) {
        console.warn('Charts load error:', err);
      }
    };

    loadChartData();

    return () => {
      mounted = false;
    };
  }, [activeTab]);

  const handleLoadMore = async () => {
    if (!continuationToken || isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const res = await fetch(`${API_BASE}/api/search?continuationToken=${encodeURIComponent(continuationToken)}&language=en&hl=en`);
      const data = await res.json();

      if (data?.results?.length) {
        let addedCount = 0;
        const newSongs = data.results.map(normalizeSong).filter(Boolean);

        setTracks((prev) => {
          const seen = new Set(prev.map((s) => s.videoId));
          const uniqueNew = newSongs.filter((s) => !seen.has(s.videoId));
          addedCount = uniqueNew.length;
          return [...prev, ...uniqueNew];
        });

        if (addedCount === 0 || !data?.continuationToken) {
          setContinuationToken(null);
        } else {
          setContinuationToken(data.continuationToken);
        }
      } else {
        setContinuationToken(null);
      }
    } catch (err) {
      console.warn('Load more error:', err);
      setContinuationToken(null);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!sentinelRef.current || !continuationToken || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [continuationToken, isLoadingMore]);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      dispatch(playTrackNow({ song: tracks[0], songs: tracks, index: 0 }));
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-28 select-none animate-fade-in">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 p-6 md:p-8 rounded-3xl bg-gradient-to-r from-rose-900/40 via-red-950/20 to-transparent border border-rose-500/20">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-700 flex items-center justify-center text-white shadow-xl shadow-rose-600/30">
            <FaFire className="text-4xl" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-rose-500">
              India Official Rankings
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold theme-text-main mt-1">
              {activeTab.name}
            </h1>
            <p className="text-xs md:text-sm theme-text-muted mt-2">
              Showing {tracks.length} songs • Official trending music in India
            </p>
          </div>
        </div>

        <button
          onClick={handlePlayAll}
          disabled={tracks.length === 0}
          className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
        >
          <FaPlay className="text-xs" />
          <span>Play All</span>
        </button>
      </div>

      {/* Indian Chart Categories Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
        {chartTabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => {
              setActiveTab(tab);
              setContinuationToken(null);
            }}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab.name === tab.name
                ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                : 'bg-slate-500/10 hover:bg-slate-500/20 theme-text-main'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {tracks.map((song, i) => (
          <SongRow key={song.videoId || i} song={song} index={i} songs={tracks} />
        ))}
      </div>

      {/* Sentinel for auto infinite-scroll */}
      {continuationToken && !isLoadingMore && (
        <div ref={sentinelRef} className="h-4" />
      )}

      {/* Load More Button */}
      {continuationToken && (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-rose-500 text-xs font-semibold">
              <div className="w-5 h-5 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
              <span>Loading more songs...</span>
            </div>
          ) : (
            <button
              onClick={handleLoadMore}
              className="px-6 py-2.5 rounded-full bg-slate-500/10 hover:bg-rose-600 hover:text-white theme-text-main font-bold text-xs transition-all shadow-sm flex items-center gap-2"
            >
              <span>Load More Songs</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Charts;
