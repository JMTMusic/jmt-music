import { CalendarClock, CheckCircle2, Clapperboard, Clock, Lightbulb, ListTodo, Rocket, Video } from "lucide-react";
import { AddContentItemDialog } from "@/components/control-center/add-content-item-dialog";
import { AdminCard, EmptyState, PageHeader, SectionHeading } from "@/components/control-center/ui";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { getPropertyBeatLibrary } from "@/lib/control-center/beat-repository";
import { getPropertyClients } from "@/lib/control-center/client-repository";
import { getDisplayName } from "@/lib/control-center/lead-pipeline";
import { getPropertyProjects } from "@/lib/control-center/project-repository";
import { listContentItems } from "@/lib/content/repository";
import { computeAttentionCounts, selectAttentionRequired, selectByStatus, selectScheduledWithinDays } from "@/lib/content/pipeline";
import { friendlyContentMessage, STATUS_LABELS } from "@/lib/content/display";
import type { ContentAttentionCounts, ContentItemRecord, ContentStatus } from "@/lib/content/types";
import type { SitePageProps } from "@/lib/control-center/types";

const SUMMARY_CARDS: { status: ContentStatus; countKey: keyof ContentAttentionCounts; icon: typeof Lightbulb }[] = [
  { status: "idea", countKey: "idea", icon: Lightbulb },
  { status: "planned", countKey: "planned", icon: ListTodo },
  { status: "needs_filming", countKey: "needsFilming", icon: Video },
  { status: "needs_editing", countKey: "needsEditing", icon: Clapperboard },
  { status: "ready", countKey: "ready", icon: CheckCircle2 },
  { status: "scheduled", countKey: "scheduled", icon: CalendarClock },
  { status: "published", countKey: "published", icon: Rocket }
];

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function ContentRow({ item, siteQuery, icon: Icon, tone, detail }: { item: ContentItemRecord; siteQuery: string; icon: typeof Clock; tone: "amber" | "red" | "sky" | "emerald"; detail: string }) {
  const toneClass = { amber: "bg-amber-300/8 text-amber-300", red: "bg-red-400/8 text-red-300", sky: "bg-sky-300/8 text-sky-300", emerald: "bg-emerald-400/8 text-emerald-300" }[tone];
  return (
    <a href={`/control-center/content/pipeline/${item.id}${siteQuery}`} className="flex items-center gap-4 rounded-xl p-3 transition hover:bg-white/[0.035]">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${toneClass}`}><Icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-100">{item.title}</p>
        <p className="truncate text-xs text-slate-500">{detail}</p>
      </div>
    </a>
  );
}

/** Content Workspace dashboard: what needs attention, what's coming up, what just went out. */
export default async function ContentDashboardPage({ searchParams }: SitePageProps) {
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
  const counts = computeAttentionCounts(items);
  const attention = selectAttentionRequired(items);
  const upcoming = selectScheduledWithinDays(items, 14)
    .sort((a, b) => new Date(a.scheduledAt as string).getTime() - new Date(b.scheduledAt as string).getTime())
    .slice(0, 6);
  const recentlyPublished = selectByStatus(items, "published")
    .filter((item) => item.publishedAt)
    .sort((a, b) => new Date(b.publishedAt as string).getTime() - new Date(a.publishedAt as string).getTime())
    .slice(0, 5);

  const beatOptions = beatsResult.beats.map((beat) => ({ id: beat.id, title: beat.title }));
  const clientOptions = clientsResult.clients.map((client) => ({ id: client.id, label: getDisplayName(client) }));
  const projectOptions = projectsResult.projects.map((project) => ({ id: project.id, title: project.title, type: project.type }));

  return (
    <>
      <PageHeader
        eyebrow={`${site.name} · Content Workspace`}
        title="Content Dashboard"
        description="What needs a decision, what's coming up, and what just went out — across every piece of managed content."
        actions={<AddContentItemDialog propertyId={site.id} beats={beatOptions} clients={clientOptions} projects={projectOptions} disabled={!access.canCreate} />}
      />

      {itemsResult.status === "error" && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">Content Workspace unavailable:</strong>{friendlyContentMessage(itemsResult.detail)}</div>
      )}
      {!access.canCreate && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">New Content Item disabled:</strong>{access.detail}</div>
      )}

      {itemsResult.status === "empty" ? (
        <EmptyState title="No content items yet" message="Create your first content item to start tracking it from idea through published." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {SUMMARY_CARDS.map(({ status, countKey, icon: Icon }) => (
              <AdminCard key={status} className="p-5">
                <div className="flex items-start justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-300/10 text-sky-300"><Icon className="h-5 w-5" /></span>
                </div>
                <p className="mt-6 text-3xl font-semibold tracking-tight text-white">{counts[countKey]}</p>
                <p className="mt-1 text-xs font-medium text-slate-300">{STATUS_LABELS[status]}</p>
              </AdminCard>
            ))}
          </div>

          <section className="mt-10">
            <SectionHeading title="Attention Required" description="Overdue scheduled items, and ready items that still need a schedule date." />
            <AdminCard className="p-2">
              {attention.length ? attention.map((item) => {
                const overdue = item.status === "scheduled";
                return <ContentRow key={item.id} item={item} siteQuery={siteQuery} icon={overdue ? Clock : CheckCircle2} tone={overdue ? "red" : "amber"} detail={overdue ? `Overdue — was due ${formatDateTime(item.scheduledAt)}` : "Ready, not yet scheduled"} />;
              }) : <p className="p-6 text-sm text-slate-500">Nothing needs attention right now.</p>}
            </AdminCard>
          </section>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <section>
              <SectionHeading title="Upcoming Scheduled Content" description="The next items queued to publish." />
              <AdminCard className="p-2">
                {upcoming.length ? upcoming.map((item) => <ContentRow key={item.id} item={item} siteQuery={siteQuery} icon={CalendarClock} tone="sky" detail={formatDateTime(item.scheduledAt) || "No date set"} />) : <p className="p-6 text-sm text-slate-500">Nothing scheduled yet.</p>}
              </AdminCard>
            </section>
            <section>
              <SectionHeading title="Recently Published" description="The last five items that went live." />
              <AdminCard className="p-2">
                {recentlyPublished.length ? recentlyPublished.map((item) => <ContentRow key={item.id} item={item} siteQuery={siteQuery} icon={Rocket} tone="emerald" detail={formatDateTime(item.publishedAt) || ""} />) : <p className="p-6 text-sm text-slate-500">Nothing published yet.</p>}
              </AdminCard>
            </section>
          </div>
        </>
      )}
    </>
  );
}
