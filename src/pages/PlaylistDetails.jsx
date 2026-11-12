import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  playSong,
  playTrackNow,
  playPlaylistWithShuffle,
  deletePlaylist,
  removeTrackFromPlaylist,
} from '../redux/features/playerSlice';
import SongRow from '../components/SongRow';
import { FaPlay, FaRandom, FaTrashAlt, FaMusic } from 'react-icons/fa';

const PlaylistDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { playlists } = useSelector((state) => state.player);

  const playlist = playlists.find((p) => p.id === id);

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 theme-text-muted">
        <FaMusic className="text-4xl text-slate-500" />
        <h2 className="text-xl font-bold theme-text-main">Playlist not found</h2>
        <button
          onClick={() => navigate('/library')}
          className="px-5 py-2.5 rounded-full bg-rose-600 text-white font-bold text-xs"
        >
          Back to Library
        </button>
      </div>
    );
  }

  const tracks = Array.isArray(playlist.tracks) ? playlist.tracks : [];

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      dispatch(playTrackNow({ song: tracks[0], songs: tracks, index: 0 }));
    }
  };

  const handleShufflePlay = () => {
    if (tracks.length > 0) {
      dispatch(playPlaylistWithShuffle({ tracks }));
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete playlist "${playlist.title}"?`)) {
      dispatch(deletePlaylist(playlist.id));
      navigate('/library');
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-24 select-none animate-fade-in">
      {/* Playlist Hero */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-6 md:p-8 rounded-3xl bg-gradient-to-r from-rose-600/20 via-rose-500/10 to-transparent border theme-border">
        <div className="w-40 h-40 md:w-52 md:h-52 rounded-2xl overflow-hidden bg-dark-950 shadow-2xl shrink-0 border theme-border">
          <img
            src={playlist.cover}
            alt={playlist.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 text-center md:text-left">
          <span className="text-xs font-bold uppercase tracking-widest text-rose-500">
            Playlist
          </span>
          <h1 className="text-2xl md:text-4xl font-extrabold theme-text-main mt-1">
            {playlist.title}
          </h1>
          {playlist.description && (
            <p className="text-xs md:text-sm theme-text-muted mt-1">{playlist.description}</p>
          )}
          <p className="text-xs theme-text-muted mt-2 font-medium">
            {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3">
            {/* Play All */}
            <button
              onClick={handlePlayAll}
              disabled={tracks.length === 0}
              className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
            >
              <FaPlay className="text-xs" />
              <span>Play</span>
            </button>

            {/* Shuffle Play Button */}
            <button
              onClick={handleShufflePlay}
              disabled={tracks.length === 0}
              className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-slate-500/15 hover:bg-slate-500/25 border theme-border theme-text-main font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
            >
              <FaRandom className="text-xs text-rose-500" />
              <span>Shuffle Play</span>
            </button>

            {/* Delete Playlist */}
            <button
              onClick={handleDelete}
              className="p-3 rounded-full bg-slate-500/10 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition-all"
              title="Delete Playlist"
            >
              <FaTrashAlt className="text-sm" />
            </button>
          </div>
        </div>
      </div>

      {/* Tracks List */}
      {tracks.length > 0 ? (
        <div className="space-y-1">
          {tracks.map((song, i) => (
            <div key={`${song.videoId}-${i}`} className="group relative">
              <SongRow song={song} index={i} songs={tracks} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch(removeTrackFromPlaylist({ playlistId: playlist.id, videoId: song.videoId }));
                }}
                className="absolute right-24 top-1/2 -translate-y-1/2 p-2 rounded-full opacity-0 group-hover:opacity-100 hover:text-rose-500 text-slate-400 transition-opacity"
                title="Remove from Playlist"
              >
                <FaTrashAlt className="text-xs" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center theme-text-muted text-sm">
          This playlist is empty. Search any Hindi, Punjabi, or Bollywood track and click "+ Add to Playlist"!
        </div>
      )}
    </div>
  );
};

export default PlaylistDetails;
