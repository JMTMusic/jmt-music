"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { convertSalesOpportunityToProjectAction } from "@/app/control-center/sales/actions";
import { getDisplayName } from "@/lib/control-center/lead-pipeline";
import type { Client, SiteId } from "@/lib/control-center/types";

type ConvertOpportunityDialogProps = {
  propertyId: SiteId;
  opportunityId: string;
  opportunityDeadline: string | null;
  opportunityClientId: string | null;
  clients: Client[];
  disabled?: boolean;
};

/**
 * Converts a won opportunity into real project work. Either connects to an existing Client
 * (selected below, pre-selected to the opportunity's own client_id when one is already
 * linked) or creates a new one from the opportunity's own artist details — see
 * app/control-center/sales/actions.ts's convertSalesOpportunityToProjectAction for exactly
 * which existing systems this reuses (createLead for a new Client, createProject for the
 * Project). The parent page hides/disables this entirely once the opportunity is already
 * converted, so accidental duplicate conversion isn't a UI state this dialog needs to handle.
 */
export function ConvertOpportunityDialog({ propertyId, opportunityId, opportunityDeadline, opportunityClientId, clients, disabled = false }: ConvertOpportunityDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white outline-none transition focus:border-sky-300/60";
  const labelClass = "text-xs font-semibold text-slate-300";

  const close = () => {
    setOpen(false);
    setError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const clientId = String(formData.get("client_id") || "") || null;
    const targetDate = String(formData.get("target_date") || "") || null;
    setPending(true);
    setError("");
    try {
      const result = await convertSalesOpportunityToProjectAction({ property: propertyId, opportunityId, clientId, targetDate });
      if (result.status === "error") {
        setError(result.message);
      } else {
        router.refresh();
        close();
      }
    } catch {
      setError("The opportunity could not be converted.");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-300 px-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"><ArrowRight className="h-4 w-4" />Convert to Project</button>
      {open && (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" className="my-8 w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0f16] shadow-2xl">
            <header className="flex items-start justify-between border-b border-white/8 p-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">Sales → Projects</p>
                <h2 className="mt-2 font-sans text-2xl font-semibold">Convert to Project</h2>
                <p className="mt-2 text-sm leading-5 text-slate-500">Creates a Client Work project representing the real work, connects or creates the Client, and marks this opportunity converted.</p>
              </div>
              <button type="button" onClick={close} disabled={pending} aria-label="Close" className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </header>
            <form onSubmit={submit} className="p-6">
              <div className="grid gap-5">
                <label className={labelClass}>Client<select className={inputClass} name="client_id" defaultValue={opportunityClientId || ""}>
                  <option value="">Create a new client from this opportunity</option>
                  {clients.map((client) => <option key={client.id} value={client.id}>{getDisplayName(client)}</option>)}
                </select></label>
                <label className={labelClass}>Target date<input className={inputClass} name="target_date" type="date" defaultValue={opportunityDeadline || ""} /></label>
              </div>
              {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-xs text-red-200">{error}</p>}
              <footer className="mt-6 flex justify-end gap-3">
                <button type="button" disabled={pending} onClick={close} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button>
                <button type="submit" disabled={pending} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Working</> : <><Check className="h-4 w-4" />Convert</>}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
