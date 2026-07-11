import { AddPlayDialog } from "@/components/control-center/add-play-dialog";
import { PlaybookBrowser } from "@/components/control-center/playbook-browser";
import { EmptyState, PageHeader } from "@/components/control-center/ui";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getPropertyPlays } from "@/lib/control-center/playbook-repository";
import { getSiteConfig } from "@/lib/control-center/data";
import { withPlayNumbers } from "@/lib/control-center/playbook-pipeline";
import type { SitePageProps } from "@/lib/control-center/types";

/**
 * The Communication Playbook: documents how JMT Music actually communicates — purpose,
 * context, and internal notes behind each Play, not a clipboard of copy/paste snippets.
 * No AI generation, no fabricated starter content — an empty property shows a polished
 * empty state, not fake Plays presented as proven communication.
 */
export default async function PlaybookPage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;
  const [result, access] = await Promise.all([getPropertyPlays(site), getControlCenterAccessStatus()]);
  const numbered = withPlayNumbers(result.plays);

  return (
    <>
      <PageHeader
        eyebrow={`${site.name} · Growth Engine`}
        title="Communication Playbook"
        description="How JMT Music actually communicates — proven, refined outreach, discovery, onboarding, production, delivery, review, and follow-up messages. Not AI-generated, not generic."
        actions={<AddPlayDialog propertyId={site.id} disabled={!access.canCreate} />}
      />
      {result.status === "error" && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">Playbook unavailable:</strong>{result.detail}</div>
      )}
      {result.status === "empty" ? (
        <EmptyState title="No Plays yet" message="Add the first Play — start with how you introduce JMT Music to a new artist. It'll be organized by category automatically." />
      ) : (
        <PlaybookBrowser plays={numbered} propertyId={site.id} siteQuery={siteQuery} />
      )}
    </>
  );
}
