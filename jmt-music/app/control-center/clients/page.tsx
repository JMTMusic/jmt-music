import { redirect } from "next/navigation";
import { normalizeSiteId } from "@/lib/control-center/site-registry";
import type { SitePageProps } from "@/lib/control-center/types";

/**
 * The Clients module was superseded by the Growth Engine's Lead Pipeline, which extends
 * the same underlying relationship — not a separate system. This route is preserved as a
 * redirect (rather than removed) so any bookmarked or saved link keeps working, and the
 * `site` query param is carried through.
 */
export default async function LegacyClientsRedirect({ searchParams }: SitePageProps) {
  const { site } = await searchParams;
  const siteId = normalizeSiteId(site);
  redirect(siteId === "jmt-music" ? "/control-center/growth/leads" : `/control-center/growth/leads?site=${siteId}`);
}
