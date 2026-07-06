import Link from "next/link";
import { ArrowRight, Clapperboard, FileCheck2, Film, Gamepad2, Megaphone, Music2, Radio, SlidersHorizontal } from "lucide-react";
import { Reveal } from "@/components/motion";
import { getPublishedPageSections, getPublishedSection } from "@/lib/public-cms";
import { PublicCmsSections } from "@/components/public-cms-sections";

const useCases = [
  [Film, "Film & Story", "Instrumental music for scenes, trailers, short films, documentaries, and story-led visual work."],
  [Megaphone, "Brands & Advertising", "Music for campaigns, product films, social ads, launches, and branded storytelling."],
  [Gamepad2, "Games & Interactive", "Atmospheric, rhythmic, and cinematic production for games, streams, and interactive media."],
  [Radio, "Creators & Online Content", "Music for podcasts, channels, digital series, promos, and recurring content."]
];

export const metadata = {
  title: "Sync Licensing",
  description: "License original JMT Music instrumentals or request custom music for film, advertising, games, podcasts, brands, and online content."
};

export default async function SyncPage() {
  const [hero, details, cta, publishedSections] = await Promise.all([
    getPublishedSection("sync-hero"),
    getPublishedSection("sync-details"),
    getPublishedSection("sync-cta"),
    getPublishedPageSections("sync")
  ]);
  const extraSections = publishedSections.filter((section) => !["sync-hero", "sync-details", "sync-cta"].includes(section.sectionKey));
  return (
    <>
      {!hero?.hidden && <section className="page-hero about-page-hero sync-page-hero">
        <div className="site-width">
          <Reveal>
            <p className="eyebrow">{hero?.eyebrow ?? "Sync licensing"}</p>
            <h1>{hero?.heading ?? "Music built to support the story."}</h1>
            <p>{hero?.body ?? "Curated instrumentals and custom music for filmmakers, creators, brands, games, advertising, podcasts, and online content."}</p>
            <div className="button-row sync-hero-actions"><Link className="button button-primary" href="/contact?service=Sync%20Licensing">Request Music for Your Brief <ArrowRight /></Link><Link className="button button-secondary" href="/beats">Explore the Catalog</Link></div>
          </Reveal>
        </div>
      </section>}
      {!details?.hidden && <>
      <section className="section sync-offers-section">
        <div className="site-width">
          <Reveal className="section-heading sync-section-heading"><div><p className="eyebrow">Music for visual media</p><h2>Find the right music for the moment.</h2></div><p>Start with the existing catalog or request an original cue shaped around the pacing, emotion, and purpose of the brief.</p></Reveal>
          <div className="discipline-grid sync-offer-grid">
            <Reveal className="discipline"><Music2 /><h3>Curated Catalog</h3><p>Original instrumental music across hip hop, lo-fi, trap, piano-led, atmospheric, and cinematic production.</p></Reveal>
            <Reveal className="discipline"><Clapperboard /><h3>Custom Cues</h3><p>Purpose-built composition and production developed around a scene, campaign, edit, or creative direction.</p></Reveal>
            <Reveal className="discipline"><SlidersHorizontal /><h3>Flexible Deliverables</h3><p>Stems, alternate mixes, cutdowns, and arrangement variations may be available by request when the project requires them.</p></Reveal>
          </div>
        </div>
      </section>
      <section className="section sync-use-cases-section">
        <div className="site-width">
          <Reveal className="section-heading sync-section-heading"><div><p className="eyebrow">Use cases</p><h2>Music for the way stories move now.</h2></div><p>Share the format, audience, reference points, and feeling. The search can begin from mood, pace, instrumentation, or the role the music needs to play.</p></Reveal>
          <div className="sync-use-grid">{useCases.map(([Icon, title, description]) => <Reveal className="sync-use-item" key={title}><Icon /><h3>{title}</h3><p>{description}</p></Reveal>)}</div>
        </div>
      </section>
      <section className="section sync-clearance-section">
        <div className="site-width sync-clearance-layout">
          <Reveal className="sync-clearance-copy"><FileCheck2 /><p className="eyebrow">Clearance & licensing</p><h2>A clear path from brief to permission.</h2><p>Include the media type, intended use, term, territory, timeline, and available budget in your inquiry. JMT Music will confirm track availability, deliverables, and licensing terms in writing before use.</p></Reveal>
          <Reveal className="sync-request-list"><h3>Helpful details to send</h3><ul><li>Project type and where it will appear</li><li>Creative references, mood, and pacing</li><li>Timeline and expected music duration</li><li>Requested stems, cutdowns, or alternate mixes</li></ul><Link className="text-link" href="/contact?service=Sync%20Licensing">Send your brief <ArrowRight /></Link></Reveal>
        </div>
      </section>
      </>}
      {!cta?.hidden && <section className="cta-band sync-final-cta">
        <div className="site-width">
          <Reveal><p className="eyebrow">{cta?.eyebrow ?? "Start a sync inquiry"}</p><h2>{cta?.heading ?? "Tell me about the picture, the audience, and the feeling."}</h2><p className="sync-cta-copy">A rough cut is helpful, but a clear brief is enough to begin.</p><div className="button-row sync-final-actions"><Link className="button button-primary" href={cta?.primary_cta_url ?? "/contact?service=Sync%20Licensing"}>{cta?.primary_cta_label ?? "Request Music for Your Brief"} <ArrowRight /></Link><Link className="button button-secondary" href="/beats">Explore Beats</Link></div></Reveal>
        </div>
      </section>}
      <PublicCmsSections sections={extraSections} />
    </>
  );
}
