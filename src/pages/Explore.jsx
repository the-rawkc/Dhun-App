import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetMoodsQuery } from '../redux/services/veromeApi';
import { FaCompass, FaMusic, FaHeadphonesAlt } from 'react-icons/fa';

// Curated high-resolution image dictionary for moods, Indian regions, and music genres
const categoryImages = {
  // Moods & Feelings
  'chill': 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=450&auto=format&fit=crop&q=80',
  'workout': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=450&auto=format&fit=crop&q=80',
  'focus': 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=450&auto=format&fit=crop&q=80',
  'party': 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=450&auto=format&fit=crop&q=80',
  'romance': 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=450&auto=format&fit=crop&q=80',
  'romantic': 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=450&auto=format&fit=crop&q=80',
  'sad': 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=450&auto=format&fit=crop&q=80',
  'sleep': 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=450&auto=format&fit=crop&q=80',
  'gaming': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=450&auto=format&fit=crop&q=80',
  'energize': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=450&auto=format&fit=crop&q=80',
  'feel good': 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=450&auto=format&fit=crop&q=80',
  'commute': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=450&auto=format&fit=crop&q=80',
  'diwali': 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=450&auto=format&fit=crop&q=80',
  'monsoon': 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=450&auto=format&fit=crop&q=80',

  // Indian Regions & Desi Genres
  'hindi': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=450&auto=format&fit=crop&q=80',
  'bollywood': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=450&auto=format&fit=crop&q=80',
  'punjabi': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=450&auto=format&fit=crop&q=80',
  'indian pop': 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=450&auto=format&fit=crop&q=80',
  'desi hip-hop': 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=450&auto=format&fit=crop&q=80',
  'sufi': 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=450&auto=format&fit=crop&q=80',
  'ghazal': 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=450&auto=format&fit=crop&q=80',
  'bhakti': 'https://images.unsplash.com/photo-1609803384069-1cac5953e5e4?w=450&auto=format&fit=crop&q=80',
  'devotional': 'https://images.unsplash.com/photo-1609803384069-1cac5953e5e4?w=450&auto=format&fit=crop&q=80',
  'tamil': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=450&auto=format&fit=crop&q=80',
  'telugu': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=450&auto=format&fit=crop&q=80',
  'bengali': 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=450&auto=format&fit=crop&q=80',
  'bhojpuri': 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=450&auto=format&fit=crop&q=80',
  'haryanvi': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=450&auto=format&fit=crop&q=80',
  'gujarati': 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=450&auto=format&fit=crop&q=80',
  'marathi': 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=450&auto=format&fit=crop&q=80',
  'kannada': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=450&auto=format&fit=crop&q=80',
  'malayalam': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=450&auto=format&fit=crop&q=80',

  // Global Genres
  'pop': 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=450&auto=format&fit=crop&q=80',
  'hip-hop': 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=450&auto=format&fit=crop&q=80',
  'dance & electronic': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=450&auto=format&fit=crop&q=80',
  'rock': 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=450&auto=format&fit=crop&q=80',
  'indie & alternative': 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=450&auto=format&fit=crop&q=80',
  'r&b & soul': 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=450&auto=format&fit=crop&q=80',
  'k-pop': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=450&auto=format&fit=crop&q=80',
  'acoustic': 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=450&auto=format&fit=crop&q=80',
  'classical': 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=450&auto=format&fit=crop&q=80',
  'jazz': 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=450&auto=format&fit=crop&q=80',
  'metal': 'https://images.unsplash.com/photo-1464375117522-1311d6a5b81f?w=450&auto=format&fit=crop&q=80',
};

const getCategoryImg = (title = '') => {
  const key = title.toLowerCase().trim();
  for (const [k, url] of Object.entries(categoryImages)) {
    if (key.includes(k) || k.includes(key)) {
      return url;
    }
  }
  return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=450&auto=format&fit=crop&q=80';
};

