"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion";
import { TrackCard } from "@/components/track-ui";
import { genres, tracks } from "@/lib/tracks";

export function BeatsPageContent({ hero, catalog, extraSections = [] }) {
  const [filter, setFilter] = useState("all");
  const visible = filter === "all" ? tracks : tracks.filter((track) => track.genre === filter);
  return <>
    {!hero?.hidden && <section className="page-hero"><div className="site-width"><Reveal><p className="eyebrow">{hero?.eyebrow ?? "Beat catalog"}</p><h1>{hero?.heading ?? "Find your starting point."}</h1><p>{hero?.body ?? "Browse artist-ready instrumentals by sound. Need a different arrangement or something built from scratch? Start a custom project."}</p></Reveal></div></section>}
    {!catalog?.hidden && <section className="section beats-section"><div className="site-width">
      <div className="filter-bar" role="group" aria-label="Filter beats by genre"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>{genres.map((genre) => <button key={genre.id} className={filter === genre.id ? "active" : ""} onClick={() => setFilter(genre.id)}>{genre.name}</button>)}</div>
      {visible.length ? <div className="beats-grid">{visible.map((track) => <TrackCard key={track.slug} track={track} />)}</div> : <div className="empty-state"><h2>New music is in progress.</h2><p>This catalog lane is ready for future releases.</p></div>}
    </div></section>}
    {extraSections.map((section) => <PublishedExtraSection key={section.sectionKey} section={section} />)}
  </>;
}

function PublishedExtraSection({ section }) {
  const content = section.content;
  if (content.hidden) return null;
  const cta = content.section_type === "cta";
  const imageStyle = content.image_url ? {
    backgroundImage: `linear-gradient(90deg, rgba(5,7,10,.94), rgba(5,7,10,.55)), url("${content.image_url}")`,
    backgroundPosition: `${content.image_position?.x ?? 50}% ${content.image_position?.y ?? 50}%`,
    backgroundSize: "cover"
  } : undefined;
  return <section className={cta ? "cta-band" : "section"} style={imageStyle}><div className="site-width narrow">
    {content.eyebrow && <p className="eyebrow">{content.eyebrow}</p>}
    {content.heading && <h2 style={{ fontSize: "clamp(44px, 5vw, 72px)", lineHeight: .96 }}>{content.heading}</h2>}
    {content.body && <p style={{ maxWidth: 760, color: "var(--muted)", fontSize: 17 }}>{content.body}</p>}
    {(content.primary_cta_label || content.secondary_cta_label) && <div className="button-row" style={cta ? { justifyContent: "center" } : undefined}>
      {content.primary_cta_label && <Link className="button button-primary" href={content.primary_cta_url || "/contact"}>{content.primary_cta_label} <ArrowRight /></Link>}
      {content.secondary_cta_label && <Link className="button button-secondary" href={content.secondary_cta_url || "/beats"}>{content.secondary_cta_label}</Link>}
    </div>}
  </div></section>;
}
