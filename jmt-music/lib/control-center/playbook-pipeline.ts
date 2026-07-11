import type { Play, PlayCategory } from "./types";

/**
 * Play numbers ("Play 001", "Play 002", ...) are deliberately NOT a stored column.
 * They're computed here from `createdAt` ascending order, scoped to whatever list of
 * Plays is passed in (normally one property's full Playbook). This avoids a whole class
 * of migration/renumbering problems a stored sequence would create — archiving a Play,
 * deleting a seed row, or importing older data would either leave gaps or force a
 * renumbering migration. Computed numbers are always dense and always correct for
 * whatever's actually in the list today.
 */
export function withPlayNumbers<T extends Pick<Play, "id" | "createdAt">>(
  plays: T[]
): Array<T & { playNumber: string }> {
  const sorted = [...plays].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const numberById = new Map<string, string>();
  sorted.forEach((play, index) => numberById.set(play.id, String(index + 1).padStart(3, "0")));
  return plays.map((play) => ({ ...play, playNumber: `Play ${numberById.get(play.id)}` }));
}

/** Groups Plays by category, preserving whatever order the input array is already in within each group. */
export function groupPlaysByCategory<T extends Play>(plays: T[]): Map<PlayCategory, T[]> {
  const map = new Map<PlayCategory, T[]>();
  for (const play of plays) {
    const list = map.get(play.category) || [];
    list.push(play);
    map.set(play.category, list);
  }
  return map;
}

export function selectFavorites(plays: Play[]): Play[] {
  return plays.filter((play) => play.isFavorite);
}

export function selectByStatus(plays: Play[], status: Play["status"]): Play[] {
  return plays.filter((play) => play.status === status);
}

/**
 * Search across Title, Category (label or raw value), Keywords (tags), and Message
 * contents — the four fields the spec calls out. Case-insensitive substring match, no
 * external search dependency for a dataset this size.
 */
export function searchPlays<T extends Play>(plays: T[], query: string, categoryLabels: Record<PlayCategory, string>): T[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return plays;
  return plays.filter((play) => {
    const haystack = [
      play.title,
      play.category,
      categoryLabels[play.category],
      ...play.tags,
      play.messageBody
    ]
      .join(" \n ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}
