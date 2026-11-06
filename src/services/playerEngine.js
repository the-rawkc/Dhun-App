import { getOfflineTrack } from './offlineStorage';
import { audioDSP } from './audioDsp';

class PlayerEngine {
  constructor() {
    this.ytPlayer = null;
    this.isReady = false;
    this.pendingVideoId = null;
    this.pendingAutoPlay = false;
    this.timeUpdateTimer = null;
    this.currentTrack = null;
    this.currentVideoId = null;
    this.isOfflinePlayback = false;
    this.offlineAudioEl = null;
    this.wakeLock = null;

    this.listeners = {
      timeUpdate: () => {},
      stateChange: () => {},
      ended: () => {},
      durationChange: () => {},
      next: () => {},
      prev: () => {},
    };

    this.initYouTube();
    this.initOfflineAudio();
    this.initMediaSession();
  }

  initOfflineAudio() {
    if (typeof window === 'undefined') return;
    this.offlineAudioEl = new Audio();
    this.offlineAudioEl.preload = 'auto';

    // Attach to Spotify Pro Web Audio DSP engine
    try {
      audioDSP.attachAudioElement(this.offlineAudioEl);
    } catch (e) {}

    this.offlineAudioEl.addEventListener('timeupdate', () => {
      if (this.isOfflinePlayback) {
        this.listeners.timeUpdate(this.offlineAudioEl.currentTime);
      }
    });

    this.offlineAudioEl.addEventListener('loadedmetadata', () => {
      if (this.isOfflinePlayback && this.offlineAudioEl.duration) {
        this.listeners.durationChange(this.offlineAudioEl.duration);
      }
    });

    this.offlineAudioEl.addEventListener('play', () => {
      if (this.isOfflinePlayback) {
        this.listeners.stateChange(true);
        this.requestWakeLock();
      }
    });

    this.offlineAudioEl.addEventListener('pause', () => {
      if (this.isOfflinePlayback) {
        this.listeners.stateChange(false);
        this.releaseWakeLock();
      }
    });

    this.offlineAudioEl.addEventListener('ended', () => {
      if (this.isOfflinePlayback) {
        this.listeners.ended();
      }
    });
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
        // 1px visible container prevents mobile browsers from suspending hidden video playback
        container.style.cssText = 'position:fixed;bottom:0;left:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:9999;overflow:hidden;';
        document.body.appendChild(container);
      }

      let ytDiv = document.getElementById('yt-player-target');
      if (!ytDiv) {
        ytDiv = document.createElement('div');
        ytDiv.id = 'yt-player-target';
        container.appendChild(ytDiv);
      }

      try {
        this.ytPlayer = new window.YT.Player('yt-player-target', {
          height: '100%',
          width: '100%',
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            rel: 0,
            enablejsapi: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : undefined,
            widget_referrer: typeof window !== 'undefined' ? window.location.href : undefined,
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
              if (this.isOfflinePlayback) return;
              if (event.data === 1) { // Playing
                this.startTimeTracking();
                this.listeners.stateChange(true);
                this.requestWakeLock();
                try {
                  // Force highest bitrate audio stream (Spotify Pro quality)
                  if (typeof this.ytPlayer.setPlaybackQuality === 'function') {
                    this.ytPlayer.setPlaybackQuality('highres');
                  }
                } catch (e) {}
                const dur = this.ytPlayer.getDuration();
                if (dur && dur > 0) this.listeners.durationChange(dur);
                this.updateMediaSessionState('playing');
              } else if (event.data === 2) { // Paused
                this.stopTimeTracking();
                this.listeners.stateChange(false);
                this.releaseWakeLock();
                this.updateMediaSessionState('paused');
              } else if (event.data === 0) { // Ended
                this.stopTimeTracking();
                this.listeners.ended();
                this.updateMediaSessionState('none');
              } else if (event.data === 5) { // Video Cued (Ready to play on mobile)
                if (this.pendingAutoPlay || this.currentTrack) {
                  try {
                    this.ytPlayer.playVideo();
                  } catch (e) {}
                }
              }
            },
            onError: (event) => {
              console.warn('YouTube Player Event Error:', event.data);
              // Video restricted on mobile / embedding disabled (101, 150) or invalid (2, 100) -> auto advance
              if (event.data === 150 || event.data === 101 || event.data === 100 || event.data === 2) {
                setTimeout(() => {
                  this.listeners.next();
                }, 800);
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

  setListeners({ onTimeUpdate, onStateChange, onEnded, onDurationChange, onNext, onPrev }) {
    if (onTimeUpdate) this.listeners.timeUpdate = onTimeUpdate;
    if (onStateChange) this.listeners.stateChange = onStateChange;
    if (onEnded) this.listeners.ended = onEnded;
    if (onDurationChange) this.listeners.durationChange = onDurationChange;
    if (onNext) this.listeners.next = onNext;
    if (onPrev) this.listeners.prev = onPrev;
  }

  initMediaSession() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => this.play());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.listeners.prev());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.listeners.next());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) this.seekTo(details.seekTime);
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        this.seekTo(Math.max(0, this.getCurrentTime() - offset));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        this.seekTo(this.getCurrentTime() + offset);
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

