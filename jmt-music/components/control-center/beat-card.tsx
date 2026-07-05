"use client";

import { useState } from "react";
import Image from "next/image";
import { Copy, LoaderCircle, Music2, Rocket, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  deleteBeat,
  duplicateBeat,
  toggleBeatStatus
} from "@/app/control-center/beats/actions";
import { AddBeatDialog } from "@/components/control-center/add-beat-dialog";
import { AdminCard } from "@/components/control-center/ui";
import type { Beat, SiteId } from "@/lib/control-center/types";

type BeatCardProps = {
  beat: Beat;
  propertyId: SiteId;
  real: boolean;
  canEdit: boolean;
};

/** Beat card with optimistic, property-scoped controls for real Supabase records. */
export function BeatCard({ beat, propertyId, real, canEdit }: BeatCardProps) {
  const [published, setPublished] = useState(Boolean(beat.published));
  const [featured, setFeatured] = useState(beat.featured);
  const [pending, setPending] = useState<"published" | "featured" | "duplicate" | "delete" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const content = (
    <>
      <div className="relative aspect-square overflow-hidden">
        <Image src={beat.cover} alt={`${beat.title} cover art`} fill className="object-cover transition duration-500 group-hover:scale-[1.03]" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {real && <span className={`rounded-full border px-3 py-1 text-[9px] font-bold uppercase tracking-wider backdrop-blur ${published ? "border-emerald-200/20 bg-emerald-300/90 text-slate-950" : "border-white/10 bg-slate-950/75 text-slate-300"}`}>{published ? "Published" : "Draft"}</span>}
          {featured && <span className="rounded-full border border-sky-200/20 bg-sky-300/90 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-950">Featured</span>}
        </div>
        <span className="absolute bottom-4 right-4 grid h-11 w-11 place-items-center rounded-full bg-slate-950/80 text-sky-300 backdrop-blur"><Music2 className="h-5 w-5" /></span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-lg font-semibold tracking-tight">{beat.title}</p><p className="mt-1 text-xs text-sky-300">{beat.genre}</p></div><span className="text-[10px] text-slate-500">{beat.releaseDate}</span></div>
        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/7 pt-4 text-xs"><span className="text-slate-500"><strong className="block text-slate-200">{beat.bpm || "—"}</strong>BPM</span><span className="text-slate-500"><strong className="block text-slate-200">{beat.musicalKey}</strong>Key</span><span className="text-slate-500"><strong className="block text-slate-200">{featured ? "Yes" : "No"}</strong>Featured</span></div>
      </div>
    </>
  );

  const toggle = async (field: "published" | "featured") => {
    const previous = field === "published" ? published : featured;
    const optimistic = !previous;
    field === "published" ? setPublished(optimistic) : setFeatured(optimistic);
    setPending(field);
    setError("");
    try {
      const result = await toggleBeatStatus({ beatId: beat.id, property: propertyId, field });
      if (result.status === "error") {
        field === "published" ? setPublished(previous) : setFeatured(previous);
        setError(result.message);
      } else if (typeof result.value === "boolean") {
        field === "published" ? setPublished(result.value) : setFeatured(result.value);
      }
    } catch {
      field === "published" ? setPublished(previous) : setFeatured(previous);
      setError("The beat status could not be updated.");
    } finally {
      setPending(null);
    }
  };

  const duplicate = async () => {
    setPending("duplicate");
    setError("");
    try {
      const result = await duplicateBeat({ beatId: beat.id, property: propertyId });
      if (result.status === "error") setError(result.message);
      else router.refresh();
    } catch {
      setError("The beat could not be duplicated.");
    } finally {
      setPending(null);
    }
  };

  const remove = async () => {
    setPending("delete");
    setError("");
    try {
      const result = await deleteBeat({ beatId: beat.id, property: propertyId });
      if (result.status === "error") setError(result.message);
      else {
        setDeleteOpen(false);
        router.refresh();
      }
    } catch {
      setError("The beat could not be deleted.");
    } finally {
      setPending(null);
    }
  };

  if (!real) return <AdminCard className="group overflow-hidden transition hover:-translate-y-1 hover:border-sky-300/25">{content}</AdminCard>;

  return (
    <>
      <AdminCard className="group overflow-hidden transition hover:-translate-y-1 hover:border-sky-300/25">
        {canEdit ? <AddBeatDialog propertyId={propertyId} beat={{ ...beat, published, featured }} trigger={content} /> : content}
        <div className="flex flex-wrap gap-1.5 border-t border-white/7 p-3">
          {canEdit ? <>
            <button type="button" onClick={() => void toggle("published")} disabled={pending !== null} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50"><Rocket className="h-3.5 w-3.5" />{pending === "published" ? "Updating" : published ? "Unpublish" : "Publish"}</button>
            <button type="button" onClick={() => void toggle("featured")} disabled={pending !== null} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50"><Star className={`h-3.5 w-3.5 ${featured ? "fill-sky-300 text-sky-300" : ""}`} />{pending === "featured" ? "Updating" : featured ? "Unfeature" : "Feature"}</button>
            <button type="button" onClick={duplicate} disabled={pending !== null} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50"><Copy className="h-3.5 w-3.5" />{pending === "duplicate" ? "Copying" : "Duplicate"}</button>
            <button type="button" onClick={() => setDeleteOpen(true)} disabled={pending !== null} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-red-300/75 transition hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Delete</button>
          </> : <span className="px-2 py-1 text-[10px] uppercase tracking-wider text-slate-600">Read only</span>}
        </div>
        {error && <p role="alert" className="mx-3 mb-3 rounded-lg border border-red-400/20 bg-red-400/[0.06] p-2.5 text-[11px] text-red-200">{error}</p>}
      </AdminCard>
      {deleteOpen && <div className="fixed inset-0 z-[130] grid place-items-center bg-black/85 p-4 backdrop-blur-sm"><section role="alertdialog" aria-modal="true" aria-labelledby={`delete-${beat.id}`} className="w-full max-w-md rounded-2xl border border-red-400/20 bg-[#0a0f16] p-6 shadow-2xl"><Trash2 className="h-6 w-6 text-red-300" /><h2 id={`delete-${beat.id}`} className="mt-5 font-sans text-xl font-semibold">Delete “{beat.title}”?</h2><p className="mt-2 text-sm leading-6 text-slate-400">This removes only the beat record. Artwork and audio remain in storage.</p><div className="mt-6 flex justify-end gap-3"><button type="button" disabled={pending !== null} onClick={() => setDeleteOpen(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">Keep Beat</button><button type="button" disabled={pending !== null} onClick={remove} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-red-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending === "delete" ? <><LoaderCircle className="h-4 w-4 animate-spin" />Deleting</> : <><Trash2 className="h-4 w-4" />Delete Beat</>}</button></div></section></div>}
    </>
  );
}
