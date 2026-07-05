"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { ArrowDown, ArrowRight, ArrowUp, Check, Copy, Eye, EyeOff, ImageIcon, LoaderCircle, Pencil, Plus, Rocket, Settings2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { mutateWebsiteSection, prepareWebsiteImageUpload, setupJmtWebsiteSections, updateWebsiteSection, type SectionMutation, type WebsiteActionResult } from "@/app/control-center/website/actions";
import { EmptyState } from "@/components/control-center/ui";
import { exportSquareArtwork } from "@/lib/control-center/crop-image";
import type { SiteId } from "@/lib/control-center/types";
import { WEBSITE_PAGES, type CmsWebsiteSection, type WebsitePageKey } from "@/lib/control-center/website-types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const idleState: WebsiteActionResult = { status: "success", message: "" };

/** Visitor-style website canvas with an explicit draft editing mode. */
export function WebsiteCms({ siteId, sections: initialSections, canEdit, loadStatus, loadDetail }: {
  siteId: SiteId; sections: CmsWebsiteSection[]; canEdit: boolean; loadStatus: "empty" | "error" | "ready"; loadDetail: string;
}) {
  const [sections, setSections] = useState(initialSections);
  const [page, setPage] = useState<WebsitePageKey>("home");
  const [editMode, setEditMode] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  useEffect(() => setSections(initialSections), [initialSections]);
  const pageSections = useMemo(() => sections.filter((section) => section.pageKey === page).sort((a, b) => a.sortOrder - b.sortOrder), [sections, page]);

  const setup = async () => {
    setPending(true); setMessage("");
    try { const result = await setupJmtWebsiteSections(); setMessage(result.message); if (result.status === "success") router.refresh(); }
    catch { setMessage("Website setup failed."); } finally { setPending(false); }
  };
  const publishPage = async () => {
    setPending(true); setMessage("");
    try {
      const results = await Promise.all(pageSections.map((section) => mutateWebsiteSection({ sectionId: section.id, property: siteId, mutation: "publish" })));
      const failed = results.find((result) => result.status === "error");
      setMessage(failed?.message || "Page published to the staged snapshot.");
      if (!failed) router.refresh();
    } catch { setMessage("The page could not be published."); } finally { setPending(false); }
  };

  if (loadStatus !== "ready") return <div><EmptyState title={loadStatus === "empty" ? "Your visual editor is ready to set up" : "Website editor unavailable"} message={loadDetail} />{siteId === "jmt-music" && canEdit && <div className="mt-5 flex justify-center"><button onClick={setup} disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-300 px-5 text-sm font-semibold text-slate-950">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Create Default Sections</button></div>}</div>;

  return <div>
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/8 bg-[#080c12] p-3 lg:flex-row lg:items-center">
      <div className="flex flex-1 gap-1 overflow-x-auto">{WEBSITE_PAGES.filter((item) => item.key !== "global").map((item) => <button key={item.key} onClick={() => setPage(item.key)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-semibold transition ${page === item.key ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"}`}>{item.label}</button>)}</div>
      <div className="flex gap-2">{canEdit && <button onClick={() => setEditMode((value) => !value)} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold ${editMode ? "border-sky-300 bg-sky-300 text-slate-950" : "border-white/10 text-slate-200"}`}><Pencil className="h-3.5 w-3.5" />{editMode ? "Exit Edit Mode" : "Edit Website"}</button>}{canEdit && <button onClick={publishPage} disabled={pending || !pageSections.length} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 px-4 py-2.5 text-xs font-semibold text-emerald-200 disabled:opacity-50"><Rocket className="h-3.5 w-3.5" />Publish</button>}</div>
    </div>
    {message && <p role="status" className="mb-4 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-slate-300">{message}</p>}
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#05070a] shadow-2xl">
      <div className="flex h-14 items-center justify-between border-b border-white/8 bg-[#080b10] px-6"><span className="text-xs font-black tracking-[.14em]">JMT MUSIC</span><div className="hidden gap-5 text-[10px] font-semibold text-slate-500 sm:flex"><span>Home</span><span>Beats</span><span>Services</span><span>Sync</span><span>Contact</span></div><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${editMode ? "bg-sky-300/10 text-sky-300" : "bg-emerald-300/10 text-emerald-300"}`}>{editMode ? "Editing draft" : "Preview"}</span></div>
      {pageSections.length ? pageSections.map((section, index) => <VisualSection key={section.id} section={section} siteId={siteId} canEdit={canEdit} editMode={editMode} first={index === 0} onMessage={setMessage} />) : <div className="p-16"><EmptyState title="This page has no sections" message={canEdit ? "Create the default layout or add a section from another page." : "There is nothing to preview yet."} /></div>}
    </div>
  </div>;
}

function VisualSection({ section, siteId, canEdit, editMode, first, onMessage }: {
  section: CmsWebsiteSection; siteId: SiteId; canEdit: boolean; editMode: boolean; first: boolean; onMessage: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [focusField, setFocusField] = useState("heading");
  const [working, setWorking] = useState(false);
  const router = useRouter();
  const content = section.content;
  const type = content.section_type || (first ? "hero" : "text");
  const hidden = Boolean(content.hidden);
  const imageUrl = content.image_path ? getSupabaseBrowserClient().storage.from("website-media").getPublicUrl(content.image_path).data.publicUrl : null;
  const edit = (field: string) => { if (editMode && canEdit) { setFocusField(field); setOpen(true); } };
  const mutate = async (mutation: SectionMutation) => {
    if (mutation === "delete" && !window.confirm(`Delete “${section.title}”?`)) return;
    setWorking(true);
    try { const result = await mutateWebsiteSection({ sectionId: section.id, property: siteId, mutation }); onMessage(result.message); if (result.status === "success") router.refresh(); }
    catch { onMessage("The section could not be updated."); } finally { setWorking(false); }
  };
  const editable = editMode && canEdit;
  const region = "relative cursor-default rounded outline-none transition " + (editable ? "hover:outline hover:outline-2 hover:outline-sky-300/70 hover:outline-offset-4" : "");

  return <section className={`group/section relative border-b border-white/8 ${hidden ? "opacity-40" : ""}`}>
    {editable && <div className="absolute right-3 top-3 z-30 flex flex-wrap gap-1 rounded-xl border border-white/10 bg-[#080b10]/95 p-1.5 shadow-xl backdrop-blur">
      <button title="Move up" onClick={() => mutate("move-up")} disabled={working}><ArrowUp className="h-3.5 w-3.5" /></button><button title="Move down" onClick={() => mutate("move-down")} disabled={working}><ArrowDown className="h-3.5 w-3.5" /></button><button title="Duplicate" onClick={() => mutate("duplicate")} disabled={working}><Copy className="h-3.5 w-3.5" /></button><button title={hidden ? "Show" : "Hide"} onClick={() => mutate("toggle-hidden")} disabled={working}>{hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button><button title="Add below" onClick={() => mutate("add-below")} disabled={working}><Plus className="h-3.5 w-3.5" /></button><button title="Delete" onClick={() => mutate("delete")} disabled={working} className="text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>}
    <div className={`${type === "hero" ? "min-h-[520px] px-8 py-28 sm:px-16" : "px-8 py-20 sm:px-16"} relative overflow-hidden`}>
      {imageUrl && <button type="button" onClick={() => edit("image")} className={`absolute inset-0 ${editable ? "cursor-pointer" : "pointer-events-none"}`}><img src={imageUrl} alt="" className="h-full w-full object-cover opacity-35" style={{ objectPosition: `${content.image_position?.x ?? 50}% ${content.image_position?.y ?? 50}%` }} /></button>}
      <div className="relative z-10 mx-auto max-w-5xl">
        {type === "beat-grid" ? <BeatGridPreview /> : type === "services" ? <ServicesPreview /> : type === "contact" ? <ContactPreview content={content} edit={edit} editable={editable} region={region} /> : <>
          <button type="button" onClick={() => edit("eyebrow")} className={`${region} block text-left text-[10px] font-extrabold uppercase tracking-[.2em] text-sky-300`}>{content.eyebrow || (editable ? "Click to add eyebrow" : "")}{editable && <Pencil className="ml-2 inline h-3 w-3 opacity-0 group-hover/section:opacity-100" />}</button>
          <button type="button" onClick={() => edit("heading")} className={`${region} mt-5 block max-w-4xl text-left font-serif text-5xl leading-[.95] text-white sm:text-7xl`}>{content.heading || section.title}{editable && <Pencil className="ml-3 inline h-4 w-4 opacity-0 group-hover/section:opacity-100" />}</button>
          <button type="button" onClick={() => edit("body")} className={`${region} mt-6 block max-w-2xl text-left text-base leading-7 text-slate-400`}>{content.body || (editable ? "Click to add supporting copy." : "")}{editable && <Pencil className="ml-2 inline h-3.5 w-3.5 opacity-0 group-hover/section:opacity-100" />}</button>
          <div className="mt-8 flex flex-wrap gap-3">{content.primary_cta_label && <button onClick={() => edit("primary_cta_label")} className={`${region} inline-flex min-h-12 items-center gap-2 rounded-md bg-sky-400 px-5 text-xs font-bold uppercase tracking-wider text-slate-950`}>{content.primary_cta_label}<ArrowRight className="h-4 w-4" /></button>}{content.secondary_cta_label && <button onClick={() => edit("secondary_cta_label")} className={`${region} min-h-12 rounded-md border border-white/15 px-5 text-xs font-bold uppercase tracking-wider`}>{content.secondary_cta_label}</button>}</div>
        </>}
      </div>
    </div>
    {open && <SectionEditor section={section} siteId={siteId} focusField={focusField} onClose={() => setOpen(false)} onMessage={onMessage} />}
  </section>;
}

function BeatGridPreview() { return <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">Featured beats</p><h2 className="mt-4 font-serif text-5xl">Find your starting point.</h2><div className="mt-10 grid gap-4 sm:grid-cols-3">{["Midnight Drive", "Blue Notes", "After Hours"].map((name, index) => <div key={name} className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]"><div className={`aspect-square bg-gradient-to-br ${index === 0 ? "from-sky-900 to-black" : index === 1 ? "from-indigo-900 to-slate-950" : "from-slate-700 to-black"}`} /><div className="p-4"><p className="font-serif text-xl">{name}</p><span className="text-[10px] text-slate-500">Preview beat</span></div></div>)}</div></div>; }
function ServicesPreview() { return <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">Studio services</p><h2 className="mt-4 font-serif text-5xl">From direction to delivery.</h2><div className="mt-10 grid gap-px overflow-hidden rounded-lg bg-white/10 sm:grid-cols-3">{["Production", "Mixing & Mastering", "Piano & Keys"].map((name) => <div key={name} className="min-h-48 bg-[#080b10] p-6"><Settings2 className="h-5 w-5 text-sky-300" /><h3 className="mt-16 font-serif text-2xl">{name}</h3></div>)}</div></div>; }
function ContactPreview({ content, edit, editable, region }: { content: CmsWebsiteSection["content"]; edit: (field: string) => void; editable: boolean; region: string }) { return <div className="grid gap-12 md:grid-cols-2"><div><button onClick={() => edit("heading")} className={`${region} text-left font-serif text-6xl`}>{content.heading || "Tell me what you're making."}</button><button onClick={() => edit("body")} className={`${region} mt-6 text-left text-slate-400`}>{content.body || "Share the vision, timeline, and where the project is right now."}</button></div><div className="rounded-lg border border-white/10 bg-white/[0.03] p-7"><div className="grid gap-4">{["Name", "Email", "Project type", "Tell us about the project"].map((label) => <div key={label} className="h-12 rounded border border-white/10 bg-black/20 px-4 py-3 text-xs text-slate-600">{label}</div>)}</div><button className="mt-5 h-12 w-full rounded bg-sky-400 text-xs font-bold text-slate-950">Send inquiry</button></div></div>; }

function SectionEditor({ section, siteId, focusField, onClose, onMessage }: { section: CmsWebsiteSection; siteId: SiteId; focusField: string; onClose: () => void; onMessage: (message: string) => void }) {
  const [dirty, setDirty] = useState(false); const [pending, setPending] = useState(false); const [state, setState] = useState<WebsiteActionResult>(idleState);
  const [imagePath, setImagePath] = useState<string | null>(section.content.image_path || null); const [sourceImage, setSourceImage] = useState<string | null>(null); const [cropOpen, setCropOpen] = useState(false); const [crop, setCrop] = useState({ x: 0, y: 0 }); const [zoom, setZoom] = useState(1); const [pixels, setPixels] = useState<Area | null>(null); const [imageFile, setImageFile] = useState<File | null>(null); const [position, setPosition] = useState(section.content.image_position || { x: 50, y: 50 });
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white outline-none focus:border-sky-300/60";
  useEffect(() => { const target = document.querySelector(`[name="${focusField}"]`) as HTMLElement | null; target?.focus(); }, [focusField]);
  const handleImage = (file?: File) => { if (!file) return; if (file.size > 10 * 1024 * 1024 || !["image/jpeg","image/png","image/webp","image/avif"].includes(file.type)) { setState({ status: "error", message: "Use a JPG, PNG, WebP, or AVIF image no larger than 10 MB." }); return; } setSourceImage(URL.createObjectURL(file)); setCropOpen(true); setDirty(true); };
  const selectImage = (event: ChangeEvent<HTMLInputElement>) => handleImage(event.target.files?.[0]);
  const saveCrop = async () => { if (!sourceImage || !pixels) return; try { setImageFile(await exportSquareArtwork(sourceImage, pixels)); setCropOpen(false); } catch { setState({ status: "error", message: "Image cropping failed." }); } };
  const formatBody = (mark: "**" | "_") => { const textarea = bodyRef.current; if (!textarea) return; const start = textarea.selectionStart, end = textarea.selectionEnd; textarea.setRangeText(`${mark}${textarea.value.slice(start, end)}${mark}`, start, end, "end"); setDirty(true); };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setPending(true); setState(idleState); const form = new FormData(event.currentTarget);
    try {
      if (imageFile) { const prepared = await prepareWebsiteImageUpload({ property: siteId, sectionId: section.id, type: imageFile.type, size: imageFile.size }); if (prepared.status === "error" || !prepared.path || !prepared.token || !prepared.bucket) throw new Error(prepared.message); const upload = await getSupabaseBrowserClient().storage.from(prepared.bucket).uploadToSignedUrl(prepared.path, prepared.token, imageFile, { contentType: imageFile.type }); if (upload.error) throw new Error("Image upload failed."); setImagePath(prepared.path); form.set("image_path", prepared.path); } else form.set("image_path", imagePath || "");
      const result = await updateWebsiteSection(idleState, form); setState(result); onMessage(result.message); if (result.status === "success") { setDirty(false); setImageFile(null); router.refresh(); }
    } catch (error) { setState({ status: "error", message: error instanceof Error ? error.message : "Draft could not be saved." }); } finally { setPending(false); }
  };
  const c = section.content;
  return <div className="fixed inset-0 z-[150] grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"><section className="my-8 w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0a0f16] shadow-2xl"><header className="flex justify-between border-b border-white/8 p-6"><div><p className={`text-[10px] font-bold uppercase tracking-[.2em] ${dirty ? "text-amber-300" : "text-emerald-300"}`}>{dirty ? "Unsaved changes" : "Draft saved"}</p><h2 className="mt-2 font-serif text-3xl">{section.title}</h2></div><button onClick={onClose}><X /></button></header><form onSubmit={save} onChange={() => setDirty(true)} className="p-6"><input type="hidden" name="section_id" value={section.id}/><input type="hidden" name="property" value={siteId}/><input type="hidden" name="page_key" value={section.pageKey}/><input type="hidden" name="image_path" value={imagePath || ""}/><input type="hidden" name="image_position_x" value={position.x}/><input type="hidden" name="image_position_y" value={position.y}/>
    <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleImage(event.dataTransfer.files?.[0]); }} className="mb-6 rounded-xl border border-dashed border-white/12 bg-white/[0.02] p-4"><div className="flex flex-wrap items-center gap-3"><label className="cursor-pointer rounded-lg border border-white/10 px-3 py-2 text-xs"><ImageIcon className="mr-2 inline h-4 w-4"/>Replace image<input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/avif" onChange={selectImage}/></label><button type="button" onClick={() => { setImagePath(null); setImageFile(null); setDirty(true); }} className="text-xs text-red-300">Remove image</button><span className="text-[10px] text-slate-600">Drop an image here, then crop and position it.</span></div>{imageFile && <p className="mt-3 text-xs text-emerald-300">New cropped image ready to upload.</p>}{(imagePath || imageFile) && <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-[10px] text-slate-500">Horizontal position<input type="range" min="0" max="100" value={position.x} onChange={(e) => { setPosition({ ...position, x: Number(e.target.value) }); setDirty(true); }} className="mt-2 w-full accent-sky-300"/></label><label className="text-[10px] text-slate-500">Vertical position<input type="range" min="0" max="100" value={position.y} onChange={(e) => { setPosition({ ...position, y: Number(e.target.value) }); setDirty(true); }} className="mt-2 w-full accent-sky-300"/></label></div>}</div>
    <div className="grid gap-5 md:grid-cols-2"><label className="text-xs font-semibold">Eyebrow<input className={inputClass} name="eyebrow" maxLength={80} defaultValue={String(c.eyebrow || "")}/></label><label className="text-xs font-semibold md:col-span-2">Heading<input className={inputClass} name="heading" maxLength={160} defaultValue={String(c.heading || "")}/></label><label className="text-xs font-semibold md:col-span-2">Body<div className="mt-2 flex gap-2"><button type="button" onClick={() => formatBody("**")} className="rounded border border-white/10 px-2 py-1 font-bold">B</button><button type="button" onClick={() => formatBody("_")} className="rounded border border-white/10 px-2 py-1 italic">I</button></div><textarea ref={bodyRef} className={`${inputClass} min-h-32 py-3`} name="body" maxLength={5000} defaultValue={String(c.body || "")}/></label><label className="text-xs font-semibold">Primary button label<input className={inputClass} name="primary_cta_label" defaultValue={String(c.primary_cta_label || "")}/></label><label className="text-xs font-semibold">Primary button link<input className={inputClass} name="primary_cta_url" defaultValue={String(c.primary_cta_url || "")}/></label><label className="text-xs font-semibold">Secondary button label<input className={inputClass} name="secondary_cta_label" defaultValue={String(c.secondary_cta_label || "")}/></label><label className="text-xs font-semibold">Secondary button link<input className={inputClass} name="secondary_cta_url" defaultValue={String(c.secondary_cta_url || "")}/></label><label className="text-xs font-semibold">Sort order<input className={inputClass} name="sort_order" type="number" min="0" max="10000" defaultValue={section.sortOrder}/></label><div className="flex items-end pb-3 text-xs text-slate-500">{section.published ? "A published snapshot exists" : "Not published yet"}</div></div>{state.status === "error" && <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-200">{state.message}</p>}<footer className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm">Close</button><button type="submit" disabled={pending || !dirty} className="inline-flex items-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50">{pending ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4"/>}Save Draft</button></footer></form></section>
    {cropOpen && sourceImage && <div className="fixed inset-0 z-[170] grid place-items-center bg-black/90 p-4"><div className="w-full max-w-xl rounded-2xl bg-[#0a0f16] p-5"><h3 className="font-serif text-2xl">Crop and position image</h3><div className="relative mt-4 aspect-square"><Cropper image={sourceImage} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_a,p) => setPixels(p)}/></div><input className="mt-4 w-full accent-sky-300" type="range" min="1" max="3" step=".01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))}/><div className="mt-4 flex justify-end gap-3"><button onClick={() => setCropOpen(false)}>Cancel</button><button onClick={saveCrop} className="rounded-lg bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950">Use Image</button></div></div></div>}
  </div>;
}
