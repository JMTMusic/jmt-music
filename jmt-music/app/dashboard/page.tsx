import Link from "next/link";
import { FolderKanban, UserRound } from "lucide-react";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getPropertyClients } from "@/lib/control-center/client-repository";
import { getSiteConfig } from "@/lib/control-center/data";
import { getPropertyProjects } from "@/lib/control-center/project-repository";
import { WorkspaceShell, workspaceEyebrow, workspacePanel } from "@/components/client-portal/workspace-shell";

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
    <WorkspaceShell>
        <header className="flex flex-wrap items-end justify-between gap-5 py-8">
          <div>
            <p className={workspaceEyebrow}>{projects.length} client project{projects.length === 1 ? "" : "s"}</p>
            <h1 className="mt-2 font-serif text-[clamp(27px,4vw,40px)] font-normal leading-tight">Who needs you today.</h1>
          </div>
          <Link href="/studio#create-project" className="rounded-[6px] bg-blue-400 px-4 py-2.5 text-xs font-medium text-[#04101f] hover:bg-blue-300">Create project</Link>
        </header>

        {projectsResult.status === "error" && <p className="rounded-xl border border-red-300/20 bg-red-300/5 p-4 text-sm text-red-200">Client projects could not be loaded.</p>}
        {projects.length === 0 ? (
          <div className={`${workspacePanel} p-10 text-center`}><FolderKanban className="mx-auto h-7 w-7 text-slate-500" /><h2 className="mt-4 font-serif text-xl">No client projects yet</h2><p className="mt-2 text-sm text-slate-500">Client-linked projects will appear here automatically.</p></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const client = project.clientId ? clientsResult.clients.find((item) => item.id === project.clientId) : undefined;
              return <Link key={project.id} href={`/dashboard/${project.id}`} className={`${workspacePanel} group p-[18px] transition hover:border-blue-400`}>
                <div className="flex items-start justify-between gap-4"><span className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-[#1c2431] text-sm font-semibold text-blue-200">{(client?.artistName || "C").split(/\s+/).map((part) => part[0]).join("").slice(0,2)}</span><span className="text-[10px] uppercase tracking-wider text-[#7c8794]">{project.phase.replace("_", " ")}</span></div>
                <h2 className="mt-4 font-serif text-lg font-normal group-hover:text-blue-200">{project.title}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-400"><UserRound className="h-4 w-4" />{client?.artistName || "Client not linked"}</p>
                <div className="mt-4 flex gap-1">{[0,1,2,3].map((i) => <i key={i} className={`h-[3px] flex-1 rounded-sm ${i === 0 && project.phase !== "not_started" ? "bg-blue-400" : "bg-white/15"}`} />)}</div>
                <p className="mt-3 text-xs text-blue-200">Open →</p>
              </Link>;
            })}
          </div>
        )}
    </WorkspaceShell>
  );
}

