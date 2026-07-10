import type { LeadStage } from "./types";

/** Shared display labels for the Lead Pipeline stage, used by the Kanban board and Outreach Dashboard. */
export const STAGE_LABELS: Record<LeadStage, string> = {
  new_lead: "New Lead",
  qualified: "Qualified",
  conversation: "Conversation",
  proposal_sent: "Proposal Sent",
  negotiating: "Negotiating",
  booked: "Booked",
  project: "Project",
  repeat_client: "Repeat Client"
};

/** Kanban column order — the approved 8-stage lifecycle, left to right. */
export const STAGE_ORDER: LeadStage[] = [
  "new_lead",
  "qualified",
  "conversation",
  "proposal_sent",
  "negotiating",
  "booked",
  "project",
  "repeat_client"
];

/**
 * Suggested lead sources — free text in the database (same convention as
 * projects.detail_stage), these are UI hints only, not an enforced list.
 */
export const PLATFORM_OPTIONS = [
  "Instagram",
  "Email",
  "Website",
  "Fiverr",
  "AirGigs",
  "SoundBetter",
  "Referral",
  "Other"
];
