"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Check, LoaderCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  cleanupBeatUploads,
  createBeat,
  prepareBeatUploads,
  updateBeat,
  type CreateBeatState
} from "@/app/control-center/beats/actions";
import { exportSquareArtwork } from "@/lib/control-center/crop-image";
import type { Beat, SiteId } from "@/lib/control-center/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const initialState: CreateBeatState = { status: "idle", message: "" };
const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const audioTypes = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a"];

type BeatDialogProps = {
  propertyId: SiteId;
  disabled?: boolean;
  beat?: Beat;
  trigger?: ReactNode;
};

/** Add/edit Beat dialog with square artwork processing and direct signed Storage uploads. */
export function AddBeatDialog({ propertyId, disabled = false, beat, trigger }: BeatDialogProps) {
  const editing = Boolean(beat);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<CreateBeatState>(initialState);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [artwork, setArtwork] = useState<File | null>(null);
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null);
  const [artworkError, setArtworkError] = useState("");
  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPixels, setCropPixels] = useState<Area | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [audioError, setAudioError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => () => {
    if (sourceImage) URL.revokeObjectURL(sourceImage);
    if (artworkPreview) URL.revokeObjectURL(artworkPreview);
    if (audioPreview) URL.revokeObjectURL(audioPreview);
  }, [sourceImage, artworkPreview, audioPreview]);

  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white outline-none transition focus:border-sky-300/60";
  const labelClass = "text-xs font-semibold text-slate-300";

  const selectArtwork = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setArtworkError("");
    if (!file) return;
    if (!imageTypes.includes(file.type)) {
      setArtworkError("Use a JPG, PNG, WebP, or AVIF image.");
      event.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setArtworkError("Artwork must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }
    if (sourceImage) URL.revokeObjectURL(sourceImage);
    const imageUrl = URL.createObjectURL(file);
    setSourceImage(imageUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropOpen(true);
  };

  const saveCrop = async () => {
    if (!sourceImage || !cropPixels) return;
    try {
      const processed = await exportSquareArtwork(sourceImage, cropPixels);
      if (processed.size > 10 * 1024 * 1024) throw new Error("Processed artwork exceeds 10 MB.");
      if (artworkPreview) URL.revokeObjectURL(artworkPreview);
      setArtwork(processed);
      setArtworkPreview(URL.createObjectURL(processed));
      setArtworkError("");
      setCropOpen(false);
    } catch (error) {
      setArtwork(null);
      setArtworkError(error instanceof Error ? error.message : "Artwork cropping failed.");
    }
  };

  const selectAudio = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setAudioError("");
    setAudio(null);
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setAudioPreview(null);
    if (!file) return;
    if (!audioTypes.includes(file.type) && !/\.(mp3|wav|m4a)$/i.test(file.name)) {
      setAudioError("Use an MP3, WAV, or M4A audio file.");
      event.target.value = "";
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setAudioError("Audio must be 100 MB or smaller.");
      event.target.value = "";
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase();
    const fallbackType = extension === "mp3" ? "audio/mpeg" : extension === "wav" ? "audio/wav" : "audio/mp4";
    const normalizedFile = audioTypes.includes(file.type) ? file : new File([file], file.name, { type: fallbackType });
    setAudio(normalizedFile);
    setAudioPreview(URL.createObjectURL(normalizedFile));
  };

  const submitBeat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (artworkError || audioError) return;
    setPending(true);
    setState(initialState);
    const formData = new FormData(event.currentTarget);
    const slug = String(formData.get("slug") || "").trim().toLowerCase();
    let artworkPath: string | undefined;
    let audioPath: string | undefined;

    try {
      const prepared = await prepareBeatUploads({
        property: propertyId,
        slug,
        beatId: beat?.id,
        artwork: artwork ? { size: artwork.size, type: artwork.type } : undefined,
        audio: audio ? { size: audio.size, type: audio.type } : undefined
      });
      if (prepared.status === "error") {
        setState({ status: "error", message: prepared.message });
        return;
      }

      const supabase = getSupabaseBrowserClient();
      if (artwork && prepared.artwork) {
        artworkPath = prepared.artwork.path;
        const result = await supabase.storage.from(prepared.artwork.bucket).uploadToSignedUrl(
          prepared.artwork.path,
          prepared.artwork.token,
          artwork,
          { contentType: artwork.type }
        );
        if (result.error) throw new Error("Artwork upload failed. The beat was not created.");
      }
      if (audio && prepared.audio) {
        audioPath = prepared.audio.path;
        const result = await supabase.storage.from(prepared.audio.bucket).uploadToSignedUrl(
          prepared.audio.path,
          prepared.audio.token,
          audio,
          { contentType: audio.type || "audio/mp4" }
        );
        if (result.error) throw new Error("Audio upload failed. The beat was not created.");
      }

      formData.delete("artwork");
      formData.delete("audio");
      if (artworkPath) formData.set("artwork_path", artworkPath);
      if (audioPath) formData.set("audio_path", audioPath);
      const result = editing ? await updateBeat(initialState, formData) : await createBeat(initialState, formData);
      setState(result);
      if (result.status === "success") {
        formRef.current?.reset();
        setArtwork(null);
        setAudio(null);
        setArtworkPreview(null);
        setAudioPreview(null);
        router.refresh();
        setOpen(false);
      } else {
        await cleanupBeatUploads({ property: propertyId, slug, artworkPath, audioPath });
      }
    } catch (error) {
      await cleanupBeatUploads({ property: propertyId, slug, artworkPath, audioPath });
      setState({ status: "error", message: error instanceof Error ? error.message : "File upload failed. The beat was not created." });
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {trigger ? (
        <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="block w-full text-left disabled:cursor-not-allowed disabled:opacity-60" aria-label={`Edit ${beat?.title || "beat"}`}>{trigger}</button>
      ) : (
        <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-300 px-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />Add Beat</button>
      )}
      {open && <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" role="presentation">
        <section role="dialog" aria-modal="true" aria-labelledby="beat-dialog-title" className="my-8 w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0a0f16] shadow-2xl">
          <header className="flex items-start justify-between border-b border-white/8 p-6"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">Beat Library</p><h2 id="beat-dialog-title" className="mt-2 font-sans text-2xl font-semibold">{editing ? "Edit Beat" : "Add Beat"}</h2><p className="mt-2 text-sm text-slate-500">{editing ? "Update beat details or replace its artwork and audio." : "Create the beat, square artwork, and optional audio preview."}</p></div><button type="button" onClick={() => setOpen(false)} disabled={pending} aria-label="Close beat dialog" className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button></header>
          <form ref={formRef} onSubmit={submitBeat} className="p-6">
            <input type="hidden" name="property" value={propertyId} />
            {beat && <input type="hidden" name="beat_id" value={beat.id} />}
            <div className="mb-6 grid gap-4 rounded-xl border border-white/8 bg-white/[0.02] p-4 sm:grid-cols-[120px_1fr] sm:items-center">
              <div className="aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/25">{(artworkPreview || beat?.cover) ? <img src={artworkPreview || beat?.cover} alt="Cover artwork preview" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center px-3 text-center text-[10px] uppercase tracking-wider text-slate-600">Artwork preview</div>}</div>
              <label className={labelClass}>{editing ? "Replace cover artwork" : "Cover artwork"}<input className={`${inputClass} cursor-pointer py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-300/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-sky-200`} name="artwork" type="file" accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif" onChange={selectArtwork} /><span className="mt-2 block text-[11px] font-normal text-slate-500">Square WebP output · 1200×1200 · Maximum 10 MB{editing ? " · Leave empty to keep existing" : ""}</span>{(artworkError || state.fieldErrors?.artwork) && <span className="mt-1 block text-[11px] text-red-300">{artworkError || state.fieldErrors?.artwork}</span>}</label>
            </div>
            <div className="mb-6 rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <label className={labelClass}>{editing ? "Replace audio preview" : "Audio preview"}<input className={`${inputClass} cursor-pointer py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-300/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-sky-200`} name="audio" type="file" accept="audio/mpeg,audio/wav,audio/mp4,.mp3,.wav,.m4a" onChange={selectAudio} /><span className="mt-2 block text-[11px] font-normal text-slate-500">{audio ? `${audio.name} · ${(audio.size / 1024 / 1024).toFixed(1)} MB` : `MP3, WAV, or M4A · Maximum 100 MB${editing ? " · Leave empty to keep existing" : ""}`}</span>{audioError && <span className="mt-1 block text-[11px] text-red-300">{audioError}</span>}</label>
              {(audioPreview || beat?.audioUrl) && <audio className="mt-4 w-full" controls preload="metadata" src={audioPreview || beat?.audioUrl || undefined} />}
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label className={labelClass}>Title *<input className={inputClass} name="title" required minLength={2} maxLength={120} defaultValue={beat?.title} />{state.fieldErrors?.title && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.title}</span>}</label>
              <label className={labelClass}>Slug *<input className={inputClass} name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="my-new-beat" defaultValue={beat?.slug} />{state.fieldErrors?.slug && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.slug}</span>}</label>
              <label className={labelClass}>Genre *<input className={inputClass} name="genre" required maxLength={80} defaultValue={beat?.genre} /></label>
              <label className={labelClass}>BPM<input className={inputClass} name="bpm" type="number" min="1" max="400" step="1" defaultValue={beat?.bpm || ""} />{state.fieldErrors?.bpm && <span className="mt-1 block text-[11px] text-red-300">{state.fieldErrors.bpm}</span>}</label>
              <label className={`${labelClass} md:col-span-2`}>Description *<textarea className={`${inputClass} min-h-28 py-3`} name="description" required minLength={10} maxLength={2000} defaultValue={beat?.description} /></label>
              <label className={labelClass}>Musical key<input className={inputClass} name="musical_key" placeholder="D minor" maxLength={40} defaultValue={beat?.musicalKey === "Not set" ? "" : beat?.musicalKey} /></label>
              <label className={labelClass}>Release date<input className={inputClass} name="release_date" type="date" defaultValue={beat?.releaseDateValue || ""} /></label>
              <label className={labelClass}>Sort order<input className={inputClass} name="sort_order" type="number" min="0" max="10000" step="1" defaultValue={beat?.sortOrder ?? 0} /></label>
              <label className={labelClass}>BeatStars URL<input className={inputClass} name="beatstars_url" type="url" placeholder="https://..." defaultValue={beat?.beatstarsUrl || ""} /></label>
            </div>
            <div className="mt-5 flex flex-wrap gap-5 rounded-xl border border-white/8 bg-white/[0.025] p-4"><label className="flex items-center gap-2 text-xs font-medium text-slate-300"><input type="checkbox" name="featured" className="accent-sky-300" defaultChecked={beat?.featured} />Featured</label><label className="flex items-center gap-2 text-xs font-medium text-slate-300"><input type="checkbox" name="published" className="accent-sky-300" defaultChecked={beat?.published} />Published</label></div>
            {state.status === "error" && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-xs text-red-200">{state.message}</p>}
            <footer className="mt-6 flex justify-end gap-3"><button type="button" disabled={pending} onClick={() => setOpen(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button><button type="submit" disabled={pending || Boolean(artworkError || audioError || cropOpen)} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" />{editing ? "Saving" : "Uploading"}</> : <><Check className="h-4 w-4" />{editing ? "Save Changes" : "Create Beat"}</>}</button></footer>
          </form>
        </section>
      </div>}
      {cropOpen && sourceImage && <div className="fixed inset-0 z-[120] grid place-items-center bg-black/90 p-4"><section className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0a0f16] p-5"><div className="flex items-center justify-between"><div><h2 className="font-sans text-lg font-semibold">Position cover artwork</h2><p className="mt-1 text-xs text-slate-500">Drag to reposition. Use the slider to zoom.</p></div><button onClick={() => setCropOpen(false)} aria-label="Cancel crop"><X /></button></div><div className="relative mt-5 aspect-square overflow-hidden rounded-xl bg-black"><Cropper image={sourceImage} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_area, pixels) => setCropPixels(pixels)} /></div><label className="mt-5 block text-xs font-semibold text-slate-300">Zoom<input className="mt-2 w-full accent-sky-300" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label><div className="mt-5 flex justify-end gap-3"><button className="rounded-xl border border-white/10 px-4 py-2.5 text-sm" onClick={() => setCropOpen(false)}>Cancel</button><button className="rounded-xl bg-sky-300 px-4 py-2.5 text-sm font-semibold text-slate-950" onClick={saveCrop}>Use Crop</button></div></section></div>}
    </>
  );
}
