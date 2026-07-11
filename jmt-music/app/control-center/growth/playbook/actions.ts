"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getControlCenterRole } from "@/lib/control-center/access";
import { siteRegistry } from "@/lib/control-center/site-registry";
import type { PlayCategory, PlayStatus } from "@/lib/control-center/types";

export type PlayMutationState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Record<string, string>;
  playId?: string;
};

export type PlayActionResult = { status: "error" | "success"; message: string; playId?: string };

const initialState: PlayMutationState = { status: "idle", message: "" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const CATEGORY_VALUES: PlayCategory[] = ["outreach", "discovery", "onboarding", "production", "delivery", "reviews", "follow_up", "internal_sop"];
const STATUS_VALUES: PlayStatus[] = ["draft", "active", "archived"];

function optionalText(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) || "").trim();
  return value || null;
}

function parseList(formData: FormData, key: string): string[] {
  const raw = String(formData.get(key) || "").trim();
  return raw ? raw.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

type ParsedPlayForm = {
  selectedSite: ReturnType<typeof siteRegistry.find>;
  category: string;
  title: string;
  purpose: string | null;
  bestUsedFor: string[];
  messageBody: string;
  variables: string[];
  internalNotes: string | null;
  tags: string[];
  sortOrder: number;
  fieldErrors: Record<string, string>;
};

function parsePlayForm(formData: FormData): ParsedPlayForm {
  const requestedSiteId = String(formData.get("property") || "");
  const selectedSite = siteRegistry.find((site) => site.id === requestedSiteId);
  const category = String(formData.get("category") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const purpose = optionalText(formData, "purpose");
  const bestUsedFor = parseList(formData, "best_used_for");
  const messageBody = String(formData.get("message_body") || "").trim();
  const variables = parseList(formData, "variables");
  const internalNotes = optionalText(formData, "internal_notes");
  const tags = parseList(formData, "tags");
  const sortOrderValue = optionalText(formData, "sort_order");
  const sortOrder = sortOrderValue === null ? 0 : Number(sortOrderValue);

  const fieldErrors: Record<string, string> = {};
  if (!selectedSite) fieldErrors.property = "Select a valid property.";
  if (!CATEGORY_VALUES.includes(category as PlayCategory)) fieldErrors.category = "Select a valid category.";
  if (title.length < 1 || title.length > 160) fieldErrors.title = "Use 1–160 characters.";
  if (messageBody.length < 1 || messageBody.length > 10000) fieldErrors.message_body = "Use 1–10,000 characters.";
  if (purpose && purpose.length > 400) fieldErrors.purpose = "Use up to 400 characters.";
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) fieldErrors.sort_order = "Use a whole number from 0–10,000.";

  return { selectedSite, category, title, purpose, bestUsedFor, messageBody, variables, internalNotes, tags, sortOrder, fieldErrors };
}

export async function createPlay(
  _previousState: PlayMutationState = initialState,
  formData: FormData
): Promise<PlayMutationState> {
  const userId = process.env.CONTROL_CENTER_SUPABASE_USER_ID;
  if (!userId) return { status: "error", message: "Control Center user mapping is not configured." };

  const parsed = parsePlayForm(formData);
  if (Object.keys(parsed.fieldErrors).length) return { status: "error", message: "Please correct the highlighted fields.", fieldErrors: parsed.fieldErrors };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to create Plays." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", parsed.selectedSite!.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data, error } = await supabase
      .from("communication_playbook")
      .insert({
        property_id: property.id,
        category: parsed.category,
        title: parsed.title,
        purpose: parsed.purpose,
        best_used_for: parsed.bestUsedFor,
        message_body: parsed.messageBody,
        variables: parsed.variables,
        internal_notes: parsed.internalNotes,
        tags: parsed.tags,
        sort_order: parsed.sortOrder,
        status: "draft",
        version_number: 1,
        created_by: userId
      })
      .select("id")
      .single();

    if (error || !data) return { status: "error", message: "The Play could not be created." };

    revalidatePath("/control-center/growth/playbook");
    return { status: "success", message: "Play created.", playId: data.id };
  } catch {
    return { status: "error", message: "The Play could not be created. Please try again." };
  }
}

/**
 * Updates a Play. Before applying the change, the current (pre-update) row is snapshotted
 * into communication_playbook_versions and version_number is bumped — this is what makes
 * "version history" real rather than just a number that increments with nothing behind it.
 */
