import { describe, expect, it } from "vitest";
import {
  isValidUuid,
  validateArtistEmail,
  validateArtistName,
  validateBudgetAmount,
  validateCurrency,
  validateDeadline,
  validateFollowUpAt,
  validateOptionalUuid,
  validatePlatform,
  validateProbability,
  validateProposalSentAt,
  validateServiceType,
  validateTitle
} from "./validation";

describe("date anchoring for bare 'YYYY-MM-DD' input", () => {
  it("anchors a date-only follow-up to noon UTC, not UTC midnight", () => {
    // Regression: UTC midnight for 2026-07-16 is 2026-07-15 19:00 in America/Chicago (the
    // timezone every "due today"/"overdue" comparison in this app uses) — silently shifting
    // a follow-up back a full calendar day from what the caller picked in the date input.
    const result = validateFollowUpAt("2026-07-16");
    expect(result).toBe("2026-07-16T12:00:00.000Z");
  });

  it("anchors a date-only proposal-sent date the same way", () => {
    expect(validateProposalSentAt("2026-07-12")).toBe("2026-07-12T12:00:00.000Z");
  });

  it("parses a full datetime string as-is, without re-anchoring", () => {
    expect(validateFollowUpAt("2026-07-16T09:30:00.000Z")).toBe("2026-07-16T09:30:00.000Z");
  });

  it("rejects an invalid date", () => {
    expect(() => validateFollowUpAt("not-a-date")).toThrow();
  });

  it("returns null for blank/absent input", () => {
    expect(validateFollowUpAt(undefined)).toBeNull();
    expect(validateFollowUpAt(null)).toBeNull();
    expect(validateFollowUpAt("")).toBeNull();
  });
});

describe("validateDeadline", () => {
  it("accepts a plain YYYY-MM-DD date and stores it unmodified (no timestamp conversion)", () => {
    expect(validateDeadline("2026-08-01")).toBe("2026-08-01");
  });

  it("rejects a non-date string", () => {
    expect(() => validateDeadline("August 1st")).toThrow();
  });
});

describe("required identity fields", () => {
  it("validateTitle rejects blank and trims whitespace", () => {
    expect(() => validateTitle("")).toThrow();
    expect(() => validateTitle("   ")).toThrow();
    expect(validateTitle("  Ambient Pop Mix  ")).toBe("Ambient Pop Mix");
  });

  it("validateArtistName rejects blank", () => {
    expect(() => validateArtistName("")).toThrow();
    expect(validateArtistName("Unknown Artist")).toBe("Unknown Artist");
  });

  it("validateArtistEmail accepts a valid email, rejects a malformed one, allows blank", () => {
    expect(validateArtistEmail(null)).toBeNull();
    expect(validateArtistEmail("artist@example.com")).toBe("artist@example.com");
    expect(() => validateArtistEmail("not-an-email")).toThrow();
  });
});

describe("bounded value lists", () => {
  it("validatePlatform accepts a known value, rejects an unknown one", () => {
    expect(validatePlatform("airgigs")).toBe("airgigs");
    expect(() => validatePlatform("craigslist")).toThrow();
  });

  it("validateServiceType accepts a known value, rejects an unknown one", () => {
    expect(validateServiceType("production_mix_master")).toBe("production_mix_master");
    expect(() => validateServiceType("songwriting")).toThrow();
  });

  it("validateProbability defaults to medium, accepts low/medium/high, rejects anything else", () => {
    expect(validateProbability(undefined)).toBe("medium");
    expect(validateProbability("high")).toBe("high");
    expect(() => validateProbability("certain")).toThrow();
  });
});

describe("budget and currency", () => {
  it("validateBudgetAmount accepts a positive number, rounds to cents, rejects negative", () => {
    expect(validateBudgetAmount(100)).toBe(100);
    expect(validateBudgetAmount("249.999")).toBe(250);
    expect(() => validateBudgetAmount(-5)).toThrow();
  });

  it("validateBudgetAmount returns null for blank", () => {
    expect(validateBudgetAmount(null)).toBeNull();
    expect(validateBudgetAmount("")).toBeNull();
  });

  it("validateCurrency defaults to USD and normalizes case", () => {
    expect(validateCurrency(undefined)).toBe("USD");
    expect(validateCurrency("usd")).toBe("USD");
    expect(() => validateCurrency("US Dollars")).toThrow();
  });
});

describe("uuid helpers", () => {
  it("isValidUuid / validateOptionalUuid accept a well-formed uuid and reject a malformed one", () => {
    const uuid = "8b3c1e2a-1f4d-4c9a-9b2e-2a1c3d4e5f6a";
    expect(isValidUuid(uuid)).toBe(true);
    expect(validateOptionalUuid(uuid, "Client id")).toBe(uuid);
    expect(validateOptionalUuid(null, "Client id")).toBeNull();
    expect(() => validateOptionalUuid("not-a-uuid", "Client id")).toThrow();
  });
});
