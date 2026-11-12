import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  playSong,
  playTrackNow,
  playPlaylistWithShuffle,
  deletePlaylist,
  renamePlaylist,
  removeTrackFromPlaylist,
  addTrackToPlaylist,
} from '../redux/features/playerSlice';
import SongRow from '../components/SongRow';
import {
  FaPlay,
  FaRandom,
  FaTrashAlt,
  FaMusic,
  FaPlus,
  FaCheck,
  FaRedo,
  FaSpinner,
  FaSearch,
  FaTimes,
  FaEdit,
} from 'react-icons/fa';
import { normalizeSong } from '../utils/normalizeSong';
import { API_BASE } from '../services/apiConfig';

const PlaylistDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { playlists, activeSong } = useSelector((state) => state.player);

  const playlist = playlists.find((p) => p.id === id);

  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [addedSuggestionIds, setAddedSuggestionIds] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(playlist?.title || '');

  useEffect(() => {
    if (playlist?.title) {
      setEditedTitle(playlist.title);
    }
  }, [playlist?.title]);

  const handleSaveTitle = (e) => {
    if (e) e.preventDefault();
    if (editedTitle.trim() && playlist) {
      dispatch(renamePlaylist({ id: playlist.id, title: editedTitle.trim() }));
    } else if (playlist) {
      setEditedTitle(playlist.title);
    }
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setEditedTitle(playlist?.title || '');
    setIsEditingTitle(false);
  };

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 theme-text-muted">
        <FaMusic className="text-4xl text-slate-500" />
        <h2 className="text-xl font-bold theme-text-main">Playlist not found</h2>
        <button
          onClick={() => navigate('/library')}
          className="px-5 py-2.5 rounded-full bg-rose-600 text-white font-bold text-xs"
        >
          Back to Library
        </button>
      </div>
    );
  }

  const tracks = Array.isArray(playlist.tracks) ? playlist.tracks : [];
  const lastAddedTrack = tracks.length > 0 ? tracks[tracks.length - 1] : activeSong;
  const lastVideoId = lastAddedTrack?.videoId;

  const fetchSuggestions = async () => {
    if (!lastAddedTrack) return;
    setLoadingSuggestions(true);
    try {
      const currentIds = new Set(tracks.map((t) => t.videoId));
      const pool = [];

      // 1. Fetch related tracks from /api/related/:id
      if (lastAddedTrack.videoId) {
        try {
          const res = await fetch(
            `${API_BASE}/api/related/${encodeURIComponent(lastAddedTrack.videoId)}`
          );
          const data = await res.json();
          const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
          pool.push(...items);
        } catch (e) {}
      }

      // 2. Supplement with similar/popular songs by same singer/artist
      if (pool.length < 6 && lastAddedTrack.artist) {
        try {
          const sRes = await fetch(
            `${API_BASE}/api/search?q=${encodeURIComponent(`${lastAddedTrack.artist} songs`)}&filter=songs`
          );
          const sData = await sRes.json();
          if (Array.isArray(sData?.results)) pool.push(...sData.results);
        } catch (e) {}
      }

      // Deduplicate and filter out songs already inside the playlist
      const seen = new Set();
      const filtered = [];
      for (const item of pool) {
        const norm = normalizeSong(item);
        if (!norm || !norm.videoId) continue;
        if (currentIds.has(norm.videoId) || seen.has(norm.videoId)) continue;
        seen.add(norm.videoId);
        filtered.push(norm);
        if (filtered.length >= 8) break;
      }

      setSuggestions(filtered);
    } catch (err) {
      console.warn('Error fetching playlist suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    if (lastVideoId) {
      fetchSuggestions();
    }
  }, [lastVideoId]);

  // Live search for songs to add to this playlist
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `${API_BASE}/api/search?q=${encodeURIComponent(searchQuery.trim())}&filter=songs`
        );
        const data = await res.json();
        const results = Array.isArray(data?.results) ? data.results : [];
        const currentIds = new Set(tracks.map((t) => t.videoId));
        const filtered = results
          .map((r) => normalizeSong(r))
          .filter((s) => s && s.videoId && !currentIds.has(s.videoId));
        setSearchResults(filtered.slice(0, 8));
      } catch (e) {
        console.warn('Playlist search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, tracks]);

  const handleAddSuggestedTrack = (song) => {
    dispatch(addTrackToPlaylist({ playlistId: playlist.id, song }));
    setAddedSuggestionIds((prev) => ({ ...prev, [song.videoId]: true }));
    setTimeout(() => {
      setSuggestions((prev) => prev.filter((s) => s.videoId !== song.videoId));
      setSearchResults((prev) => prev.filter((s) => s.videoId !== song.videoId));
    }, 400);
  };

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      dispatch(playTrackNow({ song: tracks[0], songs: tracks, index: 0 }));
    }
  };

  const handleShufflePlay = () => {
    if (tracks.length > 0) {
      dispatch(playPlaylistWithShuffle({ tracks }));
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete playlist "${playlist.title}"?`)) {
      dispatch(deletePlaylist(playlist.id));
      navigate('/library');
    }
  };

  const firstTrack = tracks.length > 0 ? tracks[0] : null;
  const playlistCover =
    firstTrack?.thumbnail ||
    firstTrack?.cover ||
    firstTrack?.image ||
    playlist.cover ||
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80';

  return (
    <div className="flex flex-col gap-8 pb-24 select-none animate-fade-in">
      {/* Playlist Hero */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-6 md:p-8 rounded-3xl bg-gradient-to-r from-rose-600/20 via-rose-500/10 to-transparent border theme-border">
        <div className="w-40 h-40 md:w-52 md:h-52 rounded-2xl overflow-hidden bg-dark-950 shadow-2xl shrink-0 border theme-border">
          <img
            src={playlistCover}
            alt={playlist.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 text-center md:text-left">
          <span className="text-xs font-bold uppercase tracking-widest text-rose-500">
            Playlist
          </span>
          {isEditingTitle ? (
            <form onSubmit={handleSaveTitle} className="flex items-center gap-2 mt-1 justify-center md:justify-start">
              <input
                type="text"
                autoFocus
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-500/20 border border-rose-500 text-lg md:text-2xl font-extrabold theme-text-main focus:outline-none w-full max-w-sm"
                placeholder="Playlist name..."
              />
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md"
                title="Save name"
              >
                <FaCheck />
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="p-2.5 rounded-xl bg-slate-500/20 hover:bg-slate-500/30 theme-text-main text-xs transition-all"
                title="Cancel"
              >
                <FaTimes />
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center md:justify-start gap-2.5 mt-1 group">
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-2xl md:text-4xl font-extrabold theme-text-main hover:text-rose-500 cursor-pointer transition-colors"
                title="Click to rename playlist"
              >
                {playlist.title}
              </h1>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-500/10 opacity-70 group-hover:opacity-100 transition-all text-xs"
                title="Click to rename playlist"
              >
                <FaEdit />
              </button>
            </div>
          )}
          {playlist.description && (
            <p className="text-xs md:text-sm theme-text-muted mt-1">{playlist.description}</p>
          )}
          <p className="text-xs theme-text-muted mt-2 font-medium">
            {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3">
            {/* Play All */}
            <button
              onClick={handlePlayAll}
              disabled={tracks.length === 0}
              className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
            >
              <FaPlay className="text-xs" />
              <span>Play</span>
            </button>

            {/* Shuffle Play Button */}
            <button
              onClick={handleShufflePlay}
              disabled={tracks.length === 0}
              className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-slate-500/15 hover:bg-slate-500/25 border theme-border theme-text-main font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
            >
              <FaRandom className="text-xs text-rose-500" />
              <span>Shuffle Play</span>
            </button>

            {/* Delete Playlist */}
            <button
              onClick={handleDelete}
              className="p-3 rounded-full bg-slate-500/10 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition-all"
              title="Delete Playlist"
            >
              <FaTrashAlt className="text-sm" />
            </button>
          </div>
        </div>
      </div>

      {/* Tracks List */}
      {tracks.length > 0 ? (
        <div className="space-y-1">
          {tracks.map((song, i) => (
            <div key={`${song.videoId}-${i}`} className="group relative">
              <SongRow song={song} index={i} songs={tracks} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch(removeTrackFromPlaylist({ playlistId: playlist.id, videoId: song.videoId }));
                }}
                className="absolute right-24 top-1/2 -translate-y-1/2 p-2 rounded-full opacity-0 group-hover:opacity-100 hover:text-rose-500 text-slate-400 transition-opacity"
                title="Remove from Playlist"
              >
                <FaTrashAlt className="text-xs" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center theme-text-muted text-sm">
          This playlist is currently empty. Add tracks below to start listening!
        </div>
      )}

      {/* ─── ADD SONGS TO PLAYLIST & SUGGESTIONS SECTION ─── */}
      <div className="mt-8 pt-6 border-t theme-border flex flex-col gap-5">
        <div>
          <h3 className="text-base sm:text-lg font-bold theme-text-main flex items-center gap-2">
            <span>➕ Add Songs to this Playlist</span>
          </h3>
          <p className="text-xs theme-text-muted mt-0.5">
            Search any Hindi, Punjabi, or Bollywood track or choose from recommendations below
          </p>
        </div>

        {/* In-Playlist Search Bar */}
        <div className="relative w-full max-w-xl">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, artists, or movies to add..."
            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-500/10 border theme-border theme-text-main text-sm focus:outline-none focus:border-rose-500 placeholder-slate-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-white"
            >
              <FaTimes className="text-xs" />
            </button>
          )}
        </div>

        {/* Live Search Results */}
        {searchQuery.trim() && (
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
              Search Results
            </span>
            {isSearching ? (
              <div className="flex items-center justify-center py-8 gap-2 text-xs theme-text-muted">
                <FaSpinner className="animate-spin text-rose-500" />
                <span>Searching for "{searchQuery}"...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {searchResults.map((song) => {
                  const isJustAdded = addedSuggestionIds[song.videoId];
                  return (
                    <div
                      key={song.videoId}
                      className="flex items-center justify-between p-2.5 rounded-2xl glass-card border theme-border hover:bg-slate-500/10 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-dark-800 shrink-0 shadow-sm">
                          <img
                            src={song.thumbnail}
                            alt={song.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <button
                            type="button"
                            onClick={() => dispatch(playTrackNow({ song, songs: searchResults }))}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Preview Track"
                          >
                            <FaPlay className="text-white text-xs" />
                          </button>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold theme-text-main truncate group-hover:text-rose-500">
                            {song.title}
                          </span>
                          <span className="text-xs theme-text-muted truncate mt-0.5">
                            {song.artist}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddSuggestedTrack(song)}
                        disabled={isJustAdded}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm shrink-0 ml-2 ${
                          isJustAdded
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 hover:scale-105 active:scale-95'
                        }`}
                      >
                        {isJustAdded ? (
                          <>
                            <FaCheck className="text-[10px]" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <FaPlus className="text-[10px]" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center theme-text-muted text-xs">
                No songs found matching "{searchQuery}". Try another keyword!
              </div>
            )}
          </div>
        )}

        {/* ─── SUGGESTIONS / RECOMMENDED SONGS BASED ON LAST ADDED SONG ─── */}
        {lastAddedTrack && (
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm sm:text-base font-bold theme-text-main flex items-center gap-1.5">
                  <span>✨ Recommended Songs</span>
                </h4>
                <p className="text-xs theme-text-muted mt-0.5">
                  Suggested based on {tracks.length > 0 ? 'the last added song' : 'your playing song'} •{' '}
                  <span className="text-rose-500 font-semibold">{lastAddedTrack.title}</span>
                </p>
              </div>
              <button
                onClick={fetchSuggestions}
                disabled={loadingSuggestions}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-500/10 hover:bg-slate-500/20 text-xs font-semibold theme-text-main transition-all disabled:opacity-50"
                title="Refresh Suggestions"
              >
                <FaRedo className={`text-[10px] ${loadingSuggestions ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            {loadingSuggestions ? (
              <div className="flex items-center justify-center py-10 gap-2.5 theme-text-muted text-xs">
                <FaSpinner className="animate-spin text-rose-500 text-base" />
                <span>Finding songs matching "{lastAddedTrack.title}"...</span>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {suggestions.map((song) => {
                  const isJustAdded = addedSuggestionIds[song.videoId];
                  return (
                    <div
                      key={song.videoId}
                      className="flex items-center justify-between p-2.5 rounded-2xl glass-card border theme-border hover:bg-slate-500/10 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-dark-800 shrink-0 shadow-sm">
                          <img
                            src={song.thumbnail}
                            alt={song.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <button
                            type="button"
                            onClick={() => dispatch(playTrackNow({ song, songs: suggestions }))}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Preview Track"
                          >
                            <FaPlay className="text-white text-xs" />
                          </button>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold theme-text-main truncate group-hover:text-rose-500">
                            {song.title}
                          </span>
                          <span className="text-xs theme-text-muted truncate mt-0.5">
                            {song.artist}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddSuggestedTrack(song)}
                        disabled={isJustAdded}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm shrink-0 ml-2 ${
                          isJustAdded
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 hover:scale-105 active:scale-95'
                        }`}
                      >
                        {isJustAdded ? (
                          <>
                            <FaCheck className="text-[10px]" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <FaPlus className="text-[10px]" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center theme-text-muted text-xs">
                No further recommendations found. Add more songs to discover more!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistDetails;
