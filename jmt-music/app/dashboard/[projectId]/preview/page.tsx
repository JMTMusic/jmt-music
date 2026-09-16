import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { notFound } from "next/navigation";
import { ClientMixRoom } from "@/components/client-portal/client-mix-room";
import { getPortalPreviewForProject } from "@/lib/client-portal/repository";
import { getPropertyClients } from "@/lib/control-center/client-repository";
import { getSiteConfig } from "@/lib/control-center/data";
import { getPropertyProjects } from "@/lib/control-center/project-repository";
import { WorkspaceShell, workspaceEyebrow } from "@/components/client-portal/workspace-shell";

export const dynamic = "force-dynamic";

/**
 * Staff-only "view as client" preview — renders the real ClientMixRoom with the same
 * visible_to_client-filtered data a real token would resolve to, but reached through the
 * admin session instead of a client's private link (see getPortalPreviewForProject).
 */
export default async function AdminPortalPreviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const site = getSiteConfig("jmt-music");
  const [projectsResult, clientsResult] = await Promise.all([getPropertyProjects(site), getPropertyClients(site)]);
  const project = projectsResult.projects.find((item) => item.id === projectId);
  if (!project) notFound();
  const client = project.clientId ? clientsResult.clients.find((item) => item.id === project.clientId) : undefined;

  const result = await getPortalPreviewForProject(
    projectId,
    { id: project.id, title: project.title, type: project.type },
    { artistName: client?.artistName || "Client not linked", contactName: client?.contactName || null }
  );
  if (result.status !== "found") {
    return <WorkspaceShell showSignOut><p className="py-10 text-sm text-red-300">{result.status === "error" ? result.message : "This project has no preview data yet."}</p></WorkspaceShell>;
  }

  const { view } = result;
  const clientName = view.client.contactName || view.client.artistName;
  return (
    <WorkspaceShell showSignOut>
      <div className="mt-5 flex items-center gap-2 rounded-[6px] border border-blue-400/25 bg-blue-400/[.06] px-4 py-2.5 text-xs text-blue-200">
        <Eye className="h-3.5 w-3.5 shrink-0" />
        <span>You&apos;re viewing this exactly as {clientName} sees it — read-only, no notes or approvals will be sent.</span>
        <Link href={`/dashboard/${projectId}`} className="ml-auto inline-flex shrink-0 items-center gap-1.5 font-semibold text-blue-100 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Back to project</Link>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-6 py-8">
        <div><p className={workspaceEyebrow}>{view.client.artistName} · Your portal</p><h1 className="mt-2 font-serif text-[clamp(27px,4vw,40px)] font-normal">Everything for this record, in one place.</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">{view.project.title} — hear the latest delivery, leave notes, and see what JMT Music is working on next.</p></div>
      </header>

      <section className="border-t border-white/15 py-[18px]">
        <div className="flex flex-wrap">{view.stages.map((item, index) => <div key={item.stage} className={`min-w-32 flex-1 pr-4 ${index ? "border-l border-white/15 pl-4" : ""}`}><div className="mb-2 h-[3px] rounded-sm" style={{ background: `linear-gradient(90deg, #60a5fa ${item.progressPct}%, rgba(255,255,255,.15) ${item.progressPct}%)` }} /><p className={`text-xs font-medium capitalize ${item.status === "not_started" ? "text-[#7c8794]" : "text-blue-200"}`}>{item.stage}{item.progressPct > 0 && item.progressPct < 100 ? ` · ${item.progressPct}%` : ""}</p><p className="text-[11px] capitalize text-[#7c8794]">{item.clientNote || item.status.replaceAll("_", " ")}</p></div>)}</div>
      </section>

      <ClientMixRoom view={view} accessToken="" clientName={clientName} readOnly />
    </WorkspaceShell>
  );
}
