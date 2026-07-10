"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getControlCenterRole } from "@/lib/control-center/access";
import { siteRegistry } from "@/lib/control-center/site-registry";
import { getClientProjects } from "@/lib/control-center/project-repository";
import { getSiteConfig } from "@/lib/control-center/data";
import { createProject } from "@/app/control-center/projects/actions";
import type { LeadStage, ProjectType } from "@/lib/control-center/types";

export type LeadMutationState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Record<string, string>;
  leadId?: string;
};

export type LeadActionResult = { status: "error" | "success"; message: string; leadId?: string };

export type ConvertLeadResult = {
  status: "error" | "success" | "needs_confirmation";
  message: string;
  projectId?: string;
  existingProjects?: { id: string; title: string; phase: string }[];
};

const initialState: LeadMutationState = { status: "idle", message: "" };
const STAGES: LeadStage[] = ["new_lead", "qualified", "conversation", "proposal_sent", "negotiating", "booked", "project", "repeat_client"];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

function optionalText(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) || "").trim();
  return value || null;
}

function validateUrl(value: string | null, fieldErrors: Record<string, string>, key: string) {
  if (!value) return;
  try {
    if (new URL(value).protocol !== "https:") fieldErrors[key] = "Use a secure https:// URL.";
  } catch {
    fieldErrors[key] = "Enter a valid URL.";
  }
}

/** Creates one lead for the explicitly selected property. Only artistName is required. */
export async function createLead(
  _previousState: LeadMutationState = initialState,
  formData: FormData
): Promise<LeadMutationState> {
  const userId = process.env.CONTROL_CENTER_SUPABASE_USER_ID;
  if (!userId) return { status: "error", message: "Control Center user mapping is not configured." };

  const requestedSiteId = String(formData.get("property") || "");
  const selectedSite = siteRegistry.find((site) => site.id === requestedSiteId);
  const artistName = String(formData.get("artist_name") || "").trim();
  const contactName = optionalText(formData, "contact_name");
  const email = optionalText(formData, "email");
  const phone = optionalText(formData, "phone");
  const projectType = optionalText(formData, "project_type");
  const budget = optionalText(formData, "budget");
  const platform = optionalText(formData, "platform");
  const notes = optionalText(formData, "notes");
  const instagram = optionalText(formData, "social_instagram");
  const website = optionalText(formData, "social_website");
  const tagsRaw = optionalText(formData, "tags");
  const tags = tagsRaw ? tagsRaw.split(",").map((tag) => tag.trim()).filter(Boolean) : [];
  const fieldErrors: Record<string, string> = {};

  if (!selectedSite) fieldErrors.property = "Select a valid property.";
  if (artistName.length < 1 || artistName.length > 160) fieldErrors.artist_name = "Use 1–160 characters.";
  if (contactName && contactName.length > 160) fieldErrors.contact_name = "Use 160 characters or fewer.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Enter a valid email address.";
  validateUrl(instagram, fieldErrors, "social_instagram");
  validateUrl(website, fieldErrors, "social_website");

  if (Object.keys(fieldErrors).length) return { status: "error", message: "Please correct the highlighted fields.", fieldErrors };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to create leads." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite!.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const socialLinks: Record<string, string> = {};
    if (instagram) socialLinks.instagram = instagram;
    if (website) socialLinks.website = website;

    const { data, error } = await supabase
      .from("clients")
      .insert({
        property_id: property.id,
        artist_name: artistName,
        contact_name: contactName,
        email,
        phone,
        project_type: projectType,
        budget,
        platform,
        social_links: socialLinks,
        tags,
        notes,
        stage: "new_lead",
        source: "manual",
        created_by: userId
      })
      .select("id")
      .single();

    if (error || !data) return { status: "error", message: "The lead could not be created." };

    revalidatePath("/control-center/growth/leads");
    revalidatePath("/control-center/growth");
    return { status: "success", message: "Lead created successfully.", leadId: data.id };
  } catch {
    return { status: "error", message: "The lead could not be created. Please try again." };
  }
}

