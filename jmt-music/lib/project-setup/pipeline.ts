import type { ProjectSetupStatus } from "./types";

export type ProjectSetupAction = "start" | "submit" | "confirm" | "reopen";

/**
 * Pure status-transition rules for a Project Setup's lifecycle:
 *
 *   draft --(start)--> in_progress --(submit)--> submitted --(confirm)--> confirmed
 *                                                     ^  |
 *                                                     |  (reopen)
 *                                                     +--in_progress<-------+
 *                                                            (reopen from confirmed too)
 *
 * "start" is idempotent from in_progress (re-opening the link mid-way through shouldn't
 * error); every other action is a one-way door guarded by an explicit allow-list — there
 * is no generic "any status to any status" transition anywhere in this module.
 */
const ALLOWED_CURRENT_STATUSES: Record<ProjectSetupAction, readonly ProjectSetupStatus[]> = {
  start: ["draft", "in_progress"],
  submit: ["draft", "in_progress"],
  confirm: ["submitted"],
  reopen: ["submitted", "confirmed"]
};

export function canPerformAction(action: ProjectSetupAction, currentStatus: ProjectSetupStatus): boolean {
  return ALLOWED_CURRENT_STATUSES[action].includes(currentStatus);
}

/** The status a Setup moves to after `action` succeeds. Callers must check canPerformAction first. */
export function resultingStatus(action: ProjectSetupAction, currentStatus: ProjectSetupStatus): ProjectSetupStatus {
  switch (action) {
    case "start":
      return currentStatus === "draft" ? "in_progress" : currentStatus;
    case "submit":
      return "submitted";
    case "confirm":
      return "confirmed";
    case "reopen":
      return "in_progress";
    default:
      return currentStatus;
  }
}

/** Whether `start` should actually set startedAt — only the first time, never overwriting an existing value. */
export function shouldSetStartedAt(currentStartedAt: string | null): boolean {
  return currentStartedAt === null;
}
