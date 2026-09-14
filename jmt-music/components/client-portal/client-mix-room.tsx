"use client";

import { useMemo, useState } from "react";
import { Check, Download, FileAudio, MessageSquare, Pause, Play, Send } from "lucide-react";
import type { ClientPortalView, PortalFile } from "@/lib/client-portal/types";
import { addPortalCommentAction, setPortalApprovalAction } from "@/app/portal/[token]/actions";
import { workspacePanel } from "./workspace-shell";

function drivePreviewUrl(url: string) {
  try {
    const parsed = new URL(url);
    const pathMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    const id = pathMatch?.[1] || parsed.searchParams.get("id");
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  } catch { return null; }
}

function time(value: number | null) {
  if (value === null) return "";
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function date(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-white/10 bg-[#1a2230] px-4 py-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">{children}</div>;
}

export function ClientMixRoom({ view, accessToken, clientName }: { view: ClientPortalView; accessToken: string; clientName: string }) {
  const songs = view.files.filter((file) => file.fileType === "audio");
  const [selectedId, setSelectedId] = useState(songs[0]?.id || view.files[0]?.id || "");
  const selected = view.files.find((file) => file.id === selectedId) || songs[0] || view.files[0];
  const comments = useMemo(() => view.files.flatMap((file) => file.comments.map((comment) => ({ ...comment, file }))).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [view.files]);
  const commentAction = addPortalCommentAction.bind(null, accessToken);
  const approvalAction = setPortalApprovalAction.bind(null, accessToken);

  return <div className="pb-12">
    <div className="mb-3 text-[11px] text-slate-500">Projects&nbsp;&nbsp;/&nbsp;&nbsp;<span className="text-slate-300">{view.project.title}</span></div>
    <div className="grid gap-3 xl:grid-cols-[214px_minmax(0,1fr)_316px]">
      <aside className={`${workspacePanel} self-start overflow-hidden`}>
        <PanelTitle>Songs</PanelTitle>
        {songs.length ? <div className="p-2">{songs.map((file, index) => <button key={file.id} onClick={() => setSelectedId(file.id)} className={`mb-1 flex w-full items-center gap-3 rounded-[5px] border px-3 py-3 text-left transition ${selected?.id === file.id ? "border-blue-400/35 bg-blue-400/10" : "border-transparent hover:bg-white/5"}`}>
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${selected?.id === file.id ? "bg-blue-400 text-[#07101c]" : "bg-white/8 text-slate-400"}`}>{selected?.id === file.id ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}</span>
          <span className="min-w-0"><strong className="block truncate text-xs font-semibold text-slate-100">{file.title}</strong><span className="mt-1 block text-[10px] text-slate-500">{file.versionLabel || `Track ${index + 1}`}</span></span>
        </button>)}</div> : <div className="p-5 text-xs leading-5 text-slate-500">No audio files have been shared yet.</div>}
      </aside>

      <div className="min-w-0 space-y-3">
        <section className={`${workspacePanel} overflow-hidden`}>
          <PanelTitle>Now playing</PanelTitle>
          {selected ? <>
            <div className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-blue-300">{selected.fileType} {selected.versionLabel ? `· ${selected.versionLabel}` : ""}</p><h2 className="mt-2 font-serif text-3xl text-white">{selected.title}</h2><p className="mt-1 text-xs text-slate-500">{view.client.artistName} · {view.project.title}</p></div>
              {selected.approval && <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${selected.approval.status === "approved" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-amber-300/30 bg-amber-300/10 text-amber-200"}`}>{selected.approval.status.replace("_", " ")}</span>}
            </div>
            {selected.fileType === "audio" && drivePreviewUrl(selected.driveUrl) ? <div className="border-y border-white/10 bg-[#070b11] px-5 py-4"><iframe key={selected.id} src={drivePreviewUrl(selected.driveUrl)!} title={`Play ${selected.title}`} allow="autoplay" className="h-[86px] w-full border-0" /></div> : <div className="grid min-h-32 place-items-center border-y border-white/10 bg-[#070b11] px-5 text-center"><div><FileAudio className="mx-auto mb-2 h-6 w-6 text-blue-300" /><p className="text-xs text-slate-400">Preview is available in Google Drive.</p></div></div>}
            <div className="flex flex-wrap items-center gap-2 p-4">
              <a href={selected.driveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-[5px] bg-blue-400 px-4 text-xs font-bold text-[#07101c]"><Download className="h-4 w-4" />Open file</a>
              <form action={approvalAction} className="contents"><input type="hidden" name="fileId" value={selected.id} /><input type="hidden" name="clientName" value={clientName} /><button name="status" value="approved" className="inline-flex h-10 items-center gap-2 rounded-[5px] border border-emerald-400/35 px-4 text-xs font-bold text-emerald-300"><Check className="h-4 w-4" />Approve</button><button name="status" value="changes_requested" className="h-10 rounded-[5px] border border-white/15 px-4 text-xs font-bold text-slate-300">Request changes</button></form>
            </div>
            <form action={commentAction} className="flex gap-2 border-t border-white/10 bg-[#0b111a] p-4"><input type="hidden" name="fileId" value={selected.id} /><input type="hidden" name="authorName" value={clientName} /><input name="timestamp" type="number" min="0" aria-label="Timestamp in seconds" placeholder="0:00" className="w-16 rounded-[5px] border border-white/15 bg-black/20 px-2 text-xs text-slate-300" /><input name="body" required maxLength={2000} placeholder="Leave a comment at this point…" className="min-w-0 flex-1 rounded-[5px] border border-white/15 bg-black/20 px-3 text-xs text-white outline-none focus:border-blue-400/60" /><button aria-label="Send comment" className="grid h-10 w-10 place-items-center rounded-[5px] bg-blue-400 text-[#07101c]"><Send className="h-4 w-4" /></button></form>
          </> : <div className="grid min-h-72 place-items-center p-8 text-center text-sm text-slate-500">Your first delivery will appear here.</div>}
        </section>

        <section className={`${workspacePanel} overflow-hidden`}><PanelTitle>Files</PanelTitle>{view.files.length ? <div className="divide-y divide-white/8">{view.files.map((file) => <button key={file.id} onClick={() => setSelectedId(file.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[.035]"><span className="grid h-9 w-9 place-items-center rounded-[5px] bg-blue-400/10 text-blue-300"><FileAudio className="h-4 w-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-xs text-slate-100">{file.title}</strong><span className="text-[10px] text-slate-500">{file.versionLabel || file.fileType} · Added {date(file.createdAt)}</span></span><Download className="h-4 w-4 text-slate-500" /></button>)}</div> : <div className="p-6 text-xs text-slate-500">No files have been shared yet.</div>}</section>
      </div>

      <aside className={`${workspacePanel} self-start overflow-hidden xl:sticky xl:top-20`}>
        <PanelTitle>Activity</PanelTitle>
        <div className="max-h-[660px] overflow-y-auto p-4">{comments.length ? <div className="space-y-5">{comments.map((item) => <div key={item.id} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-400/15 text-[9px] font-bold text-blue-300">{item.authorName.slice(0, 2).toUpperCase()}</span><div className="min-w-0"><div className="text-[11px]"><strong className="text-slate-200">{item.authorName}</strong><span className="ml-2 text-slate-600">{date(item.createdAt)}</span></div><p className="mt-1 text-xs leading-5 text-slate-400">{item.body}</p><button onClick={() => setSelectedId(item.file.id)} className="mt-1 text-[10px] text-blue-300">{item.file.title}{item.timestampSeconds !== null ? ` · ${time(item.timestampSeconds)}` : ""}</button></div></div>)}</div> : <div className="py-10 text-center"><MessageSquare className="mx-auto mb-3 h-5 w-5 text-slate-600" /><p className="text-xs text-slate-500">Comments and feedback will appear here.</p></div>}</div>
      </aside>
    </div>
  </div>;
}
