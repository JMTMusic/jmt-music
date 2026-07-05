import Image from "next/image";
import {
  Activity,
  ArrowRight,
  AudioLines,
  BarChart3,
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
import { beats, websiteStatuses } from "@/lib/control-center/data";

const metrics = [
  { label: "Visitors Today", value: "—", trend: "Awaiting GA Data API", icon: Users },
  { label: "Active Users", value: "—", trend: "Open Google Analytics", icon: Activity },
  { label: "Beat Plays", value: "24", trend: "+18% this week", icon: AudioLines },
  { label: "BeatStars Clicks", value: "9", trend: "+3 this week", icon: MousePointerClick },
  { label: "Contact Submissions", value: "3", trend: "2 need a reply", icon: Mail }
];

const quickActions = [
  { label: "Add Beat", icon: Plus, href: "/control-center/beats" },
  { label: "Edit Homepage", icon: FilePenLine, href: "/control-center/website" },
  { label: "Generate Social Post", icon: Sparkles, href: "/control-center/content" },
  { label: "View Analytics", icon: BarChart3, href: "/control-center/analytics" },
  { label: "Contact Inbox", icon: Mail, href: "/control-center/clients" }
];

/** Control Center overview with operating status, activity, and business shortcuts. */
export default function DashboardPage() {
  return (
    <>
      <PageHeader eyebrow="Sunday, July 5" title="Good afternoon, Jonathan." description="A focused view of JMT Music performance, projects, and the next actions that move the business forward." actions={<ActionButton href="https://www.jmtmusic.studio">View live website</ActionButton>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(({ label, value, trend, icon: Icon }) => <AdminCard key={label} className="group p-5 transition hover:-translate-y-1 hover:border-sky-300/25"><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-300/10 text-sky-300"><Icon className="h-5 w-5" /></span><span className="rounded-full bg-white/[0.04] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">Live</span></div><p className="mt-6 text-3xl font-semibold tracking-tight text-white">{value}</p><p className="mt-1 text-xs font-medium text-slate-300">{label}</p><p className="mt-3 text-[11px] text-slate-500">{trend}</p></AdminCard>)}
      </div>

      <section className="mt-10"><SectionHeading title="Quick actions" description="The fastest paths into daily work." /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{quickActions.map(({ label, icon: Icon, href }) => <a key={label} href={href} className="group flex min-h-24 items-center gap-4 rounded-2xl border border-white/8 bg-gradient-to-br from-white/[0.045] to-transparent p-5 transition hover:-translate-y-0.5 hover:border-sky-300/30"><span className="grid h-11 w-11 place-items-center rounded-xl border border-sky-300/15 bg-sky-300/8 text-sky-300"><Icon className="h-5 w-5" /></span><span className="text-sm font-semibold">{label}</span><ArrowRight className="ml-auto h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-sky-300" /></a>)}</div></section>

      <div className="mt-10 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <AdminCard className="p-6"><SectionHeading title="Recent beats" description="Latest additions to the active catalog." action={<a href="/control-center/beats" className="text-xs font-semibold text-sky-300">View library</a>} /><div className="space-y-2">{beats.slice(0, 4).map((beat) => <div key={beat.id} className="flex items-center gap-4 rounded-xl p-2 transition hover:bg-white/[0.035]"><Image src={beat.cover} alt="" width={52} height={52} className="rounded-lg" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{beat.title}</p><p className="text-xs text-slate-500">{beat.genre} · {beat.bpm} BPM</p></div>{beat.featured && <span className="ml-auto rounded-full bg-sky-300/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-sky-300">Featured</span>}</div>)}</div></AdminCard>
        <AdminCard className="p-6"><SectionHeading title="Website status" description="Production service health." />{websiteStatuses.map((status) => <StatusRow key={status.label} {...status} />)}</AdminCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <AdminCard className="p-6"><SectionHeading title="Recent website activity" /><div className="space-y-5">{[["Beat played", "Swagger", "2 min ago"], ["Service CTA clicked", "Mixing", "18 min ago"], ["BeatStars opened", "Heat Check", "31 min ago"]].map(([event, detail, time]) => <div key={event + time} className="flex gap-3"><span className="mt-1 h-2 w-2 rounded-full bg-sky-300" /><div><p className="text-sm text-slate-200">{event} <span className="text-slate-500">· {detail}</span></p><p className="mt-1 text-[10px] text-slate-600">{time}</p></div></div>)}</div></AdminCard>
        <AdminCard className="p-6"><SectionHeading title="Latest client messages" /><div className="space-y-4">{[["Maya Reynolds", "Single production inquiry", "Today"], ["Darius Cole", "Mix revision delivered", "Yesterday"], ["Northline Media", "Sync brief received", "Jun 28"]].map(([name, subject, date]) => <div key={name} className="flex items-center gap-3 border-b border-white/6 pb-4 last:border-0"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.05] text-xs font-semibold text-sky-200">{name.split(" ").map((part) => part[0]).join("")}</span><div><p className="text-sm font-medium">{name}</p><p className="text-xs text-slate-500">{subject}</p></div><span className="ml-auto text-[10px] text-slate-600">{date}</span></div>)}</div></AdminCard>
        <AdminCard className="p-6"><SectionHeading title="Analytics status" />{[
          ["Google Analytics Connected", "GA4 measurement stream", BarChart3],
          ["Microsoft Clarity Connected", "Heatmaps and recordings", UserRoundCheck]
        ].map(([label, detail, Icon]) => { const StatusIcon = Icon as typeof Music2; return <div key={label as string} className="mb-3 flex items-center gap-4 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.035] p-4"><StatusIcon className="h-5 w-5 text-emerald-300" /><div><p className="text-sm font-medium">{label as string}</p><p className="text-xs text-slate-500">{detail as string}</p></div><span className="ml-auto h-2 w-2 rounded-full bg-emerald-400" /></div>; })}<p className="mt-4 text-[11px] leading-5 text-slate-500">Visitor metrics require a read-only Google Analytics Data API connection in Phase 2.</p></AdminCard>
      </div>
    </>
  );
}
