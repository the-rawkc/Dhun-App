import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setThemeMode } from '../redux/features/playerSlice';
import { getActiveSession } from '../services/authService';
import { API_BASE } from '../services/apiConfig';
import {
  FaSearch,
  FaTimes,
  FaUser,
} from 'react-icons/fa';

const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { themeMode } = useSelector((state) => state.player);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [user, setUser] = useState(getActiveSession());
  const containerRef = useRef(null);

  useEffect(() => {
    if (location.pathname.startsWith('/search/')) {
      const term = decodeURIComponent(location.pathname.replace('/search/', ''));
      setQuery(term);
    }
  }, [location.pathname]);

  useEffect(() => {
    setUser(getActiveSession());
  }, [location.pathname]);

  // Fast auto-complete suggestions
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`${API_BASE}/api/search/suggestions?q=${encodeURIComponent(query.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.suggestions) {
            setSuggestions(data.suggestions.slice(0, 6));
          }
        })
        .catch(() => setSuggestions([]));
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSuggestions([]);
    setIsFocused(false);
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    navigate(`/search/${encodeURIComponent(query.trim())}`);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setSuggestions([]);
    setIsFocused(false);
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    navigate(`/search/${encodeURIComponent(suggestion)}`);
  };

  const handleToggleTheme = () => {
    dispatch(setThemeMode(themeMode === 'dark' ? 'light' : 'dark'));
  };

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-8 py-3.5 theme-bg-main/90 backdrop-blur-md border-b theme-border">
      {/* Profile Icon shifted to the LEFT (Icon only, no text) */}
      <button
        onClick={() => navigate('/profile')}
        className="shrink-0 p-0.5 rounded-full ring-2 ring-rose-500/30 hover:ring-rose-500 transition-all cursor-pointer active:scale-95 shadow-md shadow-rose-600/10"
        title={user?.name ? `${user.name} - Profile` : 'Your Profile'}
        aria-label="Profile"
      >
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt="avatar"
            className="w-9 h-9 rounded-full object-cover border-2 border-rose-500 shadow-sm"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white text-xs shadow-sm">
            <FaUser />
          </div>
        )}
      </button>

      {/* Search Bar Container */}
      <div ref={containerRef} className="relative flex-1 max-w-xl">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="Search Hindi, Punjabi, Bollywood songs or artists..."
            className="w-full pl-4 pr-11 py-2.5 rounded-full bg-slate-500/10 border theme-border theme-text-main placeholder-slate-400 text-xs md:text-sm focus:outline-none focus:border-rose-500 transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
              }}
              className="absolute right-9 p-1 theme-text-muted hover:theme-text-main"
            >
              <FaTimes className="text-xs" />
            </button>
          )}
          {/* Search Icon on the RIGHT */}
          <button
            type="submit"
            className="absolute right-3.5 p-1 theme-text-muted hover:text-rose-500 transition-colors"
            title="Search"
            aria-label="Search"
          >
            <FaSearch className="text-sm" />
          </button>
        </form>

        {/* Fast Autocomplete Dropdown */}
        {isFocused && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 py-2 rounded-2xl theme-bg-card border theme-border shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-fade-in">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider theme-text-muted">
              Fast Suggestions
            </div>
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                onMouseDown={() => handleSuggestionClick(item)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-slate-500/10 cursor-pointer text-xs md:text-sm theme-text-main hover:text-rose-500 transition-colors"
              >
                <FaSearch className="text-[10px] theme-text-muted" />
                <span className="truncate">{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;
