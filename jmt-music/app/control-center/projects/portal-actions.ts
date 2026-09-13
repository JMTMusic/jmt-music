"use server";

import { revalidatePath } from "next/cache";
import { getControlCenterRole } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { siteRegistry } from "@/lib/control-center/site-registry";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const DRIVE_URL_PATTERN = /^https:\/\/(drive|docs)\.google\.com\//i;

export type AddPortalFileState = { status: "idle" | "success" | "error"; message: string };

export async function addPortalFileAction(_previous: AddPortalFileState, formData: FormData): Promise<AddPortalFileState> {
  const role = await getControlCenterRole();
  if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to manage portal files." };

  const propertySlug = String(formData.get("property") || "");
  const projectId = String(formData.get("projectId") || "");
  const title = String(formData.get("title") || "").trim();
  const driveUrl = String(formData.get("driveUrl") || "").trim();
  const fileType = String(formData.get("fileType") || "other");
  const versionLabel = String(formData.get("versionLabel") || "").trim() || null;
  const note = String(formData.get("note") || "").trim() || null;
  if (!UUID_PATTERN.test(projectId) || !siteRegistry.some((site) => site.id === propertySlug)) return { status: "error", message: "Select a valid project and property." };
  if (!title || title.length > 160) return { status: "error", message: "Enter a file title under 160 characters." };
  if (!DRIVE_URL_PATTERN.test(driveUrl)) return { status: "error", message: "Paste a Google Drive or Google Docs link." };
  if (!["audio", "stems", "artwork", "document", "other"].includes(fileType)) return { status: "error", message: "Choose a valid file type." };

  try {
    const site = getSiteConfig(propertySlug);
    const supabase = createSupabaseAdminClient();
    const { data: property } = await supabase.from("properties").select("id").eq("slug", site.id).maybeSingle();
    if (!property) return { status: "error", message: "The selected property could not be found." };
    const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("property_id", property.id).maybeSingle();
    if (!project) return { status: "error", message: "That project does not belong to this property." };
    const { error } = await supabase.from("portal_files").insert({ property_id: property.id, project_id: project.id, title, drive_url: driveUrl, file_type: fileType, version_label: versionLabel, note, created_by: process.env.CONTROL_CENTER_SUPABASE_USER_ID || null });
    if (error) return { status: "error", message: "The file link could not be added. Apply the latest Supabase migration first." };
    revalidatePath(`/control-center/projects/${projectId}`);
    return { status: "success", message: "File added to the client portal." };
  } catch {
    return { status: "error", message: "The file link could not be added." };
  }
}
