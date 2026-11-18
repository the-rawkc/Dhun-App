import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { playTrackNow, shufflePlayTracks, appendQueueTracks } from '../redux/features/playerSlice';
import SongRow from '../components/SongRow';
import { FaFire, FaPlay, FaRandom, FaSyncAlt } from 'react-icons/fa';
import { normalizeSong } from '../utils/normalizeSong';
import { API_BASE } from '../services/apiConfig';
import {
  isStrictHaryanvi,
  isStrictPunjabi,
  hasPunjabiSignature,
  hasHaryanviSignature,
} from '../utils/regionalFilter';
import {
  verifiedIndia10Seeds,
  verifiedHindiSeeds,
  verifiedPunjabiSeeds,
  verifiedHaryanviSeeds,
  verifiedIndia100Seeds,
} from '../utils/regionalSeeds';

export const chartTabs = [
  {
    id: 'india-10',
    name: 'India Top 10',
    subtitle: 'Official Top 10 hottest songs streaming across India today',
    queries: ['top 10 songs india trending viral music 2026', 'top songs viral india 2026', 'bollywood top trending songs hits'],
    target: 10,
  },
  {
    id: 'hindi-50',
    name: 'Hindi Top 50',
    subtitle: 'Top 50 trending Hindi & Bollywood chartbusters',
    queries: [
      'top 50 hindi songs latest trending hits 2026',
      'bollywood top weekly songs romantic dance hits',
      'latest hindi hit songs arijit pritam shreya',
    ],
    target: 50,
  },
  {
    id: 'punjabi-50',
    name: 'Punjabi Top 50',
    subtitle: 'Top 50 Punjabi hits, pop & high-energy bhangra',
    queries: [
      'top 50 punjabi trending songs latest hits 2026',
      'top punjabi songs latest hits speed records geet mp3',
      'punjabi hits karan aujla diljit shubh ap dhillon sidhu moose wala',
    ],
    target: 50,
  },
  {
    id: 'haryanvi-50',
    name: 'Haryanvi Top 50',
    subtitle: 'Top 50 Haryanvi desi bangers & viral songs',
    queries: [
      'top haryanvi songs hits nav haryanvi desi records',
      'haryanvi songs new latest hits sapna renuka gulzaar dhanda masoom',
      'top haryanvi songs khasa aala chahar amit saini ajay hooda',
    ],
    target: 50,
  },
  {
    id: 'bollywood-50',
    name: 'Bollywood Top 50',
    subtitle: 'Top 50 Bollywood romantic & party anthems',
    queries: ['top 50 bollywood songs romantic dance latest hits', 'bollywood hit songs arijit pritam shreya'],
    target: 50,
  },
  {
    id: 'india-100',
    name: 'India Top 100',
    subtitle: 'Top 100 songs streaming nationwide across India',
    queries: [
      'top 100 indian songs trending viral music 2026',
      'top trending music india 2026',
      'top 50 hindi songs latest hits 2026',
      'punjabi top trending songs 2026',
      'top haryanvi songs hits nav haryanvi',
      'south indian songs viral latest hits',
    ],
    target: 100,
  },
  {
    id: 'south-50',
    name: 'South Top 50',
    subtitle: 'Top 50 South Indian songs (Tamil, Telugu, Malayalam)',
    queries: ['top 50 south indian songs tamil telugu latest hits 2026'],
    target: 50,
  },
];

