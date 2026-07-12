/**
 * Turns the free-form `responses` jsonb into a readable, grouped structure for the
 * Control Center review surface — no raw JSON by default. Deliberately generic: there is
 * no shared Project Setup question config yet, so every key is humanized on the fly and
 * every value is formatted by shape alone. `labelOverrides` exists so a future config can
 * supply nicer labels for known keys without changing this function's shape or call sites.
 */

export type FormattedField =
  | { kind: "field"; key: string; label: string; value: string }
  | { kind: "section"; key: string; label: string; fields: FormattedField[] };

/** "artist_name" / "artistName" / "artist-name" -> "Artist Name". Unknown keys degrade gracefully. */
export function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  if (!spaced) return key;
  return spaced
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === "object" && !Array.isArray(value) && Object.keys(value as object).length === 0) return true;
  return false;
}

function formatScalar(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

/** Arrays of scalars become a comma list; an array containing objects falls back to JSON per item rather than losing data. */
function formatArrayValue(value: unknown[]): string {
  const parts = value
    .map((item) => {
      if (isEmptyValue(item)) return null;
      if (typeof item === "object") {
        try {
          return JSON.stringify(item);
        } catch {
          return null;
        }
      }
      return formatScalar(item as string | number | boolean);
    })
    .filter((item): item is string => item !== null && item !== "");
  return parts.join(", ");
}

/**
 * Recursively turns a responses object (or a nested object within it) into a flat list of
 * fields and sections. Unknown/future keys are handled the same as known ones — there is
 * no allow-list, only shape-based formatting — so new intake questions never break this.
 */
export function formatResponseFields(
  responses: Record<string, unknown> | null | undefined,
  labelOverrides: Record<string, string> = {}
): FormattedField[] {
  const fields: FormattedField[] = [];
  if (!responses || typeof responses !== "object") return fields;

  for (const [key, rawValue] of Object.entries(responses)) {
    if (isEmptyValue(rawValue)) continue;
    const label = labelOverrides[key] ?? humanizeKey(key);

    if (Array.isArray(rawValue)) {
      const formatted = formatArrayValue(rawValue);
      if (formatted) fields.push({ kind: "field", key, label, value: formatted });
      continue;
    }

    if (typeof rawValue === "object") {
      const nested = formatResponseFields(rawValue as Record<string, unknown>, labelOverrides);
      if (nested.length > 0) fields.push({ kind: "section", key, label, fields: nested });
      continue;
    }

    fields.push({ kind: "field", key, label, value: formatScalar(rawValue as string | number | boolean) });
  }

  return fields;
}
