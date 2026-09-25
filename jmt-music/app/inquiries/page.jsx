import { Chrome } from "@/components/jmt/Chrome";
import { Footer } from "@/components/jmt/Footer";
import { Reveal } from "@/components/jmt/Reveal";
import { InquiryForm } from "@/components/jmt/InquiryForm";
import styles from "@/components/jmt/jmt.module.css";

export const metadata = {
  title: "Project Inquiries — JMT Music",
  description: "Tell JMT Music a little about you, your music, and what you're working on.",
  openGraph: {
    title: "Project Inquiries — JMT Music",
    description: "Tell JMT Music a little about you, your music, and what you're working on."
  }
};

export default function InquiriesPage() {
  return (
    <div className={styles.root}>
      <Chrome current="inquiries" />

      <section className={styles.inqHero}>
        <div className={styles.heroBg} aria-hidden="true">
          <i className={styles.inqG1}></i><i className={styles.inqG2}></i>
        </div>
        <div className={`${styles.sectionInner} ${styles.inqHeroInner}`}>
          <Reveal as="p" className={styles.eyebrow}>Project Inquiries</Reveal>
          <Reveal as="h1">
            <span>Let&apos;s Hear</span>
            <span>What You&apos;re</span>
            <span className={styles.accent}>Building.</span>
          </Reveal>
          <Reveal as="p" className={styles.lede}>
            Tell me a little about you, your music, and what you&apos;re working on. If it feels like a good fit, we&apos;ll figure out where to take it from there.
          </Reveal>
        </div>
      </section>

      <section className={styles.sectionTight}>
        <div className={styles.sectionInner}>
          <Reveal as="div"><InquiryForm /></Reveal>
        </div>
      </section>

      <section className={`${styles.sectionTight} ${styles.directContact}`}>
        <div className={styles.sectionInner}>
          <Reveal as="p" className={styles.eyebrow}>General Inquiries</Reveal>
          <Reveal as="a" href="mailto:jmtmusicproductions@gmail.com">jmtmusicproductions@gmail.com</Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
