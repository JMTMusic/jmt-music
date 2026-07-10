"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getControlCenterRole } from "@/lib/control-center/access";
import { siteRegistry } from "@/lib/control-center/site-registry";
import type { ProjectPhase, ProjectType } from "@/lib/control-center/types";

export type ProjectActionResult = {
  status: "error" | "success";
  message: string;
  projectId?: string;
};

const PROJECT_TYPES: ProjectType[] = ["beat", "client_work", "sync", "website", "content", "other"];
const PROJECT_PHASES: ProjectPhase[] = ["not_started", "in_progress", "finishing", "ready", "done"];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

/**
 * Creates one workflow-tracking project for the explicitly selected property.
 * `client_id`/`beat_id` are optional and, when supplied, must belong to the same property.
 */
export async function createProject(input: {
  property: string;
  type: ProjectType;
  title: string;
  clientId?: string | null;
  beatId?: string | null;
  targetDate?: string | null;
}): Promise<ProjectActionResult> {
  const userId = process.env.CONTROL_CENTER_SUPABASE_USER_ID;
  if (!userId) return { status: "error", message: "Control Center user mapping is not configured." };

  const selectedSite = siteRegistry.find((site) => site.id === input.property);
  if (!selectedSite) return { status: "error", message: "Select a valid property." };
  if (!PROJECT_TYPES.includes(input.type)) return { status: "error", message: "Select a valid project type." };
  const title = input.title.trim();
  if (title.length < 2 || title.length > 160) return { status: "error", message: "Title must be 2-160 characters." };
  if (input.clientId && !uuidPattern.test(input.clientId)) return { status: "error", message: "Select a valid client." };
  if (input.beatId && !uuidPattern.test(input.beatId)) return { status: "error", message: "Select a valid beat." };
  if (input.targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.targetDate)) return { status: "error", message: "Use a valid target date." };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") {
      return { status: "error", message: "You do not have permission to create projects." };
    }

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", selectedSite.id)
      .maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    if (input.clientId) {
      const { data: client } = await supabase.from("clients").select("id").eq("id", input.clientId).eq("property_id", property.id).maybeSingle();
      if (!client) return { status: "error", message: "That client does not belong to the selected property." };
    }
    if (input.beatId) {
      const { data: beat } = await supabase.from("beats").select("id").eq("id", input.beatId).eq("property_id", property.id).maybeSingle();
      if (!beat) return { status: "error", message: "That beat does not belong to the selected property." };
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        property_id: property.id,
        type: input.type,
        title,
        phase: "not_started",
        client_id: input.clientId || null,
        beat_id: input.beatId || null,
        target_date: input.targetDate || null,
        created_by: userId
      })
      .select("id")
      .single();
    if (error || !data) return { status: "error", message: "The project could not be created." };

    revalidatePath("/control-center/projects");
    return { status: "success", message: "Project created successfully.", projectId: data.id };
  } catch {
    return { status: "error", message: "The project could not be created. Please try again." };
  }
}

/**
 * Moves one property-scoped project to a new phase and records the stage change time,
 * which is what staleness in `project-pipeline.ts` is measured against.
 */
export async function updateProjectPhase(input: {
  property: string;
  projectId: string;
  phase: ProjectPhase;
  detailStage?: string | null;
}): Promise<ProjectActionResult> {
  const selectedSite = siteRegistry.find((site) => site.id === input.property);
  if (!selectedSite) return { status: "error", message: "Select a valid property." };
  if (!uuidPattern.test(input.projectId)) return { status: "error", message: "Select a valid project." };
  if (!PROJECT_PHASES.includes(input.phase)) return { status: "error", message: "Select a valid phase." };
  const detailStage = input.detailStage?.trim() || null;
  if (detailStage && detailStage.length > 120) return { status: "error", message: "Stage detail must be 120 characters or fewer." };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") {
      return { status: "error", message: "You do not have permission to update project phase." };
    }

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", selectedSite.id)
      .maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: existing } = await supabase.from("projects").select("id").eq("id", input.projectId).eq("property_id", property.id).maybeSingle();
    if (!existing) return { status: "error", message: "That project does not belong to the selected property." };

    const { error } = await supabase
      .from("projects")
      .update({
        phase: input.phase,
        detail_stage: detailStage,
        stage_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id)
      .eq("property_id", property.id);
    if (error) return { status: "error", message: "The project phase could not be updated." };

    revalidatePath("/control-center/projects");
    return { status: "success", message: "Project phase updated.", projectId: existing.id };
  } catch {
    return { status: "error", message: "The project phase could not be updated. Please try again." };
  }
}

/**
 * Sets or clears the waiting flag on one property-scoped project. Turning waiting on
 * starts `waiting_since` only if it wasn't already waiting; turning it off clears both.
 */
export async function setProjectWaiting(input: {
  property: string;
  projectId: string;
  isWaiting: boolean;
  waitingNote?: string | null;
}): Promise<ProjectActionResult> {
  const selectedSite = siteRegistry.find((site) => site.id === input.property);
  if (!selectedSite) return { status: "error", message: "Select a valid property." };
  if (!uuidPattern.test(input.projectId)) return { status: "error", message: "Select a valid project." };
  const waitingNote = input.waitingNote?.trim() || null;
  if (waitingNote && waitingNote.length > 500) return { status: "error", message: "Waiting note must be 500 characters or fewer." };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") {
      return { status: "error", message: "You do not have permission to update project waiting status." };
    }

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", selectedSite.id)
      .maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: existing } = await supabase
      .from("projects")
      .select("id, is_waiting, waiting_since")
      .eq("id", input.projectId)
      .eq("property_id", property.id)
      .maybeSingle();
    if (!existing) return { status: "error", message: "That project does not belong to the selected property." };

    const update = input.isWaiting
      ? {
          is_waiting: true,
          waiting_note: waitingNote,
          waiting_since: existing.is_waiting && existing.waiting_since ? existing.waiting_since : new Date().toISOString()
        }
      : { is_waiting: false, waiting_note: null, waiting_since: null };

    const { error } = await supabase
      .from("projects")
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("property_id", property.id);
    if (error) return { status: "error", message: "The project waiting status could not be updated." };

    revalidatePath("/control-center/projects");
    return {
      status: "success",
      message: input.isWaiting ? "Project marked as waiting." : "Project waiting status cleared.",
      projectId: existing.id
    };
  } catch {
    return { status: "error", message: "The project waiting status could not be updated. Please try again." };
  }
}
