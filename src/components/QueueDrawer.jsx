import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { playSong, clearQueue } from '../redux/features/playerSlice';
import { FaTimes, FaTrashAlt, FaMusic } from 'react-icons/fa';
import SongRow from './SongRow';

const QueueDrawer = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { currentSongs, currentIndex, activeSong } = useSelector((state) => state.player);

  if (!isOpen) return null;

  const nextUp = currentSongs.slice(currentIndex + 1);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md h-full theme-bg-main border-l theme-border flex flex-col p-6 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b theme-border">
          <div className="flex items-center gap-2.5">
            <FaMusic className="text-rose-500 text-lg" />
            <h3 className="text-lg font-bold theme-text-main">Play Queue</h3>
          </div>
          <div className="flex items-center gap-2">
            {currentSongs.length > 1 && (
              <button
                onClick={() => dispatch(clearQueue())}
                className="p-2 rounded-xl bg-slate-500/10 hover:bg-rose-500/20 text-rose-500 text-xs flex items-center gap-1.5 transition-all"
                title="Clear queue"
              >
                <FaTrashAlt />
                <span>Clear</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-500/10 theme-text-muted hover:theme-text-main transition-all"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-6">
          {/* Now Playing */}
          {activeSong && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-500 mb-2">
                Now Playing
              </p>
              <SongRow song={activeSong} index={currentIndex} songs={currentSongs} />
            </div>
          )}

          {/* Next Up */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider theme-text-muted mb-2 flex items-center justify-between">
              <span>Up Next ({nextUp.length})</span>
            </p>
            {nextUp.length > 0 ? (
              <div className="space-y-1">
                {nextUp.map((song, i) => (
                  <SongRow
                    key={`${song.videoId}-${i}`}
                    song={song}
                    index={currentIndex + 1 + i}
                    songs={currentSongs}
                  />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center theme-text-muted text-sm">
                No upcoming tracks. Dhun will automatically stream related radio songs!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueueDrawer;
