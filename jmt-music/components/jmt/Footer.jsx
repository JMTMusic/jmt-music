import Link from "next/link";
import styles from "./jmt.module.css";

export function Footer() {
  return (
    <footer className={styles.siteFooter}>
      <div className={styles.footRow}>
        <span>JMT Music &copy; {new Date().getFullYear()}</span>
        <span>Jonathan Tripp &mdash; Producer</span>
        <div className={styles.footLinks}>
          <a href="https://www.instagram.com/jmtmusicofficial/" target="_blank" rel="noopener noreferrer">Instagram</a>
          <Link href="/sound/">Sound</Link>
          <Link href="/inquiries/">Inquiries</Link>
        </div>
      </div>
    </footer>
  );
}
