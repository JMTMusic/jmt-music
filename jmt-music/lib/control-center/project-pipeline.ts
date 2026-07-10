import type { Project, ProjectPhase } from "./types";

const PHASE_NEXT_ACTION: Record<ProjectPhase, string> = {
  not_started: "Kick off",
  in_progress: "Continue work",
  finishing: "Finish and polish",
  ready: "Release it",
  done: "No action needed"
};

const STALE_THRESHOLD_DAYS: Record<ProjectPhase, number> = {
  not_started: 14,
  in_progress: 7,
  finishing: 5,
  ready: 3,
  done: Infinity
};

export type WorkloadZone = "comfortable" | "busy" | "overloaded";

/** Active project count at or below this is a comfortable load. */
export const DEFAULT_WORKLOAD_CEILING = 6;

function daysBetween(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((to.getTime() - from.getTime()) / msPerDay);
}

/** Human-readable next action for one project, generalized across all project types. */
export function getProjectNextAction(project: Project): string {
  if (project.nextActionOverride) return project.nextActionOverride;

  if (project.isWaiting) {
    return project.waitingNote ? `Waiting: ${project.waitingNote}` : "Waiting on someone else";
  }

  const phaseAction = PHASE_NEXT_ACTION[project.phase];
  return project.detailStage ? `${phaseAction}: ${project.detailStage}` : phaseAction;
}

/** Days since this project last changed phase. */
export function getDaysInStage(project: Project, now: Date = new Date()): number {
  return daysBetween(new Date(project.stageChangedAt), now);
}

/** Whether a project has sat in its current phase longer than is healthy for that phase. */
export function isProjectStale(project: Project, now: Date = new Date()): boolean {
  if (project.phase === "done") return false;
  return getDaysInStage(project, now) >= STALE_THRESHOLD_DAYS[project.phase];
}

/** Days since a waiting project started waiting; null if it isn't currently waiting. */
export function getDaysWaiting(project: Project, now: Date = new Date()): number | null {
  if (!project.isWaiting || !project.waitingSince) return null;
  return daysBetween(new Date(project.waitingSince), now);
}

/** Classifies an active project count against a comfortable ceiling for the workload meter. */
export function getWorkloadZone(
  activeCount: number,
  ceiling: number = DEFAULT_WORKLOAD_CEILING
): WorkloadZone {
  if (activeCount <= ceiling) return "comfortable";
  if (activeCount <= ceiling + Math.ceil(ceiling / 2)) return "busy";
  return "overloaded";
}
