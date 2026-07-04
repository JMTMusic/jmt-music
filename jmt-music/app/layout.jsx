import "./globals.css";
import { SiteShell } from "@/components/site-shell";

export const metadata = {
  metadataBase: new URL("https://jmtmusic.studio"),
  title: {
    default: "JMT Music | Music Production, Mixing & Mastering",
    template: "%s | JMT Music"
  },
  description: "Professional music production, mixing, mastering, custom instrumentals, and piano composition by JMT Music.",
  openGraph: {
    title: "JMT Music",
    description: "Music that sounds finished.",
    images: ["/assets/jmt-studio-hero.png"]
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><SiteShell>{children}</SiteShell></body>
    </html>
  );
}
