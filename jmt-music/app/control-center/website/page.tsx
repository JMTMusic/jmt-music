import { Eye } from "lucide-react";
import { WebsiteCms } from "@/components/control-center/website-cms";
import { ActionButton, PageHeader } from "@/components/control-center/ui";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { getPropertyWebsiteSections } from "@/lib/control-center/website-repository";
import type { SitePageProps } from "@/lib/control-center/types";

/** Property-scoped CMS workspace; public pages intentionally remain disconnected. */
export default async function WebsitePage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  const [cms, access] = await Promise.all([getPropertyWebsiteSections(site), getControlCenterAccessStatus()]);
  return <><PageHeader eyebrow={`${site.name} · Website`} title="Website Content" description={`Manage staged CMS content for ${site.domain}. Public pages are not connected to these records yet.`} actions={<ActionButton href={`https://${site.domain}`}><Eye className="h-4 w-4" /> Preview website</ActionButton>} />{site.supportMessage && <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75">{site.supportMessage}</div>}<WebsiteCms siteId={site.id} sections={cms.sections} canEdit={access.canCreate} loadStatus={cms.status} loadDetail={cms.detail} /></>;
}
