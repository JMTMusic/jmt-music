"use client";

import { useActionState, useRef, useState, type ChangeEvent } from "react";
import { ExternalLink, LoaderCircle, Pencil, Upload } from "lucide-react";
import { addPortalFileAction, updatePortalFileAction, preparePortalAudioUpload, savePortalAudioPathAction, type AddPortalFileState } from "@/app/control-center/projects/portal-actions";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { PortalFile, PortalFileType } from "@/lib/client-portal/types";
import type { SiteId } from "@/lib/control-center/types";
import { workspacePanel } from "@/components/client-portal/workspace-shell";

const initialState: AddPortalFileState = { status: "idle", message: "" };
const inputClass = "min-h-10 rounded-[6px] border border-white/15 bg-black/20 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-blue-400/60";
const AUDIO_ACCEPT = "audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a";
const EXT_BADGE: Record<PortalFileType, string> = { audio: "AUD", stems: "ZIP", artwork: "IMG", document: "PDF", other: "FILE" };
const primaryBtn = "inline-flex min-h-9 items-center gap-2 rounded-[6px] bg-blue-400 px-3.5 text-xs font-medium text-[#04101f] hover:bg-blue-300 disabled:opacity-60";
const ghostBtn = "inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-white/15 px-2.5 text-xs text-slate-300 hover:border-blue-400/50 disabled:opacity-60";

