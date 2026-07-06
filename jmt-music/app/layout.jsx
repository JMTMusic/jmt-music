import "./globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { AnalyticsClickTracker, MicrosoftClarity } from "@/components/analytics";
import { SiteShell } from "@/components/site-shell";
import { getPublishedPageSections, getPublishedSection } from "@/lib/public-cms";

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

export default async function RootLayout({ children }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;
  const [footerCms, globalSections] = await Promise.all([getPublishedSection("footer"), getPublishedPageSections("global")]);
  const extraGlobalSections = globalSections.filter((section) => section.sectionKey !== "footer");

  return (
    <html lang="en">
      <body>
        <SiteShell footerCms={footerCms} extraGlobalSections={extraGlobalSections}>{children}</SiteShell>
        {(gaId || clarityId) && <AnalyticsClickTracker />}
        {gaId && <GoogleAnalytics gaId={gaId} />}
        {clarityId && <MicrosoftClarity projectId={clarityId} />}
      </body>
    </html>
  );
}
