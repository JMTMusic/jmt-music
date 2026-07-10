"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getControlCenterRole } from "@/lib/control-center/access";
import { siteRegistry } from "@/lib/control-center/site-registry";
import type { CommunicationDirection } from "@/lib/control-center/types";

export type CommunicationMutationState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Record<string, string>;
  communicationId?: string;
};

export type CommunicationActionResult = { status: "error" | "success"; message: string; communicationId?: string };

const initialState: CommunicationMutationState = { status: "idle", message: "" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const DIRECTIONS: CommunicationDirection[] = ["inbound", "outbound", "internal"];

function optionalText(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) || "").trim();
  return value || null;
}

/** Logs one manual communication record against a client, optionally linked to a project. */
export async function logCommunication(
  _previousState: CommunicationMutationState = initialState,
  formData: FormData
): Promise<CommunicationMutationState> {
  const userId = process.env.CONTROL_CENTER_SUPABASE_USER_ID;
  if (!userId) return { status: "error", message: "Control Center user mapping is not configured." };

  const requestedSiteId = String(formData.get("property") || "");
  const selectedSite = siteRegistry.find((site) => site.id === requestedSiteId);
  const clientId = String(formData.get("client_id") || "");
  const projectId = optionalText(formData, "project_id");
  const direction = String(formData.get("direction") || "") as CommunicationDirection;
  const type = String(formData.get("type") || "").trim();
  const platform = optionalText(formData, "platform");
  const subject = optionalText(formData, "subject");
  const body = String(formData.get("body") || "").trim();
  const sentAtRaw = optionalText(formData, "sent_at");
  const fieldErrors: Record<string, string> = {};

  if (!selectedSite) fieldErrors.property = "Select a valid property.";
  if (!uuidPattern.test(clientId)) fieldErrors.client_id = "Select a valid lead.";
  if (projectId && !uuidPattern.test(projectId)) fieldErrors.project_id = "Select a valid project.";
  if (!DIRECTIONS.includes(direction)) fieldErrors.direction = "Select a valid direction.";
  if (type.length < 1 || type.length > 80) fieldErrors.type = "Use 1–80 characters.";
  if (body.length < 1 || body.length > 5000) fieldErrors.body = "Use 1–5,000 characters.";

  let sentAt = new Date();
  if (sentAtRaw) {
    sentAt = new Date(sentAtRaw);
    if (Number.isNaN(sentAt.getTime())) fieldErrors.sent_at = "Enter a valid date and time.";
    else if (sentAt.getTime() > Date.now() + 1000 * 60 * 60 * 24) fieldErrors.sent_at = "Date cannot be more than a day in the future.";
  }

  if (Object.keys(fieldErrors).length) return { status: "error", message: "Please correct the highlighted fields.", fieldErrors };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to log communications." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite!.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: client } = await supabase.from("clients").select("id").eq("id", clientId).eq("property_id", property.id).maybeSingle();
    if (!client) return { status: "error", message: "That lead does not belong to the selected property." };

    if (projectId) {
      const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("property_id", property.id).maybeSingle();
      if (!project) return { status: "error", message: "That project does not belong to the selected property." };
    }

    const { data, error } = await supabase
      .from("client_messages")
      .insert({
        client_id: clientId,
        property_id: property.id,
        project_id: projectId,
        direction,
        type,
        platform,
        subject,
        body,
        sent_at: sentAt.toISOString(),
        source: "manual",
        created_by: userId
      })
      .select("id")
      .single();

    if (error || !data) return { status: "error", message: "The communication could not be logged." };

    revalidatePath(`/control-center/growth/leads/${clientId}`);
    revalidatePath("/control-center/growth/communications");
    revalidatePath("/control-center/growth");
    return { status: "success", message: "Communication logged.", communicationId: data.id };
  } catch {
    return { status: "error", message: "The communication could not be logged. Please try again." };
  }
}

/** Edits an existing manual communication record — e.g. fixing a typo. Updates updated_at. */
export async function updateCommunication(
  _previousState: CommunicationMutationState = initialState,
  formData: FormData
): Promise<CommunicationMutationState> {
  const requestedSiteId = String(formData.get("property") || "");
  const selectedSite = siteRegistry.find((site) => site.id === requestedSiteId);
  const communicationId = String(formData.get("communication_id") || "");
  const direction = String(formData.get("direction") || "") as CommunicationDirection;
  const type = String(formData.get("type") || "").trim();
  const platform = optionalText(formData, "platform");
  const subject = optionalText(formData, "subject");
  const body = String(formData.get("body") || "").trim();
  const fieldErrors: Record<string, string> = {};

  if (!selectedSite) fieldErrors.property = "Select a valid property.";
  if (!uuidPattern.test(communicationId)) fieldErrors.communication_id = "Select a valid communication.";
  if (!DIRECTIONS.includes(direction)) fieldErrors.direction = "Select a valid direction.";
  if (type.length < 1 || type.length > 80) fieldErrors.type = "Use 1–80 characters.";
  if (body.length < 1 || body.length > 5000) fieldErrors.body = "Use 1–5,000 characters.";

  if (Object.keys(fieldErrors).length) return { status: "error", message: "Please correct the highlighted fields.", fieldErrors };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to edit communications." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite!.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: existing } = await supabase.from("client_messages").select("id, client_id").eq("id", communicationId).eq("property_id", property.id).maybeSingle();
    if (!existing) return { status: "error", message: "That communication does not belong to the selected property." };

    const { error } = await supabase
      .from("client_messages")
      .update({ direction, type, platform, subject, body, updated_at: new Date().toISOString() })
      .eq("id", communicationId)
      .eq("property_id", property.id);

    if (error) return { status: "error", message: "The communication could not be updated." };

    revalidatePath(`/control-center/growth/leads/${existing.client_id}`);
    revalidatePath("/control-center/growth/communications");
    return { status: "success", message: "Communication updated.", communicationId };
  } catch {
    return { status: "error", message: "The communication could not be updated. Please try again." };
  }
}

/**
 * Deletes a communication record. Owner-only by explicit application-layer check —
 * relationship history is more sensitive than most other records in this system.
 * RLS is the final enforcement layer regardless: client_messages has no editor-delete
 * policy, so this check is defense-in-depth, not the only gate.
 */
export async function deleteCommunication(input: { property: string; communicationId: string }): Promise<CommunicationActionResult> {
  const selectedSite = siteRegistry.find((site) => site.id === input.property);
  if (!selectedSite) return { status: "error", message: "Select a valid property." };
  if (!uuidPattern.test(input.communicationId)) return { status: "error", message: "Select a valid communication." };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner") return { status: "error", message: "Only an owner can delete communication records." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: existing } = await supabase.from("client_messages").select("id, client_id").eq("id", input.communicationId).eq("property_id", property.id).maybeSingle();
    if (!existing) return { status: "error", message: "That communication does not belong to the selected property." };

    const { error } = await supabase.from("client_messages").delete().eq("id", input.communicationId).eq("property_id", property.id);
    if (error) return { status: "error", message: "The communication could not be deleted." };

    revalidatePath(`/control-center/growth/leads/${existing.client_id}`);
    revalidatePath("/control-center/growth/communications");
    return { status: "success", message: "Communication deleted." };
  } catch {
    return { status: "error", message: "The communication could not be deleted. Please try again." };
  }
}
