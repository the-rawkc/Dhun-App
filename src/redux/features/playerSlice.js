import { createSlice } from '@reduxjs/toolkit';
import { normalizeSong, isSameSong } from '../../utils/normalizeSong';
import { syncToCloudDatabase } from '../../services/authService';
import { playerEngine } from '../../services/playerEngine';
import {
  isStrictHaryanvi,
  isStrictPunjabi,
  hasPunjabiSignature,
  hasHaryanviSignature,
} from '../../utils/regionalFilter';

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

export const instantHaryanviTracks = [
  { videoId: 'CZt-rVn2BJs', title: '52 Gaj Ka Daman', artist: 'Renuka Panwar', thumbnail: 'https://i.ytimg.com/vi/CZt-rVn2BJs/hqdefault.jpg', duration: '3:05' },
  { videoId: 'cZSrWoBMSrg', title: 'Gypsy (Balam Thanedar)', artist: 'GD Kaur, Pranjal Dahiya', thumbnail: 'https://i.ytimg.com/vi/cZSrWoBMSrg/hqdefault.jpg', duration: '2:52' },
  { videoId: 'nfs8NYg7yQM', title: 'Chatak Matak', artist: 'Renuka Panwar, Sapna Choudhary', thumbnail: 'https://i.ytimg.com/vi/nfs8NYg7yQM/hqdefault.jpg', duration: '3:21' },
  { videoId: 'tJGBVigwPlU', title: 'Moto', artist: 'Diler Kharkiya, Ajay Hooda', thumbnail: 'https://i.ytimg.com/vi/tJGBVigwPlU/hqdefault.jpg', duration: '3:18' },
  { videoId: 'T0H_LWLiOGk', title: 'Up To Date', artist: 'Dhanda Nyoliwala', thumbnail: 'https://i.ytimg.com/vi/T0H_LWLiOGk/hqdefault.jpg', duration: '3:00' },
  { videoId: 'z6sDIc1Zqzs', title: 'Middle Class', artist: 'Gulzaar Chhaniwala', thumbnail: 'https://i.ytimg.com/vi/z6sDIc1Zqzs/hqdefault.jpg', duration: '3:45' },
  { videoId: 'MVF-GCOY2kI', title: '2 Numbari', artist: 'Masoom Sharma', thumbnail: 'https://i.ytimg.com/vi/MVF-GCOY2kI/hqdefault.jpg', duration: '3:12' },
  { videoId: 'kVtkC1I7-uc', title: 'Kothe Upar Kothri', artist: 'Renuka Panwar', thumbnail: 'https://i.ytimg.com/vi/kVtkC1I7-uc/hqdefault.jpg', duration: '3:30' },
  { videoId: 'xJ8M4Z_n1t8', title: 'Solid Body', artist: 'Raju Punjabi, Sheenam Katholic', thumbnail: 'https://i.ytimg.com/vi/xJ8M4Z_n1t8/hqdefault.jpg', duration: '3:40' },
  { videoId: '4H5gGfXo3eQ', title: 'Bahu Kale Ki', artist: 'Ajay Hooda, Gajender Phogat', thumbnail: 'https://i.ytimg.com/vi/4H5gGfXo3eQ/hqdefault.jpg', duration: '3:15' },
];

