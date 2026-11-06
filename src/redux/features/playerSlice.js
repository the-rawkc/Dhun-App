import { createSlice } from '@reduxjs/toolkit';
import { normalizeSong } from '../../utils/normalizeSong';
import { syncToCloudDatabase } from '../../services/authService';

const loadSaved = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
};

const saveItem = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {}
};

// Helper to trigger background cloud sync
const triggerCloudSync = (state) => {
  syncToCloudDatabase({
    favorites: state.favorites,
    playlists: state.playlists,
    favoriteArtists: state.favoriteArtists,
    themeMode: state.themeMode,
  });
};

const initialTheme = loadSaved('tunetide_theme', 'dark');
if (typeof document !== 'undefined') {
  if (initialTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

const defaultPlaylists = [
  {
    id: 'pl-desi-hits',
    title: 'Desi Chill & Bollywood',
    description: 'Arijit Singh, Shreya Ghoshal & soulful melodies',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80',
    tracks: [],
    createdAt: Date.now(),
  },
  {
    id: 'pl-punjabi-power',
    title: 'Punjabi Fire Wave',
    description: 'High energy beats by Diljit, Karan Aujla, AP Dhillon',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80',
    tracks: [],
    createdAt: Date.now(),
  },
];

const initialState = {
  currentSongs: [],
  currentIndex: 0,
  isActive: false,
  isPlaying: false,
  activeSong: null,
  duration: 0,
  currentTime: 0,
  volume: loadSaved('tunetide_volume', 0.8),
  isMuted: false,
  repeatMode: 'off',
  shuffle: false,
  isMobilePlayerOpen: false,
  showLyrics: false,
  lyricsData: null,
  isLyricsLoading: false,
  themeMode: initialTheme,
  favorites: loadSaved('tunetide_favorites', []),
  recentTracks: loadSaved('tunetide_recent', []),
  playlists: loadSaved('tunetide_playlists', defaultPlaylists),
  favoriteArtists: loadSaved('tunetide_fav_artists', []),
  offlineTracks: [],
  isAddToPlaylistModalOpen: false,
  songToAddToPlaylist: null,
  isEqualizerModalOpen: false,
  equalizerPreset: loadSaved('tunetide_eq_preset', 'studio'),
  audioQuality: loadSaved('tunetide_audio_bitrate', '320'),
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    // Hydrate & Smart-Merge everything from Cloud Database on Login for 100% Data Uniformity
    loadCloudUserData: (state, action) => {
      const { favorites, playlists, favoriteArtists, themeMode } = action.payload || {};

      // 1. Smart-Merge Liked Songs (Favorites): combine local + cloud, deduplicate by videoId
      const favMap = new Map();
      (state.favorites || []).forEach((f) => {
        if (f && f.videoId) favMap.set(f.videoId, f);
      });
      if (Array.isArray(favorites)) {
        favorites.forEach((f) => {
          if (f && f.videoId) favMap.set(f.videoId, f);
        });
      }
      state.favorites = Array.from(favMap.values());
      saveItem('tunetide_favorites', state.favorites);

      // 2. Smart-Merge Playlists: combine local + cloud playlists, deduplicate by ID or Title
      const plMap = new Map();
      (state.playlists || []).forEach((p) => {
        if (p && (p.id || p.title)) plMap.set(p.id || p.title, p);
      });
      if (Array.isArray(playlists)) {
        playlists.forEach((p) => {
          if (p && (p.id || p.title)) {
            const key = p.id || p.title;
            const existing = plMap.get(key);
            if (existing && Array.isArray(existing.tracks)) {
              // Merge playlist tracks
              const trackMap = new Map();
              existing.tracks.forEach((t) => t && t.videoId && trackMap.set(t.videoId, t));
              (p.tracks || []).forEach((t) => t && t.videoId && trackMap.set(t.videoId, t));
              plMap.set(key, { ...existing, ...p, tracks: Array.from(trackMap.values()) });
            } else {
              plMap.set(key, p);
            }
          }
        });
      }
      state.playlists = Array.from(plMap.values());
      saveItem('tunetide_playlists', state.playlists);

      // 3. Smart-Merge Favorite Artists
      const artistSet = new Set([
        ...(state.favoriteArtists || []),
        ...((Array.isArray(favoriteArtists) && favoriteArtists) || []),
      ]);
      state.favoriteArtists = Array.from(artistSet);
      saveItem('tunetide_fav_artists', state.favoriteArtists);

      // 4. Theme
      if (themeMode) {
        state.themeMode = themeMode;
        saveItem('tunetide_theme', themeMode);
        if (typeof document !== 'undefined') {
          if (themeMode === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        }
      }

      // Automatically sync unified merged library back to cloud database!
      triggerCloudSync(state);
    },

    setThemeMode: (state, action) => {
      const mode = action.payload;
      state.themeMode = mode;
      saveItem('tunetide_theme', mode);
      if (typeof document !== 'undefined') {
        if (mode === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }
      triggerCloudSync(state);
    },

    playSong: (state, action) => {
      const { song, songs, index } = action.payload;
      const normalized = normalizeSong(song);
      if (!normalized) return;

      state.activeSong = normalized;
      state.isActive = true;
      state.isPlaying = true;
      state.currentTime = 0;

      if (Array.isArray(songs) && songs.length > 0) {
        state.currentSongs = songs.map(normalizeSong).filter(Boolean);
        state.currentIndex = typeof index === 'number' ? index : state.currentSongs.findIndex((s) => s.videoId === normalized.videoId);
        if (state.currentIndex < 0) state.currentIndex = 0;
      } else if (!state.currentSongs.some((s) => s.videoId === normalized.videoId)) {
        state.currentSongs = [normalized, ...state.currentSongs];
        state.currentIndex = 0;
      }

      const filteredRecent = state.recentTracks.filter((t) => t.videoId !== normalized.videoId);
      state.recentTracks = [normalized, ...filteredRecent].slice(0, 30);
      saveItem('tunetide_recent', state.recentTracks);
    },

    playPlaylistWithShuffle: (state, action) => {
      const { tracks = [] } = action.payload;
      if (!tracks.length) return;

      const normalized = tracks.map(normalizeSong).filter(Boolean);
      state.currentSongs = normalized;
      state.shuffle = true;
      const randomIdx = Math.floor(Math.random() * normalized.length);
      state.currentIndex = randomIdx;
      state.activeSong = normalized[randomIdx];
      state.isActive = true;
      state.isPlaying = true;
      state.currentTime = 0;
    },

    playPause: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.isPlaying = action.payload;
      } else {
        state.isPlaying = !state.isPlaying;
      }
    },

    nextSong: (state) => {
      if (!state.currentSongs.length) return;

      if (state.repeatMode === 'one') {
        state.currentTime = 0;
        state.isPlaying = true;
        return;
      }

      let nextIndex = state.currentIndex + 1;
      if (state.shuffle) {
        nextIndex = Math.floor(Math.random() * state.currentSongs.length);
      } else if (nextIndex >= state.currentSongs.length) {
        if (state.repeatMode === 'all') {
          nextIndex = 0;
        } else {
          state.isPlaying = false;
          return;
        }
      }

      state.currentIndex = nextIndex;
      state.activeSong = state.currentSongs[nextIndex];
      state.currentTime = 0;
      state.isPlaying = true;

      if (state.activeSong) {
        const filteredRecent = state.recentTracks.filter((t) => t.videoId !== state.activeSong.videoId);
        state.recentTracks = [state.activeSong, ...filteredRecent].slice(0, 30);
        saveItem('tunetide_recent', state.recentTracks);
      }
    },

    prevSong: (state) => {
      if (!state.currentSongs.length) return;

      if (state.currentTime > 3) {
        state.currentTime = 0;
        return;
      }

      let prevIndex = state.currentIndex - 1;
      if (state.shuffle) {
        prevIndex = Math.floor(Math.random() * state.currentSongs.length);
      } else if (prevIndex < 0) {
        prevIndex = state.currentSongs.length - 1;
      }

      state.currentIndex = prevIndex;
      state.activeSong = state.currentSongs[prevIndex];
      state.currentTime = 0;
      state.isPlaying = true;
    },

    setCurrentTime: (state, action) => {
      state.currentTime = action.payload;
    },

    setDuration: (state, action) => {
      state.duration = action.payload;
    },

    setVolume: (state, action) => {
      state.volume = Math.max(0, Math.min(1, action.payload));
      state.isMuted = state.volume === 0;
      saveItem('tunetide_volume', state.volume);
    },

    toggleMute: (state) => {
      state.isMuted = !state.isMuted;
    },

    toggleRepeat: (state) => {
      const modes = ['off', 'all', 'one'];
      const nextIdx = (modes.indexOf(state.repeatMode) + 1) % modes.length;
      state.repeatMode = modes[nextIdx];
    },

    toggleShuffle: (state) => {
      state.shuffle = !state.shuffle;
    },

    toggleMobilePlayer: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.isMobilePlayerOpen = action.payload;
      } else {
        state.isMobilePlayerOpen = !state.isMobilePlayerOpen;
      }
    },

    toggleLyrics: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.showLyrics = action.payload;
      } else {
        state.showLyrics = !state.showLyrics;
      }
    },

    toggleFavorite: (state, action) => {
      const song = normalizeSong(action.payload);
      if (!song) return;

      const exists = state.favorites.some((f) => f.videoId === song.videoId);
      if (exists) {
        state.favorites = state.favorites.filter((f) => f.videoId !== song.videoId);
      } else {
        state.favorites = [song, ...state.favorites];
      }
      saveItem('tunetide_favorites', state.favorites);
      triggerCloudSync(state);
    },

    toggleFavoriteArtist: (state, action) => {
      const artist = action.payload;
      if (!artist?.name) return;

      const exists = state.favoriteArtists.some((a) => a.name.toLowerCase() === artist.name.toLowerCase());
      if (exists) {
        state.favoriteArtists = state.favoriteArtists.filter(
          (a) => a.name.toLowerCase() !== artist.name.toLowerCase()
        );
      } else {
        state.favoriteArtists = [artist, ...state.favoriteArtists];
      }
      saveItem('tunetide_fav_artists', state.favoriteArtists);
      triggerCloudSync(state);
    },

    createPlaylist: (state, action) => {
      const { title, description = '' } = action.payload;
      const newPlaylist = {
        id: `pl-${Date.now()}`,
        title: title.trim() || 'My Desi Playlist',
        description,
        cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
        tracks: [],
        createdAt: Date.now(),
      };
      state.playlists = [newPlaylist, ...state.playlists];
      saveItem('tunetide_playlists', state.playlists);
      triggerCloudSync(state);
    },

    deletePlaylist: (state, action) => {
      const id = action.payload;
      state.playlists = state.playlists.filter((p) => p.id !== id);
      saveItem('tunetide_playlists', state.playlists);
      triggerCloudSync(state);
    },

    addTrackToPlaylist: (state, action) => {
      const { playlistId, song } = action.payload;
      const norm = normalizeSong(song);
      if (!norm) return;

      state.playlists = state.playlists.map((pl) => {
        if (pl.id === playlistId) {
          const alreadyIn = pl.tracks.some((t) => t.videoId === norm.videoId);
          if (!alreadyIn) {
            return {
              ...pl,
              tracks: [...pl.tracks, norm],
              cover: pl.cover || norm.thumbnail,
            };
          }
        }
        return pl;
      });
      saveItem('tunetide_playlists', state.playlists);
      triggerCloudSync(state);
    },

    removeTrackFromPlaylist: (state, action) => {
      const { playlistId, videoId } = action.payload;
      state.playlists = state.playlists.map((pl) => {
        if (pl.id === playlistId) {
          return {
            ...pl,
            tracks: pl.tracks.filter((t) => t.videoId !== videoId),
          };
        }
        return pl;
      });
      saveItem('tunetide_playlists', state.playlists);
      triggerCloudSync(state);
    },

    openAddToPlaylistModal: (state, action) => {
      state.songToAddToPlaylist = normalizeSong(action.payload);
      state.isAddToPlaylistModalOpen = true;
    },

    closeAddToPlaylistModal: (state) => {
      state.isAddToPlaylistModalOpen = false;
      state.songToAddToPlaylist = null;
    },

    setOfflineTracks: (state, action) => {
      state.offlineTracks = action.payload;
    },

    addToQueue: (state, action) => {
      const song = normalizeSong(action.payload);
      if (!song) return;
      state.currentSongs.push(song);
    },

    clearQueue: (state) => {
      if (state.activeSong) {
        state.currentSongs = [state.activeSong];
        state.currentIndex = 0;
      } else {
        state.currentSongs = [];
        state.currentIndex = 0;
      }
    },

    setIsEqualizerModalOpen: (state, action) => {
      state.isEqualizerModalOpen = !!action.payload;
    },

    setEqualizerPreset: (state, action) => {
      state.equalizerPreset = action.payload;
      saveItem('tunetide_eq_preset', action.payload);
    },

    setAudioQuality: (state, action) => {
      state.audioQuality = action.payload;
      saveItem('tunetide_audio_bitrate', action.payload);
    },
  },
});

export const {
  loadCloudUserData,
  setThemeMode,
  playSong,
  playPlaylistWithShuffle,
  playPause,
  nextSong,
  prevSong,
  setCurrentTime,
  setDuration,
  setVolume,
  toggleMute,
  toggleRepeat,
  toggleShuffle,
  toggleMobilePlayer,
  toggleLyrics,
  toggleFavorite,
  toggleFavoriteArtist,
  createPlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  openAddToPlaylistModal,
  closeAddToPlaylistModal,
  setOfflineTracks,
  addToQueue,
  clearQueue,
  setIsEqualizerModalOpen,
  setEqualizerPreset,
  setAudioQuality,
} = playerSlice.actions;

export default playerSlice.reducer;