const findTabByParam = (param) => {
  if (!param) return chartTabs[0];
  const p = param.toLowerCase().trim();

  // 1. Exact ID match
  const exactId = chartTabs.find((t) => t.id === p);
  if (exactId) return exactId;

  // 2. Exact name match
  const exactName = chartTabs.find((t) => t.name.toLowerCase() === p);
  if (exactName) return exactName;

  // 3. Explicit numeric shortcuts
  if (p === '10' || p === 'top-10' || p === 'top 10' || p.includes('top-10') || p.includes('top 10')) {
    return chartTabs.find((t) => t.id === 'india-10') || chartTabs[0];
  }
  if (p === '100' || p === 'top-100' || p === 'top 100' || p.includes('100')) {
    return chartTabs.find((t) => t.id === 'india-100') || chartTabs[0];
  }
  if (p.includes('punjabi')) {
    return chartTabs.find((t) => t.id === 'punjabi-50') || chartTabs[0];
  }
  if (p.includes('haryanvi')) {
    return chartTabs.find((t) => t.id === 'haryanvi-50') || chartTabs[0];
  }
  if (p.includes('bollywood')) {
    return chartTabs.find((t) => t.id === 'bollywood-50') || chartTabs[0];
  }
  if (p.includes('south')) {
    return chartTabs.find((t) => t.id === 'south-50') || chartTabs[0];
  }
  if (p.includes('hindi') || p === '50' || p === 'top-50' || p === 'top 50') {
    return chartTabs.find((t) => t.id === 'hindi-50') || chartTabs[0];
  }

  return chartTabs[0];
};

