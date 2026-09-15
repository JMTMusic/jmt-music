import Link from "next/link";
import { FolderKanban, LockKeyhole, UserRound } from "lucide-react";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getPropertyClients } from "@/lib/control-center/client-repository";
import { getSiteConfig } from "@/lib/control-center/data";
import { getPropertyProjects } from "@/lib/control-center/project-repository";
import { CreateProjectForm } from "./create-project-form";
import { WorkspaceShell, workspaceEyebrow, workspacePanel } from "@/components/client-portal/workspace-shell";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const site = getSiteConfig("jmt-music");
  const [accessResult, projectsResult, clientsResult] = await Promise.allSettled([
    getControlCenterAccessStatus(),
    getPropertyProjects(site),
    getPropertyClients(site)
  ]);
  const isOwner = accessResult.status === "fulfilled" && accessResult.value.role === "owner";
  const projects = projectsResult.status === "fulfilled"
    ? (projectsResult.value.projects || []).filter((project) => project.clientId || project.type === "client_work")
    : [];
  const clients = clientsResult.status === "fulfilled" ? (clientsResult.value.clients || []) : [];

  return (
    <WorkspaceShell showSignOut>
        <header className="py-8">
          <p className={`${workspaceEyebrow} flex items-center gap-2`}><LockKeyhole className="h-3.5 w-3.5" />Private owner workspace</p>
          <h1 className="mt-2 font-serif text-[clamp(27px,4vw,40px)] font-normal">Who needs you today.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Create client projects and manage their secure portals.</p>
        </header>
        {!isOwner ? <p className="mt-8 rounded-xl border border-red-300/20 bg-red-300/5 p-5 text-sm text-red-200">This workspace is restricted to the owner account.</p> : <>
          <section className="py-8">
            <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-semibold">Client projects</h2><a href="#create-project" className="rounded-lg bg-sky-300 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-sky-200">Create Project</a></div>
            {projects.length === 0 ? <div className={`${workspacePanel} mt-5 p-10 text-center`}><FolderKanban className="mx-auto h-7 w-7 text-slate-500" /><h3 className="mt-4 font-serif text-xl">No client projects yet</h3><p className="mt-2 text-sm text-slate-500">Create the first project to generate its stages and secure portal.</p><a href="#create-project" className="mt-5 inline-flex rounded-[6px] border border-blue-400/40 px-4 py-2 text-xs font-medium text-blue-200">Create Project</a></div> : <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{projects.map((project) => {
              const client = project.clientId ? clients.find((item) => item.id === project.clientId) : undefined;
              return <Link key={project.id} href={`/dashboard/${project.id}`} className="rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-sky-300/35"><FolderKanban className="h-5 w-5 text-sky-300" /><h3 className="mt-4 font-semibold">{project.title}</h3><p className="mt-2 flex items-center gap-2 text-sm text-slate-400"><UserRound className="h-4 w-4" />{client?.artistName || "Client"}</p><p className="mt-4 text-xs font-semibold text-sky-300">Manage project →</p></Link>;
            })}</div>}
          </section>
          <section id="create-project" className={`${workspacePanel} max-w-xl scroll-mt-8 p-6`}><p className={workspaceEyebrow}>New project</p><h2 className="mt-2 font-serif text-2xl font-normal">Create a client project</h2><p className="mt-2 text-sm text-slate-500">This creates the client, project, four stages, and private portal access together.</p><CreateProjectForm /></section>
        </>}
    </WorkspaceShell>
  );
}
