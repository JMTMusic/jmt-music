"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Check, LoaderCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createDocumentRecord, updateDocumentRecord, type DocumentMutationState } from "@/app/control-center/growth/documents/actions";
import { DOCUMENT_STATUS_LABELS, DOCUMENT_STATUSES, DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES } from "@/lib/control-center/document-display";
import type { Client, DocumentRecord, SiteId } from "@/lib/control-center/types";

const initialState: DocumentMutationState = { status: "idle", message: "" };

type AddDocumentDialogProps = {
  propertyId: SiteId;
  disabled?: boolean;
  document?: DocumentRecord;
  clientId?: string;
  projectId?: string;
  clients?: Client[];
  trigger?: ReactNode;
};

/** Metadata-only document record form. No file upload, generation, or signature capability. */
export function AddDocumentDialog({ propertyId, disabled = false, document, clientId, projectId, clients, trigger }: AddDocumentDialogProps) {
  const editing = Boolean(document);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<DocumentMutationState>(initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white outline-none transition focus:border-sky-300/60";
  const labelClass = "text-xs font-semibold text-slate-300";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setState(initialState);
    const formData = new FormData(event.currentTarget);
    const result = editing ? await updateDocumentRecord(initialState, formData) : await createDocumentRecord(initialState, formData);
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
        <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="block w-full text-left disabled:cursor-not-allowed disabled:opacity-60">{trigger}</button>
      ) : (
        <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-300 px-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />New Document Record</button>
      )}
      {open && (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="document-dialog-title" className="my-8 w-full max-w-xl rounded-2xl border border-white/10 bg-[#0a0f16] shadow-2xl">
            <header className="flex items-start justify-between border-b border-white/8 p-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">Document Center</p>
                <h2 id="document-dialog-title" className="mt-2 font-sans text-2xl font-semibold">{editing ? "Edit Document Record" : "New Document Record"}</h2>
                <p className="mt-2 text-sm leading-5 text-slate-500">Metadata and an external link only — no file is generated, stored, or signed here. A status like Signed or Paid is a manual note, not a verified event.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} disabled={pending} aria-label="Close" className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </header>
            <form ref={formRef} onSubmit={submit} className="p-6">
              <input type="hidden" name="property" value={propertyId} />
              {document && <input type="hidden" name="document_id" value={document.id} />}
              <div className="grid gap-5 md:grid-cols-2">
                <label className={labelClass}>Type *<select className={inputClass} name="type" required defaultValue={document?.type || ""}>
                  <option value="" disabled>Select a type</option>
                  {DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{DOCUMENT_TYPE_LABELS[type]}</option>)}
                </select>{state.fieldErrors?.type && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.type}</span>}</label>
                <label className={labelClass}>Status *<select className={inputClass} name="status" required defaultValue={document?.status || "draft"}>
                  {DOCUMENT_STATUSES.map((status) => <option key={status} value={status}>{DOCUMENT_STATUS_LABELS[status]}</option>)}
                </select></label>
                <label className={`${labelClass} md:col-span-2`}>Title *<input className={inputClass} name="title" required minLength={1} maxLength={160} defaultValue={document?.title} placeholder="e.g. Production Agreement — Maya Reynolds" />{state.fieldErrors?.title && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.title}</span>}</label>
                <label className={labelClass}>Lead {clients ? "" : "ID"}{clients ? (
                  <select className={inputClass} name="client_id" defaultValue={document?.clientId || clientId || ""}>
                    <option value="">None</option>
                    {clients.map((client) => <option key={client.id} value={client.id}>{client.contactName || client.artistName}</option>)}
                  </select>
                ) : <input className={inputClass} name="client_id" defaultValue={document?.clientId || clientId || ""} readOnly={Boolean(clientId)} />}</label>
                <label className={labelClass}>Project ID<input className={inputClass} name="project_id" defaultValue={document?.projectId || projectId || ""} readOnly={Boolean(projectId)} /></label>
                <label className={`${labelClass} md:col-span-2`}>External link<input className={inputClass} name="external_url" type="url" placeholder="https://drive.google.com/..." defaultValue={document?.externalUrl || ""} />{state.fieldErrors?.external_url && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.external_url}</span>}<span className="mt-1 block text-[11px] font-normal text-slate-500">Where the real file lives — this table never stores the document itself.</span></label>
                <label className={`${labelClass} md:col-span-2`}>Notes<textarea className={`${inputClass} min-h-24 py-3`} name="notes" maxLength={2000} defaultValue={document?.notes || ""} /></label>
              </div>
              {state.status === "error" && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-xs text-red-200">{state.message}</p>}
              <footer className="mt-6 flex justify-end gap-3">
                <button type="button" disabled={pending} onClick={() => setOpen(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button>
                <button type="submit" disabled={pending} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Saving</> : <><Check className="h-4 w-4" />{editing ? "Save Changes" : "Create Record"}</>}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
