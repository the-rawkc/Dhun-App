import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAdminUsers } from '../services/authService';
import {
  FaShieldAlt,
  FaUsers,
  FaMusic,
  FaListUl,
  FaSearch,
  FaArrowLeft,
  FaDownload,
  FaSync,
  FaPhoneAlt,
  FaCalendarAlt,
  FaClock,
  FaTimes,
  FaEye,
  FaCheckCircle,
} from 'react-icons/fa';

const AdminPortal = () => {
  const navigate = useNavigate();

  const [pinInput, setPinInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const loadData = async (pin) => {
    setIsLoading(true);
    setAuthError('');
    try {
      const data = await fetchAdminUsers(pin);
      setUsers(data.users || []);
      setIsAuthenticated(true);
    } catch (err) {
      setAuthError(err.message || 'Incorrect Admin PIN. Access Denied.');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    if (!pinInput) return;
    loadData(pinInput);
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q))
    );
  });

  const totalFavorites = users.reduce((acc, u) => acc + (u.favoritesCount || 0), 0);
  const totalPlaylists = users.reduce((acc, u) => acc + (u.playlistsCount || 0), 0);

  const handleExportCSV = () => {
    if (!users.length) return;
    const headers = ['Phone', 'Name', 'JoinedAt', 'LastActive', 'FavoritesCount', 'PlaylistsCount'];
    const rows = users.map((u) => [
      `+91-${u.phone}`,
      `"${u.name || ''}"`,
      `"${u.joinedAt || ''}"`,
      `"${new Date(u.updatedAt).toISOString()}"`,
      u.favoritesCount || 0,
      u.playlistsCount || 0,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Dhun_Users_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // If not authenticated, show Admin PIN Security Gate
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 select-none animate-fade-in">
        <div className="w-full max-w-md p-8 rounded-3xl theme-bg-card border theme-border shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-600/15 text-rose-500 mx-auto flex items-center justify-center text-2xl mb-4 border border-rose-500/30">
            <FaShieldAlt />
          </div>

          <h1 className="text-2xl font-black theme-text-main">
            Dhun <span className="text-rose-500">Admin Portal</span>
          </h1>
          <p className="text-xs theme-text-muted mt-2 mb-6">
            Enter master admin PIN to monitor registered users, streaming analytics, and cloud databases.
          </p>

          {authError && (
            <div className="p-3 mb-4 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs font-semibold">
              {authError}
            </div>
          )}

          <form onSubmit={handleUnlock} className="flex flex-col gap-4">
            <div>
              <input
                type="password"
                maxLength={4}
                required
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter Admin PIN (e.g. 8888)"
                className="w-full px-4 py-3 rounded-2xl bg-slate-500/10 border theme-border theme-text-main text-center text-lg font-mono tracking-widest focus:outline-none focus:border-rose-500 transition-colors"
              />
              <span className="text-[10px] theme-text-muted mt-1 block">Default master PIN: 8888</span>
            </div>

            <button
              type="submit"
              disabled={isLoading || pinInput.length < 4}
              className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <FaShieldAlt className="text-xs" />
                  <span>Unlock Admin Dashboard</span>
                </>
              )}
            </button>
          </form>

          <button
            onClick={() => navigate('/')}
            className="mt-6 text-xs theme-text-muted hover:theme-text-main transition-colors flex items-center justify-center gap-1.5 mx-auto"
          >
            <FaArrowLeft className="text-[10px]" />
            <span>Back to Dhun App</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-28 select-none animate-fade-in max-w-6xl mx-auto">
      {/* Top Bar Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-400 mb-1 transition-colors"
          >
            <FaArrowLeft className="text-[10px]" />
            <span>Back to Profile</span>
          </button>
          <h1 className="text-2xl md:text-3xl font-black theme-text-main flex items-center gap-2">
            <FaShieldAlt className="text-rose-500" />
            <span>Admin <span className="text-rose-500">Dashboard</span></span>
          </h1>
          <p className="text-xs theme-text-muted mt-0.5">
            Real-time tracking of registered Indian music users, libraries, and playlists
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData(pinInput)}
            className="p-2.5 rounded-2xl bg-slate-500/10 hover:bg-slate-500/20 theme-text-main text-xs font-bold transition-all border theme-border flex items-center gap-1.5"
            title="Refresh Data"
          >
            <FaSync className={`text-xs text-rose-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/30 flex items-center gap-2"
          >
            <FaDownload className="text-xs" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-3xl theme-bg-card border theme-border shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold theme-text-muted uppercase tracking-wider">Total Users</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 text-sm">
              <FaUsers />
            </div>
          </div>
          <span className="text-2xl md:text-3xl font-black theme-text-main">{users.length}</span>
          <span className="text-[10px] text-emerald-500 mt-1 flex items-center gap-1 font-semibold">
            <FaCheckCircle className="text-[9px]" /> Synced in Cloud
          </span>
        </div>

        <div className="p-4 rounded-3xl theme-bg-card border theme-border shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold theme-text-muted uppercase tracking-wider">Liked Songs</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 text-sm">
              <FaMusic />
            </div>
          </div>
          <span className="text-2xl md:text-3xl font-black theme-text-main">{totalFavorites}</span>
          <span className="text-[10px] theme-text-muted mt-1 font-medium">Across all accounts</span>
        </div>

        <div className="p-4 rounded-3xl theme-bg-card border theme-border shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold theme-text-muted uppercase tracking-wider">Playlists</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 text-sm">
              <FaListUl />
            </div>
          </div>
          <span className="text-2xl md:text-3xl font-black theme-text-main">{totalPlaylists}</span>
          <span className="text-[10px] theme-text-muted mt-1 font-medium">Created by users</span>
        </div>

        <div className="p-4 rounded-3xl theme-bg-card border theme-border shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold theme-text-muted uppercase tracking-wider">Database</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-sm">
              <FaCheckCircle />
            </div>
          </div>
          <span className="text-xl md:text-2xl font-black text-emerald-500">Active</span>
          <span className="text-[10px] theme-text-muted mt-1 font-medium">Vercel & Render KV</span>
        </div>
      </div>

      {/* Users Section */}
      <div className="p-5 md:p-6 rounded-3xl theme-bg-card border theme-border shadow-lg">
        {/* Search & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-lg font-bold theme-text-main flex items-center gap-2">
            <span>Registered Users</span>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500/15 text-rose-500">
              {filteredUsers.length}
            </span>
          </h2>

          <div className="relative w-full sm:w-72">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs theme-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user name or phone..."
              className="w-full pl-9 pr-4 py-2 rounded-full bg-slate-500/10 border theme-border text-xs theme-text-main placeholder-slate-400 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>
        </div>

        {/* Users Table / Grid */}
        {filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-xs theme-text-muted">
            No registered users found matching "{searchQuery}".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b theme-border text-[11px] font-bold uppercase tracking-wider theme-text-muted">
                  <th className="py-3 px-3">User</th>
                  <th className="py-3 px-3">Mobile No.</th>
                  <th className="py-3 px-3">Joined Date</th>
                  <th className="py-3 px-3">Last Active</th>
                  <th className="py-3 px-3 text-center">Songs</th>
                  <th className="py-3 px-3 text-center">Playlists</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border text-xs">
                {filteredUsers.map((u) => (
                  <tr key={u.phone} className="hover:bg-slate-500/5 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.phone}`}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border border-rose-500/40"
                        />
                        <span className="font-bold theme-text-main truncate max-w-[140px]">
                          {u.name || 'Unnamed User'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-rose-500 font-semibold">
                      +91 {u.phone}
                    </td>

                    <td className="py-3 px-3 theme-text-muted">
                      <div className="flex items-center gap-1.5">
                        <FaCalendarAlt className="text-[10px]" />
                        <span>{u.joinedAt || 'Recently'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 theme-text-muted">
                      <div className="flex items-center gap-1.5">
                        <FaClock className="text-[10px]" />
                        <span>{u.updatedAt ? new Date(u.updatedAt).toLocaleDateString() : 'Active'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-bold theme-text-main">
                      {u.favoritesCount || 0}
                    </td>

                    <td className="py-3 px-3 text-center font-bold theme-text-main">
                      {u.playlistsCount || 0}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="px-2.5 py-1 rounded-full bg-slate-500/10 hover:bg-slate-500/20 text-rose-500 hover:text-rose-400 font-bold text-[11px] transition-all inline-flex items-center gap-1"
                      >
                        <FaEye className="text-[10px]" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Inspect Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl theme-bg-card border theme-border shadow-2xl p-6 text-left max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b theme-border">
              <div className="flex items-center gap-3">
                <img
                  src={selectedUser.avatar}
                  alt=""
                  className="w-11 h-11 rounded-full object-cover border-2 border-rose-500"
                />
                <div>
                  <h3 className="text-base font-bold theme-text-main">{selectedUser.name}</h3>
                  <p className="text-xs text-rose-500 font-mono">+91 {selectedUser.phone}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-full theme-text-muted hover:theme-text-main bg-slate-500/10"
              >
                <FaTimes />
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 py-4 space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider theme-text-muted mb-2">
                  Playlists ({selectedUser.playlists?.length || 0})
                </h4>
                {selectedUser.playlists?.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedUser.playlists.map((pl, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-500/10 flex items-center justify-between text-xs">
                        <span className="font-semibold theme-text-main">{pl.title}</span>
                        <span className="text-[11px] theme-text-muted">{pl.tracks?.length || 0} songs</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs theme-text-muted">No custom playlists created yet.</p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider theme-text-muted mb-2">
                  Liked Songs Sample ({selectedUser.favorites?.length || 0})
                </h4>
                {selectedUser.favorites?.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                    {selectedUser.favorites.slice(0, 15).map((fav, i) => (
                      <div key={i} className="p-2 rounded-xl bg-slate-500/10 flex items-center justify-between text-xs">
                        <span className="font-semibold theme-text-main truncate max-w-[200px]">{fav.title}</span>
                        <span className="text-[11px] theme-text-muted truncate max-w-[120px]">{fav.artist}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs theme-text-muted">No favorite songs saved yet.</p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t theme-border flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
