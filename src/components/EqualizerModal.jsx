import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setIsEqualizerModalOpen, setEqualizerPreset, setAudioQuality } from '../redux/features/playerSlice';
import { audioDSP, PRESETS, FREQUENCIES } from '../services/audioDsp';
import { FaSlidersH, FaTimes, FaVolumeUp, FaBroadcastTower, FaCheck, FaUndo } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';

const EqualizerModal = () => {
  const dispatch = useDispatch();
  const { isEqualizerModalOpen, audioQuality, isPlaying } = useSelector((state) => state.player);

  const [activePreset, setActivePreset] = useState('studio');
  const [bandGains, setBandGains] = useState([3.5, 1.5, 0.5, 2.0, 3.5]);
  const [isNorm, setIsNorm] = useState(true);
  const [isSpatial, setIsSpatial] = useState(true);

  useEffect(() => {
    if (isEqualizerModalOpen) {
      const settings = audioDSP.getSettings();
      setActivePreset(settings.preset);
      setBandGains(settings.gains);
      setIsNorm(settings.isNormalizationEnabled);
      setIsSpatial(settings.isSpatialEnabled);
    }
  }, [isEqualizerModalOpen]);

  if (!isEqualizerModalOpen) return null;

  const handlePresetSelect = (key) => {
    setActivePreset(key);
    if (PRESETS[key]) {
      setBandGains([...PRESETS[key].gains]);
      audioDSP.setPreset(key);
      dispatch(setEqualizerPreset(key));
    }
  };

  const handleBandChange = (index, value) => {
    const newGain = parseFloat(value);
    const newGains = [...bandGains];
    newGains[index] = newGain;
    setBandGains(newGains);
    setActivePreset('custom');
    audioDSP.setBandGain(index, newGain);
  };

  const handleToggleNorm = () => {
    const nextVal = !isNorm;
    setIsNorm(nextVal);
    audioDSP.setNormalization(nextVal);
  };

  const handleToggleSpatial = () => {
    const nextVal = !isSpatial;
    setIsSpatial(nextVal);
    audioDSP.setSpatialAudio(nextVal);
  };

  const handleBitrateSelect = (bitrate) => {
    audioDSP.setBitrate(bitrate);
    dispatch(setAudioQuality(bitrate));
  };

  const handleReset = () => {
    handlePresetSelect('studio');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={() => dispatch(setIsEqualizerModalOpen(false))}
    >
      <div
        className="w-full max-w-2xl rounded-3xl theme-bg-card border theme-border shadow-2xl p-6 sm:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-lg shadow-rose-500/25">
              <FaSlidersH className="text-xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black theme-text-main">Sound Quality & Equalizer</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-sm shadow-rose-500/30">
                  PREMIUM SOUND
                </span>
              </div>
              <p className="text-xs theme-text-muted mt-0.5">
                Customize your bass, singer voice, and sound clarity just like Spotify Premium
              </p>
            </div>
          </div>
          <button
            onClick={() => dispatch(setIsEqualizerModalOpen(false))}
            className="p-2.5 rounded-full hover:bg-slate-500/10 theme-text-muted hover:theme-text-main transition-colors"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* Bitrate Selector (320kbps Spotify Pro) */}
        <div className="p-4 rounded-2xl bg-slate-500/5 border theme-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FaBroadcastTower className="text-rose-500 text-sm" />
              <span className="text-xs font-bold uppercase tracking-wider theme-text-main">Music Clarity</span>
            </div>
            <p className="text-[11px] theme-text-muted mt-0.5">
              Choose how clear and detailed you want your songs to play
            </p>
          </div>
          <div className="flex items-center gap-2">
            {[
              { id: '320', label: 'Very High', sub: 'Best Quality' },
              { id: '256', label: 'High', sub: 'Standard' },
              { id: '128', label: 'Normal', sub: 'Saves Data' },
            ].map((b) => (
              <button
                key={b.id}
                onClick={() => handleBitrateSelect(b.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center ${
                  audioQuality === b.id
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-500/40'
                    : 'bg-slate-500/10 theme-text-muted hover:theme-text-main'
                }`}
              >
                <span>{b.label}</span>
                <span className="text-[9px] font-normal opacity-80">{b.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Presets Horizontal Scroll */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider theme-text-muted">Sound Modes</span>
            <button
              onClick={handleReset}
              className="text-xs font-semibold text-rose-500 hover:underline flex items-center gap-1"
            >
              <FaUndo className="text-[10px]" />
              <span>Reset</span>
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handlePresetSelect(key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  activePreset === key
                    ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20'
                    : 'bg-slate-500/5 theme-text-main border-transparent hover:border-slate-400'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
          {PRESETS[activePreset] && (
            <p className="text-xs theme-text-muted italic mt-1.5">
              "{PRESETS[activePreset].description}"
            </p>
          )}
        </div>

        {/* 5-Band Equalizer Sliders */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-500/5 to-slate-500/10 border theme-border">
          <div className="flex items-end justify-between gap-3 sm:gap-6 h-56 pt-2 pb-1">
            {FREQUENCIES.map((freq, idx) => {
              const gain = bandGains[idx] ?? 0;
              const isPositive = gain > 0;
              return (
                <div key={freq.freq} className="flex-1 flex flex-col items-center h-full justify-between">
                  {/* dB readout */}
                  <span
                    className={`text-[11px] font-black font-mono transition-colors ${
                      gain !== 0 ? 'text-rose-500' : 'theme-text-muted'
                    }`}
                  >
                    {isPositive ? `+${gain.toFixed(1)}` : gain.toFixed(1)} dB
                  </span>

                  {/* Vertical Slider */}
                  <div className="relative flex items-center justify-center h-36 w-full">
                    {/* Center 0dB line */}
                    <div className="absolute w-full h-[1px] bg-slate-500/30 z-0" />
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.5"
                      value={gain}
                      onChange={(e) => handleBandChange(idx, e.target.value)}
                      className="slider-vertical h-36 w-6 appearance-none bg-transparent cursor-pointer relative z-10"
                      style={{
                        writingMode: 'bt-lr',
                        WebkitAppearance: 'slider-vertical',
                      }}
                    />
                  </div>

                  {/* Frequency Labels */}
                  <div className="text-center mt-2">
                    <span className="block text-xs font-bold theme-text-main">{freq.label}</span>
                    <span className="block text-[10px] theme-text-muted">{freq.subLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Enhancements: Equal Volume & 3D Sound */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Automatic Volume Balancer */}
          <div
            onClick={handleToggleNorm}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
              isNorm
                ? 'bg-rose-500/10 border-rose-500 shadow-sm'
                : 'bg-slate-500/5 theme-border hover:border-slate-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isNorm ? 'bg-rose-500 text-white' : 'bg-slate-500/20 theme-text-muted'}`}>
                <FaVolumeUp className="text-sm" />
              </div>
              <div>
                <h4 className="text-xs font-bold theme-text-main">Auto Volume Balance</h4>
                <p className="text-[10px] theme-text-muted">Keeps all songs at the same comfortable loudness</p>
              </div>
            </div>
            <div
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                isNorm ? 'bg-rose-500' : 'bg-slate-600'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                  isNorm ? 'transform translate-x-4' : ''
                }`}
              />
            </div>
          </div>

          {/* 3D Surround Sound */}
          <div
            onClick={handleToggleSpatial}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
              isSpatial
                ? 'bg-rose-500/10 border-rose-500 shadow-sm'
                : 'bg-slate-500/5 theme-border hover:border-slate-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isSpatial ? 'bg-rose-500 text-white' : 'bg-slate-500/20 theme-text-muted'}`}>
                <HiSparkles className="text-sm" />
              </div>
              <div>
                <h4 className="text-xs font-bold theme-text-main">3D Surround Sound</h4>
                <p className="text-[10px] theme-text-muted">Makes music feel wider & richer in your earphones</p>
              </div>
            </div>
            <div
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                isSpatial ? 'bg-rose-500' : 'bg-slate-600'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                  isSpatial ? 'transform translate-x-4' : ''
                }`}
              />
            </div>
          </div>
        </div>

        {/* Live Audio Indicator & Done button */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-xs font-semibold theme-text-muted">
              {isPlaying ? 'Sound Enhancer is Active' : 'Sound Enhancer Ready'}
            </span>
          </div>

          <button
            onClick={() => dispatch(setIsEqualizerModalOpen(false))}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2"
          >
            <FaCheck />
            <span>Apply & Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EqualizerModal;
