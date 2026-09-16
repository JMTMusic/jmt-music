import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PORTAL_AUDIO_BUCKET } from "@/lib/supabase/storage";
import { getProjectSetupByRawToken } from "@/lib/project-setup/repository";
import type { ClientPortalView, PortalApprovalStatus, PortalComment, PortalFile, PortalFileType, PortalSong, PortalStage, PortalStageName } from "./types";

export const PORTAL_STAGE_NAMES: PortalStageName[] = ["production", "mixing", "mastering", "delivery"];
const emptyStages = (): PortalStage[] => PORTAL_STAGE_NAMES.map((stage) => ({ stage, status: "not_started", progressPct: 0, clientNote: null, updatedAt: null }));

/** Resolves a short-lived signed playback URL for a preview-audio object, or null if unset/unavailable. */
async function signPreviewAudioUrl(supabase: ReturnType<typeof createSupabaseAdminClient>, path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(PORTAL_AUDIO_BUCKET).createSignedUrl(path, 3600);
  return error ? null : data.signedUrl;
}

export async function getPortalStagesForProject(projectId: string): Promise<{ status: "ready" | "error"; stages: PortalStage[] }> {
  try {
    const { data, error } = await createSupabaseAdminClient().from("project_portal_stages").select("stage,status,progress_pct,client_note,updated_at").eq("project_id", projectId);
    if (error) return { status: "error", stages: emptyStages() };
    const rows = data || [];
    return { status: "ready", stages: emptyStages().map((fallback) => {
      const row = rows.find((item) => item.stage === fallback.stage);
      return row ? { stage: row.stage, status: row.status, progressPct: row.progress_pct ?? 0, clientNote: row.client_note, updatedAt: row.updated_at } : fallback;
    }) };
  } catch { return { status: "error", stages: emptyStages() }; }
}

type PortalResult =
  | { status: "found"; view: ClientPortalView }
  | { status: "not_found" | "revoked" }
  | { status: "error"; message: string };

export type StaffPortalSongsResult = { status: "ready" | "empty" | "error"; songs: PortalSong[]; message?: string };
export type StaffPortalFilesResult = { status: "ready" | "empty" | "error"; files: PortalFile[]; message?: string };

const SONG_COLUMNS = "id, title, version_label, bpm, musical_key, preview_audio_path, created_at";
const FILE_COLUMNS = "id, song_id, title, file_type, version_label, drive_url, note, created_at";

type RawSong = { id: string; title: string; version_label: string | null; bpm: string | null; musical_key: string | null; preview_audio_path: string | null; created_at: string };
type RawFile = { id: string; song_id: string | null; title: string; file_type: string; version_label: string | null; drive_url: string; note: string | null; created_at: string };

/** Joins comments + approvals onto a raw song list and resolves each preview-audio signed URL. Shared by staff and client reads so the two never drift apart. */
async function attachSongFeedback(supabase: ReturnType<typeof createSupabaseAdminClient>, rawSongs: RawSong[]): Promise<PortalSong[]> {
  const songIds = rawSongs.map((song) => song.id);
  const [{ data: comments }, { data: approvals }] = songIds.length
    ? await Promise.all([
        supabase.from("portal_file_comments").select("id, song_id, author_type, author_name, body, timestamp_seconds, created_at").in("song_id", songIds).order("created_at"),
        supabase.from("portal_file_approvals").select("song_id, status, client_name, note, updated_at").in("song_id", songIds)
      ])
    : [{ data: [] }, { data: [] }];

  return Promise.all(rawSongs.map(async (song) => ({
    id: song.id,
    title: song.title,
    versionLabel: song.version_label,
    bpm: song.bpm,
    musicalKey: song.musical_key,
    createdAt: song.created_at,
    previewAudioPath: song.preview_audio_path,
    previewAudioUrl: await signPreviewAudioUrl(supabase, song.preview_audio_path),
    comments: (comments || []).filter((item) => item.song_id === song.id).map((item) => ({
      id: item.id,
      authorName: item.author_name,
      authorType: item.author_type,
      body: item.body,
      timestampSeconds: item.timestamp_seconds,
      createdAt: item.created_at
    } as PortalComment)),
    approval: (() => {
      const approval = (approvals || []).find((item) => item.song_id === song.id);
      return approval ? { status: approval.status, clientName: approval.client_name, note: approval.note, updatedAt: approval.updated_at } : null;
    })()
  })));
}

