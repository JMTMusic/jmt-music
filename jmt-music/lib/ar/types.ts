/**
 * A&R module, MVP — data types.
 *
 * An A&R Artist is its own record, not a `clients` row and not a `sales_opportunities`
 * row. It represents someone being researched, watched, or considered — before any
 * relationship or paid engagement exists. A third sibling alongside the Growth Engine's
 * Lead Pipeline and the Sales module (see the schema migration's header comment for the
 * full reasoning): Artist -> (optionally) a Client and/or a Sales Opportunity -> a
 * Project. Converting copies research into the existing Client/Sales systems using their
 * own existing repositories/actions — never a second Client or Sales system.
 */

export const AR_STATUSES = [
  "discovered",
  "reviewing",
  "watchlist",
  "ready_for_outreach",
  "contacted",
  "converted",
  "dismissed"
] as const;
export type ArStatus = typeof AR_STATUSES[number];

/** Every status a caller may manually select. 'converted' is excluded — only the Convert to Sales action may set it. */
export const SELECTABLE_AR_STATUSES = AR_STATUSES.filter((status) => status !== "converted") as ArStatus[];

/** Shared value list for both primary_platform and discovery_source — see the migration's column comment for why these are two columns sharing one taxonomy. */
export const AR_SOURCES = [
  "instagram",
  "spotify",
  "youtube",
  "vampr",
  "reddit",
  "website",
  "local",
  "referral",
  "manual",
  "other"
] as const;
export type ArSource = typeof AR_SOURCES[number];

export const AR_PRIORITIES = ["low", "medium", "high"] as const;
export type ArPriority = typeof AR_PRIORITIES[number];

/** The seven manually-scored fit categories. Each is 1-5, blank until reviewed. No category is computed from real audio/social analysis — there is none in this MVP. */
export const FIT_SCORE_CATEGORIES = [
  "genre",
  "musicalInterest",
  "productionOpportunity",
  "professionalism",
  "recentActivity",
  "audienceBusiness",
  "personalEnthusiasm"
] as const;
export type FitScoreCategory = typeof FIT_SCORE_CATEGORIES[number];

export type FitScoreCategoryValues = Partial<Record<FitScoreCategory, number | null>>;

