import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { playTrackNow, toggleFavoriteArtist } from '../redux/features/playerSlice';
import SongRow from '../components/SongRow';
import ArtistCard from '../components/ArtistCard';
import {
  FaPlay,
  FaCheckCircle,
  FaHeart,
  FaRegHeart,
  FaSearch,
  FaTimes,
  FaCompactDisc,
  FaMusic,
  FaUsers,
  FaChevronDown,
  FaChevronUp,
} from 'react-icons/fa';
import { normalizeSong } from '../utils/normalizeSong';
import { getArtistPhoto } from '../utils/artistPhotos';
import { API_BASE } from '../services/apiConfig';

export const isTrackByArtist = (track, artistName) => {
  if (!artistName || !track) return false;

  const targetClean = artistName
    .trim()
    .toLowerCase()
    .replace(/[\.\,\-\_]/g, ' ')
    .replace(/\s+/g, ' ');

  if (!targetClean) return false;
  const targetWords = targetClean.split(' ').filter((w) => w.length > 2);

  // 1. Filter out obvious multi-artist compilations, mashups, jukeboxes, reactions, or covers
  const rawTitle = (track.title || track.name || '').toLowerCase();
  const titleForbidden = [
    'mashup', 'jukebox', 'remix collection', 'top 10', 'top 20', 'non stop', 'non-stop',
    'playlist', 'best of', 'all songs', 'tribute to', 'in the style of', 'karaoke',
    'cover by', 'reaction', 'guitar lesson', 'flute version', 'instrumental cover',
  ];
  if (titleForbidden.some((f) => rawTitle.includes(f))) {
    return false;
  }

  // 2. Gather all strictly credited artist fields (exclude channels/uploaders)
  const creditedList = [];
  if (typeof track.artist === 'string' && track.artist.trim()) creditedList.push(track.artist);
  if (typeof track.author === 'string' && track.author.trim()) creditedList.push(track.author);
  if (typeof track.singers === 'string' && track.singers.trim()) creditedList.push(track.singers);
  if (typeof track.primary_artists === 'string' && track.primary_artists.trim()) creditedList.push(track.primary_artists);
  if (Array.isArray(track.artists)) {
    track.artists.forEach((a) => {
      if (typeof a === 'string') creditedList.push(a);
      else if (a && typeof a.name === 'string') creditedList.push(a.name);
    });
  }

  // Filter out generic labels
  const validCredited = creditedList.filter((a) => {
    const l = a.toLowerCase().trim();
    return l && l !== 'various artists' && l !== 'unknown artist' && l !== 'indian artist';
  });

  // If explicit credited artists exist:
  // The target singer MUST be one of the credited artists!
  if (validCredited.length > 0) {
    const allCreditedLower = validCredited.map((c) =>
      c.toLowerCase().replace(/[\.\,\-\_]/g, ' ').replace(/\s+/g, ' ')
    );

    const hasArtist = allCreditedLower.some((c) => {
      if (c === targetClean) return true;
      if (c.includes(targetClean)) return true;
      if (targetWords.length > 1 && targetWords.every((w) => c.includes(w))) return true;
      return false;
    });

    if (hasArtist) return true;
    return false;
  }

  // 3. Only if NO credited artists were provided by the API:
  const titleClean = rawTitle.replace(/[\.\,\-\_]/g, ' ').replace(/\s+/g, ' ');
  if (
    titleClean.includes(`feat ${targetClean}`) ||
    titleClean.includes(`ft ${targetClean}`) ||
    titleClean.includes(`by ${targetClean}`) ||
    titleClean.includes(`singers ${targetClean}`) ||
    (targetWords.length > 1 && targetWords.every((w) => titleClean.includes(w)))
  ) {
    return true;
  }

  return false;
};

