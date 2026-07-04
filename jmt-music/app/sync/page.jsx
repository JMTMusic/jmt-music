import Link from "next/link";
import { ArrowRight, Clapperboard, FileCheck2, Music2 } from "lucide-react";
import { Reveal } from "@/components/motion";

export const metadata = {
  title: "Sync Licensing",
  description: "Original, sync-ready music from JMT Music for film, advertising, podcasts, games, and branded content."
};

export default function SyncPage() {
  return (
    <>
      <section className="page-hero about-page-hero">
        <div className="site-width">
          <Reveal>
            <p className="eyebrow">Sync licensing</p>
            <h1>Music built to support the story.</h1>
            <p>Original, sync-ready instrumentals for film, advertising, podcasts, games, and branded content.</p>
          </Reveal>
        </div>
      </section>
      <section className="section">
        <div className="site-width discipline-grid">
          <Reveal className="discipline"><Music2 /><h3>Original Catalog</h3><p>Distinctive instrumental music across hip hop, lo-fi, trap, piano, and cinematic production.</p></Reveal>
          <Reveal className="discipline"><Clapperboard /><h3>Custom Music</h3><p>Purpose-built composition and production shaped around the scene, campaign, or creative brief.</p></Reveal>
          <Reveal className="discipline"><FileCheck2 /><h3>Clear Licensing</h3><p>Professional inquiry support for usage, term, territory, deliverables, and alternate mixes.</p></Reveal>
        </div>
      </section>
      <section className="cta-band">
        <div className="site-width">
          <Reveal><p className="eyebrow">Start a sync inquiry</p><h2>Tell me about the picture and the feeling.</h2><Link className="button button-primary" href="/contact">Discuss your project <ArrowRight /></Link></Reveal>
        </div>
      </section>
    </>
  );
}
