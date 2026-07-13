import {
  Activity,
  ArrowRight,
  AudioLines,
  CalendarDays,
  Clock,
  Eye,
  Mail,
  MousePointerClick,
  Music2,
  Users
} from "lucide-react";
import { ActionButton, AdminCard, PageHeader, SectionHeading } from "@/components/control-center/ui";
import { getSiteConfig } from "@/lib/control-center/data";
import { getPropertyProjects, selectTodaysFocus, selectWaitingOn, selectWorkload } from "@/lib/control-center/project-repository";
import {
  DEFAULT_WORKLOAD_CEILING,
  getDaysWaiting,
  getProjectNextAction,
  getWorkloadZone,
  isProjectStale,
  type WorkloadZone
} from "@/lib/control-center/project-pipeline";
import { PROJECT_TYPE_LABELS } from "@/lib/control-center/project-display";
import type { Metric, Project, SitePageProps } from "@/lib/control-center/types";
import { inboundCounts } from "@/lib/inbound/repository";
import { listSalesOpportunities } from "@/lib/sales/repository";
import { getOpportunityNextAction, isFollowUpOverdue, selectDueForFollowUp } from "@/lib/sales/pipeline";
import type { SalesOpportunityRecord } from "@/lib/sales/types";
import { listArArtists } from "@/lib/ar/repository";
import { getArtistNextAction, isReviewOverdue, selectTodaysArFocus } from "@/lib/ar/pipeline";
import type { ArArtistRecord } from "@/lib/ar/types";

const metricIcons: Record<Metric["icon"], typeof Users> = {
  users: Users, activity: Activity, audio: AudioLines, click: MousePointerClick,
  mail: Mail, eye: Eye, calendar: CalendarDays
};

const ZONE_META: Record<WorkloadZone, { label: string; className: string }> = {
  comfortable: { label: "Comfortable", className: "bg-emerald-300/10 text-emerald-200" },
  busy: { label: "Busy", className: "bg-amber-300/10 text-amber-200" },
  overloaded: { label: "Overloaded", className: "bg-red-400/10 text-red-300" }
};

function formatDaysWaiting(days: number | null): string {
  if (days === null) return "";
  if (days <= 0) return "Today";
  return `${days}d`;
}

function FocusRow({ project }: { project: Project }) {
  return (
    <div className="flex items-center gap-4 rounded-xl p-3 transition hover:bg-white/[0.035]">
      <span title={PROJECT_TYPE_LABELS[project.type]} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-300/8 text-[10px] font-bold uppercase text-sky-300">{PROJECT_TYPE_LABELS[project.type].slice(0, 2)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-100">{project.title}</p>
        <p className="truncate text-xs text-slate-500">{getProjectNextAction(project)}</p>
      </div>
      {isProjectStale(project) && <span className="ml-auto shrink-0 rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-200">Stale</span>}
    </div>
  );
}

function SalesFollowUpRow({ opportunity, siteQuery, now }: { opportunity: SalesOpportunityRecord; siteQuery: string; now: Date }) {
  const overdue = isFollowUpOverdue(opportunity, now);
  return (
    <a href={`/control-center/sales/pipeline/${opportunity.id}${siteQuery}`} className="flex items-center gap-4 rounded-xl p-3 transition hover:bg-white/[0.035]">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-300/8 text-[10px] font-bold uppercase text-sky-300">$</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-100">{opportunity.title}</p>
        <p className="truncate text-xs text-slate-500">{getOpportunityNextAction(opportunity)}</p>
      </div>
      {overdue && <span className="ml-auto shrink-0 rounded-full border border-red-400/25 bg-red-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-red-300">Overdue</span>}
    </a>
  );
}

function ArFocusRow({ artist, siteQuery, now }: { artist: ArArtistRecord; siteQuery: string; now: Date }) {
  const overdue = isReviewOverdue(artist, now);
  return (
    <a href={`/control-center/ar/${artist.id}${siteQuery}`} className="flex items-center gap-4 rounded-xl p-3 transition hover:bg-white/[0.035]">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-300/8 text-[10px] font-bold uppercase text-sky-300">A&R</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-100">{artist.artistName}</p>
        <p className="truncate text-xs text-slate-500">{getArtistNextAction(artist, now)}.</p>
      </div>
      {overdue && <span className="ml-auto shrink-0 rounded-full border border-red-400/25 bg-red-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-red-300">Overdue</span>}
    </a>
  );
}

function WaitingRow({ project }: { project: Project }) {
  return (
    <div className="flex items-center gap-4 rounded-xl p-3 transition hover:bg-white/[0.035]">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-300/10 text-amber-300"><Clock className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-100">{project.title}</p>
        <p className="truncate text-xs text-slate-500">{project.waitingNote || "Waiting on an update"}</p>
      </div>
      <span className="ml-auto shrink-0 text-[10px] text-slate-600">{formatDaysWaiting(getDaysWaiting(project))}</span>
    </div>
  );
}

