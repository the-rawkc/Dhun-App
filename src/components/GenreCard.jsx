import axios from "axios"; // Import Axios or your preferred HTTP client
import React from "react";
import { Link } from "react-router-dom";

const GenreCard = ({ genre, image }) => {
  const handleemotionsClick = (emotions) => {
    // Send the selected emotions to the backend
    axios
      .post("https://v2-ccc1.onrender.com/api/user/recommendation", { emotions })
      .then((response) => {
        // Handle the response if needed
        console.log("emotions data sent to the backend:", response.data);
      })
      .catch((error) => {
        // Handle errors if any
        console.error("Error sending emotions data:", error);
      });
  };

  return (
    <Link to={`/genre/${genre}`}>
    <div className="genre-card">
      <div className="flex items-center gap-2">
        <img src={image} alt={`${genre} Mode`} className="genre-image" />
        <p className="genre-name text-white ml-4">{genre}</p>
      </div>
    </div>
  </Link>
  );
};
export default GenreCard;
