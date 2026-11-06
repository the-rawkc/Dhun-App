import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  playSong,
  playPause,
  toggleFavorite,
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
} from 'react-icons/fa';
import { normalizeSong } from '../utils/normalizeSong';
import { saveTrackOffline, getOfflineTrack } from '../services/offlineStorage';
import { playerEngine } from '../services/playerEngine';

const SongCard = ({ song, songs = [], index = 0 }) => {
  const dispatch = useDispatch();
  const { activeSong, isPlaying, favorites } = useSelector((state) => state.player);

  const normalized = normalizeSong(song);
  if (!normalized) return null;

  const isCurrent = activeSong?.videoId === normalized.videoId;
  const isFav = favorites.some((f) => f.videoId === normalized.videoId);
  const [downloadStatus, setDownloadStatus] = useState('idle');

  useEffect(() => {
    let mounted = true;
    if (normalized.videoId) {
      getOfflineTrack(normalized.videoId).then((item) => {
        if (mounted && item) setDownloadStatus('downloaded');
      });
    }
    return () => {
      mounted = false;
    };
  }, [normalized.videoId]);

  const handlePlayClick = (e) => {
    e.stopPropagation();
    playerEngine.unlockAudio();
    if (isCurrent) {
      dispatch(playPause());
    } else {
      playerEngine.loadVideo(normalized.videoId, true, normalized);
      dispatch(playSong({ song: normalized, songs, index }));
    }
  };

  const handleFavClick = (e) => {
    e.stopPropagation();
    dispatch(toggleFavorite(normalized));
  };

  const handleAddToPlaylist = (e) => {
    e.stopPropagation();
    dispatch(openAddToPlaylistModal(normalized));
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (downloadStatus === 'downloaded' || downloadStatus === 'downloading') return;

    setDownloadStatus('downloading');
    try {
      await saveTrackOffline(normalized);
      setDownloadStatus('downloaded');
    } catch (err) {
      setDownloadStatus('idle');
    }
  };

  return (
    <div
      onClick={handlePlayClick}
      className={`group relative flex flex-col p-2 sm:p-2.5 rounded-xl glass-card cursor-pointer select-none transition-all duration-300 hover:scale-[1.02] ${
        isCurrent ? 'border-rose-500 shadow-lg shadow-rose-500/20' : ''
      }`}
    >
      {/* Thumbnail Container (Compact - 30% smaller) */}
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-dark-800 shadow-sm">
        <img
          src={normalized.thumbnail}
          alt={normalized.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = normalized.videoId
              ? `https://i.ytimg.com/vi/${normalized.videoId}/hqdefault.jpg`
              : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=60';
          }}
        />

        {/* Ambient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Top Action Pills: Like & Add to Playlist */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleAddToPlaylist}
            className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white/80 hover:text-rose-500 hover:scale-110 transition-all"
            title="Add to Playlist"
          >
            <FaListUl className="text-[10px]" />
          </button>

          <button
            onClick={handleDownload}
            className={`p-1.5 rounded-full bg-black/60 backdrop-blur-md transition-all ${
              downloadStatus === 'downloaded'
                ? 'text-emerald-400'
                : 'text-white/80 hover:text-rose-500 hover:scale-110'
            }`}
            title="Download Offline"
          >
            {downloadStatus === 'downloaded' ? (
              <FaCheck className="text-[10px]" />
            ) : (
              <FaDownload className="text-[10px]" />
            )}
          </button>

          <button
            onClick={handleFavClick}
            className={`p-1.5 rounded-full backdrop-blur-md transition-all ${
              isFav
                ? 'bg-rose-600 text-white opacity-100'
                : 'bg-black/60 text-white/80 hover:text-rose-500 hover:scale-110'
            }`}
            title={isFav ? 'Liked' : 'Like'}
          >
            {isFav ? <FaHeart className="text-[10px]" /> : <FaRegHeart className="text-[10px]" />}
          </button>
        </div>

        {/* Play/Pause Button Overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 bg-black/30'
          }`}
        >
          <button
            onClick={handlePlayClick}
            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-transform duration-200 hover:scale-110 ${
              isCurrent
                ? 'bg-rose-600 text-white shadow-rose-600/50 scale-100'
                : 'bg-white text-dark-950 group-hover:scale-105'
            }`}
          >
            {isCurrent && isPlaying ? (
              <FaPause className="text-xs" />
            ) : (
              <FaPlay className="text-xs translate-x-0.5" />
            )}
          </button>
        </div>

        {/* Animated Equalizer when playing */}
        {isCurrent && isPlaying && (
          <div className="absolute bottom-1.5 left-1.5 flex items-end gap-0.5 p-1 rounded bg-black/70 backdrop-blur-md">
            <span className="w-0.5 h-3 bg-rose-500 rounded-full animate-equalizer-1" />
            <span className="w-0.5 h-3 bg-rose-500 rounded-full animate-equalizer-2" />
            <span className="w-0.5 h-3 bg-rose-500 rounded-full animate-equalizer-3" />
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="mt-2 flex flex-col">
        <h4
          className={`font-semibold text-xs truncate transition-colors duration-200 ${
            isCurrent ? 'text-rose-500' : 'theme-text-main group-hover:text-rose-500'
          }`}
          title={normalized.title}
        >
          {normalized.title}
        </h4>
        <p className="text-[10px] theme-text-muted truncate mt-0.5" title={normalized.artist}>
          {normalized.artist && normalized.artist !== 'Unknown Artist' ? normalized.artist : 'Indian Artist'}
        </p>
      </div>
    </div>
  );
};

export default SongCard;
