import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  playTrackNow,
  shufflePlayTracks,
  createPlaylist,
  loadCloudUserData,
  resetUserLibrary,
} from '../redux/features/playerSlice';
import {
  getActiveSession,
  loginWithPhoneAndPin,
  logoutUser,
  updateProfileAvatar,
  exportUserDataJSON,
  importUserDataJSON,
  fetchCloudProfile,
} from '../services/authService';
import { PRESET_AVATARS } from '../utils/avatars';
import SongRow from '../components/SongRow';
import ArtistCard from '../components/ArtistCard';
import {
  FaUser,
  FaPhoneAlt,
  FaLock,
  FaSignOutAlt,
  FaCog,
  FaHeart,
  FaMusic,
  FaUserFriends,
  FaMobileAlt,
  FaFileExport,
  FaFileImport,
  FaCheck,
  FaShieldAlt,
  FaCloudUploadAlt,
  FaCamera,
  FaTimes,
  FaPen,
  FaPlay,
  FaRandom,
  FaFolderPlus,
  FaSyncAlt,
  FaSearch,
  FaCompass,
} from 'react-icons/fa';

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { favorites, playlists, favoriteArtists } = useSelector((state) => state.player);

  const [currentUser, setCurrentUser] = useState(getActiveSession());
  const [activeTab, setActiveTab] = useState('favorites'); // 'favorites' | 'playlists' | 'artists' | 'account'
  const [favoriteSearch, setFavoriteSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(null);

  // Auth Inputs
  const [phoneInput, setPhoneInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Edit Name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameEditInput, setNameEditInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Avatar picker modal state
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  // Create Playlist Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');

  // Active sync on mount and auto-refresh library
  const refreshFromCloud = async () => {
    const session = getActiveSession();
    if (!session?.phone || !session?.pin) return;
    setIsSyncing(true);
    try {
      const cloudData = await fetchCloudProfile();
      if (cloudData && cloudData.success) {
        dispatch(loadCloudUserData(cloudData));
        setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      console.warn('Sync error on profile:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const session = getActiveSession();
    setCurrentUser(session);
    if (session?.phone && session?.pin) {
      refreshFromCloud();
    }
  }, [dispatch]);

  const handleStartEditName = () => {
    setNameEditInput(currentUser?.name || '');
    setIsEditingName(true);
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    const trimmed = nameEditInput.trim();
    if (!trimmed) return;
    setIsSavingName(true);
    try {
      const currentAvatar = currentUser?.avatar || PRESET_AVATARS[0].url;
      const updated = await updateProfileAvatar(currentAvatar, trimmed);
      setCurrentUser(updated);
      setIsEditingName(false);
      setAuthSuccess('Your name has been updated successfully!');
      setTimeout(() => setAuthSuccess(''), 3500);
    } catch (err) {
      console.warn('Name update warning:', err);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsLoggingIn(true);

    try {
      const data = await loginWithPhoneAndPin(phoneInput, pinInput, nameInput);
      setCurrentUser(data.user);
      dispatch(loadCloudUserData(data));
      setAuthSuccess(`Welcome back, ${data.user.name}! Your music library has been loaded.`);
      setPhoneInput('');
      setPinInput('');
      setNameInput('');
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      setAuthError(err.message || 'Login failed. Please check your phone and 4-digit PIN.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    dispatch(resetUserLibrary());
    setCurrentUser(null);
    setAuthSuccess('You have logged out.');
  };

  const handleSelectAvatar = async (avatarUrl) => {
    setIsSavingAvatar(true);
    try {
      const currentName = currentUser?.name || 'Music Lover';
      const updated = await updateProfileAvatar(avatarUrl, currentName);
      setCurrentUser(updated);
      setIsAvatarModalOpen(false);
      setAuthSuccess('Avatar updated successfully!');
      setTimeout(() => setAuthSuccess(''), 3500);
    } catch (e) {
      console.warn('Avatar update warning:', e);
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleCustomAvatarSubmit = (e) => {
    e.preventDefault();
    if (!customAvatarUrl.trim()) return;
    handleSelectAvatar(customAvatarUrl.trim());
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        importUserDataJSON(event.target.result);
        alert('Music library restored successfully! Reloading...');
        window.location.reload();
      } catch (err) {
        alert('Invalid backup file. Please choose a valid Dhun backup JSON.');
      }
    };
    reader.readAsText(file);
  };

  // Liked Songs Playback
  const handlePlayFavorites = () => {
    if (favorites.length > 0) {
      dispatch(playTrackNow({ song: favorites[0], songs: favorites, index: 0 }));
    }
  };

  const handleShuffleFavorites = () => {
    if (favorites.length > 0) {
      dispatch(shufflePlayTracks({ tracks: favorites }));
    }
  };

  // Create Playlist
  const handleCreatePlaylist = (e) => {
    e.preventDefault();
    if (!newPlaylistTitle.trim()) return;
    const newId = `pl-${Date.now()}`;
    dispatch(createPlaylist({ id: newId, title: newPlaylistTitle.trim() }));
    setNewPlaylistTitle('');
    setShowCreateModal(false);
    navigate(`/playlist/${newId}`);
  };

  // Filtered Favorites
  const filteredFavorites = favorites.filter((s) => {
    if (!favoriteSearch.trim()) return true;
    const term = favoriteSearch.toLowerCase().trim();
    return (
      (s.title || s.name || '').toLowerCase().includes(term) ||
      (s.artist || s.author || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col gap-6 pb-28 select-none animate-fade-in max-w-5xl mx-auto">
      {/* ─── Page Top Bar: Title & Settings ─────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold theme-text-main">
            Your <span className="text-rose-500">Profile</span>
          </h1>
          <p className="text-xs theme-text-muted mt-0.5">
            Manage your music collection, liked songs, and synced playlists
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && (
            <button
              onClick={refreshFromCloud}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-500/10 hover:bg-slate-500/20 theme-text-main text-xs font-semibold border theme-border transition-all disabled:opacity-50"
              title="Sync library with Cloud Database"
            >
              <FaSyncAlt className={`text-xs text-rose-500 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}

          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-500/10 hover:bg-slate-500/20 theme-text-main text-xs font-semibold border theme-border transition-all"
          >
            <FaCog className="text-xs text-rose-500" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {authSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <FaCheck className="text-sm shrink-0" />
          <span>{authSuccess}</span>
        </div>
      )}

      {/* ─── Profile Header Hero Card ───────────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-2xl theme-bg-card border theme-border shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
          {/* Avatar with Change Button */}
          <div className="relative group shrink-0">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt="Avatar"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-3 border-rose-500 shadow-xl"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white text-3xl shadow-xl shadow-rose-600/30">
                <FaUser />
              </div>
            )}

            <button
              onClick={() => setIsAvatarModalOpen(true)}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity cursor-pointer"
              title="Change Profile Avatar"
            >
              <FaCamera className="text-sm mb-0.5" />
              <span>Change</span>
            </button>

            <div
              className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-2 theme-border flex items-center justify-center text-white text-[9px]"
              title="Profile Active"
            >
              <FaCheck />
            </div>
          </div>

          {/* User Meta */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
              {isEditingName ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-2 justify-center sm:justify-start">
                  <input
                    type="text"
                    required
                    value={nameEditInput}
                    onChange={(e) => setNameEditInput(e.target.value)}
                    className="px-3 py-1 rounded-xl bg-slate-500/10 border border-rose-500 text-sm font-bold theme-text-main focus:outline-none"
                    placeholder="Enter your name"
                  />
                  <button
                    type="submit"
                    disabled={isSavingName}
                    className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md active:scale-95 transition-all"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="px-2.5 py-1 rounded-xl bg-slate-500/10 text-xs font-semibold theme-text-muted hover:theme-text-main"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h2 className="text-xl sm:text-2xl font-black theme-text-main truncate">
                    {currentUser?.name || 'Guest Music Lover'}
                  </h2>
                  {currentUser && (
                    <button
                      onClick={handleStartEditName}
                      className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-slate-500/10 transition-colors"
                      title="Edit Name"
                    >
                      <FaPen className="text-xs" />
                    </button>
                  )}
                </div>
              )}

              {currentUser && (
                <button
                  onClick={() => setIsAvatarModalOpen(true)}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/30 transition-all self-center sm:self-auto flex items-center gap-1.5"
                >
                  <FaCamera className="text-[10px]" />
                  <span>Choose Avatar</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-500">
                <FaPhoneAlt className="text-[9px]" />
                {currentUser?.phone ? `+91 ${currentUser.phone}` : 'Guest Mode (No phone linked)'}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 theme-text-muted">
                <FaShieldAlt className="text-[9px] text-emerald-500" />
                {currentUser ? '4-Digit PIN Protected' : 'Offline / Guest'}
              </span>

              {lastSyncedTime && (
                <span className="text-[10px] text-emerald-500 font-medium">
                  • Synced at {lastSyncedTime}
                </span>
              )}
            </div>

            <p className="text-xs theme-text-muted mt-2 max-w-xl">
              {currentUser
                ? 'Your playlists and liked songs are linked to this phone profile and saved in the cloud database.'
                : 'Log in with your 10-digit phone number & 4-digit PIN to sync your playlists and liked songs.'}
            </p>
          </div>

          {currentUser && (
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-full border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition-all flex items-center gap-1.5 self-center sm:self-start shrink-0"
            >
              <FaSignOutAlt className="text-xs" />
              <span>Log Out</span>
            </button>
          )}
        </div>

        {/* ─── Interactive Profile Stat Pills ────────────────────────── */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 mt-6 pt-5 border-t theme-border">
          <div
            onClick={() => setActiveTab('favorites')}
            className={`p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center text-center group border ${
              activeTab === 'favorites'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-500'
                : 'bg-slate-500/5 hover:bg-slate-500/10 border-transparent theme-text-main'
            }`}
          >
            <FaHeart className="text-base sm:text-lg mb-0.5 text-rose-500 group-hover:scale-110 transition-transform" />
            <span className="text-base sm:text-lg font-black">{favorites.length}</span>
            <span className="text-[10px] sm:text-[11px] font-medium opacity-80">Liked Songs</span>
          </div>

          <div
            onClick={() => setActiveTab('playlists')}
            className={`p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center text-center group border ${
              activeTab === 'playlists'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-500'
                : 'bg-slate-500/5 hover:bg-slate-500/10 border-transparent theme-text-main'
            }`}
          >
            <FaMusic className="text-base sm:text-lg mb-0.5 text-rose-500 group-hover:scale-110 transition-transform" />
            <span className="text-base sm:text-lg font-black">{playlists.length}</span>
            <span className="text-[10px] sm:text-[11px] font-medium opacity-80">Playlists</span>
          </div>

          <div
            onClick={() => setActiveTab('artists')}
            className={`p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center text-center group border ${
              activeTab === 'artists'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-500'
                : 'bg-slate-500/5 hover:bg-slate-500/10 border-transparent theme-text-main'
            }`}
          >
            <FaUserFriends className="text-base sm:text-lg mb-0.5 text-rose-500 group-hover:scale-110 transition-transform" />
            <span className="text-base sm:text-lg font-black">{favoriteArtists.length}</span>
            <span className="text-[10px] sm:text-[11px] font-medium opacity-80">Followed</span>
          </div>

          <div
            onClick={() => setActiveTab('account')}
            className={`p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center text-center group border ${
              activeTab === 'account'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-500'
                : 'bg-slate-500/5 hover:bg-slate-500/10 border-transparent theme-text-main'
            }`}
          >
            <FaShieldAlt className="text-base sm:text-lg mb-0.5 text-emerald-500 group-hover:scale-110 transition-transform" />
            <span className="text-base sm:text-lg font-black">
              {currentUser ? 'Active' : 'Guest'}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium opacity-80">Cloud Sync</span>
          </div>
        </div>
      </div>

      {/* ─── Profile Navigation Tabs Bar ────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'favorites'
              ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
              : 'bg-slate-500/10 hover:bg-slate-500/20 theme-text-main'
          }`}
        >
          <FaHeart className="text-xs" />
          <span>Liked Songs ({favorites.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('playlists')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'playlists'
              ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
              : 'bg-slate-500/10 hover:bg-slate-500/20 theme-text-main'
          }`}
        >
          <FaMusic className="text-xs" />
          <span>My Playlists ({playlists.length})</span>
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
          <span>Followed Artists ({favoriteArtists.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'account'
              ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
              : 'bg-slate-500/10 hover:bg-slate-500/20 theme-text-main'
          }`}
        >
          <FaShieldAlt className="text-xs" />
          <span>Account & Cloud Sync</span>
        </button>
      </div>

      {/* ─── TAB 1: LIKED SONGS (Directly Interactive on Profile) ───── */}
      {activeTab === 'favorites' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-rose-900/30 via-pink-950/20 to-transparent border border-rose-500/20 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center text-white shadow-md shadow-rose-600/30 shrink-0">
                <FaHeart className="text-xl" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black theme-text-main">Your Liked Songs</h2>
                <p className="text-xs theme-text-muted">
                  {favorites.length} {favorites.length === 1 ? 'song' : 'songs'} saved on your profile
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handlePlayFavorites}
                disabled={favorites.length === 0}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
              >
                <FaPlay className="text-[10px]" />
                <span>Play All</span>
              </button>

              <button
                onClick={handleShuffleFavorites}
                disabled={favorites.length === 0}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-slate-500/15 hover:bg-slate-500/25 theme-text-main font-bold text-xs border theme-border hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
              >
                <FaRandom className="text-[10px] text-rose-500" />
                <span>Shuffle</span>
              </button>
            </div>
          </div>

          {favorites.length > 5 && (
            <div className="relative">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search in your liked songs..."
                value={favoriteSearch}
                onChange={(e) => setFavoriteSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-500/10 border theme-border theme-text-main placeholder-slate-400 text-xs focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>
          )}

          {favorites.length > 0 ? (
            <div className="space-y-1">
              {filteredFavorites.map((song, i) => (
                <SongRow
                  key={song.videoId || i}
                  song={song}
                  index={i}
                  songs={favorites}
                  isHighlightedLiked={true}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl theme-bg-card border theme-border text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 text-2xl">
                <FaHeart />
              </div>
              <h3 className="text-base font-bold theme-text-main">No liked songs on this profile yet</h3>
              <p className="text-xs theme-text-muted max-w-sm">
                Tap the heart button on any track while streaming to add it to your profile.
              </p>
              <button
                onClick={() => navigate('/charts')}
                className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-600/30 hover:scale-105 transition-all"
              >
                <FaCompass />
                <span>Explore Top Indian Hits</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: PLAYLISTS (Directly Interactive on Profile) ──────── */}
      {activeTab === 'playlists' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black theme-text-main">Profile Playlists</h2>
              <p className="text-xs theme-text-muted">
                {playlists.length} playlists saved on this profile
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 hover:scale-105 transition-all"
            >
              <FaFolderPlus />
              <span>New Playlist</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {/* Auto Liked Songs Playlist Box */}
            <div
              onClick={() => setActiveTab('favorites')}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl glass-card hover:bg-slate-500/10 cursor-pointer group transition-all border border-rose-500/30 shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl shrink-0 bg-gradient-to-br from-rose-600 via-pink-600 to-rose-900 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <FaHeart className="text-white text-lg drop-shadow" />
                </div>
                <div className="min-w-0">
                  <span className="text-[8px] font-black uppercase tracking-wider text-rose-500">AUTO SYNC</span>
                  <h3 className="font-bold text-xs sm:text-sm theme-text-main group-hover:text-rose-500 truncate transition-colors">
                    Liked Songs
                  </h3>
                  <p className="text-[11px] theme-text-muted truncate">
                    {favorites.length} {favorites.length === 1 ? 'song' : 'songs'}
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayFavorites();
                }}
                disabled={favorites.length === 0}
                className="p-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:scale-110 active:scale-95 transition-all disabled:opacity-30 shrink-0"
                title="Play Liked Songs"
              >
                <FaPlay className="text-[9px]" />
              </button>
            </div>

            {/* Custom & Regional Playlists */}
            {playlists.map((pl) => {
              const trks = Array.isArray(pl.tracks) ? pl.tracks : [];
              const firstTrack = trks.length > 0 ? trks[0] : null;
              const plCover =
                firstTrack?.thumbnail ||
                firstTrack?.cover ||
                firstTrack?.image ||
                pl.cover ||
                'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80';

              return (
                <div
                  key={pl.id}
                  onClick={() => navigate(`/playlist/${pl.id}`)}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl glass-card hover:bg-slate-500/10 cursor-pointer group transition-all border theme-border shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-dark-800 shrink-0 shadow-md">
                      <img
                        src={plCover}
                        alt={pl.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">PLAYLIST</span>
                      <h3 className="font-bold text-xs sm:text-sm theme-text-main group-hover:text-rose-500 truncate transition-colors">
                        {pl.title}
                      </h3>
                      <p className="text-[11px] theme-text-muted truncate">
                        {trks.length} {trks.length === 1 ? 'song' : 'songs'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (trks.length > 0) {
                        dispatch(playTrackNow({ song: trks[0], songs: trks, index: 0 }));
                      } else {
                        navigate(`/playlist/${pl.id}`);
                      }
                    }}
                    className="p-2.5 rounded-full bg-slate-500/15 hover:bg-rose-600 hover:text-white theme-text-main shadow-md hover:scale-110 active:scale-95 transition-all shrink-0"
                    title={`Play ${pl.title}`}
                  >
                    <FaPlay className="text-[9px]" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 3: FOLLOWED ARTISTS ────────────────────────────────── */}
      {activeTab === 'artists' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black theme-text-main">Followed Artists</h2>
              <p className="text-xs theme-text-muted">
                {favoriteArtists.length} singers and composers followed on this profile
              </p>
            </div>

            <button
              onClick={() => navigate('/artists')}
              className="text-xs font-bold text-rose-500 hover:text-rose-400"
            >
              Browse All Artists →
            </button>
          </div>

          {favoriteArtists.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {favoriteArtists.map((artist, i) => (
                <ArtistCard key={artist.name || i} artist={artist} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl theme-bg-card border theme-border text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 text-2xl">
                <FaUserFriends />
              </div>
              <h3 className="text-base font-bold theme-text-main">No followed artists yet</h3>
              <p className="text-xs theme-text-muted max-w-sm">
                Follow your favorite Indian singers (Arijit Singh, Diljit Dosanjh, Renuka Panwar) to see them here.
              </p>
              <button
                onClick={() => navigate('/artists')}
                className="mt-2 px-5 py-2.5 rounded-full bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-600/30 hover:scale-105 transition-all"
              >
                Browse Indian Artists
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: ACCOUNT, LOGIN & CLOUD SYNC ──────────────────────── */}
      {activeTab === 'account' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {!currentUser ? (
            <div className="p-5 sm:p-6 rounded-2xl theme-bg-card border theme-border shadow-md">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 flex items-center justify-center text-rose-500">
                  <FaMobileAlt className="text-base" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold theme-text-main">
                    Log In with Phone & 4-Digit PIN
                  </h3>
                  <p className="text-xs theme-text-muted">
                    Access your playlists and liked songs on any phone, tablet, or PC
                  </p>
                </div>
              </div>

              {authError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-semibold">
                  {authError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold theme-text-muted mb-1 uppercase tracking-wider">
                    Your Name (For new accounts)
                  </label>
                  <div className="relative">
                    <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-500/10 border theme-border text-xs theme-text-main focus:outline-none focus:border-rose-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold theme-text-muted mb-1 uppercase tracking-wider">
                    10-Digit Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-500 font-bold text-xs">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-12 pr-4 py-2 rounded-xl bg-slate-500/10 border theme-border text-xs font-mono theme-text-main focus:outline-none focus:border-rose-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold theme-text-muted mb-1 uppercase tracking-wider">
                    4-Digit Secret PIN
                  </label>
                  <div className="relative">
                    <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                    <input
                      type="password"
                      required
                      maxLength={4}
                      placeholder="••••"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-500/10 border theme-border text-xs font-mono tracking-widest theme-text-main focus:outline-none focus:border-rose-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn || phoneInput.length < 10 || pinInput.length < 4}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-rose-600/30 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Syncing Cloud Profile...</span>
                    </>
                  ) : (
                    <>
                      <FaCloudUploadAlt className="text-sm" />
                      <span>Log In & Load My Music</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="p-5 sm:p-6 rounded-2xl theme-bg-card border theme-border shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-500">
                  <FaCheck className="text-base" />
                </div>
                <div>
                  <h3 className="text-base font-bold theme-text-main">
                    Cloud Database Synchronized
                  </h3>
                  <p className="text-xs theme-text-muted">
                    Linked to +91 {currentUser.phone}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-500/10 border theme-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FaPhoneAlt className="text-rose-500 text-xs" />
                  <div>
                    <p className="text-xs font-bold theme-text-main">+91 {currentUser.phone}</p>
                    <p className="text-[10px] theme-text-muted">PIN: •••• (Protected)</p>
                  </div>
                </div>
                <button
                  onClick={refreshFromCloud}
                  disabled={isSyncing}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 border border-rose-500/30 transition-all flex items-center gap-1.5"
                >
                  <FaSyncAlt className={`text-[10px] ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Refreshing...' : 'Refresh Data'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Library Backup & Transfer Section */}
          <div className="p-5 sm:p-6 rounded-2xl theme-bg-card border theme-border shadow-md">
            <h3 className="text-base font-bold theme-text-main mb-1">
              Manual JSON Backup & Transfer
            </h3>
            <p className="text-xs theme-text-muted mb-4">
              Download your complete library as a JSON file or restore it anytime on any device.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={exportUserDataJSON}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 theme-text-main text-xs font-bold transition-all border theme-border"
              >
                <FaFileExport className="text-rose-500 text-sm" />
                <span>Export Backup File</span>
              </button>

              <label className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 theme-text-main text-xs font-bold transition-all border theme-border cursor-pointer">
                <FaFileImport className="text-rose-500 text-sm" />
                <span>Restore Backup File</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create Playlist Modal ──────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm rounded-2xl theme-bg-card border theme-border shadow-2xl p-5 text-left">
            <div className="flex items-center justify-between pb-3 border-b theme-border mb-3">
              <h3 className="text-sm font-bold theme-text-main">Create New Playlist</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-full theme-text-muted hover:theme-text-main"
              >
                <FaTimes className="text-xs" />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylist} className="space-y-3">
              <input
                type="text"
                autoFocus
                required
                placeholder="Playlist name..."
                value={newPlaylistTitle}
                onChange={(e) => setNewPlaylistTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-500/10 border theme-border text-xs theme-text-main focus:outline-none focus:border-rose-500"
              />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-500/10 text-xs font-semibold theme-text-muted hover:theme-text-main"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistTitle.trim()}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md disabled:opacity-40"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Choose Avatar Modal ────────────────────────────────────── */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl theme-bg-card border theme-border shadow-2xl p-6 text-left max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b theme-border">
              <div>
                <h3 className="text-base font-bold theme-text-main">Choose Avatar</h3>
                <p className="text-xs theme-text-muted">Select an avatar for your profile</p>
              </div>
              <button
                onClick={() => setIsAvatarModalOpen(false)}
                className="p-2 rounded-full theme-text-muted hover:theme-text-main bg-slate-500/10"
              >
                <FaTimes />
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 py-4 space-y-5">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {PRESET_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    onClick={() => handleSelectAvatar(av.url)}
                    disabled={isSavingAvatar}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all ${
                      currentUser?.avatar === av.url
                        ? 'border-rose-500 bg-rose-500/10 scale-105'
                        : 'theme-border hover:bg-slate-500/10'
                    }`}
                  >
                    <img src={av.url} alt={av.name} className="w-14 h-14 rounded-full object-cover shadow-md" />
                    <span className="text-[10px] font-bold theme-text-main truncate max-w-[80px]">
                      {av.name}
                    </span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleCustomAvatarSubmit} className="pt-2 border-t theme-border">
                <label className="block text-xs font-bold theme-text-muted mb-1.5 uppercase tracking-wider">
                  Or Paste Custom Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-500/10 border theme-border text-xs theme-text-main focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="submit"
                    disabled={isSavingAvatar || !customAvatarUrl.trim()}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>

            <div className="pt-3 border-t theme-border flex justify-end">
              <button
                onClick={() => setIsAvatarModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-500/10 text-xs font-bold theme-text-main"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
