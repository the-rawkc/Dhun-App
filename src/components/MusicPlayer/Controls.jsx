import React from 'react';
import { MdSkipNext as NextIcon, MdSkipPrevious as PreviousIcon } from 'react-icons/md';
import { BsArrowRepeat as RepeatIcon, BsFillPauseFill as PauseIcon, BsFillPlayFill as PlayIcon, BsShuffle as ShuffleIcon } from 'react-icons/bs';

const CustomControls = ({ isPlaying, repeat, setRepeat, shuffle, setShuffle, currentSongs, handlePlayPause, handlePrevSong, handleNextSong }) => (
  <div className="flex items-center justify-around md:w-36 lg:w-52 2xl:w-80">
    <RepeatIcon size={20} color={repeat ? 'red' : 'white'} onClick={() => setRepeat((prev) => !prev)} className="hidden sm:block cursor-pointer" />
    {currentSongs?.length && <PreviousIcon size={30} color="#FFF" className="cursor-pointer" onClick={handlePrevSong} />}
    {isPlaying ? (
      <PauseIcon size={45} color="#FFF" onClick={handlePlayPause} className="cursor-pointer" />
    ) : (
      <PlayIcon size={45} color="#FFF" onClick={handlePlayPause} className="cursor-pointer" />
    )}
    {currentSongs?.length && <NextIcon size={30} color="#FFF" className="cursor-pointer" onClick={handleNextSong} />}
    <ShuffleIcon size={20} color={shuffle ? 'red' : 'white'} onClick={() => setShuffle((prev) => !prev)} className="hidden sm:block cursor-pointer" />
  </div>
);

export default CustomControls;
