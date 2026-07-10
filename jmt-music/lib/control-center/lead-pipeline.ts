import type { Client, Communication, LeadStage } from "./types";

/**
 * Timezone/current-time assumptions (documented per implementation-plan requirement):
 *
 * This app has no per-user timezone setting — it's a solo-operator tool. All "today" /
 * "overdue" / "due today" logic below is anchored to one explicit IANA timezone constant
 * rather than the raw server clock. This matters because Vercel serverless functions run
 * in UTC regardless of where Jonathan actually is, so `new Date()` alone would silently
 * shift what counts as "today" by several hours from his actual calendar day.
 *
 * GROWTH_ENGINE_TIMEZONE defaults to America/Chicago. Confirm this is correct and adjust
 * if Jonathan operates from a different timezone — this is a one-line change here, not a
 * schema or architecture change, since all comparisons route through this one constant.
 *
 * "Due today" / "overdue" use calendar-day comparison in this timezone (a follow-up dated
 * today at 11pm is still "due today" even if now is 9am). "New in the last 7 days" and the
 * "waiting response" threshold use plain elapsed time instead, since those are rolling
 * windows, not calendar-day boundaries, and don't need timezone conversion to be correct.
 */
export const GROWTH_ENGINE_TIMEZONE = "America/Chicago";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Returns a stable YYYY-MM-DD key for `date` as a calendar day in `timeZone`. */
export function getZonedDateKey(date: Date, timeZone: string = GROWTH_ENGINE_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** Display identity: falls back to artistName whenever contactName is blank. */
export function getDisplayName(client: Pick<Client, "artistName" | "contactName">): string {
  return client.contactName?.trim() || client.artistName;
}

/** Calendar-day comparison in GROWTH_ENGINE_TIMEZONE — a follow-up dated today is due today regardless of time-of-day. */
export function isFollowUpDueToday(
  client: Pick<Client, "nextFollowUpAt" | "isArchived">,
  now: Date = new Date(),
  timeZone: string = GROWTH_ENGINE_TIMEZONE
): boolean {
  if (client.isArchived || !client.nextFollowUpAt) return false;
  return getZonedDateKey(new Date(client.nextFollowUpAt), timeZone) === getZonedDateKey(now, timeZone);
}

/** Calendar-day comparison — strictly before today's date in GROWTH_ENGINE_TIMEZONE, not merely 24 elapsed hours. */
export function isFollowUpOverdue(
  client: Pick<Client, "nextFollowUpAt" | "isArchived">,
  now: Date = new Date(),
  timeZone: string = GROWTH_ENGINE_TIMEZONE
): boolean {
  if (client.isArchived || !client.nextFollowUpAt) return false;
  return getZonedDateKey(new Date(client.nextFollowUpAt), timeZone) < getZonedDateKey(now, timeZone);
}

/** Active (non-archived) leads created within the last `sinceDays` — rolling elapsed-time window, not calendar-day bound. */
export function selectNewLeads(clients: Client[], now: Date = new Date(), sinceDays = 7): Client[] {
  return clients.filter(
    (client) => !client.isArchived && daysBetween(new Date(client.createdAt), now) <= sinceDays
  );
}

export function selectByStage(clients: Client[], stage: LeadStage, includeArchived = false): Client[] {
  return clients.filter((client) => client.stage === stage && (includeArchived || !client.isArchived));
}

export function selectActive(clients: Client[]): Client[] {
  return clients.filter((client) => !client.isArchived);
}

export function selectArchived(clients: Client[]): Client[] {
  return clients.filter((client) => client.isArchived);
}

export function selectDueTodayFollowUps(clients: Client[], now: Date = new Date()): Client[] {
  return clients.filter((client) => isFollowUpDueToday(client, now));
}

export function selectOverdueFollowUps(clients: Client[], now: Date = new Date()): Client[] {
  return clients.filter((client) => isFollowUpOverdue(client, now));
}

/**
 * Leads whose most recent communication was outbound with no subsequent inbound reply,
 * older than `thresholdDays` (elapsed time). Takes messages grouped by clientId rather than
 * querying, keeping this pure and testable — the join happens once at the page level.
 */
export function selectWaitingResponses(
  clients: Client[],
  messagesByClientId: Map<string, Communication[]>,
  now: Date = new Date(),
  thresholdDays = 3
): Client[] {
  return clients.filter((client) => {
    if (client.isArchived) return false;
    const messages = messagesByClientId.get(client.id);
    if (!messages || !messages.length) return false;
    const sorted = [...messages].sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );
    const latest = sorted[0];
    if (latest.direction !== "outbound") return false;
    return daysBetween(new Date(latest.sentAt), now) >= thresholdDays;
  });
}

/** Most recent communication timestamp for a client, or null if none exist. Derived, never stored. */
export function getLastContactAt(clientId: string, messagesByClientId: Map<string, Communication[]>): string | null {
  const messages = messagesByClientId.get(clientId);
  if (!messages || !messages.length) return null;
  return messages.reduce((latest, message) => (message.sentAt > latest ? message.sentAt : latest), messages[0].sentAt);
}

/** Groups a flat communications array by clientId once, for reuse across selectors on one page render. */
export function groupMessagesByClient(messages: Communication[]): Map<string, Communication[]> {
  const map = new Map<string, Communication[]>();
  for (const message of messages) {
    const existing = map.get(message.clientId);
    if (existing) existing.push(message);
    else map.set(message.clientId, [message]);
  }
  return map;
}
