import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Portal — JMT Music",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer"
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
