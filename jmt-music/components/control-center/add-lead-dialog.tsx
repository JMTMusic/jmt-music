"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Check, LoaderCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createLead, updateLead, type LeadMutationState } from "@/app/control-center/growth/leads/actions";
import { PLATFORM_OPTIONS } from "@/lib/control-center/lead-display";
import type { Client, SiteId } from "@/lib/control-center/types";

const initialState: LeadMutationState = { status: "idle", message: "" };

type AddLeadDialogProps = {
  propertyId: SiteId;
  disabled?: boolean;
  lead?: Client;
  trigger?: ReactNode;
};

/** Add/edit Lead dialog. Only Artist Name is required — Contact Name is optional and never forced to duplicate it. */
export function AddLeadDialog({ propertyId, disabled = false, lead, trigger }: AddLeadDialogProps) {
  const editing = Boolean(lead);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<LeadMutationState>(initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white outline-none transition focus:border-sky-300/60";
  const labelClass = "text-xs font-semibold text-slate-300";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setState(initialState);
    const formData = new FormData(event.currentTarget);
    const result = editing ? await updateLead(initialState, formData) : await createLead(initialState, formData);
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
        <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="block w-full text-left disabled:cursor-not-allowed disabled:opacity-60" aria-label={`Edit ${lead?.artistName || "lead"}`}>{trigger}</button>
      ) : (
        <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-300 px-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />Add Lead</button>
      )}
      {open && (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="lead-dialog-title" className="my-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0a0f16] shadow-2xl">
            <header className="flex items-start justify-between border-b border-white/8 p-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">Growth Engine · Lead Pipeline</p>
                <h2 id="lead-dialog-title" className="mt-2 font-sans text-2xl font-semibold">{editing ? "Edit Lead" : "Add Lead"}</h2>
                <p className="mt-2 text-sm text-slate-500">{editing ? "Update this lead's identity and contact details." : "Only Artist Name is required. Add what you know now — the rest can come later."}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} disabled={pending} aria-label="Close lead dialog" className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </header>
            <form ref={formRef} onSubmit={submit} className="p-6">
              <input type="hidden" name="property" value={propertyId} />
              {lead && <input type="hidden" name="lead_id" value={lead.id} />}
              <div className="grid gap-5 md:grid-cols-2">
                <label className={labelClass}>Artist Name *<input className={inputClass} name="artist_name" required minLength={1} maxLength={160} defaultValue={lead?.artistName} placeholder="Solo artist, band, or business name" />{state.fieldErrors?.artist_name && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.artist_name}</span>}</label>
                <label className={labelClass}>Contact Name<input className={inputClass} name="contact_name" maxLength={160} defaultValue={lead?.contactName || ""} placeholder="Leave blank if same as artist" />{state.fieldErrors?.contact_name && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.contact_name}</span>}</label>
                <label className={labelClass}>Email<input className={inputClass} name="email" type="email" defaultValue={lead?.email || ""} />{state.fieldErrors?.email && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.email}</span>}</label>
                <label className={labelClass}>Phone<input className={inputClass} name="phone" type="tel" defaultValue={lead?.phone || ""} /></label>
                <label className={labelClass}>Platform<input className={inputClass} name="platform" list="platform-options" defaultValue={lead?.platform || ""} placeholder="How they found us" /><datalist id="platform-options">{PLATFORM_OPTIONS.map((option) => <option key={option} value={option} />)}</datalist></label>
                <label className={labelClass}>Project type<input className={inputClass} name="project_type" maxLength={120} defaultValue={lead?.projectType || ""} placeholder="Production, mixing, licensing..." /></label>
                <label className={labelClass}>Budget<input className={inputClass} name="budget" maxLength={40} defaultValue={lead?.budget || ""} /></label>
                <label className={labelClass}>Tags<input className={inputClass} name="tags" defaultValue={lead?.tags.join(", ") || ""} placeholder="Comma-separated" /></label>
                <label className={labelClass}>Instagram link<input className={inputClass} name="social_instagram" type="url" placeholder="https://instagram.com/..." defaultValue={lead?.socialLinks.instagram || ""} />{state.fieldErrors?.social_instagram && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.social_instagram}</span>}</label>
                <label className={labelClass}>Website link<input className={inputClass} name="social_website" type="url" placeholder="https://..." defaultValue={lead?.socialLinks.website || ""} />{state.fieldErrors?.social_website && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.social_website}</span>}</label>
                <label className={`${labelClass} md:col-span-2`}>Notes<textarea className={`${inputClass} min-h-24 py-3`} name="notes" maxLength={2000} defaultValue={lead?.notes || ""} /></label>
              </div>
              {state.status === "error" && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-xs text-red-200">{state.message}</p>}
              <footer className="mt-6 flex justify-end gap-3">
                <button type="button" disabled={pending} onClick={() => setOpen(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button>
                <button type="submit" disabled={pending} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Working</> : <><Check className="h-4 w-4" />{editing ? "Save Changes" : "Create Lead"}</>}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
