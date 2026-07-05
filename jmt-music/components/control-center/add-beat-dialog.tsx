"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createBeat, type CreateBeatState } from "@/app/control-center/beats/actions";
import type { SiteId } from "@/lib/control-center/types";

const initialState: CreateBeatState = { status: "idle", message: "" };

/** Accessible Add Beat dialog backed by the property-scoped server action. */
export function AddBeatDialog({ propertyId, disabled = false }: { propertyId: SiteId; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createBeat, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
      setOpen(false);
    }
  }, [state.status, router]);

  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white outline-none transition focus:border-sky-300/60";
  const labelClass = "text-xs font-semibold text-slate-300";

  return (
    <>
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-300 px-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />Add Beat</button>
      {open && <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="add-beat-title" className="my-8 w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0a0f16] shadow-2xl">
          <header className="flex items-start justify-between border-b border-white/8 p-6"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">Beat Library</p><h2 id="add-beat-title" className="mt-2 font-sans text-2xl font-semibold">Add Beat</h2><p className="mt-2 text-sm text-slate-500">Create a metadata record now. Artwork and audio uploads come later.</p></div><button type="button" onClick={() => setOpen(false)} disabled={pending} aria-label="Close Add Beat dialog" className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button></header>
          <form ref={formRef} action={formAction} className="p-6">
            <input type="hidden" name="property" value={propertyId} />
            <div className="grid gap-5 md:grid-cols-2">
              <label className={labelClass}>Title *<input className={inputClass} name="title" required minLength={2} maxLength={120} />{state.fieldErrors?.title && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.title}</span>}</label>
              <label className={labelClass}>Slug *<input className={inputClass} name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="my-new-beat" />{state.fieldErrors?.slug && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.slug}</span>}</label>
              <label className={labelClass}>Genre *<input className={inputClass} name="genre" required maxLength={80} /></label>
              <label className={labelClass}>BPM<input className={inputClass} name="bpm" type="number" min="1" max="400" step="1" />{state.fieldErrors?.bpm && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.bpm}</span>}</label>
              <label className={`${labelClass} md:col-span-2`}>Description *<textarea className={`${inputClass} min-h-28 py-3`} name="description" required minLength={10} maxLength={2000} /></label>
              <label className={labelClass}>Musical key<input className={inputClass} name="musical_key" placeholder="D minor" maxLength={40} /></label>
              <label className={labelClass}>Release date<input className={inputClass} name="release_date" type="date" /></label>
              <label className={labelClass}>Sort order<input className={inputClass} name="sort_order" type="number" min="0" max="10000" step="1" defaultValue="0" /></label>
              <label className={labelClass}>BeatStars URL<input className={inputClass} name="beatstars_url" type="url" placeholder="https://..." /></label>
            </div>
            <div className="mt-5 flex flex-wrap gap-5 rounded-xl border border-white/8 bg-white/[0.025] p-4">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-300"><input type="checkbox" name="featured" className="accent-sky-300" />Featured</label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-300"><input type="checkbox" name="published" className="accent-sky-300" />Published</label>
            </div>
            {state.status === "error" && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-xs text-red-200">{state.message}</p>}
            <footer className="mt-6 flex justify-end gap-3"><button type="button" disabled={pending} onClick={() => setOpen(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button><button type="submit" disabled={pending} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Creating</> : <><Check className="h-4 w-4" />Create Beat</>}</button></footer>
          </form>
        </section>
      </div>}
    </>
  );
}
