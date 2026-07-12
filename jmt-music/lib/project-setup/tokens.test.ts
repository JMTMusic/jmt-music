import { describe, expect, it } from "vitest";
import { generateRawToken, hashRawToken, isPlausibleRawToken, RAW_TOKEN_LENGTH } from "./tokens";

describe("generateRawToken", () => {
  it("produces a base64url string of the expected length", () => {
    const token = generateRawToken();
    expect(token).toHaveLength(RAW_TOKEN_LENGTH);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("never repeats across many calls (cryptographically random, not a predictable id)", () => {
    const tokens = new Set(Array.from({ length: 500 }, () => generateRawToken()));
    expect(tokens.size).toBe(500);
  });

  it("does not look like a UUID or a sequential id", () => {
    const token = generateRawToken();
    expect(token).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/i);
  });
});

describe("hashRawToken", () => {
  it("is deterministic for the same input", () => {
    const token = generateRawToken();
    expect(hashRawToken(token)).toBe(hashRawToken(token));
  });

  it("produces a 64-character hex SHA-256 digest", () => {
    const digest = hashRawToken("fixed-test-input");
    expect(digest).toHaveLength(64);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different hashes for different tokens", () => {
    expect(hashRawToken(generateRawToken())).not.toBe(hashRawToken(generateRawToken()));
  });

  it("never returns the raw input itself (the hash is not the token)", () => {
    const token = generateRawToken();
    expect(hashRawToken(token)).not.toBe(token);
  });
});

describe("isPlausibleRawToken", () => {
  it("accepts a freshly generated token", () => {
    expect(isPlausibleRawToken(generateRawToken())).toBe(true);
  });

  it("rejects wrong length, wrong charset, and non-strings", () => {
    expect(isPlausibleRawToken("too-short")).toBe(false);
    expect(isPlausibleRawToken("a".repeat(RAW_TOKEN_LENGTH - 1))).toBe(false);
    expect(isPlausibleRawToken("a".repeat(RAW_TOKEN_LENGTH + 1))).toBe(false);
    expect(isPlausibleRawToken("!".repeat(RAW_TOKEN_LENGTH))).toBe(false);
    expect(isPlausibleRawToken(12345)).toBe(false);
    expect(isPlausibleRawToken(null)).toBe(false);
    expect(isPlausibleRawToken(undefined)).toBe(false);
  });
});
