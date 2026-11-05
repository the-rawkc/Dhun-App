import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import MobileNav from './components/MobileNav';
import MusicPlayer from './components/MusicPlayer/MusicPlayer';
import AddToPlaylistModal from './components/AddToPlaylistModal';
import EqualizerModal from './components/EqualizerModal';
import {
  Home,
  Search,
  Explore,
  Charts,
  Artists,
  SingerDetails,
  AlbumDetails,
  PlaylistDetails,
  Library,
  Recent,
  Podcast,
  Settings,
  Profile,
} from './pages';

const MainPage = () => {
  return (
    <div className="relative flex h-screen w-screen overflow-hidden theme-bg-main theme-text-main font-sans">
      {/* Desktop Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden theme-bg-main">
        {/* Sticky Top Header / Search */}
        <TopBar />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 py-6 pb-40 lg:pb-32">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/search/:searchTerm" element={<Search />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/charts" element={<Charts />} />
              <Route path="/artists" element={<Artists />} />
              <Route path="/artists/:id" element={<SingerDetails />} />
              <Route path="/album/:id" element={<AlbumDetails />} />
              <Route path="/playlist/:id" element={<PlaylistDetails />} />
              <Route path="/library" element={<Library />} />
              <Route path="/recent" element={<Recent />} />
              <Route path="/podcast" element={<Podcast />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Floating Bottom Music Player (Desktop Bar + Mobile Mini-Player + Mobile Full-Screen Sheet) */}
      <MusicPlayer />

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav />

      {/* Global Add to Playlist Modal */}
      <AddToPlaylistModal />

      {/* Global Spotify Pro Equalizer & Audio DSP Modal */}
      <EqualizerModal />
    </div>
  );
};

export default MainPage;
