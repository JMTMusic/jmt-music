import { ASSET_KEYS } from "./types";
import type { AssetCompleteness, AssetKey, ContentItemRecord, ContentStatus } from "./types";

/**
 * The full status-transition map for a Content Item's editing pipeline.
 *
 *   idea ─▶ planned ─▶ needs_filming ─▶ needs_editing ─▶ ready ─▶ scheduled ─▶ published ─▶ archived
 *                  └──────────────┴───────────────┴────────┴───────────┘
 *                     (needs_filming, needs_editing, and ready are each reachable
 *                      directly from planned — not every item needs filming, and not
 *                      every filmed item needs a separate editing pass)
 *
 * Backward correction is allowed at every step before 'published' (mistakes happen —
 * something marked 'ready' turns out to need another editing pass, a filming plan
 * changes, etc.) but each stage's allow-list is an explicit, bounded set — there is no
 * generic "any status to any status" path anywhere in this map, matching the same
 * discipline already used for Project Setup's canPerformAction.
 *
 * 'published' only ever moves to 'archived', and 'archived' only ever moves back to
 * 'published' — a single, narrow round trip. Restoring an archived item is therefore
 * always a single, deliberate, unambiguous action (there is nowhere else archived can
 * go), which is what "only if intentionally restored" means in practice here: the map
 * itself makes an accidental/incidental restore impossible to reach by accident.
 */
export const CONTENT_STATUS_TRANSITIONS: Record<ContentStatus, readonly ContentStatus[]> = {
  idea: ["planned"],
  planned: ["idea", "needs_filming", "needs_editing", "ready"],
  needs_filming: ["planned", "needs_editing", "ready"],
  needs_editing: ["planned", "needs_filming", "ready"],
  ready: ["planned", "needs_filming", "needs_editing", "scheduled", "published"],
  scheduled: ["ready", "published"],
  published: ["archived"],
  archived: ["published"]
};

export function canTransitionContentStatus(from: ContentStatus, to: ContentStatus): boolean {
  if (from === to) return false;
  return CONTENT_STATUS_TRANSITIONS[from].includes(to);
}

export function getAllowedNextStatuses(from: ContentStatus): readonly ContentStatus[] {
  return CONTENT_STATUS_TRANSITIONS[from];
}

/** Statuses considered "active production," excluded from being counted as published/archived. */
const ACTIVE_STATUSES: readonly ContentStatus[] = ["idea", "planned", "needs_filming", "needs_editing", "ready", "scheduled"];

export function isActiveStatus(status: ContentStatus): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

/** publishedAt is set once, automatically, the first time status reaches 'published' — never overwritten on a later archive/restore cycle. */
export function shouldSetPublishedAt(currentPublishedAt: string | null): boolean {
  return currentPublishedAt === null;
}

// ---------------------------------------------------------------------------
// Selectors — pure functions over an already-fetched list, mirroring the same
// "one round trip, many selectors" shape used by project-repository.ts's
// selectTodaysFocus/selectWaitingOn/selectWorkload.
// ---------------------------------------------------------------------------

export function selectByStatus(items: ContentItemRecord[], status: ContentStatus): ContentItemRecord[] {
  return items.filter((item) => item.status === status);
}

export function selectActive(items: ContentItemRecord[]): ContentItemRecord[] {
  return items.filter((item) => isActiveStatus(item.status));
}

export function selectReadyToPublish(items: ContentItemRecord[]): ContentItemRecord[] {
  return selectByStatus(items, "ready");
}

export function selectNeedsFilming(items: ContentItemRecord[]): ContentItemRecord[] {
  return selectByStatus(items, "needs_filming");
}

export function selectNeedsEditing(items: ContentItemRecord[]): ContentItemRecord[] {
  return selectByStatus(items, "needs_editing");
}

