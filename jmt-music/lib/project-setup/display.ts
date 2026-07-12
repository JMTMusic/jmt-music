import type { ProjectSetupStatus } from "./types";

/** Calm, non-alarming labels for the Setup lifecycle status. "Access Revoked" is a separate, orthogonal indicator — see project-setup-panel.tsx. */
export const STATUS_LABELS: Record<ProjectSetupStatus, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  submitted: "Submitted",
  confirmed: "Confirmed"
};

export const NO_SETUP_LABEL = "Not Created";
export const ACCESS_REVOKED_LABEL = "Access Revoked";