export const instantDesiTracks = [
  { videoId: 'BddP6PYo2gs', title: 'Kesariya (From "Brahmastra")', artist: 'Pritam, Arijit Singh', thumbnail: 'https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg', duration: '4:28' },
  { videoId: 'ElZfdU54Cp8', title: 'Apna Bana Le (From "Bhediya")', artist: 'Arijit Singh, Sachin-Jigar', thumbnail: 'https://i.ytimg.com/vi/ElZfdU54Cp8/hqdefault.jpg', duration: '4:21' },
  { videoId: 'RLzC55ai0eo', title: 'Heeriye (feat. Arijit Singh)', artist: 'Jasleen Royal, Arijit Singh', thumbnail: 'https://i.ytimg.com/vi/RLzC55ai0eo/hqdefault.jpg', duration: '3:15' },
  { videoId: '2qK_q9g5d8k', title: 'Satranga (From "ANIMAL")', artist: 'Arijit Singh, Shreyas Puranik', thumbnail: 'https://i.ytimg.com/vi/2qK_q9g5d8k/hqdefault.jpg', duration: '4:31' },
  { videoId: 'k4yXQkGLeAA', title: 'O Maahi (From "Dunki")', artist: 'Pritam, Arijit Singh', thumbnail: 'https://i.ytimg.com/vi/k4yXQkGLeAA/hqdefault.jpg', duration: '3:53' },
  { videoId: 'YxWlaYCA8MU', title: 'Pehle Bhi Main (From "ANIMAL")', artist: 'Vishal Mishra, Raj Shekhar', thumbnail: 'https://i.ytimg.com/vi/YxWlaYCA8MU/hqdefault.jpg', duration: '4:10' },
  { videoId: 'LK7-_dgAVQE', title: 'Tauba Tauba (From "Bad Newz")', artist: 'Karan Aujla', thumbnail: 'https://i.ytimg.com/vi/LK7-_dgAVQE/hqdefault.jpg', duration: '3:32' },
  { videoId: 'yJg-Y5byMMw', title: 'Tum Se (From "Teri Baaton Mein")', artist: 'Sachin-Jigar, Raghav Chaitanya', thumbnail: 'https://i.ytimg.com/vi/yJg-Y5byMMw/hqdefault.jpg', duration: '4:24' },
];

export const instantPunjabiTracks = [
  { videoId: 'LK7-_dgAVQE', title: 'Tauba Tauba (From "Bad Newz")', artist: 'Karan Aujla', thumbnail: 'https://i.ytimg.com/vi/LK7-_dgAVQE/hqdefault.jpg', duration: '3:32' },
  { videoId: 'cl0a3i2wFcc', title: 'Lover', artist: 'Diljit Dosanjh', thumbnail: 'https://i.ytimg.com/vi/cl0a3i2wFcc/hqdefault.jpg', duration: '3:05' },
  { videoId: 'cWMxCE2HTag', title: 'Softly', artist: 'Karan Aujla, Ikky', thumbnail: 'https://i.ytimg.com/vi/cWMxCE2HTag/hqdefault.jpg', duration: '2:36' },
  { videoId: 'vX2cDW8LUWk', title: '52 Bars', artist: 'Karan Aujla, Ikky', thumbnail: 'https://i.ytimg.com/vi/vX2cDW8LUWk/hqdefault.jpg', duration: '3:45' },
  { videoId: 'dCmp56tSSmA', title: 'Hass Hass', artist: 'Diljit Dosanjh, Sia', thumbnail: 'https://i.ytimg.com/vi/dCmp56tSSmA/hqdefault.jpg', duration: '2:34' },
  { videoId: 'Tpu8Pz_pAqw', title: 'Cheques', artist: 'Shubh', thumbnail: 'https://i.ytimg.com/vi/Tpu8Pz_pAqw/hqdefault.jpg', duration: '3:03' },
  { videoId: 'tms3r96Qn6M', title: 'With You', artist: 'AP Dhillon', thumbnail: 'https://i.ytimg.com/vi/tms3r96Qn6M/hqdefault.jpg', duration: '2:33' },
  { videoId: 'hBCcW_2pU8U', title: 'Born to Shine', artist: 'Diljit Dosanjh', thumbnail: 'https://i.ytimg.com/vi/hBCcW_2pU8U/hqdefault.jpg', duration: '3:32' },
];

const defaultPlaylists = [
  {
    id: 'pl-desi-hits',
    title: 'Desi Chill & Bollywood',
    description: 'Arijit Singh, Shreya Ghoshal & soulful melodies',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80',
    tracks: instantDesiTracks,
    createdAt: Date.now(),
  },
  {
    id: 'pl-punjabi-power',
    title: 'Punjabi Fire Wave',
    description: 'High energy beats by Diljit, Karan Aujla, AP Dhillon',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80',
    tracks: instantPunjabiTracks,
    createdAt: Date.now(),
  },
  {
    id: 'pl-haryanvi-top-hits',
    title: 'Haryanvi Top Beats',
    description: 'High-energy desi bangers by Sapna Choudhary, Renuka Panwar, Dhanda Nyoliwala & Gulzaar',
    cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&auto=format&fit=crop&q=80',
    tracks: instantHaryanviTracks,
    createdAt: Date.now(),
  },
];

