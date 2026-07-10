import { describe, expect, it } from "vitest";
import {
  GROWTH_ENGINE_TIMEZONE,
  getDisplayName,
  getZonedDateKey,
  isFollowUpDueToday,
  isFollowUpOverdue,
  selectByStage,
  selectDueTodayFollowUps,
  selectNewLeads,
  selectOverdueFollowUps,
  selectWaitingResponses,
  groupMessagesByClient
} from "./lead-pipeline";
import { STAGE_LABELS, STAGE_ORDER } from "./lead-display";
import type { Client, Communication, LeadStage } from "./types";

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: "client-1",
    propertyId: "property-1",
    artistName: "Test Artist",
    contactName: null,
    legacyName: null,
    email: null,
    phone: null,
    projectType: null,
    budget: null,
    platform: null,
    socialLinks: {},
    tags: [],
    stage: "new_lead",
    isArchived: false,
    nextFollowUpAt: null,
    notes: null,
    createdBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

function makeMessage(overrides: Partial<Communication> = {}): Communication {
  return {
    id: "msg-1",
    clientId: "client-1",
    propertyId: "property-1",
    projectId: null,
    direction: "outbound",
    type: "Email",
    platform: null,
    subject: null,
    body: "Hello",
    sentAt: new Date().toISOString(),
    source: "manual",
    createdBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

describe("stage labels and ordering", () => {
  it("has a label for every stage in STAGE_ORDER, and vice versa", () => {
    expect(STAGE_ORDER).toHaveLength(8);
    for (const stage of STAGE_ORDER) {
      expect(STAGE_LABELS[stage]).toBeTruthy();
    }
    expect(Object.keys(STAGE_LABELS)).toHaveLength(STAGE_ORDER.length);
  });

  it("orders the lifecycle from new_lead through repeat_client", () => {
    expect(STAGE_ORDER[0]).toBe("new_lead");
    expect(STAGE_ORDER[STAGE_ORDER.length - 1]).toBe("repeat_client");
    expect(STAGE_ORDER.indexOf("project")).toBeLessThan(STAGE_ORDER.indexOf("repeat_client"));
  });
});

describe("getDisplayName", () => {
  it("falls back to artistName when contactName is blank", () => {
    expect(getDisplayName({ artistName: "Solo Artist", contactName: null })).toBe("Solo Artist");
    expect(getDisplayName({ artistName: "Solo Artist", contactName: "" })).toBe("Solo Artist");
    expect(getDisplayName({ artistName: "Solo Artist", contactName: "   " })).toBe("Solo Artist");
  });

  it("uses contactName when present", () => {
    expect(getDisplayName({ artistName: "The Band", contactName: "Manager Jane" })).toBe("Manager Jane");
  });
});

describe("date-boundary behavior (isFollowUpDueToday / isFollowUpOverdue)", () => {
  const timeZone = GROWTH_ENGINE_TIMEZONE;

  it("treats a follow-up dated today, late in the day, as due today (not overdue) relative to an early-morning now", () => {
    const now = new Date("2026-07-10T06:00:00-05:00"); // 6am Chicago
    const followUp = new Date("2026-07-10T23:00:00-05:00"); // 11pm Chicago, same calendar day
    const client = { nextFollowUpAt: followUp.toISOString(), isArchived: false };
    expect(isFollowUpDueToday(client, now, timeZone)).toBe(true);
    expect(isFollowUpOverdue(client, now, timeZone)).toBe(false);
  });

  it("treats yesterday's follow-up as overdue, not due today", () => {
    const now = new Date("2026-07-10T12:00:00-05:00");
    const followUp = new Date("2026-07-09T23:59:00-05:00");
    const client = { nextFollowUpAt: followUp.toISOString(), isArchived: false };
    expect(isFollowUpOverdue(client, now, timeZone)).toBe(true);
    expect(isFollowUpDueToday(client, now, timeZone)).toBe(false);
  });

  it("treats a future follow-up as neither due today nor overdue", () => {
    const now = new Date("2026-07-10T12:00:00-05:00");
    const followUp = new Date("2026-07-11T09:00:00-05:00");
    const client = { nextFollowUpAt: followUp.toISOString(), isArchived: false };
    expect(isFollowUpDueToday(client, now, timeZone)).toBe(false);
    expect(isFollowUpOverdue(client, now, timeZone)).toBe(false);
  });

  it("never flags a client with no follow-up date set", () => {
    const now = new Date();
    const client = { nextFollowUpAt: null, isArchived: false };
    expect(isFollowUpDueToday(client, now)).toBe(false);
    expect(isFollowUpOverdue(client, now)).toBe(false);
  });

  it("getZonedDateKey is stable for the same calendar day across different times", () => {
    const morning = new Date("2026-07-10T06:00:00-05:00");
    const night = new Date("2026-07-10T23:30:00-05:00");
    expect(getZonedDateKey(morning, timeZone)).toBe(getZonedDateKey(night, timeZone));
  });

  it("a UTC date near midnight can fall on a different Chicago calendar day than its UTC date", () => {
    // 2026-07-11T02:00:00Z is still 2026-07-10 evening in America/Chicago (UTC-5 in July).
    const utcDate = new Date("2026-07-11T02:00:00Z");
    expect(getZonedDateKey(utcDate, "UTC")).toBe("2026-07-11");
    expect(getZonedDateKey(utcDate, "America/Chicago")).toBe("2026-07-10");
  });
});

describe("archived-record exclusion", () => {
  it("excludes archived leads from due-today and overdue follow-up selectors", () => {
    const now = new Date("2026-07-10T12:00:00-05:00");
    const archived = makeClient({ id: "a1", nextFollowUpAt: now.toISOString(), isArchived: true });
    expect(selectDueTodayFollowUps([archived], now)).toHaveLength(0);
    expect(selectOverdueFollowUps([archived], now)).toHaveLength(0);
  });

  it("excludes archived leads from selectNewLeads and selectByStage by default", () => {
    const now = new Date();
    const archived = makeClient({ id: "a1", isArchived: true, createdAt: now.toISOString(), stage: "new_lead" });
    expect(selectNewLeads([archived], now)).toHaveLength(0);
    expect(selectByStage([archived], "new_lead")).toHaveLength(0);
    expect(selectByStage([archived], "new_lead", true)).toHaveLength(1);
  });
});

describe("selectNewLeads", () => {
  it("includes leads created within the window and excludes older ones", () => {
    const now = new Date("2026-07-10T12:00:00Z");
    const recent = makeClient({ id: "recent", createdAt: new Date("2026-07-08T12:00:00Z").toISOString() });
    const old = makeClient({ id: "old", createdAt: new Date("2026-06-01T12:00:00Z").toISOString() });
    const result = selectNewLeads([recent, old], now, 7);
    expect(result.map((client) => client.id)).toEqual(["recent"]);
  });
});

describe("selectWaitingResponses", () => {
  it("flags a client whose latest message is outbound and past the threshold", () => {
    const now = new Date("2026-07-10T12:00:00Z");
    const client = makeClient({ id: "c1" });
    const messages = [makeMessage({ clientId: "c1", direction: "outbound", sentAt: new Date("2026-07-05T12:00:00Z").toISOString() })];
    const grouped = groupMessagesByClient(messages);
    expect(selectWaitingResponses([client], grouped, now, 3).map((c) => c.id)).toEqual(["c1"]);
  });

  it("does not flag a client whose latest message is inbound", () => {
    const now = new Date("2026-07-10T12:00:00Z");
    const client = makeClient({ id: "c1" });
    const messages = [
      makeMessage({ id: "m1", clientId: "c1", direction: "outbound", sentAt: new Date("2026-07-05T12:00:00Z").toISOString() }),
      makeMessage({ id: "m2", clientId: "c1", direction: "inbound", sentAt: new Date("2026-07-06T12:00:00Z").toISOString() })
    ];
    const grouped = groupMessagesByClient(messages);
    expect(selectWaitingResponses([client], grouped, now, 3)).toHaveLength(0);
  });

  it("does not flag an outbound message that hasn't crossed the threshold yet", () => {
    const now = new Date("2026-07-10T12:00:00Z");
    const client = makeClient({ id: "c1" });
    const messages = [makeMessage({ clientId: "c1", direction: "outbound", sentAt: new Date("2026-07-09T12:00:00Z").toISOString() })];
    const grouped = groupMessagesByClient(messages);
    expect(selectWaitingResponses([client], grouped, now, 3)).toHaveLength(0);
  });

  it("excludes archived clients even if otherwise waiting", () => {
    const now = new Date("2026-07-10T12:00:00Z");
    const client = makeClient({ id: "c1", isArchived: true });
    const messages = [makeMessage({ clientId: "c1", direction: "outbound", sentAt: new Date("2026-07-01T12:00:00Z").toISOString() })];
    expect(selectWaitingResponses([client], groupMessagesByClient(messages), now, 3)).toHaveLength(0);
  });
});
