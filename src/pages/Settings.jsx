import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setThemeMode,
  toggleFavoriteArtist,
  setIsEqualizerModalOpen,
  setAudioQuality as setAudioQualityRedux,
} from '../redux/features/playerSlice';
import { audioDSP } from '../services/audioDsp';
import {
  getOfflineStorageUsage,
  clearAllOfflineTracks,
} from '../services/offlineStorage';
import {
  FaPalette,
  FaDownload,
  FaTrashAlt,
  FaHeart,
  FaMusic,
  FaCheck,
  FaSlidersH,
  FaMoon,
  FaSun,
} from 'react-icons/fa';

const Settings = () => {
  const dispatch = useDispatch();
  const { themeMode, favoriteArtists } = useSelector((state) => state.player);

  // Storage State
  const [storageUsage, setStorageUsage] = useState({ count: 0, megabytes: '0.0' });
  const [storageCleared, setStorageCleared] = useState(false);

  // Audio Quality Setting
  const [audioQuality, setAudioQuality] = useState('320');
  const [backgroundAudio, setBackgroundAudio] = useState(true);

  useEffect(() => {
    getOfflineStorageUsage().then(setStorageUsage);
  }, []);

  const handleClearOffline = async () => {
    if (window.confirm('Delete all downloaded offline songs to free up device space?')) {
      await clearAllOfflineTracks();
      setStorageUsage({ count: 0, megabytes: '0.0' });
      setStorageCleared(true);
      setTimeout(() => setStorageCleared(false), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-28 select-none animate-fade-in max-w-4xl mx-auto">
      {/* Settings Header */}
      <div className="flex items-center gap-3">
        <div className="p-3.5 rounded-2xl bg-rose-600/15 text-rose-500">
          <FaSlidersH className="text-2xl" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold theme-text-main">App Settings</h1>
          <p className="text-xs theme-text-muted">Customize your theme, sound quality, offline downloads, and favorite artists</p>
        </div>
      </div>

      {/* ─── 1. THEME SELECTION SECTION ───────────────────────────────── */}
      <div className="rounded-3xl theme-bg-card border theme-border p-6 md:p-8 flex flex-col gap-6 shadow-xl">
        <div className="flex items-center gap-3 pb-4 border-b theme-border">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
            <FaPalette className="text-lg" />
          </div>
          <div>
            <h2 className="text-lg font-bold theme-text-main">App Theme</h2>
            <p className="text-xs theme-text-muted">Select your preferred color profile</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Dark Mode (Black & Red) */}
          <div
            onClick={() => dispatch(setThemeMode('dark'))}
            className={`p-5 rounded-2xl cursor-pointer border transition-all flex items-center justify-between ${
              themeMode === 'dark'
                ? 'bg-black border-rose-500 shadow-xl shadow-rose-500/20'
                : 'bg-black/50 border-white/10 hover:border-white/30'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md">
                <FaMoon className="text-lg" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Dark Mode (Red & Black)</h3>
                <p className="text-xs text-slate-400">Deep obsidian with radiant ruby red</p>
              </div>
            </div>
            {themeMode === 'dark' && (
              <div className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center text-white text-xs">
                <FaCheck />
              </div>
            )}
          </div>

          {/* Light Mode (White & Red) */}
          <div
            onClick={() => dispatch(setThemeMode('light'))}
            className={`p-5 rounded-2xl cursor-pointer border transition-all flex items-center justify-between ${
              themeMode === 'light'
                ? 'bg-white border-rose-600 shadow-xl shadow-rose-600/20 text-slate-900'
                : 'bg-white/80 border-slate-300 hover:border-slate-400 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md">
                <FaSun className="text-lg" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Light Mode (White & Red)</h3>
                <p className="text-xs text-slate-500">Crisp white with vibrant crimson accents</p>
              </div>
            </div>
            {themeMode === 'light' && (
              <div className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center text-white text-xs">
                <FaCheck />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. OFFLINE STORAGE & DOWNLOADS ──────────────────────────── */}
      <div className="rounded-3xl theme-bg-card border theme-border p-6 md:p-8 flex flex-col gap-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
              <FaDownload className="text-lg" />
            </div>
            <div>
              <h2 className="text-lg font-bold theme-text-main">Offline Downloads Storage</h2>
              <p className="text-xs theme-text-muted">Manage tracks downloaded directly onto this device</p>
            </div>
          </div>
          {storageUsage.count > 0 && (
            <button
              onClick={handleClearOffline}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
            >
              <FaTrashAlt />
              <span>Clear All Downloads</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-500/5 border theme-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-rose-500">{storageUsage.count}</span>
              <span className="text-sm font-semibold theme-text-main">Offline Songs Stored</span>
            </div>
            <p className="text-xs theme-text-muted mt-1">
              Using approx. <strong className="theme-text-main">{storageUsage.megabytes} MB</strong> of local storage. Playable with zero internet connection!
            </p>
          </div>

          {storageCleared && (
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500 text-xs font-bold">
              Storage Cleared!
            </span>
          )}
        </div>
      </div>

      {/* ─── 3. PLAYBACK & AUDIO QUALITY ─────────────────────────────── */}
      <div className="rounded-3xl theme-bg-card border theme-border p-6 md:p-8 flex flex-col gap-6 shadow-xl">
        <div className="flex items-center gap-3 pb-4 border-b theme-border">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
            <FaMusic className="text-lg" />
          </div>
          <div>
            <h2 className="text-lg font-bold theme-text-main">Sound Quality & Playback</h2>
            <p className="text-xs theme-text-muted">Adjust how your music sounds and plays</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Sound & Equalizer Settings */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 shrink-0">
                <FaSlidersH className="text-base" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold theme-text-main">Sound Equalizer & Bass</h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500 text-white">
                    PRO
                  </span>
                </div>
                <p className="text-xs theme-text-muted mt-0.5">
                  Tune bass, vocals, and 3D sound effects to match your earphones
                </p>
              </div>
            </div>
            <button
              onClick={() => dispatch(setIsEqualizerModalOpen(true))}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all shrink-0 flex items-center gap-2"
            >
              <FaSlidersH className="text-xs" />
              <span>Customize Sound</span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold theme-text-main">Music Sound Quality</span>
              <p className="text-xs theme-text-muted">Choose your preferred streaming clarity</p>
            </div>
            <select
              value={audioQuality}
              onChange={(e) => {
                const val = e.target.value;
                setAudioQuality(val);
                dispatch(setAudioQualityRedux(val));
                audioDSP.setBitrate(val);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-500/10 border theme-border theme-text-main text-xs font-semibold focus:outline-none focus:border-rose-500"
            >
              <option value="320">Very High (Best Quality - Like Spotify Pro)</option>
              <option value="256">High Quality (Balanced)</option>
              <option value="128">Normal Quality (Saves Mobile Data)</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-3 border-t theme-border">
            <div>
              <span className="text-sm font-semibold theme-text-main">Play with Screen Turned Off</span>
              <p className="text-xs theme-text-muted">Keeps music playing in the background or when your phone is locked</p>
            </div>
            <button
              onClick={() => setBackgroundAudio(!backgroundAudio)}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                backgroundAudio ? 'bg-rose-600' : 'bg-slate-400'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  backgroundAudio ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ─── 4. FAVORITE ARTISTS MANAGER ─────────────────────────────── */}
      {favoriteArtists.length > 0 && (
        <div className="rounded-3xl theme-bg-card border theme-border p-6 md:p-8 flex flex-col gap-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b theme-border">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
                <FaHeart className="text-lg" />
              </div>
              <div>
                <h2 className="text-lg font-bold theme-text-main">Favorite Artists ({favoriteArtists.length})</h2>
                <p className="text-xs theme-text-muted">Artists you are currently following</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {favoriteArtists.map((artist, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-500/5 border theme-border"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={artist.image}
                    alt={artist.name}
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                  <span className="text-xs font-semibold theme-text-main truncate">
                    {artist.name}
                  </span>
                </div>
                <button
                  onClick={() => dispatch(toggleFavoriteArtist(artist))}
                  className="text-rose-500 hover:text-slate-400 p-1"
                  title="Unfollow"
                >
                  <FaHeart className="text-xs" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
