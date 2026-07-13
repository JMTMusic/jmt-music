import { describe, expect, it } from "vitest";
import {
  isValidUuid,
  validateArtistName,
  validateCreateArArtistInput,
  validateEmail,
  validateFitCategoryScore,
  validateFitScoreOverride,
  validateFollowerCount,
  validateLastActivityAt,
  validateLatestReleaseDate,
  validateNextReviewAt,
  validatePriority,
  validateProfileUrl,
  validateUpdateArArtistInput
} from "./validation";

describe("validateArtistName", () => {
  it("trims and requires a non-empty name", () => {
    expect(validateArtistName("  Coastal Lights  ")).toBe("Coastal Lights");
    expect(() => validateArtistName("")).toThrow();
    expect(() => validateArtistName("   ")).toThrow();
  });

  it("rejects a name over the max length", () => {
    expect(() => validateArtistName("a".repeat(161))).toThrow();
  });
});

describe("validatePriority", () => {
  it("defaults to medium when blank", () => {
    expect(validatePriority(undefined)).toBe("medium");
    expect(validatePriority("")).toBe("medium");
  });

  it("accepts low/medium/high and rejects anything else", () => {
    expect(validatePriority("high")).toBe("high");
    expect(() => validatePriority("urgent")).toThrow();
  });
});

describe("validateEmail", () => {
  it("allows blank and validates a real address", () => {
    expect(validateEmail(undefined)).toBeNull();
    expect(validateEmail("artist@example.com")).toBe("artist@example.com");
    expect(() => validateEmail("not-an-email")).toThrow();
  });
});

describe("validateProfileUrl (platform URL validation)", () => {
  it("allows blank and requires http(s)", () => {
    expect(validateProfileUrl(undefined)).toBeNull();
    expect(validateProfileUrl("https://instagram.com/artist")).toBe("https://instagram.com/artist");
    expect(() => validateProfileUrl("not a url")).toThrow();
    expect(() => validateProfileUrl("ftp://example.com")).toThrow();
  });
});

describe("validateFollowerCount (numeric metric validation)", () => {
  it("allows blank and requires a non-negative whole number", () => {
    expect(validateFollowerCount(undefined)).toBeNull();
    expect(validateFollowerCount("12000")).toBe(12000);
    expect(() => validateFollowerCount(-5)).toThrow();
    expect(() => validateFollowerCount(4.5)).toThrow();
  });
});

describe("validateFitCategoryScore", () => {
  it("allows blank for an unreviewed category", () => {
    expect(validateFitCategoryScore(undefined, "Genre")).toBeNull();
    expect(validateFitCategoryScore("", "Genre")).toBeNull();
  });

  it("accepts an integer 1-5 and rejects anything outside that range", () => {
    expect(validateFitCategoryScore(3, "Genre")).toBe(3);
    expect(validateFitCategoryScore("5", "Genre")).toBe(5);
    expect(() => validateFitCategoryScore(0, "Genre")).toThrow();
    expect(() => validateFitCategoryScore(6, "Genre")).toThrow();
    expect(() => validateFitCategoryScore(3.5, "Genre")).toThrow();
  });
});

describe("validateFitScoreOverride", () => {
  it("allows blank and accepts one decimal place within 1-5", () => {
    expect(validateFitScoreOverride(undefined)).toBeNull();
    expect(validateFitScoreOverride(4.3)).toBe(4.3);
    expect(validateFitScoreOverride("4.25")).toBe(4.3);
    expect(() => validateFitScoreOverride(0.5)).toThrow();
    expect(() => validateFitScoreOverride(5.5)).toThrow();
  });
});

describe("bare-date handling (noon UTC anchoring)", () => {
  it("anchors a bare YYYY-MM-DD date to noon UTC so it lands on the correct America/Chicago calendar day", () => {
    const result = validateNextReviewAt("2026-07-16");
    expect(result).toBe("2026-07-16T12:00:00.000Z");
  });

  it("passes through a full datetime string as-is", () => {
    const result = validateLastActivityAt("2026-07-16T08:30:00.000Z");
    expect(new Date(result!).toISOString()).toBe("2026-07-16T08:30:00.000Z");
  });

  it("rejects an invalid date string", () => {
    expect(() => validateNextReviewAt("not-a-date")).toThrow();
  });

  it("validateLatestReleaseDate stores a plain date with no time component", () => {
    expect(validateLatestReleaseDate("2026-07-16")).toBe("2026-07-16");
    expect(() => validateLatestReleaseDate("07/16/2026")).toThrow();
  });
});

describe("isValidUuid", () => {
  it("recognizes a well-formed v4-style uuid and rejects everything else", () => {
    expect(isValidUuid("3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(true);
    expect(isValidUuid("not-a-uuid")).toBe(false);
    expect(isValidUuid(123)).toBe(false);
  });
});

describe("validateCreateArArtistInput", () => {
  it("requires at least a primary platform or a discovery source", () => {
    expect(() => validateCreateArArtistInput({ artistName: "Test Artist" })).toThrow(/platform or a discovery source/);
  });

  it("accepts the minimum fast-entry shape: name + primary platform only", () => {
    const input = validateCreateArArtistInput({ artistName: "Test Artist", primaryPlatform: "instagram" });
    expect(input.artistName).toBe("Test Artist");
    expect(input.primaryPlatform).toBe("instagram");
    expect(input.discoverySource).toBeNull();
  });

  it("accepts discovery source alone, without a primary platform", () => {
    const input = validateCreateArArtistInput({ artistName: "Test Artist", discoverySource: "referral" });
    expect(input.primaryPlatform).toBeNull();
    expect(input.discoverySource).toBe("referral");
  });

  it("never surfaces status or relatedSalesOpportunityId even if smuggled in the raw payload", () => {
    const input = validateCreateArArtistInput({
      artistName: "Test Artist",
      primaryPlatform: "instagram",
      status: "converted",
      relatedSalesOpportunityId: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
    }) as Record<string, unknown>;
    expect(input.status).toBeUndefined();
    expect(input.relatedSalesOpportunityId).toBeUndefined();
  });
});

describe("validateUpdateArArtistInput — status protection", () => {
  it("never reads status or relatedSalesOpportunityId, even when present in the raw payload", () => {
    const result = validateUpdateArArtistInput({
      artistName: "Renamed Artist",
      status: "converted",
      relatedSalesOpportunityId: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
    }) as Record<string, unknown>;
    expect(result.artistName).toBe("Renamed Artist");
    expect(result.status).toBeUndefined();
    expect(result.relatedSalesOpportunityId).toBeUndefined();
  });

  it("only includes keys actually present on the input", () => {
    const result = validateUpdateArArtistInput({ genre: "Indie Pop" });
    expect(Object.keys(result)).toEqual(["genre"]);
  });

  it("passes through clearFitScoreOverride as a boolean", () => {
    const result = validateUpdateArArtistInput({ clearFitScoreOverride: true });
    expect(result.clearFitScoreOverride).toBe(true);
  });
});
