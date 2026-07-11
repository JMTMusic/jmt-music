import { redirect } from "next/navigation";
import { normalizeSiteId } from "@/lib/control-center/site-registry";
import type { SitePageProps } from "@/lib/control-center/types";

/**
 * The Template Library module evolved into the Communication Playbook 2026-07-10
 * (Phase A) — extending the same underlying table (template_library renamed to
 * communication_playbook), not a separate system. This route is preserved as a
 * redirect (rather than removed) so any bookmarked or saved link keeps working, and
 * the `site` query param is carried through.
 */
export default async function LegacyTemplatesRedirect({ searchParams }: SitePageProps) {
  const { site } = await searchParams;
  const siteId = normalizeSiteId(site);
  redirect(siteId === "jmt-music" ? "/control-center/growth/playbook" : `/control-center/growth/playbook?site=${siteId}`);
}
