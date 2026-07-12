import { Clock, DollarSign, MessagesSquare, Rocket, Send, UserPlus } from "lucide-react";
import { AddOpportunityDialog } from "@/components/control-center/add-opportunity-dialog";
import { AdminCard, EmptyState, PageHeader, SectionHeading } from "@/components/control-center/ui";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { listSalesOpportunities } from "@/lib/sales/repository";
import {
  computeSalesOverviewCounts,
  getOpportunityNextAction,
  isFollowUpOverdue,
  selectDueForFollowUp
} from "@/lib/sales/pipeline";
import { friendlySalesMessage } from "@/lib/sales/display";
import type { SalesOpportunityRecord } from "@/lib/sales/types";
import type { SitePageProps } from "@/lib/control-center/types";

function formatMoney(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function FollowUpRow({ opportunity, siteQuery, now }: { opportunity: SalesOpportunityRecord; siteQuery: string; now: Date }) {
  const overdue = isFollowUpOverdue(opportunity, now);
  return (
    <a href={`/control-center/sales/pipeline/${opportunity.id}${siteQuery}`} className="flex items-center gap-4 rounded-xl p-3 transition hover:bg-white/[0.035]">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${overdue ? "bg-red-400/8 text-red-300" : "bg-amber-300/8 text-amber-300"}`}><Clock className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-100">{opportunity.title}</p>
        <p className="truncate text-xs text-slate-500">{getOpportunityNextAction(opportunity)}</p>
      </div>
      {overdue && <span className="ml-auto shrink-0 rounded-full border border-red-400/25 bg-red-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-red-300">Overdue</span>}
    </a>
  );
}

/** Sales Overview: today's follow-ups plus the pipeline's headline numbers. */
export default async function SalesOverviewPage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;
  const now = new Date();

  const [result, access] = await Promise.all([listSalesOpportunities(site), getControlCenterAccessStatus()]);
  const opportunities = result.opportunities;
  const followUpsDue = selectDueForFollowUp(opportunities, now);
  const counts = computeSalesOverviewCounts(opportunities, now);

  const statCards = [
    { label: "Waiting for Response", value: String(counts.waitingForResponse), icon: MessagesSquare },
    { label: "Active Conversations", value: String(counts.activeConversations), icon: UserPlus },
    { label: "Proposals Sent (30d)", value: String(counts.proposalsSentLast30Days), icon: Send },
    { label: "Won (30d)", value: String(counts.wonLast30Days), icon: Rocket },
    { label: "Open Pipeline Value", value: formatMoney(counts.openPipelineValue), icon: DollarSign }
  ];

  return (
    <>
      <PageHeader
        eyebrow={`${site.name} · Sales`}
        title="Sales Overview"
        description="Potential client engagements from AirGigs, Fiverr, SoundBetter, Instagram, referrals, and direct inquiries — not yet Projects."
        actions={<AddOpportunityDialog propertyId={site.id} disabled={!access.canCreate} />}
      />

      {result.status === "error" && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">Sales unavailable:</strong>{friendlySalesMessage(result.detail)}</div>
      )}
      {!access.canCreate && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">New Opportunity disabled:</strong>{access.detail}</div>
      )}

      {result.status === "empty" ? (
        <EmptyState title="No sales opportunities yet" message="Log your first opportunity after sending a proposal to start tracking follow-ups, response status, and pipeline value here." />
      ) : (
        <>
          <section>
            <SectionHeading title="Today's Follow-ups" description="Due today or overdue — everything else stays out of the way." />
            <AdminCard className="p-2">
              {followUpsDue.length ? followUpsDue.map((opportunity) => <FollowUpRow key={opportunity.id} opportunity={opportunity} siteQuery={siteQuery} now={now} />) : <p className="p-6 text-sm text-slate-500">Nothing due today.</p>}
            </AdminCard>
          </section>

          <section className="mt-10">
            <SectionHeading title="Pipeline Snapshot" description="Where things stand across the last 30 days." />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {statCards.map(({ label, value, icon: Icon }) => (
                <AdminCard key={label} className="p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-300/10 text-sky-300"><Icon className="h-5 w-5" /></span>
                  <p className="mt-6 text-3xl font-semibold tracking-tight text-white">{value}</p>
                  <p className="mt-1 text-xs font-medium text-slate-300">{label}</p>
                </AdminCard>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <a href={`/control-center/sales/pipeline${siteQuery}`} className="group flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/[0.035] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-sky-300/30 sm:flex-row sm:items-center sm:gap-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sky-300/15 bg-sky-300/8 text-sky-300"><DollarSign className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">Sales Pipeline</p><p className="mt-1 text-xs leading-5 text-slate-500">The full board — New Lead through Won and Lost.</p></div>
              <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-sky-300">Open Pipeline<span aria-hidden>→</span></span>
            </a>
          </section>
        </>
      )}
    </>
  );
}
