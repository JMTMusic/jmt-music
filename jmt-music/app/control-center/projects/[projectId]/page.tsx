import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { notFound } from "next/navigation";
import { ProjectSetupPanel } from "@/components/control-center/project-setup-panel";
import { AdminCard, PageHeader, SectionHeading } from "@/components/control-center/ui";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getPropertyClients } from "@/lib/control-center/client-repository";
import { getSiteConfig } from "@/lib/control-center/data";
import { PROJECT_TYPE_LABELS } from "@/lib/control-center/project-display";
import { getPropertyProjects } from "@/lib/control-center/project-repository";
import type { SitePageProps } from "@/lib/control-center/types";
import { getProjectSetupByProjectId } from "@/lib/project-setup/repository";
import type { ProjectSetupRecord } from "@/lib/project-setup/types";

type ProjectDetailPageProps = SitePageProps & { params: Promise<{ projectId: string }> };

/**
 * Smallest reasonable single-Project page — no Project detail surface existed before
 * this (the Project list is grouped-by-phase only). Built specifically to host the
 * Project Setup controls (Stage 3) without overloading the list or redesigning it.
 */
export default async function ProjectDetailPage({ searchParams, params }: ProjectDetailPageProps) {
  const { site: requestedSite } = await searchParams;
  const { projectId } = await params;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;

  const [projectsResult, clientsResult, access, setupResult] = await Promise.all([
    getPropertyProjects(site),
    getPropertyClients(site),
    getControlCenterAccessStatus(),
    getProjectSetupByProjectId(site, projectId)
  ]);

  const project = projectsResult.projects.find((item) => item.id === projectId);
  if (!project) notFound();

  const client = project.clientId ? clientsResult.clients.find((item) => item.id === project.clientId) : undefined;

  let setup: ProjectSetupRecord | null = null;
  let schemaUnavailable = false;
  if (setupResult.status === "found") setup = setupResult.setup;
  else if (setupResult.status === "error" && setupResult.message.toLowerCase().includes("has migration")) schemaUnavailable = true;

  return (
    <>
      <Link href={`/control-center/projects${siteQuery}`} className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Back to Projects</Link>

      <PageHeader
        eyebrow={`${site.name} · ${PROJECT_TYPE_LABELS[project.type]}`}
        title={project.title}
        description={client ? `For ${client.artistName}` : "No Client linked yet."}
      />

      <AdminCard className="mb-8 p-5">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <span>Phase: <span className="font-medium text-slate-200">{project.phase.replace("_", " ")}</span></span>
          {project.detailStage && <span>Stage: <span className="font-medium text-slate-200">{project.detailStage}</span></span>}
          {project.targetDate && <span className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5 text-slate-500" />Target: {project.targetDate}</span>}
          {project.isWaiting && <span className="text-amber-300">Waiting{project.waitingNote ? `: ${project.waitingNote}` : ""}</span>}
          {client && <Link href={`/control-center/growth/leads/${client.id}${siteQuery}`} className="text-sky-300 hover:text-sky-200">View Client →</Link>}
        </div>
      </AdminCard>

      <section>
        <SectionHeading title="Project Setup" description="Private, token-authenticated intake for this Project — created, sent, and reviewed here." />
        <AdminCard className="p-5">
          <ProjectSetupPanel
            propertyId={site.id}
            projectId={project.id}
            hasClient={Boolean(project.clientId)}
            canEdit={access.canCreate}
            setup={setup}
            schemaUnavailable={schemaUnavailable}
          />
        </AdminCard>
      </section>
    </>
  );
}
