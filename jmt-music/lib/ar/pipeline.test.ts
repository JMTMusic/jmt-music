import { describe, expect, it } from "vitest";
import {
  canComposeOutreachDraft,
  composeOutreachDraft,
  computeArOverviewCounts,
  computeAverageFitScore,
  computeFitScore,
  getArtistNextAction,
  getFitScoreCategoryValues,
  isActiveStatus,
  isReviewDueToday,
  isReviewOverdue,
  isTerminalStatus,
  selectHighPriorityWatchlist,
  selectRecentlyDiscovered,
  selectReviewsDue,
  selectTodaysArFocus
} from "./pipeline";
import type { ArArtistRecord, ArStatus } from "./types";

function makeArtist(overrides: Partial<ArArtistRecord> = {}): ArArtistRecord {
  return {
    id: "artist-1",
    propertyId: "property-1",
    artistName: "Test Artist",
    handle: null,
    primaryPlatform: "instagram",
    discoverySource: null,
    profileUrl: null,
    websiteUrl: null,
    musicUrl: null,
    email: null,
    location: null,
    genre: null,
    subgenre: null,
    bioSummary: null,
    discoveryNotes: null,
    status: "discovered",
    priority: "medium",
    fitGenreScore: null,
    fitMusicalInterestScore: null,
    fitProductionOpportunityScore: null,
    fitProfessionalismScore: null,
    fitRecentActivityScore: null,
    fitAudienceBusinessScore: null,
    fitPersonalEnthusiasmScore: null,
    fitScore: null,
    fitScoreOverridden: false,
    fitSummary: null,
    strengths: null,
    opportunities: null,
    concerns: null,
    followerCount: null,
    monthlyListenerCount: null,
    latestReleaseTitle: null,
    latestReleaseDate: null,
    lastActivityAt: null,
    lastReviewedAt: null,
    nextReviewAt: null,
    outreachRecommendation: null,
    outreachDraft: null,
    relatedClientId: null,
    relatedSalesOpportunityId: null,
    createdBy: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides
  };
}

const NOW = new Date("2026-07-12T18:00:00.000Z");

describe("terminal/active status", () => {
  it("converted and dismissed are terminal; everything else is active", () => {
    const statuses: ArStatus[] = ["discovered", "reviewing", "watchlist", "ready_for_outreach", "contacted", "converted", "dismissed"];
    for (const status of statuses) {
      const expectedTerminal = status === "converted" || status === "dismissed";
      expect(isTerminalStatus(status)).toBe(expectedTerminal);
      expect(isActiveStatus(status)).toBe(!expectedTerminal);
    }
  });
});

describe("fit score computation", () => {
  it("averages whichever categories are filled in, rounded to one decimal", () => {
    const values = getFitScoreCategoryValues(makeArtist({ fitGenreScore: 4, fitMusicalInterestScore: 5, fitProductionOpportunityScore: 3 }));
    expect(computeFitScore(values)).toBe(4);
  });

  it("rounds to one decimal for a non-integer average", () => {
    const values = getFitScoreCategoryValues(makeArtist({ fitGenreScore: 5, fitMusicalInterestScore: 4, fitProductionOpportunityScore: 4 }));
    expect(computeFitScore(values)).toBeCloseTo(4.3, 5);
  });

  it("returns null when every category is blank — not yet reviewed, not zero", () => {
    const values = getFitScoreCategoryValues(makeArtist());
    expect(computeFitScore(values)).toBeNull();
  });

  it("computeAverageFitScore averages fit_score across scored artists only", () => {
    const artists = [
      makeArtist({ id: "a", fitScore: 4 }),
      makeArtist({ id: "b", fitScore: 2 }),
      makeArtist({ id: "c", fitScore: null })
    ];
    expect(computeAverageFitScore(artists)).toBe(3);
  });

  it("computeAverageFitScore returns null when nothing is scored", () => {
    expect(computeAverageFitScore([makeArtist({ fitScore: null })])).toBeNull();
  });
});

