import type { SiteId, SiteSummary } from "./types";

/**
 * Client-safe property registry. It intentionally contains no operational,
 * client, analytics, or other private dashboard data.
 */
export const siteRegistry: SiteSummary[] = [
  { id: "jmt-music", name: "JMT Music", domain: "jmtmusic.studio", connected: true, initials: "JMT" },
  { id: "jonathan-tripp", name: "Jonathan Tripp", domain: "jonathan-tripp.com", connected: false, initials: "JT" }
];

/** Converts untrusted URL state into a supported property identifier. */
export function normalizeSiteId(value?: string | null): SiteId {
  return siteRegistry.some((site) => site.id === value) ? value as SiteId : "jmt-music";
}