/** Control Center dashboard: what needs attention today, what's blocked, workload, and business metrics. */
export default async function DashboardPage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;
  const now = new Date();
  const [projectsResult, inbound, salesResult, arResult] = await Promise.all([getPropertyProjects(site), inboundCounts(site.id), listSalesOpportunities(site), listArArtists(site)]);
  const projects = projectsResult.projects;
  const todaysFocus = selectTodaysFocus(projects);
  const waitingOn = selectWaitingOn(projects);
  const workload = selectWorkload(projects);
  const totalActive = workload.reduce((sum, item) => sum + item.activeCount, 0);
  const zone = getWorkloadZone(totalActive);
  const salesFollowUps = selectDueForFollowUp(salesResult.opportunities, now);
  const arFocus = selectTodaysArFocus(arResult.artists, now);

  return (
    <>
      <PageHeader eyebrow={`${site.name} · Sunday, July 5`} title="Good afternoon, Jonathan." description={`A focused view of ${site.name} performance, leads, and the next actions that move this property forward.`} actions={<ActionButton href={`https://${site.domain}`}>View website</ActionButton>} />
      {site.supportMessage && <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs leading-5 text-amber-100/75"><strong className="mr-2 text-amber-200">Prepared property:</strong>{site.supportMessage}</div>}
      {projectsResult.status === "error" && <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">Projects unavailable:</strong>{projectsResult.detail}</div>}
      {salesResult.status === "error" && <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">Sales unavailable:</strong>{salesResult.detail}</div>}
      {arResult.status === "error" && <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">A&R unavailable:</strong>{arResult.detail}</div>}
      {!inbound.configured && <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">Inbound unavailable:</strong>Configure Supabase and apply the inbound migration to load live attention counts.</div>}

      <section className="mb-10">
        <SectionHeading title="Inbound" description="New conversations waiting for a thoughtful review." />
        <div className="grid gap-4 sm:grid-cols-3">
          {[["New Discoveries",inbound.discoveries,"discoveries"],["New Messages",inbound.messages,"messages"],["New Beat Inquiries",inbound.beatInquiries,"beat-inquiries"]].map(([label,count,tab])=><a key={String(tab)} href={`/control-center/inbox?tab=${tab}${site.id==="jmt-music"?"":`&site=${site.id}`}`}><AdminCard className="p-5 transition hover:border-sky-300/25"><p className="text-3xl font-semibold text-white">{String(count)}</p><p className="mt-1 text-xs text-slate-400">{String(label)}</p></AdminCard></a>)}
        </div>
      </section>

      <section>
        <SectionHeading title="Today's Focus" description="Active work that needs your attention next." />
        <AdminCard className="p-2">
          {todaysFocus.length || salesFollowUps.length || arFocus.length ? (
            <>
              {todaysFocus.map((project) => <FocusRow key={project.id} project={project} />)}
              {salesFollowUps.map((opportunity) => <SalesFollowUpRow key={opportunity.id} opportunity={opportunity} siteQuery={siteQuery} now={now} />)}
              {arFocus.map((artist) => <ArFocusRow key={artist.id} artist={artist} siteQuery={siteQuery} now={now} />)}
            </>
          ) : (
            <p className="p-6 text-sm text-slate-500">Nothing needs attention right now.</p>
          )}
        </AdminCard>
      </section>

      <section className="mt-10">
        <SectionHeading title="Waiting On" description="Blocked on a client, collaborator, or something else." />
        <AdminCard className="p-2">
          {waitingOn.length ? waitingOn.map((project) => <WaitingRow key={project.id} project={project} />) : <p className="p-6 text-sm text-slate-500">Nothing is currently blocked.</p>}
        </AdminCard>
      </section>

      <section className="mt-10">
        <SectionHeading title="Capacity" description="Active project load across every type, against a comfortable ceiling." />
        <AdminCard className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-3xl font-semibold tracking-tight text-white">{totalActive}<span className="ml-2 text-sm font-normal text-slate-500">/ {DEFAULT_WORKLOAD_CEILING} comfortable</span></p>
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${ZONE_META[zone].className}`}>{ZONE_META[zone].label}</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {workload.length
              ? workload.map((item) => <span key={item.type} className="rounded-full border border-white/8 bg-white/[0.025] px-3 py-1.5 text-[10px] font-semibold text-slate-400">{PROJECT_TYPE_LABELS[item.type]} · {item.activeCount}</span>)
              : <span className="text-xs text-slate-500">No active projects yet.</span>}
          </div>
        </AdminCard>
      </section>

      <section className="mt-10">
        <SectionHeading title="Business Snapshot" description="Beat plays, BeatStars clicks, inquiries, and page views." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {site.dashboardMetrics.map(({ label, value, detail, icon }) => {
            const Icon = metricIcons[icon];
            return (
              <AdminCard key={label} className="group p-5 transition hover:-translate-y-1 hover:border-sky-300/25">
                <div className="flex items-start justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-300/10 text-sky-300"><Icon className="h-5 w-5" /></span>
                  <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${site.connected ? "bg-white/[0.04] text-slate-500" : "bg-amber-300/10 text-amber-300"}`}>{site.connected ? "Live" : "Mock"}</span>
                </div>
                <p className="mt-6 text-3xl font-semibold tracking-tight text-white">{value}</p>
                <p className="mt-1 text-xs font-medium text-slate-300">{label}</p>
                <p className="mt-3 text-[11px] text-slate-500">{detail}</p>
              </AdminCard>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <a
          href={`/control-center/beats${siteQuery}`}
          className="group flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/[0.035] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-sky-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/50 sm:flex-row sm:items-center sm:gap-5"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sky-300/15 bg-sky-300/8 text-sky-300"><Music2 className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Beat Catalog</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Catalog details, artwork, audio, metadata, BeatStars links, and publishing status live in the Beats module.</p>
          </div>
          <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-sky-300">Open Beats<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
        </a>
      </section>
    </>
  );
}
