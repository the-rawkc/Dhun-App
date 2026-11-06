import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { parseLRC } from '../utils/normalizeSong';
import { formatLyricsByLanguage } from '../utils/lyricsLanguage';
import { playerEngine } from '../services/playerEngine';
import { API_BASE } from '../services/apiConfig';
import { FaTimes, FaMicrophoneAlt } from 'react-icons/fa';

const SyncedLyrics = ({ onClose }) => {
  const { activeSong, currentTime } = useSelector((state) => state.player);
  const [lyricsData, setLyricsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const activeLineRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!activeSong?.title) return;

    let isMounted = true;
    setLoading(true);
    setError(false);
    setLyricsData(null);

    const cleanTitle = activeSong.title.replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim();
    const cleanArtist = (activeSong.artist || '').split(',')[0].trim();

    fetch(`${API_BASE}/api/lyrics?title=${encodeURIComponent(cleanTitle)}&artist=${encodeURIComponent(cleanArtist)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data?.success) {
          const parsed = data.syncedLyrics ? parseLRC(data.syncedLyrics) : [];
          const formattedSynced = parsed.map((item) => ({
            ...item,
            text: formatLyricsByLanguage(item.text),
          }));
          setLyricsData({
            synced: formattedSynced.length > 0 ? formattedSynced : null,
            plain: data.plainLyrics ? formatLyricsByLanguage(data.plainLyrics) : null,
          });
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (isMounted) setError(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeSong?.videoId, activeSong?.title]);

  const activeIndex = lyricsData?.synced
    ? lyricsData.synced.reduce((acc, line, idx) => {
        if (currentTime >= line.time) return idx;
        return acc;
      }, -1)
    : -1;

  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  const handleLineClick = (time) => {
    playerEngine.seekTo(time);
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-[#0e0e12] text-white p-4 sm:p-6 md:p-8 select-none overflow-hidden">
      {/* Header with Title and Single Close Button */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-500 shrink-0">
            <FaMicrophoneAlt className="text-lg" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base sm:text-lg text-white truncate">Live Karaoke Lyrics</h3>
            <p className="text-xs text-white/60 truncate mt-0.5">
              {activeSong?.title} • {activeSong?.artist}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:bg-rose-600 text-white font-semibold text-xs shadow transition-all cursor-pointer shrink-0"
            title="Close Lyrics"
          >
            <FaTimes className="text-xs text-rose-400" />
            <span>Close</span>
          </button>
        )}
      </div>

      {/* Lyrics Body */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto custom-scrollbar py-8 px-2 md:px-8 space-y-6 text-center"
      >
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-20 text-slate-400">
            <div className="w-10 h-10 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
            <p className="text-sm font-medium">Fetching live synced lyrics...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-full py-24 theme-text-muted gap-3">
            <FaMicrophoneAlt className="text-5xl text-slate-500" />
            <p className="text-base font-semibold theme-text-main">No synced lyrics available</p>
            <p className="text-xs theme-text-muted max-w-sm">
              We couldn't locate synchronized lyrics for "{activeSong?.title}". Enjoy the music!
            </p>
          </div>
        )}

        {lyricsData?.synced && (
          <div className="flex flex-col gap-4 max-w-2xl mx-auto">
            {lyricsData.synced.map((line, idx) => {
              const isActive = idx === activeIndex;
              const isPast = idx < activeIndex;

              return (
                <p
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => handleLineClick(line.time)}
                  className={`cursor-pointer transition-all duration-300 text-lg md:text-2xl font-bold py-1 px-4 rounded-2xl leading-relaxed ${
                    isActive
                      ? 'text-rose-500 scale-105 bg-rose-500/10 shadow-lg shadow-rose-500/10'
                      : isPast
                      ? 'opacity-40 hover:opacity-80'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {line.text}
                </p>
              );
            })}
          </div>
        )}

        {!lyricsData?.synced && lyricsData?.plain && (
          <div className="max-w-2xl mx-auto theme-text-main text-base md:text-lg leading-loose whitespace-pre-line font-medium">
            {lyricsData.plain}
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncedLyrics;
