import { BarChart3, ExternalLink, Globe2, Laptop, MapPin, MousePointerClick, Music2, Smartphone, Tablet, Users } from "lucide-react";
import { ActionButton, AdminCard, PageHeader, SectionHeading } from "@/components/control-center/ui";
import { getSiteConfig } from "@/lib/control-center/data";
import type { SitePageProps } from "@/lib/control-center/types";

/** Business-focused analytics summary that complements external analytics tools. */
export default async function AnalyticsPage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);

  return (
    <>
      <PageHeader eyebrow={`${site.name} · Performance`} title="Analytics" description={`A concise operating view of ${site.name} audience intent and website outcomes.`} actions={<><ActionButton href="https://analytics.google.com">Google Analytics</ActionButton><ActionButton href="https://clarity.microsoft.com">Microsoft Clarity</ActionButton></>} />
      <div className={`mb-6 rounded-xl border px-4 py-3 text-xs leading-5 ${site.connected ? "border-sky-300/10 bg-sky-300/[0.045] text-sky-100/70" : "border-amber-300/15 bg-amber-300/[0.055] text-amber-100/75"}`}>{site.connected ? "Phase 1 uses representative activity data. GA4 Data API aggregation and scheduled synchronization are planned for Phase 2." : site.supportMessage}</div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{site.dashboardMetrics.slice(0, 4).map(({ label, value, detail }, index) => { const MetricIcon = [Users, Music2, MousePointerClick, Globe2][index]; return <AdminCard key={label} className="p-5"><MetricIcon className="h-5 w-5 text-sky-300" /><p className="mt-5 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs font-medium">{label}</p><p className="mt-2 text-[11px] text-slate-500">{detail}</p></AdminCard>; })}</div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AdminCard className="p-6"><SectionHeading title="Top pages" description="Share of tracked page activity." /><div className="space-y-5">{site.topPages.map(({ label, value }) => <div key={label}><div className="mb-2 flex justify-between text-xs"><span>{label}</span><span className="text-slate-500">{value}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-sky-300" style={{ width: value }} /></div></div>)}</div></AdminCard>
        <AdminCard className="p-6"><SectionHeading title={site.id === "jmt-music" ? "Top beats" : "Top media"} description="Representative engagement over the last 30 days." /><div className="space-y-3">{site.topContent.map(({ label, value }, index) => <div key={label} className="flex items-center rounded-xl bg-white/[0.025] p-3"><span className="mr-4 text-xs text-slate-600">0{index + 1}</span><span className="text-sm font-medium">{label}</span><span className="ml-auto text-xs text-slate-500">{value} views</span></div>)}</div></AdminCard>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <AdminCard className="p-6"><SectionHeading title="Traffic sources" />{site.trafficSources.map(({ label, value }) => <div key={label} className="flex justify-between border-b border-white/6 py-3 text-sm last:border-0"><span className="text-slate-300">{label}</span><span className="text-slate-500">{value}</span></div>)}</AdminCard>
        <AdminCard className="p-6"><SectionHeading title="Countries" />{[["United States", "68%"], ["Canada", "11%"], ["United Kingdom", "9%"], ["Germany", "5%"]].map(([label, value]) => <div key={label} className="flex items-center gap-3 border-b border-white/6 py-3 text-sm last:border-0"><MapPin className="h-4 w-4 text-sky-300" /><span>{label}</span><span className="ml-auto text-slate-500">{value}</span></div>)}</AdminCard>
        <AdminCard className="p-6"><SectionHeading title="Devices" />{[["Mobile", "64%", Smartphone], ["Desktop", "31%", Laptop], ["Tablet", "5%", Tablet]].map(([label, value, Icon]) => { const DeviceIcon = Icon as typeof Smartphone; return <div key={label as string} className="flex items-center gap-3 border-b border-white/6 py-4 text-sm last:border-0"><DeviceIcon className="h-4 w-4 text-sky-300" /><span>{label as string}</span><span className="ml-auto text-slate-500">{value as string}</span></div>; })}</AdminCard>
      </div>
      <AdminCard className="mt-6 p-6"><SectionHeading title="Recent activity" description={`Important conversion events from ${site.domain}.`} />{site.activity.map(({ event, detail, time }) => <div key={event + time} className="grid gap-1 border-b border-white/6 py-4 text-sm last:border-0 md:grid-cols-[1fr_1fr_auto]"><span>{event}</span><span className="text-slate-400">{detail}</span><span className="text-xs text-slate-600">{time}</span></div>)}</AdminCard>
    </>
  );
}
