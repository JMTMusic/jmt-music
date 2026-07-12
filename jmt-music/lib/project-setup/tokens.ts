import { randomBytes, createHash } from "node:crypto";

/**
 * No "server-only" import here, matching lib/inbound/validation.ts and pipeline.ts —
 * this module has no database/service-role access, and keeping it free of "server-only"
 * is what lets it be unit-tested directly under Vitest. `node:crypto` itself doesn't
 * exist in a browser bundle, so accidental client-side use would fail to build anyway.
 */

/**
 * Private-link token security model (Phase Two: Project Setup):
 *
 * - The raw token is generated here, server-side, using Node's CSPRNG (`crypto.randomBytes`,
 *   not `Math.random`, not a sequential/predictable id, and not a v4 UUID — 256 bits of
 *   entropy rather than a UUID's 122, and it doesn't visually announce "this is a UUID").
 * - Only `hashRawToken()`'s output (SHA-256, hex) is ever written to the database
 *   (`project_setups.access_token_hash`). The raw token itself is never persisted anywhere,
 *   never logged, and is returned to the caller exactly once — at creation or reissue time —
 *   so it can be copied into a link for the artist. If that moment is missed, the only
 *   recovery path is reissuing a brand new token; the old one is gone by design.
 * - Lookups hash the presented token and compare against the stored hash with a single
 *   equality check performed by Postgres (`where access_token_hash = $1`). A timing-safe
 *   comparison isn't needed for a SHA-256 digest match against a unique-indexed column —
 *   there's no raw-token-to-raw-token comparison anywhere in this module to protect.
 */

const RAW_TOKEN_BYTES = 32;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Expected length of a raw token string (32 bytes, base64url, no padding). */
export const RAW_TOKEN_LENGTH = Math.ceil((RAW_TOKEN_BYTES * 4) / 3);

/** Generates a fresh, cryptographically secure raw token. Never logged, never stored raw. */
export function generateRawToken(): string {
  return randomBytes(RAW_TOKEN_BYTES).toString("base64url");
}

/** Deterministic SHA-256 hex digest — the only form of the token that ever reaches the database. */
export function hashRawToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Cheap shape/charset check on a token presented by a caller, before it's ever hashed or
 * used in a query — rejects obviously-malformed input early without touching the database.
 */
export function isPlausibleRawToken(value: unknown): value is string {
  return typeof value === "string" && value.length === RAW_TOKEN_LENGTH && BASE64URL_PATTERN.test(value);
}
