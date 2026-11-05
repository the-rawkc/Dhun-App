import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import HappyModeImage from "../../assets/1.png";
import SadModeImage from "../../assets/4.png";
import EnergeticModeImage from "../../assets/2.png";
import CalmModeImage from "../../assets/3.png";

const EmotionImages = {
  happy: HappyModeImage,
  sad: SadModeImage,
  energetic: EnergeticModeImage,
  calm: CalmModeImage,
};

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedEmotion, setSelectedEmotion] = useState("happy"); // Default to "happy"
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmotionClick = (e, emotion) => {
    e.preventDefault();
    setSelectedEmotion(emotion);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    axios
      .post("https://v2-ccc1.onrender.com/api/user/login", {
        username: username,
        password: password,
        emotion: selectedEmotion, // Send the selected emotion to the backend
      })
      .then((result) => {
        console.log(result);
        setLoading(false);
        onLoginSuccess();
        navigate("/");
      })
      .catch((err) => {
        setLoading(false);
        console.error(err); // Handle errors or display an error message to the user.
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-200 to-[#6e6ef9]">
      <div className="bg-white bg-opacity-25 p-8 rounded-lg shadow-md w-96 backdrop-blur-md">
        <h2 className="text-3xl font-semibold text-center text-white mb-4">
          Log In
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="text-white">Username</label>
            <input
              type="text"
              className="w-full p-2 rounded-md bg-white bg-opacity-50 text-gray-800"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="text-white">Password</label>
            <input
              type="password"
              className="w-full p-2 rounded-md bg-white bg-opacity-50 text-gray-800"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="text-white">Select Emotion:</label>
            <div className="emotion-options flex space-x-2 justify-center items-center">
              {Object.keys(EmotionImages).map((emotion) => (
                <a
                  key={emotion}
                  href=""
                  onClick={(e) => handleEmotionClick(e, emotion)}
                  className={`emotion-image ${
                    selectedEmotion === emotion ? "selected" : ""
                  }`}>
                  <img src={EmotionImages[emotion]} alt={emotion} width={40} />
                </a>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold p-2 rounded-md">
            {loading ? "Loading..." : "Login"}
          </button>
        </form>
        <footer className="mt-4 text-center">
          <p className="text-white text-sm">
            First time?{" "}
            <Link to="/signup" className="text-blue-400 hover:underline">
              Create an account
            </Link>
            .
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Login;
