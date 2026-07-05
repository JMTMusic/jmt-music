import { BarChart3, ChevronRight, Globe2, Link2, Palette, ShieldAlert } from "lucide-react";
import { AdminCard, PageHeader } from "@/components/control-center/ui";
import { getSiteConfig } from "@/lib/control-center/data";
import type { SitePageProps } from "@/lib/control-center/types";

const settings = [
  ["Website Settings", "Domain, SEO defaults, contact routing, and site preferences.", Globe2],
  ["Analytics Settings", "Google Analytics, Microsoft Clarity, and event health.", BarChart3],
  ["Social Links", "Public profiles and outbound destinations.", Link2],
  ["Brand Settings", "Logo, colors, typography, and reusable brand assets.", Palette]
];

/** Organized settings index for current connections and future platform controls. */
export default async function SettingsPage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  return <><PageHeader eyebrow={`${site.name} · Configuration`} title="Settings" description={`Manage the systems and brand decisions that power ${site.name}. Sensitive values remain server-side.`} />{site.supportMessage && <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75">{site.supportMessage}</div>}<div className="mb-6 grid gap-3 sm:grid-cols-3">{site.brandSettings.map(({ label, value }) => <AdminCard key={label} className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{label}</p><p className="mt-2 text-sm font-medium text-slate-200">{value}</p></AdminCard>)}</div><div className="grid gap-4 lg:grid-cols-2">{settings.map(([title, description, Icon]) => { const SettingsIcon = Icon as typeof Globe2; return <AdminCard key={title as string} className="group flex items-center gap-5 p-5 transition hover:border-sky-300/20"><span className="grid h-12 w-12 place-items-center rounded-xl bg-sky-300/8 text-sky-300"><SettingsIcon className="h-5 w-5" /></span><div><h2 className="font-sans text-sm font-semibold">{title as string}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{description as string}</p></div><ChevronRight className="ml-auto h-5 w-5 text-slate-700 transition group-hover:translate-x-1 group-hover:text-sky-300" /></AdminCard>; })}</div><AdminCard className="mt-8 border-red-400/15 p-6"><div className="flex items-start gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-red-400/8 text-red-300"><ShieldAlert className="h-5 w-5" /></span><div className="flex-1"><h2 className="font-sans text-base font-semibold text-red-100">Danger Zone</h2><p className="mt-1 text-sm text-slate-500">Destructive {site.name} operations will live here with explicit confirmation and audit logging.</p></div><button disabled className="rounded-xl border border-red-400/15 px-4 py-2.5 text-xs font-semibold text-red-300/50">No actions available</button></div></AdminCard></>;
}
