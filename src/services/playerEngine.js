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
    this.wasInterruptedExternally = false;
    this.isBuffering = false;
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
    this.nextUpcomingIndex = null;
    this.shuffleOrder = [];
    this.shufflePos = 0;
    this.isLoadingTrack = false;

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

  startBackgroundAudioAnchor() {
    if (!this.bgAnchorEl) return;
    try {
      this.bgAnchorEl.muted = false;
      this.bgAnchorEl.volume = 0.001;
      if (this.bgAnchorEl.paused) {
        const p = this.bgAnchorEl.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    } catch (e) {}
  }

  stopBackgroundAudioAnchor() {
    if (!this.bgAnchorEl) return;
    try {
      if (!this.bgAnchorEl.paused) {
        this.bgAnchorEl.pause();
      }
    } catch (e) {}
  }

  initVisibilityListener() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Returned to Dhun app foreground (user opened/returned to app)
        if (this.wasInterruptedExternally) {
          // When earbuds disconnect or incoming call occurs, DO NOT auto-blast music out loud through phone speakers!
          // Maintain paused state cleanly. User will tap Play when ready.
          this.wasInterruptedExternally = false;
          this.shouldBePlaying = false;
          this.isUserPaused = true;
          this.updateMediaSessionState('paused');
          this.listeners.stateChange(false);
          return;
        }

        // Verify if deck is actually playing before syncing UI state
        const deck = this.currentDeck || this.deckA;
        const isDeckActuallyPlaying = deck && !deck.paused && deck.currentTime > 0;

        if (this.shouldBePlaying && !this.isUserPaused && isDeckActuallyPlaying) {
          this.requestWakeLock();
          this.updateMediaSessionState('playing');
          this.listeners.stateChange(true);
        } else if (!isDeckActuallyPlaying) {
          this.shouldBePlaying = false;
          this.updateMediaSessionState('paused');
          this.listeners.stateChange(false);
        }
      } else {
        // Entered background / screen locked:
        // If mid-crossfade, immediately finish crossfade to prevent volume stall
        if (this.isCrossfading && this.crossfadeTimer) {
          clearInterval(this.crossfadeTimer);
          this.crossfadeTimer = null;
          this.isCrossfading = false;
          this.isSwitchingTrack = false;
          if (this.currentDeck) this.currentDeck.volume = this.currentVolume ?? 0.8;
          if (this.nextDeck) {
            try {
              this.nextDeck.pause();
              this.nextDeck.currentTime = 0;
              this.nextDeck.src = '';
              this.nextDeck.removeAttribute('src');
            } catch (e) {}
          }
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

          const dur = deck.duration;
          const isHidden = typeof document !== 'undefined' && document.hidden;

          // Background / lock-screen safety: prefetch upcoming track early if not already cached
          if (dur && isFinite(dur) && dur > 10 && (dur - cur) <= 45 && (dur - cur) > 2) {
            this.ensureUpcomingTrackPrefetched();
          }

          // Lock-screen seamless handoff: trigger next track 0.8s before silence so audio focus is never dropped
          if (
            isHidden &&
            dur &&
            !isNaN(dur) &&
            isFinite(dur) &&
            dur > 10 &&
            cur > 5 &&
            (dur - cur) <= 0.8 &&
            (dur - cur) > 0 &&
            !this.isSwitchingTrack &&
            !this.isLoadingTrack &&
            this.shouldBePlaying &&
            !this.isUserPaused
          ) {
            this.playNextTrack(true);
            return;
          }

          // Smart Automix trigger: starts next track gently during the outro (only in foreground)
          if (
            !isHidden &&
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
          this.isBuffering = false;
          this.isSwitchingTrack = false;
          this.isLoadingTrack = false;
          this.stopBackgroundAudioAnchor();
          this.listeners.stateChange(true);
          this.updateMediaSessionState('playing');
          this.requestWakeLock();
        }
      });

      deck.addEventListener('playing', () => {
        if (deck === this.currentDeck && (this.isDirectAudio || this.isOfflinePlayback)) {
          this.shouldBePlaying = true;
          this.isUserPaused = false;
          this.isBuffering = false;
          this.isSwitchingTrack = false;
          this.isLoadingTrack = false;
          this.stopBackgroundAudioAnchor();
          this.listeners.stateChange(true);
          this.updateMediaSessionState('playing');
          this.requestWakeLock();
        }
      });

      deck.addEventListener('waiting', () => {
        if (deck === this.currentDeck) {
          this.isBuffering = true;
        }
      });

      deck.addEventListener('canplay', () => {
        if (deck === this.currentDeck) {
          this.isBuffering = false;
          if (this.shouldBePlaying && !this.isUserPaused && deck.paused) {
            deck.play().catch(() => {});
          }
        }
      });

      deck.addEventListener('stalled', () => {
        if (deck === this.currentDeck && (this.isDirectAudio || this.isOfflinePlayback)) {
          if (this.shouldBePlaying && !this.isUserPaused) {
            setTimeout(() => {
              if (this.shouldBePlaying && !this.isUserPaused && deck === this.currentDeck && (deck.paused || deck.readyState < 3)) {
                deck.play().catch(() => {});
              }
            }, 800);
          }
        }
      });

      deck.addEventListener('pause', () => {
        if (deck === this.currentDeck && (this.isDirectAudio || this.isOfflinePlayback)) {
          // If track ended naturally, or if engine is intentionally switching tracks / loading / crossfading:
          if (deck.ended || this.isSwitchingTrack || this.isLoadingTrack || this.isCrossfading) {
            return;
          }

          // If paused due to network buffering underrun or waiting for data, do NOT treat as external call/stop:
          if (this.isBuffering || deck.readyState < 3) {
            return;
          }

          if (this.isUserPaused) {
            this.listeners.stateChange(false);
            this.updateMediaSessionState('paused');
            this.releaseWakeLock();
            this.stopBackgroundAudioAnchor();
            return;
          }

          // Otherwise, paused by external interruption (incoming call, earbuds disconnected, or other media):
          // Stop music immediately and do NOT auto-resume in the background!
          this.wasInterruptedExternally = true;
          this.shouldBePlaying = false;
          this.isUserPaused = true;
          this.stopBackgroundAudioAnchor();
          this.listeners.stateChange(false);
          this.updateMediaSessionState('paused');
          this.releaseWakeLock();
        }
      });

      deck.addEventListener('ended', () => {
        // IGNORE ended event if audio was just silent priming buffer (data:) or empty source
        if (!deck?.src || deck.src.startsWith('data:') || deck.src === window.location.href) {
          return;
        }
        if (deck === this.currentDeck && (this.isDirectAudio || this.isOfflinePlayback)) {
          if (this.crossfadeTimer !== null) {
            // Next deck is already crossfading / playing
            return;
          }
          this.isCrossfading = false;
          this.playNextTrack(true);
        }
      });

      deck.addEventListener('error', (err) => {
        if (!deck?.src || deck.src.startsWith('data:') || deck.src === window.location.href) return;
        if (deck !== this.currentDeck) return;
        if (!this.isDirectAudio && !this.isOfflinePlayback) return;
        console.warn('Direct native audio stream error, attempting recovery:', err);

        const curTime = deck.currentTime || 0;
        const isHidden = typeof document !== 'undefined' && document.hidden;

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
            if (this.currentVideoId && !this.isOfflinePlayback && !isHidden) {
              this.fallbackToYouTube(this.currentVideoId, this.shouldBePlaying, this.currentTrack);
            } else {
              this.playNextTrack(false);
            }
          });
          return;
        }

        // 2. If already on 160kbps or other direct stream, try YouTube fallback if foreground
        if (this.currentVideoId && !this.isOfflinePlayback && !isHidden) {
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
                  this.updateMediaSessionState('paused');
                  return;
                }

                // Paused externally by OS (incoming call, other media played throughout phone):
                this.wasInterruptedExternally = true;
                this.shouldBePlaying = false;
                this.stopTimeTracking();
                this.listeners.stateChange(false);
                this.releaseWakeLock();
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

  buildShuffleOrder(queueLength, currentIndex) {
    if (queueLength <= 0) return [];
    if (queueLength === 1) return [0];

    const pool = [];
    for (let i = 0; i < queueLength; i++) {
      if (i !== currentIndex) pool.push(i);
    }
    // Fisher-Yates deterministic shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return [currentIndex, ...pool];
  }

  setQueue(songs = [], currentIndex = 0, shuffle = false, repeatMode = 'off') {
    const nextIdx = typeof currentIndex === 'number' ? currentIndex : 0;
    if (this.queueIndex !== nextIdx) {
      this.crossfadeAttemptedIndex = -1;
    }
    const newQueue = Array.isArray(songs) ? songs : [];
    const prevQueueLength = this.queue ? this.queue.length : 0;
    const prevShuffle = this.isShuffle;

    this.queue = newQueue;
    this.queueIndex = nextIdx;
    this.isShuffle = !!shuffle;
    this.repeatMode = repeatMode || 'off';

    // Build or preserve stable shuffle order
    if (this.isShuffle && newQueue.length > 0) {
      const queueChanged = newQueue.length !== prevQueueLength || !prevShuffle;
      if (queueChanged || !Array.isArray(this.shuffleOrder) || this.shuffleOrder.length !== newQueue.length) {
        this.shuffleOrder = this.buildShuffleOrder(newQueue.length, nextIdx);
        this.shufflePos = 0;
      } else {
        const foundPos = this.shuffleOrder.indexOf(nextIdx);
        if (foundPos >= 0) {
          this.shufflePos = foundPos;
        } else {
          this.shuffleOrder = this.buildShuffleOrder(newQueue.length, nextIdx);
          this.shufflePos = 0;
        }
      }
    } else {
      this.shuffleOrder = [];
      this.shufflePos = 0;
    }

    this.nextUpcomingIndex = this.computeNextUpcomingIndex();

    // Pre-fetch next track in background so lock screen handoff is 0ms
    this.prefetchNextInQueue();
  }

  computeNextUpcomingIndex() {
    if (!this.queue || this.queue.length === 0) return -1;
    if (this.queue.length === 1) return this.repeatMode === 'one' ? this.queueIndex : 0;
    if (this.repeatMode === 'one') return this.queueIndex;

    if (this.isShuffle) {
      if (!Array.isArray(this.shuffleOrder) || this.shuffleOrder.length !== this.queue.length) {
        this.shuffleOrder = this.buildShuffleOrder(this.queue.length, this.queueIndex);
        this.shufflePos = 0;
      }
      if (this.shuffleOrder.length > 0) {
        const nextPos = (this.shufflePos + 1) % this.shuffleOrder.length;
        return this.shuffleOrder[nextPos];
      }
      return 0;
    } else {
      let nextIdx = this.queueIndex + 1;
      if (nextIdx >= this.queue.length) {
        nextIdx = 0;
      }
      return nextIdx;
    }
  }

  prefetchNextInQueue() {
    if (!this.queue || this.queue.length <= 1) return;
    if (this.nextUpcomingIndex === null || this.nextUpcomingIndex < 0 || this.nextUpcomingIndex >= this.queue.length) {
      this.nextUpcomingIndex = this.computeNextUpcomingIndex();
    }
    const upcomingTrack = this.queue[this.nextUpcomingIndex];
    if (upcomingTrack) {
      this.prefetchTrack(upcomingTrack);
    }
  }

  ensureUpcomingTrackPrefetched() {
    if (!this.queue || this.queue.length <= 1) return;
    if (this.nextUpcomingIndex === null || this.nextUpcomingIndex < 0 || this.nextUpcomingIndex >= this.queue.length) {
      this.nextUpcomingIndex = this.computeNextUpcomingIndex();
    }
    const upcomingTrack = this.queue[this.nextUpcomingIndex];
    if (!upcomingTrack) return;

    const cleanVideoId = typeof upcomingTrack === 'object' ? (upcomingTrack?.videoId || upcomingTrack?.id) : String(upcomingTrack || '').trim();
    const title = upcomingTrack?.title || upcomingTrack?.name || '';
    const artist = upcomingTrack?.artist || upcomingTrack?.artists || upcomingTrack?.subtitle || '';
    const cacheKey = (cleanVideoId && cleanVideoId.length > 5 && !cleanVideoId.startsWith('tr_'))
      ? cleanVideoId
      : (title ? `${title}::${artist}`.toLowerCase().trim() : cleanVideoId);

    if (cacheKey && !this.streamCache.has(cacheKey)) {
      this.prefetchTrack(upcomingTrack);
    }
  }

  clearDeckTimers(deck) {
    if (!deck) return;
    if (deck._fadeTimer) {
      clearInterval(deck._fadeTimer);
      deck._fadeTimer = null;
    }
  }

  // Immediately stops and retires a deck with zero lingering playback
  fadeAndRetireDeck(deck) {
    if (!deck) return;
    this.clearDeckTimers(deck);
    try {
      deck.pause();
      deck.currentTime = 0;
      deck.src = '';
      deck.removeAttribute('src');
      deck.volume = this.currentVolume ?? 0.8;
    } catch (e) {}
  }

  // Sets deck to target volume immediately without delay
  fadeInDeck(deck, targetVolume = 0.8) {
    if (!deck) return;
    this.clearDeckTimers(deck);
    try {
      deck.volume = targetVolume;
    } catch (e) {}
  }

  // Immediately stops previous deck audio before executing switch
  smoothSwitchDeck(onSwitch) {
    if (this.crossfadeTimer) {
      clearInterval(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }
    this.isCrossfading = false;
    this.isSwitchingTrack = true;

    const deck = this.currentDeck;
    if (deck) {
      this.fadeAndRetireDeck(deck);
    }

    if (onSwitch) onSwitch();
  }

  // Seamless smart crossfade / automix
  async startSmartCrossfade(remainingSec = 4) {
    if (this.isCrossfading || !this.queue || this.queue.length <= 1) return;
    const isHidden = typeof document !== 'undefined' && document.hidden;
    if (isHidden) {
      // In background / lockscreen, avoid multi-deck volume crossfade because OS throttles
      // background JS timers. Track will transition seamlessly on active deck on ended.
      return;
    }

    const startQueueIndex = this.queueIndex;
    this.crossfadeAttemptedIndex = this.queueIndex;
    this.isCrossfading = true;

    const nextIndex = (this.nextUpcomingIndex !== null && this.nextUpcomingIndex >= 0 && this.nextUpcomingIndex < this.queue.length)
      ? this.nextUpcomingIndex
      : this.computeNextUpcomingIndex();

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
      console.warn('Smart crossfade incoming deck play failed, falling back to seamless handoff:', err);
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
      const isNowHidden = typeof document !== 'undefined' && document.hidden;
      const elapsed = performance.now() - startTime;
      const progress = isNowHidden ? 1 : Math.min(1, elapsed / durationMs);

      // Equal-power crossfade curve: cos(t * π/2) and sin(t * π/2)
      // Maintains constant RMS acoustic energy throughout transition with zero drop
      const outVol = Math.cos(progress * 0.5 * Math.PI) * targetVolume;
      const inVol = Math.sin(progress * 0.5 * Math.PI) * targetVolume;

      try {
        outgoingDeck.volume = Math.max(0, Math.min(1, outVol));
        incomingDeck.volume = Math.max(0, Math.min(1, inVol));
      } catch (e) {}

      if (progress >= 1 || isNowHidden) {
        clearInterval(this.crossfadeTimer);
        this.crossfadeTimer = null;

        try {
          outgoingDeck.pause();
          outgoingDeck.currentTime = 0;
          outgoingDeck.src = '';
          outgoingDeck.removeAttribute('src');
          outgoingDeck.volume = targetVolume;
        } catch (e) {}

        incomingDeck.volume = targetVolume;

        // Active decks were already swapped at crossfade start, so just finish crossfade state
        this.isCrossfading = false;
        this.isSwitchingTrack = false;
        this.isLoadingTrack = false;

        // If incomingDeck paused due to network glitch during crossfade, nudge play
        if (this.shouldBePlaying && !this.isUserPaused && incomingDeck.paused) {
          incomingDeck.play().catch(() => {});
        }

        // Compute and prefetch next upcoming track in queue for future seamless transitions
        this.nextUpcomingIndex = this.computeNextUpcomingIndex();
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
    this.isLoadingTrack = true;
    this.startBackgroundAudioAnchor();
    this.pushPlaybackHistory(this.queueIndex);

    let nextIndex;
    if (this.isShuffle) {
      if (!Array.isArray(this.shuffleOrder) || this.shuffleOrder.length !== this.queue.length) {
        this.shuffleOrder = this.buildShuffleOrder(this.queue.length, this.queueIndex);
        this.shufflePos = 0;
      }
      this.shufflePos++;
      if (this.shufflePos >= this.shuffleOrder.length) {
        // Full shuffle loop finished: re-shuffle and seamlessly continue
        this.shuffleOrder = this.buildShuffleOrder(this.queue.length, this.queueIndex);
        this.shufflePos = (this.shuffleOrder.length > 1) ? 1 : 0;
      }
      nextIndex = this.shuffleOrder[this.shufflePos];
    } else {
      nextIndex = (this.nextUpcomingIndex !== null && this.nextUpcomingIndex >= 0 && this.nextUpcomingIndex < this.queue.length)
        ? this.nextUpcomingIndex
        : this.computeNextUpcomingIndex();
    }

    this.nextUpcomingIndex = null;
    this.queueIndex = nextIndex;
    const nextTrack = this.queue[nextIndex];
    if (nextTrack) {
      const vId = nextTrack.videoId || nextTrack.id;
      this.currentTrack = nextTrack;
      this.updateMediaMetadata(nextTrack);
      this.updateMediaSessionState('playing');

      if (typeof this.listeners.onTrackChanged === 'function') {
        this.listeners.onTrackChanged(nextTrack, nextIndex);
      }
      this.loadVideo(vId || nextTrack, true, nextTrack, true);

      this.nextUpcomingIndex = this.computeNextUpcomingIndex();
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
    this.isLoadingTrack = true;
    this.startBackgroundAudioAnchor();

    let prevIndex = -1;
    if (this.isShuffle && Array.isArray(this.shuffleOrder) && this.shuffleOrder.length > 0) {
      this.shufflePos = (this.shufflePos - 1 + this.shuffleOrder.length) % this.shuffleOrder.length;
      prevIndex = this.shuffleOrder[this.shufflePos];
    } else {
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
    }

    this.queueIndex = prevIndex;
    const prevTrack = this.queue[prevIndex];
    if (prevTrack) {
      const vId = prevTrack.videoId || prevTrack.id;
      this.currentTrack = prevTrack;
      this.updateMediaMetadata(prevTrack);
      this.updateMediaSessionState('playing');

      if (typeof this.listeners.onTrackChanged === 'function') {
        this.listeners.onTrackChanged(prevTrack, prevIndex);
      }
      this.loadVideo(vId || prevTrack, true, prevTrack, true);

      this.nextUpcomingIndex = this.computeNextUpcomingIndex();
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
        } catch (e) {}
      };

      primeDeck(this.deckA);
      primeDeck(this.deckB);
      if (this.bgAnchorEl) {
        this.bgAnchorEl.src = silentSrc;
        this.bgAnchorEl.loop = true;
        this.bgAnchorEl.volume = 0.001;
        this.bgAnchorEl.muted = false;
        const ap = this.bgAnchorEl.play();
        if (ap && typeof ap.then === 'function') {
          ap.then(() => {
            this.bgAnchorEl.pause();
          }).catch(() => {});
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
          this.streamCache.set(cacheKey, data);
          if (cleanVideoId) this.streamCache.set(cleanVideoId, data);
          if (title) this.streamCache.set(title.toLowerCase().trim(), data);
        }
      }
    } catch (e) {}
  }

  async loadVideo(videoId, autoPlay = true, trackMeta = null, forceReuseCurrentDeck = false) {
    if (!videoId && !trackMeta) return;

    let cleanVideoId = typeof videoId === 'object' ? (videoId?.videoId || videoId?.id) : String(videoId || '').trim();
    const title = trackMeta?.title || trackMeta?.name || '';
    const artist = trackMeta?.artist || trackMeta?.artists || trackMeta?.subtitle || '';

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
    this.isSwitchingTrack = true;
    this.isLoadingTrack = true;

    const isHidden = typeof document !== 'undefined' && document.hidden;

    // Immediately stop outgoing audio on ALL decks so previous song NEVER lingers
    [this.deckA, this.deckB].forEach(d => {
      if (d) {
        this.clearDeckTimers(d);
        try {
          d.pause();
          d.currentTime = 0;
        } catch (e) {}
      }
    });

    if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      try { this.ytPlayer.pauseVideo(); } catch (e) {}
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

    if (autoPlay) {
      this.shouldBePlaying = true;
      this.isUserPaused = false;
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
          if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
            try { this.ytPlayer.pauseVideo(); } catch (e) {}
          }
          const targetVol = this.currentVolume ?? 0.8;
          const deckToUse = this.currentDeck || this.deckA;
          const otherDeck = (deckToUse === this.deckA) ? this.deckB : this.deckA;
          if (otherDeck) {
            this.clearDeckTimers(otherDeck);
            try {
              otherDeck.pause();
              otherDeck.currentTime = 0;
              otherDeck.src = '';
              otherDeck.removeAttribute('src');
            } catch (e) {}
          }

          this.currentDeck = deckToUse;
          this.offlineAudioEl = deckToUse;

          const objUrl = URL.createObjectURL(offlineRecord.audioBlob);
          deckToUse.src = objUrl;
          deckToUse.volume = targetVol;
          deckToUse.muted = false;
          if (autoPlay) {
            deckToUse.play().then(() => {
              this.isSwitchingTrack = false;
              this.isLoadingTrack = false;
              this.stopBackgroundAudioAnchor();
            }).catch(() => {});
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Offline check error:', e);
    }

    this.isOfflinePlayback = false;

    // Helper to start playback on active deck
    const applyDirectStream = (data) => {
      this.isDirectAudio = true;
      if (this.ytPlayer) {
        try {
          if (typeof this.ytPlayer.pauseVideo === 'function') this.ytPlayer.pauseVideo();
          if (typeof this.ytPlayer.stopVideo === 'function') this.ytPlayer.stopVideo();
        } catch (e) {}
      }

      const targetVol = this.currentVolume ?? 0.8;
      const deckToUse = this.currentDeck || this.deckA;
      const otherDeck = (deckToUse === this.deckA) ? this.deckB : this.deckA;
      if (otherDeck) {
        this.clearDeckTimers(otherDeck);
        try {
          otherDeck.pause();
          otherDeck.currentTime = 0;
          otherDeck.src = '';
          otherDeck.removeAttribute('src');
        } catch (e) {}
      }

      this.currentDeck = deckToUse;
      this.offlineAudioEl = deckToUse;

      deckToUse.src = data.streamUrl;
      deckToUse.volume = targetVol;
      deckToUse.muted = false;
      this.activeAbortController = null;

      if (autoPlay && this.shouldBePlaying && !this.isUserPaused) {
        this.listeners.stateChange(true);
        this.updateMediaSessionState('playing');
        this.requestWakeLock();

        const onDeckPlaybackStarted = () => {
          this.isSwitchingTrack = false;
          this.isLoadingTrack = false;
          this.stopBackgroundAudioAnchor();
          this.ensureUpcomingTrackPrefetched();
        };

        const playPromise = deckToUse.play();
        if (playPromise !== undefined) {
          playPromise.then(onDeckPlaybackStarted).catch((err) => {
            console.warn('Direct stream immediate play rejected, awaiting readyState:', err);
            let hasPlayed = false;
            const tryPlay = () => {
              if (hasPlayed) return;
              hasPlayed = true;
              deckToUse.removeEventListener('canplay', tryPlay);
              deckToUse.removeEventListener('loadeddata', tryPlay);
              if (this.shouldBePlaying && !this.isUserPaused) {
                deckToUse.play().then(onDeckPlaybackStarted).catch((err2) => {
                  console.warn('Buffered play failed, trying fallback stream:', err2);
                  if (data.fallbackUrl && deckToUse.src !== data.fallbackUrl) {
                    deckToUse.src = data.fallbackUrl;
                    deckToUse.play().then(onDeckPlaybackStarted).catch(() => {
                      if (cleanVideoId && !isHidden) this.fallbackToYouTube(cleanVideoId, autoPlay, trackMeta);
                      else this.playNextTrack(false);
                    });
                  } else if (cleanVideoId && !isHidden) {
                    this.fallbackToYouTube(cleanVideoId, autoPlay, trackMeta);
                  } else {
                    this.playNextTrack(false);
                  }
                });
              }
            };

            deckToUse.addEventListener('canplay', tryPlay, { once: true });
            deckToUse.addEventListener('loadeddata', tryPlay, { once: true });
            setTimeout(tryPlay, 400);
          });
        }
      } else {
        this.isSwitchingTrack = false;
        this.isLoadingTrack = false;
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
      if (!isHidden) {
        this.fallbackToYouTube(cleanVideoId, autoPlay, trackMeta);
      } else {
        // On lockscreen, advance to next track so playback never terminates
        this.playNextTrack(false);
      }
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
    this.wasInterruptedExternally = false;
    this.shouldBePlaying = true;
    this.requestWakeLock();

    // Ensure the other deck is completely stopped and unloaded so 2 musics can NEVER play together
    const otherDeck = (this.currentDeck === this.deckA) ? this.deckB : this.deckA;
    if (otherDeck) {
      this.clearDeckTimers(otherDeck);
      try {
        otherDeck.pause();
        otherDeck.currentTime = 0;
        otherDeck.src = '';
        otherDeck.removeAttribute('src');
      } catch (e) {}
    }

    if (this.isDirectAudio || this.isOfflinePlayback || (this.audioEl && this.audioEl.src && !this.audioEl.src.startsWith('data:'))) {
      this.isDirectAudio = true;
      this.stopBackgroundAudioAnchor();
      if (this.ytPlayer) {
        try {
          if (typeof this.ytPlayer.pauseVideo === 'function') this.ytPlayer.pauseVideo();
          if (typeof this.ytPlayer.stopVideo === 'function') this.ytPlayer.stopVideo();
        } catch (e) {}
      }

      if (this.audioEl && this.audioEl.src && !this.audioEl.src.startsWith('data:')) {
        this.audioEl.muted = false;
        if (this.audioEl.volume === 0) this.audioEl.volume = this.currentVolume ?? 0.8;
        const playPromise = this.audioEl.play();
        if (playPromise !== undefined && typeof playPromise.then === 'function') {
          playPromise.then(() => {
            this.updateMediaSessionState('playing');
            this.listeners.stateChange(true);
          }).catch((err) => {
            console.warn('audioEl.play() rejected:', err);
            this.shouldBePlaying = false;
            this.isUserPaused = true;
            this.updateMediaSessionState('paused');
            this.listeners.stateChange(false);
          });
        }
      } else if (this.currentTrack) {
        // If current deck src was empty, reload current track cleanly
        this.loadVideo(this.currentVideoId || this.currentTrack, true, this.currentTrack);
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
    this.wasInterruptedExternally = false;
    this.shouldBePlaying = false;
    this.stopBackgroundAudioAnchor();
    this.updateMediaSessionState('paused');
    this.releaseWakeLock();

    this.clearDeckTimers(this.deckA);
    this.clearDeckTimers(this.deckB);

    if (this.isCrossfading && this.crossfadeTimer) {
      clearInterval(this.crossfadeTimer);
      this.crossfadeTimer = null;
      this.isCrossfading = false;
    }

    // Unconditionally pause ALL potential audio sources
    if (this.deckA) {
      try { this.deckA.pause(); } catch (e) {}
    }
    if (this.deckB) {
      try { this.deckB.pause(); } catch (e) {}
    }
    if (this.ytPlayer) {
      try {
        if (typeof this.ytPlayer.pauseVideo === 'function') this.ytPlayer.pauseVideo();
        if (typeof this.ytPlayer.stopVideo === 'function') this.ytPlayer.stopVideo();
      } catch (e) {}
      const iframe = document.getElementById('yt-audio-container')?.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        } catch (e) {}
      }
    }
    this.listeners.stateChange(false);
  }

  seekTo(seconds) {
    if (this.crossfadeTimer) {
      clearInterval(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }
    this.isCrossfading = false;
    this.clearDeckTimers(this.deckA);
    this.clearDeckTimers(this.deckB);
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
    if (this.currentDeck && !this.isCrossfading && !this.currentDeck._fadeTimer) {
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
      if (!this.shouldBePlaying || this.isUserPaused || this.wasInterruptedExternally || this.isCrossfading || this.isSwitchingTrack || this.isLoadingTrack) {
        lastTime = -1;
        stuckCount = 0;
        return;
      }

      const deck = this.currentDeck || this.deckA;
      if (this.isDirectAudio || this.isOfflinePlayback) {
        if (!deck) return;

        // Auto-recover if deck ended and engine should be playing but next track hasn't started
        if (deck.ended && this.shouldBePlaying && !this.isUserPaused) {
          stuckCount++;
          if (stuckCount >= 2) {
            stuckCount = 0;
            this.playNextTrack(true);
          }
          return;
        }

        // Auto-recover if deck was paused unexpectedly (e.g. browser buffer underrun) while engine state is playing
        if (deck.paused && !deck.ended && deck.src && !deck.src.startsWith('data:')) {
          stuckCount++;
          if (stuckCount >= 2) {
            stuckCount = 0;
            deck.play().catch(() => {});
          }
          return;
        }

        // Buffer underrun watchdog: check if audio position is frozen in place for ~3-4s while playing
        const cur = deck.currentTime;
        if (!deck.paused && !deck.ended && deck.duration && isFinite(deck.duration) && deck.duration > 0 && cur > 0 && cur < deck.duration - 1) {
          if (Math.abs(cur - lastTime) < 0.05) {
            stuckCount++;
            if (stuckCount >= 3) {
              stuckCount = 0;
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
