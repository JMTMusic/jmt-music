"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Check, LoaderCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createPlay, updatePlay, type PlayMutationState } from "@/app/control-center/growth/playbook/actions";
import { BEST_USED_FOR_OPTIONS, CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/control-center/playbook-display";
import type { Play, SiteId } from "@/lib/control-center/types";

const initialState: PlayMutationState = { status: "idle", message: "" };

type AddPlayDialogProps = {
  propertyId: SiteId;
  disabled?: boolean;
  play?: Play;
  trigger?: ReactNode;
};

export function AddPlayDialog({ propertyId, disabled = false, play, trigger }: AddPlayDialogProps) {
  const editing = Boolean(play);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<PlayMutationState>(initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white outline-none transition focus:border-sky-300/60";
  const labelClass = "text-xs font-semibold text-slate-300";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setState(initialState);
    const formData = new FormData(event.currentTarget);
    const result = editing ? await updatePlay(initialState, formData) : await createPlay(initialState, formData);
    setState(result);
    if (result.status === "success") {
      formRef.current?.reset();
      router.refresh();
      setOpen(false);
    }
    setPending(false);
  };

  return (
    <>
      {trigger ? (
        <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="block w-full text-left disabled:cursor-not-allowed disabled:opacity-60" aria-label={`Edit ${play?.title || "Play"}`}>{trigger}</button>
      ) : (
        <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-300 px-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />New Play</button>
      )}
      {open && (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="play-dialog-title" className="my-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0a0f16] shadow-2xl">
            <header className="flex items-start justify-between border-b border-white/8 p-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">Communication Playbook</p>
                <h2 id="play-dialog-title" className="mt-2 font-sans text-2xl font-semibold">{editing ? "Edit Play" : "New Play"}</h2>
                <p className="mt-2 text-sm text-slate-500">Document how JMT Music actually communicates — proven wording, not a generic template. Use {"{{variable}}"} as a placeholder convention in the message; it's left as literal text, not auto-filled.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} disabled={pending} aria-label="Close" className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </header>
            <form ref={formRef} onSubmit={submit} className="p-6">
              <input type="hidden" name="property" value={propertyId} />
              {play && <input type="hidden" name="play_id" value={play.id} />}
              <div className="grid gap-5 md:grid-cols-2">
                <label className={labelClass}>Title *<input className={inputClass} name="title" required minLength={1} maxLength={160} defaultValue={play?.title} placeholder="Artist Introduction & Connection" />{state.fieldErrors?.title && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.title}</span>}</label>
                <label className={labelClass}>Category *
                  <select className={inputClass} name="category" required defaultValue={play?.category || ""}>
                    <option value="" disabled>Select a category</option>
                    {CATEGORY_ORDER.map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}
                  </select>
                  {state.fieldErrors?.category && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.category}</span>}
                </label>
                <label className={`${labelClass} md:col-span-2`}>Best used for<input className={inputClass} name="best_used_for" list="best-used-for-options" defaultValue={play?.bestUsedFor.join(", ") || ""} placeholder="Comma-separated, e.g. Instagram DM, Email" /><datalist id="best-used-for-options">{BEST_USED_FOR_OPTIONS.map((option) => <option key={option} value={option} />)}</datalist></label>
                <label className={`${labelClass} md:col-span-2`}>Purpose<textarea className={`${inputClass} min-h-20 py-3`} name="purpose" maxLength={400} defaultValue={play?.purpose || ""} placeholder="What this Play is for — never copied to clipboard." />{state.fieldErrors?.purpose && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.purpose}</span>}</label>
                <label className={`${labelClass} md:col-span-2`}>Message *<textarea className={`${inputClass} min-h-40 py-3 font-mono text-[13px]`} name="message_body" required minLength={1} maxLength={10000} defaultValue={play?.messageBody} />{state.fieldErrors?.message_body && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.message_body}</span>}</label>
                <label className={labelClass}>Variables<input className={inputClass} name="variables" defaultValue={play?.variables.join(", ") || ""} placeholder="artist_name" /></label>
                <label className={labelClass}>Keywords<input className={inputClass} name="tags" defaultValue={play?.tags.join(", ") || ""} placeholder="Comma-separated, for search" /></label>
                <label className={`${labelClass} md:col-span-2`}>Internal notes<textarea className={`${inputClass} min-h-20 py-3`} name="internal_notes" defaultValue={play?.internalNotes || ""} placeholder="Never copied to clipboard. Context for why this works." /></label>
                <label className={labelClass}>Sort order<input className={inputClass} name="sort_order" type="number" min="0" max="10000" step="1" defaultValue={play?.sortOrder ?? 0} /></label>
              </div>
              {state.status === "error" && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-xs text-red-200">{state.message}</p>}
              <footer className="mt-6 flex justify-end gap-3">
                <button type="button" disabled={pending} onClick={() => setOpen(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button>
                <button type="submit" disabled={pending} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Saving</> : <><Check className="h-4 w-4" />{editing ? "Save Changes" : "Create Play"}</>}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
