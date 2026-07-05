import { Eye, FilePenLine, GripVertical } from "lucide-react";
import { ActionButton, AdminCard, PageHeader } from "@/components/control-center/ui";
import { getSiteConfig } from "@/lib/control-center/data";
import type { SitePageProps } from "@/lib/control-center/types";

/** Phase 1 website editor shell prepared for future CMS-backed fields. */
export default async function WebsitePage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  return <><PageHeader eyebrow={`${site.name} · Website`} title="Website Content" description={`A structured view of ${site.domain}. Publishing controls remain locked until the CMS layer is connected.`} actions={<ActionButton href={`https://${site.domain}`}><Eye className="h-4 w-4" /> Preview website</ActionButton>} />{site.supportMessage && <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75">{site.supportMessage}</div>}<div className="space-y-4">{site.websiteSections.map(({ title, description, connected }) => <AdminCard key={title} className="flex flex-col gap-5 p-5 md:flex-row md:items-center"><span className="text-slate-700"><GripVertical /></span><span className="grid h-12 w-12 place-items-center rounded-xl bg-sky-300/8 text-sky-300"><FilePenLine className="h-5 w-5" /></span><div className="flex-1"><div className="flex items-center gap-3"><h2 className="font-sans text-base font-semibold">{title}</h2><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${connected ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-300/10 text-amber-300"}`}>{connected ? "Live" : "Planned"}</span></div><p className="mt-1 text-sm text-slate-500">{description}</p></div><button disabled className="rounded-xl border border-white/8 px-4 py-2.5 text-xs font-semibold text-slate-500">Editing in Phase 2</button></AdminCard>)}</div></>;
}
