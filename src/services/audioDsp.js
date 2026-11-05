/**
 * TuneTide Spotify Pro Audio DSP Engine
 * Web Audio API 5-Band Studio Parametric Equalizer, Spotify Volume Normalization,
 * Dynamic Range Compression, and Spatial Audio Engine.
 */

export const PRESETS = {
  studio: {
    name: 'Best Overall (Balanced)',
    description: 'Crisp sound with punchy bass and crystal clear vocals (recommended)',
    gains: [3.5, 1.5, 0.5, 2.0, 3.5],
  },
  bass: {
    name: 'Super Bass',
    description: 'Extra heavy bass for Bollywood beats, Punjabi tracks, and party music',
    gains: [7.0, 4.5, 0.0, 1.0, 2.0],
  },
  vocal: {
    name: 'Clear Singer Voice',
    description: 'Makes the singer voice louder and clearer — great for slow songs & Ghazals',
    gains: [-1.0, 1.0, 4.5, 3.5, 1.5],
  },
  treble: {
    name: 'Crisp & Sharp',
    description: 'Bright sound that highlights guitar strings and beat details',
    gains: [-1.0, 0.5, 1.0, 4.0, 6.5],
  },
  club: {
    name: 'Party / DJ Beats',
    description: 'Loud punchy kicks and energetic beats for dancing',
    gains: [5.5, 3.5, -1.0, 2.5, 4.5],
  },
  acoustic: {
    name: 'Acoustic & Soft',
    description: 'Warm and relaxing sound for guitar and calm songs',
    gains: [2.0, 1.5, 2.0, 3.0, 3.5],
  },
  flat: {
    name: 'Normal / Original',
    description: 'Original song sound without any modifications',
    gains: [0.0, 0.0, 0.0, 0.0, 0.0],
  },
};

export const FREQUENCIES = [
  { freq: 60, type: 'lowshelf', label: '60 Hz', subLabel: 'Deep Bass' },
  { freq: 250, type: 'peaking', label: '250 Hz', subLabel: 'Punchy Beat' },
  { freq: 1000, type: 'peaking', label: '1 kHz', subLabel: 'Singer Voice' },
  { freq: 4000, type: 'peaking', label: '4 kHz', subLabel: 'Clear Details' },
  { freq: 12000, type: 'highshelf', label: '12 kHz', subLabel: 'High Pitch' },
];

class AudioDSPEngine {
  constructor() {
    this.audioCtx = null;
    this.sourceNode = null;
    this.filters = [];
    this.compressor = null;
    this.panner = null;
    this.masterGain = null;
    this.isInitialized = false;

    // Load saved settings
    this.currentPreset = this.loadSetting('tunetide_eq_preset', 'studio');
    this.currentGains = this.loadSetting(
      'tunetide_eq_gains',
      [...PRESETS[this.currentPreset]?.gains || PRESETS.studio.gains]
    );
    this.isNormalizationEnabled = this.loadSetting('tunetide_audio_norm', true);
    this.isSpatialEnabled = this.loadSetting('tunetide_audio_spatial', true);
    this.currentBitrate = this.loadSetting('tunetide_audio_bitrate', '320');
  }

  loadSetting(key, fallback) {
    if (typeof localStorage === 'undefined') return fallback;
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  }

