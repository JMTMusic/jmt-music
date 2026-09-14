import Link from "next/link";
import { FolderKanban, LockKeyhole, UserRound } from "lucide-react";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getPropertyClients } from "@/lib/control-center/client-repository";
import { getSiteConfig } from "@/lib/control-center/data";
import { getPropertyProjects } from "@/lib/control-center/project-repository";
import { CreateProjectForm } from "./create-project-form";

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
    <main className="min-h-screen bg-[#070b12] px-5 py-12 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-white/10 pb-7">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-sky-300"><LockKeyhole className="h-4 w-4" />JMT Music · Owner Studio</p>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Studio workspace</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Create client projects and manage their secure portals.</p>
        </header>
        {!isOwner ? <p className="mt-8 rounded-xl border border-red-300/20 bg-red-300/5 p-5 text-sm text-red-200">This workspace is restricted to the owner account.</p> : <>
          <section className="py-8">
            <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-semibold">Client projects</h2><a href="#create-project" className="rounded-lg bg-sky-300 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-sky-200">Create Project</a></div>
            {projects.length === 0 ? <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.025] p-10 text-center"><FolderKanban className="mx-auto h-7 w-7 text-slate-500" /><h3 className="mt-4 font-semibold">No client projects yet</h3><p className="mt-2 text-sm text-slate-500">Create the first project to generate its stages and secure portal.</p><a href="#create-project" className="mt-5 inline-flex rounded-lg border border-sky-300/30 px-4 py-2 text-sm font-semibold text-sky-200">Create Project</a></div> : <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{projects.map((project) => {
              const client = project.clientId ? clients.find((item) => item.id === project.clientId) : undefined;
              return <Link key={project.id} href={`/dashboard/${project.id}`} className="rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-sky-300/35"><FolderKanban className="h-5 w-5 text-sky-300" /><h3 className="mt-4 font-semibold">{project.title}</h3><p className="mt-2 flex items-center gap-2 text-sm text-slate-400"><UserRound className="h-4 w-4" />{client?.artistName || "Client"}</p><p className="mt-4 text-xs font-semibold text-sky-300">Manage project →</p></Link>;
            })}</div>}
          </section>
          <section id="create-project" className="max-w-xl scroll-mt-8 border-t border-white/10 pt-8"><h2 className="text-xl font-semibold">Create a client project</h2><p className="mt-2 text-sm text-slate-500">This creates the client, project, four stages, and private portal access together.</p><CreateProjectForm /></section>
        </>}
      </div>
    </main>
  );
}
