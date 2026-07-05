"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getControlCenterRole } from "@/lib/control-center/access";
import { siteRegistry } from "@/lib/control-center/site-registry";

export type CreateBeatState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Record<string, string>;
};

const initialState: CreateBeatState = { status: "idle", message: "" };

function optionalText(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) || "").trim();
  return value || null;
}

/**
 * Validates and creates one beat for the explicitly selected property.
 * The service-role client remains server-only and profile authorization fails closed.
 */
export async function createBeat(
  _previousState: CreateBeatState = initialState,
  formData: FormData
): Promise<CreateBeatState> {
  const userId = process.env.CONTROL_CENTER_SUPABASE_USER_ID;
  if (!userId) {
    return { status: "error", message: "Control Center user mapping is not configured." };
  }

  const title = String(formData.get("title") || "").trim();
  const slug = String(formData.get("slug") || "").trim().toLowerCase();
  const genre = String(formData.get("genre") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const requestedSiteId = String(formData.get("property") || "");
  const selectedSite = siteRegistry.find((site) => site.id === requestedSiteId);
  const bpmValue = optionalText(formData, "bpm");
  const sortOrderValue = optionalText(formData, "sort_order");
  const beatstarsUrl = optionalText(formData, "beatstars_url");
  const releaseDate = optionalText(formData, "release_date");
  const fieldErrors: Record<string, string> = {};

  if (title.length < 2 || title.length > 120) fieldErrors.title = "Use 2–120 characters.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fieldErrors.slug = "Use lowercase letters, numbers, and hyphens.";
  if (genre.length < 2 || genre.length > 80) fieldErrors.genre = "Use 2–80 characters.";
  if (description.length < 10 || description.length > 2000) fieldErrors.description = "Use 10–2,000 characters.";
  if (!selectedSite) fieldErrors.property = "Select a valid property.";

  const bpm = bpmValue === null ? null : Number(bpmValue);
  if (bpm !== null && (!Number.isInteger(bpm) || bpm < 1 || bpm > 400)) fieldErrors.bpm = "Use a whole number from 1–400.";

  const sortOrder = sortOrderValue === null ? 0 : Number(sortOrderValue);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) fieldErrors.sort_order = "Use a whole number from 0–10,000.";

  if (releaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) fieldErrors.release_date = "Use a valid date.";

  if (beatstarsUrl) {
    try {
      const url = new URL(beatstarsUrl);
      if (url.protocol !== "https:") fieldErrors.beatstars_url = "Use a secure https:// URL.";
    } catch {
      fieldErrors.beatstars_url = "Enter a valid URL.";
    }
  }

  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "Please correct the highlighted fields.", fieldErrors };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") {
      return { status: "error", message: "You do not have permission to create beats." };
    }

    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", selectedSite!.id)
      .maybeSingle();

    if (propertyError || !property) {
      return { status: "error", message: "The selected property could not be found." };
    }

    const { error } = await supabase.from("beats").insert({
      property_id: property.id,
      title,
      slug,
      genre,
      description,
      bpm,
      musical_key: optionalText(formData, "musical_key"),
      release_date: releaseDate,
      featured: formData.get("featured") === "on",
      published: formData.get("published") === "on",
      sort_order: sortOrder,
      beatstars_url: beatstarsUrl,
      created_by: userId
    });

    if (error?.code === "23505") {
      return { status: "error", message: "That slug already exists for this property.", fieldErrors: { slug: "Choose a unique slug." } };
    }
    if (error) return { status: "error", message: "Supabase could not create the beat." };

    revalidatePath("/control-center/beats");
    return { status: "success", message: "Beat created successfully." };
  } catch {
    return { status: "error", message: "The beat could not be created. Please try again." };
  }
}
