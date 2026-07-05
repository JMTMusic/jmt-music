import Image from "next/image";
import {
  Activity,
  ArrowRight,
  AudioLines,
  BarChart3,
  CalendarDays,
  Eye,
  FilePenLine,
  Mail,
  MousePointerClick,
  Music2,
  Plus,
  Sparkles,
  Users,
  UserRoundCheck
} from "lucide-react";
import { ActionButton, AdminCard, PageHeader, SectionHeading, StatusRow } from "@/components/control-center/ui";
import { getSiteConfig } from "@/lib/control-center/data";
import type { Metric, SitePageProps } from "@/lib/control-center/types";

const metricIcons: Record<Metric["icon"], typeof Users> = {
  users: Users, activity: Activity, audio: AudioLines, click: MousePointerClick,
  mail: Mail, eye: Eye, calendar: CalendarDays
};

/** Control Center overview with operating status, activity, and business shortcuts. */
export default async function DashboardPage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;
  const quickActions = [
    { label: site.id === "jmt-music" ? "Add Beat" : "Add Performance", icon: Plus, href: `/control-center/beats${siteQuery}` },
    { label: "Edit Homepage", icon: FilePenLine, href: `/control-center/website${siteQuery}` },
    { label: "Generate Social Post", icon: Sparkles, href: `/control-center/content${siteQuery}` },
    { label: "View Analytics", icon: BarChart3, href: `/control-center/analytics${siteQuery}` },
    { label: "Contact Inbox", icon: Mail, href: `/control-center/clients${siteQuery}` }
  ];

  return (
    <>
      <PageHeader eyebrow={`${site.name} · Sunday, July 5`} title="Good afternoon, Jonathan." description={`A focused view of ${site.name} performance, leads, and the next actions that move this property forward.`} actions={<ActionButton href={`https://${site.domain}`}>View website</ActionButton>} />
      {site.supportMessage && <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs leading-5 text-amber-100/75"><strong className="mr-2 text-amber-200">Prepared property:</strong>{site.supportMessage}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {site.dashboardMetrics.map(({ label, value, detail, icon }) => { const Icon = metricIcons[icon]; return <AdminCard key={label} className="group p-5 transition hover:-translate-y-1 hover:border-sky-300/25"><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-300/10 text-sky-300"><Icon className="h-5 w-5" /></span><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${site.connected ? "bg-white/[0.04] text-slate-500" : "bg-amber-300/10 text-amber-300"}`}>{site.connected ? "Live" : "Mock"}</span></div><p className="mt-6 text-3xl font-semibold tracking-tight text-white">{value}</p><p className="mt-1 text-xs font-medium text-slate-300">{label}</p><p className="mt-3 text-[11px] text-slate-500">{detail}</p></AdminCard>; })}
      </div>

      <section className="mt-10"><SectionHeading title="Quick actions" description="The fastest paths into daily work." /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{quickActions.map(({ label, icon: Icon, href }) => <a key={label} href={href} className="group flex min-h-24 items-center gap-4 rounded-2xl border border-white/8 bg-gradient-to-br from-white/[0.045] to-transparent p-5 transition hover:-translate-y-0.5 hover:border-sky-300/30"><span className="grid h-11 w-11 place-items-center rounded-xl border border-sky-300/15 bg-sky-300/8 text-sky-300"><Icon className="h-5 w-5" /></span><span className="text-sm font-semibold">{label}</span><ArrowRight className="ml-auto h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-sky-300" /></a>)}</div></section>

      <div className="mt-10 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <AdminCard className="p-6"><SectionHeading title={site.id === "jmt-music" ? "Recent beats" : "Property focus"} description={site.catalog.length ? "Latest additions to the active catalog." : "Prepared capabilities for this property."} action={<a href={`/control-center/beats${siteQuery}`} className="text-xs font-semibold text-sky-300">View library</a>} />{site.catalog.length ? <div className="space-y-2">{site.catalog.slice(0, 4).map((beat) => <div key={beat.id} className="flex items-center gap-4 rounded-xl p-2 transition hover:bg-white/[0.035]"><Image src={beat.cover} alt="" width={52} height={52} className="rounded-lg" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{beat.title}</p><p className="text-xs text-slate-500">{beat.genre} · {beat.bpm} BPM</p></div>{beat.featured && <span className="ml-auto rounded-full bg-sky-300/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-sky-300">Featured</span>}</div>)}</div> : <div className="rounded-xl border border-dashed border-white/10 p-8"><Music2 className="h-6 w-6 text-sky-300" /><p className="mt-4 text-sm font-medium">{site.focus}</p><p className="mt-2 text-xs leading-5 text-slate-500">Performance media and repertoire modules are prepared for a future connection.</p></div>}</AdminCard>
        <AdminCard className="p-6"><SectionHeading title="Website status" description={`${site.name} service health.`} />{site.analyticsStatus.map((status) => <StatusRow key={status.label} {...status} />)}</AdminCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <AdminCard className="p-6"><SectionHeading title="Recent website activity" /><div className="space-y-5">{site.activity.slice(0, 3).map(({ event, detail, time }) => <div key={event + time} className="flex gap-3"><span className="mt-1 h-2 w-2 rounded-full bg-sky-300" /><div><p className="text-sm text-slate-200">{event} <span className="text-slate-500">· {detail}</span></p><p className="mt-1 text-[10px] text-slate-600">{time}</p></div></div>)}</div></AdminCard>
        <AdminCard className="p-6"><SectionHeading title="Latest client messages" /><div className="space-y-4">{site.clients.slice(0, 3).map(({ name, project, date }) => <div key={name} className="flex items-center gap-3 border-b border-white/6 pb-4 last:border-0"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.05] text-xs font-semibold text-sky-200">{name.split(" ").map((part) => part[0]).join("")}</span><div><p className="text-sm font-medium">{name}</p><p className="text-xs text-slate-500">{project}</p></div><span className="ml-auto text-[10px] text-slate-600">{date}</span></div>)}</div></AdminCard>
        <AdminCard className="p-6"><SectionHeading title="Analytics status" />{site.analyticsStatus.slice(0, 2).map((status, index) => { const StatusIcon = index === 0 ? BarChart3 : UserRoundCheck; return <div key={status.label} className={`mb-3 flex items-center gap-4 rounded-xl border p-4 ${status.healthy ? "border-emerald-400/10 bg-emerald-400/[0.035]" : "border-amber-400/10 bg-amber-400/[0.035]"}`}><StatusIcon className={`h-5 w-5 ${status.healthy ? "text-emerald-300" : "text-amber-300"}`} /><div><p className="text-sm font-medium">{status.label}</p><p className="text-xs text-slate-500">{status.detail}</p></div><span className={`ml-auto h-2 w-2 rounded-full ${status.healthy ? "bg-emerald-400" : "bg-amber-400"}`} /></div>; })}<p className="mt-4 text-[11px] leading-5 text-slate-500">{site.connected ? "Visitor metrics require a read-only Google Analytics Data API connection in Phase 2." : "Analytics services will connect after this property is integrated."}</p></AdminCard>
      </div>
    </>
  );
}
