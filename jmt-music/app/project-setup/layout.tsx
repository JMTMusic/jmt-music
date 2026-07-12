import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Private, token-authenticated route — never indexed, never linked from public
 * navigation, and not part of any sitemap (this project has no sitemap.ts/robots.ts to
 * begin with, so there is nothing to add this route to). `site-shell.jsx` also bypasses
 * the public header/nav/footer for any `/project-setup` path, the same way it already
 * does for `/control-center` and `/start-your-project`.
 */
export const metadata: Metadata = {
  title: "Project Setup",
  description: "A private setup link for an active JMT Music project.",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer"
};

export const dynamic = "force-dynamic";

export default function ProjectSetupLayout({ children }: { children: ReactNode }) {
  return children;
}
