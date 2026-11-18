import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setThemeMode,
  setIsEqualizerModalOpen,
  setAudioQuality as setAudioQualityRedux,
  setCrossfadeStyle,
} from '../redux/features/playerSlice';
import { audioDSP } from '../services/audioDsp';
import { playerEngine } from '../services/playerEngine';
import {
  getOfflineStorageUsage,
  clearAllOfflineTracks,
} from '../services/offlineStorage';
import {
  FaPalette,
  FaDownload,
  FaTrashAlt,
  FaMusic,
  FaCheck,
  FaSlidersH,
  FaMoon,
  FaSun,
} from 'react-icons/fa';

const Settings = () => {
  const dispatch = useDispatch();
  const { themeMode, crossfadeStyle = 'smart' } = useSelector((state) => state.player);

  // Storage State
  const [storageUsage, setStorageUsage] = useState({ count: 0, megabytes: '0.0' });
  const [storageCleared, setStorageCleared] = useState(false);

  // Audio Quality & Background Audio Settings
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
    <div className="flex flex-col gap-6 sm:gap-8 pb-32 px-3 sm:px-6 select-none animate-fade-in max-w-4xl mx-auto w-full overflow-hidden">
      {/* Settings Header */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-3 sm:p-3.5 rounded-2xl bg-rose-600/15 text-rose-500 shrink-0">
          <FaSlidersH className="text-xl sm:text-2xl" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold theme-text-main truncate">App Settings</h1>
          <p className="text-xs theme-text-muted mt-0.5 leading-relaxed">
            Customize your theme, sound quality, offline downloads, and playback transitions
          </p>
        </div>
      </div>

      {/* ─── 1. THEME SELECTION SECTION ───────────────────────────────── */}
      <div className="rounded-2xl sm:rounded-3xl theme-bg-card border theme-border p-4 sm:p-6 md:p-8 flex flex-col gap-5 shadow-xl w-full min-w-0">
        <div className="flex items-center gap-3 pb-3 sm:pb-4 border-b theme-border min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
            <FaPalette className="text-base sm:text-lg" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold theme-text-main truncate">App Theme</h2>
            <p className="text-xs theme-text-muted truncate">Select your preferred color profile</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Dark Mode (Black & Red) */}
          <div
            onClick={() => dispatch(setThemeMode('dark'))}
            className={`p-4 sm:p-5 rounded-2xl cursor-pointer border transition-all flex items-center justify-between gap-3 min-w-0 ${
              themeMode === 'dark'
                ? 'bg-black border-rose-500 shadow-xl shadow-rose-500/20'
                : 'bg-black/50 border-white/10 hover:border-white/30'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shrink-0">
                <FaMoon className="text-base sm:text-lg" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs sm:text-sm text-white truncate">Dark Mode (Red & Black)</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">Deep obsidian with radiant ruby red</p>
              </div>
            </div>
            {themeMode === 'dark' && (
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-600 flex items-center justify-center text-white text-[10px] sm:text-xs shrink-0">
                <FaCheck />
              </div>
            )}
          </div>

          {/* Light Mode (White & Red) */}
          <div
            onClick={() => dispatch(setThemeMode('light'))}
            className={`p-4 sm:p-5 rounded-2xl cursor-pointer border transition-all flex items-center justify-between gap-3 min-w-0 ${
              themeMode === 'light'
                ? 'bg-white border-rose-600 shadow-xl shadow-rose-600/20 text-slate-900'
                : 'bg-white/80 border-slate-300 hover:border-slate-400 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shrink-0">
                <FaSun className="text-base sm:text-lg" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">Light Mode (White & Red)</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate">Crisp white with vibrant crimson accents</p>
              </div>
            </div>
            {themeMode === 'light' && (
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-600 flex items-center justify-center text-white text-[10px] sm:text-xs shrink-0">
                <FaCheck />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. OFFLINE STORAGE & DOWNLOADS ──────────────────────────── */}
      <div className="rounded-2xl sm:rounded-3xl theme-bg-card border theme-border p-4 sm:p-6 md:p-8 flex flex-col gap-5 shadow-xl w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b theme-border min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 sm:p-2.5 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
              <FaDownload className="text-base sm:text-lg" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold theme-text-main truncate">Offline Downloads Storage</h2>
              <p className="text-xs theme-text-muted truncate">Manage tracks downloaded directly onto this device</p>
            </div>
          </div>
          {storageUsage.count > 0 && (
            <button
              onClick={handleClearOffline}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shrink-0 w-full sm:w-auto"
            >
              <FaTrashAlt />
              <span>Clear All Downloads</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-500/5 border theme-border min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-rose-500">{storageUsage.count}</span>
              <span className="text-sm font-semibold theme-text-main">Offline Songs Stored</span>
            </div>
            <p className="text-xs theme-text-muted mt-1 leading-relaxed">
              Using approx. <strong className="theme-text-main">{storageUsage.megabytes} MB</strong> of local storage. Playable with zero internet connection!
            </p>
          </div>

          {storageCleared && (
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500 text-xs font-bold shrink-0">
              Storage Cleared!
            </span>
          )}
        </div>
      </div>

      {/* ─── 3. PLAYBACK & AUDIO QUALITY ─────────────────────────────── */}
      <div className="rounded-2xl sm:rounded-3xl theme-bg-card border theme-border p-4 sm:p-6 md:p-8 flex flex-col gap-5 shadow-xl w-full min-w-0">
        <div className="flex items-center gap-3 pb-3 sm:pb-4 border-b theme-border min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
            <FaMusic className="text-base sm:text-lg" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold theme-text-main truncate">Sound Quality & Playback</h2>
            <p className="text-xs theme-text-muted truncate">Adjust how your music sounds and transitions</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Sound & Equalizer Settings */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 shrink-0">
                <FaSlidersH className="text-base" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold theme-text-main">Sound Equalizer & Bass</h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500 text-white shrink-0">
                    PRO
                  </span>
                </div>
                <p className="text-xs theme-text-muted mt-0.5 leading-relaxed">
                  Tune bass, vocals, and 3D sound effects to match your earphones
                </p>
              </div>
            </div>
            <button
              onClick={() => dispatch(setIsEqualizerModalOpen(true))}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all shrink-0 flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <FaSlidersH className="text-xs" />
              <span>Customize Sound</span>
            </button>
          </div>

          {/* Music Sound Quality Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t theme-border min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-sm font-semibold theme-text-main">Music Sound Quality</span>
              <p className="text-xs theme-text-muted mt-0.5">Choose your preferred streaming clarity</p>
            </div>
            <select
              value={audioQuality}
              onChange={(e) => {
                const val = e.target.value;
                setAudioQuality(val);
                dispatch(setAudioQualityRedux(val));
                audioDSP.setBitrate(val);
              }}
              className="w-full sm:w-auto max-w-full px-3.5 py-2.5 rounded-xl bg-slate-500/10 border theme-border theme-text-main text-xs font-semibold focus:outline-none focus:border-rose-500 truncate"
            >
              <option value="320">Very High (Best Quality - Like Spotify Pro)</option>
              <option value="256">High Quality (Balanced)</option>
              <option value="128">Normal Quality (Saves Mobile Data)</option>
            </select>
          </div>

          {/* Song Transition Style (Apple Music Automix) Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t theme-border min-w-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold theme-text-main">Song Transition Style</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500 text-white shrink-0">
                  Apple Music Automix
                </span>
              </div>
              <p className="text-xs theme-text-muted mt-0.5 leading-relaxed">
                Next song starts gently before the last song ends without audio gaps or overlapping lyrics
              </p>
            </div>
            <select
              value={crossfadeStyle}
              onChange={(e) => {
                const val = e.target.value;
                const secondsMap = { smart: 4, smooth: 6, long: 8, off: 0 };
                const sec = secondsMap[val] !== undefined ? secondsMap[val] : 4;
                try {
                  playerEngine.setCrossfadeSeconds(sec, val);
                } catch (err) {}
                dispatch(setCrossfadeStyle(val));
              }}
              className="w-full sm:w-auto max-w-full px-3.5 py-2.5 rounded-xl bg-slate-500/10 border theme-border theme-text-main text-xs font-semibold focus:outline-none focus:border-rose-500 truncate"
            >
              <option value="smart">Smart Automix (Apple Music Style - 4s)</option>
              <option value="smooth">Smooth Crossfade (6s)</option>
              <option value="long">Extended Blend (8s)</option>
              <option value="off">Off (Standard Gapless)</option>
            </select>
          </div>

          {/* Background Audio Toggle */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t theme-border min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-sm font-semibold theme-text-main">Play with Screen Turned Off</span>
              <p className="text-xs theme-text-muted mt-0.5 leading-relaxed">
                Keeps music playing in the background or when your phone is locked
              </p>
            </div>
            <button
              onClick={() => setBackgroundAudio(!backgroundAudio)}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
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
    </div>
  );
};

export default Settings;
