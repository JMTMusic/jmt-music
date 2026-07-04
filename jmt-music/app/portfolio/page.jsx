import { Reveal } from "@/components/motion";
import { TrackCard } from "@/components/track-ui";
import { tracks } from "@/lib/tracks";

export const metadata = { title: "Production Portfolio", description: "Selected production, arrangement, piano, and mixing work from JMT Music." };

export default function PortfolioPage() {
  return (
    <>
      <section className="page-hero"><div className="site-width"><Reveal><p className="eyebrow">Portfolio</p><h1>Selected work.</h1><p>Production shaped by musicality, emotion, and enough space for the artist to stay at the center.</p></Reveal></div></section>
      <section className="section"><div className="site-width"><div className="portfolio-grid">{tracks.map((track) => <Reveal key={track.slug}><TrackCard track={track} portfolio /></Reveal>)}</div></div></section>
    </>
  );
}
