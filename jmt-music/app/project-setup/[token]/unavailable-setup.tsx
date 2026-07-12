import styles from "./setup-flow.module.css";

/**
 * The single, generic state shown for a missing, malformed, revoked, or otherwise
 * unresolvable token, and for any unexpected server/database error — deliberately
 * indistinguishable from one another so an invalid link never reveals whether it ever
 * existed, and a Supabase problem never surfaces as a raw error.
 */
export function UnavailableSetup() {
  return (
    <main className={styles.experience}>
      <div className={styles.ambient} aria-hidden="true" />
      <section className={styles.stage}>
        <div className={`${styles.content} ${styles.locked}`}>
          <p className={styles.eyebrow}>Project Setup</p>
          <h1>This link is no longer available.</h1>
          <p className={styles.lead}>This Project Setup link is no longer available. Please contact JMT Music for a new link.</p>
        </div>
      </section>
    </main>
  );
}
