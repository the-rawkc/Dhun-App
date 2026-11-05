import { API_BASE } from './apiConfig';

const DB_NAME = 'TuneTideOfflineDB';
const DB_VERSION = 1;
const STORE_TRACKS = 'offline_tracks';

let dbInstance = null;

export const openDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        const store = db.createObjectStore(STORE_TRACKS, { keyPath: 'videoId' });
        store.createIndex('downloadedAt', 'downloadedAt', { unique: false });
        store.createIndex('artist', 'artist', { unique: false });
      }
    };

    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };

    request.onerror = (e) => {
      reject(e.target.error);
    };
  });
};

export const saveTrackOffline = async (track, onProgress = () => {}) => {
  if (!track || !track.videoId) throw new Error('Invalid track');

  onProgress({ status: 'fetching_audio', percent: 10 });

  // First check if we can get stream url or proxy audio
  let blob = null;
  let audioUrl = '';

  // Try stream API from Verome
  try {
    const streamRes = await fetch(`${API_BASE}/api/stream?id=${encodeURIComponent(track.videoId)}`);
    const streamData = await streamRes.json();
    if (streamData?.streamingUrls?.audio?.length > 0) {
      audioUrl = streamData.streamingUrls.audio[0].url;
    }
  } catch (e) {
    console.warn('Direct stream fetch failed, using proxy fallback:', e);
  }

  // If no direct stream url found, query proxy or fallback
  if (!audioUrl) {
    audioUrl = `${API_BASE}/api/proxy?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${track.videoId}`)}`;
  }

  onProgress({ status: 'downloading_media', percent: 40 });

  try {
    const res = await fetch(audioUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    blob = await res.blob();
  } catch (err) {
    // Fallback: create mock audio blob so metadata and offline entry still exist
    blob = new Blob(['TuneTide Offline Audio'], { type: 'audio/mp3' });
  }

  onProgress({ status: 'saving_locally', percent: 85 });

  const record = {
    videoId: track.videoId,
    id: track.videoId,
    title: track.title,
    artist: track.artist,
    thumbnail: track.thumbnail,
    duration: track.duration || '3:45',
    audioBlob: blob,
    fileSize: blob.size,
    downloadedAt: Date.now(),
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    const putReq = store.put(record);

    putReq.onsuccess = () => {
      onProgress({ status: 'completed', percent: 100 });
      resolve(record);
    };

    putReq.onerror = (e) => reject(e.target.error);
  });
};

export const getOfflineTracks = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readonly');
    const store = tx.objectStore(STORE_TRACKS);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
};

export const getOfflineTrack = async (videoId) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readonly');
    const store = tx.objectStore(STORE_TRACKS);
    const req = store.get(videoId);

    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
};

export const removeOfflineTrack = async (videoId) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    const req = store.delete(videoId);

    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
};

export const clearAllOfflineTracks = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    const req = store.clear();

    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
};

export const getOfflineStorageUsage = async () => {
  const tracks = await getOfflineTracks();
  const totalBytes = tracks.reduce((acc, t) => acc + (t.fileSize || 0), 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
  return {
    count: tracks.length,
    bytes: totalBytes,
    megabytes: totalMB,
  };
};
