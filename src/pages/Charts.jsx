import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { playTrackNow, shufflePlayTracks, appendQueueTracks } from '../redux/features/playerSlice';
import SongRow from '../components/SongRow';
import { FaFire, FaPlay, FaRandom, FaSyncAlt } from 'react-icons/fa';
import { normalizeSong } from '../utils/normalizeSong';
import { API_BASE } from '../services/apiConfig';

const instantHindiChartSeeds = [
  { videoId: 'BddP6PYo2gs', title: 'Kesariya (From "Brahmastra")', artist: 'Pritam, Arijit Singh', thumbnail: 'https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg', duration: '4:28' },
  { videoId: 'ElZfdU54Cp8', title: 'Apna Bana Le (From "Bhediya")', artist: 'Arijit Singh, Sachin-Jigar', thumbnail: 'https://i.ytimg.com/vi/ElZfdU54Cp8/hqdefault.jpg', duration: '4:21' },
  { videoId: 'RLzC55ai0eo', title: 'Heeriye (feat. Arijit Singh)', artist: 'Jasleen Royal, Arijit Singh', thumbnail: 'https://i.ytimg.com/vi/RLzC55ai0eo/hqdefault.jpg', duration: '3:15' },
  { videoId: '2qK_q9g5d8k', title: 'Satranga (From "ANIMAL")', artist: 'Arijit Singh, Shreyas Puranik', thumbnail: 'https://i.ytimg.com/vi/2qK_q9g5d8k/hqdefault.jpg', duration: '4:31' },
  { videoId: 'k4yXQkGLeAA', title: 'O Maahi (From "Dunki")', artist: 'Pritam, Arijit Singh', thumbnail: 'https://i.ytimg.com/vi/k4yXQkGLeAA/hqdefault.jpg', duration: '3:53' },
  { videoId: 'YxWlaYCA8MU', title: 'Pehle Bhi Main (From "ANIMAL")', artist: 'Vishal Mishra, Raj Shekhar', thumbnail: 'https://i.ytimg.com/vi/YxWlaYCA8MU/hqdefault.jpg', duration: '4:10' },
  { videoId: 'LK7-_dgAVQE', title: 'Tauba Tauba (From "Bad Newz")', artist: 'Karan Aujla', thumbnail: 'https://i.ytimg.com/vi/LK7-_dgAVQE/hqdefault.jpg', duration: '3:32' },
  { videoId: 'yJg-Y5byMMw', title: 'Tum Se (From "Teri Baaton Mein")', artist: 'Sachin-Jigar, Raghav Chaitanya', thumbnail: 'https://i.ytimg.com/vi/yJg-Y5byMMw/hqdefault.jpg', duration: '4:24' },
];

const instantPunjabiChartSeeds = [
  { videoId: 'LK7-_dgAVQE', title: 'Tauba Tauba (From "Bad Newz")', artist: 'Karan Aujla', thumbnail: 'https://i.ytimg.com/vi/LK7-_dgAVQE/hqdefault.jpg', duration: '3:32' },
  { videoId: 'cl0a3i2wFcc', title: 'Lover', artist: 'Diljit Dosanjh', thumbnail: 'https://i.ytimg.com/vi/cl0a3i2wFcc/hqdefault.jpg', duration: '3:05' },
  { videoId: 'cWMxCE2HTag', title: 'Softly', artist: 'Karan Aujla, Ikky', thumbnail: 'https://i.ytimg.com/vi/cWMxCE2HTag/hqdefault.jpg', duration: '2:36' },
  { videoId: 'vX2cDW8LUWk', title: '52 Bars', artist: 'Karan Aujla, Ikky', thumbnail: 'https://i.ytimg.com/vi/vX2cDW8LUWk/hqdefault.jpg', duration: '3:45' },
  { videoId: 'dCmp56tSSmA', title: 'Hass Hass', artist: 'Diljit Dosanjh, Sia', thumbnail: 'https://i.ytimg.com/vi/dCmp56tSSmA/hqdefault.jpg', duration: '2:34' },
  { videoId: 'Tpu8Pz_pAqw', title: 'Cheques', artist: 'Shubh', thumbnail: 'https://i.ytimg.com/vi/Tpu8Pz_pAqw/hqdefault.jpg', duration: '3:03' },
  { videoId: 'tms3r96Qn6M', title: 'With You', artist: 'AP Dhillon', thumbnail: 'https://i.ytimg.com/vi/tms3r96Qn6M/hqdefault.jpg', duration: '2:33' },
  { videoId: 'hBCcW_2pU8U', title: 'Born to Shine', artist: 'Diljit Dosanjh', thumbnail: 'https://i.ytimg.com/vi/hBCcW_2pU8U/hqdefault.jpg', duration: '3:32' },
];

