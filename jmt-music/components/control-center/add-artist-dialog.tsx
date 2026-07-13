"use client";

import { useRef, useState, type FormEvent } from "react";
import { Check, ChevronDown, LoaderCircle, Pencil, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createArArtistAction,
  updateArArtistAction,
  updateArArtistStatusAction,
  type ArArtistActionResult
} from "@/app/control-center/ar/actions";
import { AR_PRIORITIES, AR_SOURCES, FIT_SCORE_CATEGORIES, SELECTABLE_AR_STATUSES } from "@/lib/ar/types";
import { FIT_SCORE_CATEGORY_LABELS, PRIORITY_LABELS, SOURCE_LABELS, STATUS_LABELS } from "@/lib/ar/display";
import { getDisplayName } from "@/lib/control-center/lead-pipeline";
import type { ArArtistRecord, FitScoreCategory } from "@/lib/ar/types";
import type { Client, SiteId } from "@/lib/control-center/types";

type AddArtistDialogProps = {
  propertyId: SiteId;
  disabled?: boolean;
  /** Present = edit mode. Absent = create mode (fast entry — name + platform/source only). */
  artist?: ArArtistRecord;
  /** Only used in edit mode, for the "Related client" field. */
  clients?: Client[];
};

const initialState: ArArtistActionResult | { status: "idle" } = { status: "idle" };

function toOptionalNumber(value: FormDataEntryValue | null): number | null {
  const text = String(value || "").trim();
  return text ? Number(text) : null;
}

function toOptionalText(value: FormDataEntryValue | null): string | null {
  const text = String(value || "").trim();
  return text || null;
}

const FIT_FIELD_NAMES: Record<FitScoreCategory, string> = {
  genre: "fit_genre_score",
  musicalInterest: "fit_musical_interest_score",
  productionOpportunity: "fit_production_opportunity_score",
  professionalism: "fit_professionalism_score",
  recentActivity: "fit_recent_activity_score",
  audienceBusiness: "fit_audience_business_score",
  personalEnthusiasm: "fit_personal_enthusiasm_score"
};

const FIT_FIELD_VALUES: Record<FitScoreCategory, keyof ArArtistRecord> = {
  genre: "fitGenreScore",
  musicalInterest: "fitMusicalInterestScore",
  productionOpportunity: "fitProductionOpportunityScore",
  professionalism: "fitProfessionalismScore",
  recentActivity: "fitRecentActivityScore",
  audienceBusiness: "fitAudienceBusinessScore",
  personalEnthusiasm: "fitPersonalEnthusiasmScore"
};

/**
 * New/Edit Artist dialog — one component, two modes, mirroring exactly how
 * AddOpportunityDialog handles create vs. edit for Sales. Create mode is kept genuinely
 * fast: only artist name plus a primary platform or discovery source (either is enough)
 * are required, matching the "adding one artist takes less than a minute" requirement —
 * everything else is added later, during review. Edit mode reuses the identical layout
 * and adds Status, the seven fit-score categories with an overall-score override, and
 * Related client — none of which apply before an artist actually exists.
 */
