import { getOfflineTrack } from './offlineStorage';
import { API_BASE } from './apiConfig';
import { isValidVideoId } from '../utils/normalizeSong';

class PlayerEngine {
  constructor() {
    this.ytPlayer = null;
    this.isReady = false;
    this.pendingVideoId = null;
    this.pendingAutoPlay = false;
    this.timeUpdateTimer = null;
    this.currentTrack = null;
    this.currentVideoId = null;
    this.currentTrackKey = null;
    this.isOfflinePlayback = false;
    this.isDirectAudio = false;
    this.audioEl = null;
    this.offlineAudioEl = null;
    this.bgAnchorEl = null;
    this.wakeLock = null;
    this.shouldBePlaying = false;
    this.isUserPaused = false;
    this.activeAbortController = null;
    this.currentVolume = 0.8;
    this.streamCache = new Map();

    // Autonomous playlist queue for uninterrupted background & lock-screen playback
    this.queue = [];
    this.queueIndex = 0;
    this.isShuffle = false;
    this.repeatMode = 'off';

    try {
      const saved = localStorage.getItem('tunetide_volume');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'number' && !isNaN(parsed)) this.currentVolume = parsed;
      }
    } catch (e) {}

    this.listeners = {
      timeUpdate: () => {},
      stateChange: () => {},
      ended: () => {},
      durationChange: () => {},
      next: () => {},
      prev: () => {},
      onTrackChanged: () => {},
    };

    this.initDirectAudio();
    this.initYouTube();
    this.initMediaSession();
    this.initVisibilityListener();
  }

  startBackgroundAudioAnchor(force = false) {
    if (typeof window === 'undefined') return;
    try {
      if (!this.bgAnchorEl) {
        this.bgAnchorEl = new Audio();
        // 1-second silent WAV base64
        this.bgAnchorEl.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        this.bgAnchorEl.loop = true;
        this.bgAnchorEl.volume = 0.01;
        this.bgAnchorEl.setAttribute('playsinline', 'true');
      }
      const p = this.bgAnchorEl.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    } catch (e) {}
  }

  stopBackgroundAudioAnchor() {
    try {
      if (this.bgAnchorEl && !this.bgAnchorEl.paused) {
        this.bgAnchorEl.pause();
      }
    } catch (e) {}
  }

  initVisibilityListener() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Returned to tab / PWA foreground
        if (this.shouldBePlaying && !this.isUserPaused) {
          if (this.isDirectAudio || this.isOfflinePlayback) {
            if (this.audioEl && this.audioEl.paused) {
              this.audioEl.play().catch(() => {});
            }
          } else if (this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
            try {
              if (typeof this.ytPlayer.unMute === 'function') this.ytPlayer.unMute();
              this.ytPlayer.playVideo();
            } catch (e) {}
          }
          this.updateMediaSessionState('playing');
          this.listeners.stateChange(true);
        }
      }
    });
  }

  initDirectAudio() {
    if (typeof window === 'undefined') return;
    this.audioEl = document.getElementById('dhun-native-player') || new Audio();
    this.audioEl.preload = 'auto';
    this.audioEl.volume = this.currentVolume;
    this.audioEl.muted = false;
    this.audioEl.setAttribute('playsinline', 'true');
    this.audioEl.setAttribute('webkit-playsinline', 'true');
    this.audioEl.id = 'dhun-native-player';
    this.offlineAudioEl = this.audioEl; // Backwards-compatibility alias

    let anchor = document.getElementById('dhun-anchor-player');
    if (anchor) {
      this.bgAnchorEl = anchor;
      this.bgAnchorEl.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      this.bgAnchorEl.loop = true;
      this.bgAnchorEl.volume = 0.01;
      this.bgAnchorEl.setAttribute('playsinline', 'true');
    }

    // Ensure audio element is mounted into DOM container so mobile OS never suspends it
    try {
      let container = document.getElementById('yt-audio-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'yt-audio-container';
        container.style.cssText = 'position:fixed;bottom:0;right:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:0;overflow:hidden;border:none;';
        document.body.appendChild(container);
      }
      if (!document.getElementById('dhun-native-player')) {
        container.appendChild(this.audioEl);
      }
    } catch (e) {}

    this.audioEl.addEventListener('timeupdate', () => {
      if (this.isDirectAudio || this.isOfflinePlayback) {
        const cur = this.audioEl.currentTime;
        this.listeners.timeUpdate(cur);
        this.updateMediaSessionPosition(cur);
      }
    });

    this.audioEl.addEventListener('loadedmetadata', () => {
      if (this.isDirectAudio || this.isOfflinePlayback) {
        if (this.audioEl.duration && !isNaN(this.audioEl.duration)) {
          this.listeners.durationChange(this.audioEl.duration);
        }
      }
    });

    this.audioEl.addEventListener('durationchange', () => {
      if (this.isDirectAudio || this.isOfflinePlayback) {
        if (this.audioEl.duration && !isNaN(this.audioEl.duration)) {
          this.listeners.durationChange(this.audioEl.duration);
        }
      }
    });

    this.audioEl.addEventListener('play', () => {
      if (this.isDirectAudio || this.isOfflinePlayback) {
        this.shouldBePlaying = true;
        this.isUserPaused = false;
        this.stopBackgroundAudioAnchor();
        this.listeners.stateChange(true);
        this.updateMediaSessionState('playing');
        this.requestWakeLock();
      }
    });

    this.audioEl.addEventListener('pause', () => {
      if (this.isDirectAudio || this.isOfflinePlayback) {
        if (this.isUserPaused) {
          this.listeners.stateChange(false);
          this.updateMediaSessionState('paused');
          this.releaseWakeLock();
        }
      }
    });

    this.audioEl.addEventListener('ended', () => {
      if (this.isDirectAudio || this.isOfflinePlayback) {
        // Keep audio context alive seamlessly across track handoff
        this.startBackgroundAudioAnchor(true);
        this.playNextTrack(false);
      }
    });

    this.audioEl.addEventListener('error', (err) => {
      if (!this.audioEl?.src || this.audioEl.src.startsWith('data:') || this.audioEl.src === window.location.href) return;
      if (!this.isDirectAudio && !this.isOfflinePlayback) return;
      console.warn('Direct native audio stream error, falling back to YouTube:', err);
      if (this.currentVideoId && !this.isOfflinePlayback) {
        this.fallbackToYouTube(this.currentVideoId, this.shouldBePlaying);
      }
    });
  }

  initOfflineAudio() {
    // Deprecated in favor of unified initDirectAudio
  }

  initYouTube() {
    if (typeof window === 'undefined') return;

    // Ensure YouTube Iframe API script tag is injected in PWA/mobile
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    }

    const setupPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        setTimeout(setupPlayer, 150);
        return;
      }

      let container = document.getElementById('yt-audio-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'yt-audio-container';
        container.style.cssText = 'position:fixed;bottom:0;right:0;width:240px;height:240px;opacity:0.999;pointer-events:none;z-index:0;overflow:hidden;border:none;';
        document.body.appendChild(container);
      }

      let ytDiv = document.getElementById('yt-player-target');
      if (!ytDiv) {
        ytDiv = document.createElement('div');
        ytDiv.id = 'yt-player-target';
        container.appendChild(ytDiv);
      }

      try {
        const originUrl = typeof window !== 'undefined' && window.location.origin && window.location.origin.startsWith('http')
          ? window.location.origin
          : undefined;

        this.ytPlayer = new window.YT.Player('yt-player-target', {
          height: '100%',
          width: '100%',
          host: 'https://www.youtube.com',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            rel: 0,
            enablejsapi: 1,
            ...(originUrl ? { origin: originUrl } : {}),
          },
          events: {
            onReady: () => {
              this.isReady = true;
              if (this.pendingVideoId) {
                this.loadVideo(this.pendingVideoId, this.pendingAutoPlay, this.currentTrack);
                this.pendingVideoId = null;
              }
            },
            onStateChange: (event) => {
              if (this.isOfflinePlayback || this.isDirectAudio) return;
              if (event.data === 1) { // Playing
                this.shouldBePlaying = true;
                this.isUserPaused = false;
                this.startTimeTracking();
                this.listeners.stateChange(true);
                this.requestWakeLock();
                try {
                  if (typeof this.ytPlayer.unMute === 'function') this.ytPlayer.unMute();
                  if (typeof this.ytPlayer.setVolume === 'function') this.ytPlayer.setVolume(Math.round((this.currentVolume ?? 0.8) * 100));
                  // Force highest bitrate audio stream (Spotify Pro quality)
                  if (typeof this.ytPlayer.setPlaybackQuality === 'function') {
                    this.ytPlayer.setPlaybackQuality('highres');
                  }
                } catch (e) {}
                const dur = this.ytPlayer.getDuration();
                if (dur && dur > 0) {
                  this.listeners.durationChange(dur);
                  this.updateMediaSessionPosition();
                }
                this.updateMediaSessionState('playing');
              } else if (event.data === 2) { // Paused
                if (this.isUserPaused) {
                  this.stopTimeTracking();
                  this.listeners.stateChange(false);
                  this.releaseWakeLock();
                  this.stopBackgroundAudioAnchor();
                  this.updateMediaSessionState('paused');
                  return;
                }

                // If paused by OS or Chrome during screen-lock / tab switch:
                if (this.shouldBePlaying) {
                  // Keep audio anchor alive to hold background audio focus
                  this.startBackgroundAudioAnchor();
                  this.updateMediaSessionState('playing');

                  // Attempt immediate resume
                  try {
                    if (this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
                      this.ytPlayer.playVideo();
                    }
                  } catch (e) {}
                  const iframe = document.getElementById('yt-audio-container')?.querySelector('iframe');
                  if (iframe && iframe.contentWindow) {
                    try {
                      iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                    } catch (e) {}
                  }

                  // Schedule a backup resume after 150ms
                  setTimeout(() => {
                    if (this.shouldBePlaying && !this.isUserPaused && this.ytPlayer && typeof this.ytPlayer.getPlayerState === 'function') {
                      if (this.ytPlayer.getPlayerState() !== 1) {
                        try { this.ytPlayer.playVideo(); } catch (e) {}
                      }
                    }
                  }, 150);
                  return;
                }
                this.stopTimeTracking();
                this.listeners.stateChange(false);
                this.releaseWakeLock();
                this.stopBackgroundAudioAnchor();
                this.updateMediaSessionState('paused');
              } else if (event.data === 0) { // Ended
                this.shouldBePlaying = false;
                this.stopTimeTracking();
                this.playNextTrack(false);
              } else if (event.data === 5 || event.data === 3 || event.data === -1) {
                // Video Cued (5), Buffering (3), or Unstarted (-1) -> auto-play watchdog
                if (this.shouldBePlaying && !this.isUserPaused) {
                  try {
                    this.ytPlayer.playVideo();
                  } catch (e) {}
                  setTimeout(() => {
                    if (this.shouldBePlaying && !this.isUserPaused && this.ytPlayer && typeof this.ytPlayer.getPlayerState === 'function') {
                      const st = this.ytPlayer.getPlayerState();
                      if (st !== 1) {
                        try { this.ytPlayer.playVideo(); } catch (e) {}
                      }
                    }
                  }, 1200);
                }
              }
            },
            onError: (event) => {
              if (this.isDirectAudio || this.isOfflinePlayback) return;
              console.warn('YouTube Player Event Error:', event.data);
              // Video restricted on mobile / embedding disabled (101, 150) or invalid (2, 100) -> auto advance
              if (event.data === 150 || event.data === 101 || event.data === 100 || event.data === 2) {
                setTimeout(() => {
                  if (!this.isDirectAudio && !this.isOfflinePlayback) {
                    this.listeners.next();
                  }
                }, 400);
              }
            },
          },
        });
      } catch (err) {
        console.error('Error creating YT.Player:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      setupPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        setupPlayer();
      };
      setTimeout(setupPlayer, 600);
    }
  }

  setListeners({ onTimeUpdate, onStateChange, onEnded, onDurationChange, onNext, onPrev, onTrackChanged }) {
    if (onTimeUpdate) this.listeners.timeUpdate = onTimeUpdate;
    if (onStateChange) this.listeners.stateChange = onStateChange;
    if (onEnded) this.listeners.ended = onEnded;
    if (onDurationChange) this.listeners.durationChange = onDurationChange;
    if (onNext) this.listeners.next = onNext;
    if (onPrev) this.listeners.prev = onPrev;
    if (onTrackChanged) this.listeners.onTrackChanged = onTrackChanged;
  }

  setQueue(songs = [], currentIndex = 0, shuffle = false, repeatMode = 'off') {
    this.queue = Array.isArray(songs) ? songs : [];
    this.queueIndex = typeof currentIndex === 'number' ? currentIndex : 0;
    this.isShuffle = !!shuffle;
    this.repeatMode = repeatMode || 'off';

    // Pre-fetch next track in background so lock screen handoff is 0ms
    this.prefetchNextInQueue();
  }

  prefetchNextInQueue() {
    if (!this.queue || this.queue.length <= 1) return;
    let nextIdx = this.queueIndex + 1;
    if (this.isShuffle) {
      if (this.queue.length > 1) {
        let randomIdx = this.queueIndex;
        let attempts = 0;
        while (randomIdx === this.queueIndex && attempts < 20) {
          randomIdx = Math.floor(Math.random() * this.queue.length);
          attempts++;
        }
        nextIdx = randomIdx;
      }
    } else if (nextIdx >= this.queue.length) {
      nextIdx = 0;
    }
    const upcomingTrack = this.queue[nextIdx];
    if (upcomingTrack) {
      this.prefetchTrack(upcomingTrack);
    }
  }

  playNextTrack(fromLockScreen = false) {
    if (!this.queue || this.queue.length === 0) {
      if (this.listeners.next) this.listeners.next();
      return;
    }

    if (this.repeatMode === 'one' && !fromLockScreen) {
      if (this.audioEl) {
        this.audioEl.currentTime = 0;
        this.audioEl.play().catch(() => {});
        this.updateMediaSessionState('playing');
        return;
      }
    }

    let nextIndex = this.queueIndex + 1;
    if (this.isShuffle) {
      if (this.queue.length > 1) {
        let randomIdx = this.queueIndex;
        let attempts = 0;
        while (randomIdx === this.queueIndex && attempts < 20) {
          randomIdx = Math.floor(Math.random() * this.queue.length);
          attempts++;
        }
        nextIndex = randomIdx;
      } else {
        nextIndex = 0;
      }
    } else if (nextIndex >= this.queue.length) {
      nextIndex = 0;
    }

    this.queueIndex = nextIndex;
    const nextTrack = this.queue[nextIndex];
    if (nextTrack) {
      const vId = nextTrack.videoId || nextTrack.id;
      this.currentTrack = nextTrack;
      this.updateMediaMetadata(nextTrack);
      this.updateMediaSessionState('playing');

      this.loadVideo(vId || nextTrack, true, nextTrack);

      if (typeof this.listeners.onTrackChanged === 'function') {
        this.listeners.onTrackChanged(nextTrack, nextIndex);
      }

      this.prefetchNextInQueue();
    }
  }

  playPreviousTrack() {
    if (!this.queue || this.queue.length === 0) {
      if (this.listeners.prev) this.listeners.prev();
      return;
    }

    if (this.getCurrentTime() > 3) {
      this.seekTo(0);
      return;
    }

    let prevIndex = this.queueIndex - 1;
    if (this.isShuffle) {
      if (this.queue.length > 1) {
        let randomIdx = this.queueIndex;
        let attempts = 0;
        while (randomIdx === this.queueIndex && attempts < 20) {
          randomIdx = Math.floor(Math.random() * this.queue.length);
          attempts++;
        }
        prevIndex = randomIdx;
      } else {
        prevIndex = 0;
      }
    } else if (prevIndex < 0) {
      prevIndex = this.queue.length - 1;
    }

    this.queueIndex = prevIndex;
    const prevTrack = this.queue[prevIndex];
    if (prevTrack) {
      const vId = prevTrack.videoId || prevTrack.id;
      this.currentTrack = prevTrack;
      this.updateMediaMetadata(prevTrack);
      this.updateMediaSessionState('playing');

      this.loadVideo(vId || prevTrack, true, prevTrack);

      if (typeof this.listeners.onTrackChanged === 'function') {
        this.listeners.onTrackChanged(prevTrack, prevIndex);
      }

      this.prefetchNextInQueue();
    }
  }

  initMediaSession() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        this.isUserPaused = false;
        this.shouldBePlaying = true;
        this.updateMediaSessionState('playing');
        this.listeners.stateChange(true);
        this.play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.isUserPaused = true;
        this.shouldBePlaying = false;
        this.updateMediaSessionState('paused');
        this.listeners.stateChange(false);
        this.pause();
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        this.isUserPaused = true;
        this.shouldBePlaying = false;
        this.updateMediaSessionState('paused');
        this.listeners.stateChange(false);
        this.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => this.playPreviousTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.playNextTrack(true));
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seekTo(details.seekTime);
          this.updateMediaSessionPosition(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        const target = Math.max(0, this.getCurrentTime() - offset);
        this.seekTo(target);
        this.updateMediaSessionPosition(target);
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        const target = this.getCurrentTime() + offset;
        this.seekTo(target);
        this.updateMediaSessionPosition(target);
      });
    } catch (e) {
      console.warn('MediaSession handler warning:', e);
    }
  }

  updateMediaMetadata(track) {
    if (!track || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      const art = track.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=512&auto=format&fit=crop&q=80';
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: track.title || 'Dhun Music',
        artist: track.artist || 'Indian Music',
        album: 'Dhun Premium',
        artwork: [
          { src: art, sizes: '96x96', type: 'image/jpeg' },
          { src: art, sizes: '128x128', type: 'image/jpeg' },
          { src: art, sizes: '192x192', type: 'image/jpeg' },
          { src: art, sizes: '256x256', type: 'image/jpeg' },
          { src: art, sizes: '512x512', type: 'image/jpeg' },
        ],
      });
    } catch (e) {}
  }

  updateMediaSessionState(state) {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = state;
      } catch (e) {}
    }
  }

  updateMediaSessionPosition(overrideTime) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
    try {
      const duration = (this.isDirectAudio || this.isOfflinePlayback)
        ? (this.audioEl?.duration || 0)
        : (this.ytPlayer?.getDuration ? this.ytPlayer.getDuration() : 0);
      const current = overrideTime !== undefined ? overrideTime : this.getCurrentTime();

      if (duration && duration > 0 && typeof current === 'number') {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: 1,
          position: Math.min(Math.max(0, current), duration),
        });
      }
    } catch (e) {}
  }

  unlockAudio() {
    if (typeof window === 'undefined') return;
    try {
      if (this.audioEl) {
        this.audioEl.volume = this.currentVolume ?? 0.8;
        this.audioEl.muted = false;
        // Prime audio element on user gesture to permanently satisfy autoplay requirements
        if (!this.audioEl.src || this.audioEl.src === window.location.href) {
          this.audioEl.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        }
        const p = this.audioEl.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      }
    } catch (e) {}
  }

  async prefetchTrack(trackMeta) {
    if (!trackMeta) return;
    const cleanVideoId = typeof trackMeta === 'object' ? (trackMeta?.videoId || trackMeta?.id) : String(trackMeta || '').trim();
    const title = trackMeta?.title || trackMeta?.name || '';
    const artist = trackMeta?.artist || trackMeta?.artists || trackMeta?.subtitle || '';
    if (!cleanVideoId && !title) return;

    const cacheKey = (cleanVideoId && cleanVideoId.length > 5 && !cleanVideoId.startsWith('tr_'))
      ? cleanVideoId
      : (title ? `${title}::${artist}`.toLowerCase().trim() : cleanVideoId);

    if (this.streamCache.has(cacheKey)) return;

    try {
      const query = `${title} ${artist}`.trim();
      const res = await fetch(
        `${API_BASE}/api/audio-stream?query=${encodeURIComponent(query)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.streamUrl) {
          const dataTitle = (data.title || '').toLowerCase().trim();
          const reqTitle = title.toLowerCase().trim();
          const cleanD = dataTitle.replace(/[^a-z0-9]/g, '');
          const cleanR = reqTitle.replace(/[^a-z0-9]/g, '');
          const isMatch = !cleanD || !cleanR || cleanD.includes(cleanR) || cleanR.includes(cleanD);
          if (isMatch) {
            this.streamCache.set(cacheKey, data);
            if (cleanVideoId) this.streamCache.set(cleanVideoId, data);
            if (title) this.streamCache.set(title.toLowerCase().trim(), data);
          }
        }
      }
    } catch (e) {}
  }

  async loadVideo(videoId, autoPlay = true, trackMeta = null) {
    if (!videoId && !trackMeta) return;

    let cleanVideoId = typeof videoId === 'object' ? (videoId?.videoId || videoId?.id) : String(videoId || '').trim();
    const title = trackMeta?.title || trackMeta?.name || '';
    const artist = trackMeta?.artist || trackMeta?.artists || trackMeta?.subtitle || '';

    // If cleanVideoId is missing or invalid, automatically resolve it via search
    if (!isValidVideoId(cleanVideoId) && title) {
      try {
        const query = `${title} ${artist}`.trim();
        const searchRes = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}&filter=songs&language=en&hl=en`);
        const searchData = await searchRes.json();
        if (searchData?.results?.[0]?.videoId) {
          cleanVideoId = searchData.results[0].videoId;
        }
      } catch (e) {}
    }

    if (!cleanVideoId && !title) return;

    const cacheKey = (cleanVideoId && cleanVideoId.length > 5 && !cleanVideoId.startsWith('tr_'))
      ? cleanVideoId
      : (title ? `${title}::${artist}`.toLowerCase().trim() : cleanVideoId);

    // GUARD: If this song is ALREADY actively playing or already loaded with direct audio, avoid duplicate abort/reset
    const isSameTrack = this.currentTrackKey && this.currentTrackKey === cacheKey;
    if (isSameTrack) {
      if (this.activeAbortController) {
        // Fetch is actively in flight for this exact song; keep waiting for it
        if (autoPlay) {
          this.shouldBePlaying = true;
          this.isUserPaused = false;
        }
        return;
      }
      if (this.isDirectAudio && this.audioEl && this.audioEl.src && !this.audioEl.src.startsWith('data:')) {
        // Already loaded direct audio for this song
        if (autoPlay) {
          this.shouldBePlaying = true;
          this.isUserPaused = false;
          if (this.audioEl.paused) {
            this.audioEl.play().catch(() => {});
          }
        }
        return;
      }
    }

    // Changing to a new track: cancel any previous in-flight fetch
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch (e) {}
      this.activeAbortController = null;
    }

    this.currentTrackKey = cacheKey;
    this.currentVideoId = cleanVideoId;
    this.currentTrack = trackMeta;
    this.updateMediaMetadata(trackMeta);

    // Pause previous audio immediately so previous song does not bleed into next song
    if (this.audioEl && !this.audioEl.paused) {
      try { this.audioEl.pause(); } catch (e) {}
    }

    if (autoPlay) {
      this.shouldBePlaying = true;
      this.isUserPaused = false;
      this.startBackgroundAudioAnchor(true);
      this.listeners.stateChange(true);
      this.updateMediaSessionState('playing');
      this.requestWakeLock();
    }

    // 1. Check if track is available offline first
    try {
      if (cleanVideoId) {
        const offlineRecord = await getOfflineTrack(cleanVideoId);
        if (offlineRecord?.audioBlob && offlineRecord.audioBlob.size > 100) {
          this.isOfflinePlayback = true;
          this.isDirectAudio = true;
          this.stopBackgroundAudioAnchor();
          if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
            try { this.ytPlayer.pauseVideo(); } catch (e) {}
          }
          const objUrl = URL.createObjectURL(offlineRecord.audioBlob);
          this.audioEl.src = objUrl;
          this.audioEl.volume = this.currentVolume ?? 0.8;
          this.audioEl.muted = false;
          if (autoPlay) {
            this.audioEl.play().catch(() => {});
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Offline check error:', e);
    }

    this.isOfflinePlayback = false;

    // Helper to start playback on this.audioEl with instant retry
    const applyDirectStream = (data) => {
      this.isDirectAudio = true;
      if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
        try { this.ytPlayer.pauseVideo(); } catch (e) {}
      }
      this.audioEl.src = data.streamUrl;
      this.audioEl.volume = this.currentVolume ?? 0.8;
      this.audioEl.muted = false;
      this.activeAbortController = null;

      if (autoPlay && this.shouldBePlaying && !this.isUserPaused) {
        const playPromise = this.audioEl.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            this.stopBackgroundAudioAnchor();
          }).catch((err) => {
            console.warn('Initial play pending, waiting for canplay event:', err);
            const onCanPlay = () => {
              this.audioEl.removeEventListener('canplay', onCanPlay);
              if (this.shouldBePlaying && !this.isUserPaused) {
                this.audioEl.play().then(() => {
                  this.stopBackgroundAudioAnchor();
                }).catch(() => {
                  if (cleanVideoId) this.fallbackToYouTube(cleanVideoId, autoPlay, trackMeta);
                });
              }
            };
            this.audioEl.addEventListener('canplay', onCanPlay, { once: true });
          });
        }
      }
    };

    // 2. Check in-memory pre-fetched cache first (INSTANT 0ms playback!)
    const cached = this.streamCache.get(cacheKey) || (cleanVideoId ? this.streamCache.get(cleanVideoId) : null) || (title ? this.streamCache.get(title.toLowerCase().trim()) : null);
    if (cached?.streamUrl) {
      applyDirectStream(cached);
      return;
    }

    // 3. Direct native HTML5 320kbps audio stream fetch
    if (title) {
      const abortCtrl = new AbortController();
      this.activeAbortController = abortCtrl;
      const timeoutId = setTimeout(() => abortCtrl.abort(), 8000);

      try {
        const query = `${title} ${artist}`.trim();
        const res = await fetch(
          `${API_BASE}/api/audio-stream?query=${encodeURIComponent(query)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`,
          { signal: abortCtrl.signal }
        );
        clearTimeout(timeoutId);

        if (this.currentTrackKey !== cacheKey) return;

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.streamUrl && this.currentTrackKey === cacheKey) {
            const dataTitle = (data.title || '').toLowerCase().trim();
            const reqTitle = title.toLowerCase().trim();
            const cleanD = dataTitle.replace(/[^a-z0-9]/g, '');
            const cleanR = reqTitle.replace(/[^a-z0-9]/g, '');
            const isMatch = !cleanD || !cleanR || cleanD.includes(cleanR) || cleanR.includes(cleanD);
            if (!isMatch) {
              console.warn('Direct stream title mismatch, falling back to YouTube:', data.title, 'vs', title);
              if (cleanVideoId) this.fallbackToYouTube(cleanVideoId, autoPlay, trackMeta);
              return;
            }

            this.streamCache.set(cacheKey, data);
            if (cleanVideoId) this.streamCache.set(cleanVideoId, data);
            if (title) this.streamCache.set(title.toLowerCase().trim(), data);
            applyDirectStream(data);
            return;
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (this.currentTrackKey !== cacheKey) return;
        console.warn('Direct stream fetch failed/timed out, falling back to YouTube:', err);
      }
      this.activeAbortController = null;
    }

    // 4. Fallback to YouTube embed if direct audio not found
    if (this.currentTrackKey === cacheKey) {
      this.fallbackToYouTube(cleanVideoId, autoPlay, trackMeta);
    }
  }

  async fallbackToYouTube(cleanVideoId, autoPlay = true, trackMeta = null) {
    this.isDirectAudio = false;
    this.isOfflinePlayback = false;
    if (this.audioEl) {
      try {
        this.audioEl.pause();
        this.audioEl.currentTime = 0;
      } catch (e) {}
    }

    let ytVid = cleanVideoId;
    if (!isValidVideoId(ytVid) && (trackMeta?.title || this.currentTrack?.title)) {
      const t = trackMeta?.title || this.currentTrack?.title || '';
      const a = trackMeta?.artist || this.currentTrack?.artist || '';
      try {
        const query = `${t} ${a}`.trim();
        const searchRes = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}&filter=songs&language=en&hl=en`);
        const searchData = await searchRes.json();
        if (searchData?.results?.[0]?.videoId) {
          ytVid = searchData.results[0].videoId;
          this.currentVideoId = ytVid;
        }
      } catch (e) {}
    }

    if (!isValidVideoId(ytVid)) {
      console.warn('Cannot fallback to YouTube: no valid videoId found for track');
      return;
    }

    if (autoPlay) {
      this.startBackgroundAudioAnchor();
    }

    if (!this.isReady || !this.ytPlayer || typeof this.ytPlayer.loadVideoById !== 'function') {
      this.pendingVideoId = ytVid;
      this.pendingAutoPlay = autoPlay;
      return;
    }

    try {
      if (typeof this.ytPlayer.unMute === 'function') this.ytPlayer.unMute();
      if (typeof this.ytPlayer.setVolume === 'function') this.ytPlayer.setVolume(Math.round((this.currentVolume ?? 0.8) * 100));
      if (autoPlay) {
        this.ytPlayer.loadVideoById(ytVid);
      } else {
        this.ytPlayer.cueVideoById(ytVid);
      }
    } catch (e) {
      console.warn('loadVideo fallback to YouTube error:', e);
    }
  }

  play() {
    this.isUserPaused = false;
    this.shouldBePlaying = true;
    this.updateMediaSessionState('playing');
    this.requestWakeLock();

    if (this.isDirectAudio || this.isOfflinePlayback || (this.audioEl && this.audioEl.src && !this.audioEl.src.startsWith('data:'))) {
      this.isDirectAudio = true;
      this.stopBackgroundAudioAnchor();
      if (this.audioEl) {
        this.audioEl.muted = false;
        if (this.audioEl.volume === 0) this.audioEl.volume = this.currentVolume ?? 0.8;
        this.audioEl.play().catch(() => {});
      }
    } else if (this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
      this.startBackgroundAudioAnchor();
      try {
        if (typeof this.ytPlayer.unMute === 'function') this.ytPlayer.unMute();
        if (typeof this.ytPlayer.setVolume === 'function') this.ytPlayer.setVolume(Math.round((this.currentVolume ?? 0.8) * 100));
        this.ytPlayer.playVideo();
      } catch (e) {}
      const iframe = document.getElementById('yt-audio-container')?.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        } catch (e) {}
      }
    }
  }

  pause() {
    this.isUserPaused = true;
    this.shouldBePlaying = false;
    this.stopBackgroundAudioAnchor();
    this.updateMediaSessionState('paused');
    this.releaseWakeLock();

    if (this.isDirectAudio || this.isOfflinePlayback) {
      if (this.audioEl) {
        this.audioEl.pause();
      }
    } else if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      try {
        this.ytPlayer.pauseVideo();
      } catch (e) {}
      const iframe = document.getElementById('yt-audio-container')?.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        } catch (e) {}
      }
    }
  }

  seekTo(seconds) {
    if (this.isDirectAudio || this.isOfflinePlayback) {
      if (this.audioEl) {
        this.audioEl.currentTime = seconds;
        this.listeners.timeUpdate(seconds);
      }
    } else if (this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
      try {
        this.ytPlayer.seekTo(seconds, true);
        this.listeners.timeUpdate(seconds);
      } catch (e) {}
    }
  }

  getCurrentTime() {
    if (this.isDirectAudio || this.isOfflinePlayback) {
      return this.audioEl?.currentTime || 0;
    }
    if (this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
      try { return this.ytPlayer.getCurrentTime() || 0; } catch (e) {}
    }
    return 0;
  }

  setVolume(fraction) {
    const vol = Math.max(0, Math.min(1, typeof fraction === 'number' && !isNaN(fraction) ? fraction : 0.8));
    this.currentVolume = vol;
    if (this.audioEl) {
      this.audioEl.volume = vol;
      this.audioEl.muted = (vol === 0);
    }
    if (this.ytPlayer) {
      try {
        if (vol === 0) {
          if (typeof this.ytPlayer.mute === 'function') this.ytPlayer.mute();
        } else {
          if (typeof this.ytPlayer.unMute === 'function') this.ytPlayer.unMute();
          if (typeof this.ytPlayer.setVolume === 'function') this.ytPlayer.setVolume(Math.round(vol * 100));
        }
      } catch (e) {}
    }
  }

  startTimeTracking() {
    this.stopTimeTracking();
    this.timeUpdateTimer = setInterval(() => {
      if (!this.isOfflinePlayback && !this.isDirectAudio && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
        try {
          const current = this.ytPlayer.getCurrentTime();
          const duration = this.ytPlayer.getDuration();
          if (typeof current === 'number') this.listeners.timeUpdate(current);
          if (typeof duration === 'number' && duration > 0) {
            this.listeners.durationChange(duration);
            if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
              try {
                navigator.mediaSession.setPositionState({
                  duration,
                  playbackRate: 1,
                  position: Math.min(Math.max(0, current), duration),
                });
              } catch (e) {}
            }
          }
        } catch (e) {}
      }
    }, 400);
  }

  stopTimeTracking() {
    if (this.timeUpdateTimer) {
      clearInterval(this.timeUpdateTimer);
      this.timeUpdateTimer = null;
    }
  }

  async requestWakeLock() {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      if (!this.wakeLock) {
        this.wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch (e) {}
  }

  releaseWakeLock() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch (e) {}
      this.wakeLock = null;
    }
  }
}

export const playerEngine = new PlayerEngine();

// First-touch global user interaction unlock for mobile phones and PWAs
if (typeof window !== 'undefined') {
  const unlockOnFirstTouch = () => {
    playerEngine.unlockAudio();
    window.removeEventListener('touchstart', unlockOnFirstTouch);
    window.removeEventListener('touchend', unlockOnFirstTouch);
    window.removeEventListener('click', unlockOnFirstTouch);
  };
  window.addEventListener('touchstart', unlockOnFirstTouch, { passive: true });
  window.addEventListener('touchend', unlockOnFirstTouch, { passive: true });
  window.addEventListener('click', unlockOnFirstTouch, { passive: true });
}

export default playerEngine;
