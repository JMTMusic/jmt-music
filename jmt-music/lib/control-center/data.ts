import "server-only";
import type { SiteConfig, SiteId } from "./types";
import { normalizeSiteId } from "./site-registry";

const jmtCatalog = [
  { id: "swagger", title: "Swagger", cover: "/assets/covers/swagger.jpg", genre: "Classic Hip-Hop", bpm: 92, musicalKey: "D minor", releaseDate: "Jun 28, 2026", featured: true },
  { id: "heat-check", title: "Heat Check", cover: "/assets/covers/heat-check.jpg", genre: "Trap", bpm: 144, musicalKey: "F minor", releaseDate: "Jun 18, 2026", featured: true },
  { id: "hoodie", title: "Hoodie", cover: "/assets/covers/hoodie.jpg", genre: "Lo-Fi", bpm: 78, musicalKey: "A minor", releaseDate: "Jun 04, 2026", featured: false },
  { id: "tlkin", title: "TLKIN", cover: "/assets/covers/tlkin.jpg", genre: "Hip-Hop", bpm: 98, musicalKey: "C minor", releaseDate: "May 24, 2026", featured: false },
  { id: "backpack", title: "Backpack", cover: "/assets/covers/backpack.jpg", genre: "Boom Bap", bpm: 88, musicalKey: "E minor", releaseDate: "May 10, 2026", featured: false },
  { id: "why-not", title: "Why Not", cover: "/assets/covers/why-not.jpg", genre: "Chill", bpm: 84, musicalKey: "G major", releaseDate: "Apr 26, 2026", featured: false }
] satisfies SiteConfig["catalog"];

/**
 * Authoritative server-only configuration for every managed business property.
 * Adding a property here automatically enables it across every Control Center module.
 */
