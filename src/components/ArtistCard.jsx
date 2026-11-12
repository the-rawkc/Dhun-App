import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toggleFavoriteArtist } from '../redux/features/playerSlice';
import { FaCheckCircle, FaHeart, FaRegHeart } from 'react-icons/fa';
import { getArtistPhoto } from '../utils/artistPhotos';

const ArtistCard = ({ artist }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { favoriteArtists } = useSelector((state) => state.player);

  const name = artist.name || artist.title || 'Artist';
  const rawImage =
    artist.image ||
    (artist.thumbnails && artist.thumbnails[0]?.url) ||
    artist.thumbnail ||
    '';
  const image = getArtistPhoto(name, rawImage);
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
      className="group relative flex flex-col items-center text-center p-2 rounded-2xl glass-card cursor-pointer select-none transition-all duration-300 hover:scale-[1.03]"
    >
      {/* Floating Favorite Heart */}
      <button
        onClick={handleToggleFav}
        className={`absolute top-1.5 right-1.5 p-1 rounded-full backdrop-blur-md transition-all ${
          isFav
            ? 'bg-rose-600 text-white'
            : 'bg-black/50 text-white/70 opacity-0 group-hover:opacity-100 hover:text-white'
        }`}
        title={isFav ? 'Unfollow Artist' : 'Follow Artist'}
      >
        {isFav ? <FaHeart className="text-[9px]" /> : <FaRegHeart className="text-[9px]" />}
      </button>

      {/* Avatar (Compact & Sleek) */}
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-dark-800 shadow-md p-0.5 border border-slate-500/20 group-hover:border-rose-500 transition-all duration-300">
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

      {/* Name Only (no extra descriptions) */}
      <div className="mt-1.5 flex items-center gap-1 justify-center max-w-full px-1">
        <h4 className="font-bold text-xs sm:text-sm theme-text-main group-hover:text-rose-500 truncate transition-colors">
          {name}
        </h4>
        <FaCheckCircle className="text-rose-500 text-[10px] shrink-0" title="Verified Artist" />
      </div>
    </div>
  );
};

export default ArtistCard;
