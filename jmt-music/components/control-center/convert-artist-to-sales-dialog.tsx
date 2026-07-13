"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { convertArArtistToSalesAction } from "@/app/control-center/ar/actions";
import { SALES_PROBABILITIES, SALES_SERVICE_TYPES } from "@/lib/sales/types";
import { PROBABILITY_LABELS, SERVICE_TYPE_LABELS } from "@/lib/sales/display";
import { getDisplayName } from "@/lib/control-center/lead-pipeline";
import type { ArArtistRecord } from "@/lib/ar/types";
import type { Client, SiteId } from "@/lib/control-center/types";

type ConvertArtistToSalesDialogProps = {
  propertyId: SiteId;
  artist: ArArtistRecord;
  clients: Client[];
  disabled?: boolean;
};

/**
 * Converts a Ready for Outreach artist into a real Sales Opportunity. The user chooses and
 * confirms every deal-specific detail (title, service, budget, probability, follow-up,
 * notes) — nothing here is invented. If the artist already has a related Sales Opportunity,
 * the first submit comes back `needs_confirmation`; the dialog then shows the existing
 * opportunity's title and requires a second, explicit confirmed submit before creating
 * another (see convertArArtistToSalesAction's own comment for why this is a soft
 * confirm-to-override rather than a hard block).
 */
export function ConvertArtistToSalesDialog({ propertyId, artist, clients, disabled = false }: ConvertArtistToSalesDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmState, setConfirmState] = useState<{ message: string; existingTitle: string | null } | null>(null);
  const router = useRouter();

  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white outline-none transition focus:border-sky-300/60";
  const labelClass = "text-xs font-semibold text-slate-300";

  const close = () => {
    setOpen(false);
    setError("");
    setConfirmState(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError("");

    try {
      const result = await convertArArtistToSalesAction({
        property: propertyId,
        artistId: artist.id,
        title: String(formData.get("title") || "").trim(),
        serviceType: String(formData.get("service_type") || ""),
        budgetAmount: String(formData.get("budget_amount") || "") || null,
        probability: String(formData.get("probability") || "medium"),
        followUpAt: String(formData.get("follow_up_at") || "") || null,
        notes: String(formData.get("notes") || "") || null,
        clientId: String(formData.get("client_id") || "") || null,
        keepOnWatchlist: formData.get("keep_on_watchlist") === "on",
        confirmed: Boolean(confirmState)
      });

      if (result.status === "needs_confirmation") {
        setConfirmState({ message: result.message, existingTitle: result.existingSalesOpportunityTitle });
      } else if (result.status === "error") {
        setError(result.message);
      } else {
        router.push(`/control-center/sales/pipeline/${result.salesOpportunityId}${propertyId === "jmt-music" ? "" : `?site=${propertyId}`}`);
        router.refresh();
        close();
      }
    } catch {
      setError("The artist could not be converted.");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-300 px-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"><ArrowRight className="h-4 w-4" />Convert to Sales</button>
      {open && (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" className="my-8 w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0f16] shadow-2xl">
            <header className="flex items-start justify-between border-b border-white/8 p-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">A&R → Sales</p>
                <h2 className="mt-2 font-sans text-2xl font-semibold">Convert to Sales</h2>
                <p className="mt-2 text-sm leading-5 text-slate-500">Creates a real Sales Opportunity from {artist.artistName}'s research, connects or creates a Client, and marks this artist converted. Nothing here is sent automatically.</p>
              </div>
              <button type="button" onClick={close} disabled={pending} aria-label="Close" className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </header>
            <form onSubmit={submit} className="p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <label className={`${labelClass} md:col-span-2`}>Opportunity title *<input className={inputClass} name="title" required maxLength={200} defaultValue={`${artist.artistName} — ${artist.genre || "Production"}`} /></label>
                <label className={labelClass}>Service type<select className={inputClass} name="service_type" defaultValue="production">
                  {SALES_SERVICE_TYPES.map((type) => <option key={type} value={type}>{SERVICE_TYPE_LABELS[type]}</option>)}
                </select></label>
                <label className={labelClass}>Expected budget<input className={inputClass} name="budget_amount" type="number" min="0" step="1" placeholder="If known" /></label>
                <label className={labelClass}>Probability<select className={inputClass} name="probability" defaultValue="medium">
                  {SALES_PROBABILITIES.map((probability) => <option key={probability} value={probability}>{PROBABILITY_LABELS[probability]}</option>)}
                </select></label>
                <label className={labelClass}>Follow-up date<input className={inputClass} name="follow_up_at" type="date" /></label>
                <label className={labelClass}>Client<select className={inputClass} name="client_id" defaultValue={artist.relatedClientId || ""}>
                  <option value="">Create a new client/lead from this artist</option>
                  {clients.map((client) => <option key={client.id} value={client.id}>{getDisplayName(client)}</option>)}
                </select></label>
                <label className={`${labelClass} md:col-span-2`}>Notes<textarea className={`${inputClass} min-h-20 py-3`} name="notes" maxLength={4000} placeholder="Anything to add beyond the research already on file" /></label>
                <label className="flex items-center gap-2 text-xs text-slate-400 md:col-span-2"><input type="checkbox" name="keep_on_watchlist" className="accent-sky-300" />Keep this artist on the Watchlist after converting</label>
              </div>

              {confirmState && (
                <p role="alert" className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs text-amber-100">
                  {confirmState.message}{confirmState.existingTitle ? ` Existing opportunity: "${confirmState.existingTitle}".` : ""} Submit again to confirm creating another.
                </p>
              )}
              {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-xs text-red-200">{error}</p>}

              <footer className="mt-6 flex justify-end gap-3">
                <button type="button" disabled={pending} onClick={close} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button>
                <button type="submit" disabled={pending} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Working</> : <><Check className="h-4 w-4" />{confirmState ? "Confirm & Convert" : "Convert"}</>}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
