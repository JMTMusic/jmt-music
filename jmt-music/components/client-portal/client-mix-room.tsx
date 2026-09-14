"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, FileAudio, MessageSquare, Pause, Play, Send } from "lucide-react";
import type { ClientPortalView } from "@/lib/client-portal/types";
import { addPortalCommentAction, setPortalApprovalAction } from "@/app/portal/[token]/actions";
import { workspacePanel } from "./workspace-shell";

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
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const bars = useMemo(() => Array.from({ length: 112 }, (_, index) => 18 + ((index * 29 + index * index * 7) % 70)), []);
  useEffect(() => { setPlaying(false); setCurrentTime(0); setDuration(0); }, [selectedId]);

  function togglePlayback() {
    if (!audio.current) return;
    if (audio.current.paused) void audio.current.play(); else audio.current.pause();
  }

  function scrub(event: React.MouseEvent<HTMLDivElement>) {
    if (!audio.current || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    audio.current.currentTime = Math.max(0, Math.min(duration, ((event.clientX - rect.left) / rect.width) * duration));
  }

  return <div className="pb-12">
    <div className="mb-3 text-[11px] text-slate-500">Projects&nbsp;&nbsp;/&nbsp;&nbsp;<span className="text-slate-300">{view.project.title}</span></div>
    <div className="mt-[26px] grid gap-[18px] xl:grid-cols-[214px_minmax(0,1fr)_316px]">
      <aside className={`${workspacePanel} self-start overflow-hidden`}>
        <PanelTitle>Songs</PanelTitle>
        {songs.length ? <div className="p-2">{songs.map((file, index) => <button key={file.id} onClick={() => setSelectedId(file.id)} className={`mb-1 flex w-full items-center gap-3 rounded-[5px] border px-3 py-3 text-left transition ${selected?.id === file.id ? "border-blue-400/35 bg-blue-400/10" : "border-transparent hover:bg-white/5"}`}>
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${selected?.id === file.id ? "bg-blue-400 text-[#07101c]" : "bg-white/8 text-slate-400"}`}>{selected?.id === file.id ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}</span>
          <span className="min-w-0"><strong className="block truncate text-xs font-semibold text-slate-100">{file.title}</strong><span className="mt-1 block text-[10px] text-slate-500">{file.versionLabel || `Track ${index + 1}`}</span></span>
        </button>)}</div> : <div className="p-5 text-xs leading-5 text-slate-500">No audio files have been shared yet.</div>}
      </aside>

      <div className="min-w-0">
        <section className={`${workspacePanel} overflow-hidden p-[16px_18px_18px]`}>
          {selected ? <>
            <div className="mb-4 flex flex-wrap items-start gap-3">
              <div className="min-w-[180px] flex-1"><h2 className="font-serif text-[21px] leading-tight text-white">{selected.title}</h2><p className="mt-1 text-[11.5px] text-slate-500">{[view.client.artistName, selected.bpm, selected.musicalKey, selected.versionLabel || selected.fileType].filter(Boolean).join(" · ")}</p></div>
              {selected.approval && <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${selected.approval.status === "approved" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-amber-300/30 bg-amber-300/10 text-amber-200"}`}>{selected.approval.status.replace("_", " ")}</span>}
            </div>
            {selected.fileType === "audio" ? <>
              {/* previewAudioUrl is a short-lived signed Supabase Storage URL (the fast, seekable playback copy).
                  Older songs without an uploaded preview fall back to proxying the Drive master. */}
              <audio key={selected.id} ref={audio} src={selected.previewAudioUrl || `/api/portal/${encodeURIComponent(accessToken)}/files/${encodeURIComponent(selected.id)}/audio`} preload="metadata" onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
              <div className="relative pt-[22px]">
                <div onClick={scrub} className="flex h-24 cursor-pointer items-center gap-[2px]" aria-label="Audio waveform — click to scrub">{bars.map((height, index) => { const played = duration ? index / bars.length <= currentTime / duration : false; return <span key={index} className={`min-w-0 flex-1 rounded-full ${played ? "bg-blue-400" : "bg-[#334052]"}`} style={{ height: `${height}%` }} />; })}<span className="absolute bottom-0 top-[22px] w-px bg-blue-200" style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }} /></div>
              </div>
            </> : <div className="grid h-24 place-items-center text-center"><div><FileAudio className="mx-auto mb-2 h-6 w-6 text-blue-300" /><p className="text-xs text-slate-400">Open this delivery in Google Drive.</p></div></div>}
            <div className="mt-3 flex flex-wrap items-center gap-[14px]">
              {selected.fileType === "audio" && <button onClick={togglePlayback} aria-label={playing ? "Pause" : "Play"} className="grid h-[38px] w-[38px] place-items-center rounded-full bg-blue-400 text-[#07101c]">{playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}</button>}
              <span className="font-mono text-[12.5px] text-slate-500"><b className="font-medium text-slate-100">{time(Math.floor(currentTime))}</b> / {duration ? time(Math.floor(duration)) : "0:00"}</span><span className="flex-1" />
              <a href={selected.driveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-[5px] border border-white/15 px-3 text-xs font-medium text-slate-300"><Download className="h-3.5 w-3.5" />Open file</a>
              <form action={approvalAction} className="contents"><input type="hidden" name="fileId" value={selected.id} /><input type="hidden" name="clientName" value={clientName} /><button name="status" value="approved" className="inline-flex h-9 items-center gap-2 rounded-[5px] border border-emerald-400/35 px-3 text-xs font-medium text-emerald-300"><Check className="h-3.5 w-3.5" />Approve</button><button name="status" value="changes_requested" className="h-9 rounded-[5px] border border-white/15 px-3 text-xs font-medium text-slate-300">Request changes</button></form>
            </div>
            <form action={commentAction} className="mt-[14px] flex flex-wrap items-stretch gap-2"><input type="hidden" name="fileId" value={selected.id} /><input type="hidden" name="authorName" value={clientName} /><input name="timestamp" type="hidden" value={Math.floor(currentTime)} /><span className="flex items-center rounded-[5px] border border-blue-400/40 bg-blue-400/10 px-2.5 font-mono text-xs text-blue-300">{time(Math.floor(currentTime))}</span><input name="body" required maxLength={2000} placeholder="Note at this timecode — e.g. vocal feels buried here" className="min-w-[180px] flex-1 rounded-[5px] border border-white/15 bg-[#1a2230] px-3 py-2 text-xs text-white outline-none focus:border-blue-400/60" /><button className="rounded-[5px] bg-blue-400 px-3.5 text-xs font-medium text-[#07101c]">Add note</button></form>
          </> : <div className="grid min-h-72 place-items-center p-8 text-center text-sm text-slate-500">Your first delivery will appear here.</div>}
        </section>

        <section className={`${workspacePanel} mt-[18px] overflow-hidden`}><PanelTitle>Files</PanelTitle>{view.files.length ? <div className="divide-y divide-white/8">{view.files.map((file) => <button key={file.id} onClick={() => setSelectedId(file.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[.035]"><span className="grid h-9 w-9 place-items-center rounded-[5px] bg-blue-400/10 text-blue-300"><FileAudio className="h-4 w-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-xs text-slate-100">{file.title}</strong><span className="text-[10px] text-slate-500">{file.versionLabel || file.fileType} · Added {date(file.createdAt)}</span></span><Download className="h-4 w-4 text-slate-500" /></button>)}</div> : <div className="p-6 text-xs text-slate-500">No files have been shared yet.</div>}</section>
      </div>

      <aside className={`${workspacePanel} self-start overflow-hidden xl:sticky xl:top-20`}>
        <PanelTitle>Activity</PanelTitle>
        <div className="max-h-[590px] overflow-y-auto p-4">{comments.length ? <div className="space-y-5">{comments.map((item) => <div key={item.id} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-400/15 text-[9px] font-bold text-blue-300">{item.authorName.slice(0, 2).toUpperCase()}</span><div className="min-w-0"><div className="text-[11px]"><strong className="text-slate-200">{item.authorName}</strong><span className="ml-2 text-slate-600">{date(item.createdAt)}</span></div><p className="mt-1 text-xs leading-5 text-slate-400">{item.body}</p><button onClick={() => setSelectedId(item.file.id)} className="mt-1 text-[10px] text-blue-300">{item.file.title}{item.timestampSeconds !== null ? ` · ${time(item.timestampSeconds)}` : ""}</button></div></div>)}</div> : <div className="py-10 text-center"><MessageSquare className="mx-auto mb-3 h-5 w-5 text-slate-600" /><p className="text-xs text-slate-500">Comments and feedback will appear here.</p></div>}</div>
        {selected && <form action={commentAction} className="flex gap-2 border-t border-white/10 p-3"><input type="hidden" name="fileId" value={selected.id} /><input type="hidden" name="authorName" value={clientName} /><input name="body" required maxLength={2000} placeholder={`Message JMT Music…`} className="min-w-0 flex-1 rounded-[5px] border border-white/15 bg-[#0b111a] px-3 text-xs text-white" /><button aria-label="Send message" className="grid h-9 w-9 place-items-center rounded-[5px] border border-white/15 text-slate-300"><Send className="h-3.5 w-3.5" /></button></form>}
      </aside>
    </div>
  </div>;
}
