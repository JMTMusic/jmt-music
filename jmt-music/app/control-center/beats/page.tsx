import Image from "next/image";
import { Calendar, Filter, KeyRound, Music2, Plus, Search, SlidersHorizontal } from "lucide-react";
import { ActionButton, AdminCard, EmptyState, LoadingState, PageHeader } from "@/components/control-center/ui";
import { getSiteConfig } from "@/lib/control-center/data";
import type { SitePageProps } from "@/lib/control-center/types";

/** Read-only Phase 1 beat catalog with production-ready filtering controls and states. */
export default async function BeatLibraryPage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);

  return (
    <>
      <PageHeader eyebrow={`${site.name} · Catalog`} title={site.catalogTitle} description={`${site.catalogDescription} Uploading and editing arrive in a later phase.`} actions={<ActionButton primary><Plus className="h-4 w-4" /> {site.id === "jmt-music" ? "Add Beat" : "Add Performance"}</ActionButton>} />
      {site.supportMessage && <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75">{site.supportMessage}</div>}
      <AdminCard className="mb-6 flex flex-col gap-3 p-3 md:flex-row">
        <label className="flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-white/8 bg-black/20 px-4 text-slate-500"><Search className="h-4 w-4" /><input className="w-full border-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" placeholder="Search beats by title, genre, BPM, or key" disabled /></label>
        <button className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/8 px-4 text-sm text-slate-300"><Filter className="h-4 w-4" /> All genres</button>
        <button className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/8 px-4 text-sm text-slate-300"><SlidersHorizontal className="h-4 w-4" /> Newest first</button>
      </AdminCard>
      {site.catalog.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{site.catalog.map((beat) => <AdminCard key={beat.id} className="group overflow-hidden transition hover:-translate-y-1 hover:border-sky-300/25"><div className="relative aspect-square overflow-hidden"><Image src={beat.cover} alt={`${beat.title} cover art`} fill className="object-cover transition duration-500 group-hover:scale-[1.03]" />{beat.featured && <span className="absolute left-4 top-4 rounded-full border border-sky-200/20 bg-sky-300/90 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-950">Featured</span>}<span className="absolute bottom-4 right-4 grid h-11 w-11 place-items-center rounded-full bg-slate-950/80 text-sky-300 backdrop-blur"><Music2 className="h-5 w-5" /></span></div><div className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-lg font-semibold tracking-tight">{beat.title}</p><p className="mt-1 text-xs text-sky-300">{beat.genre}</p></div><span className="text-[10px] text-slate-500">{beat.releaseDate}</span></div><div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/7 pt-4 text-xs"><span className="text-slate-500"><strong className="block text-slate-200">{beat.bpm}</strong>BPM</span><span className="text-slate-500"><strong className="block text-slate-200">{beat.musicalKey}</strong>Key</span><span className="text-slate-500"><strong className="block text-slate-200">{beat.featured ? "Yes" : "No"}</strong>Featured</span></div></div></AdminCard>)}</div> : <EmptyState title="Performance library prepared" message="Jonathan Tripp repertoire, performance media, and lesson resources can plug into this module after the site connection is complete." />}
      <details className="mt-8 text-xs text-slate-600"><summary>Phase 1 component states</summary><div className="mt-4 grid gap-4 lg:grid-cols-2"><EmptyState title="No beats found" message="Adjust the search or filters to see more of the catalog." /><AdminCard><LoadingState label="Loading beat library" /></AdminCard></div></details>
    </>
  );
}
