import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loadCloudUserData } from '../redux/features/playerSlice';
import {
  getActiveSession,
  loginWithPhoneAndPin,
  logoutUser,
  updateProfileAvatar,
  exportUserDataJSON,
  importUserDataJSON,
} from '../services/authService';
import { PRESET_AVATARS } from '../utils/avatars';
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
} from 'react-icons/fa';

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { favorites, playlists, favoriteArtists } = useSelector((state) => state.player);

  const [currentUser, setCurrentUser] = useState(getActiveSession());
  const [phoneInput, setPhoneInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Avatar picker modal state
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  useEffect(() => {
    setCurrentUser(getActiveSession());
  }, []);

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
    } catch (err) {
      setAuthError(err.message || 'Login failed. Please check your phone and 4-digit PIN.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setAuthSuccess('You have logged out.');
  };

  const handleSelectAvatar = async (avatarUrl) => {
    if (!currentUser) {
      alert('Please log in with your phone and PIN first to save your avatar.');
      return;
    }
    setIsSavingAvatar(true);
    try {
      const updated = await updateProfileAvatar(avatarUrl);
      setCurrentUser(updated);
      setIsAvatarModalOpen(false);
      setAuthSuccess('Avatar updated successfully!');
    } catch (e) {
      alert(e.message || 'Failed to update avatar');
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

  return (
    <div className="flex flex-col gap-8 pb-28 select-none animate-fade-in max-w-4xl mx-auto">
      {/* Page Title & App Settings */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold theme-text-main">
            Your <span className="text-rose-500">Profile</span>
          </h1>
          <p className="text-xs theme-text-muted mt-1">
            Access your saved songs, playlists, and cloud account across all devices
          </p>
        </div>

        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-500/10 hover:bg-slate-500/20 theme-text-main text-xs font-bold transition-all"
        >
          <FaCog className="text-sm text-rose-500" />
          <span>App Settings</span>
        </button>
      </div>

      {authSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <FaCheck className="text-sm shrink-0" />
          <span>{authSuccess}</span>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="p-6 md:p-8 rounded-3xl theme-bg-card border theme-border shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          {/* Avatar with Change Button */}
          <div className="relative group">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-3 border-rose-500 shadow-xl"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white text-3xl shadow-xl shadow-rose-600/30">
                <FaUser />
              </div>
            )}

            {/* Click to Change Avatar Overlay */}
            <button
              onClick={() => setIsAvatarModalOpen(true)}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] font-bold transition-opacity cursor-pointer"
              title="Change Profile Avatar"
            >
              <FaCamera className="text-base mb-1" />
              <span>Change</span>
            </button>

            <div
              className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 theme-border flex items-center justify-center text-white text-[10px]"
              title="Active Status"
            >
              <FaCheck />
            </div>
          </div>

          {/* User Meta */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
              <h2 className="text-xl md:text-2xl font-black theme-text-main">
                {currentUser?.name || 'Guest Music Lover'}
              </h2>

              {/* Direct Choose Avatar Button */}
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

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-500">
                <FaPhoneAlt className="text-[10px]" />
                {currentUser?.phone ? `+91 ${currentUser.phone}` : 'No phone linked'}
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 theme-text-muted">
                <FaShieldAlt className="text-[10px] text-emerald-500" />
                {currentUser ? '4-Digit PIN Protected' : 'Not Logged In'}
              </span>
            </div>

            <p className="text-xs theme-text-muted mt-3 max-w-xl">
              {currentUser
                ? 'Your songs and playlists are tied to your phone number and 4-digit PIN. Log in with the same details on any device to retrieve your music.'
                : 'Log in with your phone number and 4-digit PIN below so your songs and playlists never get lost when switching devices.'}
            </p>
          </div>

          {/* Actions */}
          {currentUser && (
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-full border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition-all flex items-center gap-2 self-center sm:self-start"
            >
              <FaSignOutAlt className="text-xs" />
              <span>Log Out</span>
            </button>
          )}
        </div>

        {/* User Stats Grid */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mt-8 pt-6 border-t theme-border">
          <div
            onClick={() => navigate('/library')}
            className="p-3.5 rounded-2xl bg-slate-500/5 hover:bg-slate-500/10 transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
          >
            <FaHeart className="text-rose-500 text-lg mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-lg md:text-xl font-black theme-text-main">
              {favorites.length}
            </span>
            <span className="text-[11px] theme-text-muted font-medium">Liked Songs</span>
          </div>

          <div
            onClick={() => navigate('/library')}
            className="p-3.5 rounded-2xl bg-slate-500/5 hover:bg-slate-500/10 transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
          >
            <FaMusic className="text-rose-500 text-lg mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-lg md:text-xl font-black theme-text-main">
              {playlists.length}
            </span>
            <span className="text-[11px] theme-text-muted font-medium">Playlists</span>
          </div>

          <div
            onClick={() => navigate('/artists')}
            className="p-3.5 rounded-2xl bg-slate-500/5 hover:bg-slate-500/10 transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
          >
            <FaUserFriends className="text-rose-500 text-lg mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-lg md:text-xl font-black theme-text-main">
              {favoriteArtists.length}
            </span>
            <span className="text-[11px] theme-text-muted font-medium">Artists Followed</span>
          </div>
        </div>
      </div>

      {/* Account Login / Switch Box */}
      {!currentUser ? (
        <div className="p-6 md:p-8 rounded-3xl theme-bg-card border theme-border shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 flex items-center justify-center text-rose-500">
              <FaMobileAlt className="text-lg" />
            </div>
            <div>
              <h3 className="text-lg font-bold theme-text-main">
                Log In with Phone & 4-Digit PIN
              </h3>
              <p className="text-xs theme-text-muted">
                Save your music permanently so you can access it on any phone or PC
              </p>
            </div>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-semibold">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold theme-text-muted mb-1.5 uppercase tracking-wider">
                Your Name (For new accounts)
              </label>
              <div className="relative">
                <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-500/10 border theme-border text-sm theme-text-main focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold theme-text-muted mb-1.5 uppercase tracking-wider">
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
                  className="w-full pl-12 pr-4 py-2.5 rounded-2xl bg-slate-500/10 border theme-border text-sm font-mono theme-text-main focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold theme-text-muted mb-1.5 uppercase tracking-wider">
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-500/10 border theme-border text-sm font-mono tracking-widest theme-text-main focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn || phoneInput.length < 10 || pinInput.length < 4}
              className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-rose-600/30 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting to Cloud...</span>
                </>
              ) : (
                <>
                  <FaCloudUploadAlt className="text-base" />
                  <span>Log In & Sync My Music</span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="p-6 md:p-8 rounded-3xl theme-bg-card border theme-border shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-500">
              <FaCheck className="text-base" />
            </div>
            <div>
              <h3 className="text-lg font-bold theme-text-main">
                Cloud Sync Active
              </h3>
              <p className="text-xs theme-text-muted">
                Your account is currently synced on this device
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-500/10 border theme-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaPhoneAlt className="text-rose-500 text-sm" />
              <div>
                <p className="text-xs font-bold theme-text-main">+91 {currentUser.phone}</p>
                <p className="text-[11px] theme-text-muted">PIN: •••• (Protected)</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-500">
              Synchronized
            </span>
          </div>
        </div>
      )}

      {/* Admin Portal Card */}
      <div className="p-6 md:p-8 rounded-3xl theme-bg-card border theme-border shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-600/15 text-rose-500 flex items-center justify-center text-xl shrink-0 border border-rose-500/20">
            <FaShieldAlt />
          </div>
          <div>
            <h3 className="text-base font-bold theme-text-main">Admin Portal</h3>
            <p className="text-xs theme-text-muted">
              Monitor registered users, active playlists, and cloud database records
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/admin')}
          className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/30 flex items-center gap-2 self-start sm:self-auto"
        >
          <FaShieldAlt className="text-xs" />
          <span>Open Admin Portal</span>
        </button>
      </div>

      {/* Library Backup & Transfer Section */}
      <div className="p-6 md:p-8 rounded-3xl theme-bg-card border theme-border shadow-lg">
        <h3 className="text-base md:text-lg font-bold theme-text-main mb-2">
          Manual Backup & Transfer
        </h3>
        <p className="text-xs theme-text-muted mb-6">
          Download your complete library as a backup file or restore it anytime on another device.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <button
            onClick={exportUserDataJSON}
            className="flex items-center justify-center gap-2.5 p-3.5 rounded-2xl bg-slate-500/10 hover:bg-slate-500/20 theme-text-main text-xs font-bold transition-all border theme-border"
          >
            <FaFileExport className="text-rose-500 text-sm" />
            <span>Download Backup File</span>
          </button>

          <label className="flex items-center justify-center gap-2.5 p-3.5 rounded-2xl bg-slate-500/10 hover:bg-slate-500/20 theme-text-main text-xs font-bold transition-all border theme-border cursor-pointer">
            <FaFileImport className="text-rose-500 text-sm" />
            <span>Restore from Backup File</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Choose Avatar Modal */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl theme-bg-card border theme-border shadow-2xl p-6 text-left max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b theme-border">
              <div>
                <h3 className="text-base font-bold theme-text-main">Choose Your Avatar</h3>
                <p className="text-xs theme-text-muted">Select an avatar style for your Dhun profile</p>
              </div>
              <button
                onClick={() => setIsAvatarModalOpen(false)}
                className="p-2 rounded-full theme-text-muted hover:theme-text-main bg-slate-500/10"
              >
                <FaTimes />
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 py-4 space-y-5">
              {/* Presets Grid */}
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

              {/* Custom Image URL Form */}
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
