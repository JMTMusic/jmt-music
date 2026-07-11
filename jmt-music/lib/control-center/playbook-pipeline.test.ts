import { describe, expect, it } from "vitest";
import { groupPlaysByCategory, searchPlays, selectByStatus, selectFavorites, withPlayNumbers } from "./playbook-pipeline";
import { CATEGORY_LABELS } from "./playbook-display";
import type { Play } from "./types";

function makePlay(overrides: Partial<Play> = {}): Play {
  return {
    id: "play-1",
    propertyId: "property-1",
    category: "outreach",
    title: "Test Play",
    purpose: "Testing purpose",
    bestUsedFor: ["Email"],
    messageBody: "Hello there",
    variables: [],
    internalNotes: null,
    versionNumber: 1,
    status: "active",
    isFavorite: false,
    tags: [],
    sortOrder: 0,
    createdBy: null,
    createdAt: new Date("2026-01-01T00:00:00Z").toISOString(),
    updatedAt: new Date("2026-01-01T00:00:00Z").toISOString(),
    ...overrides
  };
}

describe("withPlayNumbers", () => {
  it("assigns dense, zero-padded numbers in createdAt order regardless of input order", () => {
    const plays = [
      makePlay({ id: "c", createdAt: "2026-01-03T00:00:00Z" }),
      makePlay({ id: "a", createdAt: "2026-01-01T00:00:00Z" }),
      makePlay({ id: "b", createdAt: "2026-01-02T00:00:00Z" })
    ];
    const numbered = withPlayNumbers(plays);
    const byId = Object.fromEntries(numbered.map((play) => [play.id, play.playNumber]));
    expect(byId.a).toBe("Play 001");
    expect(byId.b).toBe("Play 002");
    expect(byId.c).toBe("Play 003");
  });

  it("stays dense even when the input list is a filtered subset", () => {
    const plays = [makePlay({ id: "x", createdAt: "2026-02-01T00:00:00Z" }), makePlay({ id: "y", createdAt: "2026-02-02T00:00:00Z" })];
    const numbered = withPlayNumbers(plays);
    expect(numbered.map((play) => play.playNumber)).toEqual(["Play 001", "Play 002"]);
  });
});

describe("groupPlaysByCategory", () => {
  it("groups by category while preserving input order within each group", () => {
    const plays = [
      makePlay({ id: "1", category: "outreach", title: "First" }),
      makePlay({ id: "2", category: "follow_up", title: "Second" }),
      makePlay({ id: "3", category: "outreach", title: "Third" })
    ];
    const grouped = groupPlaysByCategory(plays);
    expect(grouped.get("outreach")?.map((play) => play.title)).toEqual(["First", "Third"]);
    expect(grouped.get("follow_up")?.map((play) => play.title)).toEqual(["Second"]);
  });
});

describe("selectFavorites / selectByStatus", () => {
  it("filters favorites and status independently", () => {
    const plays = [
      makePlay({ id: "1", isFavorite: true, status: "active" }),
      makePlay({ id: "2", isFavorite: false, status: "draft" }),
      makePlay({ id: "3", isFavorite: true, status: "archived" })
    ];
    expect(selectFavorites(plays).map((play) => play.id)).toEqual(["1", "3"]);
    expect(selectByStatus(plays, "draft").map((play) => play.id)).toEqual(["2"]);
  });
});

describe("searchPlays", () => {
  const plays = [
    makePlay({ id: "1", title: "Artist Introduction & Connection", category: "outreach", messageBody: "Hi Artist, I enjoyed your music" }),
    makePlay({ id: "2", title: "Delivery Wrap-up", category: "delivery", tags: ["final export"], messageBody: "Here are your final files" }),
    makePlay({ id: "3", title: "Follow-up Check-in", category: "follow_up", messageBody: "Just checking in" })
  ];

  it("returns everything when the query is blank", () => {
    expect(searchPlays(plays, "", CATEGORY_LABELS)).toHaveLength(3);
    expect(searchPlays(plays, "   ", CATEGORY_LABELS)).toHaveLength(3);
  });

  it("matches by title, case-insensitively", () => {
    expect(searchPlays(plays, "introduction", CATEGORY_LABELS).map((p) => p.id)).toEqual(["1"]);
  });

  it("matches by category label, not just the raw stored value", () => {
    expect(searchPlays(plays, "follow-up", CATEGORY_LABELS).map((p) => p.id)).toEqual(["3"]);
  });

  it("matches by keyword tags", () => {
    expect(searchPlays(plays, "final export", CATEGORY_LABELS).map((p) => p.id)).toEqual(["2"]);
  });

  it("matches by message body contents", () => {
    expect(searchPlays(plays, "checking in", CATEGORY_LABELS).map((p) => p.id)).toEqual(["3"]);
  });
});
