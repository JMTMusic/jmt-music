"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, FileCheck2 } from "lucide-react";
import { Reveal } from "@/components/motion";
import { TrackCard } from "@/components/track-ui";
import { PublicCmsSections } from "@/components/public-cms-sections";
import { genres, tracks } from "@/lib/tracks";

const availableGenres = genres.filter((genre) => tracks.some((track) => track.genre === genre.id));

export function BeatsPageContent({ hero, catalog, extraSections = [] }) {
  const [filter, setFilter] = useState("all");
  const visible = filter === "all" ? tracks : tracks.filter((track) => track.genre === filter);
  return <>
    {!hero?.hidden && <section className="page-hero beats-page-hero"><div className="site-width"><Reveal><p className="eyebrow">{hero?.eyebrow ?? "Beats & licensing"}</p><h1>{hero?.heading ?? "Find the beat for your next record."}</h1><p>{hero?.body ?? "Listen to original JMT Music instrumentals created for artists who care about musical detail, strong production, and a sound they can make their own."}</p></Reveal></div></section>}
    {!catalog?.hidden && <section className="section beats-section"><div className="site-width">
      <div className="beats-catalog-toolbar">
        <div className="filter-bar" role="group" aria-label="Filter beats by genre"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All beats</button>{availableGenres.map((genre) => <button key={genre.id} className={filter === genre.id ? "active" : ""} onClick={() => setFilter(genre.id)}>{genre.name}</button>)}</div>
        <p>{visible.length} {visible.length === 1 ? "beat" : "beats"}</p>
      </div>
      <div className="licensing-note">
        <FileCheck2 aria-hidden="true" />
        <div><h2>Licensing made personal.</h2><p>Direct BeatStars links are being added. Until then, inquire for current licensing, custom pricing, arrangement changes, or exclusive options.</p></div>
        <Link className="text-link" href="/contact?service=Beat%20Licensing">Ask about licensing <ArrowRight /></Link>
      </div>
      {visible.length ? <div className="beats-grid">{visible.map((track) => <TrackCard key={track.slug} track={track} catalog />)}</div> : <div className="empty-state"><h2>New music is in progress.</h2><p>More original instrumentals are on the way.</p></div>}
      <div className="beats-custom-cta">
        <div><p className="eyebrow">Custom production</p><h2>Need something custom?</h2><p>Start with your voice, your references, and the feeling you want the record to carry. JMT Music can build an original production around your vision.</p></div>
        <div className="button-row">
          <Link className="button button-primary" href="/contact?service=Custom%20Production">Start Your Project <ArrowRight /></Link>
          <Link className="button button-secondary" href="/services">Explore Services</Link>
        </div>
      </div>
    </div></section>}
    <PublicCmsSections sections={extraSections} />
  </>;
}
