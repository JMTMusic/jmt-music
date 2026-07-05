"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getControlCenterRole } from "@/lib/control-center/access";
import { siteRegistry } from "@/lib/control-center/site-registry";
import {
  BEAT_ARTWORK_BUCKET,
  BEAT_ARTWORK_MAX_BYTES,
  BEAT_ARTWORK_MIME_TYPES,
  ensureBeatArtworkBucket
} from "@/lib/supabase/storage";

export type CreateBeatState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Record<string, string>;
};

const initialState: CreateBeatState = { status: "idle", message: "" };
const ARTWORK_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif"
};

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
  const artworkEntry = formData.get("artwork");
  const artwork = artworkEntry instanceof File && artworkEntry.size > 0 ? artworkEntry : null;
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
  if (artwork && !BEAT_ARTWORK_MIME_TYPES.includes(artwork.type as typeof BEAT_ARTWORK_MIME_TYPES[number])) fieldErrors.artwork = "Use a JPG, PNG, WebP, or AVIF image.";
  if (artwork && artwork.size > BEAT_ARTWORK_MAX_BYTES) fieldErrors.artwork = "Artwork must be 10 MB or smaller.";

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

    const { data: existingBeat, error: duplicateCheckError } = await supabase
      .from("beats")
      .select("id")
      .eq("property_id", property.id)
      .eq("slug", slug)
      .maybeSingle();

    if (duplicateCheckError) {
      return { status: "error", message: "The beat slug could not be validated." };
    }
    if (existingBeat) {
      return { status: "error", message: "That slug already exists for this property.", fieldErrors: { slug: "Choose a unique slug." } };
    }

    let artworkPath: string | null = null;
    if (artwork) {
      const bucket = await ensureBeatArtworkBucket(supabase);
      if (bucket.error) {
        return { status: "error", message: "Artwork storage is unavailable. The beat was not created.", fieldErrors: { artwork: bucket.error } };
      }

      const extension = ARTWORK_TYPES[artwork.type];
      artworkPath = `${property.id}/${slug}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(BEAT_ARTWORK_BUCKET)
        .upload(artworkPath, await artwork.arrayBuffer(), {
          contentType: artwork.type,
          cacheControl: "31536000",
          upsert: false
        });

      if (uploadError) {
        return { status: "error", message: "Artwork upload failed. The beat was not created.", fieldErrors: { artwork: uploadError.message } };
      }
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
      artwork_path: artworkPath,
      created_by: userId
    });

    if (error?.code === "23505") {
      if (artworkPath) await supabase.storage.from(BEAT_ARTWORK_BUCKET).remove([artworkPath]);
      return { status: "error", message: "That slug already exists for this property.", fieldErrors: { slug: "Choose a unique slug." } };
    }
    if (error) {
      if (artworkPath) {
        const { error: cleanupError } = await supabase.storage.from(BEAT_ARTWORK_BUCKET).remove([artworkPath]);
        return {
          status: "error",
          message: cleanupError
            ? "Beat creation failed after upload. The artwork may require manual cleanup."
            : "Beat creation failed after upload. The uploaded artwork was removed."
        };
      }
      return { status: "error", message: "Supabase could not create the beat." };
    }

    revalidatePath("/control-center/beats");
    return { status: "success", message: "Beat created successfully." };
  } catch {
    return { status: "error", message: "The beat could not be created. Please try again." };
  }
}