const filterForTab = (song, tabId) => {
  if (!song) return false;
  if (tabId.includes('haryanvi')) {
    return isStrictHaryanvi(song) && !hasPunjabiSignature(song);
  }
  if (tabId.includes('punjabi')) {
    return isStrictPunjabi(song) && !hasHaryanviSignature(song);
  }
  if (tabId.includes('hindi') || tabId.includes('bollywood')) {
    const isPureRegional = (isStrictHaryanvi(song) || isStrictPunjabi(song)) && !song.title?.toLowerCase().includes('from');
    return !isPureRegional;
  }
  return true;
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
    if (tab.target === 10) return verifiedIndia10Seeds.slice(0, 10);
    if (tab.target === 100) return verifiedIndia100Seeds.slice(0, 100);
    if (tab.id.includes('haryanvi')) return verifiedHaryanviSeeds.slice(0, 50);
    if (tab.id.includes('punjabi')) return verifiedPunjabiSeeds.slice(0, 50);
    return verifiedHindiSeeds.slice(0, 50);
  };

  const [tracks, setTracks] = useState(() => {
    const cached = getCached(`tt_chart_v4_${activeTab.id}`);
    if (cached && cached.length === activeTab.target) return cached;
    return getInitialSeeds(activeTab);
  });

  useEffect(() => {
    let mounted = true;
    const cacheKey = `tt_chart_v4_${activeTab.id}`;
    const cached = getCached(cacheKey);
    const targetCount = activeTab.target || 50;

    if (cached && cached.length === targetCount) {
      setTracks(cached);
    } else {
      setTracks(getInitialSeeds(activeTab));
    }

    const loadChartData = async () => {
      setIsLoadingChart(true);
      try {
        const queries = activeTab.queries || [activeTab.query];
        const collected = [];
        const seen = new Set();
        let lastContinuation = null;

        for (const q of queries) {
          if (collected.length >= targetCount || !mounted) break;
          try {
            const res = await fetch(
              `${API_BASE}/api/search?q=${encodeURIComponent(q)}&filter=songs&language=en&hl=en`
            );
            const data = await res.json();
            if (!mounted) break;

            const items = (data?.results || []).map(normalizeSong).filter(Boolean);
            lastContinuation = data?.continuationToken || null;

            for (const s of items) {
              if (s && s.videoId && !seen.has(s.videoId) && filterForTab(s, activeTab.id)) {
                seen.add(s.videoId);
                collected.push(s);
                if (collected.length >= targetCount) break;
              }
            }

            // Chain continuation if we need more songs to satisfy target
            let continuationAttempts = 0;
            let curToken = lastContinuation;
            const maxContinuation = targetCount > 50 ? 8 : 4;
            while (curToken && collected.length < targetCount && continuationAttempts < maxContinuation) {
              continuationAttempts++;
              try {
                const nextRes = await fetch(
                  `${API_BASE}/api/search?continuationToken=${encodeURIComponent(curToken)}&language=en&hl=en`
                );
                const nextData = await nextRes.json();
                if (!mounted) break;
                const moreSongs = (nextData?.results || []).map(normalizeSong).filter(Boolean);
                for (const s of moreSongs) {
                  if (s && s.videoId && !seen.has(s.videoId) && filterForTab(s, activeTab.id)) {
                    seen.add(s.videoId);
                    collected.push(s);
                    if (collected.length >= targetCount) break;
                  }
                }
                curToken = nextData?.continuationToken || null;
                lastContinuation = curToken;
              } catch (e) {
                break;
              }
            }
          } catch (e) {}
        }

        // BACKFILL: If network fetch gathered fewer songs than targetCount,
        // seamlessly fill the remaining slots from verified regional seeds
        if (collected.length < targetCount) {
          const seeds = getInitialSeeds(activeTab);
          for (const s of seeds) {
            if (s && s.videoId && !seen.has(s.videoId) && filterForTab(s, activeTab.id)) {
              seen.add(s.videoId);
              collected.push(s);
              if (collected.length >= targetCount) break;
            }
          }
        }

        // STRICT ENFORCEMENT: Exactly targetCount items!
        const finalTracks = collected.slice(0, targetCount);

        if (mounted && finalTracks.length > 0) {
          setTracks(finalTracks);
          setContinuationToken(null); // Chart is an exact Top N ranking; never overfill
          try {
            sessionStorage.setItem(
              cacheKey,
              JSON.stringify({ tracks: finalTracks, timestamp: Date.now() })
            );
          } catch {}

          // If playback is already active from this chart, dynamically update queue
          dispatch(appendQueueTracks({ newTracks: finalTracks }));
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
    // Top charts are fixed-size countdown rankings: do not append beyond target
    if (!continuationToken || isLoadingMore || tracks.length >= activeTab.target) {
      setContinuationToken(null);
      return;
    }
    setIsLoadingMore(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/search?continuationToken=${encodeURIComponent(continuationToken)}&language=en&hl=en`
      );
      const data = await res.json();

      if (data?.results?.length) {
        const newSongs = data.results.map(normalizeSong).filter(Boolean);

        setTracks((prev) => {
          const remainingNeeded = activeTab.target - prev.length;
          if (remainingNeeded <= 0) return prev;

          const seen = new Set(prev.map((s) => s.videoId));
          const uniqueNew = newSongs.filter((s) => !seen.has(s.videoId) && filterForTab(s, activeTab.id));
          const toAdd = uniqueNew.slice(0, remainingNeeded);
          const updated = [...prev, ...toAdd];
          dispatch(appendQueueTracks({ newTracks: toAdd }));
          return updated;
        });

        setContinuationToken(null);
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
    if (!sentinelRef.current || !continuationToken || isLoadingMore || tracks.length >= activeTab.target) return;

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
  }, [continuationToken, isLoadingMore, tracks.length, activeTab.target]);

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
    <div className="flex flex-col gap-4 sm:gap-6 pb-28 select-none animate-fade-in">
      {/* Hero Header - Sleek & Compact */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 p-3.5 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-900/40 via-red-950/20 to-transparent border border-rose-500/20 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-tr from-rose-600 to-red-700 flex items-center justify-center text-white shadow-md shadow-rose-600/30 shrink-0">
            <FaFire className="text-2xl sm:text-3xl" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
                Official Live Rankings
              </span>
              {isLoadingChart && (
                <span className="flex items-center gap-1 text-[10px] text-rose-400 font-semibold animate-pulse">
                  <FaSyncAlt className="text-[9px] animate-spin" />
                  Updating...
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold theme-text-main mt-0.5">
              {activeTab.name}
            </h1>
            <p className="text-[11px] sm:text-xs theme-text-muted mt-0.5">
              {activeTab.subtitle} • Official {activeTab.target} Tracks (#1 to #{activeTab.target})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handlePlayAll}
            disabled={tracks.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
          >
            <FaPlay className="text-[10px]" />
            <span>Play All</span>
          </button>

          <button
            onClick={handleShufflePlay}
            disabled={tracks.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-slate-500/15 hover:bg-slate-500/25 theme-text-main font-bold text-xs border theme-border hover:scale-105 active:scale-95 transition-all disabled:opacity-40 shadow-sm"
            title="Shuffle play all tracks immediately"
          >
            <FaRandom className="text-[10px] text-rose-500" />
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
