"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { updatePortalStageAction, type StageActionState } from "@/app/control-center/projects/stage-actions";
import type { PortalStage, PortalStageStatus } from "@/lib/client-portal/types";
import type { SiteId } from "@/lib/control-center/types";
import { workspacePanel } from "@/components/client-portal/workspace-shell";

const initial: StageActionState = { status: "idle", message: "" };
const labels: Record<PortalStageStatus, string> = { not_started: "Not started", in_progress: "In progress", ready: "Ready for review", complete: "Complete" };
// Same stage color legend used across Projects/Beats/Clients: gray/blue/purple/green.
const barColor: Record<PortalStageStatus, string> = { not_started: "rgba(255,255,255,.15)", in_progress: "#60a5fa", ready: "#c4b5fd", complete: "#5ecb9a" };
const nameColor: Record<PortalStageStatus, string> = { not_started: "text-slate-500", in_progress: "text-blue-300", ready: "text-purple-300", complete: "text-emerald-300" };
const field = "min-h-10 rounded-[6px] border border-white/15 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-400/60";

function StageRow({ item, propertyId, projectId, canEdit }: { item: PortalStage; propertyId: SiteId; projectId: string; canEdit: boolean }) {
  const [state, action, pending] = useActionState(updatePortalStageAction, initial);
  return <form action={action} className={`${workspacePanel} p-4`}>
    <input type="hidden" name="property" value={propertyId} /><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="stage" value={item.stage} />
    <div className="mb-2 h-[3px] rounded-full" style={{ background: `linear-gradient(90deg, ${barColor[item.status]} ${item.progressPct}%, rgba(255,255,255,.12) ${item.progressPct}%)` }} />
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <p className={`font-serif text-base capitalize ${nameColor[item.status]}`}>{item.stage}</p>
      {item.updatedAt && <p className="text-[10.5px] text-slate-600">Updated {new Date(item.updatedAt).toLocaleDateString()}</p>}
    </div>
    <div className="mt-3 grid gap-3 md:grid-cols-[160px_90px_1fr_auto] md:items-end">
      <label className="grid gap-1 text-[10.5px] uppercase tracking-[.12em] text-slate-500">Status<select className={field} name="status" defaultValue={item.status} disabled={!canEdit}>{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="grid gap-1 text-[10.5px] uppercase tracking-[.12em] text-slate-500">Progress %<input className={field} name="progressPct" type="number" min={0} max={100} defaultValue={item.progressPct} disabled={!canEdit} /></label>
      <label className="grid gap-1 text-[10.5px] uppercase tracking-[.12em] text-slate-500">Client-facing note<input className={field} name="clientNote" defaultValue={item.clientNote || ""} maxLength={500} disabled={!canEdit} placeholder="What should the client know?" /></label>
      {canEdit && <button disabled={pending} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] bg-blue-400 px-4 text-sm font-medium text-[#04101f] hover:bg-blue-300 disabled:opacity-60">{pending && <LoaderCircle className="h-4 w-4 animate-spin" />}Save</button>}
    </div>
    {state.message && <p className={`mt-2 text-xs ${state.status === "error" ? "text-red-300" : "text-emerald-300"}`}>{state.message}</p>}
  </form>;
}

export function PortalStagePanel(props: { propertyId: SiteId; projectId: string; stages: PortalStage[]; canEdit: boolean; schemaUnavailable: boolean }) {
  if (props.schemaUnavailable) return <p className="rounded-[6px] border border-amber-300/20 bg-amber-300/5 p-4 text-xs text-amber-100">Apply the portal stage migration before updating progress.</p>;
  return <div className="grid gap-3 md:grid-cols-2">{props.stages.map((item) => <StageRow key={item.stage} item={item} propertyId={props.propertyId} projectId={props.projectId} canEdit={props.canEdit} />)}</div>;
}
