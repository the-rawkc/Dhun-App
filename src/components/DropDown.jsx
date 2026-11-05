import React, { useState } from 'react';

const EmotionDropdown = ({ onEmotionSelect }) => {
  const emotions = ['Happy', 'Sad', 'Calm', 'Energetic'];
  const [selectedEmotion, setSelectedEmotion] = useState('');

  const handleEmotionChange = (event) => {
    const selectedValue = event.target.value;
    setSelectedEmotion(selectedValue);
    onEmotionSelect(selectedValue);
  };

  return (
    <div>
      <label htmlFor="emotion">Select an Emotion:</label>
      <select id="emotion" value={selectedEmotion} onChange={handleEmotionChange}>
        <option value="">Select Emotion</option>
        {emotions.map((emotion) => (
          <option key={emotion} value={emotion}>
            {emotion}
          </option>
        ))}
      </select>
    </div>
  );
};

export default EmotionDropdown;