const instantHaryanviChartSeeds = [
  { videoId: 'CZt-rVn2BJs', title: '52 Gaj Ka Daman', artist: 'Renuka Panwar', thumbnail: 'https://i.ytimg.com/vi/CZt-rVn2BJs/hqdefault.jpg', duration: '3:05' },
  { videoId: 'cZSrWoBMSrg', title: 'Gypsy (Balam Thanedar)', artist: 'GD Kaur, Pranjal Dahiya', thumbnail: 'https://i.ytimg.com/vi/cZSrWoBMSrg/hqdefault.jpg', duration: '2:52' },
  { videoId: 'nfs8NYg7yQM', title: 'Chatak Matak', artist: 'Renuka Panwar, Sapna Choudhary', thumbnail: 'https://i.ytimg.com/vi/nfs8NYg7yQM/hqdefault.jpg', duration: '3:21' },
  { videoId: 'tJGBVigwPlU', title: 'Moto', artist: 'Diler Kharkiya, Ajay Hooda', thumbnail: 'https://i.ytimg.com/vi/tJGBVigwPlU/hqdefault.jpg', duration: '3:18' },
  { videoId: 'T0H_LWLiOGk', title: 'Up To Date', artist: 'Dhanda Nyoliwala', thumbnail: 'https://i.ytimg.com/vi/T0H_LWLiOGk/hqdefault.jpg', duration: '3:00' },
  { videoId: 'z6sDIc1Zqzs', title: 'Middle Class', artist: 'Gulzaar Chhaniwala', thumbnail: 'https://i.ytimg.com/vi/z6sDIc1Zqzs/hqdefault.jpg', duration: '3:45' },
  { videoId: 'MVF-GCOY2kI', title: '2 Numbari', artist: 'Masoom Sharma', thumbnail: 'https://i.ytimg.com/vi/MVF-GCOY2kI/hqdefault.jpg', duration: '3:12' },
  { videoId: 'kVtkC1I7-uc', title: 'Kothe Upar Kothri', artist: 'Renuka Panwar', thumbnail: 'https://i.ytimg.com/vi/kVtkC1I7-uc/hqdefault.jpg', duration: '3:30' },
  { videoId: 'xJ8M4Z_n1t8', title: 'Solid Body', artist: 'Raju Punjabi, Sheenam Katholic', thumbnail: 'https://i.ytimg.com/vi/xJ8M4Z_n1t8/hqdefault.jpg', duration: '3:40' },
  { videoId: '4H5gGfXo3eQ', title: 'Bahu Kale Ki', artist: 'Ajay Hooda, Gajender Phogat', thumbnail: 'https://i.ytimg.com/vi/4H5gGfXo3eQ/hqdefault.jpg', duration: '3:15' },
];

export const chartTabs = [
  {
    id: 'hindi-50',
    name: 'Hindi Top 50',
    subtitle: 'Top 50 trending Hindi & Bollywood chartbusters',
    query: 'top 50 hindi songs latest trending hits 2026',
    target: 50,
  },
  {
    id: 'punjabi-50',
    name: 'Punjabi Top 50',
    subtitle: 'Top 50 Punjabi hits, pop & high-energy bhangra',
    query: 'top 50 punjabi trending songs latest hits 2026',
    target: 50,
  },
  {
    id: 'haryanvi-50',
    name: 'Haryanvi Top 50',
    subtitle: 'Top 50 Haryanvi desi bangers & viral songs',
    query: 'top 50 haryanvi trending songs latest hits 2026',
    target: 50,
  },
  {
    id: 'bollywood-50',
    name: 'Bollywood Top 50',
    subtitle: 'Top 50 Bollywood romantic & party anthems',
    query: 'top 50 bollywood songs romantic dance latest hits',
    target: 50,
  },
  {
    id: 'india-100',
    name: 'India Top 100',
    subtitle: 'Top 100 songs streaming nationwide across India',
    query: 'top 100 indian songs trending viral music 2026',
    target: 100,
  },
  {
    id: 'south-50',
    name: 'South Top 50',
    subtitle: 'Top 50 South Indian songs (Tamil, Telugu, Malayalam)',
    query: 'top 50 south indian songs tamil telugu latest hits 2026',
    target: 50,
  },
];

