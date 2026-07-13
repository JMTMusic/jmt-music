import { Binoculars, Clock, Send, Sparkles, Star, Telescope, UserCheck, Users } from "lucide-react";
import { AddArtistDialog } from "@/components/control-center/add-artist-dialog";
import { AdminCard, EmptyState, PageHeader, SectionHeading } from "@/components/control-center/ui";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { listArArtists } from "@/lib/ar/repository";
import { computeArOverviewCounts, getArtistNextAction, selectTodaysArFocus } from "@/lib/ar/pipeline";
import { friendlyArMessage, PRIORITY_LABELS, SOURCE_LABELS, STATUS_LABELS } from "@/lib/ar/display";
import type { ArArtistRecord } from "@/lib/ar/types";
import type { SitePageProps } from "@/lib/control-center/types";

function FocusRow({ artist, siteQuery, now }: { artist: ArArtistRecord; siteQuery: string; now: Date }) {
  return (
    <a href={`/control-center/ar/${artist.id}${siteQuery}`} className="flex items-center gap-4 rounded-xl p-3 transition hover:bg-white/[0.035]">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-300/8 text-sky-300"><Clock className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-100">{artist.artistName}</p>
        <p className="truncate text-xs text-slate-500">{getArtistNextAction(artist, now)}.</p>
      </div>
      <span className="ml-auto shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">{STATUS_LABELS[artist.status]}</span>
    </a>
  );
}

function ArtistRow({ artist, siteQuery }: { artist: ArArtistRecord; siteQuery: string }) {
  return (
    <a href={`/control-center/ar/${artist.id}${siteQuery}`} className="flex items-center gap-4 rounded-xl p-3 transition hover:bg-white/[0.035]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-100">{artist.artistName}</p>
        <p className="truncate text-xs text-slate-500">{[artist.genre, artist.primaryPlatform ? SOURCE_LABELS[artist.primaryPlatform] : null].filter(Boolean).join(" · ") || "No details yet"}</p>
      </div>
      {artist.fitScore !== null && <span className="ml-auto shrink-0 rounded-full border border-sky-300/20 bg-sky-300/8 px-2.5 py-1 text-[10px] font-bold text-sky-200">{artist.fitScore.toFixed(1)}</span>}
    </a>
  );
}

/** A&R Overview: today's actionable research work plus the pipeline's headline numbers. */
export default async function ArOverviewPage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;
  const now = new Date();

  const [result, access] = await Promise.all([listArArtists(site), getControlCenterAccessStatus()]);
  const artists = result.artists;
  const focus = selectTodaysArFocus(artists, now);
  const counts = computeArOverviewCounts(artists, now);

  const highPriorityWatchlist = artists.filter((artist) => artist.status === "watchlist" && artist.priority === "high");
  const recentlyDiscovered = artists
    .filter((artist) => artist.status === "discovered" || artist.status === "reviewing")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const statCards = [
    { label: "Ready for Outreach", value: String(counts.readyForOutreach), icon: Send },
    { label: "High-Priority Watchlist", value: String(counts.highPriorityWatchlist), icon: Star },
    { label: "Contacted", value: String(counts.contacted), icon: UserCheck },
    { label: "Converted to Sales", value: String(counts.convertedToSales), icon: Users },
    { label: "Average Fit Score", value: counts.averageFitScore !== null ? counts.averageFitScore.toFixed(1) : "—", icon: Sparkles }
  ];

  return (
    <>
      <PageHeader
        eyebrow={`${site.name} · A&R`}
        title="A&R Overview"
        description="Artists being researched, watched, and considered — before any outreach or paid engagement exists."
        actions={<AddArtistDialog propertyId={site.id} disabled={!access.canCreate} />}
      />

      {result.status === "error" && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">A&R unavailable:</strong>{friendlyArMessage(result.detail)}</div>
      )}
      {!access.canCreate && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">Add Artist disabled:</strong>{access.detail}</div>
      )}

      {result.status === "empty" ? (
        <EmptyState title="No artists yet" message="Add the first artist you're researching to start tracking reviews, fit scores, and outreach here." />
      ) : (
        <>
          <section>
            <SectionHeading title="Today's A&R Focus" description="Reviews due, watchlist revisits, and high-priority outreach — nothing else." />
            <AdminCard className="p-2">
              {focus.length ? focus.map((artist) => <FocusRow key={artist.id} artist={artist} siteQuery={siteQuery} now={now} />) : <p className="p-6 text-sm text-slate-500">Nothing due today.</p>}
            </AdminCard>
          </section>

          <section className="mt-10">
            <SectionHeading title="Pipeline Snapshot" description="Where research stands right now." />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {statCards.map(({ label, value, icon: Icon }) => (
                <AdminCard key={label} className="p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-300/10 text-sky-300"><Icon className="h-5 w-5" /></span>
                  <p className="mt-6 text-3xl font-semibold tracking-tight text-white">{value}</p>
                  <p className="mt-1 text-xs font-medium text-slate-300">{label}</p>
                </AdminCard>
              ))}
            </div>
          </section>

          <section className="mt-10 grid gap-8 lg:grid-cols-2">
            <div>
              <SectionHeading title="High-Priority Watchlist" description={`${PRIORITY_LABELS.high} priority artists being watched.`} />
              <AdminCard className="p-2">
                {highPriorityWatchlist.length ? highPriorityWatchlist.map((artist) => <ArtistRow key={artist.id} artist={artist} siteQuery={siteQuery} />) : <p className="p-6 text-sm text-slate-500">No high-priority watchlist artists.</p>}
              </AdminCard>
            </div>
            <div>
              <SectionHeading title="Recently Discovered" description="Newest artists still being reviewed." />
              <AdminCard className="p-2">
                {recentlyDiscovered.length ? recentlyDiscovered.map((artist) => <ArtistRow key={artist.id} artist={artist} siteQuery={siteQuery} />) : <p className="p-6 text-sm text-slate-500">Nothing new to review.</p>}
              </AdminCard>
            </div>
          </section>

          <section className="mt-10 grid gap-4 sm:grid-cols-3">
            <a href={`/control-center/ar/discovery${siteQuery}`} className="group flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/[0.035] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-sky-300/30 sm:flex-row sm:items-center sm:gap-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sky-300/15 bg-sky-300/8 text-sky-300"><Telescope className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">Discovery Inbox</p><p className="mt-1 text-xs leading-5 text-slate-500">Everything not yet reviewed.</p></div>
            </a>
            <a href={`/control-center/ar/watchlist${siteQuery}`} className="group flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/[0.035] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-sky-300/30 sm:flex-row sm:items-center sm:gap-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sky-300/15 bg-sky-300/8 text-sky-300"><Binoculars className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">Watchlist</p><p className="mt-1 text-xs leading-5 text-slate-500">Artists being watched over time.</p></div>
            </a>
            <a href={`/control-center/ar/outreach${siteQuery}`} className="group flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/[0.035] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-sky-300/30 sm:flex-row sm:items-center sm:gap-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sky-300/15 bg-sky-300/8 text-sky-300"><Send className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">Ready for Outreach</p><p className="mt-1 text-xs leading-5 text-slate-500">Qualified, waiting on you.</p></div>
            </a>
          </section>
        </>
      )}
    </>
  );
}
