/**
 * Sales module, MVP — data types.
 *
 * A Sales Opportunity is its own record, not a `clients` row and not a `projects` row.
 * It represents a transactional, proposal-based freelance-marketplace pitch (AirGigs,
 * Fiverr, SoundBetter, and similar inbound gig requests) — a sibling to the Growth
 * Engine's relationship-first Lead Pipeline, not a layer on top of it. See the schema
 * migration's header comment for the full reasoning. Converting a won opportunity creates
 * or connects an existing `clients` row and a `projects` row using the existing
 * repositories/actions for both — never a second Client or Project system.
 */

export const SALES_STATUSES = [
  "new_lead",
  "conversation",
  "proposal_draft",
  "proposal_sent",
  "waiting",
  "negotiating",
  "won",
  "lost",
  "converted"
] as const;
export type SalesStatus = typeof SALES_STATUSES[number];

/** Every status a caller may manually select. 'converted' is excluded — only the Convert to Project action may set it. */
export const SELECTABLE_SALES_STATUSES = SALES_STATUSES.filter((status) => status !== "converted") as SalesStatus[];

export const SALES_PLATFORMS = [
  "airgigs",
  "fiverr",
  "soundbetter",
  "instagram",
  "website",
  "email",
  "referral",
  "local",
  "other"
] as const;
export type SalesPlatform = typeof SALES_PLATFORMS[number];

export const SALES_SERVICE_TYPES = [
  "production",
  "mixing",
  "mastering",
  "production_mix_master",
  "session_piano",
  "session_keys",
  "beat_license",
  "custom",
  "other"
] as const;
export type SalesServiceType = typeof SALES_SERVICE_TYPES[number];

export const SALES_PROBABILITIES = ["low", "medium", "high"] as const;
export type SalesProbability = typeof SALES_PROBABILITIES[number];

/** Full internal record — everything Control Center code may see. No public/token-gated view exists for Sales Opportunities. */
export type SalesOpportunityRecord = {
  id: string;
  propertyId: string;
  title: string;
  artistName: string;
  artistEmail: string | null;
  /** Optional pre-conversion link to an existing Client — distinct from convertedClientId, the actual outcome once conversion happens. */
  clientId: string | null;
  platform: SalesPlatform;
  serviceType: SalesServiceType;
  genre: string | null;
  budgetAmount: number | null;
  currency: string;
  status: SalesStatus;
  probability: SalesProbability;
  proposalSentAt: string | null;
  followUpAt: string | null;
  deadline: string | null;
  sourceUrl: string | null;
  musicUrl: string | null;
  notes: string | null;
  proposalText: string | null;
  buyerInstructions: string | null;
  turnaroundDays: number | null;
  revisionCount: number | null;
  sampleTitle: string | null;
  sampleDescription: string | null;
  sampleUrl: string | null;
  lostReason: string | null;
  convertedProjectId: string | null;
  convertedClientId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Fields a caller may set on create. `status` is deliberately absent — every opportunity
 * starts at 'new_lead' (the migration's own column default); there is no path to create a
 * row directly into a later stage. `convertedProjectId`/`convertedClientId` are absent for
 * the same reason `content_items.status`/`publishedAt` are absent from its create input —
 * only the Convert to Project action may ever set them.
 */
export type CreateSalesOpportunityInput = {
  title: string;
  artistName: string;
  artistEmail?: string | null;
  clientId?: string | null;
  platform: string;
  serviceType: string;
  genre?: string | null;
  budgetAmount?: number | string | null;
  currency?: string | null;
  probability?: string;
  proposalSentAt?: string | null;
  followUpAt?: string | null;
  deadline?: string | null;
  sourceUrl?: string | null;
  musicUrl?: string | null;
  notes?: string | null;
  proposalText?: string | null;
  buyerInstructions?: string | null;
  turnaroundDays?: number | string | null;
  revisionCount?: number | string | null;
  sampleTitle?: string | null;
  sampleDescription?: string | null;
  sampleUrl?: string | null;
  createdBy?: string | null;
};

/**
 * Fields a caller may change via general update. Deliberately excludes `status` (must go
 * through updateSalesOpportunityStatus) and both converted-* fields (must go through the
 * Convert to Project action) — the two protected groups a general update must reject/ignore.
 */
export type UpdateSalesOpportunityInput = {
  title?: string;
  artistName?: string;
  artistEmail?: string | null;
  clientId?: string | null;
  platform?: string;
  serviceType?: string;
  genre?: string | null;
  budgetAmount?: number | string | null;
  currency?: string | null;
  probability?: string;
  proposalSentAt?: string | null;
  followUpAt?: string | null;
  deadline?: string | null;
  sourceUrl?: string | null;
  musicUrl?: string | null;
  notes?: string | null;
  proposalText?: string | null;
  buyerInstructions?: string | null;
  turnaroundDays?: number | string | null;
  revisionCount?: number | string | null;
  sampleTitle?: string | null;
  sampleDescription?: string | null;
  sampleUrl?: string | null;
  lostReason?: string | null;
};

export type SalesOpportunitiesResult = {
  opportunities: SalesOpportunityRecord[];
  status: "empty" | "error" | "ready";
  detail: string;
};

export type SalesOpportunityLookupResult =
  | { status: "found"; opportunity: SalesOpportunityRecord }
  | { status: "not_found" }
  | { status: "error"; message: string };

export type SalesOpportunityMutationResult =
  | { status: "success"; opportunity: SalesOpportunityRecord }
  | { status: "error"; message: string };

export type ListSalesOpportunitiesFilters = {
  status?: SalesStatus;
  platform?: SalesPlatform;
  serviceType?: SalesServiceType;
};

export type SalesOverviewCounts = {
  followUpsToday: number;
  waitingForResponse: number;
  activeConversations: number;
  proposalsSentLast30Days: number;
  wonLast30Days: number;
  openPipelineValue: number;
};
