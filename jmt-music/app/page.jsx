import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  KeyboardMusic,
  Music2,
  SlidersHorizontal,
  Sparkles
} from "lucide-react";
import { FloatingArtwork, Reveal } from "@/components/motion";
import { TrackCard } from "@/components/track-ui";
import { tracks } from "@/lib/tracks";
import { getPublishedSection } from "@/lib/public-cms";
import { getPublishedPageSections } from "@/lib/public-cms";
import { PublicCmsSections } from "@/components/public-cms-sections";

const services = [
  [Music2, "Music Production", "Thoughtful production and arrangement shaped around the song, the artist, and the feeling that needs to come through."],
  [SlidersHorizontal, "Mixing & Mastering", "Detailed, musical finishing work that protects the character of the record while giving every element clarity and impact."],
  [KeyboardMusic, "Piano & Keyboard Sessions", "Expressive piano, Rhodes, organ, and synth performances created to bring movement, harmony, and emotion to the music."]
];

const strengths = [
  ["Craft before shortcuts", "Every arrangement, performance, and mix decision is made with intention. The details matter because the song matters."],
  ["Built around the artist", "The goal is not to impose a house sound. It is to understand your vision and help it come through with greater depth and confidence."],
  ["A musician's attention", "Harmony, rhythm, dynamics, and tone are treated as one emotional picture, giving each production a human center."]
];

export default async function Home() {
  const [hero, servicesCms, featured, philosophy, finalCta, publishedSections] = await Promise.all([
    getPublishedSection("homepage-hero"),
    getPublishedSection("home-services"),
    getPublishedSection("home-featured-work"),
    getPublishedSection("about"),
    getPublishedSection("home-final-cta"),
    getPublishedPageSections("home")
  ]);
  const extraSections = publishedSections.filter((section) => !["homepage-hero", "home-services", "home-featured-work", "about", "home-final-cta"].includes(section.sectionKey));
  return (
    <>
      {!hero?.hidden && <section className="hero production-hero">
        <div className="hero-backdrop" style={hero?.image_url ? { backgroundImage: `url("${hero.image_url}")`, backgroundPosition: `${hero.image_position?.x ?? 58}% ${hero.image_position?.y ?? 50}%` } : undefined} />
        <div className="hero-light" />
        <FloatingArtwork className="floating-art art-one">
          <Image src={tracks[0].coverImage} alt="" width={240} height={240} priority />
        </FloatingArtwork>
        <FloatingArtwork className="floating-art art-two">
          <Image src={tracks[1].coverImage} alt="" width={180} height={180} priority />
        </FloatingArtwork>
        <div className="site-width hero-inner">
          <Reveal className="hero-copy production-hero-copy">
            <p className="eyebrow">{hero?.eyebrow ?? "JMT Music · Music Production Studio"}</p>
            <h1>{hero?.heading ?? "Your music deserves this level of care."}</h1>
            <p>{hero?.body ?? "JMT Music helps artists turn meaningful ideas into powerful records through thoughtful production, musical detail, and genuine care for every project."}</p>
            <div className="button-row">
              <Link className="button button-primary" href="/beats">Explore Beats <ArrowRight /></Link>
              <Link className="button button-secondary" href="/contact">Start Your Project</Link>
            </div>
          </Reveal>
          <div className="hero-proof">
            <span>Production</span><span>Mixing & Mastering</span><span>Piano & Keys</span><span>Sync</span>
          </div>
        </div>
      </section>}

      {!servicesCms?.hidden && <section className="section services-home">
        <div className="site-width">
          <Reveal className="section-heading">
            <div><p className="eyebrow">{servicesCms?.eyebrow ?? "Studio services"}</p><h2>{servicesCms?.heading ?? "Care at every stage."}</h2></div>
            <p>{servicesCms?.body ?? "Focused creative support for artists who want every part of the music to feel intentional."}</p>
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
          <Reveal className="section-action homepage-services-action">
            <Link className="button button-secondary" href="/services">Explore all services <ArrowRight /></Link>
          </Reveal>
        </div>
      </section>}

      {!featured?.hidden && <section className="section portfolio-band">
        <div className="site-width">
          <Reveal className="section-heading">
            <div><p className="eyebrow">{featured?.eyebrow ?? "Featured releases"}</p><h2>{featured?.heading ?? "Listen to the details."}</h2></div>
            <p>{featured?.body ?? "A focused selection of JMT Music productions, chosen for their musicality, character, and attention to detail."}</p>
          </Reveal>
          <div className="featured-work-grid">
            {tracks.slice(0, 3).map((track) => <Reveal key={track.slug}><TrackCard track={track} portfolio /></Reveal>)}
          </div>
          <Reveal className="section-action"><Link className="button button-secondary" href="/beats">Explore more beats <ArrowRight /></Link></Reveal>
        </div>
      </section>}

      {!philosophy?.hidden && <section className="section why-section">
        <div className="why-glow" />
        <div className="site-width why-layout">
          <Reveal className="why-intro">
            <p className="eyebrow">{philosophy?.eyebrow ?? "Why JMT Music"}</p>
            <h2>{philosophy?.heading ?? "Craftsmanship is an act of care."}</h2>
            <p>{philosophy?.body ?? "JMT Music exists to create music with exceptional craftsmanship and genuine care. Every artist, every project, and every song deserves the attention it takes to become something unforgettable."}</p>
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
      </section>}

      {!finalCta?.hidden && <section className="custom-cta homepage-final-cta">
        <div className="site-width">
          <Reveal>
            <p className="eyebrow">{finalCta?.eyebrow ?? "Your next record starts here"}</p>
            <h2>{finalCta?.heading ?? "Let's make the record you hear in your head."}</h2>
            <p className="homepage-final-copy">{finalCta?.body ?? "Bring the idea, the voice memo, or the unfinished song. JMT Music will meet it with the attention and musical care it deserves."}</p>
            <div className="button-row homepage-final-actions">
              <Link className="button button-primary" href="/contact">Start Your Project <ArrowRight /></Link>
              <Link className="button button-secondary" href="/beats">Explore Beats</Link>
            </div>
          </Reveal>
        </div>
      </section>}
      <PublicCmsSections sections={extraSections} />
    </>
  );
}
