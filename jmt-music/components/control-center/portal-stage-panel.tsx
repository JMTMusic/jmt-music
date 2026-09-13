"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { updatePortalStageAction, type StageActionState } from "@/app/control-center/projects/stage-actions";
import type { PortalStage, PortalStageStatus } from "@/lib/client-portal/types";
import type { SiteId } from "@/lib/control-center/types";

const initial: StageActionState = { status: "idle", message: "" };
const labels: Record<PortalStageStatus, string> = { not_started: "Not started", in_progress: "In progress", ready: "Ready for review", complete: "Complete" };
const field = "min-h-11 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100";

function StageRow({ item, propertyId, projectId, canEdit }: { item: PortalStage; propertyId: SiteId; projectId: string; canEdit: boolean }) {
  const [state, action, pending] = useActionState(updatePortalStageAction, initial);
  return <form action={action} className="grid gap-3 rounded-xl border border-white/8 bg-white/[.025] p-4 md:grid-cols-[140px_180px_1fr_auto] md:items-end">
    <input type="hidden" name="property" value={propertyId} /><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="stage" value={item.stage} />
    <div><p className="text-xs font-bold uppercase tracking-wider text-sky-300">{item.stage}</p>{item.updatedAt && <p className="mt-1 text-[10px] text-slate-600">Updated {new Date(item.updatedAt).toLocaleDateString()}</p>}</div>
    <label className="grid gap-1 text-xs text-slate-400">Status<select className={field} name="status" defaultValue={item.status} disabled={!canEdit}>{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="grid gap-1 text-xs text-slate-400">Client-facing note<input className={field} name="clientNote" defaultValue={item.clientNote || ""} maxLength={500} disabled={!canEdit} placeholder="What should the client know?" /></label>
    {canEdit && <button disabled={pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending && <LoaderCircle className="h-4 w-4 animate-spin" />}Save</button>}
    {state.message && <p className={`text-xs md:col-span-4 ${state.status === "error" ? "text-red-300" : "text-emerald-300"}`}>{state.message}</p>}
  </form>;
}

export function PortalStagePanel(props: { propertyId: SiteId; projectId: string; stages: PortalStage[]; canEdit: boolean; schemaUnavailable: boolean }) {
  if (props.schemaUnavailable) return <p className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-xs text-amber-100">Apply the portal stage migration before updating progress.</p>;
  return <div className="space-y-3">{props.stages.map((item) => <StageRow key={item.stage} item={item} propertyId={props.propertyId} projectId={props.projectId} canEdit={props.canEdit} />)}</div>;
}
