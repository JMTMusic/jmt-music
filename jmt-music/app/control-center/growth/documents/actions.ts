"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getControlCenterRole } from "@/lib/control-center/access";
import { siteRegistry } from "@/lib/control-center/site-registry";
import { DOCUMENT_STATUSES, DOCUMENT_TYPES } from "@/lib/control-center/document-display";
import type { DocumentStatus, DocumentType } from "@/lib/control-center/types";

export type DocumentMutationState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Record<string, string>;
  documentId?: string;
};

const initialState: DocumentMutationState = { status: "idle", message: "" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

function optionalText(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) || "").trim();
  return value || null;
}

export async function createDocumentRecord(
  _previousState: DocumentMutationState = initialState,
  formData: FormData
): Promise<DocumentMutationState> {
  const userId = process.env.CONTROL_CENTER_SUPABASE_USER_ID;
  if (!userId) return { status: "error", message: "Control Center user mapping is not configured." };

  const requestedSiteId = String(formData.get("property") || "");
  const selectedSite = siteRegistry.find((site) => site.id === requestedSiteId);
  const type = String(formData.get("type") || "") as DocumentType;
  const status = String(formData.get("status") || "draft") as DocumentStatus;
  const title = String(formData.get("title") || "").trim();
  const clientId = optionalText(formData, "client_id");
  const projectId = optionalText(formData, "project_id");
  const notes = optionalText(formData, "notes");
  const externalUrl = optionalText(formData, "external_url");
  const fieldErrors: Record<string, string> = {};

  if (!selectedSite) fieldErrors.property = "Select a valid property.";
  if (!DOCUMENT_TYPES.includes(type)) fieldErrors.type = "Select a valid document type.";
  if (!DOCUMENT_STATUSES.includes(status)) fieldErrors.status = "Select a valid status.";
  if (title.length < 1 || title.length > 160) fieldErrors.title = "Use 1–160 characters.";
  if (clientId && !uuidPattern.test(clientId)) fieldErrors.client_id = "Select a valid lead.";
  if (projectId && !uuidPattern.test(projectId)) fieldErrors.project_id = "Select a valid project.";
  if (externalUrl) {
    try {
      if (new URL(externalUrl).protocol !== "https:") fieldErrors.external_url = "Use a secure https:// URL.";
    } catch {
      fieldErrors.external_url = "Enter a valid URL.";
    }
  }

  if (Object.keys(fieldErrors).length) return { status: "error", message: "Please correct the highlighted fields.", fieldErrors };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to create document records." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite!.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    if (clientId) {
      const { data: client } = await supabase.from("clients").select("id").eq("id", clientId).eq("property_id", property.id).maybeSingle();
      if (!client) return { status: "error", message: "That lead does not belong to the selected property." };
    }
    if (projectId) {
      const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("property_id", property.id).maybeSingle();
      if (!project) return { status: "error", message: "That project does not belong to the selected property." };
    }

    const { data, error } = await supabase
      .from("document_records")
      .insert({ property_id: property.id, type, status, title, client_id: clientId, project_id: projectId, notes, external_url: externalUrl, created_by: userId })
      .select("id")
      .single();

    if (error || !data) return { status: "error", message: "The document record could not be created." };

    revalidatePath("/control-center/growth/documents");
    return { status: "success", message: "Document record created.", documentId: data.id };
  } catch {
    return { status: "error", message: "The document record could not be created. Please try again." };
  }
}

export async function updateDocumentRecord(
  _previousState: DocumentMutationState = initialState,
  formData: FormData
): Promise<DocumentMutationState> {
  const requestedSiteId = String(formData.get("property") || "");
  const selectedSite = siteRegistry.find((site) => site.id === requestedSiteId);
  const documentId = String(formData.get("document_id") || "");
  const type = String(formData.get("type") || "") as DocumentType;
  const status = String(formData.get("status") || "draft") as DocumentStatus;
  const title = String(formData.get("title") || "").trim();
  const clientId = optionalText(formData, "client_id");
  const projectId = optionalText(formData, "project_id");
  const notes = optionalText(formData, "notes");
  const externalUrl = optionalText(formData, "external_url");
  const fieldErrors: Record<string, string> = {};

  if (!selectedSite) fieldErrors.property = "Select a valid property.";
  if (!uuidPattern.test(documentId)) fieldErrors.document_id = "Select a valid document record.";
  if (!DOCUMENT_TYPES.includes(type)) fieldErrors.type = "Select a valid document type.";
  if (!DOCUMENT_STATUSES.includes(status)) fieldErrors.status = "Select a valid status.";
  if (title.length < 1 || title.length > 160) fieldErrors.title = "Use 1–160 characters.";

  if (Object.keys(fieldErrors).length) return { status: "error", message: "Please correct the highlighted fields.", fieldErrors };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to update document records." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite!.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: existing } = await supabase.from("document_records").select("id").eq("id", documentId).eq("property_id", property.id).maybeSingle();
    if (!existing) return { status: "error", message: "That document record does not belong to the selected property." };

    const { error } = await supabase
      .from("document_records")
      .update({ type, status, title, client_id: clientId, project_id: projectId, notes, external_url: externalUrl, updated_at: new Date().toISOString() })
      .eq("id", documentId)
      .eq("property_id", property.id);

    if (error) return { status: "error", message: "The document record could not be updated." };

    revalidatePath("/control-center/growth/documents");
    return { status: "success", message: "Document record updated.", documentId };
  } catch {
    return { status: "error", message: "The document record could not be updated. Please try again." };
  }
}
