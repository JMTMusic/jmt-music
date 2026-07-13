import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SiteConfig } from "@/lib/control-center/types";
import { computeFitScore, getFitScoreCategoryValues } from "./pipeline";
import { validateCreateArArtistInput, validateUpdateArArtistInput } from "./validation";
import { AR_STATUSES } from "./types";
import type {
  ArArtistLookupResult,
  ArArtistMutationResult,
  ArArtistRecord,
  ArArtistsResult,
  ArPriority,
  ArSource,
  ArStatus,
  ListArArtistsFilters
} from "./types";

/**
 * Never SELECT anything beyond what's declared here — same defensive habit as every other
 * repository in this codebase (e.g. lib/sales/repository.ts's RECORD_COLUMNS).
 */
const RECORD_COLUMNS =
  "id, property_id, artist_name, handle, primary_platform, discovery_source, profile_url, website_url, music_url, email, location, genre, subgenre, bio_summary, discovery_notes, status, priority, fit_genre_score, fit_musical_interest_score, fit_production_opportunity_score, fit_professionalism_score, fit_recent_activity_score, fit_audience_business_score, fit_personal_enthusiasm_score, fit_score, fit_score_overridden, fit_summary, strengths, opportunities, concerns, follower_count, monthly_listener_count, latest_release_title, latest_release_date, last_activity_at, last_reviewed_at, next_review_at, outreach_recommendation, outreach_draft, related_client_id, related_sales_opportunity_id, created_by, created_at, updated_at";

type ArArtistRow = {
  id: string;
  property_id: string;
  artist_name: string;
  handle: string | null;
  primary_platform: ArSource | null;
  discovery_source: ArSource | null;
  profile_url: string | null;
  website_url: string | null;
  music_url: string | null;
  email: string | null;
  location: string | null;
  genre: string | null;
  subgenre: string | null;
  bio_summary: string | null;
  discovery_notes: string | null;
  status: ArStatus;
  priority: ArPriority;
  fit_genre_score: number | null;
  fit_musical_interest_score: number | null;
  fit_production_opportunity_score: number | null;
  fit_professionalism_score: number | null;
  fit_recent_activity_score: number | null;
  fit_audience_business_score: number | null;
  fit_personal_enthusiasm_score: number | null;
  fit_score: number | string | null;
  fit_score_overridden: boolean;
  fit_summary: string | null;
  strengths: string | null;
  opportunities: string | null;
  concerns: string | null;
  follower_count: number | null;
  monthly_listener_count: number | null;
  latest_release_title: string | null;
  latest_release_date: string | null;
  last_activity_at: string | null;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  outreach_recommendation: string | null;
  outreach_draft: string | null;
  related_client_id: string | null;
  related_sales_opportunity_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: ArArtistRow): ArArtistRecord {
  return {
    id: row.id,
    propertyId: row.property_id,
    artistName: row.artist_name,
    handle: row.handle,
    primaryPlatform: row.primary_platform,
    discoverySource: row.discovery_source,
    profileUrl: row.profile_url,
    websiteUrl: row.website_url,
    musicUrl: row.music_url,
    email: row.email,
    location: row.location,
    genre: row.genre,
    subgenre: row.subgenre,
    bioSummary: row.bio_summary,
    discoveryNotes: row.discovery_notes,
    status: row.status,
    priority: row.priority,
    fitGenreScore: row.fit_genre_score,
    fitMusicalInterestScore: row.fit_musical_interest_score,
    fitProductionOpportunityScore: row.fit_production_opportunity_score,
    fitProfessionalismScore: row.fit_professionalism_score,
    fitRecentActivityScore: row.fit_recent_activity_score,
    fitAudienceBusinessScore: row.fit_audience_business_score,
    fitPersonalEnthusiasmScore: row.fit_personal_enthusiasm_score,
    fitScore: row.fit_score === null ? null : Number(row.fit_score),
    fitScoreOverridden: row.fit_score_overridden,
    fitSummary: row.fit_summary,
    strengths: row.strengths,
    opportunities: row.opportunities,
    concerns: row.concerns,
    followerCount: row.follower_count,
    monthlyListenerCount: row.monthly_listener_count,
    latestReleaseTitle: row.latest_release_title,
    latestReleaseDate: row.latest_release_date,
    lastActivityAt: row.last_activity_at,
    lastReviewedAt: row.last_reviewed_at,
    nextReviewAt: row.next_review_at,
    outreachRecommendation: row.outreach_recommendation,
    outreachDraft: row.outreach_draft,
    relatedClientId: row.related_client_id,
    relatedSalesOpportunityId: row.related_sales_opportunity_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const MIGRATION_HINT = "Supabase query failed — has migration 20260713100000_ar_artists.sql been applied yet?";

/** Every fit_*_score field is already a validated number-or-null by the time this repository sees it (lib/ar/validation.ts's validateFitCategoryScore never leaves a string in place) — this just narrows the type accordingly for computeFitScore's stricter signature. */
function toNumberOrNull(value: number | string | null | undefined): number | null {
  return value === undefined || value === null ? null : Number(value);
}

async function resolvePropertyId(site: SiteConfig): Promise<{ id: string } | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("properties").select("id").eq("slug", site.id).maybeSingle();
  if (error || !data) return null;
  return data;
}

/** Shared guard: an optional related_client_id must resolve to a row that actually belongs to the same property. Same convention as lib/sales/repository.ts's verifyClientBelongsToProperty. */
async function verifyClientBelongsToProperty(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  propertyId: string,
  clientId: string
): Promise<string | null> {
  const { data } = await supabase.from("clients").select("id").eq("id", clientId).eq("property_id", propertyId).maybeSingle();
  if (!data) return "That client does not belong to the selected property.";
  return null;
}

/** Shared list/query path for listArArtists. */
async function queryArtists(site: SiteConfig, filters: ListArArtistsFilters = {}): Promise<ArArtistsResult> {
  const property = await resolvePropertyId(site);
  if (!property) return { artists: [], status: "error", detail: "Property not found in Supabase" };

  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase.from("ar_artists").select(RECORD_COLUMNS).eq("property_id", property.id);

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.priority) query = query.eq("priority", filters.priority);
    if (filters.primaryPlatform) query = query.eq("primary_platform", filters.primaryPlatform);
    if (filters.genre) query = query.eq("genre", filters.genre);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return { artists: [], status: "error", detail: MIGRATION_HINT };

    const artists = ((data || []) as unknown as ArArtistRow[]).map(mapRow);
    return {
      artists,
      status: artists.length ? "ready" : "empty",
      detail: artists.length ? `${artists.length} artist${artists.length === 1 ? "" : "s"} from Supabase` : "No A&R artists yet"
    };
  } catch {
    return { artists: [], status: "error", detail: "Supabase is not configured or reachable" };
  }
}

