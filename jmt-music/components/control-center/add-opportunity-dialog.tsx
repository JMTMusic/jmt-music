"use client";

import { useRef, useState, type FormEvent } from "react";
import { Check, ChevronDown, LoaderCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSalesOpportunityAction, type SalesOpportunityActionResult } from "@/app/control-center/sales/actions";
import { SALES_PLATFORMS, SALES_PROBABILITIES, SALES_SERVICE_TYPES } from "@/lib/sales/types";
import { PLATFORM_LABELS, PROBABILITY_LABELS, SERVICE_TYPE_LABELS } from "@/lib/sales/display";
import type { SiteId } from "@/lib/control-center/types";

type AddOpportunityDialogProps = {
  propertyId: SiteId;
  disabled?: boolean;
};

const initialState: SalesOpportunityActionResult | { status: "idle" } = { status: "idle" };

function toOptionalNumber(value: FormDataEntryValue | null): number | null {
  const text = String(value || "").trim();
  return text ? Number(text) : null;
}

function toOptionalText(value: FormDataEntryValue | null): string | null {
  const text = String(value || "").trim();
  return text || null;
}

/**
 * New Opportunity dialog. Kept fast to complete after sending a proposal: the fields
 * needed most often (title, artist, platform, service, budget, probability, proposal/
 * follow-up dates, notes) are always visible; everything else — sample info, buyer
 * instructions, turnaround/revisions, links — lives behind one "More details" disclosure
 * so logging a quick lead doesn't force scrolling past fields that don't apply yet.
 */
