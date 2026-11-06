import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  HiHome,
  HiHeart,
} from 'react-icons/hi';
import {
  FaFire,
  FaUserFriends,
  FaHistory,
  FaCompass,
  FaMusic,
  FaSlidersH,
  FaDownload,
  FaUser,
} from 'react-icons/fa';

const navItems = [
  { name: 'Home', to: '/', icon: HiHome },
  { name: 'Explore & Moods', to: '/explore', icon: FaCompass },
  { name: 'India Charts', to: '/charts', icon: FaFire },
  { name: 'Top Artists', to: '/artists', icon: FaUserFriends },
];

const libraryItems = [
  { name: 'Playlists & Library', to: '/library', icon: FaMusic },
  { name: 'Recently Played', to: '/recent', icon: FaHistory },
  { name: 'Your Profile', to: '/profile', icon: FaUser },
  { name: 'App Settings', to: '/settings', icon: FaSlidersH },
];

const quickDesiMoods = [
  { name: 'Bollywood Romance', query: 'bollywood romantic songs' },
  { name: 'Punjabi Hits', query: 'punjabi party hits' },
  { name: 'Desi Hip-Hop', query: 'desi hip hop divine' },
  { name: 'Sufi & Devotional', query: 'sufi ghazal bhakti' },
];

const Sidebar = () => {
  const navigate = useNavigate();

  return (
    <aside className="hidden lg:flex flex-col w-64 theme-bg-sidebar border-r theme-border p-5 shrink-0 select-none overflow-y-auto custom-scrollbar">
      {/* Brand Header */}
      <div
        onClick={() => navigate('/')}
        className="flex items-center gap-3 px-2 py-3 cursor-pointer group"
      >
        <img
          src="/icon.svg"
          alt="Dhun"
          className="w-10 h-10 rounded-full shadow-lg shadow-rose-600/30 group-hover:scale-105 transition-transform duration-300"
        />
        <div>
          <span className="font-black text-2xl tracking-tight theme-text-main flex items-center">
            Dhun<span className="text-rose-600">.</span>
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-rose-500 block">
            Desi Music Hub
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="mt-8 space-y-1">
        <p className="px-3 text-[11px] font-bold uppercase tracking-wider theme-text-muted mb-2">
          Discover
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                  : 'theme-text-muted hover:theme-text-main hover:bg-slate-500/10'
              }`
            }
          >
            <item.icon className="text-lg shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </div>

      {/* My Library */}
      <div className="mt-8 space-y-1">
        <p className="px-3 text-[11px] font-bold uppercase tracking-wider theme-text-muted mb-2">
          Personal
        </p>
        {libraryItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                  : 'theme-text-muted hover:theme-text-main hover:bg-slate-500/10'
              }`
            }
          >
            <item.icon className="text-lg shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </div>

      {/* Quick Desi Vibes */}
      <div className="mt-8 space-y-1">
        <p className="px-3 text-[11px] font-bold uppercase tracking-wider theme-text-muted mb-2">
          Instant Vibe
        </p>
        {quickDesiMoods.map((mood) => (
          <button
            key={mood.name}
            onClick={() => navigate(`/search/${encodeURIComponent(mood.query)}`)}
            className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium theme-text-muted hover:text-rose-500 hover:bg-slate-500/10 transition-all truncate"
          >
            # {mood.name}
          </button>
        ))}
      </div>

      {/* Bottom Footer Info */}
      <div className="mt-auto pt-6 border-t theme-border px-2 text-xs theme-text-muted space-y-1">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium theme-text-main">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            Indian Engine Active
          </span>
          <span className="font-mono text-[11px]">v2.5</span>
        </div>
        <p className="text-[11px] theme-text-muted">320kbps Lossless • Offline</p>
      </div>
    </aside>
  );
};

export default Sidebar;
