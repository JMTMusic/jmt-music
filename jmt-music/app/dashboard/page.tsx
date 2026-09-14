import Link from "next/link";
import { FolderKanban, UserRound } from "lucide-react";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getPropertyClients } from "@/lib/control-center/client-repository";
import { getSiteConfig } from "@/lib/control-center/data";
import { getPropertyProjects } from "@/lib/control-center/project-repository";

/** Dedicated owner surface for managing client portals. */
export default async function ClientPortalDashboardPage() {
  const site = getSiteConfig("jmt-music");
  const [projectsResult, clientsResult, access] = await Promise.all([
    getPropertyProjects(site),
    getPropertyClients(site),
    getControlCenterAccessStatus()
  ]);
  const projects = projectsResult.projects.filter((project) => project.clientId || project.type === "client_work");

  return (
    <main className="min-h-screen bg-[#070b12] px-5 py-10 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-5 border-b border-white/10 pb-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-300">JMT Music · Private</p>
            <h1 className="mt-3 font-sans text-3xl font-semibold sm:text-4xl">Client Portal Dashboard</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Manage client progress, private portal links, and Google Drive deliveries from one focused workspace.</p>
          </div>
          <span className={`rounded-full border px-3 py-1.5 text-xs ${access.canCreate ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : "border-amber-300/25 bg-amber-300/10 text-amber-200"}`}>{access.canCreate ? "Owner access" : "View only"}</span>
        </header>

        {projectsResult.status === "error" && <p className="rounded-xl border border-red-300/20 bg-red-300/5 p-4 text-sm text-red-200">Client projects could not be loaded.</p>}
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-10 text-center"><FolderKanban className="mx-auto h-7 w-7 text-slate-500" /><h2 className="mt-4 font-semibold">No client projects yet</h2><p className="mt-2 text-sm text-slate-500">Client-linked projects will appear here automatically.</p></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const client = project.clientId ? clientsResult.clients.find((item) => item.id === project.clientId) : undefined;
              return <Link key={project.id} href={`/dashboard/${project.id}`} className="group rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:-translate-y-0.5 hover:border-sky-300/35 hover:bg-white/[.04]">
                <div className="flex items-start justify-between gap-4"><FolderKanban className="h-5 w-5 text-sky-300" /><span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{project.phase.replace("_", " ")}</span></div>
                <h2 className="mt-5 text-lg font-semibold group-hover:text-sky-200">{project.title}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-400"><UserRound className="h-4 w-4" />{client?.artistName || "Client not linked"}</p>
                <p className="mt-5 text-xs font-semibold text-sky-300">Manage portal →</p>
              </Link>;
            })}
          </div>
        )}
      </div>
    </main>
  );
}


