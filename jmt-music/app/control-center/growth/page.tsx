import { ArrowRight, CalendarClock, Clock, Sparkles, UserPlus } from "lucide-react";
import { AdminCard, EmptyState, PageHeader, SectionHeading } from "@/components/control-center/ui";
import { getSiteConfig } from "@/lib/control-center/data";
import { getPropertyClientMessages, getPropertyClients } from "@/lib/control-center/client-repository";
import { getDisplayName, groupMessagesByClient, selectDueTodayFollowUps, selectNewLeads, selectOverdueFollowUps, selectWaitingResponses } from "@/lib/control-center/lead-pipeline";
import { CommunicationTimeline } from "@/components/control-center/communication-timeline";
import { getControlCenterRole } from "@/lib/control-center/access";
import type { SitePageProps } from "@/lib/control-center/types";

/**
 * Outreach Dashboard: the pre-project half of the relationship funnel. Answers
 * "what should Jonathan do today" for leads and communications, the same way the main
 * Control Center Dashboard answers it for active project work. Split is deliberate at
 * the `project` stage handoff — this dashboard never duplicates the main one.
 */
export default async function GrowthOutreachPage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;
  const [clientsResult, messagesResult, role] = await Promise.all([
    getPropertyClients(site),
    getPropertyClientMessages(site, { limit: 10 }),
    getControlCenterRole()
  ]);

  const clients = clientsResult.clients;
  const messagesByClient = groupMessagesByClient(messagesResult.messages);
  const dueToday = selectDueTodayFollowUps(clients);
  const overdue = selectOverdueFollowUps(clients);
  const newLeads = selectNewLeads(clients);
  const waitingResponses = selectWaitingResponses(clients, messagesByClient);
  const clientLabels = Object.fromEntries(clients.map((client) => [client.id, getDisplayName(client)]));

  return (
    <>
      <PageHeader eyebrow={`${site.name} · Growth Engine`} title="Outreach" description="Today's follow-ups, new leads, and recent conversations across the relationship pipeline." actions={<a href={`/control-center${siteQuery}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:border-sky-300/40 hover:bg-sky-300/10">Main Dashboard<ArrowRight className="h-4 w-4" /></a>} />

      {clientsResult.status === "error" && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">Leads unavailable:</strong>{clientsResult.detail}</div>
      )}

      <section>
        <SectionHeading title="Today's Follow-ups" description="Leads with a follow-up date of today." />
        <AdminCard className="p-2">
          {dueToday.length ? dueToday.map((client) => <FollowUpRow key={client.id} label={getDisplayName(client)} detail={client.nextFollowUpAt} siteQuery={siteQuery} leadId={client.id} icon={CalendarClock} tone="amber" />) : <p className="p-6 text-sm text-slate-500">Nothing due today.</p>}
        </AdminCard>
      </section>

      <section className="mt-10">
        <SectionHeading title="Overdue Follow-ups" description="Follow-up dates that have passed." />
        <AdminCard className="p-2">
          {overdue.length ? overdue.map((client) => <FollowUpRow key={client.id} label={getDisplayName(client)} detail={client.nextFollowUpAt} siteQuery={siteQuery} leadId={client.id} icon={Clock} tone="red" />) : <p className="p-6 text-sm text-slate-500">Nothing overdue.</p>}
        </AdminCard>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <SectionHeading title="New Leads" description="Created in the last 7 days." />
          <AdminCard className="p-2">
            {newLeads.length ? newLeads.map((client) => <FollowUpRow key={client.id} label={getDisplayName(client)} detail={client.platform} siteQuery={siteQuery} leadId={client.id} icon={UserPlus} tone="sky" />) : <p className="p-6 text-sm text-slate-500">No new leads this week.</p>}
          </AdminCard>
        </section>
        <section>
          <SectionHeading title="Waiting on a Response" description="Last contact was outbound, 3+ days ago, no reply logged." />
          <AdminCard className="p-2">
            {waitingResponses.length ? waitingResponses.map((client) => <FollowUpRow key={client.id} label={getDisplayName(client)} detail={client.stage} siteQuery={siteQuery} leadId={client.id} icon={Sparkles} tone="slate" />) : <p className="p-6 text-sm text-slate-500">No one is waiting on a reply.</p>}
          </AdminCard>
        </section>
      </div>

      <section className="mt-10">
        <SectionHeading title="Recent Communication" description="The last 10 logged communications, property-wide." />
        {messagesResult.status === "error" ? (
          <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75">{messagesResult.detail}</div>
        ) : (
          <CommunicationTimeline messages={messagesResult.messages} propertyId={site.id} canDelete={role === "owner"} showClientColumn clientLabels={clientLabels} />
        )}
      </section>

      {clientsResult.status === "empty" && (
        <div className="mt-10">
          <EmptyState title="No leads yet" message="Add your first lead from the Lead Pipeline tab to start seeing follow-ups and activity here." />
        </div>
      )}

      <section className="mt-10">
        <a href={`/control-center/growth/leads${siteQuery}`} className="group flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/[0.035] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-sky-300/30 sm:flex-row sm:items-center sm:gap-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sky-300/15 bg-sky-300/8 text-sky-300"><UserPlus className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">Lead Pipeline</p><p className="mt-1 text-xs leading-5 text-slate-500">The full 8-stage Kanban board — every lead from first contact through repeat client.</p></div>
          <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-sky-300">Open Lead Pipeline<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
        </a>
      </section>
    </>
  );
}

function FollowUpRow({
  label,
  detail,
  siteQuery,
  leadId,
  icon: Icon,
  tone
}: {
  label: string;
  detail: string | null;
  siteQuery: string;
  leadId: string;
  icon: typeof CalendarClock;
  tone: "amber" | "red" | "sky" | "slate";
}) {
  const toneClass = { amber: "bg-amber-300/8 text-amber-300", red: "bg-red-400/8 text-red-300", sky: "bg-sky-300/8 text-sky-300", slate: "bg-white/[0.04] text-slate-400" }[tone];
  return (
    <a href={`/control-center/growth/leads/${leadId}${siteQuery}`} className="flex items-center gap-4 rounded-xl p-3 transition hover:bg-white/[0.035]">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${toneClass}`}><Icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-100">{label}</p>
        {detail && <p className="truncate text-xs text-slate-500">{detail}</p>}
      </div>
    </a>
  );
}
