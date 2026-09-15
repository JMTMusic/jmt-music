"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Check, Download, FileAudio, LoaderCircle, MessageSquare, Pause, Pencil, Play, Send, Upload } from "lucide-react";
import type { PortalFile, PortalFileType } from "@/lib/client-portal/types";
import type { SiteId } from "@/lib/control-center/types";
import {
  addPortalFileAction,
  addStaffPortalCommentAction,
  preparePortalAudioUpload,
  savePortalAudioPathAction,
  updatePortalFileAction,
  type AddPortalFileState
} from "@/app/control-center/projects/portal-actions";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { workspacePanel } from "@/components/client-portal/workspace-shell";

const initialState: AddPortalFileState = { status: "idle", message: "" };
const inputClass = "min-h-9 rounded-[6px] border border-white/15 bg-black/20 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-blue-400/60";
const AUDIO_ACCEPT = "audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a";
const EXT_BADGE: Record<PortalFileType, string> = { audio: "AUD", stems: "ZIP", artwork: "IMG", document: "PDF", other: "FILE" };

function panelTitle(children: React.ReactNode) {
  return <div className="border-b border-white/10 bg-[#1a2230] px-4 py-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">{children}</div>;
}
function time(value: number | null) {
  if (value === null) return "";
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
function date(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

export function AdminMixRoom({ propertyId, projectId, files, canEdit }: { propertyId: SiteId; projectId: string; files: PortalFile[]; canEdit: boolean }) {
  const songs = useMemo(() => files.filter((file) => file.fileType === "audio"), [files]);
  const [selectedId, setSelectedId] = useState(songs[0]?.id || files[0]?.id || "");
  const selected = files.find((file) => file.id === selectedId) || songs[0] || files[0];
  const comments = useMemo(() => files.flatMap((file) => file.comments.map((comment) => ({ ...comment, file }))).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [files]);
  const commentAction = addStaffPortalCommentAction.bind(null, projectId);

  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const bars = useMemo(() => Array.from({ length: 112 }, (_, index) => 18 + ((index * 29 + index * index * 7) % 70)), []);
  useEffect(() => { setPlaying(false); setCurrentTime(0); setDuration(0); }, [selectedId]);

  const [editing, setEditing] = useState(false);
  const [editState, editAction, editPending] = useActionState(updatePortalFileAction, initialState);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [addingFile, setAddingFile] = useState(false);
  const [addState, addAction, addPending] = useActionState(addPortalFileAction, initialState);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function togglePlayback() {
    if (!audio.current) return;
    if (audio.current.paused) void audio.current.play(); else audio.current.pause();
  }
  function scrub(event: React.MouseEvent<HTMLDivElement>) {
    if (!audio.current || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    audio.current.currentTime = Math.max(0, Math.min(duration, ((event.clientX - rect.left) / rect.width) * duration));
  }

  async function handleAudioUpload(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked || !selected) return;
    setUploading(true);
    setUploadError("");
    try {
      const prepared = await preparePortalAudioUpload({ property: propertyId, projectId, fileId: selected.id, type: picked.type, size: picked.size });
      if (prepared.status === "error") { setUploadError(prepared.message); return; }
      const upload = await getSupabaseBrowserClient().storage.from(prepared.bucket).uploadToSignedUrl(prepared.path, prepared.token, picked, { contentType: picked.type || "audio/mpeg" });
      if (upload.error) { setUploadError("Audio upload failed."); return; }
      const formData = new FormData();
      formData.set("property", propertyId);
      formData.set("projectId", projectId);
      formData.set("fileId", selected.id);
      formData.set("previewAudioPath", prepared.path);
      const result = await savePortalAudioPathAction(initialState, formData);
      if (result.status === "error") setUploadError(result.message);
    } catch {
      setUploadError("Audio upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return <div className="pb-12">
    <div className="mt-[26px] grid gap-[18px] xl:grid-cols-[214px_minmax(0,1fr)_316px]">
      <aside className={`${workspacePanel} self-start overflow-hidden`}>
        {panelTitle("Songs")}
        {songs.length ? <div className="p-2">{songs.map((file, index) => <button key={file.id} onClick={() => setSelectedId(file.id)} className={`mb-1 flex w-full items-center gap-3 rounded-[5px] border px-3 py-3 text-left transition ${selected?.id === file.id ? "border-blue-400/35 bg-blue-400/10" : "border-transparent hover:bg-white/5"}`}>
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${selected?.id === file.id ? "bg-blue-400 text-[#07101c]" : "bg-white/8 text-slate-400"}`}>{selected?.id === file.id ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}</span>
          <span className="min-w-0"><strong className="block truncate text-xs font-semibold text-slate-100">{file.title}</strong><span className="mt-1 block text-[10px] text-slate-500">{file.versionLabel || `Track ${index + 1}`}</span></span>
        </button>)}</div> : <div className="p-5 text-xs leading-5 text-slate-500">No songs uploaded yet — add an audio file below.</div>}
      </aside>

      <div className="min-w-0">
        <section className={`${workspacePanel} overflow-hidden p-[16px_18px_18px]`}>
          {selected ? <>
            <div className="mb-1 flex flex-wrap items-start gap-3">
              <div className="min-w-[180px] flex-1"><h2 className="font-serif text-[21px] leading-tight text-white">{selected.title}</h2><p className="mt-1 text-[11.5px] text-slate-500">{[selected.bpm, selected.musicalKey, selected.versionLabel || selected.fileType].filter(Boolean).join(" · ")}</p></div>
              {selected.approval && <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${selected.approval.status === "approved" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-amber-300/30 bg-amber-300/10 text-amber-200"}`}>{selected.approval.status.replace("_", " ")}</span>}
              {canEdit && <button type="button" onClick={() => setEditing((value) => !value)} className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-white/15 px-2.5 text-xs text-slate-300 hover:border-blue-400/50"><Pencil className="h-3.5 w-3.5" />Edit details</button>}
            </div>

            {editing && <form action={editAction} className="mb-3 grid gap-2 rounded-[6px] border border-blue-400/25 bg-blue-400/[.04] p-3 sm:grid-cols-2">
              <input type="hidden" name="property" value={propertyId} /><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="fileId" value={selected.id} />
              <label className="grid gap-1 text-[10px] uppercase tracking-[.1em] text-slate-500">Title<input className={inputClass} name="title" defaultValue={selected.title} required maxLength={160} /></label>
              <label className="grid gap-1 text-[10px] uppercase tracking-[.1em] text-slate-500">Version<input className={inputClass} name="versionLabel" defaultValue={selected.versionLabel || ""} /></label>
              <label className="grid gap-1 text-[10px] uppercase tracking-[.1em] text-slate-500">BPM<input className={inputClass} name="bpm" defaultValue={selected.bpm || ""} maxLength={20} /></label>
              <label className="grid gap-1 text-[10px] uppercase tracking-[.1em] text-slate-500">Key<input className={inputClass} name="musicalKey" defaultValue={selected.musicalKey || ""} maxLength={20} /></label>
              <label className="grid gap-1 text-[10px] uppercase tracking-[.1em] text-slate-500 sm:col-span-2">Google Drive link<input className={inputClass} name="driveUrl" type="url" defaultValue={selected.driveUrl} required /></label>
              <div className="flex items-center gap-3 sm:col-span-2">
                <button disabled={editPending} className="inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-blue-400 px-3 text-xs font-medium text-[#04101f] hover:bg-blue-300 disabled:opacity-60">{editPending && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}Save</button>
                <button type="button" onClick={() => setEditing(false)} className="text-xs text-slate-400">Cancel</button>
                {editState.message && <span className={`text-xs ${editState.status === "error" ? "text-red-300" : "text-emerald-300"}`}>{editState.message}</span>}
              </div>
            </form>}

            {canEdit && selected.fileType === "audio" && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[6px] border border-dashed border-white/20 bg-white/[.02] px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">Admin</span>
              <input ref={fileInputRef} type="file" accept={AUDIO_ACCEPT} className="hidden" onChange={handleAudioUpload} />
              <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-white/15 px-2.5 text-xs text-slate-300 hover:border-blue-400/50 disabled:opacity-60">{uploading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}Upload waveform audio</button>
              <span className="text-[11px] text-slate-500">{selected.previewAudioPath ? "Live audio uploaded" : "Sample playback — no audio uploaded yet"}</span>
              {uploadError && <span className="text-[11px] text-red-300">{uploadError}</span>}
            </div>}

            {selected.fileType === "audio" ? <>
              <audio key={selected.id} ref={audio} src={selected.previewAudioUrl || undefined} preload="metadata" onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
              <div className="relative pt-[22px]">
                <div onClick={scrub} className="flex h-24 cursor-pointer items-center gap-[2px]" aria-label="Audio waveform — click to scrub">{bars.map((height, index) => { const played = duration ? index / bars.length <= currentTime / duration : false; return <span key={index} className={`min-w-0 flex-1 rounded-full ${played ? "bg-blue-400" : "bg-[#334052]"}`} style={{ height: `${height}%` }} />; })}<span className="absolute bottom-0 top-[22px] w-px bg-blue-200" style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }} /></div>
              </div>
            </> : <div className="grid h-24 place-items-center text-center"><div><FileAudio className="mx-auto mb-2 h-6 w-6 text-blue-300" /><p className="text-xs text-slate-400">Open this delivery in Google Drive.</p></div></div>}
            <div className="mt-3 flex flex-wrap items-center gap-[14px]">
              {selected.fileType === "audio" && selected.previewAudioUrl && <button onClick={togglePlayback} aria-label={playing ? "Pause" : "Play"} className="grid h-[38px] w-[38px] place-items-center rounded-full bg-blue-400 text-[#07101c]">{playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}</button>}
              <span className="font-mono text-[12.5px] text-slate-500"><b className="font-medium text-slate-100">{time(Math.floor(currentTime))}</b> / {duration ? time(Math.floor(duration)) : "0:00"}</span><span className="flex-1" />
              <a href={selected.driveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-white/15 px-3 text-xs font-medium text-slate-300"><Download className="h-3.5 w-3.5" />Open file</a>
            </div>
            {canEdit && <form action={commentAction} className="mt-[14px] flex flex-wrap items-stretch gap-2"><input type="hidden" name="fileId" value={selected.id} /><input type="hidden" name="authorName" value="Jonathan" /><input name="timestamp" type="hidden" value={Math.floor(currentTime)} /><span className="flex items-center rounded-[6px] border border-blue-400/40 bg-blue-400/10 px-2.5 font-mono text-xs text-blue-300">{time(Math.floor(currentTime))}</span><input name="body" required maxLength={2000} placeholder="Note at this timecode — e.g. vocal feels buried here" className="min-w-[180px] flex-1 rounded-[6px] border border-white/15 bg-[#1a2230] px-3 py-2 text-xs text-white outline-none focus:border-blue-400/60" /><button className="rounded-[6px] bg-blue-400 px-3.5 text-xs font-medium text-[#04101f]">Add note</button></form>}
          </> : <div className="grid min-h-72 place-items-center p-8 text-center text-sm text-slate-500">Add a song below to start the mix room.</div>}
        </section>

        <section className={`${workspacePanel} mt-[18px] overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-white/10 bg-[#1a2230] px-4 py-3"><span className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Files</span>{canEdit && <button type="button" onClick={() => setAddingFile((value) => !value)} className="text-[10px] font-bold uppercase tracking-[.1em] text-blue-300 hover:text-blue-200">+ Add file</button>}</div>
          {addingFile && <form action={addAction} className="grid gap-2 border-b border-white/10 bg-blue-400/[.03] p-3 sm:grid-cols-2">
            <input type="hidden" name="property" value={propertyId} /><input type="hidden" name="projectId" value={projectId} />
            <label className="grid gap-1 text-[10px] uppercase tracking-[.1em] text-slate-500">Title<input className={inputClass} name="title" required maxLength={160} /></label>
            <label className="grid gap-1 text-[10px] uppercase tracking-[.1em] text-slate-500">Type<select className={inputClass} name="fileType" defaultValue="audio"><option value="audio">Audio</option><option value="stems">Stems</option><option value="artwork">Artwork</option><option value="document">Document</option><option value="other">Other</option></select></label>
            <label className="grid gap-1 text-[10px] uppercase tracking-[.1em] text-slate-500 sm:col-span-2">Google Drive link<input className={inputClass} name="driveUrl" type="url" required placeholder="https://drive.google.com/file/d/..." /></label>
            <label className="grid gap-1 text-[10px] uppercase tracking-[.1em] text-slate-500">Version<input className={inputClass} name="versionLabel" placeholder="Mix 3" /></label>
            <label className="grid gap-1 text-[10px] uppercase tracking-[.1em] text-slate-500">BPM<input className={inputClass} name="bpm" placeholder="120" maxLength={20} /></label>
            <label className="grid gap-1 text-[10px] uppercase tracking-[.1em] text-slate-500">Key<input className={inputClass} name="musicalKey" placeholder="F minor" maxLength={20} /></label>
            <label className="grid gap-1 text-[10px] uppercase tracking-[.1em] text-slate-500">Client note<input className={inputClass} name="note" placeholder="What changed?" /></label>
            <div className="sm:col-span-2"><button disabled={addPending} className="inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-blue-400 px-3 text-xs font-medium text-[#04101f] disabled:opacity-60">{addPending && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}Add to Client Portal</button>{addState.message && <span className={`ml-3 text-xs ${addState.status === "error" ? "text-red-300" : "text-emerald-300"}`}>{addState.message}</span>}</div>
          </form>}
          {files.length ? <div className="divide-y divide-white/8">{files.map((file) => <button key={file.id} onClick={() => setSelectedId(file.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[.035]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-[5px] border border-white/15 bg-[#1c2431] font-mono text-[9px] text-slate-400">{EXT_BADGE[file.fileType]}</span><span className="min-w-0 flex-1"><strong className="block truncate text-xs text-slate-100">{file.title}</strong><span className="text-[10px] text-slate-500">{file.versionLabel || file.fileType} · Added {date(file.createdAt)}</span></span><Download className="h-4 w-4 text-slate-500" /></button>)}</div> : <div className="p-6 text-xs text-slate-500">No files have been shared yet.</div>}
        </section>
      </div>

      <aside className={`${workspacePanel} self-start overflow-hidden xl:sticky xl:top-20`}>
        {panelTitle("Activity")}
        <div className="max-h-[590px] overflow-y-auto p-4">{comments.length ? <div className="space-y-5">{comments.map((item) => <div key={item.id} className="flex gap-3"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[9px] font-bold ${item.authorType === "staff" ? "bg-blue-400/20 text-blue-200" : "bg-emerald-400/15 text-emerald-300"}`}>{item.authorName.slice(0, 2).toUpperCase()}</span><div className="min-w-0"><div className="text-[11px]"><strong className="text-slate-200">{item.authorName}</strong><span className="ml-2 text-slate-600">{date(item.createdAt)}</span></div><p className="mt-1 text-xs leading-5 text-slate-400">{item.body}</p><button onClick={() => setSelectedId(item.file.id)} className="mt-1 text-[10px] text-blue-300">{item.file.title}{item.timestampSeconds !== null ? ` · ${time(item.timestampSeconds)}` : ""}</button></div></div>)}</div> : <div className="py-10 text-center"><MessageSquare className="mx-auto mb-3 h-5 w-5 text-slate-600" /><p className="text-xs text-slate-500">Client notes and your replies show up here.</p></div>}</div>
        {selected && canEdit && <form action={commentAction} className="flex gap-2 border-t border-white/10 p-3"><input type="hidden" name="fileId" value={selected.id} /><input type="hidden" name="authorName" value="Jonathan" /><input name="body" required maxLength={2000} placeholder="Reply to the client…" className="min-w-0 flex-1 rounded-[6px] border border-white/15 bg-[#0b111a] px-3 text-xs text-white" /><button aria-label="Send message" className="grid h-9 w-9 place-items-center rounded-[6px] border border-white/15 text-slate-300 hover:border-blue-400/50"><Send className="h-3.5 w-3.5" /></button></form>}
      </aside>
    </div>
  </div>;
}
