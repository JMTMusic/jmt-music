import { describe, expect, it } from "vitest";
import {
  computeOpenPipelineValue,
  computeSalesOverviewCounts,
  getOpportunityNextAction,
  isFollowUpDueToday,
  isFollowUpOverdue,
  isOpenStatus,
  isTerminalStatus,
  selectActiveConversations,
  selectByStatus,
  selectConverted,
  selectDueForFollowUp,
  selectFollowUpsOverdue,
  selectFollowUpsToday,
  selectOpen,
  selectProposalsSentWithinDays,
  selectWaitingForResponse,
  selectWonWithinDays
} from "./pipeline";
import type { SalesOpportunityRecord, SalesStatus } from "./types";

function makeOpportunity(overrides: Partial<SalesOpportunityRecord> = {}): SalesOpportunityRecord {
  return {
    id: "opp-1",
    propertyId: "property-1",
    title: "Test Opportunity",
    artistName: "Test Artist",
    artistEmail: null,
    clientId: null,
    platform: "airgigs",
    serviceType: "production_mix_master",
    genre: null,
    budgetAmount: null,
    currency: "USD",
    status: "new_lead",
    probability: "medium",
    proposalSentAt: null,
    followUpAt: null,
    deadline: null,
    sourceUrl: null,
    musicUrl: null,
    notes: null,
    proposalText: null,
    buyerInstructions: null,
    turnaroundDays: null,
    revisionCount: null,
    sampleTitle: null,
    sampleDescription: null,
    sampleUrl: null,
    lostReason: null,
    convertedProjectId: null,
    convertedClientId: null,
    createdBy: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides
  };
}

const NOW = new Date("2026-07-12T18:00:00.000Z");

describe("terminal/open status", () => {
  it("won, lost, and converted are terminal; everything else is open", () => {
    const statuses: SalesStatus[] = ["new_lead", "conversation", "proposal_draft", "proposal_sent", "waiting", "negotiating", "won", "lost", "converted"];
    for (const status of statuses) {
      const expectedTerminal = status === "won" || status === "lost" || status === "converted";
      expect(isTerminalStatus(status)).toBe(expectedTerminal);
      expect(isOpenStatus(status)).toBe(!expectedTerminal);
    }
  });
});

describe("selectByStatus / selectOpen / selectConverted", () => {
  const opportunities = [
    makeOpportunity({ id: "a", status: "new_lead" }),
    makeOpportunity({ id: "b", status: "won" }),
    makeOpportunity({ id: "c", status: "converted" }),
    makeOpportunity({ id: "d", status: "lost" })
  ];

  it("selectByStatus filters to exactly one status", () => {
    expect(selectByStatus(opportunities, "won").map((o) => o.id)).toEqual(["b"]);
  });

  it("selectOpen excludes won/lost/converted", () => {
    expect(selectOpen(opportunities).map((o) => o.id)).toEqual(["a"]);
  });

  it("selectConverted returns only converted opportunities", () => {
    expect(selectConverted(opportunities).map((o) => o.id)).toEqual(["c"]);
  });
});

describe("follow-up due/overdue", () => {
  it("is due today for a same-calendar-day follow_up_at in the configured timezone", () => {
    const opportunity = makeOpportunity({ followUpAt: "2026-07-12T23:00:00.000Z", status: "proposal_sent" });
    expect(isFollowUpDueToday(opportunity, NOW)).toBe(true);
    expect(isFollowUpOverdue(opportunity, NOW)).toBe(false);
  });

  it("is overdue for a follow_up_at strictly before today", () => {
    const opportunity = makeOpportunity({ followUpAt: "2026-07-10T12:00:00.000Z", status: "waiting" });
    expect(isFollowUpOverdue(opportunity, NOW)).toBe(true);
    expect(isFollowUpDueToday(opportunity, NOW)).toBe(false);
  });

  it("is neither due nor overdue for a future follow_up_at", () => {
    const opportunity = makeOpportunity({ followUpAt: "2026-07-20T12:00:00.000Z" });
    expect(isFollowUpDueToday(opportunity, NOW)).toBe(false);
    expect(isFollowUpOverdue(opportunity, NOW)).toBe(false);
  });

  it("never counts a terminal-status opportunity as due or overdue, even with a stale follow_up_at", () => {
    const won = makeOpportunity({ followUpAt: "2026-07-01T12:00:00.000Z", status: "won" });
    const lost = makeOpportunity({ followUpAt: "2026-07-12T12:00:00.000Z", status: "lost" });
    const converted = makeOpportunity({ followUpAt: "2026-07-12T12:00:00.000Z", status: "converted" });
    for (const opportunity of [won, lost, converted]) {
      expect(isFollowUpDueToday(opportunity, NOW)).toBe(false);
      expect(isFollowUpOverdue(opportunity, NOW)).toBe(false);
    }
  });

  it("selectDueForFollowUp combines today and overdue, excludes future and terminal", () => {
    const opportunities = [
      makeOpportunity({ id: "today", followUpAt: "2026-07-12T08:00:00.000Z", status: "proposal_sent" }),
      makeOpportunity({ id: "overdue", followUpAt: "2026-07-05T08:00:00.000Z", status: "negotiating" }),
      makeOpportunity({ id: "future", followUpAt: "2026-07-20T08:00:00.000Z", status: "waiting" }),
      makeOpportunity({ id: "won-stale", followUpAt: "2026-07-01T08:00:00.000Z", status: "won" }),
      makeOpportunity({ id: "none" })
    ];
    expect(selectDueForFollowUp(opportunities, NOW).map((o) => o.id).sort()).toEqual(["overdue", "today"]);
    expect(selectFollowUpsToday(opportunities, NOW).map((o) => o.id)).toEqual(["today"]);
    expect(selectFollowUpsOverdue(opportunities, NOW).map((o) => o.id)).toEqual(["overdue"]);
  });
});

