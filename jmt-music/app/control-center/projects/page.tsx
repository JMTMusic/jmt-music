import Link from "next/link";
import { AdminCard, EmptyState, PageHeader } from "@/components/control-center/ui";
import { getPropertyProjects } from "@/lib/control-center/project-repository";
import { getSiteConfig } from "@/lib/control-center/data";
import { PROJECT_TYPE_LABELS } from "@/lib/control-center/project-display";
import type { Project, ProjectPhase, SitePageProps } from "@/lib/control-center/types";

const PHASES: { key: ProjectPhase; label: string; dotClass: string }[] = [
  { key: "not_started", label: "Not started", dotClass: "bg-slate-400" },
  { key: "in_progress", label: "In progress", dotClass: "bg-sky-400" },
  { key: "finishing", label: "Finishing", dotClass: "bg-amber-400" },
  { key: "ready", label: "Ready", dotClass: "bg-purple-400" },
  { key: "done", label: "Done", dotClass: "bg-emerald-400" }
];

function formatTargetDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function ProjectRow({ project, siteQuery }: { project: Project; siteQuery: string }) {
  const targetDate = formatTargetDate(project.targetDate);
  return (
    <AdminCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/control-center/projects/${project.id}${siteQuery}`} className="min-w-0 break-words text-sm font-semibold text-slate-100 hover:text-sky-200">{project.title}</Link>
        {project.isWaiting && <span className="shrink-0 rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-semibold text-amber-200">Waiting</span>}
      </div>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{PROJECT_TYPE_LABELS[project.type]}</p>
      {project.detailStage && <p className="mt-3 text-sm text-slate-400">{project.detailStage}</p>}
      {project.isWaiting && project.waitingNote && <p className="mt-2 text-xs text-amber-100/70">{project.waitingNote}</p>}
      {targetDate && <p className="mt-4 border-t border-white/6 pt-3 text-[10px] text-slate-500">Target: {targetDate}</p>}
    </AdminCard>
  );
}

/** Master, unfiltered list of every active project across all types, grouped by phase. */
export default async function ProjectsPage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;
  const result = await getPropertyProjects(site);

  return (
    <>
      <PageHeader
        eyebrow={`${site.name} · Workflow`}
        title="Projects"
        description="Every active piece of work — beats, client jobs, sync pitches, website initiatives, content batches — grouped by phase."
      />
      {result.status === "error" && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75">
          <strong className="mr-2 text-amber-200">Projects unavailable:</strong>
          {result.detail}
        </div>
      )}
      {result.status === "empty" ? (
        <EmptyState title="No projects yet" message="Once work starts moving through beats, client jobs, sync, website, or content, it will show up here grouped by phase." />
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-5">
          {PHASES.map(({ key, label, dotClass }) => {
            const phaseProjects = result.projects.filter((project) => project.phase === key);
            return (
              <section key={key} className="rounded-2xl bg-white/[0.018] p-3">
                <div className="mb-3 flex items-center justify-between px-2 py-1">
                  <h2 className="flex items-center gap-2 font-sans text-sm font-semibold"><span className={`h-2 w-2 rounded-full ${dotClass}`} />{label}</h2>
                  <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/5 px-1.5 text-[10px] text-slate-500">{phaseProjects.length}</span>
                </div>
                <div className="space-y-3">
                  {phaseProjects.map((project) => <ProjectRow key={project.id} project={project} siteQuery={siteQuery} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
