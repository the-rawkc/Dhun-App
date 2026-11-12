import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { playTrackNow } from '../redux/features/playerSlice';
import SongCard from '../components/SongCard';
import SongRow from '../components/SongRow';
import ArtistCard from '../components/ArtistCard';
import { FaPlay, FaSearch, FaMusic, FaUser, FaCompactDisc, FaHeart } from 'react-icons/fa';
import { normalizeSong } from '../utils/normalizeSong';
import { API_BASE } from '../services/apiConfig';

const filters = [
  { label: 'All Results', value: '' },
  { label: 'Songs', value: 'songs', icon: FaMusic },
  { label: 'Artists', value: 'artists', icon: FaUser },
  { label: 'Albums', value: 'albums', icon: FaCompactDisc },
];

const Search = () => {
  const { searchTerm } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { favorites } = useSelector((state) => state.player);

  const [activeFilter, setActiveFilter] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [continuationToken, setContinuationToken] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  const queryTerm = searchTerm ? decodeURIComponent(searchTerm).trim() : 'trending hindi songs';

  useEffect(() => {
    const cacheKey = `tt_search_${queryTerm}_${activeFilter}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setResults(parsed);
          setLoading(false);
          return;
        }
      }
    } catch {}

    let isMounted = true;
    setLoading(true);
    setError(false);

    const performSearch = async () => {
      try {
        let combined = [];
        let nextTok = null;

        const endpoint = activeFilter
          ? `${API_BASE}/api/search?q=${encodeURIComponent(queryTerm)}&filter=${activeFilter}&language=en&hl=en`
          : `${API_BASE}/api/search?q=${encodeURIComponent(queryTerm)}&language=en&hl=en`;

        const response = await fetch(endpoint).catch(() => null);
        if (!response || !response.ok) {
          setError(
            response?.status === 503
              ? 'Backend API quota or usage limit reached on Deno Deploy (503 Service Unavailable). Please check your Deno Deploy project.'
              : 'Search request failed. Unable to reach backend server.'
          );
          setLoading(false);
          return;
        }

        const res = await response.json().catch(() => ({}));
        combined = res?.results || (Array.isArray(res) ? res : []);
        nextTok = res?.continuationToken || null;

        // In 'All Results' tab or whenever song count is under 25, append dedicated songs query so all songs for this topic/search show
        if (!activeFilter && combined.filter((i) => i.videoId || i.resultType === 'song').length < 25) {
          try {
            const songsRes = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(queryTerm)}&filter=songs&language=en&hl=en`).then((r) => r.json());
            if (songsRes?.results?.length) {
              combined = [...combined, ...songsRes.results];
              nextTok = nextTok || songsRes.continuationToken || null;
            }
          } catch (e) {}
        }

        // Deduplicate items by videoId or browseId
        const seen = new Set();
        const deduped = combined.filter((item) => {
          const key = item.videoId || item.browseId || item.id;
          if (key) {
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }
          return true;
        });

        if (isMounted) {
          setResults(deduped);
          setContinuationToken(nextTok);
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(deduped));
          } catch {}
        }
      } catch (err) {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    performSearch();

    return () => {
      isMounted = false;
    };
  }, [queryTerm, activeFilter]);

  // Infinite Scroll Handler: fetches next 20 songs, hides automatically when finished
  const handleLoadMore = async () => {
    if (!continuationToken || isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const res = await fetch(`${API_BASE}/api/search?continuationToken=${encodeURIComponent(continuationToken)}&language=en&hl=en`);
      const data = await res.json();

      if (data?.results?.length) {
        let addedCount = 0;
        setResults((prev) => {
          const seen = new Set(prev.map((i) => i.videoId || i.browseId || i.id));
          const uniqueNew = data.results.filter((i) => {
            const key = i.videoId || i.browseId || i.id;
            return key ? !seen.has(key) : true;
          });
          addedCount = uniqueNew.length;
          return [...prev, ...uniqueNew];
        });

        // If no new unique tracks were added, or no continuation token returned, list is finished!
        if (addedCount === 0 || !data?.continuationToken) {
          setContinuationToken(null);
        } else {
          setContinuationToken(data.continuationToken);
        }
      } else {
        // No more results returned, list is finished!
        setContinuationToken(null);
      }
    } catch (err) {
      console.warn('Load more error:', err);
      setContinuationToken(null); // Clear to hide loading indicator on end/error
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Auto infinite scroll when scrolling near bottom
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

  const decodedTerm = searchTerm ? decodeURIComponent(searchTerm) : '';

  // Normalize songs
  const songs = results
    .filter((item) => item.resultType === 'song' || item.resultType === 'video' || (!item.resultType && item.videoId))
    .map(normalizeSong)
    .filter(Boolean);

  // LIKED SONGS BY THIS ARTIST SHOWN AT THE VERY TOP
  const favoriteVideoIds = new Set(favorites.map((f) => f.videoId));
  const likedSongs = songs.filter((s) => favoriteVideoIds.has(s.videoId));
  const otherSongs = songs.filter((s) => !favoriteVideoIds.has(s.videoId));
  const prioritizedSongs = [...likedSongs, ...otherSongs];

  const artists = results.filter((item) => item.resultType === 'artist' || item.browseId?.startsWith('UC'));
  const albums = results.filter((item) => item.resultType === 'album' || item.browseId?.startsWith('MPRE'));

  const handlePlayAllSongs = () => {
    if (prioritizedSongs.length > 0) {
      dispatch(playTrackNow({ song: prioritizedSongs[0], songs: prioritizedSongs, index: 0 }));
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-28 select-none animate-fade-in">
      {/* Header & Filter Pills */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold theme-text-main">
            {searchTerm ? (
              <>Results for <span className="text-rose-500">"{decodedTerm}"</span></>
            ) : (
              <>Trending & <span className="text-rose-500">Top Music</span></>
            )}
          </h1>
          <p className="text-xs theme-text-muted mt-1">
            Found {prioritizedSongs.length} songs & artists
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === f.value
                  ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                  : 'bg-slate-500/10 hover:bg-slate-500/20 theme-text-main'
              }`}
            >
              {f.icon && <f.icon className="text-xs" />}
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
          <p className="text-xs">Finding instant results...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center text-rose-500 text-sm max-w-lg mx-auto my-6 space-y-2">
          <p className="font-semibold">{typeof error === 'string' ? error : 'Search request failed. Please check connection.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-full font-bold shadow transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && prioritizedSongs.length === 0 && artists.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 theme-text-muted gap-3">
          <FaSearch className="text-4xl text-slate-500" />
          <p className="text-sm font-semibold theme-text-main">No tracks found for "{decodedTerm}"</p>
          <p className="text-xs theme-text-muted max-w-sm text-center">
            Try searching for an Indian artist, Hindi film, Punjabi singer, or lyrical phrase.
          </p>
        </div>
      )}

      {!loading && (
        <>
          {/* All Songs — Shown on Top */}
          {prioritizedSongs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold theme-text-main">
                  All Songs ({prioritizedSongs.length})
                </h3>
                <button
                  onClick={handlePlayAllSongs}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all"
                >
                  <FaPlay className="text-[10px]" />
                  <span>Play All Songs</span>
                </button>
              </div>

              <div className="space-y-1">
                {prioritizedSongs.map((song, i) => (
                  <SongRow
                    key={song.videoId || i}
                    song={song}
                    index={i}
                    songs={prioritizedSongs}
                    isHighlightedLiked={favoriteVideoIds.has(song.videoId)}
                  />
                ))}
              </div>

              {/* Sentinel for auto infinite-scroll - only when continuation exists and not currently loading */}
              {continuationToken && !isLoadingMore && (
                <div ref={sentinelRef} className="h-4" />
              )}

              {/* Load More Trigger & Indicator - completely hidden when list of songs is finished */}
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
          )}

          {/* Artists Match — Down the Order */}
          {artists.length > 0 && (
            <div>
              <h3 className="text-base md:text-lg font-bold theme-text-main mb-3">Artists</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 sm:gap-3">
                {artists.map((artist, i) => (
                  <ArtistCard key={i} artist={artist} />
                ))}
              </div>
            </div>
          )}

          {/* Albums — Down the Order */}
          {albums.length > 0 && (
            <div>
              <h3 className="text-base md:text-lg font-bold theme-text-main mb-3">Albums & Singles</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 sm:gap-3">
                {albums.map((album, i) => (
                  <div
                    key={i}
                    onClick={() =>
                      navigate(`/album/${album.browseId}?name=${encodeURIComponent(album.title || album.name)}`)
                    }
                    className="p-2 sm:p-2.5 rounded-xl glass-card cursor-pointer group hover:scale-[1.02] transition-all"
                  >
                    <div className="aspect-square rounded-lg overflow-hidden bg-dark-800 mb-2 shadow-sm">
                      <img
                        src={(album.thumbnails && album.thumbnails[0]?.url) || album.thumbnail}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <h4 className="font-semibold text-xs theme-text-main truncate">{album.title || album.name}</h4>
                    <p className="text-[10px] theme-text-muted truncate mt-0.5">
                      {album.artist || (album.artists && album.artists[0]?.name) || 'Album'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Search;
