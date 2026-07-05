"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";

const AudioContext = createContext(null);
const STORAGE_KEY = "jmt-global-player";

export function AudioProvider({ children }) {
  const audioRef = useRef(null);
  const restoredRef = useRef(false);
  const [activeTrack, setActiveTrack] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);

  useEffect(() => {
    const audio = audioRef.current;
    const updateTime = () => setCurrentTime(audio.currentTime || 0);
    const updateDuration = () => setDuration(audio.duration || 0);
    const stop = () => setPlaying(false);
    const start = () => setPlaying(true);
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("pause", stop);
    audio.addEventListener("play", start);
    audio.addEventListener("ended", stop);

    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (saved?.track?.audioUrl) {
        setActiveTrack(saved.track);
        setVolumeState(saved.volume ?? 0.85);
        audio.volume = saved.volume ?? 0.85;
        audio.src = saved.track.audioUrl;
        audio.load();
        audio.addEventListener("loadedmetadata", async function restorePlayback() {
          audio.removeEventListener("loadedmetadata", restorePlayback);
          audio.currentTime = Math.min(saved.currentTime || 0, audio.duration || Infinity);
          setCurrentTime(audio.currentTime);
          if (saved.playing) {
            try {
              await audio.play();
            } catch {
              setPlaying(false);
            }
          }
        });
      } else {
        audio.volume = 0.85;
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    } finally {
      restoredRef.current = true;
    }

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("pause", stop);
      audio.removeEventListener("play", start);
      audio.removeEventListener("ended", stop);
    };
  }, []);

  useEffect(() => {
    if (!restoredRef.current || !activeTrack) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      track: activeTrack,
      currentTime,
      playing,
      volume
    }));
  }, [activeTrack, currentTime, playing, volume]);

  const toggle = async (track) => {
    const audio = audioRef.current;
    if (activeTrack?.slug === track.slug) {
      if (audio.paused) {
        try {
          await audio.play();
          setPlaying(true);
          trackEvent("beat_audio_play", {
            beat_title: track.title,
            beat_slug: track.slug
          });
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
      trackEvent("beat_audio_play", {
        beat_title: track.title,
        beat_slug: track.slug
      });
    } catch {
      setPlaying(false);
    }
  };

  const seek = (value) => {
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  const setVolume = (value) => {
    const nextVolume = Math.min(1, Math.max(0, value));
    audioRef.current.volume = nextVolume;
    setVolumeState(nextVolume);
  };

  return (
    <AudioContext.Provider value={{ activeTrack, playing, currentTime, duration, volume, toggle, seek, setVolume }}>
      {children}
      <audio ref={audioRef} preload="metadata" />
    </AudioContext.Provider>
  );
}

export function useAudio() {
  return useContext(AudioContext);
}
