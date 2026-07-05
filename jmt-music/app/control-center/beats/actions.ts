"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getControlCenterRole } from "@/lib/control-center/access";
import { siteRegistry } from "@/lib/control-center/site-registry";
import {
  BEAT_AUDIO_BUCKET,
  BEAT_AUDIO_MAX_BYTES,
  BEAT_AUDIO_MIME_TYPES,
  BEAT_ARTWORK_BUCKET,
  BEAT_ARTWORK_MAX_BYTES,
  BEAT_ARTWORK_MIME_TYPES,
  ensureBeatAudioBucket,
  ensureBeatArtworkBucket
} from "@/lib/supabase/storage";

export type CreateBeatState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Record<string, string>;
};
export type BeatMutationState = CreateBeatState;

const initialState: CreateBeatState = { status: "idle", message: "" };
const ARTWORK_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif"
};
const AUDIO_TYPES: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a"
};

type UploadDescriptor = { size: number; type: string };
export type PreparedUpload = { bucket: string; path: string; token: string };
export type PrepareUploadsResult = {
  status: "error" | "success";
  message: string;
  artwork?: PreparedUpload;
  audio?: PreparedUpload;
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
  const musicalKey = optionalText(formData, "musical_key");
  const artworkPath = optionalText(formData, "artwork_path");
  const audioPath = optionalText(formData, "audio_path");
  const fieldErrors: Record<string, string> = {};

  if (title.length < 2 || title.length > 120) fieldErrors.title = "Use 2–120 characters.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fieldErrors.slug = "Use lowercase letters, numbers, and hyphens.";
  if (genre.length < 2 || genre.length > 80) fieldErrors.genre = "Use 2–80 characters.";
  if (description.length < 10 || description.length > 2000) fieldErrors.description = "Use 10–2,000 characters.";
  if (musicalKey && musicalKey.length > 40) fieldErrors.musical_key = "Use 40 characters or fewer.";
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

    const expectedPrefix = `${property.id}/${slug}/`;
    if (artworkPath && !artworkPath.startsWith(expectedPrefix)) return { status: "error", message: "Artwork path does not match the selected property." };
    if (audioPath && !audioPath.startsWith(expectedPrefix)) return { status: "error", message: "Audio path does not match the selected property." };

    const { error } = await supabase.from("beats").insert({
      property_id: property.id,
      title,
      slug,
      genre,
      description,
      bpm,
      musical_key: musicalKey,
      release_date: releaseDate,
      featured: formData.get("featured") === "on",
      published: formData.get("published") === "on",
      sort_order: sortOrder,
      beatstars_url: beatstarsUrl,
      artwork_path: artworkPath,
      audio_path: audioPath,
      created_by: userId
    });

    if (error?.code === "23505") {
      await removeUploadedObjects(supabase, artworkPath, audioPath);
      return { status: "error", message: "That slug already exists for this property.", fieldErrors: { slug: "Choose a unique slug." } };
    }
    if (error) {
      const cleanupSucceeded = await removeUploadedObjects(supabase, artworkPath, audioPath);
      return {
        status: "error",
        message: cleanupSucceeded
          ? "Beat creation failed after upload. Uploaded files were removed."
          : "Beat creation failed after upload. One or more files may require manual cleanup."
      };
    }

    revalidatePath("/control-center/beats");
    return { status: "success", message: "Beat created successfully." };
  } catch {
    return { status: "error", message: "The beat could not be created. Please try again." };
  }
}

/**
 * Updates one beat only when it belongs to the explicitly selected property.
 * Existing storage paths are preserved unless a replacement path is supplied.
 */
