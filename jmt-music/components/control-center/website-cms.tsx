"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, ChevronRight, FilePenLine, GripVertical, LoaderCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { setupJmtWebsiteSections, updateWebsiteSection, type WebsiteActionResult } from "@/app/control-center/website/actions";
import { AdminCard, EmptyState } from "@/components/control-center/ui";
import type { SiteId } from "@/lib/control-center/types";
import {
  WEBSITE_PAGES,
  type CmsWebsiteSection,
  type WebsitePageKey
} from "@/lib/control-center/website-types";

const idleState: WebsiteActionResult = { status: "success", message: "" };

/** Page-oriented CMS workspace backed by property-scoped website sections. */
export function WebsiteCms({
  siteId,
  sections: initialSections,
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
  const [sections, setSections] = useState(initialSections);
  const [selectedPage, setSelectedPage] = useState<WebsitePageKey>("home");
  const [setupPending, setSetupPending] = useState(false);
  const [setupMessage, setSetupMessage] = useState("");
  const router = useRouter();
  useEffect(() => setSections(initialSections), [initialSections]);
  const pageSections = useMemo(
    () => sections.filter((section) => section.pageKey === selectedPage).sort((a, b) => a.sortOrder - b.sortOrder),
    [sections, selectedPage]
  );
  const selectedPageLabel = WEBSITE_PAGES.find((page) => page.key === selectedPage)?.label || "Page";

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
    return <div><EmptyState title={loadStatus === "empty" ? "Website CMS setup required" : "Website CMS unavailable"} message={loadDetail} />{siteId === "jmt-music" && canEdit && <div className="mt-4 flex justify-center"><SetupButton pending={setupPending} onClick={setup} /></div>}{siteId !== "jmt-music" && <p className="mt-4 text-center text-xs text-amber-200/70">Jonathan Tripp CMS setup is prepared but not connected yet.</p>}{setupMessage && <p role="status" className="mt-4 text-center text-xs text-slate-400">{setupMessage}</p>}</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <AdminCard className="h-fit overflow-hidden p-2">
        <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Website Pages</p>
        <nav aria-label="Website pages" className="space-y-1">{WEBSITE_PAGES.map((page) => {
          const count = sections.filter((section) => section.pageKey === page.key).length;
          const active = selectedPage === page.key;
          return <button key={page.key} type="button" onClick={() => setSelectedPage(page.key)} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition ${active ? "bg-sky-300/10 font-semibold text-sky-200" : "text-slate-400 hover:bg-white/[0.035] hover:text-white"}`}><span>{page.label}</span><span className="flex items-center gap-1.5 text-[10px] text-slate-600">{count}<ChevronRight className="h-3.5 w-3.5" /></span></button>;
        })}</nav>
        {siteId === "jmt-music" && canEdit && <div className="mt-2 border-t border-white/7 p-2"><SetupButton pending={setupPending} onClick={setup} compact /></div>}
      </AdminCard>

      <div>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">{selectedPageLabel} page</p><h2 className="mt-1 font-sans text-xl font-semibold">{selectedPageLabel} Sections</h2><p className="mt-1 text-xs text-slate-500">Select a section to edit its website copy and calls to action.</p></div><span className="rounded-full border border-white/8 px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500">{pageSections.length} section{pageSections.length === 1 ? "" : "s"}</span></div>
        {pageSections.length ? <div className="space-y-4">{pageSections.map((section) => <WebsiteSectionCard key={section.id} section={section} siteId={siteId} canEdit={canEdit} onSaved={(saved) => setSections((current) => current.map((item) => item.id === saved.id ? saved : item))} />)}</div> : <EmptyState title={`No ${selectedPageLabel} sections yet`} message={canEdit && siteId === "jmt-music" ? "Use Create Default Sections to prepare this page." : "No editable CMS sections are available for this page."} />}
        {setupMessage && <p role="status" className="mt-4 text-xs text-slate-400">{setupMessage}</p>}
      </div>
    </div>
  );
}

function SetupButton({ pending, onClick, compact = false }: { pending: boolean; onClick: () => void; compact?: boolean }) {
  return <button type="button" disabled={pending} onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold disabled:opacity-60 ${compact ? "w-full border border-white/8 px-3 py-2.5 text-xs text-slate-300" : "min-h-11 bg-sky-300 px-4 text-sm text-slate-950"}`}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{pending ? "Creating…" : "Create Default Sections"}</button>;
}

function WebsiteSectionCard({ section, siteId, canEdit, onSaved }: { section: CmsWebsiteSection; siteId: SiteId; canEdit: boolean; onSaved: (section: CmsWebsiteSection) => void }) {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
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
        onSaved(result.section);
        setDirty(false);
      }
    } catch {
      setState({ status: "error", message: "The website section could not be saved." });
    } finally {
      setPending(false);
    }
  };

  const close = () => {
    if (!pending) {
      setOpen(false);
      setDirty(false);
      setState(idleState);
    }
  };

  return (
    <>
      <AdminCard className="flex flex-col gap-5 p-5 md:flex-row md:items-center">
        <span className="text-slate-700"><GripVertical /></span><span className="grid h-12 w-12 place-items-center rounded-xl bg-sky-300/8 text-sky-300"><FilePenLine className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h3 className="font-sans text-base font-semibold">{section.title}</h3><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${section.published ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-400/10 text-slate-400"}`}>{section.published ? "Published in CMS" : "Draft"}</span><span className="text-[10px] text-slate-600">Order {section.sortOrder}</span></div><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{String(content.heading || content.body || "No preview text yet. Open this section to add content.")}</p></div>
        <button type="button" disabled={!canEdit} onClick={() => setOpen(true)} className="rounded-xl border border-white/8 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-sky-300/30 hover:text-white disabled:cursor-not-allowed disabled:text-slate-600">{canEdit ? "Edit Section" : "Read Only"}</button>
      </AdminCard>

      {open && <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby={`section-${section.id}`} className="my-8 w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0a0f16] shadow-2xl"><header className="flex items-start justify-between border-b border-white/8 p-6"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">{dirty ? "Unsaved changes" : "All changes saved"}</p><h2 id={`section-${section.id}`} className="mt-2 font-sans text-2xl font-semibold">{section.title}</h2><p className="mt-2 text-sm text-slate-500">This editor is staged. The public website remains unchanged.</p></div><button type="button" disabled={pending} onClick={close} aria-label="Close section editor" className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button></header>
        <form onSubmit={save} onChange={() => setDirty(true)} className="p-6">
          <input type="hidden" name="section_id" value={section.id} /><input type="hidden" name="property" value={siteId} /><input type="hidden" name="page_key" value={section.pageKey} />
          <div className="grid gap-5 md:grid-cols-2">
            <label className={labelClass}>Eyebrow<span className="ml-2 font-normal text-slate-600">Small introductory text</span><input className={inputClass} name="eyebrow" maxLength={80} defaultValue={String(content.eyebrow || "")} /></label>
            <label className={`${labelClass} md:col-span-2`}>Heading<span className="ml-2 font-normal text-slate-600">Main section headline</span><input className={inputClass} name="heading" maxLength={160} defaultValue={String(content.heading || "")} /></label>
            <label className={`${labelClass} md:col-span-2`}>Body<span className="ml-2 font-normal text-slate-600">Supporting paragraph or description</span><textarea className={`${inputClass} min-h-32 py-3`} name="body" maxLength={5000} defaultValue={String(content.body || "")} /></label>
            <label className={labelClass}>Primary CTA label<input className={inputClass} name="primary_cta_label" maxLength={80} defaultValue={String(content.primary_cta_label || "")} /></label>
            <label className={labelClass}>Primary CTA URL<input className={inputClass} name="primary_cta_url" placeholder="/contact or https://…" maxLength={500} defaultValue={String(content.primary_cta_url || "")} /></label>
            <label className={labelClass}>Secondary CTA label<input className={inputClass} name="secondary_cta_label" maxLength={80} defaultValue={String(content.secondary_cta_label || "")} /></label>
            <label className={labelClass}>Secondary CTA URL<input className={inputClass} name="secondary_cta_url" placeholder="/services or https://…" maxLength={500} defaultValue={String(content.secondary_cta_url || "")} /></label>
            <label className={labelClass}>Sort order<input className={inputClass} name="sort_order" type="number" min="0" max="10000" step="1" defaultValue={section.sortOrder} /></label>
            <label className="flex items-center gap-2 self-end pb-3 text-xs font-semibold text-slate-300"><input type="checkbox" name="published" defaultChecked={section.published} className="accent-sky-300" />Published in CMS</label>
          </div>
          {state.status === "error" && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-xs text-red-200">{state.message}</p>}
          {state.status === "success" && state.message && <p role="status" className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-xs text-emerald-200">{state.message}</p>}
          <footer className="mt-6 flex items-center justify-between gap-3"><span className={`text-xs ${dirty ? "text-amber-300" : "text-emerald-300"}`}>{dirty ? "Unsaved changes" : "Saved"}</span><div className="flex gap-3"><button type="button" disabled={pending} onClick={close} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">Close</button><button type="submit" disabled={pending || !dirty} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Saving</> : <><Check className="h-4 w-4" />Save Changes</>}</button></div></footer>
        </form>
      </section></div>}
    </>
  );
}
