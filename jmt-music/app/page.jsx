import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Clapperboard,
  KeyboardMusic,
  Music2,
  SlidersHorizontal,
  Sparkles
} from "lucide-react";
import { FloatingArtwork, Reveal } from "@/components/motion";
import { TrackCard } from "@/components/track-ui";
import { tracks } from "@/lib/tracks";

const services = [
  [Music2, "Music Production", "Complete, artist-centered production from the first idea through a polished arrangement."],
  [AudioLines, "Custom Instrumentals", "Original music built around your voice, creative direction, and intended audience."],
  [SlidersHorizontal, "Mixing & Mastering", "Clarity, depth, impact, and release-ready translation across every playback system."],
  [KeyboardMusic, "Piano / Keyboard Sessions", "Expressive piano, Rhodes, organ, and synth performances that add real musical movement."],
  [Clapperboard, "Sync Licensing", "Original and licensable music for film, advertising, podcasts, games, and branded content."]
];

const strengths = [
  ["Producer-led sound", "One musical point of view guides the arrangement, sound selection, performance, and final polish."],
  ["Piano-driven musicality", "Harmony and expressive keyboard work give every production movement, emotion, and a human center."],
  ["Built for modern release", "Hip hop, lo-fi, trap, cinematic, and sync-ready production designed to translate beyond the studio."]
];

export default function Home() {
  return (
    <>
      <section className="hero production-hero">
        <div className="hero-backdrop" />
        <div className="hero-light" />
        <FloatingArtwork className="floating-art art-one">
          <Image src={tracks[0].coverImage} alt="" width={240} height={240} priority />
        </FloatingArtwork>
        <FloatingArtwork className="floating-art art-two">
          <Image src={tracks[1].coverImage} alt="" width={180} height={180} priority />
        </FloatingArtwork>
        <div className="site-width hero-inner">
          <Reveal className="hero-copy production-hero-copy">
            <p className="eyebrow">JMT Music · Production Studio</p>
            <h1>Production for artists, creators, and brands who need finished music.</h1>
            <p>Original beats, custom instrumentals, sync-ready music, and piano-driven production from JMT Music.</p>
            <div className="button-row">
              <Link className="button button-primary" href="/contact">Start a Project <ArrowRight /></Link>
              <Link className="button button-secondary" href="/beats">Browse Instrumentals</Link>
            </div>
          </Reveal>
          <div className="hero-proof">
            <span>Custom Production</span><span>Mixing</span><span>Sync</span><span>Keys</span>
          </div>
        </div>
      </section>

      <section className="section services-home">
        <div className="site-width">
          <Reveal className="section-heading">
            <div><p className="eyebrow">Studio services</p><h2>From direction to delivery.</h2></div>
            <p>Flexible production support for independent artists, visual storytellers, and creative teams.</p>
          </Reveal>
          <div className="service-grid homepage-service-grid">
            {services.map(([Icon, title, description], index) => (
              <Reveal className="service-card glass-card" delay={index * 0.04} key={title}>
                <Icon />
                <span>0{index + 1}</span>
                <h3>{title}</h3>
                <p>{description}</p>
                <Link className="text-link" href="/services">Learn more <ArrowRight /></Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section portfolio-band">
        <div className="site-width">
          <Reveal className="section-heading">
            <div><p className="eyebrow">Featured work · Recent releases</p><h2>The work speaks first.</h2></div>
            <p>Recent JMT Music releases, selected as proof of range, musicality, and production finish.</p>
          </Reveal>
          <div className="featured-work-grid">
            {tracks.slice(0, 3).map((track) => <Reveal key={track.slug}><TrackCard track={track} portfolio /></Reveal>)}
          </div>
          <Reveal className="section-action"><Link className="button button-secondary" href="/portfolio">View all work <ArrowRight /></Link></Reveal>
        </div>
      </section>

      <section className="section why-section">
        <div className="why-glow" />
        <div className="site-width why-layout">
          <Reveal className="why-intro">
            <p className="eyebrow">Why JMT Music</p>
            <h2>Musical instinct with a professional finish.</h2>
            <p>Every project is shaped by the song, the story, and the feeling it needs to leave behind.</p>
          </Reveal>
          <div className="why-list">
            {strengths.map(([title, description], index) => (
              <Reveal className="why-item glass-card" delay={index * 0.06} key={title}>
                <div><Sparkles /><span>0{index + 1}</span></div>
                <h3>{title}</h3>
                <p>{description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="custom-cta homepage-final-cta">
        <div className="site-width">
          <Reveal>
            <p className="eyebrow">Your next record starts here</p>
            <h2>Ready to build something?</h2>
            <Link className="button button-primary" href="/contact">Start a Project <ArrowRight /></Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