const findTabByParam = (param) => {
  if (!param) return chartTabs[0];
  const p = param.toLowerCase().trim();
  const match = chartTabs.find(
    (t) =>
      t.id === p ||
      t.id.includes(p) ||
      p.includes(t.id) ||
      t.name.toLowerCase().includes(p) ||
      p.includes(t.name.toLowerCase())
  );
  return match || chartTabs[0];
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL for fresh chart rankings

const Charts = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(() => findTabByParam(tabParam));
  const [continuationToken, setContinuationToken] = useState(null);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  // Sync tab with URL search parameter if changed
  useEffect(() => {
    if (tabParam) {
      const match = findTabByParam(tabParam);
      if (match && match.id !== activeTab.id) {
        setActiveTab(match);
      }
    }
  }, [tabParam]);

  const getCached = (key) => {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.tracks) && (Date.now() - (parsed.timestamp || 0) < CACHE_TTL_MS)) {
        return parsed.tracks;
      }
    } catch {
      return null;
    }
    return null;
  };

  const getInitialSeeds = (tab) => {
    if (tab.id.includes('haryanvi')) return instantHaryanviChartSeeds;
    if (tab.id.includes('punjabi')) return instantPunjabiChartSeeds;
    return instantHindiChartSeeds;
  };

  const [tracks, setTracks] = useState(() => {
    const cached = getCached(`tt_chart_v2_${activeTab.id}`);
    if (cached && cached.length > 0) return cached;
    return getInitialSeeds(activeTab);
  });

  useEffect(() => {
    let mounted = true;
    const cacheKey = `tt_chart_v2_${activeTab.id}`;
    const cached = getCached(cacheKey);
    if (cached && cached.length > 0) {
      setTracks(cached);
    } else {
      setTracks(getInitialSeeds(activeTab));
    }

    const loadChartData = async () => {
      setIsLoadingChart(true);
      try {
        const res = await fetch(
          `${API_BASE}/api/search?q=${encodeURIComponent(activeTab.query)}&filter=songs&language=en&hl=en`
        );
        const data = await res.json();
        if (!mounted) return;

        let songList = [];
        let nextTok = data?.continuationToken || null;

        if (data?.results?.length > 0) {
          songList = data.results.map(normalizeSong).filter(Boolean);
        }

        const targetCount = activeTab.target || 50;

        // Auto-fetch continuation batches eagerly in background until targetCount is met
        let continuationAttempts = 0;
        while (nextTok && songList.length < targetCount && continuationAttempts < 6) {
          continuationAttempts++;
          try {
            const nextRes = await fetch(
              `${API_BASE}/api/search?continuationToken=${encodeURIComponent(nextTok)}&language=en&hl=en`
            );
            const nextData = await nextRes.json();
            if (!mounted) return;
            if (nextData?.results?.length > 0) {
              const moreSongs = nextData.results.map(normalizeSong).filter(Boolean);
              const seen = new Set(songList.map((s) => s.videoId));
              moreSongs.forEach((s) => {
                if (s && s.videoId && !seen.has(s.videoId)) {
                  seen.add(s.videoId);
                  songList.push(s);
                }
              });
              nextTok = nextData.continuationToken || null;
            } else {
              break;
            }
          } catch (e) {
            break;
          }
        }

        if (mounted && songList.length > 0) {
          setTracks(songList);
          setContinuationToken(nextTok);
          try {
            sessionStorage.setItem(
              cacheKey,
              JSON.stringify({ tracks: songList, timestamp: Date.now() })
            );
          } catch {}

          // If playback is already active from this chart, dynamically expand queue
          dispatch(appendQueueTracks({ newTracks: songList }));
        }
      } catch (err) {
        console.warn('Charts load error:', err);
      } finally {
        if (mounted) setIsLoadingChart(false);
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
      const res = await fetch(
        `${API_BASE}/api/search?continuationToken=${encodeURIComponent(continuationToken)}&language=en&hl=en`
      );
      const data = await res.json();

      if (data?.results?.length) {
        let addedCount = 0;
        const newSongs = data.results.map(normalizeSong).filter(Boolean);

        setTracks((prev) => {
          const seen = new Set(prev.map((s) => s.videoId));
          const uniqueNew = newSongs.filter((s) => !seen.has(s.videoId));
          addedCount = uniqueNew.length;
          const updated = [...prev, ...uniqueNew];
          dispatch(appendQueueTracks({ newTracks: uniqueNew }));
          return updated;
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

  const handleShufflePlay = () => {
    if (tracks.length > 0) {
      dispatch(shufflePlayTracks({ tracks }));
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setContinuationToken(null);
    setSearchParams({ tab: tab.id });
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
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-rose-500">
                Official Live Rankings
              </span>
              {isLoadingChart && (
                <span className="flex items-center gap-1 text-[11px] text-rose-400 font-semibold animate-pulse">
                  <FaSyncAlt className="text-[10px] animate-spin" />
                  Updating...
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold theme-text-main mt-1">
              {activeTab.name}
            </h1>
            <p className="text-xs md:text-sm theme-text-muted mt-2">
              {activeTab.subtitle} • {tracks.length} tracks loaded
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handlePlayAll}
            disabled={tracks.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
          >
            <FaPlay className="text-xs" />
            <span>Play All</span>
          </button>

          <button
            onClick={handleShufflePlay}
            disabled={tracks.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 py-3 rounded-full bg-slate-500/15 hover:bg-slate-500/25 theme-text-main font-bold text-sm border theme-border hover:scale-105 active:scale-95 transition-all disabled:opacity-40 shadow-md"
            title="Shuffle play all 50+ songs immediately"
          >
            <FaRandom className="text-xs text-rose-500" />
            <span>Shuffle Play</span>
          </button>
        </div>
      </div>

      {/* Indian Chart Categories Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
        {chartTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab.id === tab.id
                ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                : 'bg-slate-500/10 hover:bg-slate-500/20 theme-text-main'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Song List with Numerical Rankings */}
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
