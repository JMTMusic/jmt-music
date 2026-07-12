import { AddContentItemDialog } from "@/components/control-center/add-content-item-dialog";
import { ContentItemCard } from "@/components/control-center/content-item-card";
import kanbanStyles from "@/components/control-center/kanban-board.module.css";
import { EmptyState, PageHeader } from "@/components/control-center/ui";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { getPropertyBeatLibrary } from "@/lib/control-center/beat-repository";
import { getPropertyClients } from "@/lib/control-center/client-repository";
import { getDisplayName } from "@/lib/control-center/lead-pipeline";
import { getPropertyProjects } from "@/lib/control-center/project-repository";
import { listContentItems } from "@/lib/content/repository";
import { selectByStatus } from "@/lib/content/pipeline";
import { friendlyContentMessage, STATUS_LABELS, STATUS_ORDER } from "@/lib/content/display";
import type { SitePageProps } from "@/lib/control-center/types";

/** Content Pipeline: the full 8-stage Kanban board — every content item, Idea through Archived. */
export default async function ContentPipelinePage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;

  const [itemsResult, access, beatsResult, clientsResult, projectsResult] = await Promise.all([
    listContentItems(site),
    getControlCenterAccessStatus(),
    getPropertyBeatLibrary(site),
    getPropertyClients(site),
    getPropertyProjects(site)
  ]);

  const items = itemsResult.items;
  const beatTitleById = Object.fromEntries(beatsResult.beats.map((beat) => [beat.id, beat.title]));
  const clientLabelById = Object.fromEntries(clientsResult.clients.map((client) => [client.id, getDisplayName(client)]));
  const beatOptions = beatsResult.beats.map((beat) => ({ id: beat.id, title: beat.title }));
  const clientOptions = clientsResult.clients.map((client) => ({ id: client.id, label: getDisplayName(client) }));
  const projectOptions = projectsResult.projects.map((project) => ({ id: project.id, title: project.title, type: project.type }));

  return (
    <>
      <PageHeader
        eyebrow={`${site.name} · Content Workspace`}
        title="Content Pipeline"
        description="Every content item, from first idea through archive, grouped by stage."
        actions={<AddContentItemDialog propertyId={site.id} beats={beatOptions} clients={clientOptions} projects={projectOptions} disabled={!access.canCreate} />}
      />

      {itemsResult.status === "error" && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">Content Workspace unavailable:</strong>{friendlyContentMessage(itemsResult.detail)}</div>
      )}
      {!access.canCreate && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">New Content Item disabled:</strong>{access.detail}</div>
      )}

      {itemsResult.status === "empty" ? (
        <EmptyState title="No content items yet" message="Create your first content item to start tracking it through the pipeline — from idea to published." />
      ) : (
        <>
          {/* Mobile: stacked, stage-grouped list. Desktop (lg+): horizontally scrollable 8-column board. */}
          <div className="grid gap-4 lg:hidden">
            {STATUS_ORDER.map((status) => {
              const stageItems = selectByStatus(items, status);
              if (!stageItems.length) return null;
              return (
                <section key={status} className="rounded-2xl bg-white/[0.018] p-3">
                  <div className="mb-3 flex items-center justify-between px-2 py-1"><h2 className="font-sans text-sm font-semibold">{STATUS_LABELS[status]}</h2><span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/5 px-1.5 text-[10px] text-slate-500">{stageItems.length}</span></div>
                  <div className="space-y-3">{stageItems.map((item) => <ContentItemCard key={item.id} item={item} propertyId={site.id} canEdit={access.canCreate} siteQuery={siteQuery} beatTitleById={beatTitleById} clientLabelById={clientLabelById} />)}</div>
                </section>
              );
            })}
          </div>
          <div className={`hidden gap-4 overflow-x-auto pb-4 lg:grid lg:auto-cols-[280px] lg:grid-flow-col ${kanbanStyles.scrollArea}`}>
            {STATUS_ORDER.map((status) => {
              const stageItems = selectByStatus(items, status);
              return (
                <section key={status} className="w-[280px] shrink-0 rounded-2xl bg-white/[0.018] p-3">
                  <div className="mb-3 flex items-center justify-between px-2 py-1"><h2 className="font-sans text-sm font-semibold">{STATUS_LABELS[status]}</h2><span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/5 px-1.5 text-[10px] text-slate-500">{stageItems.length}</span></div>
                  <div className="space-y-3">{stageItems.map((item) => <ContentItemCard key={item.id} item={item} propertyId={site.id} canEdit={access.canCreate} siteQuery={siteQuery} beatTitleById={beatTitleById} clientLabelById={clientLabelById} />)}</div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
