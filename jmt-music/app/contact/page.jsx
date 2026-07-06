import { Instagram, Mail, Music2 } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { Reveal } from "@/components/motion";
import { externalLinks } from "@/lib/site-links";
import { getPublishedPageSections, getPublishedSection } from "@/lib/public-cms";
import { PublicCmsSections } from "@/components/public-cms-sections";

export const metadata = { title: "Contact", description: "Start a custom production, mixing, mastering, piano, beat licensing, or sync project with JMT Music." };

export default async function ContactPage() {
  const [intro, formCms, publishedSections] = await Promise.all([
    getPublishedSection("contact"),
    getPublishedSection("contact-form"),
    getPublishedPageSections("contact")
  ]);
  const extraSections = publishedSections.filter((section) => !["contact", "contact-form"].includes(section.sectionKey));
  return (
    <><section className="contact-page">
      <div className="site-width contact-layout">
        {!intro?.hidden && <Reveal className="contact-intro"><p className="eyebrow">{intro?.eyebrow ?? "Start a project"}</p><h1>{intro?.heading ?? "Tell me what you're making."}</h1><p>{intro?.body ?? "Share the vision, the timeline, and where the project is right now. You'll hear back with a clear next step."}</p><div className="contact-links"><a href="mailto:hello@jmtmusic.studio"><Mail /> hello@jmtmusic.studio</a><a href={externalLinks.instagram} target="_blank" rel="noopener noreferrer"><Instagram /> Instagram</a><a href={externalLinks.beatstars} target="_blank" rel="noopener noreferrer" data-analytics-event="beatstars_link_click" data-analytics-label="Contact page"><Music2 /> BeatStars</a></div></Reveal>}
        {!formCms?.hidden && <Reveal><ContactForm /></Reveal>}
      </div>
    </section><PublicCmsSections sections={extraSections} /></>
  );
}
