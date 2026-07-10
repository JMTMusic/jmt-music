import type { ProjectType } from "./types";

/** Shared display labels for project types, used by the Dashboard and Projects module. */
export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  beat: "Beat",
  client_work: "Client Work",
  sync: "Sync",
  website: "Website",
  content: "Content",
  other: "Other"
};
