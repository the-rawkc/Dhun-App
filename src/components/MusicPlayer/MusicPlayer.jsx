import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  playPause,
  nextSong,
  prevSong,
  setCurrentTime,
  setDuration,
  setVolume,
  toggleMute,
  toggleRepeat,
  toggleShuffle,
  toggleFavorite,
  toggleMobilePlayer,
  toggleLyrics,
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
  FaVolumeUp,
  FaVolumeMute,
  FaListUl,
  FaDownload,
  FaCheck,
  FaFolderPlus,
  FaMicrophoneAlt,
  FaSlidersH,
} from 'react-icons/fa';
import SyncedLyrics from '../SyncedLyrics';
import QueueDrawer from '../QueueDrawer';
import MobilePlayerModal from './MobilePlayerModal';
import { saveTrackOffline, getOfflineTrack } from '../../services/offlineStorage';

const formatTime = (secs) => {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const MusicPlayer = () => {
  const dispatch = useDispatch();
  const {
    activeSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    shuffle,
    favorites,
    showLyrics,
  } = useSelector((state) => state.player);

  const [queueOpen, setQueueOpen] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('idle');

  // Hook up PlayerEngine listeners
  useEffect(() => {
    playerEngine.setListeners({
      onTimeUpdate: (time) => dispatch(setCurrentTime(time)),
      onDurationChange: (dur) => dispatch(setDuration(dur)),
      onStateChange: (playing) => dispatch(playPause(playing)),
      onEnded: () => dispatch(nextSong()),
      onNext: () => dispatch(nextSong()),
      onPrev: () => dispatch(prevSong()),
    });
  }, [dispatch]);

  // Load new song when activeSong changes
  useEffect(() => {
    if (activeSong?.videoId) {
      playerEngine.loadVideo(activeSong.videoId, true, activeSong);

      // Check if downloaded offline
      getOfflineTrack(activeSong.videoId).then((item) => {
        setDownloadStatus(item ? 'downloaded' : 'idle');
      });
    }
  }, [activeSong?.videoId]);

  // Sync volume & mute to engine
  useEffect(() => {
    playerEngine.setVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  if (!activeSong) return null;

  const isFav = favorites.some((f) => f.videoId === activeSong.videoId);

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    playerEngine.seekTo(time);
  };

  const handlePlayPause = () => {
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
    <>
      {/* ─── Desktop Bottom Player Bar ───────────────────────────────── */}
      <div className="hidden lg:flex fixed bottom-0 left-0 right-0 h-24 theme-bg-main/95 backdrop-blur-2xl border-t theme-border px-6 items-center justify-between z-40 select-none shadow-2xl">
        {/* Left: Track Information */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-[220px]">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-dark-800 shadow-md shrink-0 border theme-border">
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
                  : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=60';
              }}
            />
          </div>

          <div className="flex flex-col min-w-0 pr-1">
            <h4 className="text-sm font-semibold theme-text-main truncate hover:text-rose-500 cursor-pointer">
              {activeSong.title}
            </h4>
            <p className="text-xs theme-text-muted truncate mt-0.5 hover:underline cursor-pointer">
              {activeSong.artist}
            </p>
          </div>

          <div className="flex items-center gap-1">
            {/* Like */}
            <button
              onClick={() => dispatch(toggleFavorite(activeSong))}
              className={`p-1.5 rounded-full transition-transform active:scale-125 ${
                isFav ? 'text-rose-600' : 'theme-text-muted hover:theme-text-main'
              }`}
              title={isFav ? 'Liked' : 'Like'}
            >
              {isFav ? <FaHeart className="text-base" /> : <FaRegHeart className="text-base" />}
            </button>

            {/* Offline Download */}
            <button
              onClick={handleDownload}
              className={`p-1.5 rounded-full transition-all ${
                downloadStatus === 'downloaded'
                  ? 'text-emerald-500'
                  : downloadStatus === 'downloading'
                  ? 'text-rose-500 animate-spin'
                  : 'theme-text-muted hover:text-rose-500'
              }`}
              title="Download Offline"
            >
              {downloadStatus === 'downloaded' ? (
                <FaCheck className="text-xs" />
              ) : (
                <FaDownload className="text-xs" />
              )}
            </button>

            {/* Add to Playlist */}
            <button
              onClick={() => dispatch(openAddToPlaylistModal(activeSong))}
              className="p-1.5 rounded-full theme-text-muted hover:text-rose-500"
              title="Add to Playlist"
            >
              <FaFolderPlus className="text-sm" />
            </button>
          </div>
        </div>

        {/* Center: Playback Controls & Seekbar */}
        <div className="flex flex-col items-center max-w-xl w-2/4 px-4">
          <div className="flex items-center gap-5 mb-1.5">
            {/* Shuffle */}
            <button
              onClick={() => dispatch(toggleShuffle())}
              className={`relative p-1.5 transition-colors ${
                shuffle ? 'text-rose-600 font-bold' : 'theme-text-muted hover:theme-text-main'
              }`}
              title={shuffle ? 'Shuffle is On' : 'Shuffle is Off'}
            >
              <FaRandom className="text-sm" />
              {shuffle && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-rose-600" />
              )}
            </button>

            {/* Prev */}
            <button
              onClick={() => {
                dispatch(prevSong());
                playerEngine.seekTo(0);
              }}
              className="theme-text-main hover:text-rose-600 transition-transform active:scale-90"
              title="Previous"
            >
              <FaStepBackward className="text-base" />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={handlePlayPause}
              className="w-11 h-11 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <FaPause className="text-sm" />
              ) : (
                <FaPlay className="text-sm translate-x-0.5" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={() => {
                dispatch(nextSong());
                playerEngine.seekTo(0);
              }}
              className="theme-text-main hover:text-rose-600 transition-transform active:scale-90"
              title="Next"
            >
              <FaStepForward className="text-base" />
            </button>

            {/* Repeat */}
            <button
              onClick={() => dispatch(toggleRepeat())}
              className={`relative p-1.5 transition-colors ${
                repeatMode !== 'off' ? 'text-rose-600' : 'theme-text-muted hover:theme-text-main'
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              <FaRedo className="text-sm" />
              {repeatMode === 'one' && (
                <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-rose-600 text-white w-3 h-3 rounded-full flex items-center justify-center">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Seekbar & Time */}
          <div className="flex items-center gap-3 w-full">
            <span className="text-[11px] font-mono theme-text-muted min-w-[35px] text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime || 0}
              onChange={handleSeek}
              className="progress-slider flex-1"
              style={{
                background: `linear-gradient(to right, #e11d48 ${
                  duration > 0 ? (currentTime / duration) * 100 : 0
                }%, rgba(148, 163, 184, 0.2) ${
                  duration > 0 ? (currentTime / duration) * 100 : 0
                }%)`,
              }}
            />
            <span className="text-[11px] font-mono theme-text-muted min-w-[35px]">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right: Lyrics, Volume, Queue */}
        <div className="flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
          {/* Lyrics Button */}
          <button
            onClick={() => dispatch(toggleLyrics())}
            className={`p-2 rounded-xl transition-all ${
              showLyrics
                ? 'bg-rose-500/20 text-rose-500 shadow-sm'
                : 'theme-text-muted hover:theme-text-main hover:bg-slate-500/10'
            }`}
            title="Live Synced Lyrics"
          >
            <FaMicrophoneAlt className="text-base" />
          </button>

          {/* Sound Quality & Equalizer Button */}
          <button
            onClick={() => dispatch(setIsEqualizerModalOpen(true))}
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all flex items-center gap-1.5"
            title="Sound Quality & Equalizer"
          >
            <FaSlidersH className="text-sm" />
            <span className="hidden xl:inline text-[9px] font-black tracking-wider uppercase bg-rose-500/20 text-rose-500 px-1.5 py-0.5 rounded-md">
              PRO SOUND
            </span>
          </button>

          {/* Queue Button */}
          <button
            onClick={() => setQueueOpen(true)}
            className="p-2 rounded-xl theme-text-muted hover:theme-text-main hover:bg-slate-500/10 transition-all"
            title="Queue"
          >
            <FaListUl className="text-sm" />
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => dispatch(toggleMute())}
              className="theme-text-muted hover:theme-text-main p-1"
            >
              {isMuted || volume === 0 ? (
                <FaVolumeMute className="text-sm text-rose-500" />
              ) : (
                <FaVolumeUp className="text-sm" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => dispatch(setVolume(parseFloat(e.target.value)))}
              className="w-20 h-1 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* ─── Mobile Mini-Player Bar ──────────────────────────────────── */}
      <div
        onClick={() => dispatch(toggleMobilePlayer(true))}
        className="lg:hidden fixed bottom-[56px] left-2 right-2 h-16 theme-bg-card/95 backdrop-blur-xl border theme-border rounded-2xl px-3 flex items-center justify-between z-30 shadow-2xl cursor-pointer select-none"
      >
        {/* Tiny top progress line */}
        <div className="absolute top-0 left-3 right-3 h-[2px] bg-slate-500/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-rose-600 transition-all duration-300"
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          />
        </div>

        {/* Thumbnail + Title/Artist */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <img
            src={activeSong.thumbnail}
            alt={activeSong.title}
            className="w-11 h-11 rounded-xl object-cover bg-dark-800 shadow shrink-0"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = activeSong.videoId
                ? `https://i.ytimg.com/vi/${activeSong.videoId}/hqdefault.jpg`
                : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=60';
            }}
          />
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-xs font-semibold theme-text-main truncate">
              {activeSong.title}
            </span>
            <span className="text-[11px] theme-text-muted truncate mt-0.5">
              {activeSong.artist}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => dispatch(toggleFavorite(activeSong))}
            className={`p-2 text-base ${isFav ? 'text-rose-600' : 'theme-text-muted'}`}
            title={isFav ? 'Liked' : 'Like'}
          >
            {isFav ? <FaHeart /> : <FaRegHeart />}
          </button>

          {/* Previous Song Button */}
          <button
            onClick={() => {
              dispatch(prevSong());
              playerEngine.seekTo(0);
            }}
            className="p-2 theme-text-main hover:text-rose-600 active:scale-90 transition-transform"
            title="Previous"
          >
            <FaStepBackward className="text-sm" />
          </button>

          {/* Play / Pause Button */}
          <button
            onClick={handlePlayPause}
            className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md shadow-rose-600/30 active:scale-95 transition-all"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <FaPause className="text-xs" />
            ) : (
              <FaPlay className="text-xs translate-x-0.5" />
            )}
          </button>

          {/* Next Song Button */}
          <button
            onClick={() => {
              dispatch(nextSong());
              playerEngine.seekTo(0);
            }}
            className="p-2 theme-text-main hover:text-rose-600 active:scale-90 transition-transform"
            title="Next"
          >
            <FaStepForward className="text-sm" />
          </button>
        </div>
      </div>

      {/* ─── Desktop Synced Lyrics Drawer ─────────────────────────────── */}
      {showLyrics && (
        <div className="hidden lg:block fixed top-0 right-0 bottom-24 w-[480px] z-30 shadow-2xl animate-fade-in border-l theme-border">
          <SyncedLyrics onClose={() => dispatch(toggleLyrics(false))} />
        </div>
      )}

      {/* ─── Queue Drawer ────────────────────────────────────────────── */}
      <QueueDrawer isOpen={queueOpen} onClose={() => setQueueOpen(false)} />

      {/* ─── Full-Screen Mobile Sheet ────────────────────────────────── */}
      <MobilePlayerModal onOpenQueue={() => setQueueOpen(true)} />
    </>
  );
};

export default MusicPlayer;
