import { GROWTH_ENGINE_TIMEZONE, getZonedDateKey } from "@/lib/control-center/lead-pipeline";
import { PLATFORM_LABELS } from "./display";
import type { SalesOpportunityRecord, SalesOverviewCounts, SalesStatus } from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Statuses that no longer represent open, actionable work. */
const TERMINAL_STATUSES: readonly SalesStatus[] = ["won", "lost", "converted"];

export function isTerminalStatus(status: SalesStatus): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

export function isOpenStatus(status: SalesStatus): boolean {
  return !isTerminalStatus(status);
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export function selectByStatus(opportunities: SalesOpportunityRecord[], status: SalesStatus): SalesOpportunityRecord[] {
  return opportunities.filter((opportunity) => opportunity.status === status);
}

export function selectOpen(opportunities: SalesOpportunityRecord[]): SalesOpportunityRecord[] {
  return opportunities.filter((opportunity) => isOpenStatus(opportunity.status));
}

export function selectConverted(opportunities: SalesOpportunityRecord[]): SalesOpportunityRecord[] {
  return opportunities.filter((opportunity) => opportunity.status === "converted");
}

/**
 * Calendar-day comparison in GROWTH_ENGINE_TIMEZONE, the same timezone constant and
 * comparison already used for Lead Pipeline follow-ups (lib/control-center/lead-pipeline.ts)
 * — reused directly rather than re-derived, so "today" can never mean two different things
 * across modules. Terminal-status opportunities never count as due, even with a stale
 * follow_up_at left over from before they were won/lost/converted.
 */
export function isFollowUpDueToday(
  opportunity: Pick<SalesOpportunityRecord, "followUpAt" | "status">,
  now: Date = new Date(),
  timeZone: string = GROWTH_ENGINE_TIMEZONE
): boolean {
  if (isTerminalStatus(opportunity.status) || !opportunity.followUpAt) return false;
  return getZonedDateKey(new Date(opportunity.followUpAt), timeZone) === getZonedDateKey(now, timeZone);
}

export function isFollowUpOverdue(
  opportunity: Pick<SalesOpportunityRecord, "followUpAt" | "status">,
  now: Date = new Date(),
  timeZone: string = GROWTH_ENGINE_TIMEZONE
): boolean {
  if (isTerminalStatus(opportunity.status) || !opportunity.followUpAt) return false;
  return getZonedDateKey(new Date(opportunity.followUpAt), timeZone) < getZonedDateKey(now, timeZone);
}

export function selectFollowUpsToday(opportunities: SalesOpportunityRecord[], now: Date = new Date()): SalesOpportunityRecord[] {
  return opportunities.filter((opportunity) => isFollowUpDueToday(opportunity, now));
}

export function selectFollowUpsOverdue(opportunities: SalesOpportunityRecord[], now: Date = new Date()): SalesOpportunityRecord[] {
  return opportunities.filter((opportunity) => isFollowUpOverdue(opportunity, now));
}

/**
 * Due-today or overdue, in one list — what Today's Focus on the main Dashboard actually
 * consumes. Deliberately not "every open opportunity": only ones with an explicit
 * follow-up date that has arrived, matching the "don't clutter Today's Focus" requirement.
 */
export function selectDueForFollowUp(opportunities: SalesOpportunityRecord[], now: Date = new Date()): SalesOpportunityRecord[] {
  return opportunities.filter((opportunity) => isFollowUpDueToday(opportunity, now) || isFollowUpOverdue(opportunity, now));
}

export function selectWaitingForResponse(opportunities: SalesOpportunityRecord[]): SalesOpportunityRecord[] {
  return selectByStatus(opportunities, "waiting");
}

export function selectActiveConversations(opportunities: SalesOpportunityRecord[]): SalesOpportunityRecord[] {
  return selectByStatus(opportunities, "conversation");
}

/** Proposals actually sent within the last `days` days (elapsed time, not calendar-day bound), regardless of current status. */
export function selectProposalsSentWithinDays(
  opportunities: SalesOpportunityRecord[],
  days = 30,
  now: Date = new Date()
): SalesOpportunityRecord[] {
  return opportunities.filter((opportunity) => {
    if (!opportunity.proposalSentAt) return false;
    return daysBetween(new Date(opportunity.proposalSentAt), now) <= days;
  });
}

/**
 * Won within the last `days` days. There is no dedicated `won_at` column in the MVP
 * schema, so this approximates using `updatedAt` on a 'won' opportunity — accurate as long
 * as nothing else edits a won opportunity after the fact. Documented limitation, not a bug.
 */
export function selectWonWithinDays(opportunities: SalesOpportunityRecord[], days = 30, now: Date = new Date()): SalesOpportunityRecord[] {
  return opportunities.filter((opportunity) => {
    if (opportunity.status !== "won") return false;
    return daysBetween(new Date(opportunity.updatedAt), now) <= days;
  });
}

/**
 * Sum of budgetAmount across every open (non-terminal) opportunity in `currency` — summing
 * across different currencies would produce a number with no real meaning, so anything not
 * in the requested currency is excluded rather than silently added in. Defaults to 'USD',
 * the schema's own column default and the only currency this MVP's UI actually surfaces;
 * a true multi-currency breakdown is future work, not built here. Null budgets contribute 0.
 */
export function computeOpenPipelineValue(opportunities: SalesOpportunityRecord[], currency = "USD"): number {
  return selectOpen(opportunities)
    .filter((opportunity) => opportunity.currency === currency)
    .reduce((sum, opportunity) => sum + (opportunity.budgetAmount || 0), 0);
}

/** One aggregation pass over a property's opportunities, for the Sales Overview page. */
export function computeSalesOverviewCounts(opportunities: SalesOpportunityRecord[], now: Date = new Date()): SalesOverviewCounts {
  return {
    followUpsToday: selectFollowUpsToday(opportunities, now).length,
    waitingForResponse: selectWaitingForResponse(opportunities).length,
    activeConversations: selectActiveConversations(opportunities).length,
    proposalsSentLast30Days: selectProposalsSentWithinDays(opportunities, 30, now).length,
    wonLast30Days: selectWonWithinDays(opportunities, 30, now).length,
    openPipelineValue: computeOpenPipelineValue(opportunities)
  };
}

/**
 * Explicit next-action text for Today's Focus and the Overview's follow-up list — e.g.
 * "Follow up on AirGigs proposal for Ambient Pop Mix." Phrasing adapts to how far along the
 * opportunity is: once a proposal is out (or later), the action is framed around the
 * proposal; earlier stages frame it around the artist directly.
 */
export function getOpportunityNextAction(opportunity: SalesOpportunityRecord): string {
  const platformLabel = PLATFORM_LABELS[opportunity.platform] ?? opportunity.platform;
  if (opportunity.status === "proposal_sent" || opportunity.status === "waiting" || opportunity.status === "negotiating") {
    return `Follow up on ${platformLabel} proposal for ${opportunity.title}`;
  }
  return `Follow up with ${opportunity.artistName} about ${opportunity.title}`;
}