  saveSetting(key, val) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }

  ensureContext() {
    if (this.audioCtx && this.isInitialized) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;

      this.audioCtx = new AudioContextClass();

      // Create 5-band EQ filters
      this.filters = FREQUENCIES.map((f, i) => {
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = f.type;
        filter.frequency.value = f.freq;
        filter.gain.value = this.currentGains[i] ?? 0;
        if (f.type === 'peaking') {
          filter.Q.value = 1.4;
        }
        return filter;
      });

      // Chain the EQ filters in series
      for (let i = 0; i < this.filters.length - 1; i++) {
        this.filters[i].connect(this.filters[i + 1]);
      }

      // Spotify Pro Dynamics Compressor (Volume Normalizer)
      this.compressor = this.audioCtx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-20, this.audioCtx.currentTime);
      this.compressor.knee.setValueAtTime(24, this.audioCtx.currentTime);
      this.compressor.ratio.setValueAtTime(this.isNormalizationEnabled ? 8 : 1, this.audioCtx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.audioCtx.currentTime);

      // Stereo Panner / Spatial Node
      if (this.audioCtx.createStereoPanner) {
        this.panner = this.audioCtx.createStereoPanner();
        this.panner.pan.setValueAtTime(0, this.audioCtx.currentTime);
      }

      // Master Gain
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);

      // Connect EQ -> Compressor -> Panner -> Master Gain -> Destination
      const lastFilter = this.filters[this.filters.length - 1];
      lastFilter.connect(this.compressor);

      if (this.panner) {
        this.compressor.connect(this.panner);
        this.panner.connect(this.masterGain);
      } else {
        this.compressor.connect(this.masterGain);
      }

      this.masterGain.connect(this.audioCtx.destination);
      this.isInitialized = true;
      return this.audioCtx;
    } catch (err) {
      console.warn('AudioDSPEngine init warning:', err);
      return null;
    }
  }

  attachAudioElement(audioEl) {
    if (!audioEl || typeof window === 'undefined') return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      if (!this.sourceNode) {
        this.sourceNode = ctx.createMediaElementSource(audioEl);
        // Connect media source to first EQ band
        this.sourceNode.connect(this.filters[0]);
      }
    } catch (e) {
      // May already be connected
    }
  }

  setPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    this.currentPreset = presetKey;
    this.currentGains = [...preset.gains];
    this.saveSetting('tunetide_eq_preset', presetKey);
    this.saveSetting('tunetide_eq_gains', this.currentGains);

    this.ensureContext();
    this.filters.forEach((filter, idx) => {
      const g = this.currentGains[idx] ?? 0;
      if (this.audioCtx) {
        filter.gain.setTargetAtTime(g, this.audioCtx.currentTime, 0.05);
      } else {
        filter.gain.value = g;
      }
    });
  }

  setBandGain(index, gainDb) {
    if (index < 0 || index >= this.filters.length) return;
    const clampedGain = Math.max(-12, Math.min(12, gainDb));
    this.currentGains[index] = clampedGain;
    this.currentPreset = 'custom';
    this.saveSetting('tunetide_eq_preset', 'custom');
    this.saveSetting('tunetide_eq_gains', this.currentGains);

    this.ensureContext();
    if (this.filters[index]) {
      if (this.audioCtx) {
        this.filters[index].gain.setTargetAtTime(clampedGain, this.audioCtx.currentTime, 0.05);
      } else {
        this.filters[index].gain.value = clampedGain;
      }
    }
  }

  setNormalization(enabled) {
    this.isNormalizationEnabled = !!enabled;
    this.saveSetting('tunetide_audio_norm', this.isNormalizationEnabled);
    this.ensureContext();
    if (this.compressor && this.audioCtx) {
      this.compressor.ratio.setTargetAtTime(
        this.isNormalizationEnabled ? 8 : 1,
        this.audioCtx.currentTime,
        0.05
      );
    }
  }

  setSpatialAudio(enabled) {
    this.isSpatialEnabled = !!enabled;
    this.saveSetting('tunetide_audio_spatial', this.isSpatialEnabled);
    this.ensureContext();
    // In spatial mode, enhance upper air presence and widen response
    if (this.filters[4] && this.audioCtx) {
      const airGain = this.isSpatialEnabled ? Math.max(2, this.currentGains[4]) : this.currentGains[4];
      this.filters[4].gain.setTargetAtTime(airGain, this.audioCtx.currentTime, 0.05);
    }
  }

  setBitrate(bitrateStr) {
    this.currentBitrate = bitrateStr;
    this.saveSetting('tunetide_audio_bitrate', bitrateStr);
  }

  getSettings() {
    return {
      preset: this.currentPreset,
      gains: [...this.currentGains],
      isNormalizationEnabled: this.isNormalizationEnabled,
      isSpatialEnabled: this.isSpatialEnabled,
      bitrate: this.currentBitrate,
    };
  }
}

export const audioDSP = new AudioDSPEngine();
export default audioDSP;