  unlockAudio() {
    if (typeof window === 'undefined') return;
    try {
      audioDSP.ensureContext();
      if (this.offlineAudioEl) {
        const p = this.offlineAudioEl.play();
        if (p && typeof p.then === 'function') {
          p.then(() => this.offlineAudioEl.pause()).catch(() => {});
        }
      }
      if (this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
        try {
          this.ytPlayer.playVideo();
        } catch (e) {}
      }
    } catch (e) {}
  }

  async loadVideo(videoId, autoPlay = true, trackMeta = null) {
    if (!videoId) return;
    const cleanVideoId = typeof videoId === 'object' ? (videoId.videoId || videoId.id) : String(videoId).trim();
    if (!cleanVideoId) return;

    this.currentVideoId = cleanVideoId;
    this.currentTrack = trackMeta;
    this.updateMediaMetadata(trackMeta);

    // Check if track is available offline first
    try {
      const offlineRecord = await getOfflineTrack(cleanVideoId);
      if (offlineRecord?.audioBlob && offlineRecord.audioBlob.size > 100) {
        this.isOfflinePlayback = true;
        if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
          try { this.ytPlayer.pauseVideo(); } catch (e) {}
        }
        const objUrl = URL.createObjectURL(offlineRecord.audioBlob);
        this.offlineAudioEl.src = objUrl;
        if (autoPlay) {
          this.offlineAudioEl.play().catch(() => {});
        }
        return;
      }
    } catch (e) {
      console.warn('Offline check error:', e);
    }

    // Otherwise online YouTube stream playback
    this.isOfflinePlayback = false;
    if (this.offlineAudioEl) {
      this.offlineAudioEl.pause();
      this.offlineAudioEl.src = '';
    }

    if (!this.isReady || !this.ytPlayer || typeof this.ytPlayer.loadVideoById !== 'function') {
      this.pendingVideoId = cleanVideoId;
      this.pendingAutoPlay = autoPlay;
      return;
    }

    try {
      audioDSP.ensureContext();
      if (autoPlay) {
        this.ytPlayer.loadVideoById(cleanVideoId);
        try {
          this.ytPlayer.playVideo();
        } catch (err) {}
      } else {
        this.ytPlayer.cueVideoById(cleanVideoId);
      }
    } catch (e) {
      console.warn('loadVideo error:', e);
    }
  }

  play() {
    if (this.isOfflinePlayback && this.offlineAudioEl) {
      this.offlineAudioEl.play().catch(() => {});
    } else if (this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
      try { this.ytPlayer.playVideo(); } catch (e) {}
    }
  }

  pause() {
    if (this.isOfflinePlayback && this.offlineAudioEl) {
      this.offlineAudioEl.pause();
    } else if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      try { this.ytPlayer.pauseVideo(); } catch (e) {}
    }
  }

  seekTo(seconds) {
    if (this.isOfflinePlayback && this.offlineAudioEl) {
      this.offlineAudioEl.currentTime = seconds;
      this.listeners.timeUpdate(seconds);
    } else if (this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
      try {
        this.ytPlayer.seekTo(seconds, true);
        this.listeners.timeUpdate(seconds);
      } catch (e) {}
    }
  }

  getCurrentTime() {
    if (this.isOfflinePlayback && this.offlineAudioEl) {
      return this.offlineAudioEl.currentTime || 0;
    }
    if (this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
      try { return this.ytPlayer.getCurrentTime() || 0; } catch (e) {}
    }
    return 0;
  }

  setVolume(fraction) {
    const vol = Math.max(0, Math.min(1, fraction));
    if (this.offlineAudioEl) {
      this.offlineAudioEl.volume = vol;
    }
    if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
      try { this.ytPlayer.setVolume(Math.round(vol * 100)); } catch (e) {}
    }
  }

  startTimeTracking() {
    this.stopTimeTracking();
    this.timeUpdateTimer = setInterval(() => {
      if (!this.isOfflinePlayback && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
        try {
          const current = this.ytPlayer.getCurrentTime();
          const duration = this.ytPlayer.getDuration();
          if (typeof current === 'number') this.listeners.timeUpdate(current);
          if (typeof duration === 'number' && duration > 0) this.listeners.durationChange(duration);
        } catch (e) {}
      }
    }, 300);
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
