import { Instagram, Mail, Music2 } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { Reveal } from "@/components/motion";
import { externalLinks } from "@/lib/site-links";
import { getPublishedPageSections, getPublishedSection } from "@/lib/public-cms";
import { PublicCmsSections } from "@/components/public-cms-sections";

export const metadata = { title: "Start a Project", description: "Contact JMT Music about custom production, beat licensing and customization, mixing and polish, session piano and keys, or sync music." };

const serviceAliases = {
  "custom production": "Custom Production",
  "custom-production": "Custom Production",
  "beat licensing": "Beat Licensing / Customization",
  "beat licensing & customization": "Beat Licensing / Customization",
  "beat-licensing": "Beat Licensing / Customization",
  "mixing": "Mixing & Polish",
  "mastering": "Mixing & Polish",
  "mixing & polish": "Mixing & Polish",
  "mixing-polish": "Mixing & Polish",
  "piano / keyboard recording": "Session Piano / Keys",
  "session piano & keys": "Session Piano / Keys",
  "session-piano-keys": "Session Piano / Keys",
  "sync licensing": "Sync / Custom Cue",
  "sync-custom-cue": "Sync / Custom Cue"
};

function firstParam(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ContactPage({ searchParams }) {
  const params = await searchParams;
  const requestedService = firstParam(params?.service);
  const initialProject = typeof requestedService === "string" ? serviceAliases[requestedService.trim().toLowerCase()] || "" : "";
  const requestedBeat = firstParam(params?.beat);
  const initialBeat = typeof requestedBeat === "string" ? requestedBeat.trim().slice(0, 100) : "";
  const [intro, formCms, publishedSections] = await Promise.all([
    getPublishedSection("contact"),
    getPublishedSection("contact-form"),
    getPublishedPageSections("contact")
  ]);
  const extraSections = publishedSections.filter((section) => !["contact", "contact-form"].includes(section.sectionKey));
  return (
    <><section className="contact-page">
      <div className="site-width contact-layout">
        {!intro?.hidden && <Reveal className="contact-intro"><p className="eyebrow">{intro?.eyebrow ?? "Start a project"}</p><h1>{intro?.heading ?? "Tell me what you're making."}</h1><p>{intro?.body ?? "Share the idea, where the project stands, and what you want the music to become. Every inquiry is reviewed personally, with a clear reply about next steps."}</p><div className="contact-guidance"><h2>Helpful to include</h2><ul><li>A demo, voice memo, or reference link</li><li>The service you need and your current timeline</li><li>The feeling, audience, or release goal</li></ul></div><div className="contact-links"><a href="mailto:hello@jmtmusic.studio"><Mail /> hello@jmtmusic.studio</a><a href={externalLinks.instagram} target="_blank" rel="noopener noreferrer"><Instagram /> Instagram</a><a href={externalLinks.beatstars} target="_blank" rel="noopener noreferrer" data-analytics-event="beatstars_link_click" data-analytics-label="Contact page"><Music2 /> BeatStars</a></div></Reveal>}
        {!formCms?.hidden && <Reveal><ContactForm initialProject={initialProject} initialBeat={initialBeat} /></Reveal>}
      </div>
    </section><PublicCmsSections sections={extraSections} /></>
  );
}
