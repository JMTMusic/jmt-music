import "./globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { AnalyticsClickTracker, MicrosoftClarity } from "@/components/analytics";
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
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

  return (
    <html lang="en">
      <body>
        <SiteShell>{children}</SiteShell>
        {(gaId || clarityId) && <AnalyticsClickTracker />}
        {gaId && <GoogleAnalytics gaId={gaId} />}
        {clarityId && <MicrosoftClarity projectId={clarityId} />}
      </body>
    </html>
  );
}