export function AddOpportunityDialog({ propertyId, disabled = false }: AddOpportunityDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<SalesOpportunityActionResult | { status: "idle" }>(initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white outline-none transition focus:border-sky-300/60";
  const labelClass = "text-xs font-semibold text-slate-300";

  const close = () => {
    setOpen(false);
    setState(initialState);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setState(initialState);
    const formData = new FormData(event.currentTarget);
    const result = await createSalesOpportunityAction({
      property: propertyId,
      title: String(formData.get("title") || "").trim(),
      artistName: String(formData.get("artist_name") || "").trim(),
      artistEmail: toOptionalText(formData.get("artist_email")),
      platform: String(formData.get("platform") || ""),
      serviceType: String(formData.get("service_type") || ""),
      genre: toOptionalText(formData.get("genre")),
      budgetAmount: toOptionalNumber(formData.get("budget_amount")),
      currency: toOptionalText(formData.get("currency")),
      probability: String(formData.get("probability") || "medium"),
      // Raw "YYYY-MM-DD" from <input type="date">, passed through as-is — server-side
      // validation (lib/sales/validation.ts) anchors a bare date to noon UTC so it lands on
      // the correct calendar day everywhere this app compares dates in America/Chicago,
      // rather than this component re-deriving that logic (and getting it wrong) itself.
      proposalSentAt: toOptionalText(formData.get("proposal_sent_at")),
      followUpAt: toOptionalText(formData.get("follow_up_at")),
      deadline: toOptionalText(formData.get("deadline")),
      sourceUrl: toOptionalText(formData.get("source_url")),
      musicUrl: toOptionalText(formData.get("music_url")),
      notes: toOptionalText(formData.get("notes")),
      proposalText: toOptionalText(formData.get("proposal_text")),
      buyerInstructions: toOptionalText(formData.get("buyer_instructions")),
      turnaroundDays: toOptionalNumber(formData.get("turnaround_days")),
      revisionCount: toOptionalNumber(formData.get("revision_count")),
      sampleTitle: toOptionalText(formData.get("sample_title")),
      sampleDescription: toOptionalText(formData.get("sample_description")),
      sampleUrl: toOptionalText(formData.get("sample_url"))
    });
    setState(result);
    if (result.status === "success") {
      formRef.current?.reset();
      router.refresh();
      close();
    }
    setPending(false);
  };

  return (
    <>
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-300 px-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />New Opportunity</button>
      {open && (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="opportunity-dialog-title" className="my-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0a0f16] shadow-2xl">
            <header className="flex items-start justify-between border-b border-white/8 p-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">Sales</p>
                <h2 id="opportunity-dialog-title" className="mt-2 font-sans text-2xl font-semibold">New Opportunity</h2>
                <p className="mt-2 text-sm text-slate-500">Log it right after you send a proposal — the essentials only take a minute.</p>
              </div>
              <button type="button" onClick={close} disabled={pending} aria-label="Close new opportunity dialog" className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </header>
            <form ref={formRef} onSubmit={submit} className="p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <label className={`${labelClass} md:col-span-2`}>Title *<input className={inputClass} name="title" required minLength={1} maxLength={300} placeholder="Ambient Pop Production, Mixing & Mastering" /></label>
                <label className={labelClass}>Artist name *<input className={inputClass} name="artist_name" required minLength={1} maxLength={160} /></label>
                <label className={labelClass}>Artist email<input className={inputClass} name="artist_email" type="email" /></label>
                <label className={labelClass}>Platform *<select className={inputClass} name="platform" required defaultValue="airgigs">
                  {SALES_PLATFORMS.map((platform) => <option key={platform} value={platform}>{PLATFORM_LABELS[platform]}</option>)}
                </select></label>
                <label className={labelClass}>Service type *<select className={inputClass} name="service_type" required defaultValue="production_mix_master">
                  {SALES_SERVICE_TYPES.map((type) => <option key={type} value={type}>{SERVICE_TYPE_LABELS[type]}</option>)}
                </select></label>
                <label className={labelClass}>Budget amount<input className={inputClass} name="budget_amount" type="number" min="0" step="0.01" placeholder="100" /></label>
                <label className={labelClass}>Probability<select className={inputClass} name="probability" defaultValue="medium">
                  {SALES_PROBABILITIES.map((probability) => <option key={probability} value={probability}>{PROBABILITY_LABELS[probability]}</option>)}
                </select></label>
                <label className={labelClass}>Proposal sent<input className={inputClass} name="proposal_sent_at" type="date" /></label>
                <label className={labelClass}>Follow-up<input className={inputClass} name="follow_up_at" type="date" /></label>
                <label className={`${labelClass} md:col-span-2`}>Notes<textarea className={`${inputClass} min-h-24 py-3`} name="notes" maxLength={8000} /></label>
              </div>

              <details className="mt-5 group">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />More details</summary>
                <div className="mt-4 grid gap-5 border-t border-white/6 pt-5 md:grid-cols-2">
                  <label className={labelClass}>Genre<input className={inputClass} name="genre" maxLength={80} /></label>
                  <label className={labelClass}>Currency<input className={inputClass} name="currency" maxLength={3} defaultValue="USD" placeholder="USD" /></label>
                  <label className={labelClass}>Deadline<input className={inputClass} name="deadline" type="date" /></label>
                  <label className={labelClass}>Turnaround (days)<input className={inputClass} name="turnaround_days" type="number" min="0" step="1" /></label>
                  <label className={labelClass}>Revisions included<input className={inputClass} name="revision_count" type="number" min="0" step="1" /></label>
                  <label className={labelClass}>Source link<input className={inputClass} name="source_url" type="url" placeholder="https://..." /></label>
                  <label className={labelClass}>Music link<input className={inputClass} name="music_url" type="url" placeholder="https://..." /></label>
                  <label className={labelClass}>Sample title<input className={inputClass} name="sample_title" maxLength={300} /></label>
                  <label className={`${labelClass} md:col-span-2`}>Sample description<textarea className={`${inputClass} min-h-20 py-3`} name="sample_description" maxLength={4000} /></label>
                  <label className={labelClass}>Sample link<input className={inputClass} name="sample_url" type="url" placeholder="https://..." /></label>
                  <label className={`${labelClass} md:col-span-2`}>Buyer instructions<textarea className={`${inputClass} min-h-20 py-3`} name="buyer_instructions" maxLength={8000} /></label>
                  <label className={`${labelClass} md:col-span-2`}>Proposal text<textarea className={`${inputClass} min-h-32 py-3`} name="proposal_text" maxLength={8000} /></label>
                </div>
              </details>

              {state.status === "error" && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-xs text-red-200">{state.message}</p>}
              <footer className="mt-6 flex justify-end gap-3">
                <button type="button" disabled={pending} onClick={close} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button>
                <button type="submit" disabled={pending} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Working</> : <><Check className="h-4 w-4" />Create Opportunity</>}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
