"use client";

import { useActionState } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";
import { addPortalFileAction, type AddPortalFileState } from "@/app/control-center/projects/portal-actions";
import type { PortalFile } from "@/lib/client-portal/types";
import type { SiteId } from "@/lib/control-center/types";

const initialState: AddPortalFileState = { status: "idle", message: "" };
const inputClass = "min-h-11 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600";

export function PortalFilePanel({ propertyId, projectId, files, canEdit, schemaUnavailable }: { propertyId: SiteId; projectId: string; files: PortalFile[]; canEdit: boolean; schemaUnavailable: boolean }) {
  const [state, action, pending] = useActionState(addPortalFileAction, initialState);
  if (schemaUnavailable) return <p className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-xs text-amber-100">Apply the Client Portal Supabase migration before adding Drive files.</p>;
  return <div>
    <div className="space-y-2">{files.length === 0 ? <p className="text-sm text-slate-500">No files have been shared with this client yet.</p> : files.map((file) => <a key={file.id} href={file.driveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/[.025] p-3 text-sm hover:border-sky-300/30"><span><strong className="font-medium text-slate-200">{file.title}</strong>{file.versionLabel && <span className="ml-2 text-xs text-slate-500">{file.versionLabel}</span>}</span><ExternalLink className="h-4 w-4 text-sky-300" /></a>)}</div>
    {canEdit && <form action={action} className="mt-5 grid gap-3 border-t border-white/8 pt-5 md:grid-cols-2">
      <input type="hidden" name="property" value={propertyId} /><input type="hidden" name="projectId" value={projectId} />
      <label className="grid gap-1 text-xs text-slate-400">File title<input className={inputClass} name="title" required maxLength={160} /></label>
      <label className="grid gap-1 text-xs text-slate-400">Type<select className={inputClass} name="fileType" defaultValue="audio"><option value="audio">Audio</option><option value="stems">Stems</option><option value="artwork">Artwork</option><option value="document">Document</option><option value="other">Other</option></select></label>
      <label className="grid gap-1 text-xs text-slate-400 md:col-span-2">Google Drive link<input className={inputClass} name="driveUrl" type="url" required placeholder="https://drive.google.com/file/d/..." /></label>
      <label className="grid gap-1 text-xs text-slate-400">Version<input className={inputClass} name="versionLabel" placeholder="Mix 3" /></label>
      <label className="grid gap-1 text-xs text-slate-400">Client note<input className={inputClass} name="note" placeholder="What changed in this version?" /></label>
      <div className="md:col-span-2"><button disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-300 px-4 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending && <LoaderCircle className="h-4 w-4 animate-spin" />}Add to Client Portal</button>{state.message && <p className={`mt-2 text-xs ${state.status === "error" ? "text-red-300" : "text-emerald-300"}`}>{state.message}</p>}</div>
    </form>}
  </div>;
}
