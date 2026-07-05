"use client";

import { useState, type FormEvent } from "react";
import { Check, FilePenLine, GripVertical, LoaderCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  setupJmtWebsiteSections,
  updateWebsiteSection,
  type WebsiteActionResult
} from "@/app/control-center/website/actions";
import { AdminCard, EmptyState } from "@/components/control-center/ui";
import type { SiteId } from "@/lib/control-center/types";
import type { CmsWebsiteSection } from "@/lib/control-center/website-repository";

const idleState: WebsiteActionResult = { status: "success", message: "" };

/** Property-scoped CMS list with setup, read-only, and authorized edit states. */
export function WebsiteCms({
  siteId,
  sections,
  canEdit,
  loadStatus,
  loadDetail
}: {
  siteId: SiteId;
  sections: CmsWebsiteSection[];
  canEdit: boolean;
  loadStatus: "empty" | "error" | "ready";
  loadDetail: string;
}) {
  const [setupPending, setSetupPending] = useState(false);
  const [setupMessage, setSetupMessage] = useState("");
  const router = useRouter();

  const setup = async () => {
    setSetupPending(true);
    setSetupMessage("");
    try {
      const result = await setupJmtWebsiteSections();
      setSetupMessage(result.message);
      if (result.status === "success") router.refresh();
    } catch {
      setSetupMessage("Website section setup failed.");
    } finally {
      setSetupPending(false);
    }
  };

  if (loadStatus !== "ready") {
    return (
      <div>
        <EmptyState
          title={loadStatus === "empty" ? "Website CMS setup required" : "Website CMS unavailable"}
          message={loadDetail}
        />
        {siteId === "jmt-music" && canEdit && <div className="mt-4 flex justify-center"><button type="button" disabled={setupPending} onClick={setup} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-300 px-4 text-sm font-semibold text-slate-950 disabled:opacity-60">{setupPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Create Default Sections</button></div>}
        {siteId !== "jmt-music" && <p className="mt-4 text-center text-xs text-amber-200/70">Jonathan Tripp CMS setup is prepared but not connected yet.</p>}
        {setupMessage && <p role="status" className="mt-4 text-center text-xs text-slate-400">{setupMessage}</p>}
      </div>
    );
  }

  return (
    <div>
      {sections.length < 5 && siteId === "jmt-music" && canEdit && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><span>Some default CMS sections are missing. Setup adds only the missing records.</span><button type="button" disabled={setupPending} onClick={setup} className="rounded-lg border border-amber-200/20 px-3 py-2 font-semibold text-amber-100 disabled:opacity-50">{setupPending ? "Checking…" : "Add Missing Sections"}</button></div>}
      <div className="space-y-4">{sections.map((section) => <WebsiteSectionCard key={section.id} initialSection={section} siteId={siteId} canEdit={canEdit} />)}</div>
      {setupMessage && <p role="status" className="mt-4 text-xs text-slate-400">{setupMessage}</p>}
    </div>
  );
}

function WebsiteSectionCard({ initialSection, siteId, canEdit }: { initialSection: CmsWebsiteSection; siteId: SiteId; canEdit: boolean }) {
  const [section, setSection] = useState(initialSection);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<WebsiteActionResult>(idleState);
  const content = section.content;
  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white outline-none transition focus:border-sky-300/60";
  const labelClass = "text-xs font-semibold text-slate-300";

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setState(idleState);
    try {
      const result = await updateWebsiteSection(idleState, new FormData(event.currentTarget));
      setState(result);
      if (result.status === "success" && result.section) {
        setSection(result.section);
        setOpen(false);
      }
    } catch {
      setState({ status: "error", message: "The website section could not be saved." });
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <AdminCard className="flex flex-col gap-5 p-5 md:flex-row md:items-center">
        <span className="text-slate-700"><GripVertical /></span>
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-sky-300/8 text-sky-300"><FilePenLine className="h-5 w-5" /></span>
        <div className="flex-1"><div className="flex flex-wrap items-center gap-3"><h2 className="font-sans text-base font-semibold">{section.title}</h2><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${section.published ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-400/10 text-slate-400"}`}>{section.published ? "CMS Ready" : "CMS Draft"}</span></div><p className="mt-1 line-clamp-2 text-sm text-slate-500">{String(content.heading || content.body || "No CMS copy has been entered yet.")}</p></div>
        <button type="button" disabled={!canEdit} onClick={() => setOpen(true)} className="rounded-xl border border-white/8 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-sky-300/30 hover:text-white disabled:cursor-not-allowed disabled:text-slate-600">{canEdit ? "Edit Section" : "Read Only"}</button>
      </AdminCard>
      {open && <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby={`section-${section.id}`} className="my-8 w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0a0f16] shadow-2xl"><header className="flex items-start justify-between border-b border-white/8 p-6"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">Website CMS</p><h2 id={`section-${section.id}`} className="mt-2 font-sans text-2xl font-semibold">{section.title}</h2><p className="mt-2 text-sm text-slate-500">Saved here only—public website content remains unchanged.</p></div><button type="button" disabled={pending} onClick={() => setOpen(false)} aria-label="Close section editor" className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button></header>
        <form onSubmit={save} className="p-6">
          <input type="hidden" name="section_id" value={section.id} /><input type="hidden" name="property" value={siteId} />
          <div className="grid gap-5 md:grid-cols-2">
            <label className={labelClass}>Section title<input className={inputClass} name="title" required minLength={2} maxLength={120} defaultValue={section.title} /></label>
            <label className={labelClass}>Eyebrow<input className={inputClass} name="eyebrow" maxLength={80} defaultValue={String(content.eyebrow || "")} /></label>
            <label className={`${labelClass} md:col-span-2`}>Heading<input className={inputClass} name="heading" maxLength={160} defaultValue={String(content.heading || "")} /></label>
            <label className={`${labelClass} md:col-span-2`}>Body<textarea className={`${inputClass} min-h-32 py-3`} name="body" maxLength={5000} defaultValue={String(content.body || "")} /></label>
            <label className={labelClass}>Primary CTA label<input className={inputClass} name="primary_cta_label" maxLength={80} defaultValue={String(content.primary_cta_label || "")} /></label>
            <label className={labelClass}>Primary CTA URL<input className={inputClass} name="primary_cta_url" placeholder="/contact or https://…" maxLength={500} defaultValue={String(content.primary_cta_url || "")} /></label>
            <label className={labelClass}>Secondary CTA label<input className={inputClass} name="secondary_cta_label" maxLength={80} defaultValue={String(content.secondary_cta_label || "")} /></label>
            <label className={labelClass}>Secondary CTA URL<input className={inputClass} name="secondary_cta_url" placeholder="/services or https://…" maxLength={500} defaultValue={String(content.secondary_cta_url || "")} /></label>
            <label className={labelClass}>Sort order<input className={inputClass} name="sort_order" type="number" min="0" max="10000" step="1" defaultValue={section.sortOrder} /></label>
            <label className="flex items-center gap-2 self-end pb-3 text-xs font-semibold text-slate-300"><input type="checkbox" name="published" defaultChecked={section.published} className="accent-sky-300" />Mark CMS content ready</label>
          </div>
          {state.status === "error" && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-xs text-red-200">{state.message}</p>}
          <footer className="mt-6 flex justify-end gap-3"><button type="button" disabled={pending} onClick={() => setOpen(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button><button type="submit" disabled={pending} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Saving</> : <><Check className="h-4 w-4" />Save Section</>}</button></footer>
        </form>
      </section></div>}
    </>
  );
}