describe("waiting / active conversation selectors", () => {
  it("selectWaitingForResponse returns only 'waiting' status", () => {
    const opportunities = [makeOpportunity({ id: "a", status: "waiting" }), makeOpportunity({ id: "b", status: "proposal_sent" })];
    expect(selectWaitingForResponse(opportunities).map((o) => o.id)).toEqual(["a"]);
  });

  it("selectActiveConversations returns only 'conversation' status", () => {
    const opportunities = [makeOpportunity({ id: "a", status: "conversation" }), makeOpportunity({ id: "b", status: "new_lead" })];
    expect(selectActiveConversations(opportunities).map((o) => o.id)).toEqual(["a"]);
  });
});

describe("proposals sent / won within a rolling window", () => {
  it("selectProposalsSentWithinDays only includes proposals sent inside the window, regardless of current status", () => {
    const opportunities = [
      makeOpportunity({ id: "recent", proposalSentAt: "2026-07-05T00:00:00.000Z", status: "negotiating" }),
      makeOpportunity({ id: "old", proposalSentAt: "2026-05-01T00:00:00.000Z" }),
      makeOpportunity({ id: "none", proposalSentAt: null })
    ];
    expect(selectProposalsSentWithinDays(opportunities, 30, NOW).map((o) => o.id)).toEqual(["recent"]);
  });

  it("selectWonWithinDays uses updatedAt on 'won' opportunities as an approximation", () => {
    const opportunities = [
      makeOpportunity({ id: "recent-won", status: "won", updatedAt: "2026-07-06T00:00:00.000Z" }),
      makeOpportunity({ id: "old-won", status: "won", updatedAt: "2026-05-01T00:00:00.000Z" }),
      makeOpportunity({ id: "recent-lost", status: "lost", updatedAt: "2026-07-06T00:00:00.000Z" })
    ];
    expect(selectWonWithinDays(opportunities, 30, NOW).map((o) => o.id)).toEqual(["recent-won"]);
  });
});

describe("computeOpenPipelineValue", () => {
  it("sums budgetAmount across open opportunities only, treating null as 0", () => {
    const opportunities = [
      makeOpportunity({ id: "a", status: "new_lead", budgetAmount: 100 }),
      makeOpportunity({ id: "b", status: "negotiating", budgetAmount: 250 }),
      makeOpportunity({ id: "c", status: "negotiating", budgetAmount: null }),
      makeOpportunity({ id: "d", status: "won", budgetAmount: 500 })
    ];
    expect(computeOpenPipelineValue(opportunities)).toBe(350);
  });
});

describe("computeSalesOverviewCounts", () => {
  it("aggregates every bucket in one pass", () => {
    const opportunities = [
      makeOpportunity({ id: "a", status: "waiting" }),
      makeOpportunity({ id: "b", status: "conversation" }),
      makeOpportunity({ id: "c", status: "proposal_sent", proposalSentAt: "2026-07-05T00:00:00.000Z", budgetAmount: 100 }),
      makeOpportunity({ id: "d", status: "won", updatedAt: "2026-07-08T00:00:00.000Z" }),
      makeOpportunity({ id: "e", followUpAt: "2026-07-12T08:00:00.000Z", status: "negotiating", budgetAmount: 200 })
    ];
    const counts = computeSalesOverviewCounts(opportunities, NOW);
    expect(counts.followUpsToday).toBe(1);
    expect(counts.waitingForResponse).toBe(1);
    expect(counts.activeConversations).toBe(1);
    expect(counts.proposalsSentLast30Days).toBe(1);
    expect(counts.wonLast30Days).toBe(1);
    expect(counts.openPipelineValue).toBe(300);
  });
});

describe("getOpportunityNextAction", () => {
  it("frames the action around the proposal once one is out", () => {
    const opportunity = makeOpportunity({ status: "proposal_sent", platform: "airgigs", title: "Ambient Pop Mix" });
    expect(getOpportunityNextAction(opportunity)).toBe("Follow up on AirGigs proposal for Ambient Pop Mix");
  });

  it("frames the action around the artist before a proposal exists", () => {
    const opportunity = makeOpportunity({ status: "new_lead", artistName: "Jane Doe", title: "EP Mixing" });
    expect(getOpportunityNextAction(opportunity)).toBe("Follow up with Jane Doe about EP Mixing");
  });
});