/** Scheduled items whose scheduledAt falls within the next `days` days (default 7 — "this week"). Items with no scheduledAt are never included. */
export function selectScheduledWithinDays(
  items: ContentItemRecord[],
  days = 7,
  now: Date = new Date()
): ContentItemRecord[] {
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return items.filter((item) => {
    if (item.status !== "scheduled" || !item.scheduledAt) return false;
    const scheduled = new Date(item.scheduledAt);
    return scheduled.getTime() >= now.getTime() && scheduled.getTime() <= cutoff.getTime();
  });
}

/**
 * Content that needs a human decision right now, for the Dashboard's "Attention Required"
 * section — Stage 3's first consumer of this file's selectors beyond attention counts.
 * Deliberately two narrow, unambiguous rules rather than a scored heuristic (no asset-
 * completeness weighting, no "days since last touched" guess): a 'scheduled' item whose
 * scheduledAt has already passed (it should have gone out and didn't — someone needs to
 * check), and a 'ready' item with no scheduledAt at all (finished but never queued). Both
 * are unions, not derived from computeAttentionCounts, so they can evolve independently of
 * simple per-status tallies.
 */
export function selectAttentionRequired(items: ContentItemRecord[], now: Date = new Date()): ContentItemRecord[] {
  const overdueScheduled = items.filter((item) => item.status === "scheduled" && item.scheduledAt && new Date(item.scheduledAt).getTime() < now.getTime());
  const unscheduledReady = items.filter((item) => item.status === "ready" && !item.scheduledAt);
  return [...overdueScheduled, ...unscheduledReady];
}

/** One aggregation pass over a property's items, used by getContentAttentionCounts. */
export function computeAttentionCounts(items: ContentItemRecord[], now: Date = new Date()) {
  return {
    idea: selectByStatus(items, "idea").length,
    planned: selectByStatus(items, "planned").length,
    needsFilming: selectNeedsFilming(items).length,
    needsEditing: selectNeedsEditing(items).length,
    ready: selectReadyToPublish(items).length,
    scheduled: selectByStatus(items, "scheduled").length,
    scheduledThisWeek: selectScheduledWithinDays(items, 7, now).length,
    published: selectByStatus(items, "published").length,
    archived: selectByStatus(items, "archived").length,
    active: selectActive(items).length
  };
}

// ---------------------------------------------------------------------------
// Asset completeness
// ---------------------------------------------------------------------------

/**
 * Milestone 1 default: every tracked asset is required unless the caller supplies an
 * explicit override list. There is deliberately no "smart" per-content-type default
 * table here — inventing one (e.g. assuming a testimonial never needs a thumbnail)
 * would be presenting a guess as product truth. Once real usage clarifies which content
 * types genuinely don't need which assets, that mapping can be added without touching
 * this function's signature — it already accepts an override today.
 */
export function getRequiredAssetKeys(overrideKeys?: readonly AssetKey[]): readonly AssetKey[] {
  return overrideKeys && overrideKeys.length ? overrideKeys : ASSET_KEYS;
}

export function computeAssetCompleteness(
  item: Pick<
    ContentItemRecord,
    "assetVideoReady" | "assetAudioReady" | "assetArtworkReady" | "assetThumbnailReady" | "assetCaptionReady" | "assetHashtagsReady"
  >,
  requiredKeys?: readonly AssetKey[]
): AssetCompleteness {
  const required = getRequiredAssetKeys(requiredKeys);
  const readyMap: Record<AssetKey, boolean> = {
    video: item.assetVideoReady,
    audio: item.assetAudioReady,
    artwork: item.assetArtworkReady,
    thumbnail: item.assetThumbnailReady,
    caption: item.assetCaptionReady,
    hashtags: item.assetHashtagsReady
  };

  const missing = required.filter((key) => !readyMap[key]);
  const readyCount = required.length - missing.length;
  const completionPercentage = required.length === 0 ? 100 : Math.round((readyCount / required.length) * 100);

  return { totalTracked: required.length, readyCount, missing, completionPercentage };
}
