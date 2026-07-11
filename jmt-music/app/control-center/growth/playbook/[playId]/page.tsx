import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { PlayDetailActions } from "@/components/control-center/play-detail-actions";
import { PlayVersionHistory } from "@/components/control-center/play-version-history";
import { AdminCard, PageHeader, SectionHeading } from "@/components/control-center/ui";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getPlayVersionHistory, getPropertyPlays } from "@/lib/control-center/playbook-repository";
import { getSiteConfig } from "@/lib/control-center/data";
import { CATEGORY_LABELS } from "@/lib/control-center/playbook-display";
import { withPlayNumbers } from "@/lib/control-center/playbook-pipeline";
import type { SitePageProps } from "@/lib/control-center/types";

type PlayDetailPageProps = SitePageProps & { params: Promise<{ playId: string }> };

/**
 * One Play's full record: purpose, best used for, variables, message, internal notes,
 * version, and the five actions (Copy Message, Duplicate, Archive, Favorite, Edit).
 */
export default async function PlayDetailPage({ searchParams, params }: PlayDetailPageProps) {
  const { site: requestedSite } = await searchParams;
  const { playId } = await params;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;

  const [playsResult, access] = await Promise.all([getPropertyPlays(site, true), getControlCenterAccessStatus()]);
  const numbered = withPlayNumbers(playsResult.plays);
  const play = numbered.find((candidate) => candidate.id === playId);
  if (!play) notFound();

  const versionsResult = await getPlayVersionHistory(site, playId);

  return (
    <>
      <Link href={`/control-center/growth/playbook${siteQuery}`} className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Back to Playbook</Link>

      <PageHeader
        eyebrow={`${site.name} · ${play.playNumber} · ${CATEGORY_LABELS[play.category]}`}
        title={play.title}
        description={play.purpose || "No purpose noted."}
      />

      <AdminCard className="mb-8 p-5">
        <PlayDetailActions play={play} propertyId={site.id} canEdit={access.canCreate} />
      </AdminCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <SectionHeading title="Message" description="This is the only content Copy Message ever copies." />
            <AdminCard className="p-5">
              <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap font-mono text-[13px] leading-6 text-slate-200">{play.messageBody}</pre>
            </AdminCard>
          </section>

          {play.internalNotes && (
            <section>
              <SectionHeading title="Internal Notes" description="Never copied to clipboard." />
              <AdminCard className="p-5">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{play.internalNotes}</p>
              </AdminCard>
            </section>
          )}

          {versionsResult.versions.length > 0 && (
            <section>
              <SectionHeading title="Version History" description="Read-only. Every prior version is preserved so refinements over time aren't lost." />
              <PlayVersionHistory versions={versionsResult.versions} />
            </section>
          )}
        </div>

        <div className="space-y-6">
          <AdminCard className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Best Used For</p>
            {play.bestUsedFor.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">{play.bestUsedFor.map((context) => <span key={context} className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[10px] text-slate-400">{context}</span>)}</div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Not specified.</p>
            )}
          </AdminCard>

          <AdminCard className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Variables</p>
            {play.variables.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">{play.variables.map((variable) => <span key={variable} className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 font-mono text-[10px] text-sky-200">{"{{" + variable + "}}"}</span>)}</div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">None.</p>
            )}
          </AdminCard>

          <AdminCard className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Version</p>
            <p className="mt-2 text-sm text-slate-300">v{play.versionNumber}</p>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Updated</p>
            <p className="mt-2 text-sm text-slate-300">{new Date(play.updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</p>
          </AdminCard>
        </div>
      </div>
    </>
  );
}
