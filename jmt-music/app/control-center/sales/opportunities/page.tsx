import { AddOpportunityDialog } from "@/components/control-center/add-opportunity-dialog";
import { SalesOpportunityList } from "@/components/control-center/sales-opportunity-list";
import { EmptyState, PageHeader } from "@/components/control-center/ui";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { listSalesOpportunities } from "@/lib/sales/repository";
import { friendlySalesMessage } from "@/lib/sales/display";
import type { SitePageProps } from "@/lib/control-center/types";

/** Opportunity List: the searchable, filterable, sortable alternative to the Pipeline board. */
export default async function SalesOpportunitiesPage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;

  const [result, access] = await Promise.all([listSalesOpportunities(site), getControlCenterAccessStatus()]);

  return (
    <>
      <PageHeader
        eyebrow={`${site.name} · Sales`}
        title="Opportunities"
        description="Search, filter, and sort every logged opportunity."
        actions={<AddOpportunityDialog propertyId={site.id} disabled={!access.canCreate} />}
      />

      {result.status === "error" && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">Sales unavailable:</strong>{friendlySalesMessage(result.detail)}</div>
      )}
      {!access.canCreate && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">New Opportunity disabled:</strong>{access.detail}</div>
      )}

      {result.status === "empty" ? (
        <EmptyState title="No sales opportunities yet" message="Add your first opportunity to see it here." />
      ) : (
        <SalesOpportunityList opportunities={result.opportunities} siteQuery={siteQuery} />
      )}
    </>
  );
}
