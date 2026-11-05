import React from 'react';
import ArtistCard from '../components/ArtistCard';
import { FaUserFriends } from 'react-icons/fa';

const indianArtistsList = [
  { name: 'Arijit Singh', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80', subscribers: '38M+ Listeners' },
  { name: 'Diljit Dosanjh', image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&auto=format&fit=crop&q=80', subscribers: '24M+ Listeners' },
  { name: 'Shreya Ghoshal', image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&auto=format&fit=crop&q=80', subscribers: '22M+ Listeners' },
  { name: 'Karan Aujla', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&auto=format&fit=crop&q=80', subscribers: '18M+ Listeners' },
  { name: 'Anirudh Ravichander', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80', subscribers: '19M+ Listeners' },
  { name: 'Sid Sriram', image: 'https://images.unsplash.com/photo-1445985543470-41fdd6ce388d?w=400&auto=format&fit=crop&q=80', subscribers: '15M+ Listeners' },
  { name: 'A.R. Rahman', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80', subscribers: '28M+ Listeners' },
  { name: 'AP Dhillon', image: 'https://images.unsplash.com/photo-1520523839898-507125cd53c1?w=400&auto=format&fit=crop&q=80', subscribers: '16M+ Listeners' },
  { name: 'Pritam', image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&auto=format&fit=crop&q=80', subscribers: '30M+ Listeners' },
  { name: 'Sonu Nigam', image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80', subscribers: '20M+ Listeners' },
  { name: 'Neha Kakkar', image: 'https://images.unsplash.com/photo-1518972559570-7cc1309f3229?w=400&auto=format&fit=crop&q=80', subscribers: '25M+ Listeners' },
  { name: 'Badshah', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&auto=format&fit=crop&q=80', subscribers: '17M+ Listeners' },
];

const Artists = () => {
  return (
    <div className="flex flex-col gap-8 pb-28 select-none animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-3.5 rounded-2xl bg-rose-600/15 text-rose-500">
          <FaUserFriends className="text-2xl" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold theme-text-main">Top Indian Artists</h1>
          <p className="text-xs theme-text-muted">Explore songs and discography of India's biggest music icons</p>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
        {indianArtistsList.map((artist, i) => (
          <ArtistCard key={i} artist={artist} />
        ))}
      </div>
    </div>
  );
};

export default Artists;
