"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

const AudioContext = createContext(null);

export function AudioProvider({ children }) {
  const audioRef = useRef(null);
  const [activeTrack, setActiveTrack] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    const updateTime = () => setCurrentTime(audio.currentTime || 0);
    const updateDuration = () => setDuration(audio.duration || 0);
    const stop = () => setPlaying(false);
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("pause", stop);
    audio.addEventListener("ended", stop);
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("pause", stop);
      audio.removeEventListener("ended", stop);
    };
  }, []);

  const toggle = async (track) => {
    const audio = audioRef.current;
    if (activeTrack?.slug === track.slug) {
      if (audio.paused) {
        try {
          await audio.play();
          setPlaying(true);
        } catch {
          setPlaying(false);
        }
      } else {
        audio.pause();
      }
      return;
    }
    audio.src = track.audioUrl;
    audio.load();
    setActiveTrack(track);
    setCurrentTime(0);
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  const seek = (value) => {
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  return (
    <AudioContext.Provider value={{ activeTrack, playing, currentTime, duration, toggle, seek }}>
      {children}
      <audio ref={audioRef} preload="metadata" />
    </AudioContext.Provider>
  );
}

export function useAudio() {
  return useContext(AudioContext);
}
