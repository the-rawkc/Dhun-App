import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  nextSong,
  prevSong,
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
  FaChevronDown,
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
    if (isPlaying) {
      playerEngine.pause();
    } else {
      playerEngine.play();
    }
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
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white animate-slide-up select-none overflow-hidden">
      {/* Full-Page Song Poster Ambient Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <img
          src={activeSong.thumbnail}
          alt=""
          className="w-full h-full object-cover filter blur-3xl scale-125 opacity-40 transition-all duration-700"
          onError={(e) => {
            if (activeSong.videoId) {
              e.currentTarget.src = `https://i.ytimg.com/vi/${activeSong.videoId}/hqdefault.jpg`;
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-black/95" />
      </div>

      {/* Top Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-1 shrink-0">
        {/* Prominent Back Button */}
        <button
          onClick={handleClose}
          className="flex items-center gap-1.5 px-3 py-1.5 -ml-1 rounded-full text-white/90 bg-white/10 backdrop-blur-md hover:bg-white/20 active:scale-95 transition-all border border-white/10"
          title="Back"
          aria-label="Back"
        >
          <FaArrowLeft className="text-sm text-rose-400" />
          <span className="text-xs font-bold text-rose-400">Back</span>
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400">
            Now Playing
          </span>
          <span className="text-xs font-medium text-white/70 truncate max-w-[170px]">
            {activeSong.artist}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => dispatch(setIsEqualizerModalOpen(true))}
            className="p-2 rounded-full text-white/80 hover:text-white bg-white/10 backdrop-blur-md border border-white/10 active:scale-95 transition-all"
            title="Spotify Pro Equalizer"
          >
            <FaSlidersH className="text-sm text-rose-400" />
          </button>

          <button
            onClick={() => {
              handleClose();
              if (onOpenQueue) onOpenQueue();
            }}
            className="p-2 -mr-1 rounded-full text-white/80 hover:text-white bg-white/10 backdrop-blur-md border border-white/10 active:scale-95 transition-all"
            title="Queue"
          >
            <FaListUl className="text-base" />
          </button>
        </div>
      </div>

      {/* Switcher Pill: Art vs Lyrics */}
      <div className="flex justify-center my-1.5 shrink-0">
        <div className="flex items-center p-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 shadow-inner">
          <button
            onClick={() => setActiveTab('art')}
            className={`px-4 py-1 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'art'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Artwork
          </button>
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'lyrics'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <FaMicrophoneAlt className="text-xs" />
            <span>Live Lyrics</span>
          </button>
        </div>
      </div>

      {/* Main Visual Center: Either Big Artwork or Synced Lyrics */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-2 min-h-0">
        {activeTab === 'art' ? (
          <div className="relative w-[70vw] max-w-[270px] sm:max-w-[300px] aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-black/80 border border-white/15">
            <img
              src={activeSong.thumbnail}
              alt={activeSong.title}
              className={`w-full h-full object-cover transition-transform duration-700 ${
                isPlaying ? 'scale-105' : 'scale-100'
              }`}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = activeSong.videoId
                  ? `https://i.ytimg.com/vi/${activeSong.videoId}/hqdefault.jpg`
                  : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
              }}
            />
          </div>
        ) : (
          <div className="w-full h-full rounded-2xl overflow-hidden backdrop-blur-md bg-black/40 p-2 border border-white/10">
            <SyncedLyrics />
          </div>
        )}
      </div>

      {/* Track Info & Action Buttons (Shifted upwards) */}
      <div className="px-6 pt-1 pb-1 flex items-center justify-between shrink-0">
        <div className="flex flex-col min-w-0 pr-4">
          <h2 className="text-xl font-bold text-white truncate drop-shadow-sm">{activeSong.title}</h2>
          <p className="text-sm text-white/70 truncate mt-0.5">{activeSong.artist}</p>
        </div>
        <div className="flex items-center gap-1">
          {/* Add to playlist */}
          <button
            onClick={() => dispatch(openAddToPlaylistModal(activeSong))}
            className="p-2 rounded-full text-white/80 hover:text-rose-400 active:scale-95 transition-all"
            title="Add to Playlist"
          >
            <FaFolderPlus className="text-lg" />
          </button>

          {/* Offline Download */}
          <button
            onClick={handleDownload}
            className={`p-2 rounded-full active:scale-95 transition-all ${
              downloadStatus === 'downloaded' ? 'text-emerald-400' : 'text-white/80 hover:text-rose-400'
            }`}
            title="Download Offline"
          >
            {downloadStatus === 'downloaded' ? <FaCheck className="text-base" /> : <FaDownload className="text-base" />}
          </button>

          {/* Like */}
          <button
            onClick={() => dispatch(toggleFavorite(activeSong))}
            className={`p-2 rounded-full transition-transform active:scale-125 ${
              isFav ? 'text-rose-500' : 'text-white/80 hover:text-white'
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
            dispatch(prevSong());
            playerEngine.seekTo(0);
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
            dispatch(nextSong());
            playerEngine.seekTo(0);
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
