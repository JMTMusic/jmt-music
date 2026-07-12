import { SALES_PLATFORMS, SALES_PROBABILITIES, SALES_SERVICE_TYPES } from "./types";
import type {
  CreateSalesOpportunityInput,
  SalesPlatform,
  SalesProbability,
  SalesServiceType,
  UpdateSalesOpportunityInput
} from "./types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_TITLE_LENGTH = 300;
const MAX_ARTIST_NAME_LENGTH = 160;
const MAX_GENRE_LENGTH = 80;
const MAX_NOTES_LENGTH = 8000;
const MAX_PROPOSAL_TEXT_LENGTH = 8000;
const MAX_BUYER_INSTRUCTIONS_LENGTH = 8000;
const MAX_LOST_REASON_LENGTH = 2000;
const MAX_SAMPLE_TITLE_LENGTH = 300;
const MAX_SAMPLE_DESCRIPTION_LENGTH = 4000;
const MAX_URL_LENGTH = 2000;
const MAX_CURRENCY_LENGTH = 8;
const MAX_BUDGET = 10_000_000;
const MAX_TURNAROUND_DAYS = 3650;
const MAX_REVISION_COUNT = 100;

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function validateOptionalUuid(raw: unknown, fieldLabel: string): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (!isValidUuid(raw)) throw new Error(`${fieldLabel}, if provided, must be a valid id.`);
  return raw;
}

export function validateTitle(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) throw new Error("A title is required.");
  if (value.length > MAX_TITLE_LENGTH) throw new Error(`Title must be ${MAX_TITLE_LENGTH} characters or fewer.`);
  return value;
}

export function validateArtistName(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) throw new Error("An artist name is required.");
  if (value.length > MAX_ARTIST_NAME_LENGTH) throw new Error(`Artist name must be ${MAX_ARTIST_NAME_LENGTH} characters or fewer.`);
  return value;
}

export function validateArtistEmail(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error("Enter a valid email address.");
  return value;
}

export function validatePlatform(raw: unknown): SalesPlatform {
  if (typeof raw !== "string" || !(SALES_PLATFORMS as readonly string[]).includes(raw)) {
    throw new Error("Select a valid platform.");
  }
  return raw as SalesPlatform;
}

export function validateServiceType(raw: unknown): SalesServiceType {
  if (typeof raw !== "string" || !(SALES_SERVICE_TYPES as readonly string[]).includes(raw)) {
    throw new Error("Select a valid service type.");
  }
  return raw as SalesServiceType;
}

export function validateGenre(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length > MAX_GENRE_LENGTH) throw new Error(`Genre must be ${MAX_GENRE_LENGTH} characters or fewer.`);
  return value || null;
}

export function validateBudgetAmount(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > MAX_BUDGET) throw new Error("Enter a valid budget amount.");
  return Math.round(value * 100) / 100;
}

export function validateCurrency(raw: unknown): string {
  if (raw === undefined || raw === null || raw === "") return "USD";
  const value = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (!/^[A-Z]{3}$/.test(value) || value.length > MAX_CURRENCY_LENGTH) throw new Error("Currency must be a 3-letter code (e.g. USD).");
  return value;
}

export function validateProbability(raw: unknown): SalesProbability {
  if (raw === undefined || raw === null || raw === "") return "medium";
  if (typeof raw !== "string" || !(SALES_PROBABILITIES as readonly string[]).includes(raw)) {
    throw new Error("Probability must be low, medium, or high.");
  }
  return raw as SalesProbability;
}

/**
 * A bare date (no time component — e.g. straight from an <input type="date">, which is
 * exactly how proposal_sent_at/follow_up_at are collected in this MVP) is anchored to noon
 * UTC rather than parsed as UTC midnight. UTC midnight for "2026-07-16" reads as the evening
 * of July 15 in America/Chicago — the timezone lib/control-center/lead-pipeline.ts's
 * getZonedDateKey uses for every "due today"/"overdue" comparison in this app, including
 * Sales' own follow-up selectors — silently shifting the calendar day the caller actually
 * meant back by one. Noon UTC stays on the same calendar day for every real-world timezone.
 * A full datetime string (already carries its own time/offset) is parsed as-is.
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

export function validateProposalSentAt(raw: unknown): string | null {
  return validateOptionalTimestamp(raw, "Proposal sent date");
}

export function validateFollowUpAt(raw: unknown): string | null {
  return validateOptionalTimestamp(raw, "Follow-up date");
}

/** Stored as a plain date (no time component), matching projects.target_date's convention. */
export function validateDeadline(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = typeof raw === "string" ? raw : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Deadline must be a valid date.");
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

export function validateSourceUrl(raw: unknown): string | null {
  return validateOptionalUrl(raw, "Source link");
}

export function validateMusicUrl(raw: unknown): string | null {
  return validateOptionalUrl(raw, "Music link");
}

export function validateSampleUrl(raw: unknown): string | null {
  return validateOptionalUrl(raw, "Sample link");
}

function validateLongText(raw: unknown, max: number, fieldLabel: string): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length > max) throw new Error(`${fieldLabel} must be ${max} characters or fewer.`);
  return value || null;
}

export function validateNotes(raw: unknown): string | null {
  return validateLongText(raw, MAX_NOTES_LENGTH, "Notes");
}

export function validateProposalText(raw: unknown): string | null {
  return validateLongText(raw, MAX_PROPOSAL_TEXT_LENGTH, "Proposal text");
}

export function validateBuyerInstructions(raw: unknown): string | null {
  return validateLongText(raw, MAX_BUYER_INSTRUCTIONS_LENGTH, "Buyer instructions");
}

