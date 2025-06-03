"use client";

import { useState, useRef, useEffect } from 'react';
import styles from './AudioPlayer.module.css';

const AudioPlayer = ({ onClose, sentences, characterVoice }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading', 'playing', 'paused', 'complete'
  const audioRef = useRef(null);
  const audioQueue = useRef([]);
  const abortControllerRef = useRef(null);
  const preloadIndexRef = useRef(1); // Start preloading the second sentence

  // Initialize audio playback on component mount
  useEffect(() => {
    if (sentences && sentences.length > 0) {
      initializeAudioPlayback();
    }
    
    return () => {
      // Clean up audio resources
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Release object URLs to prevent memory leaks
      audioQueue.current.forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []);

  // Handle audio ending - automatically play next sentence
  useEffect(() => {
    const audioElement = audioRef.current;
    
    const handleEnded = () => {
      if (currentIndex < sentences.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setStatus('complete');
      }
    };
    
    if (audioElement) {
      audioElement.addEventListener('ended', handleEnded);
      return () => {
        audioElement.removeEventListener('ended', handleEnded);
      };
    }
  }, [currentIndex, sentences]);

  // Update audio source when currentIndex changes
  useEffect(() => {
    if (audioRef.current && audioQueue.current[currentIndex]) {
      audioRef.current.src = audioQueue.current[currentIndex];
      if (status === 'playing') {
        audioRef.current.play().catch(err => {
          console.error('Error playing audio:', err);
          setError('Failed to play audio. Try clicking play manually.');
        });
      }
    }
  }, [currentIndex]);

  // Preload next audio files in parallel
  useEffect(() => {
    const preloadNextAudio = async () => {
      // Preload up to 2 sentences ahead
      const nextIndex = preloadIndexRef.current;
      
      if (nextIndex < sentences.length && !audioQueue.current[nextIndex]) {
        try {
          await loadAudioForSentence(nextIndex);
          preloadIndexRef.current = nextIndex + 1;
        } catch (err) {
          console.error('Error preloading audio:', err);
        }
      }
    };
    
    preloadNextAudio();
  }, [currentIndex]);

  const initializeAudioPlayback = async () => {
    try {
      setStatus('loading');
      setLoading(true);
      
      // Load first audio file
      await loadAudioForSentence(0);
      
      // Start playing automatically
      if (audioRef.current && audioQueue.current[0]) {
        audioRef.current.src = audioQueue.current[0];
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setStatus('playing');
            })
            .catch(err => {
              console.error('Auto-play prevented:', err);
              setStatus('paused');
              setError('Auto-play was prevented. Click play to start audio.');
            });
        }
      }
    } catch (err) {
      console.error('Error initializing audio playback:', err);
      setError('Failed to initialize audio playback');
      setStatus('paused');
    } finally {
      setLoading(false);
    }
  };

  const loadAudioForSentence = async (index) => {
    if (!sentences[index] || audioQueue.current[index]) return;
    
    try {
      // Create abort controller for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      const sentence = sentences[index];
      const tone = sentence.tone || "";
      
      // Get the backend URL
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // Fetch audio from TTS endpoint (direct to backend)
      const response = await fetch(
        `${backendUrl}/v1/tts?voice=${encodeURIComponent(characterVoice)}&text=${encodeURIComponent(sentence.text)}&tone=${encodeURIComponent(tone)}`,
        { signal: controller.signal }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to get audio: ${response.status}`);
      }
      
      // Create blob from audio response
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      
      // Cache the audio URL
      audioQueue.current[index] = audioUrl;
      
      return audioUrl;
    } catch (err) {
      if (err.name !== 'AbortError') {
        throw err;
      }
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (status === 'playing') {
      audioRef.current.pause();
      setStatus('paused');
    } else {
      // If complete, restart from beginning
      if (status === 'complete') {
        setCurrentIndex(0);
      }
      
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
        setError('Failed to play audio');
      });
      setStatus('playing');
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setStatus('complete');
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'loading':
        return 'Loading audio...';
      case 'playing':
        return `Playing ${currentIndex + 1} of ${sentences.length}`;
      case 'paused':
        return `Paused ${currentIndex + 1} of ${sentences.length}`;
      case 'complete':
        return 'Playback complete';
      default:
        return '';
    }
  };

  return (
    <div className={styles.audioPlayer}>
      <div className={styles.header}>
        <div className={styles.title}>
          {getStatusText()}
        </div>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>
      </div>
      
      <div className={styles.sentenceDisplay}>
        <p className={styles.sentenceText}>
          {sentences[currentIndex]?.text}
        </p>
        {sentences[currentIndex]?.tone && (
          <div className={styles.toneBadge}>
            {sentences[currentIndex].tone}
          </div>
        )}
      </div>
      
      <div className={styles.progress}>
        <div 
          className={styles.progressBar}
          style={{width: `${(currentIndex / (sentences.length - 1)) * 100}%`}}
        ></div>
      </div>
      
      <div className={styles.controls}>
        <button 
          className={styles.controlButton} 
          onClick={handlePrevious}
          disabled={currentIndex === 0 || loading}
        >
          ⏮️
        </button>
        
        <button 
          className={`${styles.playButton} ${loading ? styles.loading : ''}`}
          onClick={togglePlayPause}
          disabled={loading}
        >
          {loading ? '⏳' : status === 'playing' ? '⏸️' : '▶️'}
        </button>
        
        <button 
          className={styles.controlButton} 
          onClick={handleNext}
          disabled={currentIndex >= sentences.length - 1 || loading}
        >
          ⏭️
        </button>
      </div>
      
      {error && <div className={styles.error}>{error}</div>}
      
      <audio ref={audioRef} />
    </div>
  );
};

export default AudioPlayer; 