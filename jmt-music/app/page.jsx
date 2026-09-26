import Link from "next/link";
import { tracks } from "@/lib/tracks";
import { Chrome } from "@/components/jmt/Chrome";
import { Footer } from "@/components/jmt/Footer";
import { Reveal } from "@/components/jmt/Reveal";
import { TrackPlayer } from "@/components/jmt/TrackPlayer";
import styles from "@/components/jmt/jmt.module.css";

export const metadata = {
  title: "JMT Music — Sound With Identity",
  description: "Music production built around the artist. Sound with identity.",
  openGraph: {
    title: "JMT Music — Sound With Identity",
    description: "Music production built around the artist. Sound with identity."
  }
};

const TEASER_SLUGS = ["heat-check", "swagger", "why-not"];

function buildTeaserTracks() {
  return TEASER_SLUGS.map((slug, i) => {
    const t = tracks.find((track) => track.slug === slug);
    if (!t) return null;
    return { n: String(i + 1).padStart(3, "0"), title: t.title, audioUrl: t.audioUrl };
  }).filter(Boolean);
}

export default function Home() {
  const teaserTracks = buildTeaserTracks();

  return (
    <div className={styles.root}>
      <Chrome current="home" />

      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true">
          <i className={styles.g1}></i><i className={styles.g2}></i><i className={styles.g3}></i><i className={styles.g4}></i>
        </div>
        <div className={styles.heroInner}>
          <div className={styles.signature}>
            <h1>Jmt</h1>
            <svg viewBox="0 0 400 140" aria-hidden="true">
              <defs>
                <linearGradient id="tailGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f4f8ff" stopOpacity="0.95" />
                  <stop offset="40%" stopColor="#9db8e8" stopOpacity="0.7" />
                  <stop offset="75%" stopColor="#4d7fd1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#2559B8" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,94 C70,80 140,60 220,48 C280,38 340,28 398,18" fill="none" stroke="url(#tailGrad)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <p className={styles.tag}>Sound with identity.</p>
          <a href="#sound" className={styles.pillBtn}>Explore Sound</a>
          <div className={styles.scrollCue}>
            <span className={styles.tick}></span>
            <svg className={styles.chev} width="14" height="8" viewBox="0 0 14 8" fill="none" aria-hidden="true"><path d="M1 1L7 7L13 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      </section>

      <div className={styles.transitionFade} aria-hidden="true" />

      <section className={`${styles.section} ${styles.philosophy}`} id="philosophy">
        <div className={styles.sectionInner}>
          <Reveal as="p" className={styles.statement} activeClassName={styles.statementIn}>
            <span>Music Should</span>
            <span>Sound Like</span>
            <span className={styles.accent}>You.</span>
          </Reveal>
          <Reveal as="p" className={styles.support}>
            <span>Production built around the artist.</span>
            <span>Not the other way around.</span>
          </Reveal>
        </div>
      </section>

      <section className={`${styles.section} ${styles.soundSection}`} id="sound">
        <div className={styles.sectionInner}>
          <div className={styles.soundHead}>
            <Reveal as="p" className={styles.eyebrow}>Selected Sound &mdash; 001</Reveal>
            <Reveal as="h2">Hear JMT.</Reveal>
          </div>
          <TrackPlayer tracks={teaserTracks} />
          <Reveal as="div" className={styles.soundFoot}>
            <Link href="/sound/" className={styles.lineLink}>Explore All Sound &rarr;</Link>
          </Reveal>
        </div>
      </section>

      <section className={`${styles.section} ${styles.inquiriesSection}`} id="inquiries">
        <div className={styles.inqBg} aria-hidden="true"><i className={styles.b1}></i><i className={styles.b2}></i></div>
        <div className={styles.sectionInner}>
          <Reveal as="p" className={styles.eyebrow} style={{ position: "relative", zIndex: 2 }}>Project Inquiries</Reveal>
          <Reveal as="p" className={styles.statementSmall}>
            <span>Build Something</span>
            <span className={styles.accent}>With Identity.</span>
          </Reveal>
          <Reveal as="div">
            <Link href="/inquiries/" className={`${styles.pillBtn} ${styles.pillBtnStatic}`} style={{ position: "relative", zIndex: 2 }}>Start a Project &rarr;</Link>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
