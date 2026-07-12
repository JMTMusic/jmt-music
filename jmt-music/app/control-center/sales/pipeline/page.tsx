import { CheckCircle2 } from "lucide-react";
import { AddOpportunityDialog } from "@/components/control-center/add-opportunity-dialog";
import { SalesOpportunityCard } from "@/components/control-center/sales-opportunity-card";
import kanbanStyles from "@/components/control-center/kanban-board.module.css";
import { EmptyState, PageHeader } from "@/components/control-center/ui";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { listSalesOpportunities } from "@/lib/sales/repository";
import { selectConverted } from "@/lib/sales/pipeline";
import { BOARD_COLUMNS, friendlySalesMessage } from "@/lib/sales/display";
import type { SitePageProps } from "@/lib/control-center/types";

/** Sales Pipeline: New Lead through Won/Lost, with converted opportunities tucked into a collapsed section (same pattern as the Lead Pipeline's archived leads). */
export default async function SalesPipelinePage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;

  const [result, access] = await Promise.all([listSalesOpportunities(site), getControlCenterAccessStatus()]);
  const opportunities = result.opportunities;
  const board = opportunities.filter((opportunity) => opportunity.status !== "converted");
  const converted = selectConverted(opportunities);

  return (
    <>
      <PageHeader
        eyebrow={`${site.name} · Sales`}
        title="Sales Pipeline"
        description="Every open opportunity, grouped by stage. Status moves happen from each card — no drag-and-drop."
        actions={<AddOpportunityDialog propertyId={site.id} disabled={!access.canCreate} />}
      />

      {result.status === "error" && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">Sales unavailable:</strong>{friendlySalesMessage(result.detail)}</div>
      )}
      {!access.canCreate && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">New Opportunity disabled:</strong>{access.detail}</div>
      )}

      {result.status === "empty" ? (
        <EmptyState title="No sales opportunities yet" message="Add your first opportunity to start tracking it through the pipeline — from first lead to won." />
      ) : (
        <>
          {/* Mobile: stacked, column-grouped list. Desktop (lg+): horizontally scrollable 7-column board. */}
          <div className="grid gap-4 lg:hidden">
            {BOARD_COLUMNS.map((column) => {
              const columnOpportunities = board.filter((opportunity) => column.statuses.includes(opportunity.status));
              if (!columnOpportunities.length) return null;
              return (
                <section key={column.key} className="rounded-2xl bg-white/[0.018] p-3">
                  <div className="mb-3 flex items-center justify-between px-2 py-1"><h2 className="font-sans text-sm font-semibold">{column.label}</h2><span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/5 px-1.5 text-[10px] text-slate-500">{columnOpportunities.length}</span></div>
                  <div className="space-y-3">{columnOpportunities.map((opportunity) => <SalesOpportunityCard key={opportunity.id} opportunity={opportunity} propertyId={site.id} canEdit={access.canCreate} siteQuery={siteQuery} />)}</div>
                </section>
              );
            })}
          </div>
          <div className={`hidden gap-4 overflow-x-auto pb-4 lg:grid lg:auto-cols-[280px] lg:grid-flow-col ${kanbanStyles.scrollArea}`}>
            {BOARD_COLUMNS.map((column) => {
              const columnOpportunities = board.filter((opportunity) => column.statuses.includes(opportunity.status));
              return (
                <section key={column.key} className="w-[280px] shrink-0 rounded-2xl bg-white/[0.018] p-3">
                  <div className="mb-3 flex items-center justify-between px-2 py-1"><h2 className="font-sans text-sm font-semibold">{column.label}</h2><span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/5 px-1.5 text-[10px] text-slate-500">{columnOpportunities.length}</span></div>
                  <div className="space-y-3">{columnOpportunities.map((opportunity) => <SalesOpportunityCard key={opportunity.id} opportunity={opportunity} propertyId={site.id} canEdit={access.canCreate} siteQuery={siteQuery} />)}</div>
                </section>
              );
            })}
          </div>
        </>
      )}

      {converted.length > 0 && (
        <details className="mt-10">
          <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><CheckCircle2 className="h-3.5 w-3.5" />Converted ({converted.length})</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {converted.map((opportunity) => <SalesOpportunityCard key={opportunity.id} opportunity={opportunity} propertyId={site.id} canEdit={access.canCreate} siteQuery={siteQuery} />)}
          </div>
        </details>
      )}
    </>
  );
}
