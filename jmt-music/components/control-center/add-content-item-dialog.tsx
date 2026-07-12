"use client";

import { useRef, useState, type FormEvent } from "react";
import { Check, LoaderCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContentItemAction, type ContentItemActionResult } from "@/app/control-center/content/actions";
import { CONTENT_PLATFORMS, CONTENT_TYPES } from "@/lib/content/types";
import { CONTENT_TYPE_LABELS, PLATFORM_LABELS } from "@/lib/content/display";
import type { ProjectType, SiteId } from "@/lib/control-center/types";

type AddContentItemDialogProps = {
  propertyId: SiteId;
  beats: { id: string; title: string }[];
  clients: { id: string; label: string }[];
  projects: { id: string; title: string; type: ProjectType }[];
  disabled?: boolean;
};

const initialState: ContentItemActionResult | { status: "idle" } = { status: "idle" };

/** Add Content Item dialog. Metadata only — no upload UI; asset checklist lives on the detail page. */
export function AddContentItemDialog({ propertyId, beats, clients, projects, disabled = false }: AddContentItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ContentItemActionResult | { status: "idle" }>(initialState);
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
    const platforms = formData.getAll("platforms").map(String);
    const result = await createContentItemAction({
      property: propertyId,
      title: String(formData.get("title") || "").trim(),
      contentType: String(formData.get("content_type") || "") || null,
      platforms,
      projectId: String(formData.get("project_id") || "") || null,
      clientId: String(formData.get("client_id") || "") || null,
      beatId: String(formData.get("beat_id") || "") || null,
      notes: String(formData.get("notes") || "").trim() || null
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
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-300 px-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />New Content Item</button>
      {open && (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="content-item-dialog-title" className="my-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0a0f16] shadow-2xl">
            <header className="flex items-start justify-between border-b border-white/8 p-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">Content Workspace</p>
                <h2 id="content-item-dialog-title" className="mt-2 font-sans text-2xl font-semibold">New Content Item</h2>
                <p className="mt-2 text-sm text-slate-500">Only a title is required. Every new item starts at Idea — asset uploads and scheduling come later, from the item's detail page.</p>
              </div>
              <button type="button" onClick={close} disabled={pending} aria-label="Close new content item dialog" className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </header>
            <form ref={formRef} onSubmit={submit} className="p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <label className={`${labelClass} md:col-span-2`}>Title *<input className={inputClass} name="title" required minLength={1} maxLength={300} placeholder="What is this piece of content?" /></label>
                <label className={labelClass}>Content type<select className={inputClass} name="content_type" defaultValue="">
                  <option value="">Not set</option>
                  {CONTENT_TYPES.map((type) => <option key={type} value={type}>{CONTENT_TYPE_LABELS[type]}</option>)}
                </select></label>
                <label className={labelClass}>Related beat<select className={inputClass} name="beat_id" defaultValue="">
                  <option value="">None</option>
                  {beats.map((beat) => <option key={beat.id} value={beat.id}>{beat.title}</option>)}
                </select></label>
                <label className={labelClass}>Related client<select className={inputClass} name="client_id" defaultValue="">
                  <option value="">None</option>
                  {clients.map((client) => <option key={client.id} value={client.id}>{client.label}</option>)}
                </select></label>
                <label className={labelClass}>Related project<select className={inputClass} name="project_id" defaultValue="">
                  <option value="">None</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
                </select></label>
                <fieldset className="md:col-span-2">
                  <legend className={labelClass}>Platforms</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CONTENT_PLATFORMS.map((platform) => (
                      <label key={platform} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300 has-[:checked]:border-sky-300/60 has-[:checked]:bg-sky-300/10 has-[:checked]:text-sky-200">
                        <input type="checkbox" name="platforms" value={platform} className="accent-sky-300" />
                        {PLATFORM_LABELS[platform]}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className={`${labelClass} md:col-span-2`}>Notes<textarea className={`${inputClass} min-h-24 py-3`} name="notes" maxLength={8000} /></label>
              </div>
              {state.status === "error" && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-xs text-red-200">{state.message}</p>}
              <footer className="mt-6 flex justify-end gap-3">
                <button type="button" disabled={pending} onClick={close} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button>
                <button type="submit" disabled={pending} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Working</> : <><Check className="h-4 w-4" />Create Item</>}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