export async function updatePlay(
  _previousState: PlayMutationState = initialState,
  formData: FormData
): Promise<PlayMutationState> {
  const userId = process.env.CONTROL_CENTER_SUPABASE_USER_ID;
  if (!userId) return { status: "error", message: "Control Center user mapping is not configured." };

  const playId = String(formData.get("play_id") || "");
  const parsed = parsePlayForm(formData);
  if (!uuidPattern.test(playId)) parsed.fieldErrors.play_id = "Select a valid Play.";
  if (Object.keys(parsed.fieldErrors).length) return { status: "error", message: "Please correct the highlighted fields.", fieldErrors: parsed.fieldErrors };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to update Plays." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", parsed.selectedSite!.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: existing, error: existingError } = await supabase
      .from("communication_playbook")
      .select("id, title, purpose, message_body, variables, internal_notes, version_number")
      .eq("id", playId)
      .eq("property_id", property.id)
      .maybeSingle();
    if (existingError || !existing) return { status: "error", message: "That Play does not belong to the selected property." };

    // Snapshot the pre-update state before it's overwritten.
    const { error: versionError } = await supabase.from("communication_playbook_versions").insert({
      playbook_id: existing.id,
      version_number: existing.version_number,
      title: existing.title,
      purpose: existing.purpose,
      message_body: existing.message_body,
      variables: existing.variables,
      internal_notes: existing.internal_notes,
      changed_by: userId
    });
    if (versionError) return { status: "error", message: "The Play's version history could not be saved — update cancelled." };

    const { error } = await supabase
      .from("communication_playbook")
      .update({
        category: parsed.category,
        title: parsed.title,
        purpose: parsed.purpose,
        best_used_for: parsed.bestUsedFor,
        message_body: parsed.messageBody,
        variables: parsed.variables,
        internal_notes: parsed.internalNotes,
        tags: parsed.tags,
        sort_order: parsed.sortOrder,
        version_number: existing.version_number + 1,
        updated_at: new Date().toISOString()
      })
      .eq("id", playId)
      .eq("property_id", property.id);

    if (error) return { status: "error", message: "The Play could not be updated." };

    revalidatePath("/control-center/growth/playbook");
    revalidatePath(`/control-center/growth/playbook/${playId}`);
    return { status: "success", message: "Play updated.", playId };
  } catch {
    return { status: "error", message: "The Play could not be updated. Please try again." };
  }
}

/** Copies a Play into a fresh draft — new id, version reset to 1, no version history carried over. */
export async function duplicatePlay(input: { property: string; playId: string }): Promise<PlayActionResult> {
  const userId = process.env.CONTROL_CENTER_SUPABASE_USER_ID;
  if (!userId) return { status: "error", message: "Control Center user mapping is not configured." };

  const selectedSite = siteRegistry.find((site) => site.id === input.property);
  if (!selectedSite) return { status: "error", message: "Select a valid property." };
  if (!uuidPattern.test(input.playId)) return { status: "error", message: "Select a valid Play." };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to duplicate Plays." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: existing, error: existingError } = await supabase
      .from("communication_playbook")
      .select("category, title, purpose, best_used_for, message_body, variables, internal_notes, tags, sort_order")
      .eq("id", input.playId)
      .eq("property_id", property.id)
      .maybeSingle();
    if (existingError || !existing) return { status: "error", message: "That Play does not belong to the selected property." };

    const { data, error } = await supabase
      .from("communication_playbook")
      .insert({
        property_id: property.id,
        category: existing.category,
        title: `${existing.title} (Copy)`,
        purpose: existing.purpose,
        best_used_for: existing.best_used_for,
        message_body: existing.message_body,
        variables: existing.variables,
        internal_notes: existing.internal_notes,
        tags: existing.tags,
        sort_order: existing.sort_order,
        status: "draft",
        version_number: 1,
        created_by: userId
      })
      .select("id")
      .single();

    if (error || !data) return { status: "error", message: "The Play could not be duplicated." };

    revalidatePath("/control-center/growth/playbook");
    return { status: "success", message: "Play duplicated.", playId: data.id };
  } catch {
    return { status: "error", message: "The Play could not be duplicated. Please try again." };
  }
}

/** Sets status (draft/active/archived). Covers both "Archive" and "restore to active" from the same action. */
export async function setPlayStatus(input: { property: string; playId: string; status: PlayStatus }): Promise<PlayActionResult> {
  const selectedSite = siteRegistry.find((site) => site.id === input.property);
  if (!selectedSite) return { status: "error", message: "Select a valid property." };
  if (!uuidPattern.test(input.playId)) return { status: "error", message: "Select a valid Play." };
  if (!STATUS_VALUES.includes(input.status)) return { status: "error", message: "Select a valid status." };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to update Plays." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: existing } = await supabase.from("communication_playbook").select("id").eq("id", input.playId).eq("property_id", property.id).maybeSingle();
    if (!existing) return { status: "error", message: "That Play does not belong to the selected property." };

    const { error } = await supabase
      .from("communication_playbook")
      .update({ status: input.status, updated_at: new Date().toISOString() })
      .eq("id", input.playId)
      .eq("property_id", property.id);

    if (error) return { status: "error", message: "The Play could not be updated." };

    revalidatePath("/control-center/growth/playbook");
    revalidatePath(`/control-center/growth/playbook/${input.playId}`);
    return { status: "success", message: input.status === "archived" ? "Play archived." : "Play updated.", playId: input.playId };
  } catch {
    return { status: "error", message: "The Play could not be updated. Please try again." };
  }
}

export async function togglePlayFavorite(input: { property: string; playId: string; isFavorite: boolean }): Promise<PlayActionResult> {
  const selectedSite = siteRegistry.find((site) => site.id === input.property);
  if (!selectedSite) return { status: "error", message: "Select a valid property." };
  if (!uuidPattern.test(input.playId)) return { status: "error", message: "Select a valid Play." };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to update Plays." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: existing } = await supabase.from("communication_playbook").select("id").eq("id", input.playId).eq("property_id", property.id).maybeSingle();
    if (!existing) return { status: "error", message: "That Play does not belong to the selected property." };

    const { error } = await supabase
      .from("communication_playbook")
      .update({ is_favorite: input.isFavorite, updated_at: new Date().toISOString() })
      .eq("id", input.playId)
      .eq("property_id", property.id);

    if (error) return { status: "error", message: "The Play could not be updated." };

    revalidatePath("/control-center/growth/playbook");
    revalidatePath(`/control-center/growth/playbook/${input.playId}`);
    return { status: "success", message: input.isFavorite ? "Added to favorites." : "Removed from favorites.", playId: input.playId };
  } catch {
    return { status: "error", message: "The Play could not be updated. Please try again." };
  }
}
