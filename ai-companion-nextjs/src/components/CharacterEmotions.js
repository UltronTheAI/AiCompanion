"use client";

import { useState, useEffect } from 'react';
import api from '@/services/api';
import styles from './CharacterEmotions.module.css';

const CharacterEmotions = ({ character, clerkId, onUpdate }) => {
  const [emotions, setEmotions] = useState({
    happiness: 50,
    anger: 0,
    sadness: 0,
    excitement: 50,
    curiosity: 50
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Initialize emotions from character data
  useEffect(() => {
    if (character && character.personality && character.personality.emotions) {
      setEmotions({
        happiness: character.personality.emotions.happiness || 50,
        anger: character.personality.emotions.anger || 0,
        sadness: character.personality.emotions.sadness || 0,
        excitement: character.personality.emotions.excitement || 50,
        curiosity: character.personality.emotions.curiosity || 50
      });
    }
  }, [character]);

  const handleChange = (emotion, value) => {
    setEmotions(prev => ({
      ...prev,
      [emotion]: parseInt(value)
    }));
    
    // Clear success/error messages when user makes changes
    if (success) setSuccess(false);
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.updateCharacterEmotions(
        character._id,
        clerkId,
        emotions
      );
      
      setSuccess(true);
      
      // Call the onUpdate callback if provided
      if (onUpdate) {
        onUpdate(response.character);
      }

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error updating emotions:', err);
      setError(err.message || 'Failed to update character emotions');
    } finally {
      setLoading(false);
    }
  };

  const getEmotionColor = (emotion, value) => {
    switch (emotion) {
      case 'happiness':
        return `rgba(255, 193, 7, ${value / 100})`;
      case 'anger':
        return `rgba(244, 67, 54, ${value / 100})`;
      case 'sadness':
        return `rgba(33, 150, 243, ${value / 100})`;
      case 'excitement':
        return `rgba(156, 39, 176, ${value / 100})`;
      case 'curiosity':
        return `rgba(76, 175, 80, ${value / 100})`;
      default:
        return `rgba(158, 158, 158, ${value / 100})`;
    }
  };

  const getEmotionIcon = (emotion) => {
    switch (emotion) {
      case 'happiness':
        return '😊';
      case 'anger':
        return '😠';
      case 'sadness':
        return '😢';
      case 'excitement':
        return '😃';
      case 'curiosity':
        return '🤔';
      default:
        return '😐';
    }
  };

  // Get a description of the character's current emotional state
  const getEmotionalStateDescription = () => {
    const highEmotions = Object.entries(emotions)
      .filter(([_, value]) => value >= 70)
      .map(([emotion, _]) => emotion);
    
    if (highEmotions.length === 0) {
      return "This character is in a balanced emotional state.";
    } else if (highEmotions.length === 1) {
      return `This character is feeling strong ${highEmotions[0]}.`;
    } else {
      const lastEmotion = highEmotions.pop();
      return `This character is feeling ${highEmotions.join(', ')} and ${lastEmotion}.`;
    }
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Character Emotions</h3>
      <p className={styles.description}>
        Adjust how {character.name} expresses emotions during conversations.
      </p>
      
      {error && (
        <div className={styles.error}>{error}</div>
      )}
      
      {success && (
        <div className={styles.success}>Emotions updated successfully!</div>
      )}
      
      <div className={styles.emotionalState}>
        <p>{getEmotionalStateDescription()}</p>
      </div>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        {Object.entries(emotions).map(([emotion, value]) => (
          <div key={emotion} className={styles.emotionControl}>
            <div className={styles.emotionHeader}>
              <label htmlFor={emotion} className={styles.emotionLabel}>
                {getEmotionIcon(emotion)} {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
              </label>
              <span className={styles.emotionValue}>{value}%</span>
            </div>
            <div className={styles.sliderContainer}>
              <input
                type="range"
                id={emotion}
                name={emotion}
                min="0"
                max="100"
                value={value}
                onChange={(e) => handleChange(emotion, e.target.value)}
                className={styles.slider}
                style={{
                  background: `linear-gradient(to right, ${getEmotionColor(emotion, value)}, ${getEmotionColor(emotion, value)} ${value}%, #e0e0e0 ${value}%, #e0e0e0 100%)`
                }}
              />
            </div>
          </div>
        ))}
        
        <button 
          type="submit" 
          className={styles.saveButton}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Emotions'}
        </button>
      </form>
    </div>
  );
};

export default CharacterEmotions; 