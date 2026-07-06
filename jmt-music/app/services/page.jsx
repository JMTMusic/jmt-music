import Link from "next/link";
import { ArrowRight, AudioLines, Check, Clock3, KeyboardMusic, Music2, PackageCheck, SlidersHorizontal } from "lucide-react";
import { Reveal } from "@/components/motion";
import { getPublishedPageSections, getPublishedSection } from "@/lib/public-cms";
import { PublicCmsSections } from "@/components/public-cms-sections";

const services = [
  {
    icon: Music2,
    title: "Custom Production",
    description: "Bring a voice memo, demo, lyrics, or a clear creative direction. JMT Music develops the harmony, instrumentation, rhythm, arrangement, and production around the identity of the song.",
    best: "For artists who want an original record built around their voice and vision.",
    includes: ["Creative direction and arrangement", "Original instrumentation and production", "Collaborative revisions at agreed milestones"]
  },
  {
    icon: AudioLines,
    title: "Beat Licensing & Customization",
    description: "Start with an existing JMT Music instrumental, then discuss the licensing path and any arrangement changes the song needs. Custom intros, structure edits, and additional production can be scoped when appropriate.",
    best: "For artists who have found the right foundation and want to make it their own.",
    includes: ["Current licensing options by inquiry", "Arrangement or structure changes when scoped", "Exclusive availability discussed on request"]
  },
  {
    icon: SlidersHorizontal,
    title: "Mixing & Polish",
    description: "A focused, musical mix that gives the vocal presence, controls the low end, creates depth, and preserves the character of the production. Final polish can be included when the mix is approved.",
    best: "For recorded songs that need clarity, balance, impact, and careful final preparation.",
    includes: ["Mix preparation and balance", "Vocal placement, depth, and tonal work", "Final delivery formats agreed for the project"]
  },
  {
    icon: KeyboardMusic,
    title: "Session Piano & Keys",
    description: "Custom piano, Rhodes, organ, synth, and layered keyboard performances written and recorded to support the emotional direction of the song.",
    best: "For productions that need harmony, movement, texture, or a more human musical center.",
    includes: ["Parts shaped around the existing production", "Expressive performance and sound selection", "Clean session files prepared for your project"]
  }
];

const process = [
  ["Idea & direction", "Share the song, references, goals, and where the project stands. We define the right scope before production begins."],
  ["Production", "The arrangement and sound take shape around the artist's identity, with intentional choices at every stage."],
  ["Refinement", "Feedback is gathered at clear milestones so revisions stay focused and the record keeps moving forward."],
  ["Final delivery", "Approved files are prepared for the agreed release, recording, or production workflow."]
];

export const metadata = { title: "Production Services", description: "Custom production, mixing, mastering, piano recording, beat licensing, and sync licensing from JMT Music." };

export default async function ServicesPage() {
  const [hero, servicesCms, cta, publishedSections] = await Promise.all([
    getPublishedSection("services"),
    getPublishedSection("services-list"),
    getPublishedSection("services-cta"),
    getPublishedPageSections("services")
  ]);
  const extraSections = publishedSections.filter((section) => !["services", "services-list", "services-cta"].includes(section.sectionKey));
  return (
    <>
      {!hero?.hidden && <section className="page-hero services-page-hero"><div className="site-width"><Reveal><p className="eyebrow">{hero?.eyebrow ?? "Production services"}</p><h1>{hero?.heading ?? <>Your vision.<br />Handled with care.</>}</h1><p>{hero?.body ?? "Personal, detail-focused production support for artists who want the music to feel intentional from the first idea through final delivery."}</p></Reveal></div></section>}
      {!servicesCms?.hidden && <>
      <section className="section services-offers-section"><div className="site-width">
        <Reveal className="section-heading services-section-heading">
          <div><p className="eyebrow">Ways to work together</p><h2>Choose the support your music needs.</h2></div>
          <p>Every project begins with a conversation about the song, the goal, and the level of support that will serve it best.</p>
        </Reveal>
        <div className="service-detail-list">
        {services.map(({ icon: Icon, title, description, best, includes }, index) => (
          <Reveal className="service-detail service-offer" key={title}>
            <div className="service-detail-number">0{index + 1}</div><Icon />
            <div className="service-offer-copy"><h2>{title}</h2><p>{description}</p><strong>{best}</strong><ul>{includes.map((item) => <li key={item}><Check />{item}</li>)}</ul></div>
            <Link className="button button-secondary" href={`/contact?service=${encodeURIComponent(title)}`} data-analytics-event="service_cta_click" data-analytics-service={title}>Discuss this service <ArrowRight /></Link>
          </Reveal>
        ))}
        </div>
      </div></section>
      <section className="section workflow-section service-process-section">
        <div className="site-width workflow-layout">
          <Reveal className="workflow-intro"><p className="eyebrow">The process</p><h2>Clear steps. Personal attention.</h2><p>The process stays collaborative without becoming complicated. You always know what stage the project is in and what comes next.</p><Link className="text-link" href="/contact">Start the conversation <ArrowRight /></Link></Reveal>
          <div className="workflow-list">{process.map(([title, description], index) => <Reveal className="workflow-step" key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{description}</p></div></Reveal>)}</div>
        </div>
      </section>
      <section className="section service-expectations-section">
        <div className="site-width service-expectations">
          <Reveal><PackageCheck /><p className="eyebrow">Deliverables</p><h2>Files prepared for the way you work.</h2><p>Deliverables are agreed before the project begins and may include instrumental versions, performance stems, mix versions, high-resolution masters, or session-ready audio depending on the service.</p></Reveal>
          <Reveal><Clock3 /><p className="eyebrow">Turnaround</p><h2>Timelines shaped by the scope.</h2><p>Timing is confirmed after reviewing the material, revision needs, and current schedule. A focused session can move quickly; full production naturally requires more development and care.</p></Reveal>
        </div>
      </section>
      </>}
      {!cta?.hidden && <section className="cta-band services-final-cta"><div className="site-width"><Reveal><p className="eyebrow">{cta?.eyebrow ?? "Ready when the song is"}</p><h2>{cta?.heading ?? "Send what you have. We'll find the right next step."}</h2><p className="services-cta-copy">A rough demo is enough to begin the conversation.</p><Link className="button button-primary" href={cta?.primary_cta_url ?? "/contact"} data-analytics-event="service_cta_click" data-analytics-service="General inquiry">{cta?.primary_cta_label ?? "Start Your Project"} <ArrowRight /></Link></Reveal></div></section>}
      <PublicCmsSections sections={extraSections} />
    </>
  );
}
