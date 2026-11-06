import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { playSong } from '../redux/features/playerSlice';
import SongRow from '../components/SongRow';
import { FaPlay, FaCompactDisc } from 'react-icons/fa';
import { normalizeSong } from '../utils/normalizeSong';
import { API_BASE } from '../services/apiConfig';

const AlbumDetails = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const albumNameParam = searchParams.get('name') || '';
  const dispatch = useDispatch();

  const [albumData, setAlbumData] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadAlbumData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/albums/${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!isMounted) return;

        const alb = data.album || data || {};
        setAlbumData(alb);

        const albumArtist =
          alb.artist?.name ||
          alb.artist ||
          (alb.artists && alb.artists[0]?.name) ||
          data.artist?.name ||
          '';

        let trks = (data.tracks || [])
          .map((t) => ({
            ...t,
            artist: t.artist || (t.artists && t.artists[0]?.name) || albumArtist,
            thumbnail: t.thumbnail || alb.thumbnail || alb.thumbnails?.[0]?.url,
          }))
          .map((t) => normalizeSong(t, albumArtist))
          .filter(Boolean);

        // Fallback: If no tracks were returned, search tracks by album name
        if (trks.length === 0 && (alb.title || albumNameParam)) {
          const queryTitle = alb.title || albumNameParam;
          try {
            const fallbackRes = await fetch(
              `${API_BASE}/api/search?q=${encodeURIComponent(`${queryTitle} songs`)}&filter=songs&language=en&hl=en`
            ).then((r) => r.json());

            if (fallbackRes?.results?.length) {
              trks = fallbackRes.results.map((t) => normalizeSong(t, albumArtist)).filter(Boolean);
            }
          } catch (e) {}
        }

        if (isMounted) {
          setTracks(trks);
        }
      } catch (err) {
        console.warn('Failed to load album:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAlbumData();

    return () => {
      isMounted = false;
    };
  }, [id, albumNameParam]);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      dispatch(playSong({ song: tracks[0], songs: tracks, index: 0 }));
    }
  };

  const title = albumData?.title || albumNameParam || 'Album';
  const artist = albumData?.artist?.name || (albumData?.artists && albumData.artists.map((a) => a.name).join(', ')) || '';
  const cover = albumData?.thumbnail || albumData?.thumbnails?.[0]?.url || tracks[0]?.thumbnail;

  return (
    <div className="flex flex-col gap-8 pb-20 select-none animate-fade-in">
      {/* Compact Album Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 p-4 sm:p-5 rounded-2xl bg-rose-500/10 border theme-border shadow-md">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-dark-950 shadow-md shrink-0 border theme-border">
          <img src={cover} alt={title} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <span className="text-[11px] font-bold uppercase tracking-widest text-rose-500">
            Album
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold theme-text-main mt-0.5">{title}</h1>
          <p className="text-xs theme-text-muted font-medium mt-0.5">{artist}</p>

          <button
            onClick={handlePlayAll}
            disabled={tracks.length === 0}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
          >
            <FaPlay className="text-[10px]" />
            <span>Play Album</span>
          </button>
        </div>
      </div>

      {/* Tracks */}
      <div className="space-y-1">
        {tracks.map((song, i) => (
          <SongRow key={song.videoId || i} song={song} index={i} songs={tracks} />
        ))}
      </div>
    </div>
  );
};

export default AlbumDetails;
