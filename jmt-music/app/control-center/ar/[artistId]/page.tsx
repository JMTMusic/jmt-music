import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Mail } from "lucide-react";
import { AddArtistDialog } from "@/components/control-center/add-artist-dialog";
import { ArDetailActions } from "@/components/control-center/ar-detail-actions";
import { ArOutreachComposer } from "@/components/control-center/ar-outreach-composer";
import { ConvertArtistToSalesDialog } from "@/components/control-center/convert-artist-to-sales-dialog";
import { AdminCard, PageHeader, SectionHeading } from "@/components/control-center/ui";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { getPropertyClients } from "@/lib/control-center/client-repository";
import { getDisplayName } from "@/lib/control-center/lead-pipeline";
import { getArArtistById } from "@/lib/ar/repository";
import { getFitScoreCategoryValues } from "@/lib/ar/pipeline";
import { FIT_SCORE_CATEGORIES } from "@/lib/ar/types";
import { FIT_SCORE_CATEGORY_LABELS, SOURCE_LABELS, STATUS_LABELS, friendlyArMessage } from "@/lib/ar/display";
import type { SitePageProps } from "@/lib/control-center/types";

type ArtistDetailPageProps = SitePageProps & { params: Promise<{ artistId: string }> };

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value));
}

function daysAgo(value: string): number {
  return Math.floor((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24));
}