/** Updates one lead's identity/contact/notes fields. Does not change stage — use updateLeadStage for that. */
export async function updateLead(
  _previousState: LeadMutationState = initialState,
  formData: FormData
): Promise<LeadMutationState> {
  const leadId = String(formData.get("lead_id") || "");
  const requestedSiteId = String(formData.get("property") || "");
  const selectedSite = siteRegistry.find((site) => site.id === requestedSiteId);
  const artistName = String(formData.get("artist_name") || "").trim();
  const contactName = optionalText(formData, "contact_name");
  const email = optionalText(formData, "email");
  const phone = optionalText(formData, "phone");
  const projectType = optionalText(formData, "project_type");
  const budget = optionalText(formData, "budget");
  const platform = optionalText(formData, "platform");
  const notes = optionalText(formData, "notes");
  const instagram = optionalText(formData, "social_instagram");
  const website = optionalText(formData, "social_website");
  const tagsRaw = optionalText(formData, "tags");
  const tags = tagsRaw ? tagsRaw.split(",").map((tag) => tag.trim()).filter(Boolean) : [];
  const fieldErrors: Record<string, string> = {};

  if (!uuidPattern.test(leadId)) fieldErrors.lead_id = "Select a valid lead.";
  if (!selectedSite) fieldErrors.property = "Select a valid property.";
  if (artistName.length < 1 || artistName.length > 160) fieldErrors.artist_name = "Use 1–160 characters.";
  if (contactName && contactName.length > 160) fieldErrors.contact_name = "Use 160 characters or fewer.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Enter a valid email address.";
  validateUrl(instagram, fieldErrors, "social_instagram");
  validateUrl(website, fieldErrors, "social_website");

  if (Object.keys(fieldErrors).length) return { status: "error", message: "Please correct the highlighted fields.", fieldErrors };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to update leads." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite!.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: existing } = await supabase.from("clients").select("id").eq("id", leadId).eq("property_id", property.id).maybeSingle();
    if (!existing) return { status: "error", message: "That lead does not belong to the selected property." };

    const socialLinks: Record<string, string> = {};
    if (instagram) socialLinks.instagram = instagram;
    if (website) socialLinks.website = website;

    const { error } = await supabase
      .from("clients")
      .update({
        artist_name: artistName,
        contact_name: contactName,
        email,
        phone,
        project_type: projectType,
        budget,
        platform,
        social_links: socialLinks,
        tags,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq("id", leadId)
      .eq("property_id", property.id);

    if (error) return { status: "error", message: "The lead could not be updated." };

    revalidatePath("/control-center/growth/leads");
    revalidatePath(`/control-center/growth/leads/${leadId}`);
    return { status: "success", message: "Lead updated successfully.", leadId };
  } catch {
    return { status: "error", message: "The lead could not be updated. Please try again." };
  }
}

/**
 * Moves one lead to a new stage. Permissive in both directions — real conversations
 * don't move strictly forward. Does not itself create a project; see convertLeadToProject.
 */
export async function updateLeadStage(input: { property: string; leadId: string; stage: LeadStage }): Promise<LeadActionResult> {
  const selectedSite = siteRegistry.find((site) => site.id === input.property);
  if (!selectedSite) return { status: "error", message: "Select a valid property." };
  if (!uuidPattern.test(input.leadId)) return { status: "error", message: "Select a valid lead." };
  if (!STAGES.includes(input.stage)) return { status: "error", message: "Select a valid stage." };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to change lead stage." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: existing } = await supabase.from("clients").select("id").eq("id", input.leadId).eq("property_id", property.id).maybeSingle();
    if (!existing) return { status: "error", message: "That lead does not belong to the selected property." };

    const { error } = await supabase
      .from("clients")
      .update({ stage: input.stage, updated_at: new Date().toISOString() })
      .eq("id", input.leadId)
      .eq("property_id", property.id);

    if (error) return { status: "error", message: "The lead stage could not be updated." };

    revalidatePath("/control-center/growth/leads");
    revalidatePath("/control-center/growth");
    revalidatePath(`/control-center/growth/leads/${input.leadId}`);
    return { status: "success", message: "Lead stage updated.", leadId: input.leadId };
  } catch {
    return { status: "error", message: "The lead stage could not be updated. Please try again." };
  }
}

