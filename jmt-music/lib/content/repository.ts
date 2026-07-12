import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SiteConfig } from "@/lib/control-center/types";
import { canTransitionContentStatus, computeAttentionCounts, shouldSetPublishedAt } from "./pipeline";
import { CONTENT_STATUSES } from "./types";
import type {
  ContentAttentionCounts,
  ContentItemLookupResult,
  ContentItemMutationResult,
  ContentItemRecord,
  ContentItemsResult,
  ContentPlatform,
  ContentPriority,
  ContentStatus,
  ContentType,
  ListContentItemsFilters
} from "./types";
import { validateCreateContentItemInput, validateUpdateContentItemInput } from "./validation";

/**
 * Never SELECT anything beyond what's declared here — kept explicit (rather than
 * `select("*")`) so adding a sensitive column later requires a deliberate decision to add
 * it to this list, the same defensive habit already used in lib/project-setup/repository.ts.
 */
const RECORD_COLUMNS =
  "id, property_id, title, content_type, status, priority, platforms, platform_urls, notes, project_id, client_id, beat_id, scheduled_at, published_at, asset_video_ready, asset_video_url, asset_audio_ready, asset_audio_url, asset_artwork_ready, asset_artwork_url, asset_thumbnail_ready, asset_thumbnail_url, asset_caption_ready, caption, asset_hashtags_ready, hashtags, created_by, created_at, updated_at";

type ContentItemRow = {
  id: string;
  property_id: string;
  title: string;
  content_type: ContentType | null;
  status: ContentStatus;
  priority: ContentPriority;
  platforms: ContentPlatform[] | null;
  platform_urls: Record<string, string> | null;
  notes: string | null;
  project_id: string | null;
  client_id: string | null;
  beat_id: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  asset_video_ready: boolean;
  asset_video_url: string | null;
  asset_audio_ready: boolean;
  asset_audio_url: string | null;
  asset_artwork_ready: boolean;
  asset_artwork_url: string | null;
  asset_thumbnail_ready: boolean;
  asset_thumbnail_url: string | null;
  asset_caption_ready: boolean;
  caption: string | null;
  asset_hashtags_ready: boolean;
  hashtags: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: ContentItemRow): ContentItemRecord {
  return {
    id: row.id,
    propertyId: row.property_id,
    title: row.title,
    contentType: row.content_type,
    status: row.status,
    priority: row.priority,
    platforms: row.platforms || [],
    platformUrls: row.platform_urls || {},
    notes: row.notes,
    projectId: row.project_id,
    clientId: row.client_id,
    beatId: row.beat_id,
    scheduledAt: row.scheduled_at,
    publishedAt: row.published_at,
    assetVideoReady: row.asset_video_ready,
    assetVideoUrl: row.asset_video_url,
    assetAudioReady: row.asset_audio_ready,
    assetAudioUrl: row.asset_audio_url,
    assetArtworkReady: row.asset_artwork_ready,
    assetArtworkUrl: row.asset_artwork_url,
    assetThumbnailReady: row.asset_thumbnail_ready,
    assetThumbnailUrl: row.asset_thumbnail_url,
    assetCaptionReady: row.asset_caption_ready,
    caption: row.caption,
    assetHashtagsReady: row.asset_hashtags_ready,
    hashtags: row.hashtags || [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const MIGRATION_HINT = "Supabase query failed — has migration 20260711200000_content_items.sql been applied yet?";

async function resolvePropertyId(site: SiteConfig): Promise<{ id: string } | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("properties").select("id").eq("slug", site.id).maybeSingle();
  if (error || !data) return null;
  return data;
}

/** Shared list/query path for listContentItems and every "by related X" helper below. */
async function queryContentItems(site: SiteConfig, filters: ListContentItemsFilters = {}): Promise<ContentItemsResult> {
  const property = await resolvePropertyId(site);
  if (!property) return { items: [], status: "error", detail: "Property not found in Supabase" };

  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase.from("content_items").select(RECORD_COLUMNS).eq("property_id", property.id);

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.priority) query = query.eq("priority", filters.priority);
    if (filters.projectId) query = query.eq("project_id", filters.projectId);
    if (filters.clientId) query = query.eq("client_id", filters.clientId);
    if (filters.beatId) query = query.eq("beat_id", filters.beatId);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return { items: [], status: "error", detail: MIGRATION_HINT };

    const items = ((data || []) as ContentItemRow[]).map(mapRow);
    return {
      items,
      status: items.length ? "ready" : "empty",
      detail: items.length ? `${items.length} content item${items.length === 1 ? "" : "s"} from Supabase` : "No content items yet"
    };
  } catch {
    return { items: [], status: "error", detail: "Supabase is not configured or reachable" };
  }
}

