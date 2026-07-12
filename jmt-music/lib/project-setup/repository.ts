import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SiteConfig } from "@/lib/control-center/types";
import { canPerformAction, resultingStatus, shouldSetStartedAt } from "./pipeline";
import { generateRawToken, hashRawToken, isPlausibleRawToken } from "./tokens";
import type {
  CompletedBy,
  CreateProjectSetupInput,
  CreateProjectSetupResult,
  ProjectSetupLookupResult,
  ProjectSetupMutationResult,
  ProjectSetupRecord,
  ProjectSetupStatus,
  PublicProjectSetupResult,
  PublicProjectSetupView,
  ReissueTokenResult,
  TokenLookupResult
} from "./types";
import { validateCompletedBy, validateOptionalDiscoveryId, validateProjectId, validateResponses } from "./validation";

/**
 * Never SELECT access_token_hash as part of the general column set — it's only ever
 * touched by the two functions that write it (create, reissue) and the one internal
 * helper that looks a row up BY it. No code path needs to read it back out and display
 * or return it anywhere.
 */
const RECORD_COLUMNS =
  "id, property_id, project_id, discovery_id, token_created_at, token_version, access_revoked_at, status, responses, completed_by, internal_notes, created_by, sent_at, started_at, submitted_at, confirmed_at, reopened_at, created_at, updated_at";