/** Full internal record — everything Control Center code may see. No public/token-gated view exists for A&R Artists. */
export type ArArtistRecord = {
  id: string;
  propertyId: string;
  artistName: string;
  handle: string | null;
  primaryPlatform: ArSource | null;
  discoverySource: ArSource | null;
  profileUrl: string | null;
  websiteUrl: string | null;
  musicUrl: string | null;
  email: string | null;
  location: string | null;
  genre: string | null;
  subgenre: string | null;
  bioSummary: string | null;
  discoveryNotes: string | null;
  status: ArStatus;
  priority: ArPriority;
  fitGenreScore: number | null;
  fitMusicalInterestScore: number | null;
  fitProductionOpportunityScore: number | null;
  fitProfessionalismScore: number | null;
  fitRecentActivityScore: number | null;
  fitAudienceBusinessScore: number | null;
  fitPersonalEnthusiasmScore: number | null;
  fitScore: number | null;
  fitScoreOverridden: boolean;
  fitSummary: string | null;
  strengths: string | null;
  opportunities: string | null;
  concerns: string | null;
  followerCount: number | null;
  monthlyListenerCount: number | null;
  latestReleaseTitle: string | null;
  latestReleaseDate: string | null;
  lastActivityAt: string | null;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  outreachRecommendation: string | null;
  outreachDraft: string | null;
  relatedClientId: string | null;
  relatedSalesOpportunityId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Fields a caller may set on create. `status` is deliberately absent — every artist
 * starts at 'discovered' (the migration's own column default). `relatedSalesOpportunityId`
 * is absent for the same reason `sales_opportunities.convertedProjectId` is absent from
 * its create input — only the Convert to Sales action may ever set it. `relatedClientId`
 * IS present (see the migration's column comment: it's a freely editable pre-conversion
 * link, not a conversion outcome).
 */
export type CreateArArtistInput = {
  artistName: string;
  handle?: string | null;
  primaryPlatform?: string | null;
  discoverySource?: string | null;
  profileUrl?: string | null;
  websiteUrl?: string | null;
  musicUrl?: string | null;
  email?: string | null;
  location?: string | null;
  genre?: string | null;
  subgenre?: string | null;
  bioSummary?: string | null;
  discoveryNotes?: string | null;
  priority?: string;
  fitGenreScore?: number | string | null;
  fitMusicalInterestScore?: number | string | null;
  fitProductionOpportunityScore?: number | string | null;
  fitProfessionalismScore?: number | string | null;
  fitRecentActivityScore?: number | string | null;
  fitAudienceBusinessScore?: number | string | null;
  fitPersonalEnthusiasmScore?: number | string | null;
  fitScoreOverride?: number | string | null;
  fitSummary?: string | null;
  strengths?: string | null;
  opportunities?: string | null;
  concerns?: string | null;
  followerCount?: number | string | null;
  monthlyListenerCount?: number | string | null;
  latestReleaseTitle?: string | null;
  latestReleaseDate?: string | null;
  lastActivityAt?: string | null;
  nextReviewAt?: string | null;
  outreachRecommendation?: string | null;
  outreachDraft?: string | null;
  relatedClientId?: string | null;
  createdBy?: string | null;
};

/**
 * Fields a caller may change via general update. Deliberately excludes `status` (must go
 * through updateArArtistStatus) and `relatedSalesOpportunityId` (must go through the
 * Convert to Sales action) — the two protected fields a general update must reject/ignore.
 */
export type UpdateArArtistInput = {
  artistName?: string;
  handle?: string | null;
  primaryPlatform?: string | null;
  discoverySource?: string | null;
  profileUrl?: string | null;
  websiteUrl?: string | null;
  musicUrl?: string | null;
  email?: string | null;
  location?: string | null;
  genre?: string | null;
  subgenre?: string | null;
  bioSummary?: string | null;
  discoveryNotes?: string | null;
  priority?: string;
  fitGenreScore?: number | string | null;
  fitMusicalInterestScore?: number | string | null;
  fitProductionOpportunityScore?: number | string | null;
  fitProfessionalismScore?: number | string | null;
  fitRecentActivityScore?: number | string | null;
  fitAudienceBusinessScore?: number | string | null;
  fitPersonalEnthusiasmScore?: number | string | null;
  fitScoreOverride?: number | string | null;
  clearFitScoreOverride?: boolean;
  fitSummary?: string | null;
  strengths?: string | null;
  opportunities?: string | null;
  concerns?: string | null;
  followerCount?: number | string | null;
  monthlyListenerCount?: number | string | null;
  latestReleaseTitle?: string | null;
  latestReleaseDate?: string | null;
  lastActivityAt?: string | null;
  lastReviewedAt?: string | null;
  nextReviewAt?: string | null;
  outreachRecommendation?: string | null;
  outreachDraft?: string | null;
  relatedClientId?: string | null;
};

export type ArArtistsResult = {
  artists: ArArtistRecord[];
  status: "empty" | "error" | "ready";
  detail: string;
};

export type ArArtistLookupResult =
  | { status: "found"; artist: ArArtistRecord }
  | { status: "not_found" }
  | { status: "error"; message: string };

export type ArArtistMutationResult =
  | { status: "success"; artist: ArArtistRecord }
  | { status: "error"; message: string };

export type ListArArtistsFilters = {
  status?: ArStatus;
  priority?: ArPriority;
  primaryPlatform?: ArSource;
  genre?: string;
};

export type ArOverviewCounts = {
  readyForOutreach: number;
  highPriorityWatchlist: number;
  reviewsDue: number;
  recentlyDiscovered: number;
  contacted: number;
  convertedToSales: number;
  averageFitScore: number | null;
};
