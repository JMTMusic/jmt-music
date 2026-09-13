import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProjectSetupByRawToken } from "@/lib/project-setup/repository";
import type { ClientPortalView, PortalApprovalStatus, PortalComment, PortalFile, PortalFileType } from "./types";

type PortalResult =
  | { status: "found"; view: ClientPortalView }
  | { status: "not_found" | "revoked" }
  | { status: "error"; message: string };

export type StaffPortalFilesResult = { status: "ready" | "empty" | "error"; files: PortalFile[]; message?: string };

export async function getPortalFilesForProject(projectId: string): Promise<StaffPortalFilesResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("portal_files")
      .select("id, title, file_type, version_label, drive_url, note, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) return { status: "error", files: [], message: "Apply the Client Portal Supabase migration to manage files." };
    const files: PortalFile[] = (data || []).map((file) => ({ id: file.id, title: file.title, fileType: file.file_type, versionLabel: file.version_label, driveUrl: file.drive_url, note: file.note, createdAt: file.created_at, comments: [], approval: null }));
    return { status: files.length ? "ready" : "empty", files };
  } catch {
    return { status: "error", files: [], message: "Supabase is not configured or reachable." };
  }
}

async function resolveToken(rawToken: unknown) {
  return getProjectSetupByRawToken(rawToken);
}

export async function getClientPortalByToken(rawToken: unknown): Promise<PortalResult> {
  const access = await resolveToken(rawToken);
  if (access.status === "not_found" || access.status === "revoked") return access;
  if (access.status === "error") return { status: "error", message: access.message };

  try {
    const supabase = createSupabaseAdminClient();
    const { data: files, error } = await supabase
      .from("portal_files")
      .select("id, title, file_type, version_label, drive_url, note, created_at")
      .eq("project_id", access.view.project.id)
      .eq("visible_to_client", true)
      .order("created_at", { ascending: false });
    if (error) return { status: "error", message: "Client Portal storage is not ready. Apply the latest Supabase migration." };

    const fileIds = (files || []).map((file) => file.id);
    const [{ data: comments }, { data: approvals }] = fileIds.length
      ? await Promise.all([
          supabase.from("portal_file_comments").select("id, file_id, author_type, author_name, body, timestamp_seconds, created_at").in("file_id", fileIds).order("created_at"),
          supabase.from("portal_file_approvals").select("file_id, status, client_name, note, updated_at").in("file_id", fileIds)
        ])
      : [{ data: [] }, { data: [] }];

    const mapped: PortalFile[] = (files || []).map((file) => ({
      id: file.id,
      title: file.title,
      fileType: file.file_type as PortalFileType,
      versionLabel: file.version_label,
      driveUrl: file.drive_url,
      note: file.note,
      createdAt: file.created_at,
      comments: (comments || []).filter((item) => item.file_id === file.id).map((item) => ({
        id: item.id,
        authorName: item.author_name,
        authorType: item.author_type,
        body: item.body,
        timestampSeconds: item.timestamp_seconds,
        createdAt: item.created_at
      } as PortalComment)),
      approval: (() => {
        const approval = (approvals || []).find((item) => item.file_id === file.id);
        return approval ? { status: approval.status, clientName: approval.client_name, note: approval.note, updatedAt: approval.updated_at } : null;
      })()
    }));

    return { status: "found", view: { project: access.view.project, client: access.view.client, files: mapped } };
  } catch {
    return { status: "error", message: "The Client Portal is temporarily unavailable." };
  }
}

export async function addClientPortalComment(rawToken: unknown, input: { fileId: string; body: string; timestampSeconds?: number | null; authorName: string }) {
  const access = await resolveToken(rawToken);
  if (access.status !== "found") return { status: "error" as const, message: "This private link is no longer valid." };
  const body = input.body.trim();
  const authorName = input.authorName.trim();
  if (!body || body.length > 2000 || !authorName || authorName.length > 100) return { status: "error" as const, message: "Enter a name and a comment under 2,000 characters." };

  const supabase = createSupabaseAdminClient();
  const { data: file } = await supabase.from("portal_files").select("id, property_id, project_id").eq("id", input.fileId).eq("project_id", access.view.project.id).eq("visible_to_client", true).maybeSingle();
  if (!file) return { status: "error" as const, message: "That file is not available in this portal." };
  const timestamp = Number.isInteger(input.timestampSeconds) && Number(input.timestampSeconds) >= 0 ? Number(input.timestampSeconds) : null;
  const { error } = await supabase.from("portal_file_comments").insert({ property_id: file.property_id, project_id: file.project_id, file_id: file.id, author_type: "client", author_name: authorName, body, timestamp_seconds: timestamp });
  return error ? { status: "error" as const, message: "Your comment could not be saved." } : { status: "success" as const };
}

export async function setClientPortalApproval(rawToken: unknown, input: { fileId: string; status: PortalApprovalStatus; clientName: string; note?: string | null }) {
  const access = await resolveToken(rawToken);
  if (access.status !== "found") return { status: "error" as const, message: "This private link is no longer valid." };
  const clientName = input.clientName.trim();
  const note = input.note?.trim() || null;
  if (!clientName || clientName.length > 100 || (note && note.length > 2000)) return { status: "error" as const, message: "Enter your name and keep the note under 2,000 characters." };
  if (input.status !== "approved" && input.status !== "changes_requested") return { status: "error" as const, message: "Choose a valid review status." };

  const supabase = createSupabaseAdminClient();
  const { data: file } = await supabase.from("portal_files").select("id, property_id, project_id").eq("id", input.fileId).eq("project_id", access.view.project.id).eq("visible_to_client", true).maybeSingle();
  if (!file) return { status: "error" as const, message: "That file is not available in this portal." };
  const { error } = await supabase.from("portal_file_approvals").upsert({ file_id: file.id, property_id: file.property_id, project_id: file.project_id, status: input.status, client_name: clientName, note, updated_at: new Date().toISOString() });
  return error ? { status: "error" as const, message: "Your review could not be saved." } : { status: "success" as const };
}
