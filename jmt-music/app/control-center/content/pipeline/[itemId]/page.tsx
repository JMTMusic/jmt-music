import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, Music2, UserRound } from "lucide-react";
import { ContentDetailActions } from "@/components/control-center/content-detail-actions";
import { AdminCard, PageHeader, SectionHeading } from "@/components/control-center/ui";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { getPropertyBeatLibrary } from "@/lib/control-center/beat-repository";
import { getPropertyClients } from "@/lib/control-center/client-repository";
import { getDisplayName } from "@/lib/control-center/lead-pipeline";
import { getPropertyProjects } from "@/lib/control-center/project-repository";
import { PROJECT_TYPE_LABELS } from "@/lib/control-center/project-display";
import { getContentItemById } from "@/lib/content/repository";
import { CONTENT_TYPE_LABELS, friendlyContentMessage, PLATFORM_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/content/display";
import type { AssetKey, ContentItemRecord } from "@/lib/content/types";
import type { SitePageProps } from "@/lib/control-center/types";

type ContentDetailPageProps = SitePageProps & { params: Promise<{ itemId: string }> };

const ASSET_CHECKLIST: { key: AssetKey; label: string }[] = [
  { key: "video", label: "Video" },
  { key: "audio", label: "Audio" },
  { key: "artwork", label: "Artwork" },
  { key: "thumbnail", label: "Thumbnail" },
  { key: "caption", label: "Caption" },
  { key: "hashtags", label: "Hashtags" }
];

const ASSET_READY_KEYS: Record<AssetKey, keyof ContentItemRecord> = {
  video: "assetVideoReady",
  audio: "assetAudioReady",
  artwork: "assetArtworkReady",
  thumbnail: "assetThumbnailReady",
  caption: "assetCaptionReady",
  hashtags: "assetHashtagsReady"
};

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

/** One Content Item's full record: metadata, notes, related Beat/Client/Project, pipeline status, and an asset presence checklist. No upload UI — presence only. */
export default async function ContentDetailPage({ searchParams, params }: ContentDetailPageProps) {
  const { site: requestedSite } = await searchParams;
  const { itemId } = await params;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;

  const [itemResult, access, beatsResult, clientsResult, projectsResult] = await Promise.all([
    getContentItemById(site, itemId),
    getControlCenterAccessStatus(),
    getPropertyBeatLibrary(site),
    getPropertyClients(site),
    getPropertyProjects(site)
  ]);

  if (itemResult.status === "not_found") notFound();
  if (itemResult.status === "error") {
    return (
      <>
        <Link href={`/control-center/content/pipeline${siteQuery}`} className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Back to Content Pipeline</Link>
        <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">Content Workspace unavailable:</strong>{friendlyContentMessage(itemResult.message)}</div>
      </>
    );
  }
  const item = itemResult.item;

  const relatedBeat = item.beatId ? beatsResult.beats.find((beat) => beat.id === item.beatId) : null;
  const relatedClient = item.clientId ? clientsResult.clients.find((client) => client.id === item.clientId) : null;
  const relatedProject = item.projectId ? projectsResult.projects.find((project) => project.id === item.projectId) : null;

  return (
    <>
      <Link href={`/control-center/content/pipeline${siteQuery}`} className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Back to Content Pipeline</Link>

      <PageHeader
        eyebrow={`${site.name} · ${STATUS_LABELS[item.status]}`}
        title={item.title}
        description={item.contentType ? CONTENT_TYPE_LABELS[item.contentType] : "No content type set."}
      />

      <AdminCard className="mb-8 p-5">
        <ContentDetailActions item={item} propertyId={site.id} canEdit={access.canCreate} />
        <div className="mt-5 grid gap-3 border-t border-white/6 pt-5 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
          <span>Priority: {PRIORITY_LABELS[item.priority]}</span>
          <span>Scheduled: {formatDateTime(item.scheduledAt) || "Not scheduled"}</span>
          <span>Published: {formatDateTime(item.publishedAt) || "Not published"}</span>
          <span>Created: {formatDateTime(item.createdAt)}</span>
        </div>
        {item.platforms.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/6 pt-4">
            {item.platforms.map((platform) => <span key={platform} className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[10px] text-slate-400">{PLATFORM_LABELS[platform]}</span>)}
          </div>
        )}
        {item.notes && <p className="mt-4 border-t border-white/6 pt-4 text-sm leading-6 text-slate-300">{item.notes}</p>}
      </AdminCard>

      {(relatedBeat || relatedClient || relatedProject) && (
        <section className="mb-8">
          <SectionHeading title="Related Records" description="Other Control Center records this content item is connected to." />
          <div className="grid gap-3 sm:grid-cols-3">
            {relatedBeat && (
              <AdminCard className="p-4">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-sky-300"><Music2 className="h-3.5 w-3.5" />Related Beat</p>
                <p className="mt-2 text-sm font-semibold text-slate-100">{relatedBeat.title}</p>
              </AdminCard>
            )}
            {relatedClient && (
              <AdminCard className="p-4">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-sky-300"><UserRound className="h-3.5 w-3.5" />Related Client</p>
                <p className="mt-2 text-sm font-semibold text-slate-100">{getDisplayName(relatedClient)}</p>
              </AdminCard>
            )}
            {relatedProject && (
              <AdminCard className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300">{PROJECT_TYPE_LABELS[relatedProject.type]}</p>
                <p className="mt-2 text-sm font-semibold text-slate-100">{relatedProject.title}</p>
                <p className="mt-1 text-xs text-slate-500">{relatedProject.phase.replace("_", " ")}</p>
              </AdminCard>
            )}
          </div>
        </section>
      )}

      <section>
        <SectionHeading title="Asset Checklist" description="Presence only — video, audio, artwork, thumbnail, caption, and hashtags. Uploads are not built yet; this reflects readiness, not files." />
        <AdminCard className="p-2">
          {ASSET_CHECKLIST.map(({ key, label }) => {
            const ready = Boolean(item[ASSET_READY_KEYS[key]]);
            return (
              <div key={key} className="flex items-center gap-3 border-b border-white/6 px-3 py-3 last:border-0">
                {ready ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <Circle className="h-4 w-4 shrink-0 text-slate-600" />}
                <span className={`text-sm ${ready ? "text-slate-100" : "text-slate-500"}`}>{label}</span>
                <span className={`ml-auto text-[10px] font-bold uppercase tracking-wider ${ready ? "text-emerald-300" : "text-slate-600"}`}>{ready ? "Ready" : "Not ready"}</span>
              </div>
            );
          })}
        </AdminCard>
      </section>
    </>
  );
}
