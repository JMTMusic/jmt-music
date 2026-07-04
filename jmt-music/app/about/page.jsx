import Image from "next/image";
import Link from "next/link";
import { ArrowRight, AudioWaveform, KeyboardMusic, Layers3, SlidersHorizontal } from "lucide-react";
import { Reveal } from "@/components/motion";

export const metadata = { title: "About Jonathan Tripp", description: "Meet Jonathan Tripp, the pianist, producer, arranger, and mixing engineer behind JMT Music." };

export default function AboutPage() {
  return (
    <>
      <section className="page-hero about-page-hero"><div className="site-width"><Reveal><p className="eyebrow">About JMT Music</p><h1>Emotion first.<br />Details always.</h1><p>Jonathan Tripp is a pianist, producer, arranger, and mixing engineer helping artists turn strong ideas into finished records.</p></Reveal></div></section>
      <section className="about-story"><div className="about-story-image"><Image src="/assets/jmt-studio-hero.png" alt="Inside the JMT Music studio" fill /></div><Reveal className="about-story-copy"><p className="eyebrow">The approach</p><h2>Production should reveal the song, not bury it.</h2><p>JMT Music brings a musician&apos;s ear to every stage of the process. Harmony, rhythm, tone, and dynamics are treated as parts of the same emotional picture.</p><p>The goal is not simply to make a record louder or busier. It is to understand what the song wants to become, then make every production choice support that direction.</p></Reveal></section>
      <section className="section"><div className="site-width discipline-grid">
        {[[KeyboardMusic, "Pianist", "Harmony and performance with human timing and expressive weight."],[AudioWaveform, "Producer", "Sound, rhythm, and direction built around the artist's identity."],[Layers3, "Arranger", "Movement and structure that keep listeners engaged without overworking the song."],[SlidersHorizontal, "Mixing Engineer", "Balance, depth, translation, and the polish of a release-ready record."]].map(([Icon, title, copy]) => <Reveal className="discipline" key={title}><Icon /><h3>{title}</h3><p>{copy}</p></Reveal>)}
      </div></section>
      <section className="cta-band"><div className="site-width"><Reveal><p className="eyebrow">Make the next one count</p><h2>Bring the song. Let&apos;s build the world around it.</h2><Link className="button button-primary" href="/contact">Start a conversation <ArrowRight /></Link></Reveal></div></section>
    </>
  );
}