const fallbackCategories = [
  {
    title: 'Indian Moods & Vibes',
    items: [
      { title: 'Bollywood Romance', query: 'bollywood romantic hit songs' },
      { title: 'Punjabi Party Hits', query: 'punjabi party dance hits' },
      { title: 'Desi Hip-Hop', query: 'desi hip hop divine emiway' },
      { title: 'Sufi & Ghazals', query: 'sufi ghazal rahat nusrat' },
      { title: 'Bhakti & Devotional', query: 'bhakti devotional bhajan' },
      { title: 'Monsoon Chai', query: 'monsoon hindi songs barish' },
      { title: 'Late Night Chill', query: 'late night hindi lofi chill' },
      { title: 'Desi Gym Workout', query: 'desi gym workout motivation' },
    ],
  },
  {
    title: 'Regional Sounds of India',
    items: [
      { title: 'Hindi', query: 'top hindi bollywood songs' },
      { title: 'Punjabi', query: 'top punjabi songs latest' },
      { title: 'Tamil', query: 'top tamil songs anirudh' },
      { title: 'Telugu', query: 'top telugu songs thaman' },
      { title: 'Bhojpuri', query: 'top bhojpuri hit songs' },
      { title: 'Haryanvi', query: 'top haryanvi songs' },
      { title: 'Gujarati', query: 'top gujarati garba songs' },
      { title: 'Bengali', query: 'top bengali hit songs' },
    ],
  },
  {
    title: 'Global Genres',
    items: [
      { title: 'Pop', query: 'global top pop hits' },
      { title: 'Hip-Hop', query: 'hip hop rap hits' },
      { title: 'Dance & Electronic', query: 'dance electronic edm' },
      { title: 'Rock & Indie', query: 'rock indie classics' },
      { title: 'Acoustic & Unplugged', query: 'acoustic guitar unplugged' },
      { title: 'K-Pop', query: 'k pop bts blackpink' },
    ],
  },
];

const Explore = () => {
  const navigate = useNavigate();
  const { data: moodsData = [], isLoading } = useGetMoodsQuery();

  const categories = moodsData && moodsData.length > 0 ? moodsData : fallbackCategories;

  return (
    <div className="flex flex-col gap-9 pb-28 select-none animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-500">
          <FaCompass className="text-2xl" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold theme-text-main">
            Explore & <span className="text-rose-500">Moods</span>
          </h1>
          <p className="text-xs theme-text-muted mt-0.5">
            Discover music tailored to your emotional vibe, Indian region, or activity
          </p>
        </div>
      </div>

      {categories.map((cat, idx) => {
        const catTitle =
          cat.title === 'Moods & Genres' && idx === 0
            ? 'Featured Moods & Feelings'
            : cat.title === 'Moods & Genres' && idx === 1
            ? 'Regional & Popular Genres'
            : cat.title;

        return (
          <div key={idx} className="flex flex-col gap-3.5">
            <h2 className="text-base md:text-lg font-extrabold theme-text-main tracking-tight">
              {catTitle}
            </h2>

            {/* Grid of Photo Category Cards: ~30% smaller, compact & stylish */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {(cat.items || []).map((item, i) => {
                const imgUrl = getCategoryImg(item.title);
                const searchParam = item.query || `${item.title} songs`;

                return (
                  <div
                    key={i}
                    onClick={() => navigate(`/search/${encodeURIComponent(searchParam)}`)}
                    className="group relative overflow-hidden h-28 sm:h-32 rounded-2xl cursor-pointer shadow-md hover:shadow-xl hover:shadow-rose-600/20 hover:scale-[1.03] active:scale-95 transition-all duration-300 border theme-border"
                  >
                    {/* Background Artwork Image */}
                    <img
                      src={imgUrl}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />

                    {/* Gradient Overlay for high contrast & elegance */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent group-hover:via-black/35 transition-colors" />

                    {/* Card Content */}
                    <div className="relative h-full p-3 flex flex-col justify-between z-10">
                      {/* Top Pill */}
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
                          Dhun
                        </span>
                        <div className="w-6 h-6 rounded-full bg-rose-600/80 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                          <FaMusic />
                        </div>
                      </div>

                      {/* Bottom Title */}
                      <div>
                        <h3 className="font-extrabold text-xs sm:text-sm text-white drop-shadow-md truncate">
                          {item.title}
                        </h3>
                        <span className="text-[10px] text-white/70 font-medium group-hover:text-rose-400 transition-colors">
                          Explore songs &rarr;
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Explore;
