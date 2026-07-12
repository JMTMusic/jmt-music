"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Pause, Play, ShoppingBag, Volume2, VolumeX } from "lucide-react";
import { useAudio } from "./audio-provider";
import { getGenreName } from "@/lib/tracks";

function formatTime(value) {
  if (!Number.isFinite(value)) return "0:00";
  return `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, "0")}`;
}

export function PlayButton({ track, compact = false, label = "Play track" }) {
  const { activeTrack, playing, toggle } = useAudio();
  const active = activeTrack?.slug === track.slug && playing;
  const hasAudio = Boolean(track.audioUrl);
  return (
    <button className={compact ? "play-button compact" : "play-button"} onClick={() => toggle(track)} aria-label={`${active ? "Pause" : "Play"} ${track.title}`} disabled={!hasAudio}>
      {active ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
      {!compact && <span>{hasAudio ? (active ? "Pause" : label) : "Preview unavailable"}</span>}
    </button>
  );
}

export function TrackCard({ track, portfolio = false, catalog = false }) {
  const className = portfolio ? "project-card" : catalog ? "track-card catalog-track-card" : "track-card";
  const catalogMeta = [getGenreName(track.genre), track.mood, track.bpm ? `${track.bpm} BPM` : null].filter(Boolean);
  return (
    <article className={className}>
      <div className="track-art">
        {catalog
          ? <div className="track-art-image"><Image src={track.coverImage} alt={`${track.title} artwork`} width={720} height={720} /></div>
          : <Link href={`/projects/${track.slug}`} aria-label={`View ${track.title} project`}><Image src={track.coverImage} alt={`${track.title} artwork`} width={720} height={720} /></Link>}
        <PlayButton track={track} compact />
      </div>
      <div className="track-card-copy">
        {catalog
          ? <div className="catalog-track-meta">{catalogMeta.map((item) => <span key={item}>{item}</span>)}</div>
          : <div className="track-card-top"><span>{track.genre.replace("-", " ")}</span>{track.bpm ? <span>{track.bpm} BPM</span> : null}</div>}
        <h3>{catalog ? track.title : <Link href={`/projects/${track.slug}`}>{track.title}</Link>}</h3>
        <p>{track.shortDescription}</p>
        {portfolio && <strong>{track.productionRole}</strong>}
        <div className="track-card-actions">
          <PlayButton track={track} label={catalog ? "Listen" : "Play track"} />
          {catalog ? <LicenseAction track={track} /> : <Link className="text-link" href={`/projects/${track.slug}`}>View project</Link>}
        </div>
      </div>
    </article>
  );
}

function LicenseAction({ track }) {
  if (track.beatstarsUrl) {
    return <a className="catalog-license-link" href={track.beatstarsUrl} target="_blank" rel="noopener noreferrer" data-analytics-event="beatstars_link_click" data-analytics-label={track.title}>License on BeatStars <ShoppingBag /></a>;
  }

  return <Link className="catalog-license-link" href={`/contact?service=Beat%20Licensing&beat=${encodeURIComponent(track.title)}&beatSlug=${encodeURIComponent(track.slug || "")}`}>Inquire to License <ArrowRight /></Link>;
}

export function GlobalPlayer() {
  const { activeTrack, playing, currentTime, duration, volume, toggle, seek, setVolume } = useAudio();
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
      <div className="player-volume">
        {volume === 0 ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
        <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="Volume" />
      </div>
      <a
        className="player-license"
        href={activeTrack.beatstarsUrl || "/contact"}
        aria-label="License or inquire"
        {...(activeTrack.beatstarsUrl ? {
          "data-analytics-event": "beatstars_link_click",
          "data-analytics-label": activeTrack.title
        } : {})}
        {...(activeTrack.beatstarsUrl ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {activeTrack.beatstarsUrl ? <ShoppingBag /> : <span>Inquire</span>}
      </a>
    </aside>
  );
}
