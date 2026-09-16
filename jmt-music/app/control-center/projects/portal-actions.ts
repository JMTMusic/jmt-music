"use server";

import { revalidatePath } from "next/cache";
import { getControlCenterRole } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { siteRegistry } from "@/lib/control-center/site-registry";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { addStaffPortalComment } from "@/lib/client-portal/repository";
import { ensurePortalAudioBucket, PORTAL_AUDIO_BUCKET, PORTAL_AUDIO_MAX_BYTES, BEAT_AUDIO_MIME_TYPES } from "@/lib/supabase/storage";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const DRIVE_URL_PATTERN = /^https:\/\/(drive|docs)\.google\.com\//i;

async function resolveProjectForWrite(propertySlug: string, projectId: string) {
  if (!UUID_PATTERN.test(projectId) || !siteRegistry.some((site) => site.id === propertySlug)) return null;
  const site = getSiteConfig(propertySlug);
  const supabase = createSupabaseAdminClient();
  const { data: property } = await supabase.from("properties").select("id").eq("slug", site.id).maybeSingle();
  if (!property) return null;
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("property_id", property.id).maybeSingle();
  if (!project) return null;
  return { supabase, propertyId: property.id, projectId: project.id };
}

export type AddPortalFileState = { status: "idle" | "success" | "error"; message: string };

// ---------- Songs ----------

export async function addPortalSongAction(_previous: AddPortalFileState, formData: FormData): Promise<AddPortalFileState> {
  const role = await getControlCenterRole();
  if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to manage songs." };

  const propertySlug = String(formData.get("property") || "");
  const projectId = String(formData.get("projectId") || "");
  const title = String(formData.get("title") || "").trim();
  const versionLabel = String(formData.get("versionLabel") || "").trim() || null;
  const bpm = String(formData.get("bpm") || "").trim() || null;
  const musicalKey = String(formData.get("musicalKey") || "").trim() || null;
  if (!title || title.length > 160) return { status: "error", message: "Enter a song title under 160 characters." };
  if (bpm && bpm.length > 20) return { status: "error", message: "BPM is too long." };
  if (musicalKey && musicalKey.length > 20) return { status: "error", message: "Key is too long." };

  try {
    const resolved = await resolveProjectForWrite(propertySlug, projectId);
    if (!resolved) return { status: "error", message: "Select a valid project and property." };
    const { supabase, propertyId, projectId: resolvedProjectId } = resolved;
    const { error } = await supabase.from("portal_songs").insert({
      property_id: propertyId, project_id: resolvedProjectId, title, version_label: versionLabel, bpm, musical_key: musicalKey,
      created_by: process.env.CONTROL_CENTER_SUPABASE_USER_ID || null
    });
    if (error) return { status: "error", message: "The song could not be created. Apply the latest Supabase migration first." };
    revalidatePath(`/dashboard/${projectId}`);
    return { status: "success", message: "Song added." };
  } catch {
    return { status: "error", message: "The song could not be created." };
  }
}

export async function updatePortalSongAction(_previous: AddPortalFileState, formData: FormData): Promise<AddPortalFileState> {
  const role = await getControlCenterRole();
  if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to manage songs." };

  const propertySlug = String(formData.get("property") || "");
  const projectId = String(formData.get("projectId") || "");
  const songId = String(formData.get("songId") || "");
  const title = String(formData.get("title") || "").trim();
  const versionLabel = String(formData.get("versionLabel") || "").trim() || null;
  const bpm = String(formData.get("bpm") || "").trim() || null;
  const musicalKey = String(formData.get("musicalKey") || "").trim() || null;
  if (!UUID_PATTERN.test(songId)) return { status: "error", message: "Invalid song." };
  if (!title || title.length > 160) return { status: "error", message: "Enter a song title under 160 characters." };
  if (bpm && bpm.length > 20) return { status: "error", message: "BPM is too long." };
  if (musicalKey && musicalKey.length > 20) return { status: "error", message: "Key is too long." };

  try {
    const resolved = await resolveProjectForWrite(propertySlug, projectId);
    if (!resolved) return { status: "error", message: "Select a valid project and property." };
    const { supabase, projectId: resolvedProjectId } = resolved;
    const { error } = await supabase.from("portal_songs").update({ title, version_label: versionLabel, bpm, musical_key: musicalKey }).eq("id", songId).eq("project_id", resolvedProjectId);
    if (error) return { status: "error", message: "The song could not be updated." };
    revalidatePath(`/dashboard/${projectId}`);
    return { status: "success", message: "Song details updated." };
  } catch {
    return { status: "error", message: "The song could not be updated." };
  }
}

