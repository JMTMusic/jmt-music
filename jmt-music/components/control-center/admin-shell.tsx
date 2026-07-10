"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Building2, FileText, Globe2, LayoutDashboard, ListChecks, Menu, Music2, Search, Settings, Sprout, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { normalizeSiteId, siteRegistry } from "@/lib/control-center/site-registry";
import type { NavigationItem } from "@/lib/control-center/types";

const navigation: NavigationItem[] = [
  { label: "Dashboard", href: "/control-center", icon: LayoutDashboard },
  { label: "Projects", href: "/control-center/projects", icon: ListChecks },
  { label: "Beat Library", href: "/control-center/beats", icon: Music2 },
  { label: "Website", href: "/control-center/website", icon: Globe2 },
  { label: "Analytics", href: "/control-center/analytics", icon: BarChart3 },
  { label: "Content", href: "/control-center/content", icon: FileText },
  { label: "Growth Engine", href: "/control-center/growth", icon: Sprout },
  { label: "Settings", href: "/control-center/settings", icon: Settings }
];

/** Responsive application shell shared by every protected Control Center screen. */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const siteId = normalizeSiteId(searchParams.get("site"));
  const selectedSite = siteRegistry.find((site) => site.id === siteId)!;
  const siteQuery = siteId === "jmt-music" ? "" : `?site=${siteId}`;

  const selectSite = (nextSiteId: string) => {
    const normalized = normalizeSiteId(nextSiteId);
    router.replace(normalized === "jmt-music" ? pathname : `${pathname}?site=${normalized}`);
  };

  return (
    <div className="min-h-screen bg-[#05080d] font-sans text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_70%_-10%,rgba(125,211,252,.12),transparent_35%)]" />
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-white/8 bg-[#070b11]/95 p-5 backdrop-blur-2xl transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-14 items-center justify-between">
          <Link href={`/control-center${siteQuery}`} className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <span className="grid h-10 w-10 place-items-center border border-sky-300/60 font-serif text-xs text-sky-300">JMT</span>
            <span><strong className="block text-sm tracking-[.12em]">CONTROL CENTER</strong><small className="text-[10px] text-slate-500">Property operations</small></span>
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button>
        </div>
        <nav className="mt-10 space-y-1" aria-label="Control Center">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = href === "/control-center" ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={`${href}${siteQuery}`} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition ${active ? "bg-sky-300/12 text-sky-200 shadow-[inset_0_0_0_1px_rgba(125,211,252,.12)]" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"}`}><Icon className="h-[18px] w-[18px]" />{label}</Link>;
          })}
        </nav>
        <div className="absolute inset-x-5 bottom-5 rounded-xl border border-white/8 bg-white/[0.025] p-4"><div className={`flex items-center gap-2 text-xs font-medium ${selectedSite.connected ? "text-emerald-300" : "text-amber-300"}`}><span className={`h-2 w-2 rounded-full ${selectedSite.connected ? "bg-emerald-400" : "bg-amber-400"}`} />{selectedSite.connected ? "Production connected" : "Connection planned"}</div><p className="mt-2 truncate text-[11px] text-slate-500">{selectedSite.domain}</p></div>
      </aside>
      {open && <button className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation overlay" />}
      <div className="relative lg:pl-72">
        <div className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-white/7 bg-[#05080d]/80 px-5 backdrop-blur-xl md:px-8">
          <button className="rounded-lg border border-white/10 p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
          <label className="relative flex min-w-0 items-center gap-3 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2">
            <Building2 className="h-4 w-4 shrink-0 text-sky-300" />
            <span className="hidden min-w-0 sm:block"><span className="block truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">Property</span><span className="block truncate text-xs font-semibold text-white">{selectedSite.name}</span></span>
            <select aria-label="Managed property" value={siteId} onChange={(event) => selectSite(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
              {siteRegistry.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>
          </label>
          <div className="hidden max-w-sm flex-1 items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-3.5 py-2.5 text-slate-500 md:flex"><Search className="h-4 w-4" /><span className="text-xs">Search Control Center</span><kbd className="ml-auto text-[10px]">⌘ K</kbd></div>
          <div className="ml-auto flex items-center gap-3"><div className="text-right"><p className="text-xs font-semibold text-white">Jonathan Tripp</p><p className="text-[10px] text-slate-500">Administrator</p></div><div className="grid h-10 w-10 place-items-center rounded-full border border-sky-300/25 bg-sky-300/10 text-xs font-bold text-sky-200">JT</div></div>
        </div>
        <main className="mx-auto max-w-[1540px] p-5 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
