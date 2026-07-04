"use client";

import Image from "next/image";
import Link from "next/link";
import { Pause, Play, ShoppingBag } from "lucide-react";
import { useAudio } from "./audio-provider";

function formatTime(value) {
  if (!Number.isFinite(value)) return "0:00";
  return `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, "0")}`;
}

export function PlayButton({ track, compact = false }) {
  const { activeTrack, playing, toggle } = useAudio();
  const active = activeTrack?.slug === track.slug && playing;
  return (
    <button className={compact ? "play-button compact" : "play-button"} onClick={() => toggle(track)} aria-label={`${active ? "Pause" : "Play"} ${track.title}`}>
      {active ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
      {!compact && <span>{active ? "Pause" : "Play track"}</span>}
    </button>
  );
}

export function TrackCard({ track, portfolio = false }) {
  return (
    <article className={portfolio ? "project-card" : "track-card"}>
      <div className="track-art">
        <Link href={`/projects/${track.slug}`} aria-label={`View ${track.title} project`}>
          <Image src={track.coverImage} alt={`${track.title} artwork`} width={720} height={720} />
        </Link>
        <PlayButton track={track} compact />
      </div>
      <div className="track-card-copy">
        <div className="track-card-top"><span>{track.genre.replace("-", " ")}</span><span>{track.bpm} BPM</span></div>
        <h3><Link href={`/projects/${track.slug}`}>{track.title}</Link></h3>
        <p>{track.shortDescription}</p>
        {portfolio && <strong>{track.productionRole}</strong>}
        <div className="track-card-actions">
          <PlayButton track={track} />
          <Link className="text-link" href={`/projects/${track.slug}`}>View project</Link>
        </div>
      </div>
    </article>
  );
}

export function GlobalPlayer() {
  const { activeTrack, playing, currentTime, duration, toggle, seek } = useAudio();
  if (!activeTrack) return null;
  return (
    <aside className="global-player" aria-label="Audio player">
      <Image src={activeTrack.coverImage} alt="" width={52} height={52} />
      <div className="player-title"><strong>{activeTrack.title}</strong><span>{activeTrack.productionRole}</span></div>
      <button className="player-control" onClick={() => toggle(activeTrack)} aria-label={playing ? "Pause" : "Play"}>
        {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
      </button>
      <span className="player-time">{formatTime(currentTime)}</span>
      <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(event) => seek(Number(event.target.value))} aria-label="Track position" />
      <span className="player-time">{formatTime(duration)}</span>
      <a className="player-license" href={activeTrack.beatstarsUrl || "/contact"} aria-label="License or inquire">
        {activeTrack.beatstarsUrl ? <ShoppingBag /> : <span>Inquire</span>}
      </a>
    </aside>
  );
}
