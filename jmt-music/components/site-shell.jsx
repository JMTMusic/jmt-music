"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AudioProvider } from "./audio-provider";
import { GlobalPlayer } from "./track-ui";
import { externalLinks } from "@/lib/site-links";
import { PublicCmsSections } from "@/components/public-cms-sections";

const navigation = [
  ["Home", "/"],
  ["Beats", "/beats"],
  ["Services", "/services"],
  ["Sync", "/sync"],
  ["Contact", "/contact"]
];

export function SiteShell({ children, footerCms, extraGlobalSections = [] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("nav-open", open);

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("nav-open");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (pathname.startsWith("/control-center")) {
    return children;
  }

  return (
    <AudioProvider>
      <header className="site-header">
        <div className="site-width nav-inner">
          <Link className="brand" href="/" onClick={() => setOpen(false)}>
            <span className="brand-mark">JMT</span>
            <span>JMT MUSIC</span>
          </Link>
          <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>
            {open ? <X /> : <Menu />}
          </button>
          <nav className={open ? "nav-links is-open" : "nav-links"} aria-label="Primary navigation">
            {navigation.map(([label, href]) => (
              <Link key={href} className={pathname === href ? "active" : ""} href={href} onClick={() => setOpen(false)}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main>{children}</main>
      {!footerCms?.hidden && <footer className="site-footer">
        <div className="site-width">
          <div className="footer-lead">
            <p>{footerCms?.heading ?? "Let's make something unforgettable."}</p>
            <Link className="button button-primary" href={footerCms?.primary_cta_url ?? "/contact"}>{footerCms?.primary_cta_label ?? "Start Your Project"}</Link>
          </div>
          <div className="footer-grid">
            <div><span className="brand-mark">JMT</span><p>{footerCms?.body ?? "Music production, beat licensing, mixing, session keys, and sync music by Jonathan Tripp."}</p></div>
            <div><h2>Navigate</h2>{navigation.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div>
            <div>
              <h2>Connect</h2>
              <a href="mailto:hello@jmtmusic.studio">Email</a>
              <a href={externalLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label="JMT Music on Instagram">Instagram</a>
              <a href={externalLinks.beatstars} target="_blank" rel="noopener noreferrer" aria-label="JMT Music on BeatStars" data-analytics-event="beatstars_link_click" data-analytics-label="Footer">BeatStars</a>
            </div>
          </div>
          <div className="footer-bottom"><span>© {new Date().getFullYear()} JMT Music</span><span>JMTMusic.studio</span></div>
        </div>
      </footer>}
      <PublicCmsSections sections={extraGlobalSections} />
      <GlobalPlayer />
    </AudioProvider>
  );
}
