import { API_BASE } from './apiConfig';

const CURRENT_USER_KEY = 'tunetide_active_session';
const CLOUD_CONFIG_KEY = 'tunetide_cloud_config';

export const getActiveSession = () => {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const setActiveSession = (user) => {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (e) {}
};

export const getCloudConfig = () => {
  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
    return raw ? JSON.parse(raw) : { provider: 'tunetide_cloud', supabaseUrl: '', supabaseAnonKey: '' };
  } catch (e) {
    return { provider: 'tunetide_cloud', supabaseUrl: '', supabaseAnonKey: '' };
  }
};

export const setCloudConfig = (config) => {
  try {
    localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {}
};

/**
 * Universal Cloud Login using Mobile + 4-digit PIN
 * Connects directly to backend database so data is shared across all mobiles!
 */
export const loginWithPhoneAndPin = async (phone, pin, name = '') => {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) throw new Error('Please enter a valid 10-digit Indian mobile number');
  if (!pin || pin.length !== 4) throw new Error('PIN must be 4 digits');

  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: cleanPhone, pin, name }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Login failed. Please check your credentials.');
  }

  const sessionObj = {
    ...data.user,
    pin, // Stored in session for transparent auto-syncing
  };

  setActiveSession(sessionObj);
  return data;
};

/**
 * Automatically sync library, playlists, and favorites to the central database
 */
export const syncToCloudDatabase = async ({ favorites, playlists, favoriteArtists, themeMode }) => {
  const session = getActiveSession();
  if (!session || !session.phone || !session.pin) return;

  try {
    await fetch(`${API_BASE}/api/auth/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: session.phone,
        pin: session.pin,
        favorites,
        playlists,
        favoriteArtists,
        themeMode,
      }),
    });
  } catch (err) {
    console.warn('Background cloud database sync warning:', err);
  }
};

/**
 * Fetch latest profile & data from Cloud Database
 */
export const fetchCloudProfile = async () => {
  const session = getActiveSession();
  if (!session || !session.phone || !session.pin) return null;

  try {
    const res = await fetch(
      `${API_BASE}/api/auth/profile?phone=${encodeURIComponent(session.phone)}&pin=${encodeURIComponent(session.pin)}`
    );
    const data = await res.json();
    if (data.success) {
      return data;
    }
  } catch (err) {
    console.warn('Error fetching cloud profile:', err);
  }
  return null;
};

export const logoutUser = () => {
  setActiveSession(null);
};

export const exportUserDataJSON = () => {
  const session = getActiveSession();
  const favorites = JSON.parse(localStorage.getItem('tunetide_favorites') || '[]');
  const playlists = JSON.parse(localStorage.getItem('tunetide_playlists') || '[]');
  const favoriteArtists = JSON.parse(localStorage.getItem('tunetide_fav_artists') || '[]');

  const bundle = {
    profile: session,
    favorites,
    playlists,
    favoriteArtists,
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Dhun_Cloud_${session?.phone || 'Guest'}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importUserDataJSON = (jsonString) => {
  try {
    const data = JSON.parse(jsonString);
    if (data.favorites) localStorage.setItem('tunetide_favorites', JSON.stringify(data.favorites));
    if (data.playlists) localStorage.setItem('tunetide_playlists', JSON.stringify(data.playlists));
    if (data.favoriteArtists) localStorage.setItem('tunetide_fav_artists', JSON.stringify(data.favoriteArtists));
    if (data.profile) setActiveSession(data.profile);
    return true;
  } catch (e) {
    throw new Error('Invalid backup file format');
  }
};
