import { AtSign, CalendarClock, Facebook, Hash, Instagram, MessageSquareText, Sparkles, Youtube } from "lucide-react";
import { AdminCard, PageHeader } from "@/components/control-center/ui";

const channels = [
  ["Instagram", "Reels, carousels, stories, and release posts.", Instagram, "from-fuchsia-500/20"],
  ["Facebook", "Studio updates, releases, and community posts.", Facebook, "from-blue-500/20"],
  ["YouTube", "Beat descriptions, titles, and channel metadata.", Youtube, "from-red-500/20"],
  ["Threads", "Conversation starters and behind-the-scenes notes.", AtSign, "from-indigo-500/20"],
  ["X", "Release announcements and concise creative updates.", MessageSquareText, "from-slate-500/20"]
];

const tools = [["Generate Caption", Sparkles], ["Generate Description", MessageSquareText], ["Generate Hashtags", Hash], ["Schedule", CalendarClock]];

/** Multi-channel content studio shell prepared for future AI and scheduling services. */
export default function ContentPage() {
  return <><PageHeader eyebrow="Publishing" title="Content Studio" description="Shape each release for the channel where it will live. Generation and scheduling controls connect in a future phase." /><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{channels.map(([name, description, Icon, gradient]) => { const ChannelIcon = Icon as typeof Instagram; return <AdminCard key={name as string} className={`bg-gradient-to-br ${gradient as string} to-transparent p-6`}><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-black/20"><ChannelIcon className="h-5 w-5" /></span><span className="rounded-full border border-white/8 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">Not connected</span></div><h2 className="mt-8 font-sans text-xl font-semibold">{name as string}</h2><p className="mt-2 min-h-10 text-sm text-slate-400">{description as string}</p><div className="mt-6 grid grid-cols-2 gap-2">{tools.map(([label, ToolIcon]) => { const IconButton = ToolIcon as typeof Sparkles; return <button key={label as string} disabled className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/8 bg-black/10 px-3 text-[11px] font-semibold text-slate-400"><IconButton className="h-3.5 w-3.5" />{label as string}</button>; })}</div></AdminCard>; })}</div></>;
}
