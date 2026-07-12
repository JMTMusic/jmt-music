import { describe, expect, it } from "vitest";
import {
  CONTENT_STATUS_TRANSITIONS,
  canTransitionContentStatus,
  computeAssetCompleteness,
  computeAttentionCounts,
  getAllowedNextStatuses,
  getRequiredAssetKeys,
  isActiveStatus,
  selectActive,
  selectAttentionRequired,
  selectByStatus,
  selectNeedsEditing,
  selectNeedsFilming,
  selectReadyToPublish,
  selectScheduledWithinDays,
  shouldSetPublishedAt
} from "./pipeline";
import type { ContentItemRecord, ContentStatus } from "./types";

function makeItem(overrides: Partial<ContentItemRecord> = {}): ContentItemRecord {
  return {
    id: "item-1",
    propertyId: "property-1",
    title: "Test item",
    contentType: null,
    status: "idea",
    priority: "normal",
    platforms: [],
    platformUrls: {},
    notes: null,
    projectId: null,
    clientId: null,
    beatId: null,
    scheduledAt: null,
    publishedAt: null,
    assetVideoReady: false,
    assetVideoUrl: null,
    assetAudioReady: false,
    assetAudioUrl: null,
    assetArtworkReady: false,
    assetArtworkUrl: null,
    assetThumbnailReady: false,
    assetThumbnailUrl: null,
    assetCaptionReady: false,
    caption: null,
    assetHashtagsReady: false,
    hashtags: [],
    createdBy: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides
  };
}

describe("status transitions", () => {
  it("documents the exact forward pipeline required by the spec", () => {
    expect(canTransitionContentStatus("idea", "planned")).toBe(true);
    expect(canTransitionContentStatus("planned", "needs_filming")).toBe(true);
    expect(canTransitionContentStatus("planned", "needs_editing")).toBe(true);
    expect(canTransitionContentStatus("planned", "ready")).toBe(true);
    expect(canTransitionContentStatus("needs_filming", "needs_editing")).toBe(true);
    expect(canTransitionContentStatus("needs_filming", "ready")).toBe(true);
    expect(canTransitionContentStatus("needs_editing", "ready")).toBe(true);
    expect(canTransitionContentStatus("ready", "scheduled")).toBe(true);
    expect(canTransitionContentStatus("ready", "published")).toBe(true);
    expect(canTransitionContentStatus("scheduled", "ready")).toBe(true);
    expect(canTransitionContentStatus("scheduled", "published")).toBe(true);
    expect(canTransitionContentStatus("published", "archived")).toBe(true);
  });

  it("allows archived to restore to published only, and nowhere else", () => {
    expect(canTransitionContentStatus("archived", "published")).toBe(true);
    expect(getAllowedNextStatuses("archived")).toEqual(["published"]);
  });

  it("does not permit arbitrary transitions", () => {
    expect(canTransitionContentStatus("idea", "published")).toBe(false);
    expect(canTransitionContentStatus("idea", "archived")).toBe(false);
    expect(canTransitionContentStatus("published", "idea")).toBe(false);
    expect(canTransitionContentStatus("published", "ready")).toBe(false);
    expect(canTransitionContentStatus("archived", "idea")).toBe(false);
    expect(canTransitionContentStatus("archived", "ready")).toBe(false);
  });

  it("rejects a same-status transition", () => {
    expect(canTransitionContentStatus("idea", "idea")).toBe(false);
  });

  it("allows reasonable backward correction before publishing", () => {
    expect(canTransitionContentStatus("planned", "idea")).toBe(true);
    expect(canTransitionContentStatus("needs_filming", "planned")).toBe(true);
    expect(canTransitionContentStatus("needs_editing", "planned")).toBe(true);
    expect(canTransitionContentStatus("needs_editing", "needs_filming")).toBe(true);
    expect(canTransitionContentStatus("ready", "needs_filming")).toBe(true);
    expect(canTransitionContentStatus("ready", "needs_editing")).toBe(true);
    expect(canTransitionContentStatus("ready", "planned")).toBe(true);
  });

  it("every status has an explicit, bounded allow-list (no missing keys)", () => {
    const statuses: ContentStatus[] = ["idea", "planned", "needs_filming", "needs_editing", "ready", "scheduled", "published", "archived"];
    for (const status of statuses) {
      expect(Array.isArray(CONTENT_STATUS_TRANSITIONS[status])).toBe(true);
    }
  });
});

describe("shouldSetPublishedAt", () => {
  it("is true only the first time (currently null)", () => {
    expect(shouldSetPublishedAt(null)).toBe(true);
    expect(shouldSetPublishedAt("2026-07-01T00:00:00.000Z")).toBe(false);
  });
});

