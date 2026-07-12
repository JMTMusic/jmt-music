import { SALES_STATUSES } from "./types";
import type { SalesPlatform, SalesProbability, SalesServiceType, SalesStatus } from "./types";

export const STATUS_LABELS: Record<SalesStatus, string> = {
  new_lead: "New Lead",
  conversation: "Conversation",
  proposal_draft: "Proposal Draft",
  proposal_sent: "Proposal Sent",
  waiting: "Waiting",
  negotiating: "Negotiating",
  won: "Won",
  lost: "Lost",
  converted: "Converted"
};

/** Fixed left-to-right pipeline order for the status select and list filters. */
export const STATUS_ORDER: readonly SalesStatus[] = SALES_STATUSES;

/**
 * Pipeline board columns. 'Proposal Sent / Waiting' deliberately merges two statuses into
 * one column — they read as the same "ball is in their court" moment on a board, even
 * though they stay distinct statuses everywhere else (list filters, the detail page's
 * status control). 'converted' has no column — a converted opportunity is done being a
 * sales opportunity; it lives in the board's collapsed "Converted" section instead, the
 * same way the Lead Pipeline board handles archived leads.
 */
export const BOARD_COLUMNS: { key: string; label: string; statuses: SalesStatus[] }[] = [
  { key: "new_lead", label: "New Lead", statuses: ["new_lead"] },
  { key: "conversation", label: "Conversation", statuses: ["conversation"] },
  { key: "proposal_draft", label: "Proposal Draft", statuses: ["proposal_draft"] },
  { key: "proposal_sent", label: "Proposal Sent / Waiting", statuses: ["proposal_sent", "waiting"] },
  { key: "negotiating", label: "Negotiating", statuses: ["negotiating"] },
  { key: "won", label: "Won", statuses: ["won"] },
  { key: "lost", label: "Lost", statuses: ["lost"] }
];

export const PLATFORM_LABELS: Record<SalesPlatform, string> = {
  airgigs: "AirGigs",
  fiverr: "Fiverr",
  soundbetter: "SoundBetter",
  instagram: "Instagram",
  website: "Website",
  email: "Email",
  referral: "Referral",
  local: "Local",
  other: "Other"
};

export const SERVICE_TYPE_LABELS: Record<SalesServiceType, string> = {
  production: "Production",
  mixing: "Mixing",
  mastering: "Mastering",
  production_mix_master: "Production, Mixing & Mastering",
  session_piano: "Session Piano",
  session_keys: "Session Keys",
  beat_license: "Beat License",
  custom: "Custom",
  other: "Other"
};

export const PROBABILITY_LABELS: Record<SalesProbability, string> = {
  low: "Low",
  medium: "Medium",
  high: "High"
};

export const MISSING_SCHEMA_MESSAGE = "The Sales module is not available until the latest Supabase migration is applied.";

/**
 * Rewrites the data layer's generic MIGRATION_HINT (lib/sales/repository.ts) into the one
 * user-safe wording every Control Center surface uses for this condition — never a raw
 * Postgrest/Supabase error, and never a table or column name, reaches the browser. Same
 * pattern as lib/content/display.ts's friendlyContentMessage, shared by the action layer
 * and every page that reads from lib/sales/repository.ts directly.
 */
export function friendlySalesMessage(message: string): string {
  if (message.toLowerCase().includes("has migration")) return MISSING_SCHEMA_MESSAGE;
  return message;
}
