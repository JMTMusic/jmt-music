"use client";

import { useState } from "react";
import { Reveal } from "@/components/motion";
import { TrackCard } from "@/components/track-ui";
import { genres, tracks } from "@/lib/tracks";

export default function BeatsPage() {
  const [filter, setFilter] = useState("all");
  const visible = filter === "all" ? tracks : tracks.filter((track) => track.genre === filter);
  return (
    <>
      <section className="page-hero"><div className="site-width"><Reveal><p className="eyebrow">Beat catalog</p><h1>Find your starting point.</h1><p>Browse artist-ready instrumentals by sound. Need a different arrangement or something built from scratch? Start a custom project.</p></Reveal></div></section>
      <section className="section beats-section"><div className="site-width">
        <div className="filter-bar" role="group" aria-label="Filter beats by genre">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
          {genres.map((genre) => <button key={genre.id} className={filter === genre.id ? "active" : ""} onClick={() => setFilter(genre.id)}>{genre.name}</button>)}
        </div>
        {visible.length ? <div className="beats-grid">{visible.map((track) => <TrackCard key={track.slug} track={track} />)}</div> : <div className="empty-state"><h2>New music is in progress.</h2><p>This catalog lane is ready for future releases.</p></div>}
      </div></section>
    </>
  );
}
