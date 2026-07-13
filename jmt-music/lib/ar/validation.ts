import { AR_PRIORITIES, AR_SOURCES } from "./types";
import type {
  ArPriority,
  ArSource,
  CreateArArtistInput,
  UpdateArArtistInput
} from "./types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_NAME_LENGTH = 160;
const MAX_HANDLE_LENGTH = 160;
const MAX_SHORT_TEXT_LENGTH = 160;
const MAX_LONG_TEXT_LENGTH = 8000;
const MAX_URL_LENGTH = 2000;
const MAX_COUNT = 1_000_000_000;

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function validateOptionalUuid(raw: unknown, fieldLabel: string): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (!isValidUuid(raw)) throw new Error(`${fieldLabel}, if provided, must be a valid id.`);
  return raw;
}

export function validateArtistName(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) throw new Error("An artist name is required.");
  if (value.length > MAX_NAME_LENGTH) throw new Error(`Artist name must be ${MAX_NAME_LENGTH} characters or fewer.`);
  return value;
}

function validateOptionalSource(raw: unknown, fieldLabel: string): ArSource | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string" || !(AR_SOURCES as readonly string[]).includes(raw)) {
    throw new Error(`Select a valid ${fieldLabel}.`);
  }
  return raw as ArSource;
}

export function validatePrimaryPlatform(raw: unknown): ArSource | null {
  return validateOptionalSource(raw, "primary platform");
}

export function validateDiscoverySource(raw: unknown): ArSource | null {
  return validateOptionalSource(raw, "discovery source");
}

export function validatePriority(raw: unknown): ArPriority {
  if (raw === undefined || raw === null || raw === "") return "medium";
  if (typeof raw !== "string" || !(AR_PRIORITIES as readonly string[]).includes(raw)) {
    throw new Error("Priority must be low, medium, or high.");
  }
  return raw as ArPriority;
}

function validateShortText(raw: unknown, max: number, fieldLabel: string): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length > max) throw new Error(`${fieldLabel} must be ${max} characters or fewer.`);
  return value || null;
}

export function validateHandle(raw: unknown): string | null {
  return validateShortText(raw, MAX_HANDLE_LENGTH, "Handle");
}

export function validateEmail(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error("Enter a valid email address.");
  return value;
}

function validateOptionalUrl(raw: unknown, fieldLabel: string): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length > MAX_URL_LENGTH) throw new Error(`${fieldLabel} must be ${MAX_URL_LENGTH} characters or fewer.`);
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
  } catch {
    throw new Error(`${fieldLabel} must be a valid web address.`);
  }
  return value;
}

export function validateProfileUrl(raw: unknown): string | null {
  return validateOptionalUrl(raw, "Profile link");
}

export function validateWebsiteUrl(raw: unknown): string | null {
  return validateOptionalUrl(raw, "Website link");
}

export function validateMusicUrl(raw: unknown): string | null {
  return validateOptionalUrl(raw, "Music link");
}

export function validateLocation(raw: unknown): string | null {
  return validateShortText(raw, MAX_SHORT_TEXT_LENGTH, "Location");
}

export function validateGenre(raw: unknown): string | null {
  return validateShortText(raw, MAX_SHORT_TEXT_LENGTH, "Genre");
}

export function validateSubgenre(raw: unknown): string | null {
  return validateShortText(raw, MAX_SHORT_TEXT_LENGTH, "Subgenre");
}

export function validateLatestReleaseTitle(raw: unknown): string | null {
  return validateShortText(raw, MAX_NAME_LENGTH, "Latest release title");
}

function validateLongText(raw: unknown, fieldLabel: string): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length > MAX_LONG_TEXT_LENGTH) throw new Error(`${fieldLabel} must be ${MAX_LONG_TEXT_LENGTH} characters or fewer.`);
  return value || null;
}

export const validateBioSummary = (raw: unknown) => validateLongText(raw, "Bio summary");
export const validateDiscoveryNotes = (raw: unknown) => validateLongText(raw, "Discovery notes");
export const validateFitSummary = (raw: unknown) => validateLongText(raw, "Fit summary");
export const validateStrengths = (raw: unknown) => validateLongText(raw, "Strengths");
export const validateOpportunities = (raw: unknown) => validateLongText(raw, "Opportunities");
export const validateConcerns = (raw: unknown) => validateLongText(raw, "Concerns");
export const validateOutreachRecommendation = (raw: unknown) => validateLongText(raw, "Outreach recommendation");
export const validateOutreachDraft = (raw: unknown) => validateLongText(raw, "Outreach draft");

function validateOptionalNonNegativeInt(raw: unknown, max: number, fieldLabel: string): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > max) throw new Error(`${fieldLabel} must be a whole number from 0 to ${max}.`);
  return value;
}

export function validateFollowerCount(raw: unknown): number | null {
  return validateOptionalNonNegativeInt(raw, MAX_COUNT, "Follower count");
}

export function validateMonthlyListenerCount(raw: unknown): number | null {
  return validateOptionalNonNegativeInt(raw, MAX_COUNT, "Monthly listener count");
}

