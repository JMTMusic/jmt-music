import { Archive } from "lucide-react";
import { AddLeadDialog } from "@/components/control-center/add-lead-dialog";
import { LeadCard } from "@/components/control-center/lead-card";
import kanbanStyles from "@/components/control-center/kanban-board.module.css";
import { EmptyState, PageHeader } from "@/components/control-center/ui";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getPropertyClients } from "@/lib/control-center/client-repository";
import { getSiteConfig } from "@/lib/control-center/data";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/control-center/lead-display";
import { selectActive, selectArchived, selectByStage } from "@/lib/control-center/lead-pipeline";
import type { SitePageProps } from "@/lib/control-center/types";

/** Lead Pipeline: the 8-stage Kanban board. Extends the clients relationship, not a parallel leads system. */
export default async function LeadPipelinePage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;
  const [result, access] = await Promise.all([getPropertyClients(site), getControlCenterAccessStatus()]);

  const active = selectActive(result.clients);
  const archived = selectArchived(result.clients);

  return (
    <>
      <PageHeader
        eyebrow={`${site.name} · Growth Engine`}
        title="Lead Pipeline"
        description="Every artist and client relationship, from first outreach through repeat work. A lead is an earlier stage of the same relationship a Project later represents."
        actions={<AddLeadDialog propertyId={site.id} disabled={!access.canCreate} />}
      />

      {result.status === "error" && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">Leads unavailable:</strong>{result.detail}</div>
      )}
      {!access.canCreate && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">Add Lead disabled:</strong>{access.detail}</div>
      )}

      {result.status === "empty" ? (
        <EmptyState title="No leads yet" message="Add your first lead to start tracking it through the pipeline — from first contact to repeat client." />
      ) : (
        <>
          {/* Mobile: stacked, stage-grouped list. Desktop (lg+): horizontally scrollable 8-column board. */}
          <div className="grid gap-4 lg:hidden">
            {STAGE_ORDER.map((stage) => {
              const stageLeads = selectByStage(active, stage);
              if (!stageLeads.length) return null;
              return (
                <section key={stage} className="rounded-2xl bg-white/[0.018] p-3">
                  <div className="mb-3 flex items-center justify-between px-2 py-1"><h2 className="font-sans text-sm font-semibold">{STAGE_LABELS[stage]}</h2><span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/5 px-1.5 text-[10px] text-slate-500">{stageLeads.length}</span></div>
                  <div className="space-y-3">{stageLeads.map((lead) => <LeadCard key={lead.id} lead={lead} propertyId={site.id} canEdit={access.canCreate} siteQuery={siteQuery} />)}</div>
                </section>
              );
            })}
          </div>
          <div className={`hidden gap-4 overflow-x-auto pb-4 lg:grid lg:auto-cols-[280px] lg:grid-flow-col ${kanbanStyles.scrollArea}`}>
            {STAGE_ORDER.map((stage) => {
              const stageLeads = selectByStage(active, stage);
              return (
                <section key={stage} className="w-[280px] shrink-0 rounded-2xl bg-white/[0.018] p-3">
                  <div className="mb-3 flex items-center justify-between px-2 py-1"><h2 className="font-sans text-sm font-semibold">{STAGE_LABELS[stage]}</h2><span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/5 px-1.5 text-[10px] text-slate-500">{stageLeads.length}</span></div>
                  <div className="space-y-3">{stageLeads.map((lead) => <LeadCard key={lead.id} lead={lead} propertyId={site.id} canEdit={access.canCreate} siteQuery={siteQuery} />)}</div>
                </section>
              );
            })}
          </div>
        </>
      )}

      {archived.length > 0 && (
        <details className="mt-10">
          <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Archive className="h-3.5 w-3.5" />Archived ({archived.length})</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((lead) => <LeadCard key={lead.id} lead={lead} propertyId={site.id} canEdit={access.canCreate} siteQuery={siteQuery} />)}
          </div>
        </details>
      )}
    </>
  );
}
