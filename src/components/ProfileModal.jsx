import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loadCloudUserData } from '../redux/features/playerSlice';
import {
  getActiveSession,
  loginWithPhoneAndPin,
  logoutUser,
  exportUserDataJSON,
  importUserDataJSON,
} from '../services/authService';
import {
  FaUser,
  FaPhoneAlt,
  FaLock,
  FaSignOutAlt,
  FaCog,
  FaTimes,
  FaHeart,
  FaMusic,
  FaUserFriends,
  FaMobileAlt,
  FaFileExport,
  FaFileImport,
  FaChevronRight,
  FaCheck,
} from 'react-icons/fa';

const ProfileModal = ({ isOpen, onClose }) => {
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

  useEffect(() => {
    if (isOpen) {
      setCurrentUser(getActiveSession());
      setAuthError('');
      setAuthSuccess('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsLoggingIn(true);

    try {
      const data = await loginWithPhoneAndPin(phoneInput, pinInput, nameInput);
      setCurrentUser(data.user);
      dispatch(loadCloudUserData(data));
      setAuthSuccess(`Welcome, ${data.user.name}! Cloud library synced.`);
      setPhoneInput('');
      setPinInput('');
      setNameInput('');
    } catch (err) {
      setAuthError(err.message || 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        importUserDataJSON(event.target.result);
        alert('Library restored successfully! Reloading...');
        window.location.reload();
      } catch (err) {
        alert('Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  const handleGoToSettings = () => {
    onClose();
    navigate('/settings');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl theme-bg-card border theme-border shadow-2xl p-6 sm:p-7 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b theme-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30">
              <FaUser className="text-sm" />
            </div>
            <h2 className="text-base font-extrabold theme-text-main">
              {currentUser ? 'My Profile' : 'Sign In to Profile'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-500/10 theme-text-muted hover:theme-text-main transition-colors"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>

        {/* ─── PROFILE CONTENT ─────────────────────────────────── */}
        {currentUser ? (
          /* Logged In User Card */
          <div className="flex flex-col gap-4">
            {/* User Header */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20">
              <div className="flex items-center gap-3.5">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-14 h-14 rounded-2xl bg-dark-800 border-2 border-rose-500 shadow-md object-cover"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold theme-text-main">{currentUser.name}</h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Cloud Active" />
                  </div>
                  <p className="text-xs theme-text-muted flex items-center gap-1 mt-0.5">
                    <FaPhoneAlt className="text-[9px]" />
                    <span>+91 {currentUser.phone}</span>
                  </p>
                  <span className="text-[10px] theme-text-muted block mt-0.5">
                    Member since {currentUser.joinedAt || '2026'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all text-xs flex items-center gap-1"
                title="Log Out"
              >
                <FaSignOutAlt />
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-2xl theme-bg-main border theme-border">
                <FaHeart className="text-rose-500 mx-auto mb-1 text-xs" />
                <span className="text-sm font-black theme-text-main block">{favorites.length}</span>
                <span className="text-[10px] theme-text-muted font-medium">Liked Songs</span>
              </div>
              <div className="p-3 rounded-2xl theme-bg-main border theme-border">
                <FaMusic className="text-rose-500 mx-auto mb-1 text-xs" />
                <span className="text-sm font-black theme-text-main block">{playlists.length}</span>
                <span className="text-[10px] theme-text-muted font-medium">Playlists</span>
              </div>
              <div className="p-3 rounded-2xl theme-bg-main border theme-border">
                <FaUserFriends className="text-rose-500 mx-auto mb-1 text-xs" />
                <span className="text-sm font-black theme-text-main block">{favoriteArtists.length}</span>
                <span className="text-[10px] theme-text-muted font-medium">Artists</span>
              </div>
            </div>

            {/* Multi-Mobile Sync Info */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-500/5 border theme-border text-[11px] theme-text-muted">
              <FaMobileAlt className="text-rose-500 text-base shrink-0" />
              <span>
                To listen on any other phone, just log in with <strong>+91-{currentUser.phone}</strong> and your PIN.
              </span>
            </div>

            {/* Backup & Restore Controls */}
            <div className="flex items-center justify-between gap-2 pt-1 text-xs">
              <button
                onClick={exportUserDataJSON}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 theme-text-main font-semibold flex items-center justify-center gap-1.5 transition-all text-[11px]"
              >
                <FaFileExport className="text-rose-500" />
                <span>Backup JSON</span>
              </button>
              <label className="flex-1 py-2 px-3 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 theme-text-main font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-[11px]">
                <FaFileImport className="text-rose-500" />
                <span>Restore</span>
                <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
              </label>
            </div>
          </div>
        ) : (
          /* Sign In Form */
          <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
            <p className="text-xs theme-text-muted leading-relaxed">
              Log in with your Indian phone number & 4-digit PIN. Your playlists and favorites stay synced across all your phones!
            </p>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold theme-text-main block mb-1">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-500/10 border theme-border theme-text-main text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold theme-text-main block mb-1">
                  10-Digit Mobile Number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl bg-slate-500/20 border-y border-l theme-border text-xs font-mono theme-text-muted">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="9876543210"
                    className="flex-1 px-3.5 py-2 rounded-r-xl bg-slate-500/10 border theme-border theme-text-main text-xs font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold theme-text-main block mb-1">
                  4-Digit Secret PIN
                </label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-500/10 border theme-border theme-text-main text-xs font-mono tracking-widest focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {authError && <p className="text-xs text-rose-500 font-semibold">{authError}</p>}
            {authSuccess && <p className="text-xs text-emerald-500 font-semibold">{authSuccess}</p>}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all disabled:opacity-50 mt-1"
            >
              {isLoggingIn ? 'Connecting...' : 'Sign In / Connect Profile'}
            </button>
          </form>
        )}

        {/* ─── SETTING ICON AFTER PROFILE CONTENT ─────────────────── */}
        <div className="pt-3 border-t theme-border">
          <button
            onClick={handleGoToSettings}
            className="w-full p-3.5 rounded-2xl bg-slate-500/10 hover:bg-rose-500/10 border theme-border hover:border-rose-500/40 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600/15 group-hover:bg-rose-600 text-rose-500 group-hover:text-white flex items-center justify-center transition-colors shadow-sm">
                <FaCog className="text-base group-hover:rotate-45 transition-transform duration-300" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold theme-text-main group-hover:text-rose-500 transition-colors">
                  App Settings
                </h4>
                <p className="text-[10px] theme-text-muted">
                  Color theme, sound quality, offline downloads
                </p>
              </div>
            </div>
            <FaChevronRight className="text-xs theme-text-muted group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
