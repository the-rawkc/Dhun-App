import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  closeAddToPlaylistModal,
  addTrackToPlaylist,
  createPlaylist,
} from '../redux/features/playerSlice';
import { FaTimes, FaPlus, FaCheck, FaFolderPlus } from 'react-icons/fa';

const AddToPlaylistModal = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAddToPlaylistModalOpen, songToAddToPlaylist, playlists } = useSelector(
    (state) => state.player
  );
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [addedMap, setAddedMap] = useState({});

  if (!isAddToPlaylistModalOpen || !songToAddToPlaylist) return null;

  const handleAddToPlaylist = (playlistId) => {
    dispatch(addTrackToPlaylist({ playlistId, song: songToAddToPlaylist }));
    setAddedMap((prev) => ({ ...prev, [playlistId]: true }));
    setTimeout(() => {
      dispatch(closeAddToPlaylistModal());
    }, 600);
  };

  const handleCreateAndAdd = (e) => {
    e.preventDefault();
    if (!newPlaylistTitle.trim()) return;

    const newId = `pl-${Date.now()}`;
    dispatch(
      createPlaylist({
        id: newId,
        title: newPlaylistTitle.trim(),
        initialTrack: songToAddToPlaylist,
      })
    );
    setNewPlaylistTitle('');
    setShowCreateInput(false);
    dispatch(closeAddToPlaylistModal());
    navigate(`/playlist/${newId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in p-4 select-none">
      <div
        className="w-full max-w-md rounded-3xl theme-bg-card border theme-border p-6 shadow-2xl flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b theme-border">
          <div>
            <h3 className="text-lg font-bold theme-text-main">Add to Playlist</h3>
            <p className="text-xs theme-text-muted truncate max-w-[280px]">
              {songToAddToPlaylist.title} • {songToAddToPlaylist.artist}
            </p>
          </div>
          <button
            onClick={() => dispatch(closeAddToPlaylistModal())}
            className="p-2 rounded-full hover:bg-slate-500/10 theme-text-muted hover:theme-text-main"
          >
            <FaTimes />
          </button>
        </div>

        {/* Existing Playlists list */}
        <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2">
          {playlists.map((pl) => {
            const trks = Array.isArray(pl.tracks) ? pl.tracks : [];
            const isSongInPlaylist = (track, target) => {
              if (!track || !target) return false;
              const v1 = (track.videoId || '').trim();
              const v2 = (target.videoId || '').trim();
              if (v1 && v2 && v1 === v2) return true;
              const id1 = (track.id || '').trim();
              const id2 = (target.id || '').trim();
              if (id1 && id2 && id1 === id2) return true;
              const t1 = (track.title || '').trim().toLowerCase();
              const t2 = (target.title || '').trim().toLowerCase();
              const a1 = (track.artist || '').trim().toLowerCase();
              const a2 = (target.artist || '').trim().toLowerCase();
              if (t1 && t2 && t1 === t2 && a1 && a2 && a1 === a2) return true;
              return false;
            };

            const isAlreadyAdded = trks.some((t) => isSongInPlaylist(t, songToAddToPlaylist));
            const isJustAdded = addedMap[pl.id];
            const firstTrack = trks.length > 0 ? trks[0] : null;
            const plCover =
              firstTrack?.thumbnail ||
              firstTrack?.cover ||
              firstTrack?.image ||
              pl.cover ||
              'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80';

            return (
              <div
                key={pl.id}
                onClick={() => !isAlreadyAdded && !isJustAdded && handleAddToPlaylist(pl.id)}
                className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                  isAlreadyAdded || isJustAdded
                    ? 'bg-rose-500/10 border border-rose-500/20'
                    : 'hover:bg-slate-500/10 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-dark-800 shrink-0">
                    <img
                      src={plCover}
                      alt={pl.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold theme-text-main truncate">
                      {pl.title}
                    </span>
                    <span className="text-xs theme-text-muted">
                      {trks.length} {trks.length === 1 ? 'song' : 'songs'}
                    </span>
                  </div>
                </div>

                <div className="text-sm shrink-0 pl-2">
                  {isAlreadyAdded || isJustAdded ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/20 text-xs font-bold text-rose-500">
                      <FaCheck className="text-[10px]" />
                      <span>Added</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToPlaylist(pl.id);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm hover:scale-105 active:scale-95 transition-all"
                      title="Add to this playlist"
                    >
                      <FaPlus className="text-[10px]" />
                      <span>Add</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Create New Playlist option */}
        {showCreateInput ? (
          <form onSubmit={handleCreateAndAdd} className="flex gap-2 mt-2">
            <input
              type="text"
              autoFocus
              value={newPlaylistTitle}
              onChange={(e) => setNewPlaylistTitle(e.target.value)}
              placeholder="Playlist name..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-500/10 border theme-border theme-text-main text-sm focus:outline-none focus:border-rose-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreateInput(false)}
              className="px-3 py-2 rounded-xl theme-text-muted hover:theme-text-main text-xs"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowCreateInput(true)}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-dashed theme-border hover:border-rose-500 theme-text-muted hover:text-rose-500 text-sm font-semibold transition-all"
          >
            <FaFolderPlus />
            <span>Create New Playlist</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default AddToPlaylistModal;
