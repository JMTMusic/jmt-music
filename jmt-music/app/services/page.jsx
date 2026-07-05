import Link from "next/link";
import { ArrowRight, AudioLines, Clapperboard, Gauge, KeyboardMusic, Music2, SlidersHorizontal } from "lucide-react";
import { Reveal } from "@/components/motion";

const services = [
  [Music2, "Custom Music Production", "From a voice memo or rough demo to a fully arranged record. Production includes creative direction, instrumentation, programming, arrangement, and the details that make a song feel complete.", "Best for artists who need a record built around their song."],
  [SlidersHorizontal, "Mixing", "A musical mix that gives every element a reason to be there. Vocals sit naturally, low end stays controlled, and the record translates across headphones, cars, and speakers.", "Best for completed productions that need clarity and impact."],
  [Gauge, "Mastering", "Final tonal balance, dynamics, loudness, and quality control for a confident release across streaming platforms and physical formats.", "Best for approved mixes ready for final delivery."],
  [KeyboardMusic, "Piano & Keyboard Recording", "Custom piano, Rhodes, organ, synth, and layered keyboard performances recorded to support the song rather than simply fill space.", "Best for productions needing harmony, feel, and human movement."],
  [AudioLines, "Beat Licensing", "Browse finished instrumentals and choose a licensing path that fits your release. Custom arrangement and mix support can be added when needed.", "Best for artists ready to write and record."],
  [Clapperboard, "Sync Licensing", "Original, licensable music for film, TV, advertising, podcasts, games, and digital content, with custom composition available for the right brief.", "Best for picture, campaigns, and story-led media."]
];

export const metadata = { title: "Production Services", description: "Custom production, mixing, mastering, piano recording, beat licensing, and sync licensing from JMT Music." };

export default function ServicesPage() {
  return (
    <>
      <section className="page-hero"><div className="site-width"><Reveal><p className="eyebrow">Services</p><h1>One creative partner.<br />A complete sound.</h1><p>Choose the support your project needs, from a single keyboard performance to full production and final master.</p></Reveal></div></section>
      <section className="section"><div className="site-width service-detail-list">
        {services.map(([Icon, title, description, best], index) => (
          <Reveal className="service-detail" key={title}>
            <div className="service-detail-number">0{index + 1}</div><Icon />
            <div><h2>{title}</h2><p>{description}</p><strong>{best}</strong></div>
            <Link className="button button-secondary" href={`/contact?service=${encodeURIComponent(title)}`} data-analytics-event="service_cta_click" data-analytics-service={title}>Start a project <ArrowRight /></Link>
          </Reveal>
        ))}
      </div></section>
      <section className="cta-band"><div className="site-width"><Reveal><p className="eyebrow">Not sure what you need?</p><h2>Send the song. We&apos;ll find the right next step.</h2><Link className="button button-primary" href="/contact" data-analytics-event="service_cta_click" data-analytics-service="General inquiry">Talk to JMT Music <ArrowRight /></Link></Reveal></div></section>
    </>
  );
}
