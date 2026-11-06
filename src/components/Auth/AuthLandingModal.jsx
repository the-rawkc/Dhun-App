import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { loginWithPhoneAndPin } from '../../services/authService';
import { loadCloudUserData } from '../../redux/features/playerSlice';
import { PRESET_AVATARS } from '../../utils/avatars';
import {
  FaPhoneAlt,
  FaLock,
  FaUser,
  FaMusic,
  FaCheck,
  FaShieldAlt,
  FaHeadphones,
  FaArrowRight,
} from 'react-icons/fa';

const AuthLandingModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();

  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0].url);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    if (!pin || pin.length !== 4) {
      setErrorMsg('PIN must be exactly 4 digits');
      return;
    }

    if (authMode === 'register' && !name.trim()) {
      setErrorMsg('Please enter your name');
      return;
    }

    setIsLoading(true);

    try {
      const data = await loginWithPhoneAndPin(
        cleanPhone,
        pin,
        authMode === 'register' ? name.trim() : '',
        authMode === 'register' ? selectedAvatar : ''
      );

      // Load this user's synced music and playlists into Redux
      dispatch(loadCloudUserData(data));

      if (onClose) onClose(data.user);
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestContinue = () => {
    if (onClose) onClose(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in select-none overflow-y-auto">
      {/* Background Decorative Ambient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-rose-600/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="relative w-full max-w-md my-auto rounded-3xl bg-neutral-900/95 border border-white/10 shadow-2xl p-6 sm:p-8 text-white z-10">
        {/* App Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center shadow-lg shadow-rose-600/40 mb-3 border border-white/10">
            <FaMusic className="text-2xl text-white animate-bounce" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome to <span className="text-rose-500">Dhun</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs">
            India's Music Hub • Log in with your phone & PIN to access your songs and playlists anywhere.
          </p>
        </div>

        {/* Auth Mode Toggle Pill */}
        <div className="flex rounded-full bg-white/5 border border-white/10 p-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
              authMode === 'login'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
              authMode === 'register'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs text-center font-medium animate-shake">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Register: Full Name */}
          {authMode === 'register' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Your Name
              </label>
              <div className="relative flex items-center">
                <FaUser className="absolute left-3.5 text-xs text-neutral-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs sm:text-sm placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Mobile Number */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
              Mobile Number
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-xs font-bold text-rose-500 flex items-center gap-1">
                <FaPhoneAlt className="text-[10px]" />
                +91
              </span>
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="10-digit number"
                className="w-full pl-16 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs sm:text-sm placeholder-neutral-500 focus:outline-none focus:border-rose-500 tracking-wider font-mono transition-colors"
              />
            </div>
          </div>

          {/* 4-Digit PIN */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                4-Digit Security PIN
              </label>
              <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                <FaLock className="text-[9px]" /> Secret PIN
              </span>
            </div>
            <div className="relative flex items-center">
              <FaLock className="absolute left-3.5 text-xs text-neutral-400" />
              <input
                type="password"
                required
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-base font-mono tracking-widest placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>
          </div>

          {/* Register: Avatar Selection */}
          {authMode === 'register' && (
            <div className="pt-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Choose Profile Avatar
              </label>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 custom-scrollbar">
                {PRESET_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setSelectedAvatar(av.url)}
                    className={`shrink-0 relative w-11 h-11 rounded-full overflow-hidden transition-all p-0.5 border-2 ${
                      selectedAvatar === av.url
                        ? 'border-rose-500 scale-105 shadow-md shadow-rose-600/50'
                        : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={av.url} alt={av.name} className="w-full h-full object-cover rounded-full" />
                    {selectedAvatar === av.url && (
                      <div className="absolute inset-0 bg-rose-600/40 flex items-center justify-center text-white text-[10px]">
                        <FaCheck />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/40 active:scale-98 transition-all"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Connecting to Dhun Cloud...</span>
              </>
            ) : (
              <>
                <span>{authMode === 'login' ? 'Log In & Load My Music' : 'Create Account & Enter'}</span>
                <FaArrowRight className="text-xs" />
              </>
            )}
          </button>
        </form>

        {/* Feature Highlights */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-around text-neutral-400 text-[11px]">
          <div className="flex items-center gap-1.5">
            <FaShieldAlt className="text-emerald-400 text-xs" />
            <span>PIN Secured</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FaHeadphones className="text-rose-400 text-xs" />
            <span>Background Play</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FaMusic className="text-amber-400 text-xs" />
            <span>Live Lyrics</span>
          </div>
        </div>

        {/* Guest Skip Option */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleGuestContinue}
            className="text-xs text-neutral-400 hover:text-white transition-colors underline decoration-dotted"
          >
            Continue as Guest (Preview Music)
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthLandingModal;
