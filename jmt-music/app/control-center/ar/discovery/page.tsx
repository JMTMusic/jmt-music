import { AddArtistDialog } from "@/components/control-center/add-artist-dialog";
import { ArArtistList } from "@/components/control-center/ar-artist-list";
import { EmptyState, PageHeader } from "@/components/control-center/ui";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { listArArtists } from "@/lib/ar/repository";
import { friendlyArMessage } from "@/lib/ar/display";
import type { SitePageProps } from "@/lib/control-center/types";

/** Discovery Inbox: everything not yet on the Watchlist or Ready for Outreach — discovered and reviewing artists. */
export default async function ArDiscoveryPage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;

  const [result, access] = await Promise.all([listArArtists(site), getControlCenterAccessStatus()]);
  const inbox = result.artists.filter((artist) => artist.status === "discovered" || artist.status === "reviewing");

  return (
    <>
      <PageHeader
        eyebrow={`${site.name} · A&R`}
        title="Discovery Inbox"
        description="Newly discovered artists, and artists currently under review."
        actions={<AddArtistDialog propertyId={site.id} disabled={!access.canCreate} />}
      />

      {result.status === "error" && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">A&R unavailable:</strong>{friendlyArMessage(result.detail)}</div>
      )}

      {inbox.length ? (
        <ArArtistList artists={inbox} siteQuery={siteQuery} propertyId={site.id} variant="discovery" canEdit={access.canCreate} />
      ) : (
        <EmptyState title="Nothing to review" message="Add an artist to start tracking them here." />
      )}
    </>
  );
}
