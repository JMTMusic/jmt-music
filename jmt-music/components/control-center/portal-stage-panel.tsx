"use client";

import { useActionState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { updatePortalStageAction, type StageActionState } from "@/app/control-center/projects/stage-actions";
import type { PortalStage, PortalStageStatus } from "@/lib/client-portal/types";
import type { SiteId } from "@/lib/control-center/types";

const initial: StageActionState = { status: "idle", message: "" };
const labels: Record<PortalStageStatus, string> = { not_started: "Not started", in_progress: "In progress", ready: "Ready for review", complete: "Complete" };
// Same stage color legend used across Projects/Beats/Clients: gray/blue/purple/green.
const barColor: Record<PortalStageStatus, string> = { not_started: "rgba(255,255,255,.15)", in_progress: "#60a5fa", ready: "#c4b5fd", complete: "#5ecb9a" };
const nameColor: Record<PortalStageStatus, string> = { not_started: "text-slate-500", in_progress: "text-blue-300", ready: "text-purple-300", complete: "text-emerald-300" };
const tinyField = "min-h-7 rounded-[4px] border border-white/15 bg-black/20 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-blue-400/60";

function StageColumn({ item, propertyId, projectId, canEdit, first }: { item: PortalStage; propertyId: SiteId; projectId: string; canEdit: boolean; first: boolean }) {
  const [state, action, pending] = useActionState(updatePortalStageAction, initial);
  return <form action={action} className={`flex-1 min-w-[150px] px-4 first:pl-0 ${first ? "" : "border-l border-white/15"}`}>
    <input type="hidden" name="property" value={propertyId} /><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="stage" value={item.stage} />
    <div className="mb-2 h-[3px] rounded-full" style={{ background: `linear-gradient(90deg, ${barColor[item.status]} ${item.progressPct}%, rgba(255,255,255,.12) ${item.progressPct}%)` }} />
    <p className={`font-serif text-sm capitalize ${nameColor[item.status]}`}>{item.stage}{item.progressPct > 0 && item.progressPct < 100 ? <span className="ml-1.5 font-sans text-[11px] text-blue-300">{item.progressPct}%</span> : null}</p>
    {canEdit ? <>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <select className={tinyField} name="status" defaultValue={item.status}>{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
        <input className={`${tinyField} w-12`} name="progressPct" type="number" min={0} max={100} defaultValue={item.progressPct} aria-label="Progress percent" />
        <button disabled={pending} aria-label="Save" className="grid h-7 w-7 place-items-center rounded-[4px] border border-white/15 text-slate-300 hover:border-blue-400/50 disabled:opacity-60">{pending ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}</button>
      </div>
      <input className={`${tinyField} mt-1 w-full`} name="clientNote" defaultValue={item.clientNote || ""} maxLength={500} placeholder="What should the client know?" />
      {state.message && <p className={`mt-1 text-[10px] ${state.status === "error" ? "text-red-300" : "text-emerald-300"}`}>{state.message}</p>}
    </> : <p className="mt-1 text-[11px] text-slate-500">{item.clientNote || labels[item.status]}</p>}
  </form>;
}

export function PortalStagePanel(props: { propertyId: SiteId; projectId: string; stages: PortalStage[]; canEdit: boolean; schemaUnavailable: boolean }) {
  if (props.schemaUnavailable) return <p className="rounded-[6px] border border-amber-300/20 bg-amber-300/5 p-4 text-xs text-amber-100">Apply the portal stage migration before updating progress.</p>;
  return <div className="flex flex-wrap gap-0 border-t border-white/15 pt-4">{props.stages.map((item, i) => <StageColumn key={item.stage} item={item} propertyId={props.propertyId} projectId={props.projectId} canEdit={props.canEdit} first={i === 0} />)}</div>;
}
