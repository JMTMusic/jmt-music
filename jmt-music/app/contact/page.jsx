import { Instagram, Mail, Music2 } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { Reveal } from "@/components/motion";
import { externalLinks } from "@/lib/site-links";

export const metadata = { title: "Contact", description: "Start a custom production, mixing, mastering, piano, beat licensing, or sync project with JMT Music." };

export default function ContactPage() {
  return (
    <section className="contact-page">
      <div className="site-width contact-layout">
        <Reveal className="contact-intro"><p className="eyebrow">Start a project</p><h1>Tell me what you&apos;re making.</h1><p>Share the vision, the timeline, and where the project is right now. You&apos;ll hear back with a clear next step.</p><div className="contact-links"><a href="mailto:hello@jmtmusic.studio"><Mail /> hello@jmtmusic.studio</a><a href={externalLinks.instagram} target="_blank" rel="noopener noreferrer"><Instagram /> Instagram</a><a href={externalLinks.beatstars} target="_blank" rel="noopener noreferrer"><Music2 /> BeatStars</a></div></Reveal>
        <Reveal><ContactForm /></Reveal>
      </div>
    </section>
  );
}
