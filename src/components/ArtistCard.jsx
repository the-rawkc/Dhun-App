import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toggleFavoriteArtist } from '../redux/features/playerSlice';
import { FaCheckCircle, FaHeart, FaRegHeart } from 'react-icons/fa';

const ArtistCard = ({ artist }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { favoriteArtists } = useSelector((state) => state.player);

  const name = artist.name || artist.title || 'Artist';
  const image =
    artist.image ||
    (artist.thumbnails && artist.thumbnails[0]?.url) ||
    artist.thumbnail ||
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=60';
  const browseId = artist.browseId || artist.id || encodeURIComponent(name);

  const isFav = favoriteArtists.some((a) => a.name.toLowerCase() === name.toLowerCase());

  const handleClick = () => {
    navigate(`/artists/${browseId}?name=${encodeURIComponent(name)}`);
  };

  const handleToggleFav = (e) => {
    e.stopPropagation();
    dispatch(toggleFavoriteArtist({ name, browseId, image }));
  };

  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-col items-center text-center p-2.5 sm:p-3 rounded-2xl glass-card cursor-pointer select-none transition-all duration-300 hover:scale-[1.03]"
    >
      {/* Floating Favorite Heart */}
      <button
        onClick={handleToggleFav}
        className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all ${
          isFav
            ? 'bg-rose-600 text-white'
            : 'bg-black/50 text-white/70 opacity-0 group-hover:opacity-100 hover:text-white'
        }`}
        title={isFav ? 'Unfollow Artist' : 'Follow Artist'}
      >
        {isFav ? <FaHeart className="text-[10px]" /> : <FaRegHeart className="text-[10px]" />}
      </button>

      {/* Avatar (Compact - 30% smaller) */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-dark-800 shadow-md p-0.5 border border-slate-500/20 group-hover:border-rose-500 transition-all duration-300">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover rounded-full transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src =
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=60';
          }}
        />
      </div>

      <div className="mt-2 flex items-center gap-1 justify-center max-w-full px-1">
        <h4 className="font-bold text-xs sm:text-sm theme-text-main group-hover:text-rose-500 truncate transition-colors">
          {name}
        </h4>
        <FaCheckCircle className="text-rose-500 text-[10px] shrink-0" title="Verified Artist" />
      </div>

      <p className="text-[10px] theme-text-muted mt-0.5 capitalize truncate max-w-full">
        {artist.subscribers ||
          (artist.listeners ? `${Number(artist.listeners).toLocaleString()} listeners` : 'Indian Artist')}
      </p>
    </div>
  );
};

export default ArtistCard;
