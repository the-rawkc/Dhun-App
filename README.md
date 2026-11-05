# Dhun — Music Streaming & Offline PWA 🎵

> Fast, free, modern music streaming app with real-time synced lyrics, 5-band Spotify Pro Equalizer, Cloud Sync, and Offline Playback.

---

## ✨ Features

- 🎧 **Unlimited Music Streaming:** Stream songs, albums, and curated playlists powered by the Verome YouTube Music API.
- 🎚️ **Spotify Pro Web Audio DSP & Equalizer:**
  - 5-band interactive Equalizer (60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz)
  - 8D Audio & Spatial 3D Panner
  - Bass Boost, Vocal Clarity & Treble Boost Presets
  - Real-time Tempo & Pitch adjustments
- 🎤 **Real-Time Synced Lyrics:** Word-by-word synced karaoke scrolling powered by LRCLIB with plain lyrics fallback.
- ☁️ **Universal Cloud Database Sync:**
  - Phone + 4-digit PIN authentication (no email or password hassle)
  - Instant cross-device synchronization for favorites, playlists, and preferred themes.
  - JSON Backup & Restore for offline data mobility.
- 💾 **Offline Music Player:** Cache and download tracks locally using IndexedDB for seamless playback without an internet connection.
- 📱 **Progressive Web App (PWA):** Installable on iOS, Android, and Desktop with background playback via Media Session API & Wake Lock.
- 🎨 **Adaptive Theme Modes:** High-contrast Dark and Light themes with fluid glassmorphism UI.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, Redux Toolkit, Tailwind CSS, React Router v6, Lucide / React Icons
- **Audio Engine:** HTML5 Audio, Web Audio API (BiquadFilterNode, StereoPannerNode), YouTube IFrame API
- **Backend API:** Deno 2.x, YouTube Music API, LRCLIB API, In-memory TTL Cache
- **Storage:** IndexedDB (offline tracks), LocalStorage & Central Cloud Database (JSON DB)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Deno](https://deno.com/) (v2+)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/the-rawkc/Dhun-App.git
   cd Dhun-App
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start both Backend & Frontend locally:**
   ```bash
   npm run dev
   ```
   - **Frontend:** [http://localhost:3000](http://localhost:3000)
   - **Verome API Backend:** [http://localhost:8000](http://localhost:8000)

### Individual Scripts

- `npm run client`: Start only the Vite dev server
- `npm run server`: Run the Deno Verome API backend
- `npm run server:dev`: Run Deno backend with file watcher
- `npm run build`: Build production frontend to `dist/`
- `npm run preview`: Preview production build locally

---

## 🌐 Deployment

### 1. Backend (Deno Deploy — 100% Free)
- Link this repository to [Deno Deploy](https://dash.deno.com/).
- Set Entrypoint to `Verome-API/main.ts`.

### 2. Frontend (Vercel / Netlify)
- Link this repository to [Vercel](https://vercel.com).
- Set Environment Variable:
  ```env
  VITE_API_URL=https://<your-deno-deploy-url>.deno.dev
  ```
- Deploy!

---

## 📄 License

MIT © [the-rawkc](https://github.com/the-rawkc)
