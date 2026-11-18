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

    // Dual-deck audio architecture for seamless gapless crossfade & automix
    this.deckA = null;
    this.deckB = null;
    this.currentDeck = null;
    this.nextDeck = null;
    this.offlineAudioEl = null;
    this.bgAnchorEl = null;
    this.wakeLock = null;
    this.shouldBePlaying = false;
    this.isUserPaused = false;
    this.activeAbortController = null;
    this.currentVolume = 0.8;
    this.streamCache = new Map();

    // Smart Automix transition settings
    this.isCrossfading = false;
    this.crossfadeTimer = null;
    this.crossfadeSeconds = 4;
    this.crossfadeAttemptedIndex = -1;
    this.isSwitchingTrack = false;
    this.playbackWatchdogTimer = null;
    try {
      let savedStyle = localStorage.getItem('tunetide_crossfade_style');
      if (savedStyle) {
        try {
          savedStyle = JSON.parse(savedStyle);
        } catch (e) {}
      }
      const secondsMap = { smart: 4, smooth: 6, long: 8, off: 0 };
      this.crossfadeSeconds = secondsMap[savedStyle] !== undefined ? secondsMap[savedStyle] : 4;
    } catch (e) {
      this.crossfadeSeconds = 4;
    }

    // Playback history stack for accurate double-tap Prev & shuffle back-navigation
    this.playbackHistory = [];
    this.lastPrevClickTime = 0;

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
    this.startPlaybackWatchdog();
  }

  // Unified accessor: any legacy or external code referencing this.audioEl receives the active deck
  get audioEl() {
    return this.currentDeck || this.deckA;
  }
  set audioEl(el) {
    this.currentDeck = el;
    if (!this.deckA) this.deckA = el;
  }

  setCrossfadeSeconds(sec, style = null) {
    this.crossfadeAttemptedIndex = -1;
    this.crossfadeSeconds = typeof sec === 'number' && !isNaN(sec) ? Math.max(0, Math.min(15, sec)) : 4;
    if (this.crossfadeSeconds === 0 && this.isCrossfading) {
      if (this.crossfadeTimer) {
        clearInterval(this.crossfadeTimer);
        this.crossfadeTimer = null;
      }
      this.isCrossfading = false;
      if (this.nextDeck) {
        try {
          this.nextDeck.pause();
          this.nextDeck.currentTime = 0;
          this.nextDeck.volume = this.currentVolume ?? 0.8;
        } catch (e) {}
      }
      if (this.currentDeck) {
        this.currentDeck.volume = this.currentVolume ?? 0.8;
      }
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const resolvedStyle = style || (
          this.crossfadeSeconds === 6 ? 'smooth' :
          this.crossfadeSeconds === 8 ? 'long' :
          this.crossfadeSeconds === 0 ? 'off' : 'smart'
        );
        localStorage.setItem('tunetide_crossfade_style', JSON.stringify(resolvedStyle));
      } catch (e) {}
    }
  }

  pushPlaybackHistory(idx) {
    if (typeof idx !== 'number' || idx < 0) return;
    if (this.playbackHistory.length > 0 && this.playbackHistory[this.playbackHistory.length - 1] === idx) {
      return;
    }
    this.playbackHistory.push(idx);
    if (this.playbackHistory.length > 50) {
      this.playbackHistory.shift();
    }
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
    // Keep background audio anchor alive while audio should be playing to prevent mobile OS process suspension
    if (!this.isUserPaused && this.shouldBePlaying) return;
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
          this.requestWakeLock();
          if (this.isDirectAudio || this.isOfflinePlayback) {
            const deck = this.currentDeck || this.deckA;
            if (deck && deck.paused && deck.src && !deck.src.startsWith('data:')) {
              deck.play().catch(() => {});
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
      } else {
        // Entered background / screen locked: ensure background anchor is active to retain OS audio focus
        if (this.shouldBePlaying && !this.isUserPaused) {
          this.startBackgroundAudioAnchor();
        }
      }
    });
  }

  initDirectAudio() {
    if (typeof window === 'undefined') return;

    this.deckA = document.getElementById('dhun-native-player') || new Audio();
    this.deckB = document.getElementById('dhun-native-player-secondary') || new Audio();
    this.currentDeck = this.deckA;
    this.nextDeck = this.deckB;
    this.offlineAudioEl = this.deckA; // Backwards-compatibility alias

    let anchor = document.getElementById('dhun-anchor-player');
    if (anchor) {
      this.bgAnchorEl = anchor;
      this.bgAnchorEl.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      this.bgAnchorEl.loop = true;
      this.bgAnchorEl.volume = 0.01;
      this.bgAnchorEl.setAttribute('playsinline', 'true');
    }

    // Ensure audio elements are mounted into DOM container so mobile OS never suspends them
    try {
      let container = document.getElementById('yt-audio-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'yt-audio-container';
        container.style.cssText = 'position:fixed;bottom:0;right:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:0;overflow:hidden;border:none;';
        document.body.appendChild(container);
      }
      if (!document.getElementById('dhun-native-player')) {
        container.appendChild(this.deckA);
      }
      if (!document.getElementById('dhun-native-player-secondary')) {
        container.appendChild(this.deckB);
      }
    } catch (e) {}

    const setupDeck = (deck, deckId) => {
      deck.id = deckId;
      deck.preload = 'auto';
      deck.volume = this.currentVolume;
      deck.muted = false;
      deck.setAttribute('playsinline', 'true');
      deck.setAttribute('webkit-playsinline', 'true');

      deck.addEventListener('timeupdate', () => {
        if (deck === this.currentDeck && (this.isDirectAudio || this.isOfflinePlayback)) {
          const cur = deck.currentTime;
          this.listeners.timeUpdate(cur);
          this.updateMediaSessionPosition(cur);

          // Smart Automix trigger: starts next track gently during the outro
          const dur = deck.duration;
          if (
            this.crossfadeSeconds > 0 &&
            !this.isCrossfading &&
            this.crossfadeAttemptedIndex !== this.queueIndex &&
            this.shouldBePlaying &&
            !this.isUserPaused &&
            dur &&
            !isNaN(dur) &&
            isFinite(dur) &&
            dur > 15 &&
            (dur - cur) <= this.crossfadeSeconds &&
            (dur - cur) > 0.4
          ) {
            this.startSmartCrossfade(dur - cur);
          }
        }
      });

      deck.addEventListener('loadedmetadata', () => {
        if (deck === this.currentDeck && (this.isDirectAudio || this.isOfflinePlayback)) {
          if (deck.duration && !isNaN(deck.duration) && isFinite(deck.duration)) {
            this.listeners.durationChange(deck.duration);
          }
        }
      });

      deck.addEventListener('durationchange', () => {
        if (deck === this.currentDeck && (this.isDirectAudio || this.isOfflinePlayback)) {
          if (deck.duration && !isNaN(deck.duration) && isFinite(deck.duration)) {
            this.listeners.durationChange(deck.duration);
          }
        }
      });

      deck.addEventListener('play', () => {
        if (deck === this.currentDeck && (this.isDirectAudio || this.isOfflinePlayback)) {
          this.shouldBePlaying = true;
          this.isUserPaused = false;
          this.listeners.stateChange(true);
          this.updateMediaSessionState('playing');
          this.requestWakeLock();
        }
      });

      deck.addEventListener('playing', () => {
        if (deck === this.currentDeck && (this.isDirectAudio || this.isOfflinePlayback)) {
          this.shouldBePlaying = true;
          this.isUserPaused = false;
          this.listeners.stateChange(true);
          this.updateMediaSessionState('playing');
          this.requestWakeLock();
        }
      });

      deck.addEventListener('waiting', () => {
        if (deck === this.currentDeck && (this.isDirectAudio || this.isOfflinePlayback)) {
          if (this.shouldBePlaying && !this.isUserPaused) {
            this.startBackgroundAudioAnchor();
          }
        }
      });

      deck.addEventListener('stalled', () => {
        if (deck === this.currentDeck && (this.isDirectAudio || this.isOfflinePlayback)) {
          if (this.shouldBePlaying && !this.isUserPaused) {
            this.startBackgroundAudioAnchor();
            setTimeout(() => {
              if (this.shouldBePlaying && !this.isUserPaused && deck === this.currentDeck && (deck.paused || deck.readyState < 3)) {
                deck.play().catch(() => {});
              }
            }, 1200);
          }
        }
      });

      deck.addEventListener('pause', () => {
        if (deck === this.currentDeck && (this.isDirectAudio || this.isOfflinePlayback)) {
          if (this.isUserPaused) {
            this.listeners.stateChange(false);
            this.updateMediaSessionState('paused');
            this.releaseWakeLock();
            this.stopBackgroundAudioAnchor();
            return;
          }

          // If track ended naturally, or if engine is intentionally switching tracks / crossfading:
          if (deck.ended || this.isSwitchingTrack || this.isCrossfading) {
            return;
          }

          // If paused unexpectedly by OS, Chrome, screen lock or audio focus interruption:
          if (this.shouldBePlaying) {
            this.startBackgroundAudioAnchor();
            this.updateMediaSessionState('playing');

            try {
              const p = deck.play();
              if (p && typeof p.catch === 'function') {
                p.catch(() => {});
              }
            } catch (e) {}
          }
        }
      });

      deck.addEventListener('ended', () => {
        if (deck === this.currentDeck && (this.isDirectAudio || this.isOfflinePlayback)) {
          if (this.crossfadeTimer !== null) {
            // Next deck is already crossfading / playing
            return;
          }
          this.isCrossfading = false;
          this.startBackgroundAudioAnchor(true);
          this.playNextTrack(false);
        }
      });

      deck.addEventListener('error', (err) => {
        if (!deck?.src || deck.src.startsWith('data:') || deck.src === window.location.href) return;
        if (deck !== this.currentDeck) return;
        if (!this.isDirectAudio && !this.isOfflinePlayback) return;
        console.warn('Direct native audio stream error, attempting recovery:', err);

        const curTime = deck.currentTime || 0;
        // 1. If 320kbps was playing and failed, retry with 160kbps fallback
        if (deck.src.includes('_320.mp4')) {
          console.log('Switching to 160kbps fallback stream...');
          const fallbackSrc = deck.src.replace('_320.mp4', '_160.mp4');
          deck.src = fallbackSrc;
          deck.currentTime = Math.max(0, curTime - 1);
          deck.play().then(() => {
            this.shouldBePlaying = true;
            this.isUserPaused = false;
          }).catch(() => {
            if (this.currentVideoId && !this.isOfflinePlayback) {
              this.fallbackToYouTube(this.currentVideoId, this.shouldBePlaying, this.currentTrack);
            } else {
              this.playNextTrack(false);
            }
          });
          return;
        }

        // 2. If already on 160kbps or other direct stream, try YouTube fallback
        if (this.currentVideoId && !this.isOfflinePlayback) {
          this.fallbackToYouTube(this.currentVideoId, this.shouldBePlaying, this.currentTrack);
        } else {
          setTimeout(() => {
            this.playNextTrack(false);
          }, 600);
        }
      });
    };

    setupDeck(this.deckA, 'dhun-native-player');
    setupDeck(this.deckB, 'dhun-native-player-secondary');
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
                  // Force highest bitrate audio stream (Studio Pro quality)
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
                this.startBackgroundAudioAnchor(true);
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
                    this.playNextTrack(false);
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
    const nextIdx = typeof currentIndex === 'number' ? currentIndex : 0;
    if (this.queueIndex !== nextIdx) {
      this.crossfadeAttemptedIndex = -1;
    }
    this.queue = Array.isArray(songs) ? songs : [];
    this.queueIndex = nextIdx;
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

  // Smoothly ramps down the current deck volume over 120ms before switching tracks
  smoothSwitchDeck(onSwitch) {
    if (this.crossfadeTimer) {
      clearInterval(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }
    this.isCrossfading = false;
    this.isSwitchingTrack = true;

    if (this.nextDeck) {
      try {
        this.nextDeck.pause();
        this.nextDeck.currentTime = 0;
        this.nextDeck.volume = this.currentVolume ?? 0.8;
      } catch (e) {}
    }

    const deck = this.currentDeck;
    const isHidden = typeof document !== 'undefined' && document.hidden;
    if (!deck || deck.paused || deck.ended || this.currentVolume <= 0 || isHidden) {
      if (deck) {
        try {
          deck.pause();
          deck.currentTime = 0;
          deck.volume = this.currentVolume ?? 0.8;
        } catch (e) {}
      }
      if (onSwitch) onSwitch();
      return;
    }

    const startVol = deck.volume;
    const startTime = performance.now();
    const durationMs = 120;

    const timer = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      try {
        deck.volume = Math.max(0, startVol * (1 - progress));
      } catch (e) {}

      if (progress >= 1) {
        clearInterval(timer);
        try {
          deck.pause();
          deck.currentTime = 0;
          deck.volume = this.currentVolume ?? 0.8;
        } catch (e) {}
        if (onSwitch) onSwitch();
      }
    }, 20);
  }

  // Seamless smart crossfade / automix
  async startSmartCrossfade(remainingSec = 4) {
    if (this.isCrossfading || !this.queue || this.queue.length <= 1) return;
    const startQueueIndex = this.queueIndex;
    this.crossfadeAttemptedIndex = this.queueIndex;
    this.isCrossfading = true;

    let nextIndex = this.queueIndex + 1;
    if (this.repeatMode === 'one') {
      nextIndex = this.queueIndex;
    } else if (this.isShuffle) {
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

    const nextTrack = this.queue[nextIndex];
    if (!nextTrack) {
      this.isCrossfading = false;
      return;
    }

    const cleanVideoId = typeof nextTrack === 'object' ? (nextTrack?.videoId || nextTrack?.id) : String(nextTrack || '').trim();
    const title = nextTrack?.title || nextTrack?.name || '';
    const artist = nextTrack?.artist || nextTrack?.artists || nextTrack?.subtitle || '';
    const cacheKey = (cleanVideoId && cleanVideoId.length > 5 && !cleanVideoId.startsWith('tr_'))
      ? cleanVideoId
      : (title ? `${title}::${artist}`.toLowerCase().trim() : cleanVideoId);

    // Look up cached stream or fetch in background
    let streamData = this.streamCache.get(cacheKey) || (cleanVideoId ? this.streamCache.get(cleanVideoId) : null) || (title ? this.streamCache.get(title.toLowerCase().trim()) : null);

    if (!streamData?.streamUrl && title) {
      try {
        const query = `${title} ${artist}`.trim();
        const res = await fetch(
          `${API_BASE}/api/audio-stream?query=${encodeURIComponent(query)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`
        );
        if (res.ok) {
          const d = await res.json();
          if (d.success && d.streamUrl) {
            streamData = d;
            this.streamCache.set(cacheKey, d);
          }
        }
      } catch (e) {}
    }

    // Verify track hasn't changed or advanced while waiting for fetch
    if (this.queueIndex !== startQueueIndex) {
      this.isCrossfading = false;
      return;
    }

    if (!streamData?.streamUrl) {
      // Direct stream not ready; let current track finish naturally to avoid playback interruption
      this.isCrossfading = false;
      return;
    }

    const outgoingDeck = this.currentDeck;
    const incomingDeck = (outgoingDeck === this.deckA) ? this.deckB : this.deckA;

    // Track playback history for accurate double-tap Prev navigation
    this.pushPlaybackHistory(this.queueIndex);

    // Prime incoming deck with silent volume
    incomingDeck.src = streamData.streamUrl;
    incomingDeck.volume = 0;
    incomingDeck.currentTime = 0;

    try {
      await incomingDeck.play();
    } catch (err) {
      console.warn('Smart crossfade incoming deck play failed:', err);
      this.isCrossfading = false;
      this.isSwitchingTrack = false;
      return;
    }

    // Immediately handover active deck to incoming track so timeupdate and duration listener attach to incoming song
    this.currentDeck = incomingDeck;
    this.nextDeck = outgoingDeck;

    // Update active song metadata immediately so UI & lock-screen sync with the incoming song
    this.queueIndex = nextIndex;
    this.currentTrack = nextTrack;
    this.currentTrackKey = cacheKey;
    this.currentVideoId = cleanVideoId;
    this.updateMediaMetadata(nextTrack);
    this.updateMediaSessionState('playing');

    if (typeof this.listeners.onTrackChanged === 'function') {
      this.listeners.onTrackChanged(nextTrack, nextIndex);
    }

    // Immediately dispatch 0 for time and incoming song duration to eliminate any timing jump
    if (typeof this.listeners.timeUpdate === 'function') {
      this.listeners.timeUpdate(0);
    }
    const incomingDuration = streamData.duration || incomingDeck.duration || (typeof nextTrack?.duration === 'number' ? nextTrack.duration : 0);
    if (incomingDuration > 0 && typeof this.listeners.durationChange === 'function') {
      this.listeners.durationChange(incomingDuration);
    }
    this.updateMediaSessionPosition(0);

    // Run equal-power crossfade curve
    const durationMs = Math.max(1000, Math.min(this.crossfadeSeconds * 1000, (remainingSec || 4) * 1000));
    const startTime = performance.now();
    const targetVolume = this.currentVolume ?? 0.8;

    if (this.crossfadeTimer) {
      clearInterval(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }

    this.crossfadeTimer = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      // Equal-power crossfade curve: cos(t * π/2) and sin(t * π/2)
      // Maintains constant RMS acoustic energy throughout transition with zero drop
      const outVol = Math.cos(progress * 0.5 * Math.PI) * targetVolume;
      const inVol = Math.sin(progress * 0.5 * Math.PI) * targetVolume;

      try {
        outgoingDeck.volume = Math.max(0, Math.min(1, outVol));
        incomingDeck.volume = Math.max(0, Math.min(1, inVol));
      } catch (e) {}

      if (progress >= 1) {
        clearInterval(this.crossfadeTimer);
        this.crossfadeTimer = null;

        try {
          outgoingDeck.pause();
          outgoingDeck.currentTime = 0;
          outgoingDeck.volume = targetVolume;
        } catch (e) {}

        incomingDeck.volume = targetVolume;

        // Active decks were already swapped at crossfade start, so just finish crossfade state
        this.isCrossfading = false;
        this.isSwitchingTrack = false;

        // Prefetch next track in queue for future seamless transitions
        this.prefetchNextInQueue();
      }
    }, 40);
  }

  playNextTrack(fromLockScreen = false) {
    if (!this.queue || this.queue.length === 0) {
      if (this.listeners.next) this.listeners.next();
      return;
    }

    if (this.repeatMode === 'one' && !fromLockScreen) {
      this.seekTo(0);
      this.play();
      return;
    }

    this.crossfadeAttemptedIndex = -1;
    this.isSwitchingTrack = true;
    this.pushPlaybackHistory(this.queueIndex);

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

      this.smoothSwitchDeck(() => {
        this.loadVideo(vId || nextTrack, true, nextTrack);
        if (typeof this.listeners.onTrackChanged === 'function') {
          this.listeners.onTrackChanged(nextTrack, nextIndex);
        }
      });

      this.prefetchNextInQueue();
    }
  }

  playPreviousTrack() {
    if (!this.queue || this.queue.length === 0) {
      if (this.listeners.prev) this.listeners.prev();
      return;
    }

    const now = Date.now();
    const curTime = this.getCurrentTime();
    const isDoubleTap = (now - this.lastPrevClickTime) < 2500;

    // 1. If song has played for more than 2.5s and this is the first tap,
    // RESTART the current song from beginning
    if (curTime > 2.5 && !isDoubleTap) {
      this.lastPrevClickTime = now;
      this.seekTo(0);
      if (this.isUserPaused) {
        this.play();
      } else {
        // Smooth gentle volume dip and restore
        const deck = this.currentDeck;
        if (deck) {
          const vol = this.currentVolume ?? 0.8;
          deck.volume = vol * 0.3;
          setTimeout(() => {
            if (deck) deck.volume = vol;
          }, 100);
        }
      }
      if (typeof this.listeners.timeUpdate === 'function') {
        this.listeners.timeUpdate(0);
      }
      return;
    }

    // 2. Double tap (2 clicks in succession) OR tap within first 2.5s:
    // Go to the previously played song or previous index in queue
    this.lastPrevClickTime = 0;
    this.crossfadeAttemptedIndex = -1;
    this.isSwitchingTrack = true;

    let prevIndex = -1;
    // Pop from actual playback history first
    while (this.playbackHistory.length > 0) {
      const cand = this.playbackHistory.pop();
      if (cand !== this.queueIndex && cand >= 0 && cand < this.queue.length) {
        prevIndex = cand;
        break;
      }
    }

    // If no history, navigate linearly backwards
    if (prevIndex < 0) {
      if (this.queueIndex > 0) {
        prevIndex = this.queueIndex - 1;
      } else {
        prevIndex = this.queue.length - 1;
      }
    }

    this.queueIndex = prevIndex;
    const prevTrack = this.queue[prevIndex];
    if (prevTrack) {
      const vId = prevTrack.videoId || prevTrack.id;
      this.currentTrack = prevTrack;
      this.updateMediaMetadata(prevTrack);
      this.updateMediaSessionState('playing');

      this.smoothSwitchDeck(() => {
        this.loadVideo(vId || prevTrack, true, prevTrack);
        if (typeof this.listeners.onTrackChanged === 'function') {
          this.listeners.onTrackChanged(prevTrack, prevIndex);
        }
      });

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
      const silentSrc = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      const primeDeck = (deck) => {
        if (!deck) return;
        try {
          deck.volume = this.currentVolume ?? 0.8;
          deck.muted = false;
          // Prime audio element on user gesture to permanently satisfy autoplay requirements
          if (!deck.src || deck.src === window.location.href) {
            deck.src = silentSrc;
          }
          if (deck.paused && (!deck.src || deck.src.startsWith('data:'))) {
            const p = deck.play();
            if (p && typeof p.catch === 'function') {
              p.catch(() => {});
            }
          }
        } catch (e) {}
      };

      primeDeck(this.deckA);
      primeDeck(this.deckB);
      primeDeck(this.bgAnchorEl);
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
          this.streamCache.set(cacheKey, data);
          if (cleanVideoId) this.streamCache.set(cleanVideoId, data);
          if (title) this.streamCache.set(title.toLowerCase().trim(), data);
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
      if (this.isDirectAudio && this.currentDeck && this.currentDeck.src && !this.currentDeck.src.startsWith('data:')) {
        // Already loaded direct audio for this song
        if (autoPlay) {
          this.shouldBePlaying = true;
          this.isUserPaused = false;
          if (this.currentDeck.paused) {
            this.currentDeck.play().catch(() => {});
          }
        }
        return;
      }
      if (!this.isDirectAudio && this.ytPlayer && typeof this.ytPlayer.getPlayerState === 'function') {
        if (autoPlay && this.ytPlayer.getPlayerState() !== 1) {
          try { this.ytPlayer.playVideo(); } catch (e) {}
        }
        return;
      }
    }

    // Changing to a new track: cancel any previous in-flight fetch and active crossfade
    this.crossfadeAttemptedIndex = -1;
    if (this.crossfadeTimer) {
      clearInterval(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }
    this.isCrossfading = false;
    if (this.nextDeck) {
      try {
        this.nextDeck.pause();
        this.nextDeck.currentTime = 0;
        this.nextDeck.volume = this.currentVolume ?? 0.8;
      } catch (e) {}
    }

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

    // Helper to start playback on active deck with alternating decks
    const applyDirectStream = (data) => {
      this.isDirectAudio = true;
      if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
        try { this.ytPlayer.pauseVideo(); } catch (e) {}
      }

      // Alternate decks cleanly to prevent any audio element collision
      const outgoingDeck = this.currentDeck || this.deckA;
      const incomingDeck = (outgoingDeck === this.deckA) ? this.deckB : this.deckA;

      if (outgoingDeck && outgoingDeck !== incomingDeck) {
        try {
          outgoingDeck.pause();
          outgoingDeck.currentTime = 0;
        } catch (e) {}
      }

      this.currentDeck = incomingDeck;
      this.nextDeck = outgoingDeck;
      this.offlineAudioEl = incomingDeck;

      incomingDeck.src = data.streamUrl;
      incomingDeck.muted = false;
      this.activeAbortController = null;

      if (autoPlay && this.shouldBePlaying && !this.isUserPaused) {
        const targetVol = this.currentVolume ?? 0.8;
        incomingDeck.volume = targetVol;

        const onPlaybackStarted = () => {
          this.isSwitchingTrack = false;
          this.stopBackgroundAudioAnchor();
          this.listeners.stateChange(true);
          this.updateMediaSessionState('playing');
          this.requestWakeLock();
        };

        const playPromise = incomingDeck.play();
        if (playPromise !== undefined) {
          playPromise.then(onPlaybackStarted).catch((err) => {
            console.warn('Direct stream initial play rejected, waiting for buffer:', err);
            let hasPlayed = false;
            const tryPlay = () => {
              if (hasPlayed) return;
              hasPlayed = true;
              incomingDeck.removeEventListener('canplay', tryPlay);
              incomingDeck.removeEventListener('loadeddata', tryPlay);
              if (this.shouldBePlaying && !this.isUserPaused) {
                incomingDeck.play().then(onPlaybackStarted).catch((err2) => {
                  console.warn('Buffered play failed, trying fallback stream:', err2);
                  if (data.fallbackUrl && incomingDeck.src !== data.fallbackUrl) {
                    incomingDeck.src = data.fallbackUrl;
                    incomingDeck.play().then(onPlaybackStarted).catch(() => {
                      if (cleanVideoId) this.fallbackToYouTube(cleanVideoId, autoPlay, trackMeta);
                      else this.playNextTrack(false);
                    });
                  } else if (cleanVideoId) {
                    this.fallbackToYouTube(cleanVideoId, autoPlay, trackMeta);
                  } else {
                    this.playNextTrack(false);
                  }
                });
              }
            };

            incomingDeck.addEventListener('canplay', tryPlay, { once: true });
            incomingDeck.addEventListener('loadeddata', tryPlay, { once: true });
            setTimeout(tryPlay, 500);
          });
        }
      } else {
        this.isSwitchingTrack = false;
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

    if (this.isCrossfading && this.crossfadeTimer) {
      clearInterval(this.crossfadeTimer);
      this.crossfadeTimer = null;
      this.isCrossfading = false;
    }

    if (this.isDirectAudio || this.isOfflinePlayback) {
      if (this.deckA) {
        try { this.deckA.pause(); } catch (e) {}
      }
      if (this.deckB) {
        try { this.deckB.pause(); } catch (e) {}
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
    if (this.crossfadeTimer) {
      clearInterval(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }
    this.isCrossfading = false;
    if (this.nextDeck) {
      try {
        this.nextDeck.pause();
        this.nextDeck.currentTime = 0;
        this.nextDeck.volume = this.currentVolume ?? 0.8;
      } catch (e) {}
    }
    if (this.currentDeck) {
      this.currentDeck.volume = this.currentVolume ?? 0.8;
    }

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
    if (this.currentDeck && !this.isCrossfading) {
      this.currentDeck.volume = vol;
    }
    if (this.deckA) this.deckA.muted = (vol === 0);
    if (this.deckB) this.deckB.muted = (vol === 0);
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

  startPlaybackWatchdog() {
    if (this.playbackWatchdogTimer) return;
    let lastTime = -1;
    let stuckCount = 0;

    this.playbackWatchdogTimer = setInterval(() => {
      if (!this.shouldBePlaying || this.isUserPaused || this.isCrossfading || this.isSwitchingTrack) {
        lastTime = -1;
        stuckCount = 0;
        return;
      }

      const deck = this.currentDeck || this.deckA;
      if (this.isDirectAudio || this.isOfflinePlayback) {
        if (!deck) return;

        // 1. If unexpectedly paused by OS / browser during playback
        if (deck.paused && !deck.ended && deck.src && !deck.src.startsWith('data:')) {
          this.startBackgroundAudioAnchor();
          deck.play().catch(() => {});
          return;
        }

        // 2. Buffer underrun watchdog: check if audio position is frozen in place for ~3-4s
        const cur = deck.currentTime;
        if (!deck.paused && !deck.ended && deck.duration && isFinite(deck.duration) && deck.duration > 0 && cur > 0 && cur < deck.duration - 1) {
          if (Math.abs(cur - lastTime) < 0.05) {
            stuckCount++;
            if (stuckCount >= 3) {
              stuckCount = 0;
              this.startBackgroundAudioAnchor();
              deck.play().catch(() => {});
            }
          } else {
            stuckCount = 0;
            lastTime = cur;
          }
        } else {
          lastTime = cur;
          stuckCount = 0;
        }
      } else if (this.ytPlayer && typeof this.ytPlayer.getPlayerState === 'function') {
        const state = this.ytPlayer.getPlayerState();
        if (state === 2) { // Paused unexpectedly
          this.startBackgroundAudioAnchor();
          try { this.ytPlayer.playVideo(); } catch (e) {}
        }
      }
    }, 1200);
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
