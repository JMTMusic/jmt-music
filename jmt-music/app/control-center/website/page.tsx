import { Eye, FilePenLine, GripVertical } from "lucide-react";
import { ActionButton, AdminCard, PageHeader } from "@/components/control-center/ui";

const sections = [
  ["Homepage Hero", "Primary headline, supporting copy, background image, and calls to action."],
  ["About", "Artist story, creative philosophy, portrait, and capability highlights."],
  ["Services", "Production services, positioning copy, and inquiry pathways."],
  ["Contact", "Inquiry introduction, contact channels, and form messaging."],
  ["Footer", "Navigation, social destinations, brand statement, and legal copy."]
];

/** Phase 1 website editor shell prepared for future CMS-backed fields. */
export default function WebsitePage() {
  return <><PageHeader eyebrow="Website" title="Website Content" description="A structured view of every editable public section. Publishing controls remain locked until the CMS layer is connected." actions={<ActionButton href="https://www.jmtmusic.studio"><Eye className="h-4 w-4" /> Preview website</ActionButton>} /><div className="space-y-4">{sections.map(([title, description], index) => <AdminCard key={title} className="flex flex-col gap-5 p-5 md:flex-row md:items-center"><span className="text-slate-700"><GripVertical /></span><span className="grid h-12 w-12 place-items-center rounded-xl bg-sky-300/8 text-sky-300"><FilePenLine className="h-5 w-5" /></span><div className="flex-1"><div className="flex items-center gap-3"><h2 className="font-sans text-base font-semibold">{title}</h2>{index === 0 && <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-bold uppercase text-emerald-300">Live</span>}</div><p className="mt-1 text-sm text-slate-500">{description}</p></div><button disabled className="rounded-xl border border-white/8 px-4 py-2.5 text-xs font-semibold text-slate-500">Editing in Phase 2</button></AdminCard>)}</div></>;
}
