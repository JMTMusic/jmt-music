"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./jmt.module.css";

const NAV_ITEMS = [
  { href: "/", label: "Home", key: "home" },
  { href: "/sound/", label: "Sound", key: "sound" },
  { href: "/inquiries/", label: "Inquiries", key: "inquiries" }
];

export function Chrome({ current }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle(styles.bodyLock, open);
    return () => document.body.classList.remove(styles.bodyLock);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className={styles.grain} aria-hidden="true" />
      <nav className={`${styles.cNav} ${open ? styles.menuOpen : ""}`}>
        <button
          className={styles.navMenu}
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="jmt-menu-overlay"
          onClick={() => setOpen((v) => !v)}
        >
          <span className={styles.ham}><span></span><span></span><span></span></span>
          <span className={styles.navLabel}>{open ? "Close" : "Menu"}</span>
        </button>
        <Link href="/" className={styles.navBrand}><b>JMT</b><span>Music</span></Link>
        <Link href="/inquiries/" className={`${styles.navRight} ${current === "inquiries" ? styles.navRightCurrent : ""}`}>Inquiries</Link>
      </nav>

      <div
        id="jmt-menu-overlay"
        className={`${styles.menuOverlay} ${open ? styles.menuOverlayOpen : ""}`}
        aria-hidden={!open}
        onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      >
        <div className={styles.menuGlow} aria-hidden="true" onClick={() => setOpen(false)} />
        <nav className={styles.menuList} aria-label="Full site navigation">
          {NAV_ITEMS.map((item, i) => (
            <Link
              key={item.key}
              href={item.href}
              className={current === item.key ? styles.current : ""}
              onClick={() => setOpen(false)}
            >
              <span className={styles.idx}>0{i + 1}</span>{item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
