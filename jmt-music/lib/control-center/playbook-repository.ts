import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Play, PlayCategory, PlayStatus, PlayVersion, SiteConfig } from "./types";

type PlayRow = {
  id: string;
  property_id: string;
  category: PlayCategory;
  title: string;
  purpose: string | null;
  best_used_for: string[] | null;
  message_body: string;
  variables: string[] | null;
  internal_notes: string | null;
  version_number: number;
  status: PlayStatus;
  is_favorite: boolean;
  tags: string[] | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type PlayVersionRow = {
  id: string;
  playbook_id: string;
  version_number: number;
  title: string;
  purpose: string | null;
  message_body: string;
  variables: string[] | null;
  internal_notes: string | null;
  changed_by: string | null;
  changed_at: string;
};

export type PlaysResult = {
  plays: Play[];
  status: "empty" | "error" | "ready";
  detail: string;
};

export type PlayVersionsResult = {
  versions: PlayVersion[];
  status: "empty" | "error" | "ready";
  detail: string;
};

const PLAY_COLUMNS =
  "id, property_id, category, title, purpose, best_used_for, message_body, variables, internal_notes, version_number, status, is_favorite, tags, sort_order, created_by, created_at, updated_at";

const PLAY_VERSION_COLUMNS =
  "id, playbook_id, version_number, title, purpose, message_body, variables, internal_notes, changed_by, changed_at";

function mapPlayRow(row: PlayRow): Play {
  return {
    id: row.id,
    propertyId: row.property_id,
    category: row.category,
    title: row.title,
    purpose: row.purpose,
    bestUsedFor: row.best_used_for || [],
    messageBody: row.message_body,
    variables: row.variables || [],
    internalNotes: row.internal_notes,
    versionNumber: row.version_number,
    status: row.status,
    isFavorite: row.is_favorite,
    tags: row.tags || [],
    sortOrder: row.sort_order,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPlayVersionRow(row: PlayVersionRow): PlayVersion {
  return {
    id: row.id,
    playbookId: row.playbook_id,
    versionNumber: row.version_number,
    title: row.title,
    purpose: row.purpose,
    messageBody: row.message_body,
    variables: row.variables || [],
    internalNotes: row.internal_notes,
    changedBy: row.changed_by,
    changedAt: row.changed_at
  };
}

async function resolvePropertyId(site: SiteConfig): Promise<{ id: string } | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("properties").select("id").eq("slug", site.id).maybeSingle();
  if (error || !data) return null;
  return data;
}

/**
 * Reads every Play for one validated property. No fabricated starter content ships with
 * this repository — an empty result renders a polished empty state, not a fake Playbook
 * presented as real, proven communication.
 */
export async function getPropertyPlays(site: SiteConfig, includeArchived = false): Promise<PlaysResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const property = await resolvePropertyId(site);
    if (!property) return { plays: [], status: "error", detail: "Property not found in Supabase" };

    let query = supabase
      .from("communication_playbook")
      .select(PLAY_COLUMNS)
      .eq("property_id", property.id)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });

    if (!includeArchived) query = query.neq("status", "archived");

    const { data, error } = await query;

    if (error) {
      return { plays: [], status: "error", detail: "Supabase Playbook query failed — has migration 8 (communication_playbook) been applied yet?" };
    }

    const plays = ((data || []) as unknown as PlayRow[]).map(mapPlayRow);
    return {
      plays,
      status: plays.length ? "ready" : "empty",
      detail: plays.length ? `${plays.length} Play${plays.length === 1 ? "" : "s"} from Supabase` : "No Plays yet"
    };
  } catch {
    return { plays: [], status: "error", detail: "Supabase is not configured or reachable" };
  }
}

/** Reads a single Play by id, scoped to the property (never trusts a bare id from the URL alone). */
export async function getPlayById(site: SiteConfig, playId: string): Promise<Play | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const property = await resolvePropertyId(site);
    if (!property) return null;

    const { data, error } = await supabase
      .from("communication_playbook")
      .select(PLAY_COLUMNS)
      .eq("id", playId)
      .eq("property_id", property.id)
      .maybeSingle();

    if (error || !data) return null;
    return mapPlayRow(data as unknown as PlayRow);
  } catch {
    return null;
  }
}

/** Version history for one Play, newest first. Read-only — no restore/diff feature in this build. */
export async function getPlayVersionHistory(site: SiteConfig, playId: string): Promise<PlayVersionsResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const property = await resolvePropertyId(site);
    if (!property) return { versions: [], status: "error", detail: "Property not found in Supabase" };

    // Ownership check happens via playbook_id join at the call site (the page already
    // loads the parent Play scoped to this property before requesting its history).
    const { data, error } = await supabase
      .from("communication_playbook_versions")
      .select(PLAY_VERSION_COLUMNS)
      .eq("playbook_id", playId)
      .order("version_number", { ascending: false });

    if (error) {
      return { versions: [], status: "error", detail: "Supabase version history query failed — has migration 8 been applied yet?" };
    }

    const versions = ((data || []) as unknown as PlayVersionRow[]).map(mapPlayVersionRow);
    return {
      versions,
      status: versions.length ? "ready" : "empty",
      detail: versions.length ? `${versions.length} prior version${versions.length === 1 ? "" : "s"}` : "No prior versions yet"
    };
  } catch {
    return { versions: [], status: "error", detail: "Supabase is not configured or reachable" };
  }
}