describe("review due/overdue", () => {
  it("is due today for a same-calendar-day next_review_at in the configured timezone", () => {
    const artist = makeArtist({ nextReviewAt: "2026-07-12T23:00:00.000Z", status: "watchlist" });
    expect(isReviewDueToday(artist, NOW)).toBe(true);
    expect(isReviewOverdue(artist, NOW)).toBe(false);
  });

  it("is overdue for a next_review_at strictly before today", () => {
    const artist = makeArtist({ nextReviewAt: "2026-07-10T12:00:00.000Z", status: "watchlist" });
    expect(isReviewOverdue(artist, NOW)).toBe(true);
    expect(isReviewDueToday(artist, NOW)).toBe(false);
  });

  it("is neither due nor overdue for a future next_review_at", () => {
    const artist = makeArtist({ nextReviewAt: "2026-07-20T12:00:00.000Z" });
    expect(isReviewDueToday(artist, NOW)).toBe(false);
    expect(isReviewOverdue(artist, NOW)).toBe(false);
  });

  it("never counts a terminal-status artist as due or overdue, even with a stale next_review_at", () => {
    const converted = makeArtist({ nextReviewAt: "2026-07-01T12:00:00.000Z", status: "converted" });
    const dismissed = makeArtist({ nextReviewAt: "2026-07-12T12:00:00.000Z", status: "dismissed" });
    for (const artist of [converted, dismissed]) {
      expect(isReviewDueToday(artist, NOW)).toBe(false);
      expect(isReviewOverdue(artist, NOW)).toBe(false);
    }
  });

  it("selectReviewsDue combines today and overdue, excludes future and terminal", () => {
    const artists = [
      makeArtist({ id: "today", nextReviewAt: "2026-07-12T08:00:00.000Z", status: "watchlist" }),
      makeArtist({ id: "overdue", nextReviewAt: "2026-07-05T08:00:00.000Z", status: "contacted" }),
      makeArtist({ id: "future", nextReviewAt: "2026-07-20T08:00:00.000Z", status: "watchlist" }),
      makeArtist({ id: "converted-stale", nextReviewAt: "2026-07-01T08:00:00.000Z", status: "converted" }),
      makeArtist({ id: "none" })
    ];
    expect(selectReviewsDue(artists, NOW).map((a) => a.id).sort()).toEqual(["overdue", "today"]);
  });
});

describe("selectRecentlyDiscovered / selectHighPriorityWatchlist", () => {
  it("selectRecentlyDiscovered only includes active artists created within the window", () => {
    const artists = [
      makeArtist({ id: "recent", createdAt: "2026-07-08T00:00:00.000Z", status: "discovered" }),
      makeArtist({ id: "old", createdAt: "2026-06-01T00:00:00.000Z", status: "discovered" }),
      makeArtist({ id: "recent-dismissed", createdAt: "2026-07-08T00:00:00.000Z", status: "dismissed" })
    ];
    expect(selectRecentlyDiscovered(artists, NOW, 7).map((a) => a.id)).toEqual(["recent"]);
  });

  it("selectHighPriorityWatchlist requires both watchlist status and high priority", () => {
    const artists = [
      makeArtist({ id: "match", status: "watchlist", priority: "high" }),
      makeArtist({ id: "wrong-priority", status: "watchlist", priority: "medium" }),
      makeArtist({ id: "wrong-status", status: "reviewing", priority: "high" })
    ];
    expect(selectHighPriorityWatchlist(artists).map((a) => a.id)).toEqual(["match"]);
  });
});

describe("selectTodaysArFocus", () => {
  it("unions reviews due with high-priority ready-for-outreach artists, without duplicates", () => {
    const artists = [
      makeArtist({ id: "due", status: "watchlist", nextReviewAt: "2026-07-12T08:00:00.000Z" }),
      makeArtist({ id: "ready-high", status: "ready_for_outreach", priority: "high" }),
      makeArtist({ id: "ready-medium", status: "ready_for_outreach", priority: "medium" }),
      makeArtist({ id: "due-and-ready", status: "ready_for_outreach", priority: "high", nextReviewAt: "2026-07-05T08:00:00.000Z" }),
      makeArtist({ id: "untouched", status: "discovered" })
    ];
    expect(selectTodaysArFocus(artists, NOW).map((a) => a.id).sort()).toEqual(["due", "due-and-ready", "ready-high"]);
  });

  it("does not include every discovered artist", () => {
    const artists = [makeArtist({ id: "a", status: "discovered" }), makeArtist({ id: "b", status: "reviewing" })];
    expect(selectTodaysArFocus(artists, NOW)).toEqual([]);
  });
});

