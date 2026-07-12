import { describe, expect, it } from "vitest";
import {
  isValidUuid,
  validateAssetReference,
  validateCaption,
  validateContentType,
  validateCreateContentItemInput,
  validateHashtags,
  validateNotes,
  validateOptionalUuid,
  validatePlatformUrls,
  validatePlatforms,
  validatePriority,
  validateScheduledAt,
  validateTitle,
  validateUpdateContentItemInput
} from "./validation";

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

describe("isValidUuid / validateOptionalUuid", () => {
  it("accepts a well-formed UUID and rejects malformed shapes", () => {
    expect(isValidUuid(VALID_UUID)).toBe(true);
    expect(isValidUuid("not-a-uuid")).toBe(false);
    expect(isValidUuid("11111111-1111-1111-1111-111111111111")).toBe(false); // version nibble must be 1-8
  });

  it("treats absent as valid (optional) but present-and-malformed as an error", () => {
    expect(validateOptionalUuid(undefined, "Project id")).toBeNull();
    expect(validateOptionalUuid(null, "Project id")).toBeNull();
    expect(validateOptionalUuid("", "Project id")).toBeNull();
    expect(() => validateOptionalUuid("nope", "Project id")).toThrow();
    expect(validateOptionalUuid(VALID_UUID, "Project id")).toBe(VALID_UUID);
  });
});

describe("validateTitle", () => {
  it("requires non-empty text and trims it", () => {
    expect(validateTitle("  My Reel  ")).toBe("My Reel");
    expect(() => validateTitle("")).toThrow();
    expect(() => validateTitle("   ")).toThrow();
    expect(() => validateTitle(undefined)).toThrow();
  });

  it("rejects a title over the length limit", () => {
    expect(() => validateTitle("x".repeat(301))).toThrow();
  });
});

describe("validateContentType — invalid content types", () => {
  it("accepts every documented content type", () => {
    expect(validateContentType("piano_performance")).toBe("piano_performance");
    expect(validateContentType("other")).toBe("other");
  });

  it("accepts absent as null", () => {
    expect(validateContentType(undefined)).toBeNull();
    expect(validateContentType(null)).toBeNull();
  });

  it("rejects an unrecognized content type", () => {
    expect(() => validateContentType("marketing_fluff")).toThrow();
    expect(() => validateContentType(123)).toThrow();
  });
});

describe("validatePriority — invalid priorities", () => {
  it("defaults to normal when absent", () => {
    expect(validatePriority(undefined)).toBe("normal");
  });

  it("accepts every documented priority", () => {
    expect(validatePriority("low")).toBe("low");
    expect(validatePriority("high")).toBe("high");
    expect(validatePriority("urgent")).toBe("urgent");
  });

  it("rejects an unrecognized priority", () => {
    expect(() => validatePriority("critical")).toThrow();
    expect(() => validatePriority(5)).toThrow();
  });
});

describe("validatePlatforms — multiple platforms", () => {
  it("accepts several valid platforms at once", () => {
    expect(validatePlatforms(["instagram_reel", "youtube_short", "tiktok"])).toEqual(["instagram_reel", "youtube_short", "tiktok"]);
  });

  it("de-duplicates repeated platforms", () => {
    expect(validatePlatforms(["instagram_reel", "instagram_reel"])).toEqual(["instagram_reel"]);
  });

  it("defaults to an empty list when absent", () => {
    expect(validatePlatforms(undefined)).toEqual([]);
  });

  it("rejects a single unrecognized platform among otherwise-valid ones", () => {
    expect(() => validatePlatforms(["instagram_reel", "myspace"])).toThrow();
  });

  it("rejects a non-array value", () => {
    expect(() => validatePlatforms("instagram_reel")).toThrow();
  });
});

describe("validatePlatformUrls — malformed platform URLs", () => {
  it("accepts well-formed http/https URLs keyed by a recognized platform", () => {
    expect(validatePlatformUrls({ instagram_reel: "https://instagram.com/reel/abc" })).toEqual({
      instagram_reel: "https://instagram.com/reel/abc"
    });
  });

  it("defaults to an empty object when absent", () => {
    expect(validatePlatformUrls(undefined)).toEqual({});
  });

  it("rejects a malformed URL value", () => {
    expect(() => validatePlatformUrls({ instagram_reel: "not a url" })).toThrow();
  });

  it("rejects a non-http(s) URL scheme", () => {
    expect(() => validatePlatformUrls({ website: "ftp://example.com/file" })).toThrow();
  });

  it("rejects an unrecognized platform key", () => {
    expect(() => validatePlatformUrls({ myspace: "https://myspace.com/profile" })).toThrow();
  });

  it("rejects a non-object value", () => {
    expect(() => validatePlatformUrls(["https://example.com"])).toThrow();
  });
});