describe("selectors", () => {
  const items = [
    makeItem({ id: "a", status: "idea" }),
    makeItem({ id: "b", status: "planned" }),
    makeItem({ id: "c", status: "needs_filming" }),
    makeItem({ id: "d", status: "needs_editing" }),
    makeItem({ id: "e", status: "ready" }),
    makeItem({ id: "f", status: "scheduled", scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() }),
    makeItem({ id: "g", status: "scheduled", scheduledAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }),
    makeItem({ id: "h", status: "published" }),
    makeItem({ id: "i", status: "archived" })
  ];

  it("selectByStatus / selectNeedsFilming / selectNeedsEditing / selectReadyToPublish", () => {
    expect(selectByStatus(items, "idea").map((i) => i.id)).toEqual(["a"]);
    expect(selectNeedsFilming(items).map((i) => i.id)).toEqual(["c"]);
    expect(selectNeedsEditing(items).map((i) => i.id)).toEqual(["d"]);
    expect(selectReadyToPublish(items).map((i) => i.id)).toEqual(["e"]);
  });

  it("selectScheduledWithinDays only includes items inside the window", () => {
    const withinWeek = selectScheduledWithinDays(items, 7);
    expect(withinWeek.map((i) => i.id)).toEqual(["f"]);
    expect(withinWeek.some((i) => i.id === "g")).toBe(false);
  });

  it("published and archived items are excluded from isActiveStatus / selectActive", () => {
    expect(isActiveStatus("published")).toBe(false);
    expect(isActiveStatus("archived")).toBe(false);
    expect(isActiveStatus("idea")).toBe(true);
    const active = selectActive(items);
    expect(active.some((i) => i.status === "published")).toBe(false);
    expect(active.some((i) => i.status === "archived")).toBe(false);
    expect(active.length).toBe(items.length - 2);
  });

  it("computeAttentionCounts aggregates every bucket in one pass", () => {
    const counts = computeAttentionCounts(items);
    expect(counts.idea).toBe(1);
    expect(counts.planned).toBe(1);
    expect(counts.needsFilming).toBe(1);
    expect(counts.needsEditing).toBe(1);
    expect(counts.ready).toBe(1);
    expect(counts.scheduled).toBe(2);
    expect(counts.scheduledThisWeek).toBe(1);
    expect(counts.published).toBe(1);
    expect(counts.archived).toBe(1);
    expect(counts.active).toBe(items.length - 2);
  });
});

describe("selectAttentionRequired", () => {
  it("includes a scheduled item whose scheduledAt has already passed", () => {
    const items = [
      makeItem({ id: "overdue", status: "scheduled", scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }),
      makeItem({ id: "future", status: "scheduled", scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
    ];
    expect(selectAttentionRequired(items).map((i) => i.id)).toEqual(["overdue"]);
  });

  it("includes a ready item with no scheduledAt, excludes one that already has one", () => {
    const items = [
      makeItem({ id: "unscheduled", status: "ready", scheduledAt: null }),
      makeItem({ id: "already-queued", status: "ready", scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
    ];
    expect(selectAttentionRequired(items).map((i) => i.id)).toEqual(["unscheduled"]);
  });

  it("excludes every other status entirely", () => {
    const items = [makeItem({ id: "a", status: "idea" }), makeItem({ id: "b", status: "planned" }), makeItem({ id: "c", status: "published" }), makeItem({ id: "d", status: "archived" })];
    expect(selectAttentionRequired(items)).toEqual([]);
  });
});

describe("asset completeness", () => {
  it("reports full completion when every tracked asset is ready", () => {
    const item = makeItem({
      assetVideoReady: true,
      assetAudioReady: true,
      assetArtworkReady: true,
      assetThumbnailReady: true,
      assetCaptionReady: true,
      assetHashtagsReady: true
    });
    const completeness = computeAssetCompleteness(item);
    expect(completeness.totalTracked).toBe(6);
    expect(completeness.readyCount).toBe(6);
    expect(completeness.missing).toEqual([]);
    expect(completeness.completionPercentage).toBe(100);
  });

  it("lists exactly the missing assets and computes a partial percentage", () => {
    const item = makeItem({ assetVideoReady: true, assetCaptionReady: true });
    const completeness = computeAssetCompleteness(item);
    expect(completeness.readyCount).toBe(2);
    expect(completeness.missing).toEqual(["audio", "artwork", "thumbnail", "hashtags"]);
    expect(completeness.completionPercentage).toBe(33);
  });

  it("does not assume every Content Item requires every asset — supports a configurable required list", () => {
    const item = makeItem({ assetCaptionReady: true, assetHashtagsReady: true });
    const completeness = computeAssetCompleteness(item, ["caption", "hashtags"]);
    expect(completeness.totalTracked).toBe(2);
    expect(completeness.readyCount).toBe(2);
    expect(completeness.missing).toEqual([]);
    expect(completeness.completionPercentage).toBe(100);
  });

  it("getRequiredAssetKeys falls back to every asset when no override is given", () => {
    expect(getRequiredAssetKeys()).toEqual(["video", "audio", "artwork", "thumbnail", "caption", "hashtags"]);
    expect(getRequiredAssetKeys(["caption"])).toEqual(["caption"]);
  });
});
