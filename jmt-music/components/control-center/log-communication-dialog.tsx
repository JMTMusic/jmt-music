"use client";

import { useRef, useState, type FormEvent } from "react";
import { Check, LoaderCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { logCommunication, type CommunicationMutationState } from "@/app/control-center/growth/communications/actions";
import { COMMUNICATION_TYPE_OPTIONS } from "@/lib/control-center/communication-display";
import { getDisplayName } from "@/lib/control-center/lead-pipeline";
import type { Client, CommunicationDirection, SiteId } from "@/lib/control-center/types";

const initialState: CommunicationMutationState = { status: "idle", message: "" };

type LogCommunicationDialogProps = {
  propertyId: SiteId;
  /** Fixed client — used from the Lead detail page, where the client is already known. */
  clientId?: string;
  clientLabel?: string;
  /** Selectable client list — used from the property-wide Communications page. */
  clients?: Client[];
  projectId?: string | null;
  disabled?: boolean;
};

/**
 * Manual-entry Communication Timeline form. Either pre-fills a fixed client (Lead detail
 * page) or offers a client picker (property-wide Communications page) — never both.
 */
export function LogCommunicationDialog({ propertyId, clientId, clientLabel, clients, projectId, disabled = false }: LogCommunicationDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<CommunicationMutationState>(initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white outline-none transition focus:border-sky-300/60";
  const labelClass = "text-xs font-semibold text-slate-300";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setState(initialState);
    const formData = new FormData(event.currentTarget);
    const result = await logCommunication(initialState, formData);
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
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-300 px-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />Log Communication</button>
      {open && (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="communication-dialog-title" className="my-8 w-full max-w-xl rounded-2xl border border-white/10 bg-[#0a0f16] shadow-2xl">
            <header className="flex items-start justify-between border-b border-white/8 p-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">Communication Timeline</p>
                <h2 id="communication-dialog-title" className="mt-2 font-sans text-2xl font-semibold">Log Communication</h2>
                <p className="mt-2 text-sm text-slate-500">{clientLabel ? `For ${clientLabel}. ` : ""}Manual entry — future Gmail/social integrations will populate this same timeline automatically.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} disabled={pending} aria-label="Close" className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </header>
            <form ref={formRef} onSubmit={submit} className="p-6">
              <input type="hidden" name="property" value={propertyId} />
              {clientId && <input type="hidden" name="client_id" value={clientId} />}
              {projectId && <input type="hidden" name="project_id" value={projectId} />}
              <div className="grid gap-5 md:grid-cols-2">
                {clients && (
                  <label className={`${labelClass} md:col-span-2`}>Lead *<select className={inputClass} name="client_id" required defaultValue="">
                    <option value="" disabled>Select a lead</option>
                    {clients.map((client) => <option key={client.id} value={client.id}>{getDisplayName(client)}</option>)}
                  </select>{state.fieldErrors?.client_id && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.client_id}</span>}</label>
                )}
                <label className={labelClass}>Direction *<select className={inputClass} name="direction" required defaultValue="outbound">
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                  <option value="internal">Internal</option>
                </select>{state.fieldErrors?.direction && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.direction}</span>}</label>
                <label className={labelClass}>Type *<input className={inputClass} name="type" required list="communication-type-options" maxLength={80} placeholder="Email, Instagram, Phone Call..." /><datalist id="communication-type-options">{COMMUNICATION_TYPE_OPTIONS.map((option) => <option key={option} value={option} />)}</datalist>{state.fieldErrors?.type && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.type}</span>}</label>
                <label className={labelClass}>Platform<input className={inputClass} name="platform" maxLength={80} placeholder="Optional — e.g. Instagram" /></label>
                <label className={labelClass}>Date and time<input className={inputClass} name="sent_at" type="datetime-local" />{state.fieldErrors?.sent_at && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.sent_at}</span>}<span className="mt-1 block text-[11px] font-normal text-slate-500">Leave blank to use right now.</span></label>
                <label className={`${labelClass} md:col-span-2`}>Subject<input className={inputClass} name="subject" maxLength={200} /></label>
                <label className={`${labelClass} md:col-span-2`}>Notes / body *<textarea className={`${inputClass} min-h-28 py-3`} name="body" required maxLength={5000} />{state.fieldErrors?.body && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.body}</span>}</label>
              </div>
              {state.status === "error" && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-xs text-red-200">{state.message}</p>}
              <footer className="mt-6 flex justify-end gap-3">
                <button type="button" disabled={pending} onClick={() => setOpen(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button>
                <button type="submit" disabled={pending} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Saving</> : <><Check className="h-4 w-4" />Log Communication</>}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