function mapFiles(rawFiles: RawFile[]): PortalFile[] {
  return rawFiles.map((file) => ({
    id: file.id,
    songId: file.song_id,
    title: file.title,
    fileType: file.file_type as PortalFileType,
    versionLabel: file.version_label,
    driveUrl: file.drive_url,
    note: file.note,
    createdAt: file.created_at
  }));
}

/** Staff-facing: every song on the project, with comments/approvals attached for the admin mix room's activity thread. */
export async function getPortalSongsForProject(projectId: string): Promise<StaffPortalSongsResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("portal_songs").select(SONG_COLUMNS).eq("project_id", projectId).order("created_at", { ascending: false });
    if (error) return { status: "error", songs: [], message: "Apply the Client Portal Supabase migration to manage songs." };
    const songs = await attachSongFeedback(supabase, data || []);
    return { status: songs.length ? "ready" : "empty", songs };
  } catch {
    return { status: "error", songs: [], message: "Supabase is not configured or reachable." };
  }
}

/** Staff-facing: every file on the project (not just visible_to_client). */
export async function getPortalFilesForProject(projectId: string): Promise<StaffPortalFilesResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("portal_files").select(FILE_COLUMNS).eq("project_id", projectId).order("created_at", { ascending: false });
    if (error) return { status: "error", files: [], message: "Apply the Client Portal Supabase migration to manage files." };
    const files = mapFiles(data || []);
    return { status: files.length ? "ready" : "empty", files };
  } catch {
    return { status: "error", files: [], message: "Supabase is not configured or reachable." };
  }
}

async function resolveToken(rawToken: unknown) {
  return getProjectSetupByRawToken(rawToken);
}

/** The exact query a client's token resolves to (visible_to_client-filtered songs/files). Shared by the real token path and the staff preview path so "what staff sees in preview" can never drift from "what the client actually sees." */
async function fetchClientVisibleContent(supabase: ReturnType<typeof createSupabaseAdminClient>, projectId: string) {
  const [{ data: rawSongs, error: songsError }, { data: rawFiles, error: filesError }] = await Promise.all([
    supabase.from("portal_songs").select(SONG_COLUMNS).eq("project_id", projectId).eq("visible_to_client", true).order("created_at", { ascending: false }),
    supabase.from("portal_files").select(FILE_COLUMNS).eq("project_id", projectId).eq("visible_to_client", true).order("created_at", { ascending: false })
  ]);
  if (songsError || filesError) return null;
  const songs = await attachSongFeedback(supabase, rawSongs || []);
  const files = mapFiles(rawFiles || []);
  return { songs, files };
}

export async function getClientPortalByToken(rawToken: unknown): Promise<PortalResult> {
  const access = await resolveToken(rawToken);
  if (access.status === "not_found" || access.status === "revoked") return access;
  if (access.status === "error") return { status: "error", message: access.message };

  try {
    const supabase = createSupabaseAdminClient();
    const content = await fetchClientVisibleContent(supabase, access.view.project.id);
    if (!content) return { status: "error", message: "Client Portal storage is not ready. Apply the latest Supabase migration." };
    const stageResult = await getPortalStagesForProject(access.view.project.id);
    return { status: "found", view: { project: access.view.project, client: access.view.client, songs: content.songs, files: content.files, stages: stageResult.stages } };
  } catch {
    return { status: "error", message: "The Client Portal is temporarily unavailable." };
  }
}

/**
 * Staff-only "view as client" preview: the same visible_to_client-filtered content a real
 * token would resolve to, fetched directly by projectId instead — no client token needed,
 * since the caller is already authenticated as staff (this lives under /dashboard, which
 * middleware already gates). Never exposes a real client token, so it can't be misused to
 * reach the live portal without going through the actual issued link.
 */
export async function getPortalPreviewForProject(projectId: string, project: ClientPortalView["project"], client: ClientPortalView["client"]): Promise<PortalResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const content = await fetchClientVisibleContent(supabase, projectId);
    if (!content) return { status: "error", message: "Client Portal storage is not ready. Apply the latest Supabase migration." };
    const stageResult = await getPortalStagesForProject(projectId);
    return { status: "found", view: { project, client, songs: content.songs, files: content.files, stages: stageResult.stages } };
  } catch {
    return { status: "error", message: "The Client Portal is temporarily unavailable." };
  }
}

