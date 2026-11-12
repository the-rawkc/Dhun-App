import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  playSong,
  playTrackNow,
  playPlaylistWithShuffle,
  createPlaylist,
  loadCloudUserData,
} from '../redux/features/playerSlice';
import { getActiveSession, fetchCloudProfile } from '../services/authService';
import SongRow from '../components/SongRow';
import ArtistCard from '../components/ArtistCard';
import {
  FaHeart,
  FaPlay,
  FaDownload,
  FaRandom,
  FaFolderPlus,
  FaMusic,
  FaUserFriends,
} from 'react-icons/fa';
import { getOfflineTracks } from '../services/offlineStorage';

const Library = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { favorites, playlists, favoriteArtists, activeSong } = useSelector((state) => state.player);

  const [activeTab, setActiveTab] = useState('playlists'); // 'playlists' | 'downloads' | 'liked' | 'artists'
  const [offlineSongs, setOfflineSongs] = useState([]);
  const [loadingOffline, setLoadingOffline] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [includeActiveSong, setIncludeActiveSong] = useState(true);

  useEffect(() => {
    // Refresh library from cloud database on opening Library page
    const session = getActiveSession();
    if (session?.phone && session?.pin) {
      fetchCloudProfile()
        .then((data) => {
          if (data && data.success) {
            dispatch(loadCloudUserData(data));
          }
        })
        .catch(() => {});
    }
  }, [dispatch]);

  useEffect(() => {
    setLoadingOffline(true);
    getOfflineTracks()
      .then((tracks) => setOfflineSongs(tracks))
      .catch(() => {})
      .finally(() => setLoadingOffline(false));
  }, [activeTab]);

  const handlePlayFavorites = () => {
    if (favorites.length > 0) {
      dispatch(playTrackNow({ song: favorites[0], songs: favorites, index: 0 }));
    }
  };

  const handlePlayOfflineAll = () => {
    if (offlineSongs.length > 0) {
      dispatch(playTrackNow({ song: offlineSongs[0], songs: offlineSongs, index: 0 }));
    }
  };

  const handleCreatePlaylist = (e) => {
    e.preventDefault();
    if (!playlistTitle.trim()) return;
    const newId = `pl-${Date.now()}`;
    const initial = includeActiveSong && activeSong ? activeSong : null;
    dispatch(createPlaylist({ id: newId, title: playlistTitle.trim(), initialTrack: initial }));
    setPlaylistTitle('');
    setShowCreateModal(false);
    navigate(`/playlist/${newId}`);
  };

  return (
    <div className="flex flex-col gap-8 pb-28 select-none animate-fade-in">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold theme-text-main">Your Library</h1>
            <p className="text-xs theme-text-muted">Offline tracks, favorite artists, and custom collections</p>
          </div>
          {activeTab === 'playlists' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all"
            >
              <FaFolderPlus />
              <span>New Playlist</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
          {activeTab !== 'playlists' && (
            <button
              onClick={() => setActiveTab('playlists')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-slate-500/10 hover:bg-slate-500/20 theme-text-main transition-all"
            >
              <span>← All Playlists</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab(activeTab === 'downloads' ? 'playlists' : 'downloads')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'downloads'
                ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                : 'bg-slate-500/10 hover:bg-slate-500/20 theme-text-main'
            }`}
          >
            <FaDownload className="text-xs" />
            <span>Offline Downloads ({offlineSongs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'artists' ? 'playlists' : 'artists')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'artists'
                ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                : 'bg-slate-500/10 hover:bg-slate-500/20 theme-text-main'
            }`}
          >
            <FaUserFriends className="text-xs" />
            <span>Favorite Artists ({favoriteArtists.length})</span>
          </button>
        </div>
      </div>

      {/* ─── TAB 1: PLAYLISTS (Compact List-Item Boxes with Liked Songs) ── */}
      {activeTab === 'playlists' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Liked Songs Playlist Box (1st Playlist) */}
          <div
            onClick={() => setActiveTab('liked')}
            className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl glass-card hover:bg-slate-500/10 cursor-pointer group transition-all border border-rose-500/20 shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl shrink-0 bg-gradient-to-br from-rose-600 via-pink-600 to-rose-900 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <FaHeart className="text-white text-xl drop-shadow" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base theme-text-main group-hover:text-rose-500 truncate transition-colors flex items-center gap-1.5">
                  <span>Liked Songs</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400">
                    Auto
                  </span>
                </h3>
                <p className="text-xs theme-text-muted mt-0.5 truncate">
                  {favorites.length} {favorites.length === 1 ? 'song' : 'songs'} • Your Favorites
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 pl-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayFavorites();
                }}
                disabled={favorites.length === 0}
                className="p-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:scale-110 active:scale-95 transition-all disabled:opacity-30"
                title="Play Liked Songs"
                aria-label="Play Liked Songs"
              >
                <FaPlay className="text-[10px]" />
              </button>
            </div>
          </div>

          {/* User Custom Playlists as Compact List-Item Boxes */}
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => navigate(`/playlist/${pl.id}`)}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl glass-card hover:bg-slate-500/10 cursor-pointer group transition-all border theme-border shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-dark-800 shrink-0 shadow-md">
                  <img
                    src={pl.cover}
                    alt={pl.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base theme-text-main group-hover:text-rose-500 truncate transition-colors">
                    {pl.title}
                  </h3>
                  <p className="text-xs theme-text-muted mt-0.5 truncate">
                    {(pl.tracks || []).length} {(pl.tracks || []).length === 1 ? 'song' : 'songs'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const trks = Array.isArray(pl.tracks) ? pl.tracks : [];
                    if (trks.length > 0) {
                      dispatch(playPlaylistWithShuffle({ tracks: trks }));
                    }
                  }}
                  disabled={!Array.isArray(pl.tracks) || pl.tracks.length === 0}
                  className="p-2.5 rounded-full bg-slate-500/15 hover:bg-slate-500/25 text-white/90 hover:text-white shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-20"
                  title="Shuffle Play"
                  aria-label="Shuffle Play"
                >
                  <FaRandom className="text-[10px]" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const trks = Array.isArray(pl.tracks) ? pl.tracks : [];
                    if (trks.length > 0) {
                      dispatch(playTrackNow({ song: trks[0], songs: trks, index: 0 }));
                    }
                  }}
                  disabled={!Array.isArray(pl.tracks) || pl.tracks.length === 0}
                  className="p-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:scale-110 active:scale-95 transition-all disabled:opacity-30"
                  title="Play Playlist"
                  aria-label="Play Playlist"
                >
                  <FaPlay className="text-[10px]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── TAB 2: OFFLINE DOWNLOADS (Played Without Internet!) ─────── */}
      {activeTab === 'downloads' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <div>
              <span className="text-sm font-bold text-emerald-500">100% Offline Playback Ready</span>
              <p className="text-xs theme-text-muted mt-0.5">
                These tracks are stored locally on your device and play smoothly without Wi-Fi or cellular data.
              </p>
            </div>
            {offlineSongs.length > 0 && (
              <button
                onClick={handlePlayOfflineAll}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                <FaPlay className="text-[10px]" />
                <span>Play All Offline</span>
              </button>
            )}
          </div>

          {offlineSongs.length > 0 ? (
            <div className="space-y-1">
              {offlineSongs.map((song, i) => (
                <SongRow key={song.videoId || i} song={song} index={i} songs={offlineSongs} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center theme-text-muted text-sm flex flex-col items-center gap-3">
              <FaDownload className="text-4xl text-slate-500" />
              <p className="font-semibold theme-text-main">No downloaded tracks yet</p>
              <p className="text-xs max-w-sm">
                Tap the download icon on any song to save it for offline playback without using internet!
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: LIKED SONGS ─────────────────────────────────────── */}
      {activeTab === 'liked' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveTab('playlists')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-500/10 hover:bg-slate-500/20 text-xs theme-text-main font-semibold transition-all"
            >
              <span>← Back to Playlists</span>
            </button>
            {favorites.length > 0 && (
              <button
                onClick={handlePlayFavorites}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30"
              >
                <FaPlay className="text-[10px]" />
                <span>Play Liked Songs</span>
              </button>
            )}
          </div>
          {favorites.length > 0 ? (
            <div className="space-y-1">
              {favorites.map((song, i) => (
                <SongRow key={song.videoId || i} song={song} index={i} songs={favorites} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center theme-text-muted text-sm">
              No liked songs yet. Tap the heart icon on any song!
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: FAVORITE ARTISTS ─────────────────────────────────── */}
      {activeTab === 'artists' && (
        <div>
          {favoriteArtists.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {favoriteArtists.map((artist, i) => (
                <ArtistCard key={i} artist={artist} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center theme-text-muted text-sm flex flex-col items-center gap-3">
              <FaHeart className="text-4xl text-rose-500" />
              <p className="font-semibold theme-text-main">No favorite artists added yet</p>
              <p className="text-xs max-w-sm">
                Follow your favorite Indian singers and music directors to track their releases!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreatePlaylist}
            className="w-full max-w-md p-6 rounded-3xl theme-bg-card border theme-border shadow-2xl flex flex-col gap-4"
          >
            <h3 className="text-lg font-bold theme-text-main">Create New Playlist</h3>
            <input
              type="text"
              required
              autoFocus
              value={playlistTitle}
              onChange={(e) => setPlaylistTitle(e.target.value)}
              placeholder="e.g. My Bollywood Favorites"
              className="px-4 py-2.5 rounded-xl bg-slate-500/10 border theme-border theme-text-main text-sm focus:outline-none focus:border-rose-500"
            />
            {activeSong && (
              <label className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-slate-500/10 border theme-border cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeActiveSong}
                  onChange={(e) => setIncludeActiveSong(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-xs font-semibold theme-text-main">
                    Seed with currently playing song
                  </span>
                  <span className="text-[11px] theme-text-muted truncate">
                    {activeSong.title} • {activeSong.artist}
                  </span>
                </div>
              </label>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl theme-text-muted text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Library;
