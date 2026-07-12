import { CONTENT_PLATFORMS, CONTENT_PRIORITIES, CONTENT_TYPES } from "./types";
import type {
  ContentPlatform,
  ContentPriority,
  ContentType,
  CreateContentItemInput,
  UpdateContentItemInput
} from "./types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_TITLE_LENGTH = 300;
const MAX_NOTES_LENGTH = 8000;
const MAX_CAPTION_LENGTH = 4000;
const MAX_HASHTAG_LENGTH = 100;
const MAX_HASHTAGS = 60;
const MAX_ASSET_REFERENCE_LENGTH = 2000;

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

/** Every optional relationship (project/client/beat) shares this rule: absent is fine, present-but-malformed is not. */
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

export function validateContentType(raw: unknown): ContentType | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string" || !(CONTENT_TYPES as readonly string[]).includes(raw)) {
    throw new Error("That content type is not recognized.");
  }
  return raw as ContentType;
}

export function validatePriority(raw: unknown): ContentPriority {
  if (raw === undefined || raw === null || raw === "") return "normal";
  if (typeof raw !== "string" || !(CONTENT_PRIORITIES as readonly string[]).includes(raw)) {
    throw new Error("Priority must be one of low, normal, high, or urgent.");
  }
  return raw as ContentPriority;
}

/** Every platform in the array must be a recognized value — no silent partial-acceptance. */
export function validatePlatforms(raw: unknown): ContentPlatform[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new Error("Platforms must be a list.");
  const platforms = raw.map((value) => {
    if (typeof value !== "string" || !(CONTENT_PLATFORMS as readonly string[]).includes(value)) {
      throw new Error(`"${String(value)}" is not a recognized platform.`);
    }
    return value as ContentPlatform;
  });
  return Array.from(new Set(platforms));
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Published destination links, keyed by platform. Both the key (a recognized platform)
 * and the value (a well-formed http/https URL) are validated — a malformed entry throws
 * rather than being silently dropped, since a bad URL here would otherwise surface only
 * when someone eventually clicks it from the Control Center.
 */
export function validatePlatformUrls(raw: unknown): Record<string, string> {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) throw new Error("Platform URLs must be a plain object.");

  const entries = Object.entries(raw as Record<string, unknown>);
  const result: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (!(CONTENT_PLATFORMS as readonly string[]).includes(key)) {
      throw new Error(`"${key}" is not a recognized platform.`);
    }
    if (typeof value !== "string" || !isHttpUrl(value)) {
      throw new Error(`The URL provided for "${key}" is not a valid web address.`);
    }
    result[key] = value;
  }
  return result;
}

export function validateNotes(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length > MAX_NOTES_LENGTH) throw new Error(`Notes must be ${MAX_NOTES_LENGTH} characters or fewer.`);
  return value || null;
}

export function validateScheduledAt(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = typeof raw === "string" ? raw : "";
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) throw new Error("Scheduled date is not a valid date.");
  return parsed.toISOString();
}

/**
 * Asset reference fields are deliberately NOT validated as strict URLs — Milestone 1 is
 * metadata-only, and "wherever the file lives" may be a local path or a cloud folder
 * reference, not necessarily a web address (see the migration's column comments).
 */
export function validateAssetReference(raw: unknown, fieldLabel: string): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length > MAX_ASSET_REFERENCE_LENGTH) {
    throw new Error(`${fieldLabel} must be ${MAX_ASSET_REFERENCE_LENGTH} characters or fewer.`);
  }
  return value || null;
}

export function validateCaption(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length > MAX_CAPTION_LENGTH) throw new Error(`Caption must be ${MAX_CAPTION_LENGTH} characters or fewer.`);
  return value || null;
}

export function validateHashtags(raw: unknown): string[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new Error("Hashtags must be a list.");
  if (raw.length > MAX_HASHTAGS) throw new Error(`No more than ${MAX_HASHTAGS} hashtags are allowed.`);
  return raw.map((value) => {
    if (typeof value !== "string" || !value.trim()) throw new Error("Each hashtag must be non-empty text.");
    if (value.length > MAX_HASHTAG_LENGTH) throw new Error(`Each hashtag must be ${MAX_HASHTAG_LENGTH} characters or fewer.`);
    return value.trim();
  });
}

function toBoolean(raw: unknown): boolean {
  return raw === true;
}

/**
 * Normalizes and validates a full create input. `status` has no parameter here at all —
 * every Content Item is created at 'idea' (the migration's own default); there is no
 * path through this function to create a row anywhere else in the pipeline.
 */
