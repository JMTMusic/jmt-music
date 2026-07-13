import { GROWTH_ENGINE_TIMEZONE, getZonedDateKey } from "@/lib/control-center/lead-pipeline";
import { FIT_SCORE_CATEGORIES } from "./types";
import type { ArArtistRecord, ArOverviewCounts, ArStatus, FitScoreCategoryValues } from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Statuses that no longer represent active, actionable research. */
const TERMINAL_STATUSES: readonly ArStatus[] = ["converted", "dismissed"];

export function isTerminalStatus(status: ArStatus): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

export function isActiveStatus(status: ArStatus): boolean {
  return !isTerminalStatus(status);
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export function selectByStatus(artists: ArArtistRecord[], status: ArStatus): ArArtistRecord[] {
  return artists.filter((artist) => artist.status === status);
}

export function selectActive(artists: ArArtistRecord[]): ArArtistRecord[] {
  return artists.filter((artist) => isActiveStatus(artist.status));
}

// ---------------------------------------------------------------------------
// Fit score
// ---------------------------------------------------------------------------

/** Pulls the seven category values off a record into the shape computeFitScore expects. */
export function getFitScoreCategoryValues(
  artist: Pick<
    ArArtistRecord,
    | "fitGenreScore"
    | "fitMusicalInterestScore"
    | "fitProductionOpportunityScore"
    | "fitProfessionalismScore"
    | "fitRecentActivityScore"
    | "fitAudienceBusinessScore"
    | "fitPersonalEnthusiasmScore"
  >
): FitScoreCategoryValues {
  return {
    genre: artist.fitGenreScore,
    musicalInterest: artist.fitMusicalInterestScore,
    productionOpportunity: artist.fitProductionOpportunityScore,
    professionalism: artist.fitProfessionalismScore,
    recentActivity: artist.fitRecentActivityScore,
    audienceBusiness: artist.fitAudienceBusinessScore,
    personalEnthusiasm: artist.fitPersonalEnthusiasmScore
  };
}

/**
 * Averages whichever fit-score categories are actually filled in, rounded to one decimal.
 * Returns null when every category is blank — "not yet reviewed" is a real, expected state,
 * not zero. This is the only place fit_score is ever computed; a manual override bypasses
 * this function entirely (see lib/ar/repository.ts's updateArArtist).
 */
export function computeFitScore(categories: FitScoreCategoryValues): number | null {
  const values = FIT_SCORE_CATEGORIES.map((category) => categories[category]).filter(
    (value): value is number => typeof value === "number"
  );
  if (!values.length) return null;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(average * 10) / 10;
}

/** Average fit_score across every artist that actually has one set, regardless of status — "reviewed" means scored, not any particular stage. */
export function computeAverageFitScore(artists: ArArtistRecord[]): number | null {
  const scored = artists.filter((artist): artist is ArArtistRecord & { fitScore: number } => typeof artist.fitScore === "number");
  if (!scored.length) return null;
  const average = scored.reduce((sum, artist) => sum + artist.fitScore, 0) / scored.length;
  return Math.round(average * 10) / 10;
}

// ---------------------------------------------------------------------------
// Review due / overdue — same timezone-anchored comparison as Sales follow-ups
// ---------------------------------------------------------------------------

/**
 * Calendar-day comparison in GROWTH_ENGINE_TIMEZONE, reused directly from
 * lib/control-center/lead-pipeline.ts rather than re-derived — "today" can never mean two
 * different things across modules. next_review_at serves double duty by design (not a
 * schema gap): for an actively-researched artist it means "review due," for a contacted
 * artist it means "follow-up due" — same column, the phrasing just adapts by status (see
 * getArtistNextAction below). Terminal-status artists never count as due, even with a
 * stale next_review_at left over from before they were converted/dismissed.
 */
export function isReviewDueToday(
  artist: Pick<ArArtistRecord, "nextReviewAt" | "status">,
  now: Date = new Date(),
  timeZone: string = GROWTH_ENGINE_TIMEZONE
): boolean {
  if (isTerminalStatus(artist.status) || !artist.nextReviewAt) return false;
  return getZonedDateKey(new Date(artist.nextReviewAt), timeZone) === getZonedDateKey(now, timeZone);
}

export function isReviewOverdue(
  artist: Pick<ArArtistRecord, "nextReviewAt" | "status">,
  now: Date = new Date(),
  timeZone: string = GROWTH_ENGINE_TIMEZONE
): boolean {
  if (isTerminalStatus(artist.status) || !artist.nextReviewAt) return false;
  return getZonedDateKey(new Date(artist.nextReviewAt), timeZone) < getZonedDateKey(now, timeZone);
}

export function selectReviewsDueToday(artists: ArArtistRecord[], now: Date = new Date()): ArArtistRecord[] {
  return artists.filter((artist) => isReviewDueToday(artist, now));
}

export function selectReviewsOverdue(artists: ArArtistRecord[], now: Date = new Date()): ArArtistRecord[] {
  return artists.filter((artist) => isReviewOverdue(artist, now));
}

export function selectReviewsDue(artists: ArArtistRecord[], now: Date = new Date()): ArArtistRecord[] {
  return artists.filter((artist) => isReviewDueToday(artist, now) || isReviewOverdue(artist, now));
}

/** Created within the last `sinceDays`, active only — the Overview's "Recently discovered" section. */
export function selectRecentlyDiscovered(artists: ArArtistRecord[], now: Date = new Date(), sinceDays = 7): ArArtistRecord[] {
  return artists.filter((artist) => isActiveStatus(artist.status) && daysBetween(new Date(artist.createdAt), now) <= sinceDays);
}

export function selectHighPriorityWatchlist(artists: ArArtistRecord[]): ArArtistRecord[] {
  return artists.filter((artist) => artist.status === "watchlist" && artist.priority === "high");
}

/**
 * Today's A&R Focus, for both the A&R Overview and the main Dashboard's Today's Focus
 * section: a review/follow-up due (any active status) OR a high-priority artist already
 * marked ready for outreach — deliberately not "every discovered artist," matching the
 * explicit "don't clutter Today's Focus" requirement.
 */
export function selectTodaysArFocus(artists: ArArtistRecord[], now: Date = new Date()): ArArtistRecord[] {
  const due = selectReviewsDue(artists, now);
  const dueIds = new Set(due.map((artist) => artist.id));
  const highPriorityReady = artists.filter((artist) => artist.status === "ready_for_outreach" && artist.priority === "high" && !dueIds.has(artist.id));
  return [...due, ...highPriorityReady];
}

/**
 * Explicit next-action text — e.g. "Review Emily Rose's latest release.",
 * "Prepare outreach for Coastal Lights.", "Revisit Aaron Wells — watchlist review overdue."
 * Phrasing adapts to status, since next_review_at means something different at each stage.
 */
export function getArtistNextAction(artist: ArArtistRecord, now: Date = new Date()): string {
  if (artist.status === "ready_for_outreach") {
    return `Prepare outreach for ${artist.artistName}`;
  }
  if (artist.status === "contacted") {
    const overdue = isReviewOverdue(artist, now);
    return `Follow up with ${artist.artistName}${overdue ? " — follow-up overdue" : " — follow-up due"}`;
  }
  if (artist.status === "watchlist") {
    const overdue = isReviewOverdue(artist, now);
    return `Revisit ${artist.artistName} — watchlist review ${overdue ? "overdue" : "due"}`;
  }
  if (artist.latestReleaseTitle) {
    return `Review ${artist.artistName}'s latest release`;
  }
  return `Review ${artist.artistName}`;
}

/** One aggregation pass over a property's artists, for the A&R Overview page. */
export function computeArOverviewCounts(artists: ArArtistRecord[], now: Date = new Date()): ArOverviewCounts {
  return {
    readyForOutreach: selectByStatus(artists, "ready_for_outreach").length,
    highPriorityWatchlist: selectHighPriorityWatchlist(artists).length,
    reviewsDue: selectReviewsDue(artists, now).length,
    recentlyDiscovered: selectRecentlyDiscovered(artists, now).length,
    contacted: selectByStatus(artists, "contacted").length,
    convertedToSales: selectByStatus(artists, "converted").length,
    averageFitScore: computeAverageFitScore(artists)
  };
}

// ---------------------------------------------------------------------------
// Outreach draft — composed only from information actually entered, never sent
// ---------------------------------------------------------------------------

export type OutreachDraftInputs = {
  specificCompliment: string;
  whyGoodFit?: string;
  possibleService?: string;
  tone?: "warm" | "professional" | "casual";
};

/**
 * The one required ingredient is a specific, human-written compliment — that's what makes
 * a draft personal rather than generic. Everything else (release title, why-fit, service)
 * is optional and, when present, is used verbatim, never embellished or invented.
 */
export function canComposeOutreachDraft(artist: Pick<ArArtistRecord, "artistName">, inputs: OutreachDraftInputs): boolean {
  return Boolean(artist.artistName?.trim() && inputs.specificCompliment?.trim());
}

/**
 * Mechanical template assembly, not generated prose — every sentence is either fixed
 * boilerplate or a verbatim field the user typed. Returns null (refuses to compose) when
 * canComposeOutreachDraft is false, rather than falling back to something generic.
 */
export function composeOutreachDraft(
  artist: Pick<ArArtistRecord, "artistName" | "latestReleaseTitle">,
  inputs: OutreachDraftInputs
): string | null {
  if (!canComposeOutreachDraft(artist, inputs)) return null;
  const compliment = inputs.specificCompliment.trim();
  const tone = inputs.tone || "warm";

  const lines: string[] = [];
  lines.push(tone === "professional" ? `Hi ${artist.artistName},` : `Hey ${artist.artistName}!`);
  lines.push("");

  const releaseTitle = artist.latestReleaseTitle?.trim();
  lines.push(releaseTitle ? `I've been listening to "${releaseTitle}" — ${compliment}` : compliment);

  lines.push("");
  lines.push("I'm Jonathan, a producer and pianist at JMT Music.");

  const whyFit = inputs.whyGoodFit?.trim();
  if (whyFit) {
    lines.push("");
    lines.push(whyFit);
  }

  const service = inputs.possibleService?.trim();
  if (service) {
    lines.push("");
    lines.push(service);
  }

  lines.push("");
  lines.push("No pressure at all — I'd just love to connect if it ever feels like the right fit.");
  lines.push("");
  lines.push("Jonathan Tripp");
  lines.push("JMT Music");

  return lines.join("\n");
}
