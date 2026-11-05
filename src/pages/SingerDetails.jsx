import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { playSong, toggleFavoriteArtist } from '../redux/features/playerSlice';
import SongRow from '../components/SongRow';
import { FaPlay, FaCheckCircle, FaHeart, FaRegHeart, FaSpinner } from 'react-icons/fa';
import { normalizeSong } from '../utils/normalizeSong';
import { API_BASE } from '../services/apiConfig';

const SingerDetails = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const artistName = searchParams.get('name') || decodeURIComponent(id || '');
  const dispatch = useDispatch();
  const { favorites, favoriteArtists } = useSelector((state) => state.player);

  const [artistData, setArtistData] = useState(null);
  const [bio, setBio] = useState('');
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [continuationToken, setContinuationToken] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  const isFavoriteArtist = favoriteArtists.some(
    (a) => a.name.toLowerCase() === artistName.toLowerCase()
  );

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchArtistInfo = async () => {
      try {
        if (artistName) {
          const bioRes = await fetch(
            `${API_BASE}/api/artist/info?artist=${encodeURIComponent(artistName)}`
          );
          const bioData = await bioRes.json();
          if (isMounted && bioData?.bio) {
            setBio(bioData.bio.replace(/<[^>]*>/g, '').split('Read more')[0].trim());
          }
        }

        const tracks = [];
        let fetchedData = null;

        if (id && id.startsWith('UC')) {
          try {
            const res = await fetch(`${API_BASE}/api/artists/${encodeURIComponent(id)}`);
            fetchedData = await res.json();
            if (fetchedData?.topSongs) tracks.push(...fetchedData.topSongs);
            if (fetchedData?.songs?.results) tracks.push(...fetchedData.songs.results);
          } catch (e) {}
        }

        // Comprehensive search for ALL songs by this artist
        let nextTok = null;
        if (artistName) {
          try {
            const [songsRes, hitsRes] = await Promise.all([
              fetch(`${API_BASE}/api/search?q=${encodeURIComponent(`${artistName} songs`)}&filter=songs&language=en&hl=en`).then((r) => r.json()).catch(() => ({})),
              fetch(`${API_BASE}/api/search?q=${encodeURIComponent(`${artistName} all hits`)}&filter=songs&language=en&hl=en`).then((r) => r.json()).catch(() => ({})),
            ]);

            if (songsRes?.results?.length) tracks.push(...songsRes.results);
            if (hitsRes?.results?.length) tracks.push(...hitsRes.results);

            nextTok = songsRes?.continuationToken || hitsRes?.continuationToken || null;
          } catch (e) {}
        }

        // Deduplicate tracks by videoId
        const seenIds = new Set();
        const uniqueTracks = tracks.filter((t) => {
          const vId = t.videoId || t.id;
          if (!vId || seenIds.has(vId)) return false;
          seenIds.add(vId);
          return true;
        });

        if (isMounted) {
          setArtistData(fetchedData?.artist || fetchedData || { name: artistName });
          setSongs(uniqueTracks.map((t) => normalizeSong(t, artistName)).filter(Boolean));
          setContinuationToken(nextTok);
        }
      } catch (err) {
        console.warn('Artist details load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchArtistInfo();

    return () => {
      isMounted = false;
    };
  }, [id, artistName]);

  // Infinite Scroll Handler: loads songs, hides automatically when list is finished
  const handleLoadMore = async () => {
    if (!continuationToken || isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const res = await fetch(`${API_BASE}/api/search?continuationToken=${encodeURIComponent(continuationToken)}&language=en&hl=en`);
      const data = await res.json();

      if (data?.results?.length) {
        let addedCount = 0;
        const newSongs = data.results.map((t) => normalizeSong(t, artistName)).filter(Boolean);
        setSongs((prev) => {
          const seen = new Set(prev.map((s) => s.videoId));
          const uniqueNew = newSongs.filter((s) => !seen.has(s.videoId));
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
      console.warn('Error loading more songs:', err);
      setContinuationToken(null); // Clear token to hide load more indicator on end/error
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Auto-trigger infinite load when scrolling near bottom
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

  // Sort criteria: Liked songs by this artist at the very top!
  const favSet = new Set(favorites.map((f) => f.videoId));
  const likedByArtist = songs.filter((s) => favSet.has(s.videoId));
  const otherSongs = songs.filter((s) => !favSet.has(s.videoId));
  const prioritizedSongs = [...likedByArtist, ...otherSongs];

  const handlePlayAll = () => {
    if (prioritizedSongs.length > 0) {
      dispatch(playSong({ song: prioritizedSongs[0], songs: prioritizedSongs, index: 0 }));
    }
  };

  const displayName = artistData?.name || artistName || 'Artist';
  const displayImage =
    artistData?.thumbnail ||
    artistData?.thumbnails?.[0]?.url ||
    songs[0]?.thumbnail ||
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=60';

  const handleFollowArtist = () => {
    dispatch(toggleFavoriteArtist({ name: displayName, image: displayImage, browseId: id }));
  };

  return (
    <div className="flex flex-col gap-8 pb-28 select-none animate-fade-in">
      {/* Hero Artist Banner */}
      <div className="relative rounded-3xl overflow-hidden p-6 md:p-10 bg-gradient-to-br from-rose-950/40 via-red-950/20 to-dark-900 border border-rose-500/20 shadow-2xl flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
        <div className="w-36 h-36 md:w-48 md:h-48 rounded-full overflow-hidden bg-dark-950 shadow-2xl border-4 border-rose-500/40 shrink-0">
          <img src={displayImage} alt={displayName} className="w-full h-full object-cover" />
        </div>

        <div className="flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold mb-2">
            <FaCheckCircle />
            <span>Verified Indian Artist</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold theme-text-main tracking-tight">
            {displayName}
          </h1>

          {artistData?.subscribers && (
            <p className="text-xs md:text-sm theme-text-muted mt-2 font-medium">
              {artistData.subscribers}
            </p>
          )}

          {bio && (
            <p className="text-xs md:text-sm theme-text-muted mt-3 max-w-2xl line-clamp-3 leading-relaxed">
              {bio}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3">
            <button
              onClick={handlePlayAll}
              disabled={prioritizedSongs.length === 0}
              className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
            >
              <FaPlay className="text-xs" />
              <span>Play All Tracks</span>
            </button>

            {/* Favorite / Follow Artist button */}
            <button
              onClick={handleFollowArtist}
              className={`flex items-center gap-2 px-5 py-3 rounded-full border text-xs font-bold transition-all ${
                isFavoriteArtist
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-slate-500/10 hover:bg-slate-500/20 theme-text-main border-slate-500/30'
              }`}
            >
              {isFavoriteArtist ? <FaHeart /> : <FaRegHeart />}
              <span>{isFavoriteArtist ? 'Following Artist' : 'Follow Artist'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* All Discography Songs */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold theme-text-main mb-4">
          All Songs by {displayName} ({prioritizedSongs.length})
        </h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <div className="w-8 h-8 border-3 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
            <p className="text-xs">Loading complete songs...</p>
          </div>
        ) : prioritizedSongs.length > 0 ? (
          <div>
            <div className="space-y-1">
              {prioritizedSongs.map((song, i) => (
                <SongRow
                  key={song.videoId || i}
                  song={song}
                  index={i}
                  songs={prioritizedSongs}
                  isHighlightedLiked={favSet.has(song.videoId)}
                />
              ))}
            </div>

            {/* Sentinel for auto infinite-scroll - only when continuation exists and not loading */}
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
        ) : (
          <div className="py-12 text-center theme-text-muted text-sm">
            No tracks found for this artist.
          </div>
        )}
      </div>
    </div>
  );
};

export default SingerDetails;
