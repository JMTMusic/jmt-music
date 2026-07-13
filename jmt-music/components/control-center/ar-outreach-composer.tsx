"use client";

import { useState } from "react";
import { Check, Copy, LoaderCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateArArtistAction, updateArArtistStatusAction } from "@/app/control-center/ar/actions";
import { canComposeOutreachDraft, composeOutreachDraft } from "@/lib/ar/pipeline";
import type { ArArtistRecord } from "@/lib/ar/types";
import type { SiteId } from "@/lib/control-center/types";

/**
 * Composes an outreach draft from information Jonathan actually types in here — never from
 * anything scraped or inferred. canComposeOutreachDraft/composeOutreachDraft
 * (lib/ar/pipeline.ts) refuse to produce anything until a specific compliment is entered, so
 * there's no generic-template fallback to mistake for real research. The draft is only ever
 * saved when Jonathan clicks Save, and it is never sent from here — Copy Draft is the only
 * way it leaves this page.
 */
export function ArOutreachComposer({ artist, propertyId, canEdit }: { artist: ArArtistRecord; propertyId: SiteId; canEdit: boolean }) {
  const [compliment, setCompliment] = useState("");
  const [whyFit, setWhyFit] = useState("");
  const [service, setService] = useState("");
  const [tone, setTone] = useState<"warm" | "professional" | "casual">("warm");
  const [draft, setDraft] = useState(artist.outreachDraft || "");
  const [editingDraft, setEditingDraft] = useState(false);
  const [pending, setPending] = useState<"save" | "contacted" | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const canCompose = canComposeOutreachDraft(artist, { specificCompliment: compliment });

  const generate = () => {
    const composed = composeOutreachDraft(artist, { specificCompliment: compliment, whyGoodFit: whyFit, possibleService: service, tone });
    if (composed) {
      setDraft(composed);
      setEditingDraft(false);
    }
  };

  const saveDraft = async () => {
    setPending("save");
    setError("");
    try {
      const result = await updateArArtistAction({ property: propertyId, id: artist.id, outreachDraft: draft || null });
      if (result.status === "error") setError(result.message);
      else router.refresh();
    } catch {
      setError("The draft could not be saved.");
    } finally {
      setPending(null);
    }
  };

  const markContacted = async () => {
    setPending("contacted");
    setError("");
    try {
      const result = await updateArArtistStatusAction({ property: propertyId, id: artist.id, status: "contacted" });
      if (result.status === "error") setError(result.message);
      else router.refresh();
    } catch {
      setError("The status could not be updated.");
    } finally {
      setPending(null);
    }
  };

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy — select and copy the text manually.");
    }
  };

  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white outline-none transition focus:border-sky-300/60";
  const labelClass = "text-xs font-semibold text-slate-300";

  if (!canEdit) {
    return draft ? <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{draft}</p> : <p className="text-sm text-slate-500">No outreach draft yet.</p>;
  }

  return (
    <div>
      <p className="text-xs leading-5 text-slate-500">A draft only comes together once there's something specific to say — write in a real compliment below (what you actually noticed about their music), and nothing else here gets invented.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className={`${labelClass} md:col-span-2`}>Specific compliment *<textarea value={compliment} onChange={(event) => setCompliment(event.target.value)} className={`${inputClass} min-h-16 py-3`} maxLength={2000} placeholder="What did you actually notice about their music?" /></label>
        <label className={labelClass}>Why JMT is a fit<input value={whyFit} onChange={(event) => setWhyFit(event.target.value)} className={inputClass} maxLength={400} /></label>
        <label className={labelClass}>Possible service<input value={service} onChange={(event) => setService(event.target.value)} className={inputClass} maxLength={400} placeholder="e.g. Could be a great fit for mixing/mastering." /></label>
        <label className={labelClass}>Tone<select value={tone} onChange={(event) => setTone(event.target.value as typeof tone)} className={inputClass}>
          <option value="warm">Warm</option>
          <option value="professional">Professional</option>
          <option value="casual">Casual</option>
        </select></label>
      </div>
      <button type="button" disabled={!canCompose} onClick={generate} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-300/40 bg-sky-300/10 px-4 text-sm font-semibold text-sky-200 disabled:cursor-not-allowed disabled:opacity-40"><Sparkles className="h-4 w-4" />Generate Draft</button>

      {draft && (
        <div className="mt-5 rounded-xl border border-white/8 bg-black/20 p-4">
          {editingDraft ? (
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-40 w-full rounded-lg border border-white/10 bg-black/25 p-3 text-xs leading-5 text-slate-200 outline-none focus:border-sky-300/60" />
          ) : (
            <p className="whitespace-pre-wrap text-xs leading-5 text-slate-300">{draft}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={copyDraft} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-[11px] font-semibold text-slate-200 hover:border-sky-300/40">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy Draft"}</button>
            <button type="button" onClick={() => setEditingDraft((value) => !value)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-[11px] font-semibold text-slate-200 hover:border-sky-300/40">{editingDraft ? "Done Editing" : "Edit Draft"}</button>
            <button type="button" disabled={pending !== null} onClick={saveDraft} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-[11px] font-semibold text-slate-200 hover:border-sky-300/40 disabled:opacity-50">{pending === "save" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : "Save Draft"}</button>
            {artist.status !== "contacted" && artist.status !== "converted" && (
              <button type="button" disabled={pending !== null} onClick={markContacted} className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 text-[11px] font-semibold text-emerald-200 disabled:opacity-50">{pending === "contacted" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : "Mark Contacted"}</button>
            )}
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-400/20 bg-red-400/[0.06] p-2 text-[11px] text-red-200">{error}</p>}
    </div>
  );
}