type ProjectSetupRow = {
  id: string;
  property_id: string;
  project_id: string;
  discovery_id: string | null;
  token_created_at: string | null;
  token_version: number;
  access_revoked_at: string | null;
  status: ProjectSetupStatus;
  responses: Record<string, unknown> | null;
  completed_by: CompletedBy | null;
  internal_notes: string | null;
  created_by: string | null;
  sent_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  confirmed_at: string | null;
  reopened_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: ProjectSetupRow): ProjectSetupRecord {
  return {
    id: row.id,
    propertyId: row.property_id,
    projectId: row.project_id,
    discoveryId: row.discovery_id,
    tokenCreatedAt: row.token_created_at,
    tokenVersion: row.token_version,
    accessRevokedAt: row.access_revoked_at,
    status: row.status,
    responses: row.responses || {},
    completedBy: row.completed_by,
    internalNotes: row.internal_notes,
    createdBy: row.created_by,
    sentAt: row.sent_at,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    confirmedAt: row.confirmed_at,
    reopenedAt: row.reopened_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const MIGRATION_HINT = "Supabase query failed — has migration 20260711190000_project_setups.sql been applied yet?";

async function resolvePropertyId(site: SiteConfig): Promise<{ id: string } | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("properties").select("id").eq("slug", site.id).maybeSingle();
  if (error || !data) return null;
  return data;
}

/**
 * Shared by every internal (Control Center) function: resolves the property, then finds
 * the Setup for one Project scoped to that property. Never trusts a bare projectId alone.
 */
async function findByProjectForProperty(
  site: SiteConfig,
  projectId: string
): Promise<{ status: "found"; row: ProjectSetupRow } | { status: "not_found" } | { status: "error"; message: string }> {
  const property = await resolvePropertyId(site);
  if (!property) return { status: "error", message: "Property not found in Supabase" };

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("project_setups")
      .select(RECORD_COLUMNS)
      .eq("project_id", projectId)
      .eq("property_id", property.id)
      .maybeSingle();

    if (error) return { status: "error", message: MIGRATION_HINT };
    if (!data) return { status: "not_found" };
    return { status: "found", row: data as unknown as ProjectSetupRow };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/**
 * Shared by every token-gated PUBLIC function: hashes the presented token, looks up the
 * row by hash alone (no property/site context — the token is the entire authorization),
 * and rejects a revoked row before the caller ever sees it. Malformed input is treated
 * identically to "not found" rather than surfacing a distinct validation error, so a
 * probing request can't learn anything about why a token didn't work.
 */
async function resolveActiveByToken(
  rawToken: unknown
): Promise<
  | { status: "found"; row: ProjectSetupRow }
  | { status: "not_found" }
  | { status: "revoked" }
  | { status: "error"; message: string }
> {
  if (!isPlausibleRawToken(rawToken)) return { status: "not_found" };

  try {
    const supabase = createSupabaseAdminClient();
    const hash = hashRawToken(rawToken);
    const { data, error } = await supabase
      .from("project_setups")
      .select(RECORD_COLUMNS)
      .eq("access_token_hash", hash)
      .maybeSingle();

    if (error) return { status: "error", message: MIGRATION_HINT };
    if (!data) return { status: "not_found" };

    const row = data as unknown as ProjectSetupRow;
    if (row.access_revoked_at) return { status: "revoked" };
    return { status: "found", row };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

async function toPublicView(row: ProjectSetupRow): Promise<PublicProjectSetupView | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: project } = await supabase
      .from("projects")
      .select("id, title, type, client_id")
      .eq("id", row.project_id)
      .maybeSingle();
    if (!project) return null;

    let artistName = "";
    let contactName: string | null = null;
    if (project.client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("artist_name, contact_name")
        .eq("id", project.client_id)
        .maybeSingle();
      if (client) {
        artistName = client.artist_name || "";
        contactName = client.contact_name;
      }
    }

    return {
      id: row.id,
      status: row.status,
      responses: row.responses || {},
      completedBy: row.completed_by,
      startedAt: row.started_at,
      submittedAt: row.submitted_at,
      project: { id: project.id, title: project.title, type: project.type },
      client: { artistName, contactName }
    };
  } catch {
    return null;
  }
}

/** #1 — Internal. Reads one Project's Setup, scoped to the property. */
export async function getProjectSetupByProjectId(site: SiteConfig, projectId: string): Promise<ProjectSetupLookupResult> {
  const result = await findByProjectForProperty(site, projectId);
  if (result.status === "error") return { status: "error", message: result.message };
  if (result.status === "not_found") return { status: "not_found" };
  return { status: "found", setup: mapRow(result.row) };
}

/** #2 — Public. The only lookup the future artist-facing route needs; token is the entire authorization. */
export async function getProjectSetupByRawToken(rawToken: unknown): Promise<TokenLookupResult> {
  const resolved = await resolveActiveByToken(rawToken);
  if (resolved.status === "error") return { status: "error", message: resolved.message };
  if (resolved.status === "not_found") return { status: "not_found" };
  if (resolved.status === "revoked") return { status: "revoked" };

  const view = await toPublicView(resolved.row);
  if (!view) return { status: "error", message: "Setup found but its linked Project could not be resolved." };
  return { status: "found", view };
}

/**
 * #3 — Internal. Creates a Setup for a Project. Idempotent by design: only one Setup may
 * exist per Project (enforced by the migration's unique constraint on project_id), and a
 * duplicate call safely returns the existing row instead of erroring — but note the raw
 * token is ONLY ever present in the "created" result. An "exists" result never carries a
 * raw token because it was never persisted anywhere; call reissueProjectSetupToken if a
 * link needs to be (re)sent for a Setup that already exists.
 */
export async function createProjectSetup(site: SiteConfig, input: CreateProjectSetupInput): Promise<CreateProjectSetupResult> {
  let projectId: string;
  let discoveryId: string | null;
  try {
    projectId = validateProjectId(input.projectId);
    discoveryId = validateOptionalDiscoveryId(input.discoveryId);
  } catch (validationError) {
    return { status: "error", message: validationError instanceof Error ? validationError.message : "Invalid input." };
  }

  const property = await resolvePropertyId(site);
  if (!property) return { status: "error", message: "Property not found in Supabase" };

  try {
    const supabase = createSupabaseAdminClient();

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("property_id", property.id)
      .maybeSingle();
    if (projectError || !project) return { status: "error", message: "That project does not belong to the selected property." };

    const existing = await supabase.from("project_setups").select(RECORD_COLUMNS).eq("project_id", projectId).maybeSingle();
    if (existing.data) return { status: "exists", setup: mapRow(existing.data as unknown as ProjectSetupRow) };

    const rawToken = generateRawToken();
    const insertResult = await supabase
      .from("project_setups")
      .insert({
        property_id: property.id,
        project_id: projectId,
        discovery_id: discoveryId,
        access_token_hash: hashRawToken(rawToken),
        token_created_at: new Date().toISOString(),
        token_version: 1,
        created_by: input.createdBy || null
      })
      .select(RECORD_COLUMNS)
      .single();

    // Race guard: two concurrent creates could both pass the existence check above.
    // The unique constraint on project_id rejects the second insert (23505) — re-fetch
    // and return the now-existing row rather than surfacing a raw duplicate-key error.
    if (insertResult.error?.code === "23505") {
      const retry = await supabase.from("project_setups").select(RECORD_COLUMNS).eq("project_id", projectId).maybeSingle();
      if (retry.data) return { status: "exists", setup: mapRow(retry.data as unknown as ProjectSetupRow) };
    }

    if (insertResult.error || !insertResult.data) return { status: "error", message: "The Setup could not be created." };

    return { status: "created", setup: mapRow(insertResult.data as unknown as ProjectSetupRow), rawToken };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/**
 * #4 — Internal. Mints a brand new token, invalidating the previous one immediately —
 * there is only ever one access_token_hash stored, so overwriting it is the invalidation.
 * Does not touch responses or any lifecycle timestamp; also clears any prior revocation,
 * since issuing a fresh link is how you'd restore access after a revoke.
 */
export async function reissueProjectSetupToken(site: SiteConfig, projectId: string): Promise<ReissueTokenResult> {
  const existing = await findByProjectForProperty(site, projectId);
  if (existing.status === "error") return { status: "error", message: existing.message };
  if (existing.status === "not_found") return { status: "error", message: "No Setup exists for this project yet." };

  try {
    const supabase = createSupabaseAdminClient();
    const rawToken = generateRawToken();
    const { data, error } = await supabase
      .from("project_setups")
      .update({
        access_token_hash: hashRawToken(rawToken),
        token_version: existing.row.token_version + 1,
        token_created_at: new Date().toISOString(),
        access_revoked_at: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.row.id)
      .select(RECORD_COLUMNS)
      .single();

    if (error || !data) return { status: "error", message: "The token could not be reissued." };
    return { status: "success", setup: mapRow(data as unknown as ProjectSetupRow), rawToken };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/** #5 — Internal. Revokes access without touching status, responses, or any other lifecycle field. */
export async function revokeProjectSetupAccess(site: SiteConfig, projectId: string): Promise<ProjectSetupMutationResult> {
  const existing = await findByProjectForProperty(site, projectId);
  if (existing.status === "error") return { status: "error", message: existing.message };
  if (existing.status === "not_found") return { status: "error", message: "No Setup exists for this project yet." };

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("project_setups")
      .update({ access_revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", existing.row.id)
      .select(RECORD_COLUMNS)
      .single();

    if (error || !data) return { status: "error", message: "Access could not be revoked." };
    return { status: "success", setup: mapRow(data as unknown as ProjectSetupRow) };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/** #6 — Public. Sets startedAt only the first time; otherwise idempotent from in_progress. */
export async function startProjectSetup(rawToken: unknown): Promise<PublicProjectSetupResult> {
  const resolved = await resolveActiveByToken(rawToken);
  if (resolved.status === "error") return { status: "error", message: resolved.message };
  if (resolved.status === "not_found") return { status: "error", message: "This link is invalid." };
  if (resolved.status === "revoked") return { status: "error", message: "This link is no longer active." };

  const row = resolved.row;
  if (!canPerformAction("start", row.status)) return { status: "error", message: "This Setup can no longer be started." };

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("project_setups")
      .update({
        status: resultingStatus("start", row.status),
        started_at: shouldSetStartedAt(row.started_at) ? new Date().toISOString() : row.started_at,
        updated_at: new Date().toISOString()
      })
      .eq("id", row.id)
      .select(RECORD_COLUMNS)
      .single();

    if (error || !data) return { status: "error", message: "The Setup could not be started." };
    const view = await toPublicView(data as unknown as ProjectSetupRow);
    if (!view) return { status: "error", message: "Setup started but could not be reloaded." };
    return { status: "success", view };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/**
 * #7 — Public. The ONLY field this writes is `responses` — there is no parameter through
 * which a caller could pass a status or protected timestamp. Rejected once the Setup has
 * moved past in_progress; reopen it first.
 */
export async function saveProjectSetupDraft(rawToken: unknown, responsesInput: unknown): Promise<PublicProjectSetupResult> {
  const resolved = await resolveActiveByToken(rawToken);
  if (resolved.status === "error") return { status: "error", message: resolved.message };
  if (resolved.status === "not_found") return { status: "error", message: "This link is invalid." };
  if (resolved.status === "revoked") return { status: "error", message: "This link is no longer active." };

  const row = resolved.row;
  if (row.status === "submitted" || row.status === "confirmed") {
    return { status: "error", message: "This Setup has already been submitted. Reopen it before making further changes." };
  }

  let responses: Record<string, unknown>;
  try {
    responses = validateResponses(responsesInput);
  } catch (validationError) {
    return { status: "error", message: validationError instanceof Error ? validationError.message : "Invalid responses." };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("project_setups")
      .update({ responses, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .select(RECORD_COLUMNS)
      .single();

    if (error || !data) return { status: "error", message: "The draft could not be saved." };
    const view = await toPublicView(data as unknown as ProjectSetupRow);
    if (!view) return { status: "error", message: "Draft saved but could not be reloaded." };
    return { status: "success", view };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/** #8 — Public. Requires a validated completedBy; rejects if not currently draft/in_progress. */
export async function submitProjectSetup(rawToken: unknown, completedByInput: unknown): Promise<PublicProjectSetupResult> {
  const resolved = await resolveActiveByToken(rawToken);
  if (resolved.status === "error") return { status: "error", message: resolved.message };
  if (resolved.status === "not_found") return { status: "error", message: "This link is invalid." };
  if (resolved.status === "revoked") return { status: "error", message: "This link is no longer active." };

  const row = resolved.row;
  if (!canPerformAction("submit", row.status)) return { status: "error", message: "This Setup has already been submitted." };

  let completedBy: CompletedBy;
  try {
    completedBy = validateCompletedBy(completedByInput);
  } catch (validationError) {
    return { status: "error", message: validationError instanceof Error ? validationError.message : "Invalid input." };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("project_setups")
      .update({
        status: resultingStatus("submit", row.status),
        submitted_at: new Date().toISOString(),
        completed_by: completedBy,
        updated_at: new Date().toISOString()
      })
      .eq("id", row.id)
      .select(RECORD_COLUMNS)
      .single();

    if (error || !data) return { status: "error", message: "The Setup could not be submitted." };
    const view = await toPublicView(data as unknown as ProjectSetupRow);
    if (!view) return { status: "error", message: "Setup submitted but could not be reloaded." };
    return { status: "success", view };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/** #9 — Internal. Only valid from submitted; this is Jonathan's own final sign-off. */
export async function confirmProjectSetup(site: SiteConfig, projectId: string): Promise<ProjectSetupMutationResult> {
  const existing = await findByProjectForProperty(site, projectId);
  if (existing.status === "error") return { status: "error", message: existing.message };
  if (existing.status === "not_found") return { status: "error", message: "No Setup exists for this project yet." };
  if (!canPerformAction("confirm", existing.row.status)) {
    return { status: "error", message: "Only a submitted Setup can be confirmed." };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("project_setups")
      .update({
        status: resultingStatus("confirm", existing.row.status),
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.row.id)
      .select(RECORD_COLUMNS)
      .single();

    if (error || !data) return { status: "error", message: "The Setup could not be confirmed." };
    return { status: "success", setup: mapRow(data as unknown as ProjectSetupRow) };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/** #10 — Internal. Only valid from submitted/confirmed. Does not touch token/access. */
export async function reopenProjectSetup(site: SiteConfig, projectId: string): Promise<ProjectSetupMutationResult> {
  const existing = await findByProjectForProperty(site, projectId);
  if (existing.status === "error") return { status: "error", message: existing.message };
  if (existing.status === "not_found") return { status: "error", message: "No Setup exists for this project yet." };
  if (!canPerformAction("reopen", existing.row.status)) {
    return { status: "error", message: "Only a submitted or confirmed Setup can be reopened." };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("project_setups")
      .update({
        status: resultingStatus("reopen", existing.row.status),
        reopened_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.row.id)
      .select(RECORD_COLUMNS)
      .single();

    if (error || !data) return { status: "error", message: "The Setup could not be reopened." };
    return { status: "success", setup: mapRow(data as unknown as ProjectSetupRow) };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}
