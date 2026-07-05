import { BarChart3, ExternalLink, Globe2, Laptop, MapPin, MousePointerClick, Music2, Smartphone, Tablet, Users } from "lucide-react";
import { ActionButton, AdminCard, PageHeader, SectionHeading } from "@/components/control-center/ui";

const topPages = [["Homepage", "42%"], ["Beat Library", "27%"], ["Services", "16%"], ["Contact", "9%"]];
const topBeats = [["Swagger", 34], ["Heat Check", 28], ["Hoodie", 19], ["TLKIN", 11]];

/** Business-focused analytics summary that complements external analytics tools. */
export default function AnalyticsPage() {
  return (
    <>
      <PageHeader eyebrow="Performance" title="Analytics" description="A concise operating view of listener intent and website outcomes. Detailed exploration remains in Google Analytics and Microsoft Clarity." actions={<><ActionButton href="https://analytics.google.com">Google Analytics</ActionButton><ActionButton href="https://clarity.microsoft.com">Microsoft Clarity</ActionButton></>} />
      <div className="mb-6 rounded-xl border border-sky-300/10 bg-sky-300/[0.045] px-4 py-3 text-xs leading-5 text-sky-100/70">Phase 1 uses representative activity data. GA4 Data API aggregation and scheduled synchronization are planned for Phase 2.</div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[
        ["Visitors", "—", "GA Data API required", Users],
        ["Beat plays", "124", "+21% over 30 days", Music2],
        ["BeatStars clicks", "38", "30.6% of listeners", MousePointerClick],
        ["Top country", "United States", "68% of sessions", Globe2]
      ].map(([label, value, detail, Icon]) => { const MetricIcon = Icon as typeof Users; return <AdminCard key={label as string} className="p-5"><MetricIcon className="h-5 w-5 text-sky-300" /><p className="mt-5 text-2xl font-semibold">{value as string}</p><p className="mt-1 text-xs font-medium">{label as string}</p><p className="mt-2 text-[11px] text-slate-500">{detail as string}</p></AdminCard>; })}</div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AdminCard className="p-6"><SectionHeading title="Top pages" description="Share of tracked page activity." /><div className="space-y-5">{topPages.map(([page, share]) => <div key={page}><div className="mb-2 flex justify-between text-xs"><span>{page}</span><span className="text-slate-500">{share}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-sky-300" style={{ width: share }} /></div></div>)}</div></AdminCard>
        <AdminCard className="p-6"><SectionHeading title="Top beats" description="Tracked audio starts over the last 30 days." /><div className="space-y-3">{topBeats.map(([beat, plays], index) => <div key={beat} className="flex items-center rounded-xl bg-white/[0.025] p-3"><span className="mr-4 text-xs text-slate-600">0{index + 1}</span><span className="text-sm font-medium">{beat}</span><span className="ml-auto text-xs text-slate-500">{plays} plays</span></div>)}</div></AdminCard>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <AdminCard className="p-6"><SectionHeading title="Traffic sources" />{[["Direct", "46%"], ["Instagram", "24%"], ["Google", "18%"], ["BeatStars", "12%"]].map(([label, value]) => <div key={label} className="flex justify-between border-b border-white/6 py-3 text-sm last:border-0"><span className="text-slate-300">{label}</span><span className="text-slate-500">{value}</span></div>)}</AdminCard>
        <AdminCard className="p-6"><SectionHeading title="Countries" />{[["United States", "68%"], ["Canada", "11%"], ["United Kingdom", "9%"], ["Germany", "5%"]].map(([label, value]) => <div key={label} className="flex items-center gap-3 border-b border-white/6 py-3 text-sm last:border-0"><MapPin className="h-4 w-4 text-sky-300" /><span>{label}</span><span className="ml-auto text-slate-500">{value}</span></div>)}</AdminCard>
        <AdminCard className="p-6"><SectionHeading title="Devices" />{[["Mobile", "64%", Smartphone], ["Desktop", "31%", Laptop], ["Tablet", "5%", Tablet]].map(([label, value, Icon]) => { const DeviceIcon = Icon as typeof Smartphone; return <div key={label as string} className="flex items-center gap-3 border-b border-white/6 py-4 text-sm last:border-0"><DeviceIcon className="h-4 w-4 text-sky-300" /><span>{label as string}</span><span className="ml-auto text-slate-500">{value as string}</span></div>; })}</AdminCard>
      </div>
      <AdminCard className="mt-6 p-6"><SectionHeading title="Recent activity" description="Important conversion events from the website." />{[["Beat audio play", "Swagger", "2 minutes ago"], ["BeatStars click", "Heat Check", "18 minutes ago"], ["Contact form submit", "Custom Production", "47 minutes ago"], ["Service CTA click", "Mixing", "1 hour ago"]].map(([event, detail, time]) => <div key={event + time} className="grid gap-1 border-b border-white/6 py-4 text-sm last:border-0 md:grid-cols-[1fr_1fr_auto]"><span>{event}</span><span className="text-slate-400">{detail}</span><span className="text-xs text-slate-600">{time}</span></div>)}</AdminCard>
    </>
  );
}
