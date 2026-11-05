import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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

const Signup = ({}) => {
  const [username, SetUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedEmotion, setSelectedEmotion] = useState("happy"); // Default to "happy"
  const [loading, setLoading] = useState(false); // Add loading state
  const navigate = useNavigate();

  const handleSignup = (e) => {
    e.preventDefault(); // Prevent the form from submitting the traditional way

    // Basic client-side validation
    if (!username || !email || !password || !confirmPassword) {
      alert("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setLoading(true);

    axios
      .post("https://v2-ccc1.onrender.com/api/user/register", {
        username: username,
        email: email,
        password: password,
        emotions: selectedEmotion, // Send the selected emotion to the backend
      })
      .then((result) => {
        console.log(result);
        setLoading(false);
        navigate("/");
      })
      .catch((err) => {
        setLoading(false);
        console.error(err);
        alert("Signup failed. Please try again.");
      });
  };

  const handleEmotionClick = (emotion) => {
    setSelectedEmotion(emotion);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-200 to-[#6e6ef9]">
      <div className="bg-white bg-opacity-25 p-8 rounded-lg shadow-md w-96 backdrop-blur-md">
        <h2 className="text-3xl font-semibold text-center text-white mb-4">
          Sign Up
        </h2>
        <form>
          <div className="mb-4">
            <label className="text-white">UserName</label>
            <input
              type="username"
              className="w-full p-2 rounded-md bg-white bg-opacity-50 text-gray-800"
              placeholder="UserName"
              value={username}
              onChange={(e) => SetUserName(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="text-white">Email</label>
            <input
              type="email"
              className="w-full p-2 rounded-md bg-white bg-opacity-50 text-gray-800"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="text-white">Password</label>
            <input
              type="password"
              className="w-full p-2 rounded-md bg-white bg-opacity-50 text-gray-800"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="text-white">Confirm Password</label>
            <input
              type="password"
              className="w-full p-2 rounded-md bg-white bg-opacity-50 text-gray-800"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div className="mb-4 emotion-options">
            <label className="text-white">Select Emotion:</label>
            <div className="emotion-images flex flex-row gap-2 justify-center items-center">
              {Object.keys(EmotionImages).map((emotion) => (
                <a
                  key={emotion}
                  // href="#"
                  onClick={() => handleEmotionClick(emotion)}
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
            className="w-full bg-blue-500 hover-bg-blue-600 text-white font-semibold p-2 rounded-md"
            onClick={handleSignup}>
            {loading ? "Signing up..." : "Sign Up"} {/* Show loading text */}
          </button>
        </form>
        <footer className="mt-4 text-center">
          <p className="text-white text-sm">
            Already have an account?{" "}
            <Link to="/" className="text-blue-400 hover-underline">
              Sign In
            </Link>
            .
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Signup;
