"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ExternalLink, LoaderCircle, Search } from "lucide-react";
import { AdminCard, EmptyState } from "@/components/control-center/ui";
import { ConvertArtistToSalesDialog } from "@/components/control-center/convert-artist-to-sales-dialog";
import { updateArArtistStatusAction } from "@/app/control-center/ar/actions";
import { FIT_SCORE_CATEGORIES } from "@/lib/ar/types";
import { FIT_SCORE_CATEGORY_LABELS, PRIORITY_LABELS, SOURCE_LABELS } from "@/lib/ar/display";
import { getFitScoreCategoryValues } from "@/lib/ar/pipeline";
import type { ArArtistRecord } from "@/lib/ar/types";
import type { Client, SiteId } from "@/lib/control-center/types";

type SortMode = "fit_score" | "newest";

function MarkContactedButton({ propertyId, artistId }: { propertyId: SiteId; artistId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => { await updateArArtistStatusAction({ property: propertyId, id: artistId, status: "contacted" }); })}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:border-sky-300/40 hover:bg-sky-300/10 disabled:opacity-50"
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      Mark Contacted
    </button>
  );
}

/** Ready for Outreach: the richest view — full fit-score breakdown, research, drafted outreach, and the Convert to Sales action. */
export function ArOutreachList({ artists, siteQuery, propertyId, clients, canEdit }: { artists: ArArtistRecord[]; siteQuery: string; propertyId: SiteId; clients: Client[]; canEdit: boolean }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("fit_score");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const results = artists.filter((artist) => !query || artist.artistName.toLowerCase().includes(query) || (artist.genre || "").toLowerCase().includes(query));
    const list = [...results];
    if (sort === "newest") return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.sort((a, b) => (b.fitScore ?? -1) - (a.fitScore ?? -1));
  }, [artists, search, sort]);

  const selectClass = "min-h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-xs text-slate-200 outline-none focus:border-sky-300/60";

  return (
    <div>
      <AdminCard className="mb-6 flex flex-col gap-3 p-3 md:flex-row md:flex-wrap md:items-center">
        <label className="flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-white/8 bg-black/20 px-4 text-slate-500">
          <Search className="h-4 w-4" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full border-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" placeholder="Search by artist or genre" />
        </label>
        <select aria-label="Sort by" value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className={selectClass}>
          <option value="fit_score">Sort: Fit score</option>
          <option value="newest">Sort: Newest</option>
        </select>
      </AdminCard>

      {filtered.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {filtered.map((artist) => {
            const categories = getFitScoreCategoryValues(artist);
            const links = [
              artist.profileUrl && { label: "Profile", href: artist.profileUrl },
              artist.musicUrl && { label: "Music", href: artist.musicUrl },
              artist.websiteUrl && { label: "Website", href: artist.websiteUrl }
            ].filter((link): link is { label: string; href: string } => Boolean(link));

            return (
              <AdminCard key={artist.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link href={`/control-center/ar/${artist.id}${siteQuery}`} className="truncate text-base font-semibold text-white hover:text-sky-200">{artist.artistName}</Link>
                    <p className="mt-1 truncate text-xs text-slate-500">{[artist.genre, artist.primaryPlatform ? SOURCE_LABELS[artist.primaryPlatform] : null].filter(Boolean).join(" · ") || "No details yet"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[10px] font-semibold text-slate-300">{PRIORITY_LABELS[artist.priority]}</span>
                    {artist.fitScore !== null && <span className="rounded-full border border-sky-300/20 bg-sky-300/8 px-2.5 py-1 text-[10px] font-bold text-sky-200">Fit {artist.fitScore.toFixed(1)}{artist.fitScoreOverridden ? " *" : ""}</span>}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 border-y border-white/6 py-4 sm:grid-cols-4">
                  {FIT_SCORE_CATEGORIES.map((category) => (
                    <div key={category}>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{FIT_SCORE_CATEGORY_LABELS[category]}</p>
                      <p className="text-xs font-semibold text-slate-200">{categories[category] ?? "—"}</p>
                    </div>
                  ))}
                </div>

                {artist.fitSummary && <p className="mt-4 text-xs leading-5 text-slate-400">{artist.fitSummary}</p>}
                {artist.outreachRecommendation && <p className="mt-3 text-xs leading-5 text-sky-200"><strong className="font-semibold">Recommendation:</strong> {artist.outreachRecommendation}</p>}
                {artist.outreachDraft && (
                  <div className="mt-3 rounded-xl border border-white/8 bg-black/20 p-3">
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Outreach Draft</p>
                    <p className="whitespace-pre-wrap text-xs leading-5 text-slate-300">{artist.outreachDraft}</p>
                  </div>
                )}

                {links.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {links.map((link) => (
                      <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-300 hover:text-sky-200">{link.label}<ExternalLink className="h-3 w-3" /></a>
                    ))}
                  </div>
                )}

                {canEdit && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <ConvertArtistToSalesDialog propertyId={propertyId} artist={artist} clients={clients} />
                    <MarkContactedButton propertyId={propertyId} artistId={artist.id} />
                  </div>
                )}
              </AdminCard>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No matching artists" message="Try a different search term." />
      )}
    </div>
  );
}
