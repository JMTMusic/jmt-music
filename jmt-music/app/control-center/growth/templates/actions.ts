"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getControlCenterRole } from "@/lib/control-center/access";
import { siteRegistry } from "@/lib/control-center/site-registry";

export type TemplateMutationState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Record<string, string>;
  templateId?: string;
};

export type TemplateActionResult = { status: "error" | "success"; message: string; templateId?: string };

const initialState: TemplateMutationState = { status: "idle", message: "" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

function optionalText(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) || "").trim();
  return value || null;
}

export async function createTemplate(
  _previousState: TemplateMutationState = initialState,
  formData: FormData
): Promise<TemplateMutationState> {
  const userId = process.env.CONTROL_CENTER_SUPABASE_USER_ID;
  if (!userId) return { status: "error", message: "Control Center user mapping is not configured." };

  const requestedSiteId = String(formData.get("property") || "");
  const selectedSite = siteRegistry.find((site) => site.id === requestedSiteId);
  const category = String(formData.get("category") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const description = optionalText(formData, "description");
  const tagsRaw = optionalText(formData, "tags");
  const tags = tagsRaw ? tagsRaw.split(",").map((tag) => tag.trim()).filter(Boolean) : [];
  const sortOrderValue = optionalText(formData, "sort_order");
  const fieldErrors: Record<string, string> = {};

  if (!selectedSite) fieldErrors.property = "Select a valid property.";
  if (category.length < 1 || category.length > 80) fieldErrors.category = "Use 1–80 characters.";
  if (title.length < 1 || title.length > 160) fieldErrors.title = "Use 1–160 characters.";
  if (content.length < 1 || content.length > 10000) fieldErrors.content = "Use 1–10,000 characters.";
  const sortOrder = sortOrderValue === null ? 0 : Number(sortOrderValue);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) fieldErrors.sort_order = "Use a whole number from 0–10,000.";

  if (Object.keys(fieldErrors).length) return { status: "error", message: "Please correct the highlighted fields.", fieldErrors };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to create templates." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite!.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data, error } = await supabase
      .from("template_library")
      .insert({ property_id: property.id, category, title, content, description, tags, sort_order: sortOrder, created_by: userId })
      .select("id")
      .single();

    if (error || !data) return { status: "error", message: "The template could not be created." };

    revalidatePath("/control-center/growth/templates");
    return { status: "success", message: "Template created.", templateId: data.id };
  } catch {
    return { status: "error", message: "The template could not be created. Please try again." };
  }
}

export async function updateTemplate(
  _previousState: TemplateMutationState = initialState,
  formData: FormData
): Promise<TemplateMutationState> {
  const requestedSiteId = String(formData.get("property") || "");
  const selectedSite = siteRegistry.find((site) => site.id === requestedSiteId);
  const templateId = String(formData.get("template_id") || "");
  const category = String(formData.get("category") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const description = optionalText(formData, "description");
  const tagsRaw = optionalText(formData, "tags");
  const tags = tagsRaw ? tagsRaw.split(",").map((tag) => tag.trim()).filter(Boolean) : [];
  const sortOrderValue = optionalText(formData, "sort_order");
  const fieldErrors: Record<string, string> = {};

  if (!selectedSite) fieldErrors.property = "Select a valid property.";
  if (!uuidPattern.test(templateId)) fieldErrors.template_id = "Select a valid template.";
  if (category.length < 1 || category.length > 80) fieldErrors.category = "Use 1–80 characters.";
  if (title.length < 1 || title.length > 160) fieldErrors.title = "Use 1–160 characters.";
  if (content.length < 1 || content.length > 10000) fieldErrors.content = "Use 1–10,000 characters.";
  const sortOrder = sortOrderValue === null ? 0 : Number(sortOrderValue);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) fieldErrors.sort_order = "Use a whole number from 0–10,000.";

  if (Object.keys(fieldErrors).length) return { status: "error", message: "Please correct the highlighted fields.", fieldErrors };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to update templates." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite!.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: existing } = await supabase.from("template_library").select("id").eq("id", templateId).eq("property_id", property.id).maybeSingle();
    if (!existing) return { status: "error", message: "That template does not belong to the selected property." };

    const { error } = await supabase
      .from("template_library")
      .update({ category, title, content, description, tags, sort_order: sortOrder, updated_at: new Date().toISOString() })
      .eq("id", templateId)
      .eq("property_id", property.id);

    if (error) return { status: "error", message: "The template could not be updated." };

    revalidatePath("/control-center/growth/templates");
    return { status: "success", message: "Template updated.", templateId };
  } catch {
    return { status: "error", message: "The template could not be updated. Please try again." };
  }
}

/** Soft-archives or restores a template. No hard delete in v1. */
export async function archiveTemplate(input: { property: string; templateId: string; isArchived: boolean }): Promise<TemplateActionResult> {
  const selectedSite = siteRegistry.find((site) => site.id === input.property);
  if (!selectedSite) return { status: "error", message: "Select a valid property." };
  if (!uuidPattern.test(input.templateId)) return { status: "error", message: "Select a valid template." };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to archive templates." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: existing } = await supabase.from("template_library").select("id").eq("id", input.templateId).eq("property_id", property.id).maybeSingle();
    if (!existing) return { status: "error", message: "That template does not belong to the selected property." };

    const { error } = await supabase
      .from("template_library")
      .update({ is_archived: input.isArchived, updated_at: new Date().toISOString() })
      .eq("id", input.templateId)
      .eq("property_id", property.id);

    if (error) return { status: "error", message: "The template could not be updated." };

    revalidatePath("/control-center/growth/templates");
    return { status: "success", message: input.isArchived ? "Template archived." : "Template restored.", templateId: input.templateId };
  } catch {
    return { status: "error", message: "The template could not be updated. Please try again." };
  }
}
