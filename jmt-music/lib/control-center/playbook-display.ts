import type { PlayCategory, PlayStatus } from "./types";

/** Shared display labels for the Playbook's bounded category taxonomy. */
export const CATEGORY_LABELS: Record<PlayCategory, string> = {
  outreach: "Outreach",
  discovery: "Discovery",
  onboarding: "Onboarding",
  production: "Production",
  delivery: "Delivery",
  reviews: "Reviews",
  follow_up: "Follow-up",
  internal_sop: "Internal SOP"
};

/** Category column/section order — outreach-through-follow-up mirrors the client relationship funnel, Internal SOP last. */
export const CATEGORY_ORDER: PlayCategory[] = [
  "outreach",
  "discovery",
  "onboarding",
  "production",
  "delivery",
  "reviews",
  "follow_up",
  "internal_sop"
];

export const STATUS_LABELS: Record<PlayStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived"
};

/**
 * Suggested "Best Used For" contexts — free text in the database (this is where the old
 * free-text platform category now lives), these are UI hints only, not an enforced list.
 */
export const BEST_USED_FOR_OPTIONS = [
  "Instagram DM",
  "Facebook Message",
  "Email",
  "Website Inquiry Reply",
  "Fiverr",
  "AirGigs",
  "SoundBetter",
  "Networking",
  "Cold Outreach",
  "Phone Call",
  "In Person"
];
