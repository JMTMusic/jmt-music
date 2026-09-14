import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getClientPortalByToken } from "@/lib/client-portal/repository";
import { WorkspaceShell, workspaceEyebrow } from "@/components/client-portal/workspace-shell";
import { ClientMixRoom } from "@/components/client-portal/client-mix-room";

export const dynamic = "force-dynamic";

export default async function ClientPortalPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ access?: string }> }) {
  const { token } = await params;
  const { access } = await searchParams;
  const accessToken = access || token;
  const result = await getClientPortalByToken(accessToken);
  if (result.status === "not_found" || result.status === "revoked") notFound();
  if (result.status === "error") {
    return <main className="min-h-screen bg-[#05070a] p-8 text-slate-100"><div className="mx-auto max-w-2xl rounded-xl border border-amber-300/20 bg-amber-300/5 p-6 text-amber-100">{result.message}</div></main>;
  }
  if (result.status !== "found") notFound();

  const { view } = result;
  const clientName = view.client.contactName || view.client.artistName || "Client";
  return (
    <WorkspaceShell label={clientName}>
        <header className="flex flex-wrap items-end justify-between gap-6 py-8">
          <div><p className={workspaceEyebrow}>{view.client.artistName} · Your portal</p><h1 className="mt-2 font-serif text-[clamp(27px,4vw,40px)] font-normal">Everything for this record, in one place.</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">{view.project.title} — hear the latest delivery, leave notes, and see what JMT Music is working on next.</p></div>
          <div className="flex flex-col items-end gap-3"><div className="flex items-center gap-2 text-xs text-emerald-300"><ShieldCheck className="h-4 w-4" />Private project access</div><a href={`/project-setup/${accessToken}`} className="text-xs font-semibold text-sky-300 hover:text-sky-200">Open project setup →</a></div>
        </header>

      <section className="border-t border-white/15 py-[18px]">
        <div className="flex flex-wrap">{view.stages.map((item, index) => <div key={item.stage} className={`min-w-32 flex-1 pr-4 ${index ? "border-l border-white/15 pl-4" : ""}`}><div className={`mb-2 h-[3px] rounded-sm ${item.status === "complete" ? "bg-blue-400" : item.status === "in_progress" || item.status === "ready" ? "bg-gradient-to-r from-blue-400 from-60% to-white/15 to-60%" : "bg-white/15"}`} /><p className={`text-xs font-medium capitalize ${item.status === "not_started" ? "text-[#7c8794]" : "text-blue-200"}`}>{item.stage}</p><p className="text-[11px] capitalize text-[#7c8794]">{item.clientNote || item.status.replaceAll("_", " ")}</p></div>)}</div>
      </section>

      <ClientMixRoom view={view} accessToken={accessToken} clientName={clientName} />
    </WorkspaceShell>
  );
}