/** A 1-5 fit-category score, or null/blank for "not yet reviewed." */
export function validateFitCategoryScore(raw: unknown, fieldLabel: string): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 5) throw new Error(`${fieldLabel} must be a whole number from 1 to 5.`);
  return value;
}

/** A manual overall-score override — 1-5, one decimal place allowed (matches the computed average's own precision). */
export function validateFitScoreOverride(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value) || value < 1 || value > 5) throw new Error("Fit score override must be a number from 1 to 5.");
  return Math.round(value * 10) / 10;
}

/**
 * A bare date (no time component — e.g. straight from an <input type="date">) is anchored
 * to noon UTC rather than parsed as UTC midnight, exactly like lib/sales/validation.ts's
 * validateOptionalTimestamp — UTC midnight for "2026-07-16" reads as the evening of July 15
 * in America/Chicago, the timezone every "due today"/"overdue" comparison in this app uses,
 * including A&R's own next-review selectors. A full datetime string is parsed as-is.
 */
function validateOptionalTimestamp(raw: unknown, fieldLabel: string): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = new Date(dateOnly ? `${value}T12:00:00.000Z` : value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${fieldLabel} is not a valid date.`);
  return parsed.toISOString();
}

export function validateLastActivityAt(raw: unknown): string | null {
  return validateOptionalTimestamp(raw, "Last activity date");
}

export function validateLastReviewedAt(raw: unknown): string | null {
  return validateOptionalTimestamp(raw, "Last reviewed date");
}

export function validateNextReviewAt(raw: unknown): string | null {
  return validateOptionalTimestamp(raw, "Next review date");
}

/** Stored as a plain date (no time component), matching projects.target_date / sales_opportunities.deadline's convention. */
export function validateLatestReleaseDate(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = typeof raw === "string" ? raw : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Latest release date must be a valid date.");
  return value;
}

/**
 * Normalizes and validates a full create input. `status` has no parameter here at all —
 * every artist is created at 'discovered' (the migration's own default). At least one of
 * primaryPlatform/discoverySource is required on create (the "Add Artist" fast-entry
 * requirement — either is enough, both is fine) — a cross-field rule enforced here at the
 * application layer, not as a SQL constraint, the same posture this codebase already takes
 * for every other multi-field business rule.
 */
export function validateCreateArArtistInput(raw: unknown): CreateArArtistInput {
  const input = (raw || {}) as Record<string, unknown>;
  const primaryPlatform = validatePrimaryPlatform(input.primaryPlatform);
  const discoverySource = validateDiscoverySource(input.discoverySource);
  if (!primaryPlatform && !discoverySource) {
    throw new Error("Enter a primary platform or a discovery source.");
  }

  return {
    artistName: validateArtistName(input.artistName),
    handle: validateHandle(input.handle),
    primaryPlatform,
    discoverySource,
    profileUrl: validateProfileUrl(input.profileUrl),
    websiteUrl: validateWebsiteUrl(input.websiteUrl),
    musicUrl: validateMusicUrl(input.musicUrl),
    email: validateEmail(input.email),
    location: validateLocation(input.location),
    genre: validateGenre(input.genre),
    subgenre: validateSubgenre(input.subgenre),
    bioSummary: validateBioSummary(input.bioSummary),
    discoveryNotes: validateDiscoveryNotes(input.discoveryNotes),
    priority: validatePriority(input.priority),
    fitGenreScore: validateFitCategoryScore(input.fitGenreScore, "Genre compatibility score"),
    fitMusicalInterestScore: validateFitCategoryScore(input.fitMusicalInterestScore, "Musical interest score"),
    fitProductionOpportunityScore: validateFitCategoryScore(input.fitProductionOpportunityScore, "Production opportunity score"),
    fitProfessionalismScore: validateFitCategoryScore(input.fitProfessionalismScore, "Professionalism score"),
    fitRecentActivityScore: validateFitCategoryScore(input.fitRecentActivityScore, "Recent activity score"),
    fitAudienceBusinessScore: validateFitCategoryScore(input.fitAudienceBusinessScore, "Audience/business potential score"),
    fitPersonalEnthusiasmScore: validateFitCategoryScore(input.fitPersonalEnthusiasmScore, "Personal enthusiasm score"),
    fitScoreOverride: validateFitScoreOverride(input.fitScoreOverride),
    fitSummary: validateFitSummary(input.fitSummary),
    strengths: validateStrengths(input.strengths),
    opportunities: validateOpportunities(input.opportunities),
    concerns: validateConcerns(input.concerns),
    followerCount: validateFollowerCount(input.followerCount),
    monthlyListenerCount: validateMonthlyListenerCount(input.monthlyListenerCount),
    latestReleaseTitle: validateLatestReleaseTitle(input.latestReleaseTitle),
    latestReleaseDate: validateLatestReleaseDate(input.latestReleaseDate),
    lastActivityAt: validateLastActivityAt(input.lastActivityAt),
    nextReviewAt: validateNextReviewAt(input.nextReviewAt),
    outreachRecommendation: validateOutreachRecommendation(input.outreachRecommendation),
    outreachDraft: validateOutreachDraft(input.outreachDraft),
    relatedClientId: validateOptionalUuid(input.relatedClientId, "Related client id"),
    createdBy: validateOptionalUuid(input.createdBy, "Created-by id")
  };
}

/**
 * Normalizes and validates a general update input. Reads ONLY the whitelisted keys below —
 * `status` and `relatedSalesOpportunityId` are never read from `raw` at all, even if
 * present. Only keys actually present on `raw` are included in the result.
 */
export function validateUpdateArArtistInput(raw: unknown): UpdateArArtistInput {
  const input = (raw || {}) as Record<string, unknown>;
  const result: UpdateArArtistInput = {};

  if ("artistName" in input) result.artistName = validateArtistName(input.artistName);
  if ("handle" in input) result.handle = validateHandle(input.handle);
  if ("primaryPlatform" in input) result.primaryPlatform = validatePrimaryPlatform(input.primaryPlatform);
  if ("discoverySource" in input) result.discoverySource = validateDiscoverySource(input.discoverySource);
  if ("profileUrl" in input) result.profileUrl = validateProfileUrl(input.profileUrl);
  if ("websiteUrl" in input) result.websiteUrl = validateWebsiteUrl(input.websiteUrl);
  if ("musicUrl" in input) result.musicUrl = validateMusicUrl(input.musicUrl);
  if ("email" in input) result.email = validateEmail(input.email);
  if ("location" in input) result.location = validateLocation(input.location);
  if ("genre" in input) result.genre = validateGenre(input.genre);
  if ("subgenre" in input) result.subgenre = validateSubgenre(input.subgenre);
  if ("bioSummary" in input) result.bioSummary = validateBioSummary(input.bioSummary);
  if ("discoveryNotes" in input) result.discoveryNotes = validateDiscoveryNotes(input.discoveryNotes);
  if ("priority" in input) result.priority = validatePriority(input.priority);
  if ("fitGenreScore" in input) result.fitGenreScore = validateFitCategoryScore(input.fitGenreScore, "Genre compatibility score");
  if ("fitMusicalInterestScore" in input) result.fitMusicalInterestScore = validateFitCategoryScore(input.fitMusicalInterestScore, "Musical interest score");
  if ("fitProductionOpportunityScore" in input) result.fitProductionOpportunityScore = validateFitCategoryScore(input.fitProductionOpportunityScore, "Production opportunity score");
  if ("fitProfessionalismScore" in input) result.fitProfessionalismScore = validateFitCategoryScore(input.fitProfessionalismScore, "Professionalism score");
  if ("fitRecentActivityScore" in input) result.fitRecentActivityScore = validateFitCategoryScore(input.fitRecentActivityScore, "Recent activity score");
  if ("fitAudienceBusinessScore" in input) result.fitAudienceBusinessScore = validateFitCategoryScore(input.fitAudienceBusinessScore, "Audience/business potential score");
  if ("fitPersonalEnthusiasmScore" in input) result.fitPersonalEnthusiasmScore = validateFitCategoryScore(input.fitPersonalEnthusiasmScore, "Personal enthusiasm score");
  if ("fitScoreOverride" in input) result.fitScoreOverride = validateFitScoreOverride(input.fitScoreOverride);
  if ("clearFitScoreOverride" in input) result.clearFitScoreOverride = Boolean(input.clearFitScoreOverride);
  if ("fitSummary" in input) result.fitSummary = validateFitSummary(input.fitSummary);
  if ("strengths" in input) result.strengths = validateStrengths(input.strengths);
  if ("opportunities" in input) result.opportunities = validateOpportunities(input.opportunities);
  if ("concerns" in input) result.concerns = validateConcerns(input.concerns);
  if ("followerCount" in input) result.followerCount = validateFollowerCount(input.followerCount);
  if ("monthlyListenerCount" in input) result.monthlyListenerCount = validateMonthlyListenerCount(input.monthlyListenerCount);
  if ("latestReleaseTitle" in input) result.latestReleaseTitle = validateLatestReleaseTitle(input.latestReleaseTitle);
  if ("latestReleaseDate" in input) result.latestReleaseDate = validateLatestReleaseDate(input.latestReleaseDate);
  if ("lastActivityAt" in input) result.lastActivityAt = validateLastActivityAt(input.lastActivityAt);
  if ("lastReviewedAt" in input) result.lastReviewedAt = validateLastReviewedAt(input.lastReviewedAt);
  if ("nextReviewAt" in input) result.nextReviewAt = validateNextReviewAt(input.nextReviewAt);
  if ("outreachRecommendation" in input) result.outreachRecommendation = validateOutreachRecommendation(input.outreachRecommendation);
  if ("outreachDraft" in input) result.outreachDraft = validateOutreachDraft(input.outreachDraft);
  if ("relatedClientId" in input) result.relatedClientId = validateOptionalUuid(input.relatedClientId, "Related client id");

  return result;
}
