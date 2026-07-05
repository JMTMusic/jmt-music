import { AtSign, CalendarClock, Facebook, Hash, Instagram, MessageSquareText, Sparkles, Youtube } from "lucide-react";
import { AdminCard, PageHeader } from "@/components/control-center/ui";
import { getSiteConfig } from "@/lib/control-center/data";
import type { SitePageProps } from "@/lib/control-center/types";

const channelIcons = { Instagram, Facebook, YouTube: Youtube, Threads: AtSign, X: MessageSquareText };

const tools = [["Generate Caption", Sparkles], ["Generate Description", MessageSquareText], ["Generate Hashtags", Hash], ["Schedule", CalendarClock]];

/** Multi-channel content studio shell prepared for future AI and scheduling services. */
export default async function ContentPage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  return <><PageHeader eyebrow={`${site.name} · Publishing`} title="Content Studio" description={`Shape ${site.name} content for each channel. Generation and scheduling controls connect in a future phase.`} />{site.supportMessage && <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75">{site.supportMessage}</div>}<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{site.contentChannels.map(({ name, description, connected, accent }) => { const ChannelIcon = channelIcons[name as keyof typeof channelIcons] || MessageSquareText; return <AdminCard key={name} className={`bg-gradient-to-br ${accent} to-transparent p-6`}><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-black/20"><ChannelIcon className="h-5 w-5" /></span><span className={`rounded-full border border-white/8 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${connected ? "text-emerald-300" : "text-slate-500"}`}>{connected ? "Connected" : "Not connected"}</span></div><h2 className="mt-8 font-sans text-xl font-semibold">{name}</h2><p className="mt-2 min-h-10 text-sm text-slate-400">{description}</p><div className="mt-6 grid grid-cols-2 gap-2">{tools.map(([label, ToolIcon]) => { const IconButton = ToolIcon as typeof Sparkles; return <button key={label as string} disabled className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/8 bg-black/10 px-3 text-[11px] font-semibold text-slate-400"><IconButton className="h-3.5 w-3.5" />{label as string}</button>; })}</div></AdminCard>; })}</div></>;
}