function FileIcon({ type }: { type: PortalFileType }) {
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[5px] border border-white/15 bg-[#1c2431] font-mono text-[9px] text-slate-400">{EXT_BADGE[type]}</span>;
}

function PortalFileRow({ file, propertyId, projectId, canEdit }: { file: PortalFile; propertyId: SiteId; projectId: string; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [editState, editAction, editPending] = useActionState(updatePortalFileAction, initialState);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAudioUpload(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    setUploading(true);
    setUploadError("");
    try {
      const prepared = await preparePortalAudioUpload({ property: propertyId, projectId, fileId: file.id, type: picked.type, size: picked.size });
      if (prepared.status === "error") { setUploadError(prepared.message); return; }
      const upload = await getSupabaseBrowserClient().storage.from(prepared.bucket).uploadToSignedUrl(prepared.path, prepared.token, picked, { contentType: picked.type || "audio/mpeg" });
      if (upload.error) { setUploadError("Audio upload failed."); return; }
      const formData = new FormData();
      formData.set("property", propertyId);
      formData.set("projectId", projectId);
      formData.set("fileId", file.id);
      formData.set("previewAudioPath", prepared.path);
      const result = await savePortalAudioPathAction(initialState, formData);
      if (result.status === "error") setUploadError(result.message);
    } catch {
      setUploadError("Audio upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (editing) {
    return <form action={editAction} className={`${workspacePanel} grid gap-2 border-blue-400/25 bg-blue-400/[.03] p-3 md:grid-cols-2`}>
      <input type="hidden" name="property" value={propertyId} /><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="fileId" value={file.id} />
      <label className="grid gap-1 text-[10.5px] uppercase tracking-[.12em] text-slate-500">Title<input className={inputClass} name="title" defaultValue={file.title} required maxLength={160} /></label>
      <label className="grid gap-1 text-[10.5px] uppercase tracking-[.12em] text-slate-500">Version<input className={inputClass} name="versionLabel" defaultValue={file.versionLabel || ""} /></label>
      <label className="grid gap-1 text-[10.5px] uppercase tracking-[.12em] text-slate-500">BPM<input className={inputClass} name="bpm" defaultValue={file.bpm || ""} maxLength={20} /></label>
      <label className="grid gap-1 text-[10.5px] uppercase tracking-[.12em] text-slate-500">Key<input className={inputClass} name="musicalKey" defaultValue={file.musicalKey || ""} maxLength={20} /></label>
      <label className="grid gap-1 text-[10.5px] uppercase tracking-[.12em] text-slate-500 md:col-span-2">Google Drive link<input className={inputClass} name="driveUrl" type="url" defaultValue={file.driveUrl} required /></label>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <button disabled={editPending} className={primaryBtn}>{editPending && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}Save</button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-slate-400 hover:text-slate-200">Cancel</button>
        {editState.message && <span className={`text-xs ${editState.status === "error" ? "text-red-300" : "text-emerald-300"}`}>{editState.message}</span>}
      </div>
    </form>;
  }

  return <div className={`${workspacePanel} p-3 text-sm`}>
    <div className="flex items-center justify-between gap-4">
      <a href={file.driveUrl} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-3 hover:text-blue-300">
        <FileIcon type={file.fileType} />
        <span className="min-w-0 truncate">
          <strong className="font-medium text-slate-200">{file.title}</strong>
          {(file.versionLabel || file.bpm || file.musicalKey) && <span className="ml-2 text-xs text-slate-500">{[file.versionLabel, file.bpm, file.musicalKey].filter(Boolean).join(" · ")}</span>}
          {file.previewAudioPath && <span className="ml-2 rounded-full border border-emerald-400/30 px-2 py-0.5 text-[10px] text-emerald-300">Live audio</span>}
        </span>
        <ExternalLink className="ml-auto h-4 w-4 shrink-0 text-blue-300" />
      </a>
    </div>
    {canEdit && <div className="mt-2.5 flex shrink-0 items-center gap-2 border-t border-white/10 pt-2.5">
      {file.fileType === "audio" && <>
        <input ref={fileInputRef} type="file" accept={AUDIO_ACCEPT} className="hidden" onChange={handleAudioUpload} />
        <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} className={ghostBtn}>{uploading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}Audio</button>
      </>}
      <button type="button" onClick={() => setEditing(true)} className={ghostBtn}><Pencil className="h-3.5 w-3.5" />Edit</button>
    </div>}
    {uploadError && <p className="mt-2 text-xs text-red-300">{uploadError}</p>}
  </div>;
}

export function PortalFilePanel({ propertyId, projectId, files, canEdit, schemaUnavailable }: { propertyId: SiteId; projectId: string; files: PortalFile[]; canEdit: boolean; schemaUnavailable: boolean }) {
  const [state, action, pending] = useActionState(addPortalFileAction, initialState);
  if (schemaUnavailable) return <p className="rounded-[6px] border border-amber-300/20 bg-amber-300/5 p-4 text-xs text-amber-100">Apply the Client Portal Supabase migration before adding Drive files.</p>;
  return <div>
    <div className="space-y-2">{files.length === 0 ? <p className="text-sm text-slate-500">No files have been shared with this client yet.</p> : files.map((file) => <PortalFileRow key={file.id} file={file} propertyId={propertyId} projectId={projectId} canEdit={canEdit} />)}</div>
    {canEdit && <form action={action} className={`${workspacePanel} mt-4 grid gap-3 p-4 md:grid-cols-2`}>
      <input type="hidden" name="property" value={propertyId} /><input type="hidden" name="projectId" value={projectId} />
      <label className="grid gap-1 text-[10.5px] uppercase tracking-[.12em] text-slate-500">File title<input className={inputClass} name="title" required maxLength={160} /></label>
      <label className="grid gap-1 text-[10.5px] uppercase tracking-[.12em] text-slate-500">Type<select className={inputClass} name="fileType" defaultValue="audio"><option value="audio">Audio</option><option value="stems">Stems</option><option value="artwork">Artwork</option><option value="document">Document</option><option value="other">Other</option></select></label>
      <label className="grid gap-1 text-[10.5px] uppercase tracking-[.12em] text-slate-500 md:col-span-2">Google Drive link<input className={inputClass} name="driveUrl" type="url" required placeholder="https://drive.google.com/file/d/..." /></label>
      <label className="grid gap-1 text-[10.5px] uppercase tracking-[.12em] text-slate-500">Version<input className={inputClass} name="versionLabel" placeholder="Mix 3" /></label>
      <label className="grid gap-1 text-[10.5px] uppercase tracking-[.12em] text-slate-500">BPM<input className={inputClass} name="bpm" placeholder="120" maxLength={20} /></label>
      <label className="grid gap-1 text-[10.5px] uppercase tracking-[.12em] text-slate-500">Key<input className={inputClass} name="musicalKey" placeholder="F minor" maxLength={20} /></label>
      <label className="grid gap-1 text-[10.5px] uppercase tracking-[.12em] text-slate-500">Client note<input className={inputClass} name="note" placeholder="What changed in this version?" /></label>
      <div className="md:col-span-2"><button disabled={pending} className={primaryBtn}>{pending && <LoaderCircle className="h-4 w-4 animate-spin" />}Add to Client Portal</button>{state.message && <p className={`mt-2 text-xs ${state.status === "error" ? "text-red-300" : "text-emerald-300"}`}>{state.message}</p>}</div>
    </form>}
  </div>;
}