export const siteConfigs: Record<SiteId, SiteConfig> = {
  "jmt-music": {
    id: "jmt-music",
    name: "JMT Music",
    domain: "jmtmusic.studio",
    initials: "JMT",
    connected: true,
    focus: "Beats, production, sync, artists, and clients",
    dashboardMetrics: [
      { label: "Beat Plays", value: "124", detail: "+21% over 30 days", icon: "audio" },
      { label: "BeatStars Clicks", value: "38", detail: "30.6% of listeners", icon: "click" },
      { label: "Production Inquiries", value: "7", detail: "3 need a reply", icon: "users" },
      { label: "Sync Page Views", value: "86", detail: "+14% this month", icon: "eye" },
      { label: "Contact Submissions", value: "9", detail: "Last 30 days", icon: "mail" }
    ],
    websiteSections: [
      { title: "Homepage Hero", description: "Primary headline, studio positioning, background image, and calls to action.", connected: true },
      { title: "About", description: "Producer story, creative philosophy, portrait, and capability highlights.", connected: true },
      { title: "Services", description: "Production, mixing, mastering, beat licensing, and sync pathways.", connected: true },
      { title: "Contact", description: "Project inquiry introduction, contact channels, and form messaging.", connected: true },
      { title: "Footer", description: "Navigation, social destinations, brand statement, and legal copy.", connected: true }
    ],
    analyticsStatus: [
      { label: "Google Analytics", detail: "GA4 measurement active", healthy: true },
      { label: "Microsoft Clarity", detail: "Heatmaps and recordings active", healthy: true },
      { label: "Website Online", detail: "jmtmusic.studio operational", healthy: true },
      { label: "Deployment Status", detail: "Production ready", healthy: true }
    ],
    contentChannels: [
      { name: "Instagram", description: "Beat releases, studio moments, and artist work.", connected: false, accent: "from-fuchsia-500/20" },
      { name: "Facebook", description: "Studio updates, releases, and community posts.", connected: false, accent: "from-blue-500/20" },
      { name: "YouTube", description: "Beat videos, descriptions, and channel metadata.", connected: false, accent: "from-red-500/20" },
      { name: "Threads", description: "Producer observations and behind-the-scenes notes.", connected: false, accent: "from-indigo-500/20" },
      { name: "X", description: "Release announcements and concise studio updates.", connected: false, accent: "from-slate-500/20" }
    ],
    leadCategories: ["Production", "Mixing", "Mastering", "Beat Licensing", "Sync"],
    brandSettings: [
      { label: "Primary brand", value: "JMT Music" },
      { label: "Accent", value: "Baby blue" },
      { label: "Voice", value: "Premium, direct, creative" }
    ],
    catalog: jmtCatalog,
    catalogTitle: "Beat Library",
    catalogDescription: "Search, review, and organize the JMT Music instrumental catalog.",
    activity: [
      { event: "Beat audio play", detail: "Swagger", time: "2 minutes ago" },
      { event: "BeatStars click", detail: "Heat Check", time: "18 minutes ago" },
      { event: "Production inquiry", detail: "Single production", time: "47 minutes ago" },
      { event: "Sync page view", detail: "Licensing overview", time: "1 hour ago" }
    ],
    topPages: [{ label: "Homepage", value: "42%" }, { label: "Beat Library", value: "27%" }, { label: "Services", value: "16%" }, { label: "Sync", value: "9%" }],
    topContent: [{ label: "Swagger", value: 34 }, { label: "Heat Check", value: 28 }, { label: "Hoodie", value: 19 }, { label: "TLKIN", value: 11 }],
    trafficSources: [{ label: "Direct", value: "46%" }, { label: "Instagram", value: "24%" }, { label: "Google", value: "18%" }, { label: "BeatStars", value: "12%" }]
  },
  "jonathan-tripp": {
    id: "jonathan-tripp",
    name: "Jonathan Tripp",
    domain: "jonathan-tripp.com",
    initials: "JT",
    connected: false,
    focus: "Personal artist site, piano lessons, live gigs, and performer brand",
    supportMessage: "Architecture prepared. Website and analytics connections are planned but not active yet.",
    dashboardMetrics: [
      { label: "Lesson Inquiries", value: "6", detail: "Mock monthly total", icon: "users" },
      { label: "Gig Inquiries", value: "4", detail: "Mock monthly total", icon: "calendar" },
      { label: "Media Page Views", value: "182", detail: "Representative data", icon: "eye" },
      { label: "Booking Clicks", value: "23", detail: "Representative data", icon: "click" },
      { label: "Contact Submissions", value: "8", detail: "Representative data", icon: "mail" }
    ],
    websiteSections: [
      { title: "Artist Homepage", description: "Performer positioning, featured media, and booking call to action.", connected: false },
      { title: "Piano Lessons", description: "Lesson formats, student fit, availability, and inquiry pathway.", connected: false },
      { title: "Live Gigs", description: "Performance services, venue information, repertoire, and booking.", connected: false },
      { title: "Media", description: "Performance video, photography, biography, and press materials.", connected: false },
      { title: "Contact & Booking", description: "Lesson, performance, collaboration, and general inquiry routing.", connected: false },
      { title: "Footer", description: "Personal brand links, social destinations, and contact information.", connected: false }
    ],
    analyticsStatus: [
      { label: "Google Analytics", detail: "Connection planned", healthy: false },
      { label: "Microsoft Clarity", detail: "Connection planned", healthy: false },
      { label: "Website Connection", detail: "Import not started", healthy: false },
      { label: "Deployment Status", detail: "External site not managed yet", healthy: false }
    ],
    contentChannels: [
      { name: "Instagram", description: "Performance clips, piano moments, and upcoming appearances.", connected: false, accent: "from-fuchsia-500/20" },
      { name: "Facebook", description: "Gig announcements, lesson availability, and community updates.", connected: false, accent: "from-blue-500/20" },
      { name: "YouTube", description: "Live performances, piano arrangements, and artist features.", connected: false, accent: "from-red-500/20" },
      { name: "Threads", description: "Musicianship, performance notes, and personal perspective.", connected: false, accent: "from-indigo-500/20" },
      { name: "X", description: "Gig updates, media releases, and brief artist news.", connected: false, accent: "from-slate-500/20" }
    ],
    leadCategories: ["Piano Lessons", "Live Gigs", "Private Events", "Collaboration", "Media"],
    brandSettings: [
      { label: "Primary brand", value: "Jonathan Tripp" },
      { label: "Accent", value: "Prepared for site audit" },
      { label: "Voice", value: "Personal, accomplished, inviting" }
    ],
    catalog: [],
    catalogTitle: "Performance Library",
    catalogDescription: "Prepared for future repertoire, performance media, and lesson resources.",
    activity: [
      { event: "Media page view", detail: "Live performance reel", time: "8 minutes ago" },
      { event: "Booking click", detail: "Live gigs", time: "26 minutes ago" },
      { event: "Lesson inquiry", detail: "Adult beginner", time: "52 minutes ago" },
      { event: "Contact submission", detail: "Private event", time: "2 hours ago" }
    ],
    topPages: [{ label: "Homepage", value: "39%" }, { label: "Piano Lessons", value: "25%" }, { label: "Live Gigs", value: "21%" }, { label: "Media", value: "15%" }],
    topContent: [{ label: "Live Performance Reel", value: 61 }, { label: "Piano Arrangement", value: 42 }, { label: "Artist Biography", value: 29 }, { label: "Press Photos", value: 18 }],
    trafficSources: [{ label: "Direct", value: "41%" }, { label: "Google", value: "26%" }, { label: "Instagram", value: "21%" }, { label: "Referrals", value: "12%" }]
  }
};

/** Returns a complete property configuration with a safe JMT Music default. */
export function getSiteConfig(value?: string | null): SiteConfig {
  return siteConfigs[normalizeSiteId(value)];
}
