import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper";

import PlayPause from "./PlayPause";
import { playPause, setActiveSong } from "../redux/features/playerSlice";
import { useGetTopChartsQuery } from "../redux/services/shazamCore";
import HappyModeImage from '../assets/1.png';
import SadModeImage from '../assets/4.png';
import EnergeticModeImage from '../assets/2.png';
import CalmModeImage from '../assets/3.png';


import "swiper/css";
import "swiper/css/free-mode";
import GenreCard from "./GenreCard";
// const GenreCard = ({ genre, image }) => (
//   <Link to={`/genre/${genre}`}>
//   <div className="genre-card">
//     <div className="flex items-center gap-2">
//       <img src={image} alt={`${genre} Mode`} className="genre-image" />
//       <p className="genre-name text-white ml-4">{genre}</p>
//     </div>
//   </div>
// </Link>
// );

const MostPlayedCard = ({
  song,
  i,
  isPlaying,
  activeSong,
  handlePauseClick,
  handlePlayClick,
}) => (
  <div className="w-full flex flex-row items-center hover:bg-[#4c426e] py-2 p-4 rounded-lg curor-pointer mb-2">
    <h3 className="font-bold text-base text-white mr-3">{i + 1}.</h3>
    <div className="flex-1 flex flex-row justify-between items-center">
      <img
        className="w-20 h-20 rounded-lg"
        src={song?.images?.coverart}
        alt={song?.title}
      />
      <div className="flex-1 flex flex-col justify-center mx-3">
        <Link to={"/songs/${song.key}"}>
          <p className="text-xl font-bold text-white">{song?.title}</p>
        </Link>
        <Link to={"/artists/${song?.artists[0].adamid}"}>
          <p className="text-base text-gray-300 mt-1">{song?.subtitle}</p>
        </Link>
      </div>
    </div>
    <PlayPause
      isPlaying={isPlaying}
      activeSong={activeSong}
      song={song}
      handlePause={handlePauseClick}
      handlePlay={handlePlayClick}
    />
  </div>
);

const TopPlay = () => {
  const dispatch = useDispatch();
  const { activeSong, isPlaying } = useSelector((state) => state.player);
  const { data } = useGetTopChartsQuery();
  const divRef = useRef(null);
  useEffect(() => {
    divRef.current.scrollIntoView({ behavior: "smooth" });
  });
  const handlePauseClick = () => {
    dispatch(playPause(false));
  };

  const handlePlayClick = (song, i) => {
    dispatch(setActiveSong({ song, data, i }));
    dispatch(playPause(true));
  };

  const topPlays = data?.slice(0, 5);
  const genres = [
    { name: "Happy Mode", image: HappyModeImage, linkTo: "/happy" },
    { name: "Sad Mode", image: SadModeImage, linkTo: "/sad" },
    { name: "Energetic Mode", image: EnergeticModeImage, linkTo: "/energetic" },
    { name: "Calm Mode", image: CalmModeImage, linkTo: "/calm" },
  ];
  return (
    <div
      ref={divRef}
      className="xl:ml-6 ml-0 xl:mb-0 mb-6 flex-1 xl:max-w-[500px] max-w-full flex flex-col">
      <div className="w-full flex flex-col">
      <div className="mt-3 flex flex-row justify-between items-center">
        <h2 className="text-white font-bold text-2xl">Genre</h2>
        <Link to="/artists">
          <p className="text-gray-300 text-base cursor-pointer">See more</p>
        </Link>
      </div>
      <div className="flex flex-row flex-wrap gap-3 w-24 justify-between items-center">
      {genres.map((genre) => (
  <Link key={genre.linkTo} to={genre.linkTo}>
    <GenreCard genre={genre.name} image={genre.image} />
  </Link>
))}

</div>
        <div className="lg:mt-5 flex flex-row justify-between items-center">
          <h2 className="text-white font-bold text-2xl">Charts</h2>
          <Link to="/artists">
            <p className="text-gray-300 text-base cursor-pointer">See more</p>
          </Link>
        </div>
        <div className="mt-4 flex flex-col gap-1">
          {topPlays?.map((song, i) => (
            <MostPlayedCard
              key={song.key}
              song={song}
              i={i}
              isPlaying={isPlaying}
              activeSong={activeSong}
              handlePauseClick={handlePauseClick}
              handlePlayClick={() => handlePlayClick(song, i)}
            />
          ))}
        </div>
      </div>
      <div className="w-full flex flex-col mt-8">
        <div className="flex flex-row justify-between items-center">
          <h2 className="text-white font-bold text-2xl">Artists</h2>
          <Link to="/artists">
            <p className="text-gray-300 text-base cursor-pointer">See more</p>
          </Link>
        </div>
        <Swiper
          slidesPerView="auto"
          spaceBetween={15}
          freeMode
          centeredSlides
          centeredSlidesBounds
          modules={[FreeMode]}
          className="mt-4">
          {topPlays?.map((song, i) => (
            <SwiperSlide
              key={song?.key}
              style={{ width: "25%", height: "auto" }}
              className="shadow-lg rounded-full animate-slideright">
              <Link to={"/artists/${song?.artists[0].adamid}"}>
                <img
                  src={song?.images?.background}
                  alt="Name"
                  className="rounded-full w-full object-cover"
                />
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};
export default TopPlay;