/** Staff reply/note in the mix room activity thread — the admin-side counterpart to addClientPortalComment. Caller must already have checked role. */
export async function addStaffPortalComment(projectId: string, input: { songId: string; body: string; timestampSeconds?: number | null; authorName: string }) {
  const body = input.body.trim();
  const authorName = input.authorName.trim();
  if (!body || body.length > 2000 || !authorName || authorName.length > 100) return { status: "error" as const, message: "Enter a name and a comment under 2,000 characters." };

  const supabase = createSupabaseAdminClient();
  const { data: song } = await supabase.from("portal_songs").select("id, property_id, project_id").eq("id", input.songId).eq("project_id", projectId).maybeSingle();
  if (!song) return { status: "error" as const, message: "That song is not available in this project." };
  const timestamp = Number.isInteger(input.timestampSeconds) && Number(input.timestampSeconds) >= 0 ? Number(input.timestampSeconds) : null;
  const { error } = await supabase.from("portal_file_comments").insert({ property_id: song.property_id, project_id: song.project_id, song_id: song.id, author_type: "staff", author_name: authorName, body, timestamp_seconds: timestamp });
  return error ? { status: "error" as const, message: "Your note could not be saved." } : { status: "success" as const };
}

/** Staff-only moderation: remove any note in the thread (theirs or the client's) — e.g. to clean up test data or a note that no longer applies after a re-upload. Caller must already have checked role. */
export async function deletePortalComment(projectId: string, commentId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: comment } = await supabase.from("portal_file_comments").select("id").eq("id", commentId).eq("project_id", projectId).maybeSingle();
  if (!comment) return { status: "error" as const, message: "That note could not be found." };
  const { error } = await supabase.from("portal_file_comments").delete().eq("id", commentId);
  return error ? { status: "error" as const, message: "The note could not be removed." } : { status: "success" as const };
}

export async function addClientPortalComment(rawToken: unknown, input: { songId: string; body: string; timestampSeconds?: number | null; authorName: string }) {
  const access = await resolveToken(rawToken);
  if (access.status !== "found") return { status: "error" as const, message: "This private link is no longer valid." };
  const body = input.body.trim();
  const authorName = input.authorName.trim();
  if (!body || body.length > 2000 || !authorName || authorName.length > 100) return { status: "error" as const, message: "Enter a name and a comment under 2,000 characters." };

  const supabase = createSupabaseAdminClient();
  const { data: song } = await supabase.from("portal_songs").select("id, property_id, project_id").eq("id", input.songId).eq("project_id", access.view.project.id).eq("visible_to_client", true).maybeSingle();
  if (!song) return { status: "error" as const, message: "That song is not available in this portal." };
  const timestamp = Number.isInteger(input.timestampSeconds) && Number(input.timestampSeconds) >= 0 ? Number(input.timestampSeconds) : null;
  const { error } = await supabase.from("portal_file_comments").insert({ property_id: song.property_id, project_id: song.project_id, song_id: song.id, author_type: "client", author_name: authorName, body, timestamp_seconds: timestamp });
  return error ? { status: "error" as const, message: "Your comment could not be saved." } : { status: "success" as const };
}

export async function setClientPortalApproval(rawToken: unknown, input: { songId: string; status: PortalApprovalStatus; clientName: string; note?: string | null }) {
  const access = await resolveToken(rawToken);
  if (access.status !== "found") return { status: "error" as const, message: "This private link is no longer valid." };
  const clientName = input.clientName.trim();
  const note = input.note?.trim() || null;
  if (!clientName || clientName.length > 100 || (note && note.length > 2000)) return { status: "error" as const, message: "Enter your name and keep the note under 2,000 characters." };
  if (input.status !== "approved" && input.status !== "changes_requested") return { status: "error" as const, message: "Choose a valid review status." };

  const supabase = createSupabaseAdminClient();
  const { data: song } = await supabase.from("portal_songs").select("id, property_id, project_id").eq("id", input.songId).eq("project_id", access.view.project.id).eq("visible_to_client", true).maybeSingle();
  if (!song) return { status: "error" as const, message: "That song is not available in this portal." };
  const { error } = await supabase.from("portal_file_approvals").upsert({ song_id: song.id, property_id: song.property_id, project_id: song.project_id, status: input.status, client_name: clientName, note, updated_at: new Date().toISOString() }, { onConflict: "song_id" });
  return error ? { status: "error" as const, message: "Your review could not be saved." } : { status: "success" as const };
}
