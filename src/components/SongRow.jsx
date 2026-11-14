import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  playSong,
  playTrackNow,
  togglePlayPauseNow,
  toggleFavorite,
  addToQueue,
  openAddToPlaylistModal,
} from '../redux/features/playerSlice';
import {
  FaPlay,
  FaPause,
  FaHeart,
  FaRegHeart,
  FaDownload,
  FaCheck,
  FaListUl,
  FaEllipsisV,
  FaPlus,
  FaTrashAlt,
} from 'react-icons/fa';
import { normalizeSong } from '../utils/normalizeSong';
import { saveTrackOffline, getOfflineTrack } from '../services/offlineStorage';
import { playerEngine } from '../services/playerEngine';

const SongRow = ({
  song,
  index,
  songs = [],
  showCover = true,
  isHighlightedLiked = false,
  onRemoveTrack = null,
}) => {
  const dispatch = useDispatch();
  const { activeSong, isPlaying, favorites } = useSelector((state) => state.player);

  const normalized = normalizeSong(song);
  if (!normalized) return null;

  const isCurrent = activeSong?.videoId === normalized.videoId;
  const isFav = favorites.some((f) => f.videoId === normalized.videoId);

  const [downloadStatus, setDownloadStatus] = useState('idle'); // 'idle' | 'downloading' | 'downloaded'
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    if (normalized?.videoId) {
      getOfflineTrack(normalized.videoId).then((item) => {
        if (mounted) setDownloadStatus(item ? 'downloaded' : 'idle');
      });
    } else {
      setDownloadStatus('idle');
    }
    return () => {
      mounted = false;
    };
  }, [normalized?.videoId]);

  // Click outside to close 3-dot menu
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuOpen]);

  const handleRowClick = (e) => {
    e?.stopPropagation?.();
    if (isCurrent) {
      dispatch(togglePlayPauseNow());
    } else {
      dispatch(playTrackNow({ song: normalized, songs, index }));
    }
  };

  const handleFavClick = (e) => {
    e.stopPropagation();
    dispatch(toggleFavorite(normalized));
  };

  const handleAddToPlaylist = (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    dispatch(openAddToPlaylistModal(normalized));
  };

  const handleAddToQueue = (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    dispatch(addToQueue(normalized));
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (downloadStatus === 'downloaded' || downloadStatus === 'downloading') return;

    setDownloadStatus('downloading');
    try {
      await saveTrackOffline(normalized);
      setDownloadStatus('downloaded');
    } catch (err) {
      console.warn('Download error:', err);
      setDownloadStatus('idle');
    }
  };

  return (
    <div
      onClick={handleRowClick}
      className={`group relative flex items-center justify-between px-3 md:px-4 py-2.5 rounded-2xl cursor-pointer select-none transition-all duration-200 border ${
        isCurrent
          ? 'bg-rose-500/10 border-rose-500/30 shadow-sm'
          : isHighlightedLiked
          ? 'bg-rose-500/5 border-rose-500/20'
          : 'border-transparent hover:bg-slate-500/10'
      }`}
    >
      {/* Left section: Rank/Play + Cover + Title/Artist */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
        {/* Index / Play / Equalizer */}
        <div className="w-6 flex items-center justify-center shrink-0">
          {isCurrent && isPlaying ? (
            <button
              type="button"
              onClick={handleRowClick}
              className="flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
              title="Pause"
            >
              <div className="flex items-end gap-0.5 h-4">
                <span className="w-0.5 bg-rose-500 rounded-full animate-equalizer-1" />
                <span className="w-0.5 bg-rose-500 rounded-full animate-equalizer-2" />
                <span className="w-0.5 bg-rose-500 rounded-full animate-equalizer-3" />
              </div>
            </button>
          ) : (
            <>
              <span className="text-xs theme-text-muted font-mono group-hover:hidden">
                {typeof index === 'number' ? index + 1 : '•'}
              </span>
              <button
                type="button"
                className="hidden group-hover:flex theme-text-main hover:text-rose-500"
                onClick={handleRowClick}
                title={isCurrent && isPlaying ? 'Pause' : 'Play'}
              >
                {isCurrent && isPlaying ? (
                  <FaPause className="text-xs" />
                ) : (
                  <FaPlay className="text-xs translate-x-0.5" />
                )}
              </button>
            </>
          )}
        </div>

        {/* Thumbnail */}
        {showCover && (
          <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-dark-800 shrink-0 shadow-sm">
            <img
              src={normalized.thumbnail}
              alt={normalized.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = normalized.videoId
                  ? `https://i.ytimg.com/vi/${normalized.videoId}/hqdefault.jpg`
                  : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=60';
              }}
            />
          </div>
        )}

        {/* Track Title & Artist */}
        <div className="flex flex-col min-w-0 pr-2">
          <span
            className={`text-sm font-semibold truncate ${
              isCurrent ? 'text-rose-500' : 'theme-text-main group-hover:text-rose-500'
            }`}
          >
            {normalized.title}
          </span>
          <span className="text-xs theme-text-muted truncate mt-0.5">
            {normalized.artist}
          </span>
        </div>
      </div>

      {/* Right section: Like heart & 3-Dot Menu */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        {/* Like heart */}
        <button
          onClick={handleFavClick}
          className={`p-2 rounded-full transition-colors ${
            isFav ? 'text-rose-500' : 'theme-text-muted hover:theme-text-main'
          }`}
          title={isFav ? 'Liked' : 'Like'}
        >
          {isFav ? <FaHeart className="text-sm" /> : <FaRegHeart className="text-sm" />}
        </button>

        {/* 3-Dot Options Button */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            className="p-2 rounded-full theme-text-muted hover:text-rose-500 hover:bg-slate-500/10 transition-colors"
            title="Options"
          >
            <FaEllipsisV className="text-xs" />
          </button>

          {/* 3-Dot Dropdown Popup */}
          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-1.5 w-48 py-1.5 rounded-2xl theme-bg-card border theme-border shadow-2xl z-50 animate-fade-in backdrop-blur-xl"
            >
              {/* Download Option */}
              <button
                onClick={handleDownload}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold theme-text-main hover:bg-rose-500/10 hover:text-rose-500 transition-colors text-left"
              >
                {downloadStatus === 'downloaded' ? (
                  <>
                    <FaCheck className="text-emerald-500 text-xs shrink-0" />
                    <span className="text-emerald-500">Downloaded</span>
                  </>
                ) : downloadStatus === 'downloading' ? (
                  <>
                    <FaDownload className="text-rose-500 text-xs shrink-0 animate-spin" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <FaDownload className="text-xs shrink-0" />
                    <span>Download Offline</span>
                  </>
                )}
              </button>

              {/* Add to Playlist Option */}
              <button
                onClick={handleAddToPlaylist}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold theme-text-main hover:bg-rose-500/10 hover:text-rose-500 transition-colors text-left"
              >
                <FaListUl className="text-xs shrink-0" />
                <span>Add to Playlist</span>
              </button>

              {/* Add to Queue Option */}
              <button
                onClick={handleAddToQueue}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold theme-text-main hover:bg-rose-500/10 hover:text-rose-500 transition-colors text-left"
              >
                <FaPlus className="text-xs shrink-0" />
                <span>Add to Queue</span>
              </button>

              {/* Delete / Remove Option (inside 3-dot dropdown list) */}
              {onRemoveTrack && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onRemoveTrack(normalized);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors text-left border-t theme-border"
                >
                  <FaTrashAlt className="text-xs shrink-0" />
                  <span>Delete from Playlist</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SongRow;
