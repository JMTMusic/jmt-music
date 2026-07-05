"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AudioProvider } from "./audio-provider";
import { GlobalPlayer } from "./track-ui";
import { externalLinks } from "@/lib/site-links";

const navigation = [
  ["Home", "/"],
  ["Services", "/services"],
  ["Portfolio", "/portfolio"],
  ["Beats", "/beats"],
  ["About", "/about"],
  ["Contact", "/contact"]
];

export function SiteShell({ children }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
      <footer className="site-footer">
        <div className="site-width">
          <div className="footer-lead">
            <p>Let&apos;s make something unforgettable.</p>
            <Link className="button button-primary" href="/contact">Start a Project</Link>
          </div>
          <div className="footer-grid">
            <div><span className="brand-mark">JMT</span><p>Production, mixing, mastering, and original music by Jonathan Tripp.</p></div>
            <div><h2>Navigate</h2>{navigation.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div>
            <div>
              <h2>Connect</h2>
              <a href={externalLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label="JMT Music on Instagram">Instagram</a>
              <a href={externalLinks.beatstars} target="_blank" rel="noopener noreferrer" aria-label="JMT Music on BeatStars" data-analytics-event="beatstars_link_click" data-analytics-label="Footer">BeatStars</a>
              <a href={externalLinks.fiverr} target="_blank" rel="noopener noreferrer" aria-label="JMT Music on Fiverr">Fiverr</a>
            </div>
          </div>
          <div className="footer-bottom"><span>© {new Date().getFullYear()} JMT Music</span><span>JMTMusic.studio</span></div>
        </div>
      </footer>
      <GlobalPlayer />
    </AudioProvider>
  );
}
