

import React from 'react';
import { useParams } from 'react-router-dom';

const GenreSongs = () => {
  // Get the genre parameter from the URL
  const { genre } = useParams();

  // You can fetch songs related to the selected genre here and display them.
  // You can use the genre parameter to filter the songs.

  return (
    <div>
      <h2>Songs in {genre} Mode</h2>
      {/* Display the list of songs related to the selected genre */}
    </div>
  );
};

export default GenreSongs;
