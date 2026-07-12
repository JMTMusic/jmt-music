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

// Free-text length ceilings, same convention as artist_name/contact_name's existing
// 160-char cap and the client-side maxLength attributes already on the Add Lead form —
// these are soft app-layer guards, not database check constraints, since platform and
// project_type are deliberately free text (lib/control-center/lead-display.ts's
// PLATFORM_OPTIONS are "UI hints only, not an enforced list").
const MAX_PROJECT_TYPE_LENGTH = 160;
const MAX_PLATFORM_LENGTH = 160;
const MAX_BUDGET_LENGTH = 40;
const MAX_NOTES_LENGTH = 8000;
const MAX_TAG_LENGTH = 60;
const MAX_TAGS = 20;
const phonePattern = /^[0-9+\-().\s]{7,32}$/;

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

type ParsedLeadFields = {
  artistName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  projectType: string | null;
  budget: string | null;
  platform: string | null;
  notes: string | null;
  socialLinks: Record<string, string>;
  tags: string[];
  fieldErrors: Record<string, string>;
};

/**
 * Shared by createLead and updateLead so both apply identical normalization and
 * validation instead of two copies drifting apart. Every optional field normalizes a
 * blank/whitespace-only entry to `null` (optionalText) rather than storing an empty
 * string — `.trim()` only removes leading/trailing whitespace, so notes' internal
 * punctuation and line breaks are preserved exactly as typed. `socialLinks` and `tags`
 * normalize to `{}`/`[]` instead of `null`, matching the actual database columns
 * (social_links jsonb not null default '{}', tags text[] not null default '{}') and the
 * Client type's own shape (Record<string,string> / string[], never optional) — using
 * `null` for either would violate a real not-null constraint and reintroduce a bug of
 * exactly the same shape as the one this fix addresses.
 */
function parseLeadFields(formData: FormData): ParsedLeadFields {
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
  const tags = tagsRaw
    ? tagsRaw.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, MAX_TAGS)
    : [];

  const fieldErrors: Record<string, string> = {};
  if (artistName.length < 1 || artistName.length > 160) fieldErrors.artist_name = "Use 1–160 characters.";
  if (contactName && contactName.length > 160) fieldErrors.contact_name = "Use 160 characters or fewer.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Enter a valid email address.";
  if (phone && !phonePattern.test(phone)) fieldErrors.phone = "Enter a valid phone number.";
  if (projectType && projectType.length > MAX_PROJECT_TYPE_LENGTH) fieldErrors.project_type = `Use ${MAX_PROJECT_TYPE_LENGTH} characters or fewer.`;
  if (platform && platform.length > MAX_PLATFORM_LENGTH) fieldErrors.platform = `Use ${MAX_PLATFORM_LENGTH} characters or fewer.`;
  if (budget && budget.length > MAX_BUDGET_LENGTH) fieldErrors.budget = `Use ${MAX_BUDGET_LENGTH} characters or fewer.`;
  if (notes && notes.length > MAX_NOTES_LENGTH) fieldErrors.notes = `Use ${MAX_NOTES_LENGTH} characters or fewer.`;
  if (tags.some((tag) => tag.length > MAX_TAG_LENGTH)) fieldErrors.tags = `Each tag must be ${MAX_TAG_LENGTH} characters or fewer.`;
  validateUrl(instagram, fieldErrors, "social_instagram");
  validateUrl(website, fieldErrors, "social_website");

  const socialLinks: Record<string, string> = {};
  if (instagram) socialLinks.instagram = instagram;
  if (website) socialLinks.website = website;

  return { artistName, contactName, email, phone, projectType, budget, platform, notes, socialLinks, tags, fieldErrors };
}

/**
 * Maps a Postgres/Supabase error to a hand-written, user-safe message — never the raw
 * error, code, table/column name, or SQL. `actionLabel` only changes the fallback wording
 * ("created" vs. "updated"); every specific mapping below is safe to show identically in
 * both places.
 *
 * 23502 (not_null_violation) is exactly the bug this fix addresses: a required database
 * column had no value and the database itself rejected the row. It's mapped to the same
 * migration-not-applied family message as 42703/42P01 (undefined column/table) because,
 * from Jonathan's side, the remedy is identical either way — confirm the latest Supabase
 * migration has actually been applied — even though the two failure modes are technically
 * different (a column that's missing entirely vs. one that exists but is stricter than the
 * application expects).
 */
function mapLeadDatabaseError(error: { code?: string; message?: string } | null | undefined, actionLabel: "created" | "updated"): string {
  if (error?.code === "23502" || error?.code === "42703" || error?.code === "42P01") {
    return "Leads are not available until the latest Supabase migration is applied.";
  }
  if (error?.code === "23505") {
    return "A matching lead may already exist for this property.";
  }
  return `The lead could not be ${actionLabel}.`;
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
  const parsed = parseLeadFields(formData);
  if (!selectedSite) parsed.fieldErrors.property = "Select a valid property.";

  if (Object.keys(parsed.fieldErrors).length) return { status: "error", message: "Please correct the highlighted fields.", fieldErrors: parsed.fieldErrors };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to create leads." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite!.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    // Deliberately no `name` key here — that legacy column is nullable as of
    // 20260712090000_clients_legacy_name_nullable_fix.sql and its own column comment says
    // not to write to it. artist_name (required) is the field of record going forward.
    const { data, error } = await supabase
      .from("clients")
      .insert({
        property_id: property.id,
        artist_name: parsed.artistName,
        contact_name: parsed.contactName,
        email: parsed.email,
        phone: parsed.phone,
        project_type: parsed.projectType,
        budget: parsed.budget,
        platform: parsed.platform,
        social_links: parsed.socialLinks,
        tags: parsed.tags,
        notes: parsed.notes,
        stage: "new_lead",
        source: "manual",
        created_by: userId
      })
      .select("id")
      .single();

    if (error || !data) return { status: "error", message: mapLeadDatabaseError(error, "created") };

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
  const parsed = parseLeadFields(formData);

  if (!uuidPattern.test(leadId)) parsed.fieldErrors.lead_id = "Select a valid lead.";
  if (!selectedSite) parsed.fieldErrors.property = "Select a valid property.";

  if (Object.keys(parsed.fieldErrors).length) return { status: "error", message: "Please correct the highlighted fields.", fieldErrors: parsed.fieldErrors };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to update leads." };

    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite!.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: existing } = await supabase.from("clients").select("id").eq("id", leadId).eq("property_id", property.id).maybeSingle();
    if (!existing) return { status: "error", message: "That lead does not belong to the selected property." };

    const { error } = await supabase
      .from("clients")
      .update({
        artist_name: parsed.artistName,
        contact_name: parsed.contactName,
        email: parsed.email,
        phone: parsed.phone,
        project_type: parsed.projectType,
        budget: parsed.budget,
        platform: parsed.platform,
        social_links: parsed.socialLinks,
        tags: parsed.tags,
        notes: parsed.notes,
        updated_at: new Date().toISOString()
      })
      .eq("id", leadId)
      .eq("property_id", property.id);

    if (error) return { status: "error", message: mapLeadDatabaseError(error, "updated") };

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