export type PreparePortalAudioResult =
  | { status: "success"; bucket: string; path: string; token: string }
  | { status: "error"; message: string };

/** Prepares a direct-to-Storage signed upload for a song's primary playback copy (private bucket). */
export async function preparePortalAudioUpload(input: { property: string; projectId: string; songId: string; type: string; size: number }): Promise<PreparePortalAudioResult> {
  const role = await getControlCenterRole();
  if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to upload audio." };
  if (!UUID_PATTERN.test(input.songId)) return { status: "error", message: "Invalid song." };
  if (!BEAT_AUDIO_MIME_TYPES.includes(input.type as typeof BEAT_AUDIO_MIME_TYPES[number]) || input.size > PORTAL_AUDIO_MAX_BYTES) {
    return { status: "error", message: "Audio must be MP3, WAV, or M4A and no larger than 100 MB." };
  }

  try {
    const resolved = await resolveProjectForWrite(input.property, input.projectId);
    if (!resolved) return { status: "error", message: "Select a valid project and property." };
    const { supabase, propertyId, projectId } = resolved;
    const { data: song } = await supabase.from("portal_songs").select("id").eq("id", input.songId).eq("project_id", projectId).maybeSingle();
    if (!song) return { status: "error", message: "That song does not belong to this project." };

    const bucket = await ensurePortalAudioBucket(supabase);
    if (bucket.error) return { status: "error", message: `Audio storage is unavailable: ${bucket.error}` };
    const extension = input.type === "audio/wav" || input.type === "audio/x-wav" ? "wav" : input.type === "audio/mpeg" ? "mp3" : "m4a";
    const path = `${propertyId}/${projectId}/${input.songId}/${crypto.randomUUID()}.${extension}`;
    const signed = await supabase.storage.from(PORTAL_AUDIO_BUCKET).createSignedUploadUrl(path);
    if (signed.error) return { status: "error", message: "Audio upload could not be prepared." };
    return { status: "success", bucket: PORTAL_AUDIO_BUCKET, path, token: signed.data.token };
  } catch {
    return { status: "error", message: "Audio upload could not be prepared." };
  }
}

/** Saves the uploaded preview-audio path onto a song after a successful client-side Storage upload. */
export async function savePortalAudioPathAction(_previous: AddPortalFileState, formData: FormData): Promise<AddPortalFileState> {
  const role = await getControlCenterRole();
  if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to manage songs." };

  const propertySlug = String(formData.get("property") || "");
  const projectId = String(formData.get("projectId") || "");
  const songId = String(formData.get("songId") || "");
  const previewAudioPath = String(formData.get("previewAudioPath") || "").trim();
  if (!UUID_PATTERN.test(songId) || !previewAudioPath) return { status: "error", message: "Invalid upload." };

  try {
    const resolved = await resolveProjectForWrite(propertySlug, projectId);
    if (!resolved) return { status: "error", message: "Select a valid project and property." };
    const { supabase, projectId: resolvedProjectId } = resolved;
    const { data: previous } = await supabase.from("portal_songs").select("preview_audio_path").eq("id", songId).eq("project_id", resolvedProjectId).maybeSingle();
    const { error } = await supabase.from("portal_songs").update({ preview_audio_path: previewAudioPath }).eq("id", songId).eq("project_id", resolvedProjectId);
    if (error) return { status: "error", message: "The uploaded audio could not be saved to this song." };
    if (previous?.preview_audio_path && previous.preview_audio_path !== previewAudioPath) {
      await supabase.storage.from(PORTAL_AUDIO_BUCKET).remove([previous.preview_audio_path]);
    }
    revalidatePath(`/dashboard/${projectId}`);
    return { status: "success", message: "Playback audio updated." };
  } catch {
    return { status: "error", message: "The uploaded audio could not be saved to this song." };
  }
}