const SingerDetails = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const artistName = searchParams.get('name') || decodeURIComponent(id || '');
  const { favorites, favoriteArtists } = useSelector((state) => state.player);

  const [artistData, setArtistData] = useState(null);
  const [bio, setBio] = useState('');
  const [topSongs, setTopSongs] = useState([]);
  const [allSongs, setAllSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [singles, setSingles] = useState([]);
  const [featuredOn, setFeaturedOn] = useState([]);
  const [relatedArtists, setRelatedArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  // Spotify-style tabs & controls
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'albums' | 'singles' | 'featured'
  const [showAllPopular, setShowAllPopular] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  const isFavoriteArtist = favoriteArtists.some(
    (a) => a.name.toLowerCase() === artistName.toLowerCase()
  );

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchArtistInfo = async () => {
      try {
        const queryId = id || artistName;
        const res = await fetch(`${API_BASE}/api/artists/${encodeURIComponent(queryId)}`);
        const data = await res.json();

        if (isMounted && data?.success) {
          setArtistData(data.artist || { name: artistName });

          if (data.artist?.description) {
            setBio(data.artist.description.replace(/<[^>]*>/g, '').split('Read more')[0].trim());
          }

          // Top Songs (Popular)
          const normTop = (data.topSongs || [])
            .map((t) => normalizeSong(t, data.artist?.name || artistName))
            .filter(Boolean);
          setTopSongs(normTop);

          // All Songs (Verified full discography)
          let normAll = (data.allSongs || [])
            .map((t) => normalizeSong(t, data.artist?.name || artistName))
            .filter(Boolean);

          // If no songs returned or very few, perform strict fallback
          if (normAll.length === 0 && normTop.length > 0) {
            normAll = [...normTop];
          }

          setAllSongs(normAll);
          setAlbums(data.albums || []);
          setSingles(data.singles || []);
          setFeaturedOn(data.featuredOn || []);
          setRelatedArtists(data.relatedArtists || []);
        } else if (isMounted) {
          // Fallback if backend returned error
          setArtistData({ name: artistName });
          const searchRes = await fetch(
            `${API_BASE}/api/search?q=${encodeURIComponent(artistName)}&filter=songs&language=en&hl=en`
          ).then((r) => r.json()).catch(() => ({}));

          const fallbackSongs = (searchRes?.results || [])
            .filter((t) => isTrackByArtist(t, artistName))
            .map((t) => normalizeSong(t, artistName))
            .filter(Boolean);

          setTopSongs(fallbackSongs.slice(0, 10));
          setAllSongs(fallbackSongs);
        }

        // Secondary bio fetch if needed
        if (isMounted && !bio && artistName) {
          try {
            const bioRes = await fetch(
              `${API_BASE}/api/artist/info?artist=${encodeURIComponent(artistName)}`
            );
            const bioData = await bioRes.json();
            if (isMounted && bioData?.bio) {
              setBio(bioData.bio.replace(/<[^>]*>/g, '').split('Read more')[0].trim());
            }
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Artist details load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchArtistInfo();

    return () => {
      isMounted = false;
    };
  }, [id, artistName]);

  // Liked songs by this artist prioritized at the top
  const favSet = new Set(favorites.map((f) => f.videoId));
  const likedByArtist = allSongs.filter((s) => favSet.has(s.videoId));
  const otherSongs = allSongs.filter((s) => !favSet.has(s.videoId));
  const prioritizedAllSongs = [...likedByArtist, ...otherSongs];

  // In-page search filter for All Songs
  const displayedAllSongs = filterQuery.trim()
    ? prioritizedAllSongs.filter((s) => {
        const q = filterQuery.toLowerCase().trim();
        const tMatch = (s.title || '').toLowerCase().includes(q);
        const aMatch = (s.artist || '').toLowerCase().includes(q);
        return tMatch || aMatch;
      })
    : prioritizedAllSongs;

  const displayName = artistData?.name || artistName || 'Artist';
  const rawImage =
    artistData?.thumbnail ||
    artistData?.thumbnails?.[0]?.url ||
    topSongs[0]?.thumbnail ||
    allSongs[0]?.thumbnail ||
    '';
  const displayImage = getArtistPhoto(displayName, rawImage);

  // Play controls
  const handlePlayAll = () => {
    const listToPlay = topSongs.length > 0 ? topSongs : displayedAllSongs;
    if (listToPlay.length > 0) {
      dispatch(playTrackNow({ song: listToPlay[0], songs: listToPlay, index: 0 }));
    }
  };

  const handleFollowArtist = () => {
    dispatch(
      toggleFavoriteArtist({
        name: displayName,
        image: displayImage,
        browseId: artistData?.browseId || id,
      })
    );
  };

  const popularLimit = showAllPopular ? 10 : 5;
  const popularSongs = topSongs.slice(0, popularLimit);

  const handlePlayAlbum = async (e, item) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/albums/${encodeURIComponent(item.browseId)}`);
      const data = await res.json();
      if (data?.tracks?.length > 0) {
        const normTracks = data.tracks
          .map((t) =>
            normalizeSong(
              {
                ...t,
                artist: t.artist || data.artist?.name || displayName,
                thumbnail: t.thumbnail || item.thumbnail || data.album?.thumbnail,
              },
              displayName
            )
          )
          .filter(Boolean);
        if (normTracks.length > 0) {
          dispatch(playTrackNow({ song: normTracks[0], songs: normTracks, index: 0 }));
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to quick-play album/single:', err);
    }
    navigate(`/album/${item.browseId}?name=${encodeURIComponent(item.title)}`);
  };

  return (
    <div className="flex flex-col gap-8 pb-28 select-none animate-fade-in">
      {/* ─── Spotify-Style Artist Header ────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-gradient-to-br from-rose-950/40 via-red-950/20 to-dark-900 border border-rose-500/20 shadow-xl flex flex-col sm:flex-row items-center sm:items-end gap-6">
        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-dark-950 shadow-2xl border-4 border-rose-500/30 shrink-0">
          <img src={displayImage} alt={displayName} className="w-full h-full object-cover" />
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold mb-2">
            <FaCheckCircle className="text-xs" />
            <span>Verified Artist</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black theme-text-main tracking-tight leading-tight">
            {displayName}
          </h1>

          {artistData?.subscribers && (
            <p className="text-xs sm:text-sm theme-text-muted mt-1.5 flex items-center justify-center sm:justify-start gap-1.5">
              <FaUsers className="text-rose-500 text-xs" />
              <span>{artistData.subscribers} subscribers</span>
            </p>
          )}

          {/* Action Row: Big Spotify Play & Follow */}
          <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <button
              onClick={handlePlayAll}
              disabled={topSongs.length === 0 && allSongs.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
            >
              <FaPlay className="text-xs" />
              <span>Play</span>
            </button>

            <button
              onClick={handleFollowArtist}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-xs sm:text-sm font-bold transition-all shadow-sm ${
                isFavoriteArtist
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-slate-500/10 hover:bg-slate-500/20 theme-text-main border-slate-500/30'
              }`}
            >
              {isFavoriteArtist ? <FaHeart className="text-xs" /> : <FaRegHeart className="text-xs" />}
              <span>{isFavoriteArtist ? 'Following' : 'Follow'}</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <div className="w-10 h-10 border-3 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
          <p className="text-xs font-semibold">Loading official discography...</p>
        </div>
      ) : (
        <>
          {/* ─── Spotify Section 1: Popular Tracks ───────────────────────────── */}
          {topSongs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl md:text-2xl font-black theme-text-main">Popular</h2>
              </div>

              <div className="space-y-1">
                {popularSongs.map((song, i) => (
                  <SongRow
                    key={song.videoId || i}
                    song={song}
                    index={i}
                    songs={topSongs}
                    isHighlightedLiked={favSet.has(song.videoId)}
                  />
                ))}
              </div>

              {topSongs.length > 5 && (
                <button
                  onClick={() => setShowAllPopular(!showAllPopular)}
                  className="mt-3 text-xs font-bold theme-text-muted hover:theme-text-main flex items-center gap-1.5 transition-colors"
                >
                  <span>{showAllPopular ? 'Show less' : 'See more'}</span>
                  {showAllPopular ? <FaChevronUp className="text-[10px]" /> : <FaChevronDown className="text-[10px]" />}
                </button>
              )}
            </div>
          )}

          {/* ─── Spotify Section 2: Discography Tabs ─────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-black theme-text-main">Discography</h2>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 mb-4 border-b theme-border pb-3">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'all'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-500/10 hover:bg-slate-500/20 theme-text-muted hover:theme-text-main'
                }`}
              >
                All Songs ({displayedAllSongs.length})
              </button>

              {albums.length > 0 && (
                <button
                  onClick={() => setActiveTab('albums')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    activeTab === 'albums'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-slate-500/10 hover:bg-slate-500/20 theme-text-muted hover:theme-text-main'
                  }`}
                >
                  Albums ({albums.length})
                </button>
              )}

              {singles.length > 0 && (
                <button
                  onClick={() => setActiveTab('singles')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    activeTab === 'singles'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-slate-500/10 hover:bg-slate-500/20 theme-text-muted hover:theme-text-main'
                  }`}
                >
                  Singles & EPs ({singles.length})
                </button>
              )}

              {featuredOn.length > 0 && (
                <button
                  onClick={() => setActiveTab('featured')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    activeTab === 'featured'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-slate-500/10 hover:bg-slate-500/20 theme-text-muted hover:theme-text-main'
                  }`}
                >
                  Appears On ({featuredOn.length})
                </button>
              )}
            </div>

            {/* TAB CONTENT: All Songs */}
            {activeTab === 'all' && (
              <div>
                {/* In-page search bar inside artist catalog */}
                <div className="relative w-full sm:w-80 mb-4">
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder={`Search within ${displayName}'s songs...`}
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-500/10 border theme-border theme-text-main placeholder-slate-400 text-xs focus:outline-none focus:border-rose-500 transition-all"
                  />
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xs theme-text-muted" />
                  {filterQuery && (
                    <button
                      type="button"
                      onClick={() => setFilterQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 theme-text-muted hover:theme-text-main"
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  )}
                </div>

                {displayedAllSongs.length > 0 ? (
                  <div className="space-y-1">
                    {displayedAllSongs.map((song, i) => (
                      <SongRow
                        key={song.videoId || i}
                        song={song}
                        index={i}
                        songs={displayedAllSongs}
                        isHighlightedLiked={favSet.has(song.videoId)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center theme-text-muted text-sm">
                    {filterQuery
                      ? `No songs found matching "${filterQuery}"`
                      : 'No tracks found in verified catalog.'}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Albums */}
            {activeTab === 'albums' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {albums.map((album, idx) => (
                  <div
                    key={album.browseId || idx}
                    onClick={() =>
                      navigate(`/album/${album.browseId}?name=${encodeURIComponent(album.title)}`)
                    }
                    className="group relative p-3 rounded-2xl glass-card cursor-pointer select-none transition-all duration-300 hover:scale-[1.03]"
                  >
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-dark-900 shadow-md mb-2.5">
                      <img
                        src={album.thumbnail || '/placeholder-album.png'}
                        alt={album.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => handlePlayAlbum(e, album)}
                          className="w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 hover:scale-110 transition-all cursor-pointer"
                          title="Play album"
                        >
                          <FaPlay className="text-xs translate-x-0.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-xs sm:text-sm theme-text-main truncate" title={album.title}>
                      {album.title}
                    </h3>
                    <p className="text-[11px] theme-text-muted mt-0.5">
                      {album.year ? `${album.year} • ` : ''}Album
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* TAB CONTENT: Singles & EPs */}
            {activeTab === 'singles' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {singles.map((single, idx) => (
                  <div
                    key={single.browseId || idx}
                    onClick={() =>
                      navigate(`/album/${single.browseId}?name=${encodeURIComponent(single.title)}`)
                    }
                    className="group relative p-3 rounded-2xl glass-card cursor-pointer select-none transition-all duration-300 hover:scale-[1.03]"
                  >
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-dark-900 shadow-md mb-2.5">
                      <img
                        src={single.thumbnail || '/placeholder-album.png'}
                        alt={single.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => handlePlayAlbum(e, single)}
                          className="w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 hover:scale-110 transition-all cursor-pointer"
                          title="Play single"
                        >
                          <FaPlay className="text-xs translate-x-0.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-xs sm:text-sm theme-text-main truncate" title={single.title}>
                      {single.title}
                    </h3>
                    <p className="text-[11px] theme-text-muted mt-0.5">
                      {single.year ? `${single.year} • ` : ''}Single
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* TAB CONTENT: Featured On */}
            {activeTab === 'featured' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {featuredOn.map((feat, idx) => (
                  <div
                    key={feat.browseId || feat.videoId || idx}
                    onClick={() => {
                      if (feat.browseId) {
                        navigate(`/album/${feat.browseId}?name=${encodeURIComponent(feat.title)}`);
                      }
                    }}
                    className="group relative p-3 rounded-2xl glass-card cursor-pointer select-none transition-all duration-300 hover:scale-[1.03]"
                  >
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-dark-900 shadow-md mb-2.5">
                      <img
                        src={feat.thumbnail || '/placeholder-album.png'}
                        alt={feat.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm theme-text-main truncate" title={feat.title}>
                      {feat.title}
                    </h3>
                    {feat.subtitle && (
                      <p className="text-[11px] theme-text-muted mt-0.5 truncate">{feat.subtitle}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── Spotify Section 3: Fans Also Like ──────────────────────────── */}
          {relatedArtists.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl md:text-2xl font-black theme-text-main">Fans Also Like</h2>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {relatedArtists.slice(0, 8).map((rel, idx) => (
                  <ArtistCard
                    key={rel.browseId || idx}
                    artist={{
                      name: rel.name,
                      browseId: rel.browseId,
                      thumbnail: rel.thumbnail,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ─── Spotify Section 4: About / Bio ─────────────────────────────── */}
          {bio && (
            <div className="rounded-2xl p-5 bg-slate-500/5 border theme-border shadow-sm">
              <h3 className="text-base font-bold theme-text-main mb-2">About {displayName}</h3>
              <p className="text-xs sm:text-sm theme-text-muted leading-relaxed line-clamp-4 hover:line-clamp-none transition-all cursor-pointer">
                {bio}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SingerDetails;
