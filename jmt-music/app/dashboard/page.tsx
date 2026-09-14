import Link from "next/link";
import { FolderKanban } from "lucide-react";
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
  const roster = clientsResult.clients.filter((client) => projects.some((project) => project.clientId === client.id));
  const waiting = projects.filter((project) => project.isWaiting);

  return (
    <WorkspaceShell>
        <header className="flex flex-wrap items-end justify-between gap-5 py-8">
          <div>
            <p className={workspaceEyebrow}>{roster.length} artist{roster.length === 1 ? "" : "s"} · {projects.filter((project) => project.phase !== "done").length} active projects</p>
            <h1 className="mt-2 font-serif text-[clamp(27px,4vw,40px)] font-normal leading-tight">Who needs you today.</h1>
          </div>
          <Link href="/studio#create-project" className="rounded-[6px] bg-blue-400 px-4 py-2.5 text-xs font-medium text-[#04101f] hover:bg-blue-300">Create project</Link>
        </header>

        {projectsResult.status === "error" && <p className="rounded-xl border border-red-300/20 bg-red-300/5 p-4 text-sm text-red-200">Client projects could not be loaded.</p>}
        {projects.length === 0 ? (
          <div className={`${workspacePanel} p-10 text-center`}><FolderKanban className="mx-auto h-7 w-7 text-slate-500" /><h2 className="mt-4 font-serif text-xl">No client projects yet</h2><p className="mt-2 text-sm text-slate-500">Client-linked projects will appear here automatically.</p></div>
        ) : <>
          <section className="mb-[26px]"><p className={workspaceEyebrow}>Waiting on you</p>{waiting.length ? <div className="mt-2 space-y-2">{waiting.map((project) => { const client = clientsResult.clients.find((item) => item.id === project.clientId); return <Link key={project.id} href={`/dashboard/${project.id}`} className="flex w-full items-center gap-3 rounded-[6px] border border-white/15 border-l-2 border-l-amber-300 bg-[#101722] px-3.5 py-3 text-left hover:border-white/25 hover:border-l-amber-300"><span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border border-white/25 bg-[#1c2431] text-[10px] font-semibold text-blue-200">{(client?.artistName || "C").split(/\s+/).map((part) => part[0]).join("").slice(0,2)}</span><span className="min-w-0 flex-1"><b className="block truncate text-[13.5px] font-medium">{project.title} — {client?.artistName || "Client"}</b><span className="block text-xs text-slate-500">{project.waitingNote || "Project is waiting on your attention"}</span></span><span className="text-xs text-blue-300">Open →</span></Link>; })}</div> : <p className="mt-2 text-xs text-slate-500">Nothing outstanding. Every note has a reply.</p>}</section>
          <div className="mb-3 flex items-baseline gap-2.5"><span className={workspaceEyebrow}>Artists</span><span className="h-px flex-1 bg-white/15" /></div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3.5">{roster.map((client) => { const clientProjects = projects.filter((project) => project.clientId === client.id); const active = clientProjects.filter((project) => project.phase !== "done"); const delivered = clientProjects.filter((project) => project.phase === "done"); const first = active[0] || delivered[0]; const flagged = clientProjects.some((project) => project.isWaiting); return <Link key={client.id} href={first ? `/dashboard/${first.id}` : "/studio#create-project"} className={`${workspacePanel} relative flex flex-col items-start gap-2.5 p-[18px] text-left transition hover:border-blue-400`}>{flagged && <span className="absolute right-3.5 top-3.5 h-[7px] w-[7px] rounded-full bg-amber-300" />}<span className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-[#1c2431] text-[15px] font-semibold text-blue-200">{client.artistName.split(/\s+/).map((part) => part[0]).join("").slice(0,2)}</span><b className="font-serif text-[15px] font-normal">{client.artistName}</b><span className="text-[11.5px] leading-5 text-slate-500">{active.length} active · {delivered.length} delivered<br />Client since {new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(client.createdAt))}</span></Link>; })}</div>
        </>}
    </WorkspaceShell>
  );
}