/** Bound to a projectId (see ClientMixRoom's .bind(null, accessToken) for the matching client-side pattern) so the admin mix room can post it directly as a form action. */
export async function addStaffPortalCommentAction(projectId: string, formData: FormData) {
  const role = await getControlCenterRole();
  if (role !== "owner" && role !== "editor") return;
  const timestampRaw = String(formData.get("timestamp") || "").trim();
  const result = await addStaffPortalComment(projectId, {
    songId: String(formData.get("songId") || ""),
    authorName: String(formData.get("authorName") || "Jonathan"),
    body: String(formData.get("body") || ""),
    timestampSeconds: timestampRaw ? Number(timestampRaw) : null
  });
  if (result.status === "success") revalidatePath(`/dashboard/${projectId}`);
}

// ---------- Files (attachments under a song, or project-level) ----------

export async function addPortalFileAction(_previous: AddPortalFileState, formData: FormData): Promise<AddPortalFileState> {
  const role = await getControlCenterRole();
  if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to manage portal files." };

  const propertySlug = String(formData.get("property") || "");
  const projectId = String(formData.get("projectId") || "");
  const songId = String(formData.get("songId") || "").trim() || null;
  const title = String(formData.get("title") || "").trim();
  const driveUrl = String(formData.get("driveUrl") || "").trim();
  const fileType = String(formData.get("fileType") || "other");
  const versionLabel = String(formData.get("versionLabel") || "").trim() || null;
  const note = String(formData.get("note") || "").trim() || null;
  if (songId && !UUID_PATTERN.test(songId)) return { status: "error", message: "Invalid song." };
  if (!title || title.length > 160) return { status: "error", message: "Enter a file title under 160 characters." };
  if (!DRIVE_URL_PATTERN.test(driveUrl)) return { status: "error", message: "Paste a Google Drive or Google Docs link." };
  if (!["audio", "stems", "artwork", "document", "other"].includes(fileType)) return { status: "error", message: "Choose a valid file type." };

  try {
    const resolved = await resolveProjectForWrite(propertySlug, projectId);
    if (!resolved) return { status: "error", message: "Select a valid project and property." };
    const { supabase, propertyId, projectId: resolvedProjectId } = resolved;
    if (songId) {
      const { data: song } = await supabase.from("portal_songs").select("id").eq("id", songId).eq("project_id", resolvedProjectId).maybeSingle();
      if (!song) return { status: "error", message: "That song does not belong to this project." };
    }
    const { error } = await supabase.from("portal_files").insert({
      property_id: propertyId, project_id: resolvedProjectId, song_id: songId, title, drive_url: driveUrl, file_type: fileType,
      version_label: versionLabel, note, created_by: process.env.CONTROL_CENTER_SUPABASE_USER_ID || null
    });
    if (error) return { status: "error", message: "The file link could not be added. Apply the latest Supabase migration first." };
    revalidatePath(`/dashboard/${projectId}`);
    return { status: "success", message: "File added to the client portal." };
  } catch {
    return { status: "error", message: "The file link could not be added." };
  }
}

export async function updatePortalFileAction(_previous: AddPortalFileState, formData: FormData): Promise<AddPortalFileState> {
  const role = await getControlCenterRole();
  if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to manage portal files." };

  const propertySlug = String(formData.get("property") || "");
  const projectId = String(formData.get("projectId") || "");
  const fileId = String(formData.get("fileId") || "");
  const title = String(formData.get("title") || "").trim();
  const driveUrl = String(formData.get("driveUrl") || "").trim();
  const versionLabel = String(formData.get("versionLabel") || "").trim() || null;
  if (!UUID_PATTERN.test(fileId)) return { status: "error", message: "Invalid file." };
  if (!title || title.length > 160) return { status: "error", message: "Enter a file title under 160 characters." };
  if (!DRIVE_URL_PATTERN.test(driveUrl)) return { status: "error", message: "Paste a Google Drive or Google Docs link." };

  try {
    const resolved = await resolveProjectForWrite(propertySlug, projectId);
    if (!resolved) return { status: "error", message: "Select a valid project and property." };
    const { supabase, projectId: resolvedProjectId } = resolved;
    const { error } = await supabase.from("portal_files").update({ title, drive_url: driveUrl, version_label: versionLabel }).eq("id", fileId).eq("project_id", resolvedProjectId);
    if (error) return { status: "error", message: "The file could not be updated." };
    revalidatePath(`/dashboard/${projectId}`);
    return { status: "success", message: "File updated." };
  } catch {
    return { status: "error", message: "The file could not be updated." };
  }
}
