import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/motion";
import { PlayButton, TrackCard } from "@/components/track-ui";
import { getGenreName, getSimilarTracks, getTrack, tracks } from "@/lib/tracks";

export function generateStaticParams() {
  return tracks.map((track) => ({ slug: track.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const track = getTrack(slug);
  return track ? { title: track.title, description: track.description, openGraph: { images: [track.coverImage] } } : {};
}

export default async function ProjectPage({ params }) {
  const { slug } = await params;
  const track = getTrack(slug);
  if (!track) notFound();
  const similar = getSimilarTracks(track);
  const details = [
    ["BPM", track.bpm],
    ["Key", track.key],
    ["Mood", track.mood],
    ["Role", track.productionRole]
  ].filter(([, value]) => value);
  return (
    <>
      <section className="project-hero"><div className="site-width">
        <Link className="back-link" href="/portfolio"><ArrowLeft /> Portfolio</Link>
        <div className="project-hero-grid">
          <Reveal className="project-art-large"><Image src={track.coverImage} alt={`${track.title} artwork`} width={900} height={900} priority /></Reveal>
          <Reveal className="project-copy"><p className="eyebrow">{getGenreName(track.genre)} · {track.mood}</p><h1>{track.title}</h1><p className="project-description">{track.description}</p><div className="project-player"><PlayButton track={track} /><span>{track.audioUrl ? "Full preview" : "Preview unavailable"}</span></div><dl>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></Reveal>
        </div>
      </div></section>
      <section className="section production-notes"><div className="site-width narrow"><Reveal><p className="eyebrow">Production notes</p><h2>The choices behind the record.</h2><p>{track.productionNotes}</p><div className="tag-row">{track.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></Reveal></div></section>
      <section className="section similar-section"><div className="site-width"><div className="section-heading"><div><p className="eyebrow">Keep listening</p><h2>Similar tracks.</h2></div></div><div className="beats-grid">{similar.map((item) => <TrackCard key={item.slug} track={item} />)}</div></div></section>
      <section className="custom-cta"><div className="site-width"><Reveal><p className="eyebrow">Need something custom?</p><h2>Start with the feeling.<br />Build something original.</h2><Link className="button button-primary" href="/contact">Hire JMT Music <ArrowRight /></Link></Reveal></div></section>
    </>
  );
}