export function validateLostReason(raw: unknown): string | null {
  return validateLongText(raw, MAX_LOST_REASON_LENGTH, "Lost reason");
}

export function validateSampleTitle(raw: unknown): string | null {
  return validateLongText(raw, MAX_SAMPLE_TITLE_LENGTH, "Sample title");
}

export function validateSampleDescription(raw: unknown): string | null {
  return validateLongText(raw, MAX_SAMPLE_DESCRIPTION_LENGTH, "Sample description");
}

function validateOptionalNonNegativeInt(raw: unknown, max: number, fieldLabel: string): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > max) throw new Error(`${fieldLabel} must be a whole number from 0 to ${max}.`);
  return value;
}

export function validateTurnaroundDays(raw: unknown): number | null {
  return validateOptionalNonNegativeInt(raw, MAX_TURNAROUND_DAYS, "Turnaround days");
}

export function validateRevisionCount(raw: unknown): number | null {
  return validateOptionalNonNegativeInt(raw, MAX_REVISION_COUNT, "Revision count");
}

/**
 * Normalizes and validates a full create input. `status` has no parameter here at all —
 * every opportunity is created at 'new_lead' (the migration's own default).
 */
export function validateCreateSalesOpportunityInput(raw: unknown): CreateSalesOpportunityInput {
  const input = (raw || {}) as Record<string, unknown>;
  return {
    title: validateTitle(input.title),
    artistName: validateArtistName(input.artistName),
    artistEmail: validateArtistEmail(input.artistEmail),
    clientId: validateOptionalUuid(input.clientId, "Client id"),
    platform: validatePlatform(input.platform),
    serviceType: validateServiceType(input.serviceType),
    genre: validateGenre(input.genre),
    budgetAmount: validateBudgetAmount(input.budgetAmount),
    currency: validateCurrency(input.currency),
    probability: validateProbability(input.probability),
    proposalSentAt: validateProposalSentAt(input.proposalSentAt),
    followUpAt: validateFollowUpAt(input.followUpAt),
    deadline: validateDeadline(input.deadline),
    sourceUrl: validateSourceUrl(input.sourceUrl),
    musicUrl: validateMusicUrl(input.musicUrl),
    notes: validateNotes(input.notes),
    proposalText: validateProposalText(input.proposalText),
    buyerInstructions: validateBuyerInstructions(input.buyerInstructions),
    turnaroundDays: validateTurnaroundDays(input.turnaroundDays),
    revisionCount: validateRevisionCount(input.revisionCount),
    sampleTitle: validateSampleTitle(input.sampleTitle),
    sampleDescription: validateSampleDescription(input.sampleDescription),
    sampleUrl: validateSampleUrl(input.sampleUrl),
    createdBy: validateOptionalUuid(input.createdBy, "Created-by id")
  };
}

/**
 * Normalizes and validates a general update input. Reads ONLY the whitelisted keys below —
 * `status`, `convertedProjectId`, and `convertedClientId` are never read from `raw` at all,
 * even if present. Only keys actually present on `raw` are included in the result.
 */
export function validateUpdateSalesOpportunityInput(raw: unknown): UpdateSalesOpportunityInput {
  const input = (raw || {}) as Record<string, unknown>;
  const result: UpdateSalesOpportunityInput = {};

  if ("title" in input) result.title = validateTitle(input.title);
  if ("artistName" in input) result.artistName = validateArtistName(input.artistName);
  if ("artistEmail" in input) result.artistEmail = validateArtistEmail(input.artistEmail);
  if ("clientId" in input) result.clientId = validateOptionalUuid(input.clientId, "Client id");
  if ("platform" in input) result.platform = validatePlatform(input.platform);
  if ("serviceType" in input) result.serviceType = validateServiceType(input.serviceType);
  if ("genre" in input) result.genre = validateGenre(input.genre);
  if ("budgetAmount" in input) result.budgetAmount = validateBudgetAmount(input.budgetAmount);
  if ("currency" in input) result.currency = validateCurrency(input.currency);
  if ("probability" in input) result.probability = validateProbability(input.probability);
  if ("proposalSentAt" in input) result.proposalSentAt = validateProposalSentAt(input.proposalSentAt);
  if ("followUpAt" in input) result.followUpAt = validateFollowUpAt(input.followUpAt);
  if ("deadline" in input) result.deadline = validateDeadline(input.deadline);
  if ("sourceUrl" in input) result.sourceUrl = validateSourceUrl(input.sourceUrl);
  if ("musicUrl" in input) result.musicUrl = validateMusicUrl(input.musicUrl);
  if ("notes" in input) result.notes = validateNotes(input.notes);
  if ("proposalText" in input) result.proposalText = validateProposalText(input.proposalText);
  if ("buyerInstructions" in input) result.buyerInstructions = validateBuyerInstructions(input.buyerInstructions);
  if ("turnaroundDays" in input) result.turnaroundDays = validateTurnaroundDays(input.turnaroundDays);
  if ("revisionCount" in input) result.revisionCount = validateRevisionCount(input.revisionCount);
  if ("sampleTitle" in input) result.sampleTitle = validateSampleTitle(input.sampleTitle);
  if ("sampleDescription" in input) result.sampleDescription = validateSampleDescription(input.sampleDescription);
  if ("sampleUrl" in input) result.sampleUrl = validateSampleUrl(input.sampleUrl);
  if ("lostReason" in input) result.lostReason = validateLostReason(input.lostReason);

  return result;
}