describe("computeArOverviewCounts", () => {
  it("aggregates every bucket in one pass", () => {
    const artists = [
      makeArtist({ id: "a", status: "ready_for_outreach", fitScore: 4 }),
      makeArtist({ id: "b", status: "watchlist", priority: "high" }),
      makeArtist({ id: "c", status: "contacted" }),
      makeArtist({ id: "d", status: "converted" }),
      makeArtist({ id: "e", status: "discovered", createdAt: "2026-07-11T00:00:00.000Z", fitScore: 2 }),
      makeArtist({ id: "f", status: "watchlist", nextReviewAt: "2026-07-12T08:00:00.000Z" })
    ];
    const counts = computeArOverviewCounts(artists, NOW);
    expect(counts.readyForOutreach).toBe(1);
    expect(counts.highPriorityWatchlist).toBe(1);
    expect(counts.reviewsDue).toBe(1);
    expect(counts.recentlyDiscovered).toBe(1);
    expect(counts.contacted).toBe(1);
    expect(counts.convertedToSales).toBe(1);
    expect(counts.averageFitScore).toBe(3);
  });
});

describe("getArtistNextAction", () => {
  it("frames the action around outreach once ready", () => {
    expect(getArtistNextAction(makeArtist({ status: "ready_for_outreach", artistName: "Coastal Lights" }), NOW)).toBe("Prepare outreach for Coastal Lights");
  });

  it("frames a watchlist revisit as overdue when overdue", () => {
    const artist = makeArtist({ status: "watchlist", artistName: "Aaron Wells", nextReviewAt: "2026-07-01T00:00:00.000Z" });
    expect(getArtistNextAction(artist, NOW)).toBe("Revisit Aaron Wells — watchlist review overdue");
  });

  it("frames a review around the latest release when one is on file", () => {
    const artist = makeArtist({ status: "discovered", artistName: "Emily Rose", latestReleaseTitle: "Golden Hour" });
    expect(getArtistNextAction(artist, NOW)).toBe("Review Emily Rose's latest release");
  });

  it("falls back to a plain review when there's no release on file", () => {
    const artist = makeArtist({ status: "reviewing", artistName: "New Artist" });
    expect(getArtistNextAction(artist, NOW)).toBe("Review New Artist");
  });
});

describe("outreach draft composition", () => {
  it("refuses to compose without a specific compliment", () => {
    const artist = makeArtist({ artistName: "Coastal Lights" });
    expect(canComposeOutreachDraft(artist, { specificCompliment: "" })).toBe(false);
    expect(composeOutreachDraft(artist, { specificCompliment: "   " })).toBeNull();
  });

  it("composes only from information actually entered, never inventing details", () => {
    const artist = makeArtist({ artistName: "Coastal Lights", latestReleaseTitle: "Midnight Drive" });
    const draft = composeOutreachDraft(artist, {
      specificCompliment: "the vocal layering in the bridge really stood out",
      whyGoodFit: "JMT specializes in dreamy, layered vocal production.",
      possibleService: "Could be a great fit for mixing and mastering.",
      tone: "warm"
    });
    expect(draft).toContain("Coastal Lights");
    expect(draft).toContain("Midnight Drive");
    expect(draft).toContain("the vocal layering in the bridge really stood out");
    expect(draft).toContain("JMT specializes in dreamy, layered vocal production.");
    expect(draft).toContain("Could be a great fit for mixing and mastering.");
  });

  it("omits the release line entirely when no release title is on file", () => {
    const artist = makeArtist({ artistName: "New Artist", latestReleaseTitle: null });
    const draft = composeOutreachDraft(artist, { specificCompliment: "your tone is really distinctive" });
    expect(draft).not.toBeNull();
    expect(draft).not.toContain("I've been listening to");
    expect(draft).toContain("your tone is really distinctive");
  });
});
