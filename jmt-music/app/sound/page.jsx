import Link from "next/link";
import { tracks, getGenreName } from "@/lib/tracks";
import { Chrome } from "@/components/jmt/Chrome";
import { Footer } from "@/components/jmt/Footer";
import { Reveal } from "@/components/jmt/Reveal";
import { TrackPlayer } from "@/components/jmt/TrackPlayer";
import styles from "@/components/jmt/jmt.module.css";

export const metadata = {
  title: "Sound — JMT Music",
  description: "Selected work from JMT Music. Production built across sound, style, and identity.",
  openGraph: {
    title: "Sound — JMT Music",
    description: "Selected work from JMT Music. Production built across sound, style, and identity."
  }
};

function buildMeta(track) {
  const genreLabel = track.subgenre || getGenreName(track.genre);
  const moodWords = (track.mood || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 2);
  const parts = [genreLabel, ...moodWords];
  if (track.bpm) parts.push(`${track.bpm} BPM`);
  if (track.key) parts.push(`${track.key.charAt(0).toUpperCase()}${track.key.slice(1)}`);
  return parts.filter(Boolean).join(" · ");
}

function buildCatalogueTracks() {
  return tracks.map((t, i) => ({
    n: String(i + 1).padStart(3, "0"),
    title: t.title,
    meta: buildMeta(t),
    audioUrl: t.audioUrl
  }));
}

export default function SoundPage() {
  const catalogueTracks = buildCatalogueTracks();
  const count = String(tracks.length).padStart(3, "0");

  return (
    <div className={styles.root}>
      <Chrome current="sound" />

      <section className={styles.catHeader}>
        <div className={styles.heroBg} aria-hidden="true">
          <i className={styles.catG1}></i><i className={styles.catG2}></i>
        </div>
        <div className={`${styles.sectionInner} ${styles.catHeaderInner}`}>
          <Reveal as="p" className={styles.eyebrow}>JMT Music &mdash; Catalogue</Reveal>
          <Reveal as="h1">Sound.</Reveal>
          <Reveal as="p" className={styles.lede}>Selected work from JMT Music. Production built across sound, style, and identity.</Reveal>
          <Reveal as="p" className={styles.count}><b>{count}</b> selected works</Reveal>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <TrackPlayer tracks={catalogueTracks} />
        </div>
      </section>

      <section className={`${styles.section} ${styles.catFoot}`}>
        <div className={styles.sectionInner}>
          <Reveal as="p">Hear something that fits your project?</Reveal>
          <Reveal as="div">
            <Link href="/inquiries/" className={styles.lineLink}>Project Inquiries &rarr;</Link>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