describe("validateNotes / validateCaption / validateHashtags", () => {
  it("treats blank as null and trims real content", () => {
    expect(validateNotes("")).toBeNull();
    expect(validateNotes("  some notes  ")).toBe("some notes");
    expect(validateCaption(undefined)).toBeNull();
  });

  it("accepts a list of hashtags and trims each one", () => {
    expect(validateHashtags([" #beats ", "trap"])).toEqual(["#beats", "trap"]);
  });

  it("rejects an empty-string hashtag and a non-array value", () => {
    expect(() => validateHashtags(["", "trap"])).toThrow();
    expect(() => validateHashtags("trap")).toThrow();
  });
});

describe("validateScheduledAt", () => {
  it("accepts a valid date and normalizes it to ISO", () => {
    expect(validateScheduledAt("2026-08-01T12:00:00.000Z")).toBe("2026-08-01T12:00:00.000Z");
  });

  it("treats absent as null and rejects an unparseable date", () => {
    expect(validateScheduledAt(undefined)).toBeNull();
    expect(() => validateScheduledAt("not-a-date")).toThrow();
  });
});

describe("validateAssetReference", () => {
  it("accepts a non-URL path reference — Milestone 1 assets are not strict URLs", () => {
    expect(validateAssetReference("/Volumes/Footage/session-12/clip.mov", "Video reference")).toBe(
      "/Volumes/Footage/session-12/clip.mov"
    );
  });

  it("treats absent as null", () => {
    expect(validateAssetReference(undefined, "Video reference")).toBeNull();
  });
});

describe("validateCreateContentItemInput", () => {
  it("normalizes a minimal valid input and defaults every optional field", () => {
    const value = validateCreateContentItemInput({ title: "New idea" });
    expect(value.title).toBe("New idea");
    expect(value.priority).toBe("normal");
    expect(value.platforms).toEqual([]);
    expect(value.contentType).toBeNull();
    expect(value.projectId).toBeNull();
    expect(value.clientId).toBeNull();
    expect(value.beatId).toBeNull();
    expect(value.hashtags).toEqual([]);
  });

  it("rejects input with no title at all", () => {
    expect(() => validateCreateContentItemInput({})).toThrow();
  });

  it("carries through valid optional relationships and asset fields", () => {
    const value = validateCreateContentItemInput({
      title: "Beat preview",
      contentType: "beat_showcase",
      priority: "high",
      platforms: ["instagram_reel", "youtube_short"],
      projectId: VALID_UUID,
      assetVideoReady: true,
      assetVideoUrl: "/local/path.mov",
      caption: "New beat dropping soon",
      hashtags: ["beats", "producer"]
    });
    expect(value.contentType).toBe("beat_showcase");
    expect(value.priority).toBe("high");
    expect(value.platforms).toEqual(["instagram_reel", "youtube_short"]);
    expect(value.projectId).toBe(VALID_UUID);
    expect(value.assetVideoReady).toBe(true);
    expect(value.assetVideoUrl).toBe("/local/path.mov");
    expect(value.caption).toBe("New beat dropping soon");
    expect(value.hashtags).toEqual(["beats", "producer"]);
  });
});

describe("validateUpdateContentItemInput — protected field rejection", () => {
  it("only includes keys actually present on the input", () => {
    const value = validateUpdateContentItemInput({ title: "Renamed" });
    expect(value).toEqual({ title: "Renamed" });
  });

  it("never reads status or publishedAt, even when present on the raw input", () => {
    const value = validateUpdateContentItemInput({
      title: "Renamed",
      status: "published",
      publishedAt: "2020-01-01T00:00:00.000Z"
    } as Record<string, unknown>);
    expect(value).not.toHaveProperty("status");
    expect(value).not.toHaveProperty("publishedAt");
    expect(Object.keys(value)).toEqual(["title"]);
  });

  it("returns an empty object for an empty input rather than defaulting every field", () => {
    expect(validateUpdateContentItemInput({})).toEqual({});
  });
});
