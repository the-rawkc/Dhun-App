import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  playSong,
  playPlaylistWithShuffle,
  createPlaylist,
} from '../redux/features/playerSlice';
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
  const { favorites, playlists, favoriteArtists } = useSelector((state) => state.player);

  const [activeTab, setActiveTab] = useState('playlists'); // 'playlists' | 'downloads' | 'liked' | 'artists'
  const [offlineSongs, setOfflineSongs] = useState([]);
  const [loadingOffline, setLoadingOffline] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [playlistTitle, setPlaylistTitle] = useState('');

  useEffect(() => {
    setLoadingOffline(true);
    getOfflineTracks()
      .then((tracks) => setOfflineSongs(tracks))
      .catch(() => {})
      .finally(() => setLoadingOffline(false));
  }, [activeTab]);

  const handlePlayFavorites = () => {
    if (favorites.length > 0) {
      dispatch(playSong({ song: favorites[0], songs: favorites, index: 0 }));
    }
  };

  const handlePlayOfflineAll = () => {
    if (offlineSongs.length > 0) {
      dispatch(playSong({ song: offlineSongs[0], songs: offlineSongs, index: 0 }));
    }
  };

  const handleCreatePlaylist = (e) => {
    e.preventDefault();
    if (!playlistTitle.trim()) return;
    dispatch(createPlaylist({ title: playlistTitle.trim() }));
    setPlaylistTitle('');
    setShowCreateModal(false);
  };

  return (
    <div className="flex flex-col gap-8 pb-28 select-none animate-fade-in">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold theme-text-main">Your Library</h1>
            <p className="text-xs theme-text-muted">Playlists, offline tracks, liked songs, and favorite artists</p>
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
          <button
            onClick={() => setActiveTab('playlists')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'playlists'
                ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                : 'bg-slate-500/10 hover:bg-slate-500/20 theme-text-main'
            }`}
          >
            <FaMusic className="text-xs" />
            <span>Playlists ({playlists.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('downloads')}
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
            onClick={() => setActiveTab('liked')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'liked'
                ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                : 'bg-slate-500/10 hover:bg-slate-500/20 theme-text-main'
            }`}
          >
            <FaHeart className="text-xs text-rose-500" />
            <span>Liked Songs ({favorites.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('artists')}
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

      {/* ─── TAB 1: PLAYLISTS ────────────────────────────────────────── */}
      {activeTab === 'playlists' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => navigate(`/playlist/${pl.id}`)}
              className="p-4 rounded-3xl glass-card cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="aspect-square rounded-2xl overflow-hidden bg-dark-800 shadow-lg mb-3.5 relative">
                  <img
                    src={pl.cover}
                    alt={pl.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Shuffle Quick Button Overlay */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (pl.tracks.length > 0) {
                        dispatch(playPlaylistWithShuffle({ tracks: pl.tracks }));
                      }
                    }}
                    className="absolute bottom-2.5 right-2.5 p-3 rounded-full bg-rose-600 text-white shadow-xl opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 transition-all"
                    title="Shuffle Play"
                  >
                    <FaRandom className="text-xs" />
                  </button>
                </div>
                <h3 className="font-bold text-base theme-text-main group-hover:text-rose-500 truncate transition-colors">
                  {pl.title}
                </h3>
                <p className="text-xs theme-text-muted mt-1 truncate">
                  {pl.tracks.length} songs
                </p>
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
          {favorites.length > 0 ? (
            <>
              <div className="flex justify-end">
                <button
                  onClick={handlePlayFavorites}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30"
                >
                  <FaPlay className="text-[10px]" />
                  <span>Play Liked Songs</span>
                </button>
              </div>
              <div className="space-y-1">
                {favorites.map((song, i) => (
                  <SongRow key={song.videoId || i} song={song} index={i} songs={favorites} />
                ))}
              </div>
            </>
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