/** Full A&R Artist record: identity, discovery notes, fit-score breakdown, research, outreach composer, and related Client/Sales links. */
export default async function ArArtistDetailPage({ searchParams, params }: ArtistDetailPageProps) {
  const { site: requestedSite } = await searchParams;
  const { artistId } = await params;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;

  const [lookup, clientsResult, access] = await Promise.all([
    getArArtistById(site, artistId),
    getPropertyClients(site),
    getControlCenterAccessStatus()
  ]);

  if (lookup.status === "not_found") notFound();
  if (lookup.status === "error") {
    return (
      <>
        <Link href={`/control-center/ar${siteQuery}`} className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Back to A&R</Link>
        <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">A&R unavailable:</strong>{friendlyArMessage(lookup.message)}</div>
      </>
    );
  }

  const artist = lookup.artist;
  const relatedClient = artist.relatedClientId ? clientsResult.clients.find((client) => client.id === artist.relatedClientId) : null;
  const categories = getFitScoreCategoryValues(artist);
  const links = [
    artist.profileUrl && { label: "Profile", href: artist.profileUrl },
    artist.musicUrl && { label: "Music", href: artist.musicUrl },
    artist.websiteUrl && { label: "Website", href: artist.websiteUrl }
  ].filter((link): link is { label: string; href: string } => Boolean(link));

  const activity = [
    { label: "Discovered", detail: `${formatDate(artist.createdAt)} (${daysAgo(artist.createdAt)}d ago)` },
    artist.lastActivityAt && { label: "Last activity", detail: formatDate(artist.lastActivityAt) },
    artist.lastReviewedAt && { label: "Last reviewed", detail: formatDate(artist.lastReviewedAt) },
    artist.nextReviewAt && { label: "Next review", detail: formatDate(artist.nextReviewAt) },
    { label: "Last updated", detail: `${daysAgo(artist.updatedAt)}d ago` }
  ].filter(Boolean) as { label: string; detail: string }[];

  return (
    <>
      <Link href={`/control-center/ar${siteQuery}`} className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Back to A&R</Link>

      <PageHeader
        eyebrow={`${site.name} · ${STATUS_LABELS[artist.status]}`}
        title={artist.artistName}
        description={[artist.genre, artist.subgenre, artist.location].filter(Boolean).join(" · ") || "No details yet"}
        actions={
          <>
            <AddArtistDialog propertyId={site.id} artist={artist} clients={clientsResult.clients} disabled={!access.canCreate} />
            {artist.relatedSalesOpportunityId ? (
              <Link href={`/control-center/sales/pipeline/${artist.relatedSalesOpportunityId}${siteQuery}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:border-sky-300/40 hover:bg-sky-300/10">View Sales Opportunity<ArrowUpRight className="h-4 w-4" /></Link>
            ) : (
              artist.status === "ready_for_outreach" && <ConvertArtistToSalesDialog propertyId={site.id} artist={artist} clients={clientsResult.clients} disabled={!access.canCreate} />
            )}
          </>
        }
      />

      <AdminCard className="mb-8 p-5">
        <ArDetailActions artist={artist} propertyId={site.id} canEdit={access.canCreate} />
        <div className="mt-5 grid gap-3 border-t border-white/6 pt-5 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
          {artist.email && <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-500" />{artist.email}</span>}
          {artist.handle && <span>Handle: {artist.handle}</span>}
          {artist.primaryPlatform && <span>Platform: {SOURCE_LABELS[artist.primaryPlatform]}</span>}
          {artist.discoverySource && <span>Discovery source: {SOURCE_LABELS[artist.discoverySource]}</span>}
          {relatedClient && <Link href={`/control-center/growth/leads/${relatedClient.id}${siteQuery}`} className="text-sky-300 hover:underline">Related client: {getDisplayName(relatedClient)}</Link>}
          {artist.followerCount !== null && <span>Followers: {artist.followerCount.toLocaleString()}</span>}
          {artist.monthlyListenerCount !== null && <span>Monthly listeners: {artist.monthlyListenerCount.toLocaleString()}</span>}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/6 pt-4">
          {activity.map((item) => <span key={item.label} className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[10px] text-slate-400">{item.label}: {item.detail}</span>)}
        </div>
      </AdminCard>

      {links.length > 0 && (
        <section className="mb-8">
          <SectionHeading title="Links" />
          <div className="flex flex-wrap gap-3">
            {links.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-semibold text-slate-200 hover:border-sky-300/40">{link.label}<ArrowUpRight className="h-3.5 w-3.5" /></a>
            ))}
          </div>
        </section>
      )}

      {(artist.latestReleaseTitle || artist.latestReleaseDate) && (
        <section className="mb-8">
          <SectionHeading title="Latest Release" />
          <AdminCard className="p-5">
            {artist.latestReleaseTitle && <p className="text-sm font-semibold text-slate-100">{artist.latestReleaseTitle}</p>}
            {artist.latestReleaseDate && <p className="mt-1 text-xs text-slate-500">{formatDate(artist.latestReleaseDate)}</p>}
          </AdminCard>
        </section>
      )}

      {artist.bioSummary && (
        <section className="mb-8">
          <SectionHeading title="Bio Summary" />
          <AdminCard className="p-5"><p className="whitespace-pre-line text-sm leading-6 text-slate-300">{artist.bioSummary}</p></AdminCard>
        </section>
      )}

      {artist.discoveryNotes && (
        <section className="mb-8">
          <SectionHeading title="Discovery Notes" description={artist.discoverySource ? `Found via ${SOURCE_LABELS[artist.discoverySource]}.` : undefined} />
          <AdminCard className="p-5"><p className="whitespace-pre-line text-sm leading-6 text-slate-300">{artist.discoveryNotes}</p></AdminCard>
        </section>
      )}

      <section className="mb-8">
        <SectionHeading title="Fit Score Review" description="Manually scored, 1-5 per category — nothing here is computed from audio or social analysis." />
        <AdminCard className="p-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-semibold text-white">{artist.fitScore !== null ? artist.fitScore.toFixed(1) : "—"}</span>
            {artist.fitScoreOverridden && <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">Manually overridden</span>}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/6 pt-5 sm:grid-cols-4">
            {FIT_SCORE_CATEGORIES.map((category) => (
              <div key={category}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{FIT_SCORE_CATEGORY_LABELS[category]}</p>
                <p className="text-sm font-semibold text-slate-200">{categories[category] ?? "Not scored"}</p>
              </div>
            ))}
          </div>
          {artist.fitSummary && <p className="mt-5 border-t border-white/6 pt-5 text-sm leading-6 text-slate-300">{artist.fitSummary}</p>}
          {(artist.strengths || artist.opportunities || artist.concerns) && (
            <div className="mt-5 grid gap-4 border-t border-white/6 pt-5 sm:grid-cols-3">
              {artist.strengths && <div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Strengths</p><p className="mt-1.5 text-xs leading-5 text-slate-400">{artist.strengths}</p></div>}
              {artist.opportunities && <div><p className="text-[10px] font-bold uppercase tracking-wider text-sky-300">Opportunities</p><p className="mt-1.5 text-xs leading-5 text-slate-400">{artist.opportunities}</p></div>}
              {artist.concerns && <div><p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Concerns</p><p className="mt-1.5 text-xs leading-5 text-slate-400">{artist.concerns}</p></div>}
            </div>
          )}
        </AdminCard>
      </section>

      <section className="mb-8">
        <SectionHeading title="Outreach" description="Stored, never sent automatically — Copy Draft to send it yourself." />
        <AdminCard className="p-5">
          {artist.outreachRecommendation && <p className="mb-5 text-sm leading-6 text-sky-200"><strong className="font-semibold">Recommendation:</strong> {artist.outreachRecommendation}</p>}
          <ArOutreachComposer artist={artist} propertyId={site.id} canEdit={access.canCreate} />
        </AdminCard>
      </section>
    </>
  );
}