export async function updateBeat(
  _previousState: BeatMutationState = initialState,
  formData: FormData
): Promise<BeatMutationState> {
  const userId = process.env.CONTROL_CENTER_SUPABASE_USER_ID;
  if (!userId) return { status: "error", message: "Control Center user mapping is not configured." };

  const beatId = String(formData.get("beat_id") || "");
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
  const musicalKey = optionalText(formData, "musical_key");
  const artworkPath = optionalText(formData, "artwork_path");
  const audioPath = optionalText(formData, "audio_path");
  const fieldErrors: Record<string, string> = {};

  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(beatId)) fieldErrors.beat_id = "Select a valid beat.";
  if (title.length < 2 || title.length > 120) fieldErrors.title = "Use 2–120 characters.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fieldErrors.slug = "Use lowercase letters, numbers, and hyphens.";
  if (genre.length < 2 || genre.length > 80) fieldErrors.genre = "Use 2–80 characters.";
  if (description.length < 10 || description.length > 2000) fieldErrors.description = "Use 10–2,000 characters.";
  if (musicalKey && musicalKey.length > 40) fieldErrors.musical_key = "Use 40 characters or fewer.";
  if (!selectedSite) fieldErrors.property = "Select a valid property.";
  const bpm = bpmValue === null ? null : Number(bpmValue);
  if (bpm !== null && (!Number.isInteger(bpm) || bpm < 1 || bpm > 400)) fieldErrors.bpm = "Use a whole number from 1–400.";
  const sortOrder = sortOrderValue === null ? 0 : Number(sortOrderValue);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) fieldErrors.sort_order = "Use a whole number from 0–10,000.";
  if (releaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) fieldErrors.release_date = "Use a valid date.";
  if (beatstarsUrl) {
    try {
      if (new URL(beatstarsUrl).protocol !== "https:") fieldErrors.beatstars_url = "Use a secure https:// URL.";
    } catch {
      fieldErrors.beatstars_url = "Enter a valid URL.";
    }
  }
  if (Object.keys(fieldErrors).length) return { status: "error", message: "Please correct the highlighted fields.", fieldErrors };

  try {
    const role = await getControlCenterRole();
    if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to update beats." };
    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite!.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: existing } = await supabase
      .from("beats")
      .select("id, artwork_path, audio_path")
      .eq("id", beatId)
      .eq("property_id", property.id)
      .maybeSingle();
    if (!existing) return { status: "error", message: "That beat does not belong to the selected property." };

    const expectedPrefix = `${property.id}/${slug}/`;
    if (artworkPath && !artworkPath.startsWith(expectedPrefix)) return { status: "error", message: "Artwork path does not match the selected property and slug." };
    if (audioPath && !audioPath.startsWith(expectedPrefix)) return { status: "error", message: "Audio path does not match the selected property and slug." };

    const { error } = await supabase
      .from("beats")
      .update({
        title,
        slug,
        genre,
        description,
        bpm,
        musical_key: musicalKey,
        release_date: releaseDate,
        featured: formData.get("featured") === "on",
        published: formData.get("published") === "on",
        sort_order: sortOrder,
        beatstars_url: beatstarsUrl,
        artwork_path: artworkPath || existing.artwork_path,
        audio_path: audioPath || existing.audio_path,
        updated_at: new Date().toISOString()
      })
      .eq("id", beatId)
      .eq("property_id", property.id);

    if (error?.code === "23505") return { status: "error", message: "That slug already exists for this property.", fieldErrors: { slug: "Choose a unique slug." } };
    if (error) return { status: "error", message: "The beat could not be updated. New uploaded files may require manual cleanup." };
    revalidatePath("/control-center/beats");
    return { status: "success", message: "Beat updated successfully." };
  } catch {
    return { status: "error", message: "The beat could not be updated. Please try again." };
  }
}

async function removeUploadedObjects(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  artworkPath: string | null,
  audioPath: string | null
): Promise<boolean> {
  const results = await Promise.all([
    artworkPath ? supabase.storage.from(BEAT_ARTWORK_BUCKET).remove([artworkPath]) : Promise.resolve({ error: null }),
    audioPath ? supabase.storage.from(BEAT_AUDIO_BUCKET).remove([audioPath]) : Promise.resolve({ error: null })
  ]);
  return results.every((result) => !result.error);
}