const loadSavedPlaylists = () => {
  const loaded = loadSaved('tunetide_playlists', defaultPlaylists);
  if (Array.isArray(loaded)) {
    defaultPlaylists.forEach((defPl) => {
      const existing = loaded.find((p) => p.id === defPl.id);
      if (!existing) {
        loaded.push(defPl);
      } else if (!Array.isArray(existing.tracks) || existing.tracks.length === 0) {
        existing.tracks = defPl.tracks;
      }
    });

    // Cleanse regional playlists from cross-contamination
    const haryanviPl = loaded.find((p) => p.id === 'pl-haryanvi-top-hits');
    if (haryanviPl && Array.isArray(haryanviPl.tracks)) {
      haryanviPl.tracks = haryanviPl.tracks.filter(
        (t) => isStrictHaryanvi(t) && !hasPunjabiSignature(t)
      );
      if (haryanviPl.tracks.length === 0) {
        haryanviPl.tracks = instantHaryanviTracks;
      }
    }

    const punjabiPl = loaded.find((p) => p.id === 'pl-punjabi-power');
    if (punjabiPl && Array.isArray(punjabiPl.tracks)) {
      punjabiPl.tracks = punjabiPl.tracks.filter(
        (t) => isStrictPunjabi(t) && !hasHaryanviSignature(t)
      );
      if (punjabiPl.tracks.length === 0) {
        punjabiPl.tracks = instantPunjabiTracks;
      }
    }

    saveItem('tunetide_playlists', loaded);
    return loaded;
  }
  return defaultPlaylists;
};

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
  playlists: loadSavedPlaylists(),
  favoriteArtists: loadSaved('tunetide_fav_artists', []),
  offlineTracks: [],
  isAddToPlaylistModalOpen: false,
  songToAddToPlaylist: null,
  isEqualizerModalOpen: false,
  equalizerPreset: loadSaved('tunetide_eq_preset', 'studio'),
  audioQuality: loadSaved('tunetide_audio_bitrate', '320'),
  crossfadeStyle: loadSaved('tunetide_crossfade_style', 'smart'),
  playTrigger: 0,
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    // Hydrate everything from Cloud Database on Login/Refresh for 100% Data Uniformity
    loadCloudUserData: (state, action) => {
      const { favorites, playlists, favoriteArtists, themeMode } = action.payload || {};

      // 1. Favorites: Smart merge so neither local nor cloud favorites are ever lost
      if (Array.isArray(favorites)) {
        const favMap = new Map();
        (state.favorites || []).forEach((f) => {
          const vid = f && (f.videoId || f.id);
          if (vid) favMap.set(vid, f);
        });
        favorites.forEach((f) => {
          const vid = f && (f.videoId || f.id);
          if (vid) favMap.set(vid, f);
        });
        state.favorites = Array.from(favMap.values());
        saveItem('tunetide_favorites', state.favorites);
      }

      // 2. Playlists: Guarantee tracks is array, ensure defaultPlaylists exist, and merge all playlists
      if (Array.isArray(playlists)) {
        const plMap = new Map();
        // Load default playlists first
        defaultPlaylists.forEach((defPl) => plMap.set(defPl.id, defPl));
        // Merge existing state playlists
        (state.playlists || []).forEach((p) => {
          if (p && p.id) plMap.set(p.id, p);
        });
        // Merge cloud playlists
        playlists.forEach((p) => {
          if (p && p.id) {
            const existing = plMap.get(p.id);
            if (existing && Array.isArray(existing.tracks) && existing.tracks.length > 0 && (!p.tracks || p.tracks.length === 0)) {
              plMap.set(p.id, existing);
            } else {
              plMap.set(p.id, p);
            }
          }
        });

        state.playlists = Array.from(plMap.values()).map((p) => ({
          ...p,
          tracks: Array.isArray(p.tracks) ? p.tracks : [],
        }));
        saveItem('tunetide_playlists', state.playlists);
      }

      // 3. Favorite Artists: Smart merge
      if (Array.isArray(favoriteArtists)) {
        const artMap = new Map();
        (state.favoriteArtists || []).forEach((a) => {
          if (a?.name) artMap.set(a.name.toLowerCase(), a);
        });
        favoriteArtists.forEach((a) => {
          if (a?.name) artMap.set(a.name.toLowerCase(), a);
        });
        state.favoriteArtists = Array.from(artMap.values());
        saveItem('tunetide_fav_artists', state.favoriteArtists);
      }

      // 4. Theme
      if (themeMode) {
        state.themeMode = themeMode;
        saveItem('tunetide_theme', themeMode);
        if (typeof document !== 'undefined') {
          if (themeMode === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        }
      }
    },

    resetUserLibrary: (state) => {
      state.favorites = [];
      state.playlists = defaultPlaylists;
      state.favoriteArtists = [];
      saveItem('tunetide_favorites', []);
      saveItem('tunetide_playlists', defaultPlaylists);
      saveItem('tunetide_fav_artists', []);
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
      state.playTrigger = Date.now();

      if (Array.isArray(songs) && songs.length > 0) {
        state.currentSongs = songs.map(normalizeSong).filter(Boolean);
        const foundIdx = state.currentSongs.findIndex((s) => s.videoId === normalized.videoId);
        state.currentIndex = foundIdx >= 0 ? foundIdx : (typeof index === 'number' ? index : 0);
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
      const { tracks = [], startIndex } = action.payload || {};
      if (!tracks.length) return;

      const normalized = tracks.map(normalizeSong).filter(Boolean);
      state.currentSongs = normalized;
      state.shuffle = true;
      const chosenIdx = (typeof startIndex === 'number' && startIndex >= 0 && startIndex < normalized.length)
        ? startIndex
        : Math.floor(Math.random() * normalized.length);
      state.currentIndex = chosenIdx;
      state.activeSong = normalized[chosenIdx];
      state.isActive = true;
      state.isPlaying = true;
      state.currentTime = 0;
      state.playTrigger = Date.now();
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
        state.playTrigger = Date.now();
        return;
      }

      let nextIndex = state.currentIndex + 1;
      if (state.shuffle) {
        if (state.currentSongs.length > 1) {
          let randomIdx = state.currentIndex;
          let attempts = 0;
          while (randomIdx === state.currentIndex && attempts < 20) {
            randomIdx = Math.floor(Math.random() * state.currentSongs.length);
            attempts++;
          }
          nextIndex = randomIdx;
        } else {
          nextIndex = 0;
        }
      } else if (nextIndex >= state.currentSongs.length) {
        // In simple mode, smoothly loop back to start of current list for continuous uninterrupted playback
        nextIndex = 0;
      }

      state.currentIndex = nextIndex;
      state.activeSong = state.currentSongs[nextIndex];
      state.currentTime = 0;
      state.isPlaying = true;
      state.playTrigger = Date.now();

      if (state.activeSong) {
        const filteredRecent = state.recentTracks.filter((t) => t.videoId !== state.activeSong.videoId);
        state.recentTracks = [state.activeSong, ...filteredRecent].slice(0, 30);
        saveItem('tunetide_recent', state.recentTracks);
      }
    },

    syncCurrentTrack: (state, action) => {
      const { track, index } = action.payload || {};
      if (!track) return;
      const normalized = normalizeSong(track);
      if (!normalized) return;
      state.activeSong = normalized;
      state.currentIndex = typeof index === 'number' ? index : state.currentIndex;
      state.isPlaying = true;
      state.currentTime = 0;

      const filteredRecent = state.recentTracks.filter((t) => t.videoId !== normalized.videoId);
      state.recentTracks = [normalized, ...filteredRecent].slice(0, 30);
      saveItem('tunetide_recent', state.recentTracks);
    },

    prevSong: (state) => {
      if (!state.currentSongs.length) return;

      if (state.currentTime > 3) {
        state.currentTime = 0;
        state.playTrigger = Date.now();
        return;
      }

      let prevIndex = state.currentIndex - 1;
      if (state.shuffle) {
        if (state.currentSongs.length > 1) {
          let randomIdx = state.currentIndex;
          let attempts = 0;
          while (randomIdx === state.currentIndex && attempts < 20) {
            randomIdx = Math.floor(Math.random() * state.currentSongs.length);
            attempts++;
          }
          prevIndex = randomIdx;
        } else {
          prevIndex = 0;
        }
      } else if (prevIndex < 0) {
        prevIndex = state.currentSongs.length - 1;
      }

      state.currentIndex = prevIndex;
      state.activeSong = state.currentSongs[prevIndex];
      state.currentTime = 0;
      state.isPlaying = true;
      state.playTrigger = Date.now();
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
      const { id, title, description = '', initialTrack = null, cover = '' } = action.payload || {};
      const normInitial = initialTrack ? normalizeSong(initialTrack) : null;
      const initialTracks = normInitial ? [normInitial] : [];
      const newPlaylist = {
        id: id || `pl-${Date.now()}`,
        title: (title && title.trim()) || 'My Desi Playlist',
        description,
        cover: normInitial?.thumbnail || cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
        tracks: initialTracks,
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

    renamePlaylist: (state, action) => {
      const { id, title } = action.payload || {};
      if (!id || !title || !title.trim()) return;
      state.playlists = state.playlists.map((pl) => {
        if (pl.id === id) {
          return { ...pl, title: title.trim() };
        }
        return pl;
      });
      saveItem('tunetide_playlists', state.playlists);
      triggerCloudSync(state);
    },

    addTrackToPlaylist: (state, action) => {
      const { playlistId, song } = action.payload;
      const norm = normalizeSong(song);
      if (!norm) return;

      state.playlists = state.playlists.map((pl) => {
        if (pl.id === playlistId) {
          const currentTracks = Array.isArray(pl.tracks) ? pl.tracks : [];
          const alreadyIn = currentTracks.some((t) => isSameSong(t, norm));
          if (!alreadyIn) {
            const newTracks = [...currentTracks, norm];
            const firstImg = newTracks[0]?.thumbnail || newTracks[0]?.cover || newTracks[0]?.image;
            return {
              ...pl,
              tracks: newTracks,
              cover: firstImg || pl.cover,
            };
          }
        }
        return pl;
      });
      saveItem('tunetide_playlists', state.playlists);
      triggerCloudSync(state);
    },

    removeTrackFromPlaylist: (state, action) => {
      const { playlistId, videoId, song } = action.payload || {};
      const target = song ? normalizeSong(song) : { videoId };
      state.playlists = state.playlists.map((pl) => {
        if (pl.id === playlistId) {
          const currentTracks = Array.isArray(pl.tracks) ? pl.tracks : [];
          const newTracks = currentTracks.filter((t) => !isSameSong(t, target));
          const firstImg = newTracks.length > 0 ? (newTracks[0]?.thumbnail || newTracks[0]?.cover || newTracks[0]?.image) : null;
          return {
            ...pl,
            tracks: newTracks,
            cover: firstImg || pl.cover,
          };
        }
        return pl;
      });
      saveItem('tunetide_playlists', state.playlists);
      triggerCloudSync(state);
    },

    setPlaylistTracks: (state, action) => {
      const { playlistId, tracks = [] } = action.payload || {};
      if (!playlistId) return;
      const normalized = tracks.map(normalizeSong).filter(Boolean);
      state.playlists = state.playlists.map((pl) => {
        if (pl.id === playlistId) {
          const firstImg = normalized.length > 0 ? (normalized[0]?.thumbnail || normalized[0]?.cover || normalized[0]?.image) : null;
          return {
            ...pl,
            tracks: normalized,
            cover: pl.cover || firstImg,
          };
        }
        return pl;
      });
      saveItem('tunetide_playlists', state.playlists);
      triggerCloudSync(state);
    },

    appendQueueTracks: (state, action) => {
      const { newTracks = [] } = action.payload || {};
      if (!Array.isArray(newTracks) || newTracks.length === 0) return;
      if (!state.currentSongs || state.currentSongs.length === 0) return;

      const existingIds = new Set(state.currentSongs.map((s) => s.videoId).filter(Boolean));
      const filteredNew = newTracks.map(normalizeSong).filter((s) => s && s.videoId && !existingIds.has(s.videoId));

      if (filteredNew.length > 0) {
        state.currentSongs = [...state.currentSongs, ...filteredNew];
        try {
          playerEngine.setQueue(state.currentSongs, state.currentIndex, state.shuffle, state.repeatMode);
        } catch (e) {}
      }
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

    setCrossfadeStyle: (state, action) => {
      const style = action.payload;
      state.crossfadeStyle = style;
      saveItem('tunetide_crossfade_style', style);
      const secondsMap = { smart: 4, smooth: 6, long: 8, off: 0 };
      const sec = secondsMap[style] !== undefined ? secondsMap[style] : 4;
      try {
        playerEngine.setCrossfadeSeconds(sec);
      } catch (e) {}
    },
  },
});

export const {
  loadCloudUserData,
  resetUserLibrary,
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
  renamePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  openAddToPlaylistModal,
  closeAddToPlaylistModal,
  setOfflineTracks,
  addToQueue,
  clearQueue,
  syncCurrentTrack,
  setPlaylistTracks,
  appendQueueTracks,
  setIsEqualizerModalOpen,
  setEqualizerPreset,
  setAudioQuality,
  setCrossfadeStyle,
} = playerSlice.actions;

// Centralized shuffle play thunk to unlock audio and set full queue across all devices
export const shufflePlayTracks = ({ tracks = [], startIndex }) => (dispatch, getState) => {
  if (!Array.isArray(tracks) || !tracks.length) return;
  const normalized = tracks.map(normalizeSong).filter(Boolean);
  if (!normalized.length) return;

  const chosenIdx = (typeof startIndex === 'number' && startIndex >= 0 && startIndex < normalized.length)
    ? startIndex
    : Math.floor(Math.random() * normalized.length);
  const startSong = normalized[chosenIdx];
  const { repeatMode } = getState().player;

  try {
    playerEngine.unlockAudio();
    playerEngine.pushPlaybackHistory(playerEngine.queueIndex);
    playerEngine.setQueue(normalized, chosenIdx, true, repeatMode);
    playerEngine.loadVideo(startSong.videoId || startSong, true, startSong);
  } catch (e) {
    console.warn('playerEngine shufflePlayTracks error:', e);
  }

  dispatch(playPlaylistWithShuffle({ tracks: normalized, startIndex: chosenIdx }));
};

// Centralized synchronous action for 100% reliable click-to-play across all devices & browsers
export const playTrackNow = ({ song, songs = [], index = 0 }) => (dispatch, getState) => {
  if (!song) return;
  const normalized = normalizeSong(song);
  if (!normalized || (!normalized.videoId && !normalized.title)) return;

  const currentSongsList = Array.isArray(songs) && songs.length > 0 ? songs : [normalized];
  const { shuffle, repeatMode } = getState().player;

  try {
    playerEngine.unlockAudio();
    playerEngine.pushPlaybackHistory(playerEngine.queueIndex);
    playerEngine.setQueue(currentSongsList, index, shuffle, repeatMode);
    playerEngine.loadVideo(normalized.videoId || normalized, true, normalized);
  } catch (e) {
    console.warn('playerEngine loadVideo failed in playTrackNow:', e);
  }

  dispatch(playSong({ song: normalized, songs: currentSongsList, index }));
};

// Autonomous next/prev track actions that execute instantly on both lock-screen and in-app
export const playNextTrackNow = () => (dispatch) => {
  playerEngine.unlockAudio();
  playerEngine.playNextTrack(true);
};

export const playPrevTrackNow = () => (dispatch) => {
  playerEngine.unlockAudio();
  playerEngine.playPreviousTrack();
};

// Centralized play/pause action for 100% reliable audio engine & UI state synchronization
export const togglePlayPauseNow = () => (dispatch, getState) => {
  const { isPlaying, activeSong } = getState().player;
  if (!activeSong) return;

  if (isPlaying) {
    try {
      playerEngine.pause();
    } catch (e) {
      console.warn('playerEngine.pause error:', e);
    }
    dispatch(playPause(false));
  } else {
    try {
      playerEngine.unlockAudio();
      playerEngine.play();
    } catch (e) {
      console.warn('playerEngine.play error:', e);
    }
    dispatch(playPause(true));
  }
};

export default playerSlice.reducer;
