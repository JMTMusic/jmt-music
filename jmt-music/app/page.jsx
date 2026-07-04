import Image from "next/image";
import Link from "next/link";
import { ArrowRight, AudioLines, BadgeCheck, Clapperboard, Gauge, KeyboardMusic, Music2, SlidersHorizontal } from "lucide-react";
import { FloatingArtwork, Reveal } from "@/components/motion";
import { TrackCard } from "@/components/track-ui";
import { tracks } from "@/lib/tracks";

const services = [
  [Music2, "Custom Music Production", "Original production shaped around your voice, references, and release goals."],
  [SlidersHorizontal, "Mixing", "Clarity, depth, impact, and a confident balance that translates everywhere."],
  [Gauge, "Mastering", "Release-ready loudness, tone, sequencing, and final quality control."],
  [KeyboardMusic, "Piano & Keyboard Recording", "Expressive live keys, harmonic arrangement, and custom piano parts."],
  [AudioLines, "Beat Licensing", "Artist-ready instrumentals with straightforward licensing options."],
  [Clapperboard, "Sync Licensing", "Original music for film, advertising, podcasts, games, and digital media."]
];

const workflow = [
  ["01", "Tell Me About Your Project", "Share the vision, references, timeline, and what a successful final record means to you."],
  ["02", "Production Begins", "The arrangement, sound palette, performances, and first complete direction take shape."],
  ["03", "Feedback & Revisions", "We refine the details together through a clear, focused revision process."],
  ["04", "Final Mix & Delivery", "You receive polished, organized files prepared for release and future use."]
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-backdrop" />
        <div className="hero-light" />
        <FloatingArtwork className="floating-art art-one"><Image src={tracks[1].coverImage} alt="" width={240} height={240} priority /></FloatingArtwork>
        <FloatingArtwork className="floating-art art-two"><Image src={tracks[4].coverImage} alt="" width={180} height={180} priority /></FloatingArtwork>
        <div className="site-width hero-inner">
          <Reveal className="hero-copy">
            <p className="eyebrow">JMT Music · Independent Production Studio</p>
            <h1>Music That<br />Sounds <em>Finished.</em></h1>
            <p>Professional music production, mixing, mastering, custom instrumentals, and piano composition by JMT Music.</p>
            <div className="button-row">
              <Link className="button button-primary" href="/contact">Hire JMT Music <ArrowRight /></Link>
              <Link className="button button-secondary" href="/beats">Browse Instrumentals</Link>
            </div>
          </Reveal>
          <div className="hero-proof"><span>Production</span><span>Mixing</span><span>Mastering</span><span>Keys</span></div>
        </div>
      </section>

      <section className="section services-home">
        <div className="site-width">
          <Reveal className="section-heading"><div><p className="eyebrow">Full-service production</p><h2>Every detail, from first idea to final master.</h2></div><p>A focused creative partner for artists and teams who want the music to feel intentional at every stage.</p></Reveal>
          <div className="service-grid">
            {services.map(([Icon, title, description], index) => (
              <Reveal className="service-card" delay={index * 0.04} key={title}>
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
          <Reveal className="section-heading"><div><p className="eyebrow">Selected work</p><h2>Records built with purpose.</h2></div><Link className="text-link" href="/portfolio">View all work <ArrowRight /></Link></Reveal>
          <div className="featured-work-grid">{tracks.slice(0, 3).map((track) => <Reveal key={track.slug}><TrackCard track={track} portfolio /></Reveal>)}</div>
        </div>
      </section>

      <section className="section workflow-section">
        <div className="site-width workflow-layout">
          <Reveal className="workflow-intro"><p className="eyebrow">How it works</p><h2>A clear path from idea to delivery.</h2><p>The process stays personal, organized, and focused on making the best record possible.</p><Link className="button button-secondary" href="/contact">Discuss your project</Link></Reveal>
          <div className="workflow-list">
            {workflow.map(([number, title, description]) => <Reveal className="workflow-step" key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></Reveal>)}
          </div>
        </div>
      </section>

      <section className="about-home">
        <div className="about-image"><Image src="/assets/jmt-studio-hero.png" alt="JMT Music production studio" fill sizes="(max-width: 900px) 100vw, 50vw" /></div>
        <Reveal className="about-copy">
          <p className="eyebrow">The producer behind the sound</p>
          <h2>Musical instinct. Technical finish.</h2>
          <p>Jonathan Tripp is a pianist, producer, arranger, and mixing engineer focused on the things listeners feel before they can name them: harmony, movement, space, and emotional timing.</p>
          <ul><li><BadgeCheck /> Artist-centered arrangement</li><li><BadgeCheck /> Expressive piano and keyboard performance</li><li><BadgeCheck /> Detailed, release-ready production</li></ul>
          <Link className="text-link" href="/about">Meet JMT Music <ArrowRight /></Link>
        </Reveal>
      </section>

      <section className="future-strip"><div className="site-width"><p>Built to grow with the work.</p><div><span>Placements</span><span>Credits</span><span>Education</span><span>Producer Tools</span><span>Journal</span></div></div></section>
    </>
  );
}
