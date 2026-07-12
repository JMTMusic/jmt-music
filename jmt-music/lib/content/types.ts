/**
 * Content Workspace, Milestone 1 — data types.
 *
 * A Content Item is its own record, not a repurposed Project row: it has its own
 * 8-stage editing pipeline (see pipeline.ts) instead of the Universal Project model's
 * generic 5-phase lifecycle, and it optionally references a Project, Client, and/or
 * Beat rather than requiring one. There is no separate Release table yet — beatId is
 * the release connection for now (Beat and Release remain one row by design, per
 * `18 - JMT OS Architecture.md`).
 */

export const CONTENT_STATUSES = [
  "idea",
  "planned",
  "needs_filming",
  "needs_editing",
  "ready",
  "scheduled",
  "published",
  "archived"
] as const;
export type ContentStatus = typeof CONTENT_STATUSES[number];

export const CONTENT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type ContentPriority = typeof CONTENT_PRIORITIES[number];

/**
 * Constrained but extensible — a checked list at the database layer (see the migration)
 * and validated against the same list here, not a native Postgres enum type, so growing
 * this taxonomy is a widened check constraint, never an ALTER TYPE.
 */
export const CONTENT_TYPES = [
  "piano_performance",
  "cover",
  "original_performance",
  "beat_showcase",
  "beat_breakdown",
  "behind_the_beat",
  "behind_the_scenes",
  "studio_tour",
  "workflow",
  "production_tip",
  "piano_tip",
  "recording_tip",
  "release_announcement",
  "client_highlight",
  "testimonial",
  "gear",
  "lifestyle",
  "story_post",
  "other"
] as const;
export type ContentType = typeof CONTENT_TYPES[number];

export const CONTENT_PLATFORMS = [
  "instagram_reel",
  "instagram_feed",
  "instagram_story",
  "youtube_short",
  "youtube",
  "tiktok",
  "facebook",
  "website",
  "email"
] as const;
export type ContentPlatform = typeof CONTENT_PLATFORMS[number];

/** The six assets Milestone 1 tracks readiness for. Metadata only — no file storage yet. */
export const ASSET_KEYS = ["video", "audio", "artwork", "thumbnail", "caption", "hashtags"] as const;
export type AssetKey = typeof ASSET_KEYS[number];

/** Full internal record — everything Control Center code may see. No public/token-gated view exists for Content Items. */
export type ContentItemRecord = {
  id: string;
  propertyId: string;
  title: string;
  contentType: ContentType | null;
  status: ContentStatus;
  priority: ContentPriority;
  platforms: ContentPlatform[];
  platformUrls: Record<string, string>;
  notes: string | null;
  projectId: string | null;
  clientId: string | null;
  beatId: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  assetVideoReady: boolean;
  assetVideoUrl: string | null;
  assetAudioReady: boolean;
  assetAudioUrl: string | null;
  assetArtworkReady: boolean;
  assetArtworkUrl: string | null;
  assetThumbnailReady: boolean;
  assetThumbnailUrl: string | null;
  assetCaptionReady: boolean;
  caption: string | null;
  assetHashtagsReady: boolean;
  hashtags: string[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Fields a caller may set on create. `status` is deliberately absent — every Content
 * Item starts at 'idea' (the migration's own column default); there is no path to create
 * a row directly into a later stage, keeping "how did this get here" always answerable.
 */
export type CreateContentItemInput = {
  title: string;
  contentType?: string | null;
  priority?: string;
  platforms?: string[];
  platformUrls?: Record<string, unknown>;
  notes?: string | null;
  projectId?: string | null;
  clientId?: string | null;
  beatId?: string | null;
  scheduledAt?: string | null;
  assetVideoReady?: boolean;
  assetVideoUrl?: string | null;
  assetAudioReady?: boolean;
  assetAudioUrl?: string | null;
  assetArtworkReady?: boolean;
  assetArtworkUrl?: string | null;
  assetThumbnailReady?: boolean;
  assetThumbnailUrl?: string | null;
  assetCaptionReady?: boolean;
  caption?: string | null;
  assetHashtagsReady?: boolean;
  hashtags?: string[];
  createdBy?: string | null;
};

/**
 * Fields a caller may change via general update. Deliberately excludes `status` (must go
 * through updateContentStatus, which enforces the transition map) and `publishedAt`
 * (system-set once, automatically, the first time status reaches 'published') — these
 * are the two protected fields a general update must reject/ignore rather than write.
 */
export type UpdateContentItemInput = {
  title?: string;
  contentType?: string | null;
  priority?: string;
  platforms?: string[];
  platformUrls?: Record<string, unknown>;
  notes?: string | null;
  projectId?: string | null;
  clientId?: string | null;
  beatId?: string | null;
  scheduledAt?: string | null;
  assetVideoReady?: boolean;
  assetVideoUrl?: string | null;
  assetAudioReady?: boolean;
  assetAudioUrl?: string | null;
  assetArtworkReady?: boolean;
  assetArtworkUrl?: string | null;
  assetThumbnailReady?: boolean;
  assetThumbnailUrl?: string | null;
  assetCaptionReady?: boolean;
  caption?: string | null;
  assetHashtagsReady?: boolean;
  hashtags?: string[];
};

export type ContentItemsResult = {
  items: ContentItemRecord[];
  status: "empty" | "error" | "ready";
  detail: string;
};

export type ContentItemLookupResult =
  | { status: "found"; item: ContentItemRecord }
  | { status: "not_found" }
  | { status: "error"; message: string };

export type ContentItemMutationResult =
  | { status: "success"; item: ContentItemRecord }
  | { status: "error"; message: string };

export type ContentAttentionCounts = {
  idea: number;
  planned: number;
  needsFilming: number;
  needsEditing: number;
  ready: number;
  scheduled: number;
  scheduledThisWeek: number;
  published: number;
  archived: number;
  active: number;
};

export type ListContentItemsFilters = {
  status?: ContentStatus;
  priority?: ContentPriority;
  projectId?: string;
  clientId?: string;
  beatId?: string;
};

export type AssetCompleteness = {
  totalTracked: number;
  readyCount: number;
  missing: AssetKey[];
  completionPercentage: number;
};
