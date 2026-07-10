import type { CommunicationDirection } from "./types";

/**
 * Suggested communication types — free text in the database (same convention as
 * projects.detail_stage), these are UI hints only, not an enforced list.
 */
export const COMMUNICATION_TYPE_OPTIONS = [
  "Email",
  "Instagram",
  "Website Inquiry",
  "Fiverr",
  "AirGigs",
  "SoundBetter",
  "Phone Call",
  "Meeting",
  "Proposal",
  "Contract",
  "Invoice",
  "Delivery",
  "Follow-up",
  "Internal Note"
];

export const DIRECTION_LABELS: Record<CommunicationDirection, string> = {
  inbound: "Inbound",
  outbound: "Outbound",
  internal: "Internal"
};

/**
 * Visual treatment for each direction. Distinguishes inbound/outbound/internal by icon
 * and label, not color alone, per accessibility requirement.
 */
export const DIRECTION_META: Record<CommunicationDirection, { className: string }> = {
  inbound: { className: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" },
  outbound: { className: "border-sky-300/25 bg-sky-300/10 text-sky-200" },
  internal: { className: "border-slate-300/20 bg-white/[0.04] text-slate-300" }
};
