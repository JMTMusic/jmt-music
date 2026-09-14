"use server";

import { revalidatePath } from "next/cache";
import { getControlCenterRole } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { siteRegistry } from "@/lib/control-center/site-registry";
import { PORTAL_STAGE_NAMES } from "@/lib/client-portal/repository";
import type { PortalStageName, PortalStageStatus } from "@/lib/client-portal/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type StageActionState = { status: "idle" | "success" | "error"; message: string };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const statuses: PortalStageStatus[] = ["not_started", "in_progress", "ready", "complete"];

export async function updatePortalStageAction(_previous: StageActionState, formData: FormData): Promise<StageActionState> {
  const propertySlug = String(formData.get("property") || "");
  const projectId = String(formData.get("projectId") || "");
  const stage = String(formData.get("stage") || "") as PortalStageName;
  const status = String(formData.get("status") || "") as PortalStageStatus;
  const clientNote = String(formData.get("clientNote") || "").trim() || null;
  const progressPctRaw = formData.get("progressPct");
  const progressPct = Math.max(0, Math.min(100, Math.round(Number(progressPctRaw) || 0)));
  if (!uuidPattern.test(projectId) || !siteRegistry.some((site) => site.id === propertySlug)) return { status: "error", message: "Invalid project." };
  if (!PORTAL_STAGE_NAMES.includes(stage) || !statuses.includes(status) || (clientNote && clientNote.length > 500)) return { status: "error", message: "Check the stage details." };
  if (progressPctRaw !== null && Number.isNaN(Number(progressPctRaw))) return { status: "error", message: "Progress must be a number between 0 and 100." };
  const role = await getControlCenterRole();
  if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to update stages." };
  try {
    const supabase = createSupabaseAdminClient();
    const site = getSiteConfig(propertySlug);
    const { data: property } = await supabase.from("properties").select("id").eq("slug", site.id).maybeSingle();
    if (!property) return { status: "error", message: "Property not found." };
    const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("property_id", property.id).maybeSingle();
    if (!project) return { status: "error", message: "Project not found." };
    const { error } = await supabase.from("project_portal_stages").upsert({ project_id: projectId, property_id: property.id, stage, status, progress_pct: progressPct, client_note: clientNote, updated_at: new Date().toISOString() });
    if (error) return { status: "error", message: "Stage could not be saved." };
    revalidatePath(`/control-center/projects/${projectId}`);
    return { status: "success", message: `${stage[0].toUpperCase()}${stage.slice(1)} updated.` };
  } catch { return { status: "error", message: "Stage could not be saved." }; }
}
