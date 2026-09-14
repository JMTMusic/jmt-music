"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createStudioProject } from "./actions";
import type { StudioActionState } from "./actions";

const fieldClass = "mt-1.5 w-full rounded-[6px] border border-white/15 bg-[#1c2431] px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-[#7c8794] focus:border-blue-400";
const initialStudioActionState: StudioActionState = { status: "idle", message: "" };

export function CreateProjectForm() {
  const [state, action, pending] = useActionState(createStudioProject, initialStudioActionState);

  return (
    <form action={action} className="mt-5 grid gap-4">
      <label className="text-[11px] font-medium uppercase tracking-[.12em] text-[#7c8794]">Artist/client name<input className={fieldClass} name="artistName" required minLength={2} maxLength={120} autoComplete="organization" /></label>
      <label className="text-sm font-medium text-slate-300">Project/song name<input className={fieldClass} name="projectName" required minLength={2} maxLength={160} /></label>
      <label className="text-sm font-medium text-slate-300">Email <span className="font-normal text-slate-600">(optional)</span><input className={fieldClass} name="email" type="email" maxLength={254} autoComplete="email" /></label>
      <label className="text-sm font-medium text-slate-300">Custom portal slug<input className={fieldClass} name="portalSlug" required minLength={3} maxLength={60} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="artist-song-name" /><span className="mt-2 block text-xs text-slate-600">The final link also includes a private access token.</span></label>
      <button disabled={pending} className="mt-1 rounded-[6px] bg-blue-400 px-5 py-2.5 text-xs font-medium text-[#04101f] transition hover:bg-blue-300 disabled:cursor-wait disabled:opacity-60">{pending ? "Creating…" : "Create Project"}</button>
      {state.status === "error" && <p role="alert" className="rounded-xl border border-red-300/20 bg-red-300/5 p-4 text-sm text-red-200">{state.message}</p>}
      {state.status === "success" && state.portalUrl && <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4"><p className="text-sm font-semibold text-emerald-200">{state.message}</p><a className="mt-3 block break-all text-sm text-sky-300 underline underline-offset-4" href={state.portalUrl} target="_blank" rel="noreferrer">{state.portalUrl}</a><div className="mt-4 flex gap-4 text-sm"><Link className="font-semibold text-slate-200 hover:text-white" href={`/dashboard/${state.projectId}`}>Manage project →</Link><Link className="text-slate-400 hover:text-white" href="/dashboard">Dashboard</Link></div></div>}
    </form>
  );
}