/** Sets or clears a lead's follow-up date. */
export async function setLeadFollowUp(input: { property: string; leadId: string; nextFollowUpAt: string | null }): Promise<LeadActionResult> {
  const selectedSite = siteRegistry.find((site) => site.id === input.property);
  if (!selectedSite) return { status: "error", message: "Select a valid property." };
  if (!uuidPattern.test(input.leadId)) return { status: "error", message: "Select a valid lead." };
  if (input.nextFollowUpAt && Number.isNaN(new Date(input.nextFollowUpAt).getTime())) {
    return { status: "error", message: "Enter a valid follow-up date." };
  }

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to set follow-up dates." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: existing } = await supabase.from("clients").select("id").eq("id", input.leadId).eq("property_id", property.id).maybeSingle();
    if (!existing) return { status: "error", message: "That lead does not belong to the selected property." };

    const { error } = await supabase
      .from("clients")
      .update({ next_follow_up_at: input.nextFollowUpAt, updated_at: new Date().toISOString() })
      .eq("id", input.leadId)
      .eq("property_id", property.id);

    if (error) return { status: "error", message: "The follow-up date could not be updated." };

    revalidatePath("/control-center/growth/leads");
    revalidatePath("/control-center/growth");
    revalidatePath(`/control-center/growth/leads/${input.leadId}`);
    return { status: "success", message: input.nextFollowUpAt ? "Follow-up date set." : "Follow-up date cleared.", leadId: input.leadId };
  } catch {
    return { status: "error", message: "The follow-up date could not be updated. Please try again." };
  }
}

/** Archives or restores a lead. Never a hard delete — relationship history is preserved. */
export async function archiveLead(input: { property: string; leadId: string; isArchived: boolean }): Promise<LeadActionResult> {
  const selectedSite = siteRegistry.find((site) => site.id === input.property);
  if (!selectedSite) return { status: "error", message: "Select a valid property." };
  if (!uuidPattern.test(input.leadId)) return { status: "error", message: "Select a valid lead." };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to archive leads." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: existing } = await supabase.from("clients").select("id").eq("id", input.leadId).eq("property_id", property.id).maybeSingle();
    if (!existing) return { status: "error", message: "That lead does not belong to the selected property." };

    const { error } = await supabase
      .from("clients")
      .update({ is_archived: input.isArchived, updated_at: new Date().toISOString() })
      .eq("id", input.leadId)
      .eq("property_id", property.id);

    if (error) return { status: "error", message: "The lead could not be updated." };

    revalidatePath("/control-center/growth/leads");
    revalidatePath("/control-center/growth");
    return { status: "success", message: input.isArchived ? "Lead archived." : "Lead restored.", leadId: input.leadId };
  } catch {
    return { status: "error", message: "The lead could not be updated. Please try again." };
  }
}

/**
 * Converts a lead into active project work. Reuses the existing `createProject` action
 * rather than duplicating insertion logic. Does not itself imply that a stage change
 * creates project work — a project row is what represents the work; this action creates
 * that row explicitly and only then updates the lead's stage to reflect it.
 *
 * Guards against accidental duplicates: unless `confirmed` is true, any existing
 * non-done project already linked to this client is returned for review instead of
 * silently creating a second one.
 */
export async function convertLeadToProject(input: {
  property: string;
  leadId: string;
  type: ProjectType;
  title: string;
  targetDate?: string | null;
  confirmed?: boolean;
}): Promise<ConvertLeadResult> {
  const selectedSite = siteRegistry.find((site) => site.id === input.property);
  if (!selectedSite) return { status: "error", message: "Select a valid property." };
  if (!uuidPattern.test(input.leadId)) return { status: "error", message: "Select a valid lead." };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to convert leads." };

    if (!input.confirmed) {
      const existing = await getClientProjects(getSiteConfig(selectedSite.id), input.leadId);
      const activeExisting = existing.projects.filter((project) => project.phase !== "done");
      if (activeExisting.length) {
        return {
          status: "needs_confirmation",
          message: "This lead already has active project work linked. Confirm you want to create another project.",
          existingProjects: activeExisting.map((project) => ({ id: project.id, title: project.title, phase: project.phase }))
        };
      }
    }

    const created = await createProject({
      property: input.property,
      type: input.type,
      title: input.title,
      clientId: input.leadId,
      targetDate: input.targetDate || null
    });
    if (created.status === "error") return { status: "error", message: created.message };

    const supabase = createSupabaseAdminClient();
    const { data: property } = await supabase.from("properties").select("id").eq("slug", selectedSite.id).maybeSingle();
    if (property) {
      await supabase
        .from("clients")
        .update({ stage: "project", updated_at: new Date().toISOString() })
        .eq("id", input.leadId)
        .eq("property_id", property.id);
    }

    revalidatePath("/control-center/growth/leads");
    revalidatePath("/control-center/growth");
    revalidatePath(`/control-center/growth/leads/${input.leadId}`);
    revalidatePath("/control-center/projects");
    return { status: "success", message: "Project created and lead stage updated.", projectId: created.projectId };
  } catch {
    return { status: "error", message: "The lead could not be converted. Please try again." };
  }
}