/** #1 — Every A&R Artist for one property, optionally filtered. The one round-trip other selectors/aggregations should derive from in memory rather than re-querying. */
export async function listArArtists(site: SiteConfig, filters: ListArArtistsFilters = {}): Promise<ArArtistsResult> {
  return queryArtists(site, filters);
}

/** #2 — One A&R Artist, scoped to the property so a stray id from another property can never be read. */
export async function getArArtistById(site: SiteConfig, id: string): Promise<ArArtistLookupResult> {
  const property = await resolvePropertyId(site);
  if (!property) return { status: "error", message: "Property not found in Supabase" };

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("ar_artists")
      .select(RECORD_COLUMNS)
      .eq("id", id)
      .eq("property_id", property.id)
      .maybeSingle();

    if (error) return { status: "error", message: MIGRATION_HINT };
    if (!data) return { status: "not_found" };
    return { status: "found", artist: mapRow(data as unknown as ArArtistRow) };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/** #3 — Creates an A&R Artist. Always starts at 'discovered' (the migration's own column default); this function never accepts or sets a status. */
export async function createArArtist(site: SiteConfig, rawInput: unknown): Promise<ArArtistMutationResult> {
  let input;
  try {
    input = validateCreateArArtistInput(rawInput);
  } catch (validationError) {
    return { status: "error", message: validationError instanceof Error ? validationError.message : "Invalid input." };
  }

  const property = await resolvePropertyId(site);
  if (!property) return { status: "error", message: "Property not found in Supabase" };

  try {
    const supabase = createSupabaseAdminClient();

    if (input.relatedClientId) {
      const relationError = await verifyClientBelongsToProperty(supabase, property.id, input.relatedClientId);
      if (relationError) return { status: "error", message: relationError };
    }

    const fitScoreValues = getFitScoreCategoryValues({
      fitGenreScore: toNumberOrNull(input.fitGenreScore),
      fitMusicalInterestScore: toNumberOrNull(input.fitMusicalInterestScore),
      fitProductionOpportunityScore: toNumberOrNull(input.fitProductionOpportunityScore),
      fitProfessionalismScore: toNumberOrNull(input.fitProfessionalismScore),
      fitRecentActivityScore: toNumberOrNull(input.fitRecentActivityScore),
      fitAudienceBusinessScore: toNumberOrNull(input.fitAudienceBusinessScore),
      fitPersonalEnthusiasmScore: toNumberOrNull(input.fitPersonalEnthusiasmScore)
    });
    const fitScoreOverridden = input.fitScoreOverride !== undefined && input.fitScoreOverride !== null;
    const fitScore = fitScoreOverridden ? toNumberOrNull(input.fitScoreOverride) : computeFitScore(fitScoreValues);

    const { data, error } = await supabase
      .from("ar_artists")
      .insert({
        property_id: property.id,
        artist_name: input.artistName,
        handle: input.handle,
        primary_platform: input.primaryPlatform,
        discovery_source: input.discoverySource,
        profile_url: input.profileUrl,
        website_url: input.websiteUrl,
        music_url: input.musicUrl,
        email: input.email,
        location: input.location,
        genre: input.genre,
        subgenre: input.subgenre,
        bio_summary: input.bioSummary,
        discovery_notes: input.discoveryNotes,
        priority: input.priority,
        fit_genre_score: input.fitGenreScore,
        fit_musical_interest_score: input.fitMusicalInterestScore,
        fit_production_opportunity_score: input.fitProductionOpportunityScore,
        fit_professionalism_score: input.fitProfessionalismScore,
        fit_recent_activity_score: input.fitRecentActivityScore,
        fit_audience_business_score: input.fitAudienceBusinessScore,
        fit_personal_enthusiasm_score: input.fitPersonalEnthusiasmScore,
        fit_score: fitScore,
        fit_score_overridden: fitScoreOverridden,
        fit_summary: input.fitSummary,
        strengths: input.strengths,
        opportunities: input.opportunities,
        concerns: input.concerns,
        follower_count: input.followerCount,
        monthly_listener_count: input.monthlyListenerCount,
        latest_release_title: input.latestReleaseTitle,
        latest_release_date: input.latestReleaseDate,
        last_activity_at: input.lastActivityAt,
        next_review_at: input.nextReviewAt,
        outreach_recommendation: input.outreachRecommendation,
        outreach_draft: input.outreachDraft,
        related_client_id: input.relatedClientId,
        created_by: input.createdBy
      })
      .select(RECORD_COLUMNS)
      .single();

    if (error || !data) return { status: "error", message: "The artist could not be added." };
    return { status: "success", artist: mapRow(data as unknown as ArArtistRow) };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/**
 * #4 — General field update. `status` and `relatedSalesOpportunityId` are structurally
 * impossible to set here — validateUpdateArArtistInput never reads those keys from the raw
 * input. Use updateArArtistStatus for status, and the Convert to Sales action
 * (app/control-center/ar/actions.ts) for relatedSalesOpportunityId.
 *
 * fit_score handling: if this update includes an explicit `fitScoreOverride`, that value is
 * stored directly and fit_score_overridden is set true. Otherwise, if this update touches
 * any of the seven fit_*_score categories (or sets `clearFitScoreOverride`), fit_score is
 * recomputed from the merged category values (existing + this update's changes) and
 * fit_score_overridden is set false. If neither applies, fit_score/fit_score_overridden are
 * left completely untouched — a plain metadata edit never silently resets a review score.
 */
export async function updateArArtist(site: SiteConfig, id: string, rawInput: unknown): Promise<ArArtistMutationResult> {
  let input;
  try {
    input = validateUpdateArArtistInput(rawInput);
  } catch (validationError) {
    return { status: "error", message: validationError instanceof Error ? validationError.message : "Invalid input." };
  }

  const property = await resolvePropertyId(site);
  if (!property) return { status: "error", message: "Property not found in Supabase" };

  try {
    const supabase = createSupabaseAdminClient();
    const existing = await supabase
      .from("ar_artists")
      .select(
        "id, fit_genre_score, fit_musical_interest_score, fit_production_opportunity_score, fit_professionalism_score, fit_recent_activity_score, fit_audience_business_score, fit_personal_enthusiasm_score"
      )
      .eq("id", id)
      .eq("property_id", property.id)
      .maybeSingle();
    if (!existing.data) return { status: "error", message: "That artist does not belong to the selected property." };

    if (input.relatedClientId) {
      const relationError = await verifyClientBelongsToProperty(supabase, property.id, input.relatedClientId);
      if (relationError) return { status: "error", message: relationError };
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if ("artistName" in input) patch.artist_name = input.artistName;
    if ("handle" in input) patch.handle = input.handle;
    if ("primaryPlatform" in input) patch.primary_platform = input.primaryPlatform;
    if ("discoverySource" in input) patch.discovery_source = input.discoverySource;
    if ("profileUrl" in input) patch.profile_url = input.profileUrl;
    if ("websiteUrl" in input) patch.website_url = input.websiteUrl;
    if ("musicUrl" in input) patch.music_url = input.musicUrl;
    if ("email" in input) patch.email = input.email;
    if ("location" in input) patch.location = input.location;
    if ("genre" in input) patch.genre = input.genre;
    if ("subgenre" in input) patch.subgenre = input.subgenre;
    if ("bioSummary" in input) patch.bio_summary = input.bioSummary;
    if ("discoveryNotes" in input) patch.discovery_notes = input.discoveryNotes;
    if ("priority" in input) patch.priority = input.priority;
    if ("fitGenreScore" in input) patch.fit_genre_score = input.fitGenreScore;
    if ("fitMusicalInterestScore" in input) patch.fit_musical_interest_score = input.fitMusicalInterestScore;
    if ("fitProductionOpportunityScore" in input) patch.fit_production_opportunity_score = input.fitProductionOpportunityScore;
    if ("fitProfessionalismScore" in input) patch.fit_professionalism_score = input.fitProfessionalismScore;
    if ("fitRecentActivityScore" in input) patch.fit_recent_activity_score = input.fitRecentActivityScore;
    if ("fitAudienceBusinessScore" in input) patch.fit_audience_business_score = input.fitAudienceBusinessScore;
    if ("fitPersonalEnthusiasmScore" in input) patch.fit_personal_enthusiasm_score = input.fitPersonalEnthusiasmScore;
    if ("fitSummary" in input) patch.fit_summary = input.fitSummary;
    if ("strengths" in input) patch.strengths = input.strengths;
    if ("opportunities" in input) patch.opportunities = input.opportunities;
    if ("concerns" in input) patch.concerns = input.concerns;
    if ("followerCount" in input) patch.follower_count = input.followerCount;
    if ("monthlyListenerCount" in input) patch.monthly_listener_count = input.monthlyListenerCount;
    if ("latestReleaseTitle" in input) patch.latest_release_title = input.latestReleaseTitle;
    if ("latestReleaseDate" in input) patch.latest_release_date = input.latestReleaseDate;
    if ("lastActivityAt" in input) patch.last_activity_at = input.lastActivityAt;
    if ("lastReviewedAt" in input) patch.last_reviewed_at = input.lastReviewedAt;
    if ("nextReviewAt" in input) patch.next_review_at = input.nextReviewAt;
    if ("outreachRecommendation" in input) patch.outreach_recommendation = input.outreachRecommendation;
    if ("outreachDraft" in input) patch.outreach_draft = input.outreachDraft;
    if ("relatedClientId" in input) patch.related_client_id = input.relatedClientId;

    const touchesFitCategories = [
      "fitGenreScore",
      "fitMusicalInterestScore",
      "fitProductionOpportunityScore",
      "fitProfessionalismScore",
      "fitRecentActivityScore",
      "fitAudienceBusinessScore",
      "fitPersonalEnthusiasmScore"
    ].some((key) => key in input);

    if ("fitScoreOverride" in input && input.fitScoreOverride !== undefined && input.fitScoreOverride !== null) {
      patch.fit_score = input.fitScoreOverride;
      patch.fit_score_overridden = true;
    } else if (input.clearFitScoreOverride || touchesFitCategories) {
      const merged = getFitScoreCategoryValues({
        fitGenreScore: "fitGenreScore" in input ? (input.fitGenreScore ?? null) : existing.data.fit_genre_score,
        fitMusicalInterestScore: "fitMusicalInterestScore" in input ? (input.fitMusicalInterestScore ?? null) : existing.data.fit_musical_interest_score,
        fitProductionOpportunityScore: "fitProductionOpportunityScore" in input ? (input.fitProductionOpportunityScore ?? null) : existing.data.fit_production_opportunity_score,
        fitProfessionalismScore: "fitProfessionalismScore" in input ? (input.fitProfessionalismScore ?? null) : existing.data.fit_professionalism_score,
        fitRecentActivityScore: "fitRecentActivityScore" in input ? (input.fitRecentActivityScore ?? null) : existing.data.fit_recent_activity_score,
        fitAudienceBusinessScore: "fitAudienceBusinessScore" in input ? (input.fitAudienceBusinessScore ?? null) : existing.data.fit_audience_business_score,
        fitPersonalEnthusiasmScore: "fitPersonalEnthusiasmScore" in input ? (input.fitPersonalEnthusiasmScore ?? null) : existing.data.fit_personal_enthusiasm_score
      });
      patch.fit_score = computeFitScore(merged);
      patch.fit_score_overridden = false;
    }

    const { data, error } = await supabase
      .from("ar_artists")
      .update(patch)
      .eq("id", id)
      .eq("property_id", property.id)
      .select(RECORD_COLUMNS)
      .single();

    if (error || !data) return { status: "error", message: "The artist could not be updated." };
    return { status: "success", artist: mapRow(data as unknown as ArArtistRow) };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/** #5 — The only function permitted to change `status` via a plain status move. Permissive, any-to-any (same posture as sales_opportunities.status) — excludes 'converted', which only markArArtistConverted may set. */
export async function updateArArtistStatus(site: SiteConfig, id: string, nextStatusInput: unknown): Promise<ArArtistMutationResult> {
  if (typeof nextStatusInput !== "string" || !(AR_STATUSES as readonly string[]).includes(nextStatusInput) || nextStatusInput === "converted") {
    return { status: "error", message: "That status is not recognized." };
  }
  const nextStatus = nextStatusInput as ArStatus;

  const property = await resolvePropertyId(site);
  if (!property) return { status: "error", message: "Property not found in Supabase" };

  try {
    const supabase = createSupabaseAdminClient();
    const existing = await supabase.from("ar_artists").select("id").eq("id", id).eq("property_id", property.id).maybeSingle();
    if (!existing.data) return { status: "error", message: "That artist does not belong to the selected property." };

    const patch: Record<string, unknown> = { status: nextStatus, updated_at: new Date().toISOString() };
    if (nextStatus === "reviewing" || nextStatus === "watchlist" || nextStatus === "ready_for_outreach") {
      patch.last_reviewed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("ar_artists")
      .update(patch)
      .eq("id", id)
      .eq("property_id", property.id)
      .select(RECORD_COLUMNS)
      .single();

    if (error || !data) return { status: "error", message: "The status could not be updated." };
    return { status: "success", artist: mapRow(data as unknown as ArArtistRow) };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/**
 * #6 — The only function permitted to write `status: 'converted'` and
 * `related_sales_opportunity_id`. Called exclusively by the Convert to Sales action after
 * it has already created/connected the Client and created the Sales Opportunity — this
 * function only records the outcome.
 *
 * Unlike Sales' own opportunity-to-project conversion (a strict one-time event —
 * markSalesOpportunityConverted hard-blocks a second call outright), A&R's duplicate
 * protection is deliberately a soft confirm-to-override, matching the Growth Engine's
 * convertLeadToProject exactly: "one Client may have multiple Sales Opportunities" is an
 * explicit, real relationship here (an artist kept on the Watchlist may legitimately spawn
 * a second engagement later). That decision — is this a duplicate, has the caller already
 * confirmed — is made entirely by the action layer
 * (app/control-center/ar/actions.ts's convertArArtistToSalesAction) before this function is
 * ever called; this function unconditionally performs the write it's told to. A second
 * conversion overwrites related_sales_opportunity_id to point at the most recent one — the
 * first Sales Opportunity still exists and is still reachable from the Sales module itself,
 * it just stops being the one linked back from this A&R record.
 */
export async function markArArtistConverted(
  site: SiteConfig,
  id: string,
  salesOpportunityId: string,
  clientId: string | null,
  keepOnWatchlist: boolean
): Promise<ArArtistMutationResult> {
  const property = await resolvePropertyId(site);
  if (!property) return { status: "error", message: "Property not found in Supabase" };

  try {
    const supabase = createSupabaseAdminClient();
    const existing = await supabase
      .from("ar_artists")
      .select("id")
      .eq("id", id)
      .eq("property_id", property.id)
      .maybeSingle();
    if (!existing.data) return { status: "error", message: "That artist does not belong to the selected property." };

    const patch: Record<string, unknown> = {
      related_sales_opportunity_id: salesOpportunityId,
      status: keepOnWatchlist ? "watchlist" : "converted",
      updated_at: new Date().toISOString()
    };
    if (clientId) patch.related_client_id = clientId;

    const { data, error } = await supabase
      .from("ar_artists")
      .update(patch)
      .eq("id", id)
      .eq("property_id", property.id)
      .select(RECORD_COLUMNS)
      .single();

    if (error || !data) return { status: "error", message: "The artist could not be marked as converted." };
    return { status: "success", artist: mapRow(data as unknown as ArArtistRow) };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}
