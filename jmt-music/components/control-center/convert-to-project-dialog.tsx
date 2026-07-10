"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, ArrowRight, Check, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { convertLeadToProject } from "@/app/control-center/growth/leads/actions";
import { PROJECT_TYPE_LABELS } from "@/lib/control-center/project-display";
import type { ProjectType, SiteId } from "@/lib/control-center/types";

const PROJECT_TYPES: ProjectType[] = ["beat", "client_work", "sync", "website", "content", "other"];

/**
 * Converts a lead into project work. A project row is what represents the work —
 * changing the lead's stage alone never implies work exists. Shows any existing
 * non-done projects already linked to this client and requires explicit confirmation
 * before creating another one, to avoid accidental duplicates.
 */
export function ConvertToProjectDialog({ propertyId, leadId, disabled = false }: { propertyId: SiteId; leadId: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [existingProjects, setExistingProjects] = useState<{ id: string; title: string; phase: string }[]>([]);
  const [pendingValues, setPendingValues] = useState<{ type: ProjectType; title: string; targetDate: string | null } | null>(null);
  const router = useRouter();

  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white outline-none transition focus:border-sky-300/60";
  const labelClass = "text-xs font-semibold text-slate-300";

  const reset = () => {
    setNeedsConfirmation(false);
    setExistingProjects([]);
    setPendingValues(null);
    setError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const type = String(formData.get("type") || "other") as ProjectType;
    const title = String(formData.get("title") || "").trim();
    const targetDate = String(formData.get("target_date") || "") || null;
    setPending(true);
    setError("");
    try {
      const result = await convertLeadToProject({ property: propertyId, leadId, type, title, targetDate });
      if (result.status === "needs_confirmation") {
        setNeedsConfirmation(true);
        setExistingProjects(result.existingProjects || []);
        setPendingValues({ type, title, targetDate });
      } else if (result.status === "error") {
        setError(result.message);
      } else {
        router.refresh();
        setOpen(false);
        reset();
      }
    } catch {
      setError("The lead could not be converted.");
    } finally {
      setPending(false);
    }
  };

  const confirmAnyway = async () => {
    if (!pendingValues) return;
    setPending(true);
    setError("");
    try {
      const result = await convertLeadToProject({ property: propertyId, leadId, ...pendingValues, confirmed: true });
      if (result.status === "error") setError(result.message);
      else {
        router.refresh();
        setOpen(false);
        reset();
      }
    } catch {
      setError("The lead could not be converted.");
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
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">Lead Pipeline → Projects</p>
                <h2 className="mt-2 font-sans text-2xl font-semibold">Convert to Project</h2>
                <p className="mt-2 text-sm leading-5 text-slate-500">Creates a project row representing the actual work, and updates this lead's stage to Project.</p>
              </div>
              <button type="button" onClick={() => { setOpen(false); reset(); }} disabled={pending} aria-label="Close" className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </header>

            {!needsConfirmation ? (
              <form onSubmit={submit} className="p-6">
                <div className="grid gap-5">
                  <label className={labelClass}>Project type *<select className={inputClass} name="type" required defaultValue="client_work">
                    {PROJECT_TYPES.map((type) => <option key={type} value={type}>{PROJECT_TYPE_LABELS[type]}</option>)}
                  </select></label>
                  <label className={labelClass}>Title *<input className={inputClass} name="title" required minLength={2} maxLength={160} /></label>
                  <label className={labelClass}>Target date<input className={inputClass} name="target_date" type="date" /></label>
                </div>
                {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-xs text-red-200">{error}</p>}
                <footer className="mt-6 flex justify-end gap-3">
                  <button type="button" disabled={pending} onClick={() => { setOpen(false); reset(); }} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button>
                  <button type="submit" disabled={pending} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Working</> : <><Check className="h-4 w-4" />Create Project</>}</button>
                </footer>
              </form>
            ) : (
              <div className="p-6">
                <div className="flex items-start gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                  <div>
                    <p className="text-sm font-semibold text-amber-100">This lead already has active project work linked</p>
                    <ul className="mt-2 space-y-1 text-xs text-amber-100/80">
                      {existingProjects.map((project) => <li key={project.id}>· {project.title} — {project.phase.replace("_", " ")}</li>)}
                    </ul>
                    <p className="mt-3 text-xs text-amber-100/70">Confirm you want to create another project rather than continuing one of the ones above.</p>
                  </div>
                </div>
                {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-xs text-red-200">{error}</p>}
                <footer className="mt-6 flex justify-end gap-3">
                  <button type="button" disabled={pending} onClick={reset} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">Go Back</button>
                  <button type="button" disabled={pending} onClick={confirmAnyway} className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Working</> : <><Check className="h-4 w-4" />Create Another Project</>}</button>
                </footer>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
