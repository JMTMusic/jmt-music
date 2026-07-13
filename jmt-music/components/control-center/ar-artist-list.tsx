"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarClock, Check, LoaderCircle, Search, X } from "lucide-react";
import { AdminCard, EmptyState } from "@/components/control-center/ui";
import { updateArArtistStatusAction } from "@/app/control-center/ar/actions";
import { AR_PRIORITIES, AR_SOURCES } from "@/lib/ar/types";
import { PRIORITY_LABELS, SOURCE_LABELS } from "@/lib/ar/display";
import type { ArArtistRecord, ArStatus } from "@/lib/ar/types";

type ListVariant = "discovery" | "watchlist" | "outreach";
type SortMode = "newest" | "fit_score" | "next_review" | "recent_activity";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "fit_score", label: "Fit score" },
  { value: "next_review", label: "Next review" },
  { value: "recent_activity", label: "Recent activity" }
];

function sortArtists(artists: ArArtistRecord[], sort: SortMode): ArArtistRecord[] {
  const list = [...artists];
  if (sort === "fit_score") return list.sort((a, b) => (b.fitScore ?? -1) - (a.fitScore ?? -1));
  if (sort === "recent_activity") {
    return list.sort((a, b) => {
      if (!a.lastActivityAt && !b.lastActivityAt) return 0;
      if (!a.lastActivityAt) return 1;
      if (!b.lastActivityAt) return -1;
      return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
    });
  }
  if (sort === "next_review") {
    return list.sort((a, b) => {
      if (!a.nextReviewAt && !b.nextReviewAt) return 0;
      if (!a.nextReviewAt) return 1;
      if (!b.nextReviewAt) return -1;
      return new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime();
    });
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(new Date(value));
}

function QuickActionButton({
  propertyId,
  artistId,
  status,
  label,
  icon: Icon,
  tone = "default"
}: {
  propertyId: string;
  artistId: string;
  status: ArStatus;
  label: string;
  icon: typeof Check;
  tone?: "default" | "danger";
}) {
  const [pending, startTransition] = useTransition();
  const toneClass = tone === "danger" ? "border-red-400/20 text-red-300 hover:bg-red-400/10" : "border-white/10 text-slate-200 hover:border-sky-300/40 hover:bg-sky-300/10";
  return (
    <button
      type="button"
      disabled={pending}
      onClick={(event) => {
        event.preventDefault();
        startTransition(async () => {
          await updateArArtistStatusAction({ property: propertyId, id: artistId, status });
        });
      }}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-semibold transition disabled:opacity-50 ${toneClass}`}
    >
      {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

/**
 * Shared searchable/filterable/sortable artist list for Discovery Inbox, Watchlist, and
 * Ready for Outreach — the three views differ only in which artists are passed in, which
 * quick-action moves status forward, and which extra signal (fit score vs. next review vs.
 * outreach readiness) is surfaced per row.
 */
export function ArArtistList({ artists, siteQuery, propertyId, variant, canEdit }: { artists: ArArtistRecord[]; siteQuery: string; propertyId: string; variant: ListVariant; canEdit: boolean }) {
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sort, setSort] = useState<SortMode>(variant === "watchlist" ? "next_review" : variant === "outreach" ? "fit_score" : "newest");

  const selectClass = "min-h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-xs text-slate-200 outline-none focus:border-sky-300/60";
  const genres = useMemo(() => Array.from(new Set(artists.map((artist) => artist.genre).filter((genre): genre is string => Boolean(genre)))).sort(), [artists]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const results = artists.filter((artist) => {
      if (platformFilter && artist.primaryPlatform !== platformFilter && artist.discoverySource !== platformFilter) return false;
      if (genreFilter && artist.genre !== genreFilter) return false;
      if (priorityFilter && artist.priority !== priorityFilter) return false;
      if (query && !artist.artistName.toLowerCase().includes(query) && !(artist.genre || "").toLowerCase().includes(query)) return false;
      return true;
    });
    return sortArtists(results, sort);
  }, [artists, search, platformFilter, genreFilter, priorityFilter, sort]);

  return (
    <div>
      <AdminCard className="mb-6 flex flex-col gap-3 p-3 md:flex-row md:flex-wrap md:items-center">
        <label className="flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-white/8 bg-black/20 px-4 text-slate-500">
          <Search className="h-4 w-4" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full border-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" placeholder="Search by artist or genre" />
        </label>
        <select aria-label="Filter by platform or source" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)} className={selectClass}>
          <option value="">All platforms/sources</option>
          {AR_SOURCES.map((source) => <option key={source} value={source}>{SOURCE_LABELS[source]}</option>)}
        </select>
        <select aria-label="Filter by genre" value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)} className={selectClass}>
          <option value="">All genres</option>
          {genres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
        </select>
        <select aria-label="Filter by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className={selectClass}>
          <option value="">All priorities</option>
          {AR_PRIORITIES.map((priority) => <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>)}
        </select>
        <select aria-label="Sort by" value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className={selectClass}>
          {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>Sort: {option.label}</option>)}
        </select>
      </AdminCard>

      {filtered.length ? (
        <AdminCard className="p-2">
          {filtered.map((artist) => {
            const nextReviewDate = formatDate(artist.nextReviewAt);
            const lastActivityDate = formatDate(artist.lastActivityAt);
            return (
              <div key={artist.id} className="flex flex-wrap items-center gap-4 rounded-xl p-3 transition hover:bg-white/[0.035]">
                <Link href={`/control-center/ar/${artist.id}${siteQuery}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-100">{artist.artistName}</p>
                  <p className="truncate text-xs text-slate-500">
                    {[artist.genre, artist.primaryPlatform ? SOURCE_LABELS[artist.primaryPlatform] : artist.discoverySource ? SOURCE_LABELS[artist.discoverySource] : null].filter(Boolean).join(" · ") || "No details yet"}
                    {variant === "outreach" && artist.outreachRecommendation ? ` · ${artist.outreachRecommendation}` : ""}
                  </p>
                </Link>
                <span className="shrink-0 rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[10px] font-semibold text-slate-300">{PRIORITY_LABELS[artist.priority]}</span>
                {artist.fitScore !== null && <span className="shrink-0 rounded-full border border-sky-300/20 bg-sky-300/8 px-2.5 py-1 text-[10px] font-bold text-sky-200">Fit {artist.fitScore.toFixed(1)}</span>}
                {variant === "watchlist" && nextReviewDate && <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-sky-200"><CalendarClock className="h-3.5 w-3.5" />{nextReviewDate}</span>}
                {variant === "discovery" && lastActivityDate && <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-slate-500"><CalendarClock className="h-3.5 w-3.5" />{lastActivityDate}</span>}
                {canEdit && (
                  <div className="ml-auto flex shrink-0 flex-wrap gap-2">
                    {variant === "discovery" && (
                      <>
                        {artist.status === "discovered" && <QuickActionButton propertyId={propertyId} artistId={artist.id} status="reviewing" label="Begin Review" icon={Check} />}
                        <QuickActionButton propertyId={propertyId} artistId={artist.id} status="watchlist" label="Add to Watchlist" icon={Check} />
                        <QuickActionButton propertyId={propertyId} artistId={artist.id} status="dismissed" label="Dismiss" icon={X} tone="danger" />
                      </>
                    )}
                    {variant === "watchlist" && (
                      <QuickActionButton propertyId={propertyId} artistId={artist.id} status="ready_for_outreach" label="Ready for Outreach" icon={Check} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </AdminCard>
      ) : (
        <EmptyState title="No matching artists" message="Try a different search term or clear a filter." />
      )}
    </div>
  );
}
