import { AR_STATUSES } from "./types";
import type { ArPriority, ArSource, ArStatus, FitScoreCategory } from "./types";

export const STATUS_LABELS: Record<ArStatus, string> = {
  discovered: "Discovered",
  reviewing: "Reviewing",
  watchlist: "Watchlist",
  ready_for_outreach: "Ready for Outreach",
  contacted: "Contacted",
  converted: "Converted",
  dismissed: "Dismissed"
};

export const STATUS_ORDER: readonly ArStatus[] = AR_STATUSES;

export const SOURCE_LABELS: Record<ArSource, string> = {
  instagram: "Instagram",
  spotify: "Spotify",
  youtube: "YouTube",
  vampr: "Vampr",
  reddit: "Reddit",
  website: "Website",
  local: "Local",
  referral: "Referral",
  manual: "Manual",
  other: "Other"
};

export const PRIORITY_LABELS: Record<ArPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High"
};

export const FIT_SCORE_CATEGORY_LABELS: Record<FitScoreCategory, string> = {
  genre: "Genre compatibility",
  musicalInterest: "Musical interest",
  productionOpportunity: "Production opportunity",
  professionalism: "Professionalism",
  recentActivity: "Recent activity",
  audienceBusiness: "Audience/business potential",
  personalEnthusiasm: "Personal enthusiasm"
};

export const MISSING_SCHEMA_MESSAGE = "The A&R module is not available until the latest Supabase migration is applied.";

/**
 * Rewrites the data layer's generic MIGRATION_HINT (lib/ar/repository.ts) into the one
 * user-safe wording every Control Center surface uses for this condition — never a raw
 * Postgrest/Supabase error, and never a table or column name, reaches the browser. Same
 * pattern as lib/sales/display.ts's friendlySalesMessage / lib/content/display.ts's
 * friendlyContentMessage.
 */
export function friendlyArMessage(message: string): string {
  if (message.toLowerCase().includes("has migration")) return MISSING_SCHEMA_MESSAGE;
  return message;
}
