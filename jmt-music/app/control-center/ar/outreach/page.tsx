import { ArOutreachList } from "@/components/control-center/ar-outreach-list";
import { EmptyState, PageHeader } from "@/components/control-center/ui";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { getPropertyClients } from "@/lib/control-center/client-repository";
import { listArArtists } from "@/lib/ar/repository";
import { friendlyArMessage } from "@/lib/ar/display";
import type { SitePageProps } from "@/lib/control-center/types";

/** Ready for Outreach: qualified artists with a fit-score breakdown, drafted outreach, and Convert to Sales. */
export default async function ArOutreachPage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;

  const [result, clientsResult, access] = await Promise.all([listArArtists(site), getPropertyClients(site), getControlCenterAccessStatus()]);
  const ready = result.artists.filter((artist) => artist.status === "ready_for_outreach");

  return (
    <>
      <PageHeader
        eyebrow={`${site.name} · A&R`}
        title="Ready for Outreach"
        description="Qualified artists waiting on you to reach out or convert into a Sales Opportunity."
      />

      {result.status === "error" && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">A&R unavailable:</strong>{friendlyArMessage(result.detail)}</div>
      )}

      {ready.length ? (
        <ArOutreachList artists={ready} siteQuery={siteQuery} propertyId={site.id} clients={clientsResult.clients} canEdit={access.canCreate} />
      ) : (
        <EmptyState title="Nothing ready for outreach" message="Move a watchlist artist forward once you're ready to reach out." />
      )}
    </>
  );
}