export function AddArtistDialog({ propertyId, disabled = false, artist, clients = [] }: AddArtistDialogProps) {
  const editing = Boolean(artist);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ArArtistActionResult | { status: "idle" }>(initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white outline-none transition focus:border-sky-300/60 disabled:opacity-50";
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

    const sharedFields = {
      artistName: String(formData.get("artist_name") || "").trim(),
      handle: toOptionalText(formData.get("handle")),
      primaryPlatform: toOptionalText(formData.get("primary_platform")),
      discoverySource: toOptionalText(formData.get("discovery_source")),
      profileUrl: toOptionalText(formData.get("profile_url")),
      websiteUrl: toOptionalText(formData.get("website_url")),
      musicUrl: toOptionalText(formData.get("music_url")),
      email: toOptionalText(formData.get("email")),
      location: toOptionalText(formData.get("location")),
      genre: toOptionalText(formData.get("genre")),
      subgenre: toOptionalText(formData.get("subgenre")),
      bioSummary: toOptionalText(formData.get("bio_summary")),
      discoveryNotes: toOptionalText(formData.get("discovery_notes")),
      priority: String(formData.get("priority") || "medium"),
      followerCount: toOptionalNumber(formData.get("follower_count")),
      monthlyListenerCount: toOptionalNumber(formData.get("monthly_listener_count")),
      latestReleaseTitle: toOptionalText(formData.get("latest_release_title")),
      // Raw "YYYY-MM-DD" from <input type="date">, passed through as-is — server-side
      // validation (lib/ar/validation.ts) anchors a bare date to noon UTC, same convention
      // as Sales, so it lands on the correct calendar day in America/Chicago.
      latestReleaseDate: toOptionalText(formData.get("latest_release_date")),
      lastActivityAt: toOptionalText(formData.get("last_activity_at")),
      outreachRecommendation: toOptionalText(formData.get("outreach_recommendation")),
      outreachDraft: toOptionalText(formData.get("outreach_draft"))
    };

    const fitScoreFields: Record<string, number | null> = {};
    for (const category of FIT_SCORE_CATEGORIES) {
      fitScoreFields[FIT_FIELD_VALUES[category] as string] = toOptionalNumber(formData.get(FIT_FIELD_NAMES[category]));
    }

    let result: ArArtistActionResult;
    if (editing && artist) {
      result = await updateArArtistAction({
        property: propertyId,
        id: artist.id,
        ...sharedFields,
        fitGenreScore: fitScoreFields.fitGenreScore,
        fitMusicalInterestScore: fitScoreFields.fitMusicalInterestScore,
        fitProductionOpportunityScore: fitScoreFields.fitProductionOpportunityScore,
        fitProfessionalismScore: fitScoreFields.fitProfessionalismScore,
        fitRecentActivityScore: fitScoreFields.fitRecentActivityScore,
        fitAudienceBusinessScore: fitScoreFields.fitAudienceBusinessScore,
        fitPersonalEnthusiasmScore: fitScoreFields.fitPersonalEnthusiasmScore,
        fitScoreOverride: toOptionalNumber(formData.get("fit_score_override")),
        clearFitScoreOverride: formData.get("fit_score_override_mode") === "computed",
        fitSummary: toOptionalText(formData.get("fit_summary")),
        strengths: toOptionalText(formData.get("strengths")),
        opportunities: toOptionalText(formData.get("opportunities")),
        concerns: toOptionalText(formData.get("concerns")),
        nextReviewAt: toOptionalText(formData.get("next_review_at")),
        relatedClientId: toOptionalText(formData.get("related_client_id"))
      });

      if (result.status === "success" && artist.status !== "converted") {
        const nextStatus = String(formData.get("status") || artist.status);
        if (nextStatus !== artist.status) {
          const statusResult = await updateArArtistStatusAction({ property: propertyId, id: artist.id, status: nextStatus });
          result = statusResult.status === "error"
            ? { status: "error", message: `Other changes were saved, but the status could not be updated: ${statusResult.message}` }
            : statusResult;
        }
      }
    } else {
      result = await createArArtistAction({ property: propertyId, ...sharedFields });
    }

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
      {editing ? (
        <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:border-sky-300/40 hover:bg-sky-300/10 disabled:cursor-not-allowed disabled:opacity-50"><Pencil className="h-4 w-4" />Edit Artist</button>
      ) : (
        <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-300 px-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />Add Artist</button>
      )}
      {open && (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="artist-dialog-title" className="my-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0a0f16] shadow-2xl">
            <header className="flex items-start justify-between border-b border-white/8 p-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">A&R</p>
                <h2 id="artist-dialog-title" className="mt-2 font-sans text-2xl font-semibold">{editing ? "Edit Artist" : "Add Artist"}</h2>
                <p className="mt-2 text-sm text-slate-500">{editing ? "Update research, review, and fit-score details." : "Only a name and a platform or source are required — everything else can be filled in during review."}</p>
              </div>
              <button type="button" onClick={close} disabled={pending} aria-label={editing ? "Close edit artist dialog" : "Close add artist dialog"} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </header>
            <form ref={formRef} onSubmit={submit} className="p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <label className={`${labelClass} md:col-span-2`}>Artist name *<input className={inputClass} name="artist_name" required minLength={1} maxLength={160} defaultValue={artist?.artistName} /></label>
                <label className={labelClass}>Primary platform<select className={inputClass} name="primary_platform" defaultValue={artist?.primaryPlatform || ""}>
                  <option value="">Not set</option>
                  {AR_SOURCES.map((source) => <option key={source} value={source}>{SOURCE_LABELS[source]}</option>)}
                </select></label>
                <label className={labelClass}>Discovery source<select className={inputClass} name="discovery_source" defaultValue={artist?.discoverySource || ""}>
                  <option value="">Not set</option>
                  {AR_SOURCES.map((source) => <option key={source} value={source}>{SOURCE_LABELS[source]}</option>)}
                </select></label>
                <label className={labelClass}>Genre<input className={inputClass} name="genre" maxLength={160} defaultValue={artist?.genre || ""} /></label>
                <label className={labelClass}>Priority<select className={inputClass} name="priority" defaultValue={artist?.priority || "medium"}>
                  {AR_PRIORITIES.map((priority) => <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>)}
                </select></label>
                {editing && artist && (
                  <label className={labelClass}>
                    Status
                    <select className={inputClass} name="status" disabled={artist.status === "converted"} defaultValue={artist.status === "converted" ? "" : artist.status}>
                      {artist.status === "converted" && <option value="">{STATUS_LABELS.converted}</option>}
                      {SELECTABLE_AR_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                    </select>
                    {artist.status === "converted" && <span className="mt-1.5 block text-[11px] font-normal normal-case text-slate-500">Converted artists can't change status here.</span>}
                  </label>
                )}
                <label className={`${labelClass} md:col-span-2`}>Discovery notes<textarea className={`${inputClass} min-h-20 py-3`} name="discovery_notes" maxLength={8000} defaultValue={artist?.discoveryNotes || ""} placeholder="Where you found them, first impressions, links you were sent, ..." /></label>
              </div>

              <details className="mt-5 group" open={editing}>
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />More details</summary>
                <div className="mt-4 grid gap-5 border-t border-white/6 pt-5 md:grid-cols-2">
                  <label className={labelClass}>Handle<input className={inputClass} name="handle" maxLength={160} defaultValue={artist?.handle || ""} placeholder="@handle" /></label>
                  <label className={labelClass}>Location<input className={inputClass} name="location" maxLength={160} defaultValue={artist?.location || ""} /></label>
                  <label className={labelClass}>Subgenre<input className={inputClass} name="subgenre" maxLength={160} defaultValue={artist?.subgenre || ""} /></label>
                  <label className={labelClass}>Email<input className={inputClass} name="email" type="email" defaultValue={artist?.email || ""} /></label>
                  <label className={labelClass}>Profile link<input className={inputClass} name="profile_url" type="url" defaultValue={artist?.profileUrl || ""} placeholder="https://..." /></label>
                  <label className={labelClass}>Website link<input className={inputClass} name="website_url" type="url" defaultValue={artist?.websiteUrl || ""} placeholder="https://..." /></label>
                  <label className={labelClass}>Music link<input className={inputClass} name="music_url" type="url" defaultValue={artist?.musicUrl || ""} placeholder="https://..." /></label>
                  <label className={labelClass}>Follower count<input className={inputClass} name="follower_count" type="number" min="0" step="1" defaultValue={artist?.followerCount ?? ""} /></label>
                  <label className={labelClass}>Monthly listeners<input className={inputClass} name="monthly_listener_count" type="number" min="0" step="1" defaultValue={artist?.monthlyListenerCount ?? ""} /></label>
                  <label className={labelClass}>Latest release title<input className={inputClass} name="latest_release_title" maxLength={160} defaultValue={artist?.latestReleaseTitle || ""} /></label>
                  <label className={labelClass}>Latest release date<input className={inputClass} name="latest_release_date" type="date" defaultValue={artist?.latestReleaseDate || ""} /></label>
                  <label className={labelClass}>Last activity observed<input className={inputClass} name="last_activity_at" type="date" defaultValue={artist?.lastActivityAt?.slice(0, 10) || ""} /></label>
                  <label className={`${labelClass} md:col-span-2`}>Bio summary<textarea className={`${inputClass} min-h-20 py-3`} name="bio_summary" maxLength={8000} defaultValue={artist?.bioSummary || ""} /></label>
                  {editing && (
                    <label className={labelClass}>Next review date<input className={inputClass} name="next_review_at" type="date" defaultValue={artist?.nextReviewAt?.slice(0, 10) || ""} /></label>
                  )}
                  {editing && (
                    <label className={labelClass}>Related client<select className={inputClass} name="related_client_id" defaultValue={artist?.relatedClientId || ""}>
                      <option value="">None</option>
                      {clients.map((client) => <option key={client.id} value={client.id}>{getDisplayName(client)}</option>)}
                    </select></label>
                  )}
                </div>
              </details>

              {editing && artist && (
                <details className="mt-5 group">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />Fit score review</summary>
                  <div className="mt-4 border-t border-white/6 pt-5">
                    <p className="text-[11px] leading-5 text-slate-500">Each category is a manual 1-5 score you enter — nothing here is computed from audio or social analysis. The overall score below is the average of whatever categories are filled in, unless you type an override.</p>
                    <div className="mt-4 grid gap-5 md:grid-cols-2">
                      {FIT_SCORE_CATEGORIES.map((category) => (
                        <label key={category} className={labelClass}>
                          {FIT_SCORE_CATEGORY_LABELS[category]}
                          <select className={inputClass} name={FIT_FIELD_NAMES[category]} defaultValue={(artist[FIT_FIELD_VALUES[category]] as number | null) ?? ""}>
                            <option value="">Not scored</option>
                            {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                          </select>
                        </label>
                      ))}
                    </div>
                    <div className="mt-5 grid gap-5 border-t border-white/6 pt-5 md:grid-cols-2">
                      <div>
                        <p className={labelClass}>Overall score</p>
                        <div className="mt-2 flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs text-slate-400"><input type="radio" name="fit_score_override_mode" value="computed" defaultChecked={!artist.fitScoreOverridden} className="accent-sky-300" />Computed</label>
                          <label className="flex items-center gap-1.5 text-xs text-slate-400"><input type="radio" name="fit_score_override_mode" value="override" defaultChecked={artist.fitScoreOverridden} className="accent-sky-300" />Override</label>
                        </div>
                        <input className={inputClass} name="fit_score_override" type="number" min="1" max="5" step="0.1" defaultValue={artist.fitScoreOverridden ? artist.fitScore ?? "" : ""} placeholder={artist.fitScore !== null ? `Computed: ${artist.fitScore}` : "No score yet"} />
                        <p className="mt-1.5 text-[11px] text-slate-500">{artist.fitScoreOverridden ? "Currently a manual override." : "Currently computed from the categories above."}</p>
                      </div>
                      <div />
                      <label className={`${labelClass} md:col-span-2`}>Fit summary<textarea className={`${inputClass} min-h-20 py-3`} name="fit_summary" maxLength={8000} defaultValue={artist.fitSummary || ""} /></label>
                      <label className={labelClass}>Strengths<textarea className={`${inputClass} min-h-20 py-3`} name="strengths" maxLength={8000} defaultValue={artist.strengths || ""} /></label>
                      <label className={labelClass}>Opportunities<textarea className={`${inputClass} min-h-20 py-3`} name="opportunities" maxLength={8000} defaultValue={artist.opportunities || ""} placeholder="e.g. Potential production opportunity" /></label>
                      <label className={`${labelClass} md:col-span-2`}>Concerns<textarea className={`${inputClass} min-h-20 py-3`} name="concerns" maxLength={8000} defaultValue={artist.concerns || ""} placeholder="e.g. No producer credit was found during manual review" /></label>
                    </div>
                  </div>
                </details>
              )}

              {editing && (
                <details className="mt-5 group">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />Outreach</summary>
                  <div className="mt-4 grid gap-5 border-t border-white/6 pt-5">
                    <label className={labelClass}>Outreach recommendation<textarea className={`${inputClass} min-h-20 py-3`} name="outreach_recommendation" maxLength={8000} defaultValue={artist?.outreachRecommendation || ""} /></label>
                    <label className={labelClass}>Outreach draft<textarea className={`${inputClass} min-h-32 py-3`} name="outreach_draft" maxLength={8000} defaultValue={artist?.outreachDraft || ""} placeholder="Compose a draft from the artist's detail page, or paste/edit one here." /></label>
                  </div>
                </details>
              )}

              {state.status === "error" && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-xs text-red-200">{state.message}</p>}
              <footer className="mt-6 flex justify-end gap-3">
                <button type="button" disabled={pending} onClick={close} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button>
                <button type="submit" disabled={pending} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Working</> : <><Check className="h-4 w-4" />{editing ? "Save Changes" : "Add Artist"}</>}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
