import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { notFound } from "next/navigation";
import { PortalFilePanel } from "@/components/control-center/portal-file-panel";
import { PortalStagePanel } from "@/components/control-center/portal-stage-panel";
import { ProjectSetupPanel } from "@/components/control-center/project-setup-panel";
import { getPortalFilesForProject, getPortalStagesForProject } from "@/lib/client-portal/repository";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getPropertyClients } from "@/lib/control-center/client-repository";
import { getSiteConfig } from "@/lib/control-center/data";
import { getPropertyProjects } from "@/lib/control-center/project-repository";
import { getProjectSetupByProjectId } from "@/lib/project-setup/repository";
import type { ProjectSetupRecord } from "@/lib/project-setup/types";
import { WorkspaceShell, workspaceEyebrow, workspacePanel } from "@/components/client-portal/workspace-shell";

export default async function ClientPortalProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const site = getSiteConfig("jmt-music");
  const [projectsResult, clientsResult, access, setupResult, filesResult, stagesResult] = await Promise.all([
    getPropertyProjects(site), getPropertyClients(site), getControlCenterAccessStatus(),
    getProjectSetupByProjectId(site, projectId), getPortalFilesForProject(projectId), getPortalStagesForProject(projectId)
  ]);
  const project = projectsResult.projects.find((item) => item.id === projectId);
  if (!project) notFound();
  const client = project.clientId ? clientsResult.clients.find((item) => item.id === project.clientId) : undefined;
  const setup: ProjectSetupRecord | null = setupResult.status === "found" ? setupResult.setup : null;
  const setupSchemaUnavailable = setupResult.status === "error" && setupResult.message.toLowerCase().includes("migration");

  return <WorkspaceShell><div className="pt-5">
    <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-blue-200"><ArrowLeft className="h-3.5 w-3.5" />Artists</Link>
    <header className="py-7"><p className={workspaceEyebrow}>{client?.artistName || "Client not linked"} · Client project</p><h1 className="mt-2 font-serif text-[clamp(27px,4vw,40px)] font-normal">{project.title}</h1><div className="mt-2 flex flex-wrap gap-4 text-xs text-[#7c8794]"><span>{project.phase.replace("_", " ")}</span>{project.targetDate && <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" />{project.targetDate}</span>}</div></header>

    <section><p className={workspaceEyebrow}>Private client access</p><div className={`${workspacePanel} mt-3 p-5`}><ProjectSetupPanel propertyId={site.id} projectId={project.id} hasClient={Boolean(project.clientId)} canEdit={access.canCreate} setup={setup} schemaUnavailable={setupSchemaUnavailable} /></div></section>
    <section className="mt-10"><h2 className="text-xl font-semibold">Project progress</h2><p className="mt-1 text-sm text-slate-500">Control the Production, Mixing, Mastering, and Delivery sections clients see.</p><div className="mt-4 rounded-2xl border border-white/10 bg-white/[.025] p-5"><PortalStagePanel propertyId={site.id} projectId={project.id} stages={stagesResult.stages} canEdit={access.canCreate} schemaUnavailable={stagesResult.status === "error"} /></div></section>
    <section className="mt-10"><h2 className="text-xl font-semibold">Files and deliveries</h2><p className="mt-1 text-sm text-slate-500">Add Google Drive files and version notes to the client portal.</p><div className="mt-4 rounded-2xl border border-white/10 bg-white/[.025] p-5"><PortalFilePanel propertyId={site.id} projectId={project.id} files={filesResult.files} canEdit={access.canCreate} schemaUnavailable={filesResult.status === "error"} /></div></section>
  </div></WorkspaceShell>;
}