/** Authorizes and prepares signed, property-scoped direct uploads. */
export async function prepareBeatUploads(input: {
  property: string;
  slug: string;
  beatId?: string;
  artwork?: UploadDescriptor;
  audio?: UploadDescriptor;
}): Promise<PrepareUploadsResult> {
  const role = await getControlCenterRole();
  if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to upload beat files." };

  const selectedSite = siteRegistry.find((site) => site.id === input.property);
  if (!selectedSite) return { status: "error", message: "Select a valid property." };
  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { status: "error", message: "Enter a valid slug before uploading." };

  if (input.artwork && (!BEAT_ARTWORK_MIME_TYPES.includes(input.artwork.type as typeof BEAT_ARTWORK_MIME_TYPES[number]) || input.artwork.size > BEAT_ARTWORK_MAX_BYTES)) {
    return { status: "error", message: "Artwork must be a supported image no larger than 10 MB." };
  }
  if (input.audio && (!BEAT_AUDIO_MIME_TYPES.includes(input.audio.type as typeof BEAT_AUDIO_MIME_TYPES[number]) || input.audio.size > BEAT_AUDIO_MAX_BYTES)) {
    return { status: "error", message: "Audio must be MP3, WAV, or M4A and no larger than 100 MB." };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: existing } = await supabase.from("beats").select("id").eq("property_id", property.id).eq("slug", slug).maybeSingle();
    if (existing && existing.id !== input.beatId) return { status: "error", message: "That slug already exists for this property." };
    if (input.beatId) {
      const { data: editableBeat } = await supabase.from("beats").select("id").eq("id", input.beatId).eq("property_id", property.id).maybeSingle();
      if (!editableBeat) return { status: "error", message: "That beat does not belong to the selected property." };
    }

    const result: PrepareUploadsResult = { status: "success", message: "Uploads prepared." };
    if (input.artwork) {
      const bucket = await ensureBeatArtworkBucket(supabase);
      if (bucket.error) return { status: "error", message: "Artwork storage is unavailable." };
      const path = `${property.id}/${slug}/${crypto.randomUUID()}.${ARTWORK_TYPES[input.artwork.type]}`;
      const signed = await supabase.storage.from(BEAT_ARTWORK_BUCKET).createSignedUploadUrl(path);
      if (signed.error) return { status: "error", message: "Artwork upload could not be prepared." };
      result.artwork = { bucket: BEAT_ARTWORK_BUCKET, path, token: signed.data.token };
    }
    if (input.audio) {
      const bucket = await ensureBeatAudioBucket(supabase);
      if (bucket.error) return { status: "error", message: "Audio storage is unavailable." };
      const path = `${property.id}/${slug}/${crypto.randomUUID()}.${AUDIO_TYPES[input.audio.type]}`;
      const signed = await supabase.storage.from(BEAT_AUDIO_BUCKET).createSignedUploadUrl(path);
      if (signed.error) return { status: "error", message: "Audio upload could not be prepared." };
      result.audio = { bucket: BEAT_AUDIO_BUCKET, path, token: signed.data.token };
    }
    return result;
  } catch {
    return { status: "error", message: "Uploads could not be prepared." };
  }
}

/** Removes prepared objects after a client upload failure. */
export async function cleanupBeatUploads(input: {
  property: string;
  slug: string;
  artworkPath?: string;
  audioPath?: string;
}): Promise<void> {
  const role = await getControlCenterRole();
  if (role !== "owner" && role !== "editor") return;
  const selectedSite = siteRegistry.find((site) => site.id === input.property);
  if (!selectedSite) return;
  const supabase = createSupabaseAdminClient();
  const { data: property } = await supabase.from("properties").select("id").eq("slug", selectedSite.id).maybeSingle();
  if (!property) return;
  const prefix = `${property.id}/${input.slug}/`;
  await removeUploadedObjects(
    supabase,
    input.artworkPath?.startsWith(prefix) ? input.artworkPath : null,
    input.audioPath?.startsWith(prefix) ? input.audioPath : null
  );
}
