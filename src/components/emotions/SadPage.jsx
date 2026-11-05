// HappyPage.jsx

import { useEffect, useState } from "react";
import Loader from "../Loader";
import axios from "axios";

const SadPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Send a POST request to the API with the selected emotion
    const data = {
      emotions: "sad",
    };
    axios
      .post("https://v2-ccc1.onrender.com/api/user/recommendation", data)
      .then((response) => {
        // Handle the API response here
        setData(response.data);
        setLoading(false);
      })
      .catch((error) => {
        // Handle errors here
        console.error(error);
        setLoading(false);
      });
  }, []);

  return (
    <div className="bg-gradient-to-br from-black to-[#6e6ef9] text-white min-h-screen">
      <div className="max-w-screen-xl mx-auto p-4 sm:p-6">
        <h1 className="text-3xl font-bold py-4">Sad Songs</h1>
        {loading ? (
          <Loader />
        ) : (
          <ul className="space-y-4 capitalize">
          {data.map((item) => (
  <li
    key={item.id} 
    className="border p-4 rounded-lg hover:bg-opacity-60 hover:bg-white/10"
  >
    {item.title}
  </li>
))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SadPage;
