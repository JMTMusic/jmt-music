"use client";

import { useEffect, useState } from "react";
import { discoveryThankYouNameKey, thankYouCopy } from "../intake-config";
import styles from "../project-intake.module.css";
import { thankYouFirstName } from "@/lib/inbound/pipeline";

export function ThankYouLetter() {
  const [name, setName] = useState("");

  useEffect(() => {
    try {
      setName(window.localStorage.getItem(discoveryThankYouNameKey) || "");
    } catch { /* The static letter remains complete without local data. */ }
  }, []);

  const personalizedName = thankYouFirstName(name);

  return (
    <main className={styles.experience}>
      <div className={styles.ambient} aria-hidden="true" />
      <header className={styles.header}>
        <div className={styles.brand} aria-label="JMT Music"><span className={styles.mark}>JMT</span><span>JMT MUSIC</span></div>
      </header>
      <section className={styles.stage}>
        <article className={`${styles.content} ${styles.letter}`}>
          <p className={styles.eyebrow}>{thankYouCopy.eyebrow}</p>
          <h1>{personalizedName ? thankYouCopy.personalizedHeading(personalizedName) : thankYouCopy.heading}</h1>
          <div className={styles.letterBody}>{thankYouCopy.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
          <p className={styles.letterBelief}>{thankYouCopy.belief}</p>
          <footer className={styles.letterSignature}><p>{thankYouCopy.signature}</p><span>{thankYouCopy.role}</span></footer>
        </article>
      </section>
    </main>
  );
}
