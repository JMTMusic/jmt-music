"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./jmt.module.css";
import { Reveal } from "./Reveal";

function fmtTime(s) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}

/**
 * tracks: [{ n, title, meta, audioUrl }]
 * Single shared <audio> element; only one track plays at a time by design.
 */
export function TrackPlayer({ tracks, onActiveChange }) {
  const audioRef = useRef(null);
  const rowRefs = useRef([]);
  const [current, setCurrent] = useState(-1);
  const [playing, setPlaying] = useState(false);

  useEffect(() => { onActiveChange?.(playing); }, [playing, onActiveChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    const onTime = () => {
      if (!audio.duration) return;
      const row = rowRefs.current[current];
      if (!row) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      const fill = row.querySelector('[data-role="fill"]');
      const cur = row.querySelector('[data-role="cur"]');
      const dur = row.querySelector('[data-role="dur"]');
      if (fill) fill.style.width = pct + "%";
      if (cur) cur.textContent = fmtTime(audio.currentTime);
      if (dur) dur.textContent = fmtTime(audio.duration);
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTime);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTime);
    };
  }, [current]);

  function playPause(i) {
    const audio = audioRef.current;
    if (!audio) return;
    if (i !== current) {
      setCurrent(i);
      audio.src = tracks[i].audioUrl;
      audio.play().catch(() => {});
    } else if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }

  return (
    <Reveal as="div" className={styles.trackList}>
      {tracks.map((t, i) => {
        const isPlaying = i === current && playing;
        return (
          <div
            key={t.n}
            ref={(el) => { rowRefs.current[i] = el; }}
            className={`${styles.track} ${isPlaying ? styles.playing : ""}`}
            onClick={() => playPause(i)}
            role="button"
            tabIndex={0}
            aria-pressed={isPlaying}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); playPause(i); } }}
          >
            <div className={styles.art} aria-hidden="true" />
            <span className={styles.num}>{t.n}</span>
            <div className={styles.body}>
              <span className={styles.ttl}>{t.title}</span>
              {t.meta && <span className={styles.meta}>{t.meta}</span>}
            </div>
            <span className={styles.play} aria-label={`Play ${t.title}`}>
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
                <path d="M1 1L11 7L1 13V1Z" fill="currentColor" />
              </svg>
            </span>
            <div className={styles.prog}><span data-role="fill" className={styles.progFill} /></div>
            <div className={styles.times}>
              <span data-role="cur">0:00</span>
              <span data-role="dur">0:00</span>
            </div>
          </div>
        );
      })}
      <audio ref={audioRef} preload="none" />
    </Reveal>
  );
}
