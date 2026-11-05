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

    fetch(`${API_BASE}/api/albums/${encodeURIComponent(id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const alb = data.album || data;
        setAlbumData(alb);
        const albumArtist = alb.artist || (alb.artists && alb.artists[0]?.name) || data.artist?.name || '';
        const trks = (data.tracks || []).map((t) => ({
          ...t,
          artist: t.artist || (t.artists && t.artists[0]?.name) || albumArtist,
          thumbnail: t.thumbnail || alb.thumbnail || alb.thumbnails?.[0]?.url,
        })).map((t) => normalizeSong(t, albumArtist)).filter(Boolean);
        setTracks(trks);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

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
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-6 md:p-8 rounded-3xl bg-rose-500/10 border theme-border shadow-lg">
        <div className="w-40 h-40 md:w-52 md:h-52 rounded-2xl overflow-hidden bg-dark-950 shadow-2xl shrink-0 border theme-border">
          <img src={cover} alt={title} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <span className="text-xs font-bold uppercase tracking-widest text-rose-500">
            Album
          </span>
          <h1 className="text-2xl md:text-4xl font-extrabold theme-text-main mt-1">{title}</h1>
          <p className="text-sm theme-text-muted font-medium mt-1">{artist}</p>
          <p className="text-xs theme-text-muted mt-2">
            {albumData?.year ? `${albumData.year} • ` : ''}
            {tracks.length} tracks
          </p>

          <button
            onClick={handlePlayAll}
            disabled={tracks.length === 0}
            className="mt-6 inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
          >
            <FaPlay className="text-xs" />
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
