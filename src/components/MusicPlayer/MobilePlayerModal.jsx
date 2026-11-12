import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  nextSong,
  prevSong,
  togglePlayPauseNow,
  toggleRepeat,
  toggleShuffle,
  toggleFavorite,
  toggleMobilePlayer,
  openAddToPlaylistModal,
  setIsEqualizerModalOpen,
} from '../../redux/features/playerSlice';
import { playerEngine } from '../../services/playerEngine';
import {
  FaPlay,
  FaPause,
  FaStepForward,
  FaStepBackward,
  FaRandom,
  FaRedo,
  FaHeart,
  FaRegHeart,
  FaArrowLeft,
  FaListUl,
  FaDownload,
  FaCheck,
  FaFolderPlus,
  FaMicrophoneAlt,
  FaSlidersH,
} from 'react-icons/fa';
import SyncedLyrics from '../SyncedLyrics';
import { saveTrackOffline, getOfflineTrack } from '../../services/offlineStorage';

const formatTime = (secs) => {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const MobilePlayerModal = ({ onOpenQueue }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleArtistClick = (artistName, e) => {
    e?.stopPropagation?.();
    if (!artistName) return;
    dispatch(toggleMobilePlayer());
    const clean = artistName.trim();
    navigate(`/artists/${encodeURIComponent(clean)}?name=${encodeURIComponent(clean)}`);
  };

  const renderArtistLinks = (artistString, customClass = '') => {
    if (!artistString) return null;
    const parts = artistString.split(/,\s*|\s+&\s+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return <span>{artistString}</span>;
    return (
      <span>
        {parts.map((art, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="text-white/60">, </span>}
            <span
              onClick={(e) => handleArtistClick(art, e)}
              className={`hover:underline cursor-pointer transition-colors ${customClass}`}
              title={`View all songs by ${art}`}
            >
              {art}
            </span>
          </React.Fragment>
        ))}
      </span>
    );
  };
  const {
    activeSong,
    isPlaying,
    currentTime,
    duration,
    repeatMode,
    shuffle,
    favorites,
    isMobilePlayerOpen,
  } = useSelector((state) => state.player);

  const [activeTab, setActiveTab] = useState('art'); // 'art' | 'lyrics'
  const [downloadStatus, setDownloadStatus] = useState('idle');

  // Handle mobile phone physical/gesture Back button via history popstate
  useEffect(() => {
    if (!isMobilePlayerOpen) return;

    // Push history entry so phone Back button closes the player modal
    window.history.pushState({ modal: 'mobile-player' }, '');

    const handlePopState = () => {
      dispatch(toggleMobilePlayer(false));
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isMobilePlayerOpen, dispatch]);

  const handleClose = () => {
    if (window.history.state?.modal === 'mobile-player') {
      window.history.back();
    } else {
      dispatch(toggleMobilePlayer(false));
    }
  };

  if (!isMobilePlayerOpen || !activeSong) return null;

  const isFav = favorites.some((f) => f.videoId === activeSong?.videoId);

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    playerEngine.seekTo(time);
  };

  const handleTogglePlay = () => {
    dispatch(togglePlayPauseNow());
  };

  const handleDownload = async () => {
    if (downloadStatus === 'downloaded' || downloadStatus === 'downloading') return;
    setDownloadStatus('downloading');
    try {
      await saveTrackOffline(activeSong);
      setDownloadStatus('downloaded');
    } catch (e) {
      setDownloadStatus('idle');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white animate-slide-up select-none overflow-hidden"
    >
      {/* Full-Screen Song Poster Background (Edge-to-Edge) */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <img
          src={activeSong.thumbnail}
          alt={activeSong.title}
          className={`w-full h-full object-cover object-center transition-transform duration-1000 ${
            isPlaying ? 'scale-105' : 'scale-100'
          }`}
          onError={(e) => {
            if (activeSong.videoId) {
              e.currentTarget.src = `https://i.ytimg.com/vi/${activeSong.videoId}/hqdefault.jpg`;
            }
          }}
        />
        {/* Cinematic gradient overlay ensuring top header and bottom controls are crystal clear */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/25 to-black/90" />
      </div>

      {/* Top Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-1 shrink-0">
        {/* Prominent Back Button */}
        <button
          onClick={handleClose}
          className="flex items-center gap-1.5 px-3 py-1.5 -ml-1 rounded-full text-white/90 bg-black/40 backdrop-blur-md hover:bg-black/60 active:scale-95 transition-all border border-white/15 shadow-lg"
          title="Back"
          aria-label="Back"
        >
          <FaArrowLeft className="text-sm text-rose-400" />
          <span className="text-xs font-bold text-rose-400">Back</span>
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400 drop-shadow-md">
            Now Playing
          </span>
          <span className="text-xs font-medium text-white/90 truncate max-w-[170px] drop-shadow-sm">
            {activeSong.artist}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => dispatch(setIsEqualizerModalOpen(true))}
            className="p-2 rounded-full text-white/90 hover:text-white bg-black/40 backdrop-blur-md border border-white/15 active:scale-95 transition-all shadow-lg"
            title="Spotify Pro Equalizer"
          >
            <FaSlidersH className="text-sm text-rose-400" />
          </button>

          <button
            onClick={() => {
              handleClose();
              if (onOpenQueue) onOpenQueue();
            }}
            className="p-2 -mr-1 rounded-full text-white/90 hover:text-white bg-black/40 backdrop-blur-md border border-white/15 active:scale-95 transition-all shadow-lg"
            title="Queue"
          >
            <FaListUl className="text-base" />
          </button>
        </div>
      </div>

      {/* Switcher Pill: Poster View vs Live Lyrics */}
      <div className="flex justify-center my-1.5 shrink-0">
        <div className="flex items-center p-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 shadow-xl">
          <button
            onClick={() => setActiveTab('art')}
            className={`px-4 py-1 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'art'
                ? 'bg-rose-600 text-white shadow-lg'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Poster View
          </button>
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'lyrics'
                ? 'bg-rose-600 text-white shadow-lg'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <FaMicrophoneAlt className="text-xs" />
            <span>Live Lyrics</span>
          </button>
        </div>
      </div>

      {/* Main Center Area: Open Full Screen Poster Canvas */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 min-h-0">
        <div className="flex-1 w-full" />
      </div>

      {/* Button to View Lyrics (Visible in Poster View) */}
      {activeTab !== 'lyrics' && (
        <button
          type="button"
          onClick={() => setActiveTab('lyrics')}
          className="flex items-center justify-center gap-2 py-2 px-5 mx-auto mb-2.5 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all shrink-0 cursor-pointer"
        >
          <FaMicrophoneAlt className="text-xs" />
          <span>View Live Lyrics</span>
        </button>
      )}

      {/* Live Lyrics View (Button Triggered Only) */}
      {activeTab === 'lyrics' && (
        <div className="absolute inset-x-0 bottom-0 top-14 z-40 flex flex-col rounded-t-3xl bg-[#0e0e12] border-t border-white/15 shadow-2xl overflow-hidden animate-fade-in">
          <div className="flex-1 overflow-hidden">
            <SyncedLyrics onClose={() => setActiveTab('art')} />
          </div>
        </div>
      )}

      {/* Track Info & Action Buttons (Shifted upwards) */}
      <div className="px-6 pt-1 pb-1 flex items-center justify-between shrink-0">
        <div className="flex flex-col min-w-0 pr-4">
          <h2 className="text-xl sm:text-2xl font-black text-white truncate drop-shadow-lg">
            {activeSong.title}
          </h2>
          <div className="text-sm font-semibold text-white/80 truncate mt-0.5 drop-shadow-sm">
            {renderArtistLinks(activeSong.artist, 'text-rose-400 hover:text-white')}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Add to playlist */}
          <button
            onClick={() => dispatch(openAddToPlaylistModal(activeSong))}
            className="p-2.5 rounded-full text-white/90 hover:text-rose-400 bg-black/30 backdrop-blur-md border border-white/10 active:scale-95 transition-all shadow-md"
            title="Add to Playlist"
          >
            <FaFolderPlus className="text-lg" />
          </button>

          {/* Offline Download */}
          <button
            onClick={handleDownload}
            className={`p-2.5 rounded-full active:scale-95 transition-all bg-black/30 backdrop-blur-md border border-white/10 shadow-md ${
              downloadStatus === 'downloaded' ? 'text-emerald-400' : 'text-white/90 hover:text-rose-400'
            }`}
            title="Download Offline"
          >
            {downloadStatus === 'downloaded' ? <FaCheck className="text-base" /> : <FaDownload className="text-base" />}
          </button>

          {/* Like */}
          <button
            onClick={() => dispatch(toggleFavorite(activeSong))}
            className={`p-2.5 rounded-full transition-transform active:scale-125 bg-black/30 backdrop-blur-md border border-white/10 shadow-md ${
              isFav ? 'text-rose-500' : 'text-white/90 hover:text-white'
            }`}
          >
            {isFav ? <FaHeart className="text-xl" /> : <FaRegHeart className="text-xl" />}
          </button>
        </div>
      </div>

      {/* Seekbar (Shifted upwards) */}
      <div className="px-6 py-1 shrink-0">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime || 0}
          onChange={handleSeek}
          className="progress-slider w-full"
          style={{
            background: `linear-gradient(to right, #f43f5e ${
              duration > 0 ? (currentTime / duration) * 100 : 0
            }%, rgba(255, 255, 255, 0.25) ${
              duration > 0 ? (currentTime / duration) * 100 : 0
            }%)`,
          }}
        />
        <div className="flex justify-between items-center text-xs font-mono text-white/60 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Playback Controls (Shifted upwards with generous bottom clearance) */}
      <div className="flex items-center justify-between px-6 pt-2 pb-14 sm:pb-16 shrink-0">
        {/* Shuffle Button with active indicator */}
        <button
          onClick={() => dispatch(toggleShuffle())}
          className={`relative p-3 rounded-full transition-colors ${
            shuffle ? 'text-rose-500 font-bold' : 'text-white/70 hover:text-white'
          }`}
          title="Shuffle"
        >
          <FaRandom className="text-lg" />
          {shuffle && (
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-rose-500" />
          )}
        </button>

        {/* Previous */}
        <button
          onClick={() => {
            playerEngine.unlockAudio();
            dispatch(prevSong());
          }}
          className="p-3 text-white hover:text-rose-400 transition-transform active:scale-90"
        >
          <FaStepBackward className="text-2xl" />
        </button>

        {/* Play/Pause Main Button */}
        <button
          onClick={handleTogglePlay}
          className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-2xl shadow-rose-600/50 transition-transform active:scale-95"
        >
          {isPlaying ? (
            <FaPause className="text-2xl" />
          ) : (
            <FaPlay className="text-2xl translate-x-0.5" />
          )}
        </button>

        {/* Next */}
        <button
          onClick={() => {
            playerEngine.unlockAudio();
            dispatch(nextSong());
          }}
          className="p-3 text-white hover:text-rose-400 transition-transform active:scale-90"
        >
          <FaStepForward className="text-2xl" />
        </button>

        {/* Repeat */}
        <button
          onClick={() => dispatch(toggleRepeat())}
          className={`relative p-3 rounded-full transition-colors ${
            repeatMode !== 'off' ? 'text-rose-500' : 'text-white/70 hover:text-white'
          }`}
        >
          <FaRedo className="text-lg" />
          {repeatMode === 'one' && (
            <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-rose-500 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center">
              1
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default MobilePlayerModal;
