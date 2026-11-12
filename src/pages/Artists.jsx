import React from 'react';
import ArtistCard from '../components/ArtistCard';
import { FaUserFriends } from 'react-icons/fa';
import { KNOWN_ARTIST_PHOTOS } from '../utils/artistPhotos';

const indianArtistsList = [
  { name: 'Arijit Singh', image: KNOWN_ARTIST_PHOTOS['arijit singh'], subscribers: '38M+ Listeners' },
  { name: 'Diljit Dosanjh', image: KNOWN_ARTIST_PHOTOS['diljit dosanjh'], subscribers: '24M+ Listeners' },
  { name: 'Shreya Ghoshal', image: KNOWN_ARTIST_PHOTOS['shreya ghoshal'], subscribers: '22M+ Listeners' },
  { name: 'Karan Aujla', image: KNOWN_ARTIST_PHOTOS['karan aujla'], subscribers: '18M+ Listeners' },
  { name: 'Anirudh Ravichander', image: KNOWN_ARTIST_PHOTOS['anirudh ravichander'], subscribers: '19M+ Listeners' },
  { name: 'Sid Sriram', image: KNOWN_ARTIST_PHOTOS['sid sriram'], subscribers: '15M+ Listeners' },
  { name: 'A. R. Rahman', image: KNOWN_ARTIST_PHOTOS['a. r. rahman'], subscribers: '28M+ Listeners' },
  { name: 'AP Dhillon', image: KNOWN_ARTIST_PHOTOS['ap dhillon'], subscribers: '16M+ Listeners' },
  { name: 'Pritam', image: KNOWN_ARTIST_PHOTOS['pritam'], subscribers: '30M+ Listeners' },
  { name: 'Sonu Nigam', image: KNOWN_ARTIST_PHOTOS['sonu nigam'], subscribers: '20M+ Listeners' },
  { name: 'Neha Kakkar', image: KNOWN_ARTIST_PHOTOS['neha kakkar'], subscribers: '25M+ Listeners' },
  { name: 'Badshah', image: KNOWN_ARTIST_PHOTOS['badshah'], subscribers: '17M+ Listeners' },
  { name: 'Sidhu Moose Wala', image: KNOWN_ARTIST_PHOTOS['sidhu moose wala'], subscribers: '21M+ Listeners' },
  { name: 'Jubin Nautiyal', image: KNOWN_ARTIST_PHOTOS['jubin nautiyal'], subscribers: '18M+ Listeners' },
  { name: 'B Praak', image: KNOWN_ARTIST_PHOTOS['b praak'], subscribers: '14M+ Listeners' },
  { name: 'Guru Randhawa', image: KNOWN_ARTIST_PHOTOS['guru randhawa'], subscribers: '19M+ Listeners' },
  { name: 'Yo Yo Honey Singh', image: KNOWN_ARTIST_PHOTOS['yo yo honey singh'], subscribers: '22M+ Listeners' },
  { name: 'Sunidhi Chauhan', image: KNOWN_ARTIST_PHOTOS['sunidhi chauhan'], subscribers: '16M+ Listeners' },
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