/** #1 — Every Content Item for one property, optionally filtered. The one round-trip other selectors/aggregations should derive from in memory rather than re-querying. */
export async function listContentItems(site: SiteConfig, filters: ListContentItemsFilters = {}): Promise<ContentItemsResult> {
  return queryContentItems(site, filters);
}

/** #2 — One Content Item, scoped to the property so a stray id from another property can never be read. */
export async function getContentItemById(site: SiteConfig, id: string): Promise<ContentItemLookupResult> {
  const property = await resolvePropertyId(site);
  if (!property) return { status: "error", message: "Property not found in Supabase" };

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("content_items")
      .select(RECORD_COLUMNS)
      .eq("id", id)
      .eq("property_id", property.id)
      .maybeSingle();

    if (error) return { status: "error", message: MIGRATION_HINT };
    if (!data) return { status: "not_found" };
    return { status: "found", item: mapRow(data as unknown as ContentItemRow) };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/**
 * #3 — Creates a Content Item. Always starts at 'idea' (the migration's column default;
 * this function never accepts or sets a status). Any optional Project/Client/Beat link is
 * verified to belong to the same property before the insert — a stray id from another
 * property is rejected rather than silently creating a cross-property reference.
 */
export async function createContentItem(site: SiteConfig, rawInput: unknown): Promise<ContentItemMutationResult> {
  let input;
  try {
    input = validateCreateContentItemInput(rawInput);
  } catch (validationError) {
    return { status: "error", message: validationError instanceof Error ? validationError.message : "Invalid input." };
  }

  const property = await resolvePropertyId(site);
  if (!property) return { status: "error", message: "Property not found in Supabase" };

  try {
    const supabase = createSupabaseAdminClient();

    const relationCheck = await verifyRelationsBelongToProperty(supabase, property.id, input.projectId, input.clientId, input.beatId);
    if (relationCheck) return { status: "error", message: relationCheck };

    const { data, error } = await supabase
      .from("content_items")
      .insert({
        property_id: property.id,
        title: input.title,
        content_type: input.contentType,
        priority: input.priority,
        platforms: input.platforms,
        platform_urls: input.platformUrls,
        notes: input.notes,
        project_id: input.projectId,
        client_id: input.clientId,
        beat_id: input.beatId,
        scheduled_at: input.scheduledAt,
        asset_video_ready: input.assetVideoReady,
        asset_video_url: input.assetVideoUrl,
        asset_audio_ready: input.assetAudioReady,
        asset_audio_url: input.assetAudioUrl,
        asset_artwork_ready: input.assetArtworkReady,
        asset_artwork_url: input.assetArtworkUrl,
        asset_thumbnail_ready: input.assetThumbnailReady,
        asset_thumbnail_url: input.assetThumbnailUrl,
        asset_caption_ready: input.assetCaptionReady,
        caption: input.caption,
        asset_hashtags_ready: input.assetHashtagsReady,
        hashtags: input.hashtags,
        created_by: input.createdBy
      })
      .select(RECORD_COLUMNS)
      .single();

    if (error || !data) return { status: "error", message: "The content item could not be created." };
    return { status: "success", item: mapRow(data as unknown as ContentItemRow) };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/**
 * #4 — General field update. `status` and `publishedAt` are structurally impossible to
 * set here — validateUpdateContentItemInput never reads either key from the raw input,
 * so there is no code path through this function that can move the pipeline stage or
 * backdate the publish timestamp. Use updateContentStatus for stage changes.
 */
export async function updateContentItem(site: SiteConfig, id: string, rawInput: unknown): Promise<ContentItemMutationResult> {
  let input;
  try {
    input = validateUpdateContentItemInput(rawInput);
  } catch (validationError) {
    return { status: "error", message: validationError instanceof Error ? validationError.message : "Invalid input." };
  }

  const property = await resolvePropertyId(site);
  if (!property) return { status: "error", message: "Property not found in Supabase" };

  try {
    const supabase = createSupabaseAdminClient();

    const existing = await supabase.from("content_items").select("id").eq("id", id).eq("property_id", property.id).maybeSingle();
    if (!existing.data) return { status: "error", message: "That content item does not belong to the selected property." };

    const relationCheck = await verifyRelationsBelongToProperty(supabase, property.id, input.projectId, input.clientId, input.beatId);
    if (relationCheck) return { status: "error", message: relationCheck };

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if ("title" in input) patch.title = input.title;
    if ("contentType" in input) patch.content_type = input.contentType;
    if ("priority" in input) patch.priority = input.priority;
    if ("platforms" in input) patch.platforms = input.platforms;
    if ("platformUrls" in input) patch.platform_urls = input.platformUrls;
    if ("notes" in input) patch.notes = input.notes;
    if ("projectId" in input) patch.project_id = input.projectId;
    if ("clientId" in input) patch.client_id = input.clientId;
    if ("beatId" in input) patch.beat_id = input.beatId;
    if ("scheduledAt" in input) patch.scheduled_at = input.scheduledAt;
    if ("assetVideoReady" in input) patch.asset_video_ready = input.assetVideoReady;
    if ("assetVideoUrl" in input) patch.asset_video_url = input.assetVideoUrl;
    if ("assetAudioReady" in input) patch.asset_audio_ready = input.assetAudioReady;
    if ("assetAudioUrl" in input) patch.asset_audio_url = input.assetAudioUrl;
    if ("assetArtworkReady" in input) patch.asset_artwork_ready = input.assetArtworkReady;
    if ("assetArtworkUrl" in input) patch.asset_artwork_url = input.assetArtworkUrl;
    if ("assetThumbnailReady" in input) patch.asset_thumbnail_ready = input.assetThumbnailReady;
    if ("assetThumbnailUrl" in input) patch.asset_thumbnail_url = input.assetThumbnailUrl;
    if ("assetCaptionReady" in input) patch.asset_caption_ready = input.assetCaptionReady;
    if ("caption" in input) patch.caption = input.caption;
    if ("assetHashtagsReady" in input) patch.asset_hashtags_ready = input.assetHashtagsReady;
    if ("hashtags" in input) patch.hashtags = input.hashtags;

    const { data, error } = await supabase
      .from("content_items")
      .update(patch)
      .eq("id", id)
      .eq("property_id", property.id)
      .select(RECORD_COLUMNS)
      .single();

    if (error || !data) return { status: "error", message: "The content item could not be updated." };
    return { status: "success", item: mapRow(data as unknown as ContentItemRow) };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/**
 * #5 — The only function permitted to change `status`. Validates the target is a
 * recognized status and that the transition is allowed from the item's current status
 * (lib/content/pipeline.ts) before writing anything. Sets publishedAt automatically,
 * once, the first time status reaches 'published' — never on a later restore.
 */
export async function updateContentStatus(site: SiteConfig, id: string, nextStatusInput: unknown): Promise<ContentItemMutationResult> {
  if (typeof nextStatusInput !== "string" || !(CONTENT_STATUSES as readonly string[]).includes(nextStatusInput)) {
    return { status: "error", message: "That status is not recognized." };
  }
  const nextStatus = nextStatusInput as ContentStatus;

  const property = await resolvePropertyId(site);
  if (!property) return { status: "error", message: "Property not found in Supabase" };

  try {
    const supabase = createSupabaseAdminClient();
    const existing = await supabase
      .from("content_items")
      .select(RECORD_COLUMNS)
      .eq("id", id)
      .eq("property_id", property.id)
      .maybeSingle();

    if (!existing.data) return { status: "error", message: "That content item does not belong to the selected property." };
    const row = existing.data as unknown as ContentItemRow;

    if (!canTransitionContentStatus(row.status, nextStatus)) {
      return { status: "error", message: `A content item cannot move from "${row.status}" to "${nextStatus}".` };
    }

    const patch: Record<string, unknown> = { status: nextStatus, updated_at: new Date().toISOString() };
    if (nextStatus === "published" && shouldSetPublishedAt(row.published_at)) {
      patch.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("content_items")
      .update(patch)
      .eq("id", id)
      .select(RECORD_COLUMNS)
      .single();

    if (error || !data) return { status: "error", message: "The status could not be updated." };
    return { status: "success", item: mapRow(data as unknown as ContentItemRow) };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/**
 * #6 — Thin convenience wrapper over updateContentStatus. Only valid from 'published',
 * matching the transition map exactly — Milestone 1 defines no other path to 'archived'.
 * Hard delete is intentionally not exposed at this layer: RLS reserves it for the owner
 * role directly (content_items_owner_all), consistent with every other historical
 * business record in this codebase (clients, project_setups) never being app-deletable.
 */
export async function archiveContentItem(site: SiteConfig, id: string): Promise<ContentItemMutationResult> {
  return updateContentStatus(site, id, "archived");
}

/** #7 — One aggregation pass (Dashboard-shaped counts), not yet consumed by any UI in Stage 1. */
export async function getContentAttentionCounts(
  site: SiteConfig
): Promise<{ status: "ready" | "empty" | "error"; detail: string; counts: ContentAttentionCounts }> {
  const result = await listContentItems(site);
  return { status: result.status, detail: result.detail, counts: computeAttentionCounts(result.items) };
}

/** #8 — Items currently in 'scheduled', ordered soonest-first. `withinDays` narrows to a rolling window (e.g. 7 for "this week"); omitted returns every scheduled item. */
export async function getScheduledContent(site: SiteConfig, withinDays?: number): Promise<ContentItemsResult> {
  const result = await queryContentItems(site, { status: "scheduled" });
  if (result.status !== "ready" || withinDays === undefined) return result;

  const now = Date.now();
  const cutoff = now + withinDays * 24 * 60 * 60 * 1000;
  const items = result.items
    .filter((item) => item.scheduledAt && new Date(item.scheduledAt).getTime() >= now && new Date(item.scheduledAt).getTime() <= cutoff)
    .sort((a, b) => new Date(a.scheduledAt as string).getTime() - new Date(b.scheduledAt as string).getTime());

  return {
    items,
    status: items.length ? "ready" : "empty",
    detail: items.length ? `${items.length} scheduled within ${withinDays} days` : "Nothing scheduled in that window"
  };
}

/** #9 — A separate scoped query rather than filtering listContentItems's result in memory, same convention as getClientProjects. */
export async function getContentItemsByRelatedProject(site: SiteConfig, projectId: string): Promise<ContentItemsResult> {
  return queryContentItems(site, { projectId });
}

/** #10 — Same convention as #9. */
export async function getContentItemsByRelatedBeat(site: SiteConfig, beatId: string): Promise<ContentItemsResult> {
  return queryContentItems(site, { beatId });
}

/** #11 — Same convention as #9. */
export async function getContentItemsByRelatedClient(site: SiteConfig, clientId: string): Promise<ContentItemsResult> {
  return queryContentItems(site, { clientId });
}

/**
 * Shared guard for create/update: any optional relationship id supplied must resolve to a
 * row that actually belongs to the same property — otherwise a Content Item could end up
 * quietly linked to another property's Project/Client/Beat. Returns a message on failure,
 * null on success (every id supplied was either absent or verified).
 */
async function verifyRelationsBelongToProperty(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  propertyId: string,
  projectId: string | null | undefined,
  clientId: string | null | undefined,
  beatId: string | null | undefined
): Promise<string | null> {
  if (projectId) {
    const { data } = await supabase.from("projects").select("id").eq("id", projectId).eq("property_id", propertyId).maybeSingle();
    if (!data) return "That project does not belong to the selected property.";
  }
  if (clientId) {
    const { data } = await supabase.from("clients").select("id").eq("id", clientId).eq("property_id", propertyId).maybeSingle();
    if (!data) return "That client does not belong to the selected property.";
  }
  if (beatId) {
    const { data } = await supabase.from("beats").select("id").eq("id", beatId).eq("property_id", propertyId).maybeSingle();
    if (!data) return "That beat does not belong to the selected property.";
  }
  return null;
}
