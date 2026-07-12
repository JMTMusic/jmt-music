import { CalendarClock } from "lucide-react";
import { ContentCalendar } from "@/components/control-center/content-calendar";
import { AdminCard, EmptyState, PageHeader, SectionHeading } from "@/components/control-center/ui";
import { getSiteConfig } from "@/lib/control-center/data";
import { listContentItems } from "@/lib/content/repository";
import { friendlyContentMessage, PLATFORM_LABELS, STATUS_LABELS } from "@/lib/content/display";
import type { SitePageProps } from "@/lib/control-center/types";

/** Content Calendar (Stage 4): a planning-only view of everything with a scheduled date. No drag-and-drop, no external sync. */
export default async function ContentCalendarPage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;

  const itemsResult = await listContentItems(site);
  const scheduledItems = itemsResult.items.filter((item) => item.scheduledAt);
  const upcoming = scheduledItems
    .filter((item) => new Date(item.scheduledAt as string).getTime() >= Date.now())
    .sort((a, b) => new Date(a.scheduledAt as string).getTime() - new Date(b.scheduledAt as string).getTime())
    .slice(0, 8);

  return (
    <>
      <PageHeader eyebrow={`${site.name} · Content Workspace`} title="Content Calendar" description="A planning view of everything with a scheduled date. Click a day to see what's queued." />

      {itemsResult.status === "error" && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">Content Workspace unavailable:</strong>{friendlyContentMessage(itemsResult.detail)}</div>
      )}

      {itemsResult.status === "empty" ? (
        <EmptyState title="No content items yet" message="Once content items exist and have a scheduled date, they'll appear here." />
      ) : (
        <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
          <AdminCard className="p-5">
            <ContentCalendar items={scheduledItems} siteQuery={siteQuery} />
          </AdminCard>
          <section>
            <SectionHeading title="Upcoming Scheduled Content" description="The next items queued to publish." />
            <AdminCard className="p-2">
              {upcoming.length ? upcoming.map((item) => (
                <a key={item.id} href={`/control-center/content/pipeline/${item.id}${siteQuery}`} className="flex items-center gap-4 rounded-xl p-3 transition hover:bg-white/[0.035]">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-300/8 text-sky-300"><CalendarClock className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-100">{item.title}</p>
                    <p className="truncate text-xs text-slate-500">{new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "numeric", minute: "2-digit" }).format(new Date(item.scheduledAt as string))} · {STATUS_LABELS[item.status]}{item.platforms.length ? ` · ${item.platforms.map((platform) => PLATFORM_LABELS[platform]).join(", ")}` : ""}</p>
                  </div>
                </a>
              )) : <p className="p-6 text-sm text-slate-500">Nothing scheduled yet.</p>}
            </AdminCard>
          </section>
        </div>
      )}
    </>
  );
}
