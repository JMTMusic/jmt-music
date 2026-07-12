import { COMPLETED_BY_VALUES, type CompletedBy } from "./types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Cap on the serialized size of `responses` — generous for a multi-section questionnaire, not unbounded. */
export const MAX_RESPONSES_JSON_LENGTH = 100_000;

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

/** Project linkage is required — throws on anything that isn't a well-formed UUID. */
export function validateProjectId(raw: unknown): string {
  if (!isValidUuid(raw)) throw new Error("A valid project id is required.");
  return raw;
}

/** Discovery linkage is optional — a Setup may be started manually with no Discovery behind it. */
export function validateOptionalDiscoveryId(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (!isValidUuid(raw)) throw new Error("Discovery id, if provided, must be a valid id.");
  return raw;
}

/** Restricts `completedBy` to the allowed values — never trusts arbitrary public input here. */
export function validateCompletedBy(raw: unknown): CompletedBy {
  if (typeof raw !== "string" || !(COMPLETED_BY_VALUES as readonly string[]).includes(raw)) {
    throw new Error("completedBy must be either \"client\" or \"jonathan\".");
  }
  return raw as CompletedBy;
}

/**
 * Responses must be a plain, JSON-serializable object — not an array, not null, not a
 * primitive — and bounded in size. This is the ONLY field public draft-saving may write;
 * it deliberately has no path for a caller to smuggle in a status or timestamp field
 * alongside it, because this function's return type only ever produces a responses object.
 */
export function validateResponses(raw: unknown): Record<string, unknown> {
  if (raw === null || raw === undefined || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Responses must be a plain object.");
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(raw);
  } catch {
    throw new Error("Responses could not be serialized.");
  }

  if (!serialized || serialized === "null") throw new Error("Responses must be a plain object.");
  if (serialized.length > MAX_RESPONSES_JSON_LENGTH) {
    throw new Error(`Responses exceed the maximum allowed size of ${MAX_RESPONSES_JSON_LENGTH} characters.`);
  }

  return raw as Record<string, unknown>;
}
