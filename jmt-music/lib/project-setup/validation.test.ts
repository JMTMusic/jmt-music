import { describe, expect, it } from "vitest";
import {
  MAX_RESPONSES_JSON_LENGTH,
  validateCompletedBy,
  validateOptionalDiscoveryId,
  validateProjectId,
  validateResponses
} from "./validation";

const validUuid = "019535d9-1b4c-7abc-8def-123456789abc";

describe("validateProjectId", () => {
  it("accepts a well-formed uuid", () => {
    expect(validateProjectId(validUuid)).toBe(validUuid);
  });

  it("rejects missing, malformed, or non-string project ids", () => {
    expect(() => validateProjectId(undefined)).toThrow();
    expect(() => validateProjectId("not-a-uuid")).toThrow();
    expect(() => validateProjectId(12345)).toThrow();
    expect(() => validateProjectId(null)).toThrow();
  });
});

describe("validateOptionalDiscoveryId", () => {
  it("treats missing/empty as no discovery, without throwing", () => {
    expect(validateOptionalDiscoveryId(undefined)).toBeNull();
    expect(validateOptionalDiscoveryId(null)).toBeNull();
    expect(validateOptionalDiscoveryId("")).toBeNull();
  });

  it("accepts a well-formed uuid when provided", () => {
    expect(validateOptionalDiscoveryId(validUuid)).toBe(validUuid);
  });

  it("rejects a malformed id when one is actually provided", () => {
    expect(() => validateOptionalDiscoveryId("not-a-uuid")).toThrow();
  });
});

describe("validateCompletedBy", () => {
  it("accepts only the allowed values", () => {
    expect(validateCompletedBy("client")).toBe("client");
    expect(validateCompletedBy("jonathan")).toBe("jonathan");
  });

  it("rejects anything outside the allow-list", () => {
    expect(() => validateCompletedBy("admin")).toThrow();
    expect(() => validateCompletedBy("")).toThrow();
    expect(() => validateCompletedBy(null)).toThrow();
    expect(() => validateCompletedBy(1)).toThrow();
  });
});

describe("validateResponses", () => {
  it("accepts a plain object", () => {
    expect(validateResponses({ timeline: "Flexible", notes: "Loves reverb" })).toEqual({
      timeline: "Flexible",
      notes: "Loves reverb"
    });
  });

  it("accepts an empty object", () => {
    expect(validateResponses({})).toEqual({});
  });

  it("rejects arrays, null, primitives", () => {
    expect(() => validateResponses([])).toThrow();
    expect(() => validateResponses(null)).toThrow();
    expect(() => validateResponses("a string")).toThrow();
    expect(() => validateResponses(42)).toThrow();
    expect(() => validateResponses(undefined)).toThrow();
  });

  it("rejects a payload over the size cap", () => {
    const huge = { blob: "x".repeat(MAX_RESPONSES_JSON_LENGTH) };
    expect(() => validateResponses(huge)).toThrow();
  });

  it("passes arbitrary keys through unchanged — protection against a fake status/timestamp lives in the repository layer, not here", () => {
    // saveProjectSetupDraft only ever writes this return value into the `responses`
    // jsonb column, never into the table's actual status/timestamp columns — so a key
    // that happens to be named "status" here is inert, just ordinary questionnaire data.
    const result = validateResponses({ status: "confirmed", confirmed_at: "2026-01-01" });
    expect(result).toEqual({ status: "confirmed", confirmed_at: "2026-01-01" });
  });
});
