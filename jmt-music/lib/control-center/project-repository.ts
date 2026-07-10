import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Project, ProjectPhase, ProjectType, SiteConfig } from "./types";

type ProjectRow = {
  id: string;
  property_id: string;
  type: ProjectType;
  title: string;
  phase: ProjectPhase;
  detail_stage: string | null;
  stage_changed_at: string;
  client_id: string | null;
  beat_id: string | null;
  target_date: string | null;
  is_waiting: boolean;
  waiting_note: string | null;
  waiting_since: string | null;
  next_action_override: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectsResult = {
  projects: Project[];
  status: "empty" | "error" | "ready";
  detail: string;
};

export type ProjectWorkload = {
  type: ProjectType;
  activeCount: number;
};

function mapRow(row: ProjectRow): Project {
  return {
    id: row.id,
    propertyId: row.property_id,
    type: row.type,
    title: row.title,
    phase: row.phase,
    detailStage: row.detail_stage,
    stageChangedAt: row.stage_changed_at,
    clientId: row.client_id,
    beatId: row.beat_id,
    targetDate: row.target_date,
    isWaiting: row.is_waiting,
    waitingNote: row.waiting_note,
    waitingSince: row.waiting_since,
    nextActionOverride: row.next_action_override,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Reads every project for one validated property. This is the only round-trip:
 * Dashboard selectors (Today's Focus, Waiting On, Workload) all derive from
 * this result in memory rather than issuing their own queries.
 */
export async function getPropertyProjects(site: SiteConfig): Promise<ProjectsResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", site.id)
      .maybeSingle();

    if (propertyError || !property) {
      return {
        projects: [],
        status: "error",
        detail: propertyError ? "Property lookup failed" : "Property not found in Supabase"
      };
    }

    const { data, error } = await supabase
      .from("projects")
      .select(
        "id, property_id, type, title, phase, detail_stage, stage_changed_at, client_id, beat_id, target_date, is_waiting, waiting_note, waiting_since, next_action_override, created_by, created_at, updated_at"
      )
      .eq("property_id", property.id)
      .order("stage_changed_at", { ascending: true });

    if (error) {
      return { projects: [], status: "error", detail: "Supabase project query failed" };
    }

    const projects = ((data || []) as ProjectRow[]).map(mapRow);

    return {
      projects,
      status: projects.length ? "ready" : "empty",
      detail: projects.length
        ? `${projects.length} project${projects.length === 1 ? "" : "s"} from Supabase`
        : "No projects yet"
    };
  } catch {
    return { projects: [], status: "error", detail: "Supabase is not configured or reachable" };
  }
}

/**
 * Reads every project already linked to one client, for the Growth Engine's
 * "convert lead to project" duplicate-prevention check. A separate scoped query rather
 * than filtering `getPropertyProjects`'s result, since the caller (a server action) may
 * not already have the full property project list in memory.
 */
export async function getClientProjects(site: SiteConfig, clientId: string): Promise<ProjectsResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", site.id)
      .maybeSingle();

    if (propertyError || !property) {
      return {
        projects: [],
        status: "error",
        detail: propertyError ? "Property lookup failed" : "Property not found in Supabase"
      };
    }

    const { data, error } = await supabase
      .from("projects")
      .select(
        "id, property_id, type, title, phase, detail_stage, stage_changed_at, client_id, beat_id, target_date, is_waiting, waiting_note, waiting_since, next_action_override, created_by, created_at, updated_at"
      )
      .eq("property_id", property.id)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      return { projects: [], status: "error", detail: "Supabase project query failed" };
    }

    const projects = ((data || []) as ProjectRow[]).map(mapRow);
    return {
      projects,
      status: projects.length ? "ready" : "empty",
      detail: projects.length ? `${projects.length} linked project${projects.length === 1 ? "" : "s"}` : "No linked projects yet"
    };
  } catch {
    return { projects: [], status: "error", detail: "Supabase is not configured or reachable" };
  }
}

/** Today's Focus: active work that isn't blocked on someone/something else. */
export function selectTodaysFocus(projects: Project[]): Project[] {
  return projects.filter((project) => project.phase !== "done" && !project.isWaiting);
}

/** Waiting On: active work blocked on someone/something else. */
export function selectWaitingOn(projects: Project[]): Project[] {
  return projects.filter((project) => project.isWaiting);
}

/** Workload: active (non-done) project count, broken down by type. */
export function selectWorkload(projects: Project[]): ProjectWorkload[] {
  const counts = new Map<ProjectType, number>();
  for (const project of projects) {
    if (project.phase === "done") continue;
    counts.set(project.type, (counts.get(project.type) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([type, activeCount]) => ({ type, activeCount }));
}