export function validateCreateContentItemInput(raw: unknown): CreateContentItemInput {
  const input = (raw || {}) as Record<string, unknown>;
  return {
    title: validateTitle(input.title),
    contentType: validateContentType(input.contentType),
    priority: validatePriority(input.priority),
    platforms: validatePlatforms(input.platforms),
    platformUrls: validatePlatformUrls(input.platformUrls),
    notes: validateNotes(input.notes),
    projectId: validateOptionalUuid(input.projectId, "Project id"),
    clientId: validateOptionalUuid(input.clientId, "Client id"),
    beatId: validateOptionalUuid(input.beatId, "Beat id"),
    scheduledAt: validateScheduledAt(input.scheduledAt),
    assetVideoReady: toBoolean(input.assetVideoReady),
    assetVideoUrl: validateAssetReference(input.assetVideoUrl, "Video reference"),
    assetAudioReady: toBoolean(input.assetAudioReady),
    assetAudioUrl: validateAssetReference(input.assetAudioUrl, "Audio reference"),
    assetArtworkReady: toBoolean(input.assetArtworkReady),
    assetArtworkUrl: validateAssetReference(input.assetArtworkUrl, "Artwork reference"),
    assetThumbnailReady: toBoolean(input.assetThumbnailReady),
    assetThumbnailUrl: validateAssetReference(input.assetThumbnailUrl, "Thumbnail reference"),
    assetCaptionReady: toBoolean(input.assetCaptionReady),
    caption: validateCaption(input.caption),
    assetHashtagsReady: toBoolean(input.assetHashtagsReady),
    hashtags: validateHashtags(input.hashtags),
    createdBy: validateOptionalUuid(input.createdBy, "Created-by id")
  };
}

/**
 * Normalizes and validates a general update input. Reads ONLY the whitelisted keys below
 * — `status` and `publishedAt` are never read from `raw` at all, even if present, which is
 * the structural guarantee that a general update can never move the pipeline stage or
 * backdate the publish timestamp. Only keys actually present on `raw` are included in the
 * result, so a caller updating just one field doesn't blow away every other column.
 */
export function validateUpdateContentItemInput(raw: unknown): UpdateContentItemInput {
  const input = (raw || {}) as Record<string, unknown>;
  const result: UpdateContentItemInput = {};

  if ("title" in input) result.title = validateTitle(input.title);
  if ("contentType" in input) result.contentType = validateContentType(input.contentType);
  if ("priority" in input) result.priority = validatePriority(input.priority);
  if ("platforms" in input) result.platforms = validatePlatforms(input.platforms);
  if ("platformUrls" in input) result.platformUrls = validatePlatformUrls(input.platformUrls);
  if ("notes" in input) result.notes = validateNotes(input.notes);
  if ("projectId" in input) result.projectId = validateOptionalUuid(input.projectId, "Project id");
  if ("clientId" in input) result.clientId = validateOptionalUuid(input.clientId, "Client id");
  if ("beatId" in input) result.beatId = validateOptionalUuid(input.beatId, "Beat id");
  if ("scheduledAt" in input) result.scheduledAt = validateScheduledAt(input.scheduledAt);
  if ("assetVideoReady" in input) result.assetVideoReady = toBoolean(input.assetVideoReady);
  if ("assetVideoUrl" in input) result.assetVideoUrl = validateAssetReference(input.assetVideoUrl, "Video reference");
  if ("assetAudioReady" in input) result.assetAudioReady = toBoolean(input.assetAudioReady);
  if ("assetAudioUrl" in input) result.assetAudioUrl = validateAssetReference(input.assetAudioUrl, "Audio reference");
  if ("assetArtworkReady" in input) result.assetArtworkReady = toBoolean(input.assetArtworkReady);
  if ("assetArtworkUrl" in input) result.assetArtworkUrl = validateAssetReference(input.assetArtworkUrl, "Artwork reference");
  if ("assetThumbnailReady" in input) result.assetThumbnailReady = toBoolean(input.assetThumbnailReady);
  if ("assetThumbnailUrl" in input) result.assetThumbnailUrl = validateAssetReference(input.assetThumbnailUrl, "Thumbnail reference");
  if ("assetCaptionReady" in input) result.assetCaptionReady = toBoolean(input.assetCaptionReady);
  if ("caption" in input) result.caption = validateCaption(input.caption);
  if ("assetHashtagsReady" in input) result.assetHashtagsReady = toBoolean(input.assetHashtagsReady);
  if ("hashtags" in input) result.hashtags = validateHashtags(input.hashtags);

  return result;
}
