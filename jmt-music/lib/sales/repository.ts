import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SiteConfig } from "@/lib/control-center/types";
import { validateCreateSalesOpportunityInput, validateUpdateSalesOpportunityInput } from "./validation";
import { SALES_STATUSES } from "./types";
import type {
  ListSalesOpportunitiesFilters,
  SalesOpportunitiesResult,
  SalesOpportunityLookupResult,
  SalesOpportunityMutationResult,
  SalesOpportunityRecord,
  SalesPlatform,
  SalesProbability,
  SalesServiceType,
  SalesStatus
} from "./types";

/**
 * Never SELECT anything beyond what's declared here — same defensive habit as every other
 * repository in this codebase (e.g. lib/content/repository.ts's RECORD_COLUMNS).
 */
const RECORD_COLUMNS =
  "id, property_id, title, artist_name, artist_email, client_id, platform, service_type, genre, budget_amount, currency, status, probability, proposal_sent_at, follow_up_at, deadline, source_url, music_url, notes, proposal_text, buyer_instructions, turnaround_days, revision_count, sample_title, sample_description, sample_url, lost_reason, converted_project_id, converted_client_id, created_by, created_at, updated_at";

type SalesOpportunityRow = {
  id: string;
  property_id: string;
  title: string;
  artist_name: string;
  artist_email: string | null;
  client_id: string | null;
  platform: SalesPlatform;
  service_type: SalesServiceType;
  genre: string | null;
  budget_amount: number | string | null;
  currency: string;
  status: SalesStatus;
  probability: SalesProbability;
  proposal_sent_at: string | null;
  follow_up_at: string | null;
  deadline: string | null;
  source_url: string | null;
  music_url: string | null;
  notes: string | null;
  proposal_text: string | null;
  buyer_instructions: string | null;
  turnaround_days: number | null;
  revision_count: number | null;
  sample_title: string | null;
  sample_description: string | null;
  sample_url: string | null;
  lost_reason: string | null;
  converted_project_id: string | null;
  converted_client_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: SalesOpportunityRow): SalesOpportunityRecord {
  return {
    id: row.id,
    propertyId: row.property_id,
    title: row.title,
    artistName: row.artist_name,
    artistEmail: row.artist_email,
    clientId: row.client_id,
    platform: row.platform,
    serviceType: row.service_type,
    genre: row.genre,
    budgetAmount: row.budget_amount === null ? null : Number(row.budget_amount),
    currency: row.currency,
    status: row.status,
    probability: row.probability,
    proposalSentAt: row.proposal_sent_at,
    followUpAt: row.follow_up_at,
    deadline: row.deadline,
    sourceUrl: row.source_url,
    musicUrl: row.music_url,
    notes: row.notes,
    proposalText: row.proposal_text,
    buyerInstructions: row.buyer_instructions,
    turnaroundDays: row.turnaround_days,
    revisionCount: row.revision_count,
    sampleTitle: row.sample_title,
    sampleDescription: row.sample_description,
    sampleUrl: row.sample_url,
    lostReason: row.lost_reason,
    convertedProjectId: row.converted_project_id,
    convertedClientId: row.converted_client_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const MIGRATION_HINT = "Supabase query failed — has migration 20260712150000_sales_opportunities.sql been applied yet?";

async function resolvePropertyId(site: SiteConfig): Promise<{ id: string } | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("properties").select("id").eq("slug", site.id).maybeSingle();
  if (error || !data) return null;
  return data;
}

/** Shared list/query path for listSalesOpportunities. */
async function queryOpportunities(site: SiteConfig, filters: ListSalesOpportunitiesFilters = {}): Promise<SalesOpportunitiesResult> {
  const property = await resolvePropertyId(site);
  if (!property) return { opportunities: [], status: "error", detail: "Property not found in Supabase" };

  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase.from("sales_opportunities").select(RECORD_COLUMNS).eq("property_id", property.id);

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.platform) query = query.eq("platform", filters.platform);
    if (filters.serviceType) query = query.eq("service_type", filters.serviceType);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return { opportunities: [], status: "error", detail: MIGRATION_HINT };

    const opportunities = ((data || []) as unknown as SalesOpportunityRow[]).map(mapRow);
    return {
      opportunities,
      status: opportunities.length ? "ready" : "empty",
      detail: opportunities.length ? `${opportunities.length} opportunit${opportunities.length === 1 ? "y" : "ies"} from Supabase` : "No sales opportunities yet"
    };
  } catch {
    return { opportunities: [], status: "error", detail: "Supabase is not configured or reachable" };
  }
}

/** #1 — Every Sales Opportunity for one property, optionally filtered. The one round-trip other selectors/aggregations should derive from in memory rather than re-querying. */
export async function listSalesOpportunities(site: SiteConfig, filters: ListSalesOpportunitiesFilters = {}): Promise<SalesOpportunitiesResult> {
  return queryOpportunities(site, filters);
}

/** #2 — One Sales Opportunity, scoped to the property so a stray id from another property can never be read. */
export async function getSalesOpportunityById(site: SiteConfig, id: string): Promise<SalesOpportunityLookupResult> {
  const property = await resolvePropertyId(site);
  if (!property) return { status: "error", message: "Property not found in Supabase" };

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("sales_opportunities")
      .select(RECORD_COLUMNS)
      .eq("id", id)
      .eq("property_id", property.id)
      .maybeSingle();

    if (error) return { status: "error", message: MIGRATION_HINT };
    if (!data) return { status: "not_found" };
    return { status: "found", opportunity: mapRow(data as unknown as SalesOpportunityRow) };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/** #3 — Creates a Sales Opportunity. Always starts at 'new_lead' (the migration's own column default); this function never accepts or sets a status. */
export async function createSalesOpportunity(site: SiteConfig, rawInput: unknown): Promise<SalesOpportunityMutationResult> {
  let input;
  try {
    input = validateCreateSalesOpportunityInput(rawInput);
  } catch (validationError) {
    return { status: "error", message: validationError instanceof Error ? validationError.message : "Invalid input." };
  }

  const property = await resolvePropertyId(site);
  if (!property) return { status: "error", message: "Property not found in Supabase" };

  try {
    const supabase = createSupabaseAdminClient();

    if (input.clientId) {
      const relationError = await verifyClientBelongsToProperty(supabase, property.id, input.clientId);
      if (relationError) return { status: "error", message: relationError };
    }

    const { data, error } = await supabase
      .from("sales_opportunities")
      .insert({
        property_id: property.id,
        title: input.title,
        artist_name: input.artistName,
        artist_email: input.artistEmail,
        client_id: input.clientId || null,
        platform: input.platform,
        service_type: input.serviceType,
        genre: input.genre,
        budget_amount: input.budgetAmount,
        currency: input.currency || "USD",
        probability: input.probability,
        proposal_sent_at: input.proposalSentAt,
        follow_up_at: input.followUpAt,
        deadline: input.deadline,
        source_url: input.sourceUrl,
        music_url: input.musicUrl,
        notes: input.notes,
        proposal_text: input.proposalText,
        buyer_instructions: input.buyerInstructions,
        turnaround_days: input.turnaroundDays,
        revision_count: input.revisionCount,
        sample_title: input.sampleTitle,
        sample_description: input.sampleDescription,
        sample_url: input.sampleUrl,
        created_by: input.createdBy
      })
      .select(RECORD_COLUMNS)
      .single();

    if (error || !data) return { status: "error", message: "The opportunity could not be created." };
    return { status: "success", opportunity: mapRow(data as unknown as SalesOpportunityRow) };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/**
 * #4 — General field update. `status`, `convertedProjectId`, and `convertedClientId` are
 * structurally impossible to set here — validateUpdateSalesOpportunityInput never reads
 * those keys from the raw input. Use updateSalesOpportunityStatus for status, and the
 * Convert to Project action (app/control-center/sales/actions.ts) for the converted-* pair.
 */
export async function updateSalesOpportunity(site: SiteConfig, id: string, rawInput: unknown): Promise<SalesOpportunityMutationResult> {
  let input;
  try {
    input = validateUpdateSalesOpportunityInput(rawInput);
  } catch (validationError) {
    return { status: "error", message: validationError instanceof Error ? validationError.message : "Invalid input." };
  }

  const property = await resolvePropertyId(site);
  if (!property) return { status: "error", message: "Property not found in Supabase" };

  try {
    const supabase = createSupabaseAdminClient();
    const existing = await supabase.from("sales_opportunities").select("id").eq("id", id).eq("property_id", property.id).maybeSingle();
    if (!existing.data) return { status: "error", message: "That opportunity does not belong to the selected property." };

    if (input.clientId) {
      const relationError = await verifyClientBelongsToProperty(supabase, property.id, input.clientId);
      if (relationError) return { status: "error", message: relationError };
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if ("title" in input) patch.title = input.title;
    if ("artistName" in input) patch.artist_name = input.artistName;
    if ("artistEmail" in input) patch.artist_email = input.artistEmail;
    if ("clientId" in input) patch.client_id = input.clientId;
    if ("platform" in input) patch.platform = input.platform;
    if ("serviceType" in input) patch.service_type = input.serviceType;
    if ("genre" in input) patch.genre = input.genre;
    if ("budgetAmount" in input) patch.budget_amount = input.budgetAmount;
    if ("currency" in input) patch.currency = input.currency;
    if ("probability" in input) patch.probability = input.probability;
    if ("proposalSentAt" in input) patch.proposal_sent_at = input.proposalSentAt;
    if ("followUpAt" in input) patch.follow_up_at = input.followUpAt;
    if ("deadline" in input) patch.deadline = input.deadline;
    if ("sourceUrl" in input) patch.source_url = input.sourceUrl;
    if ("musicUrl" in input) patch.music_url = input.musicUrl;
    if ("notes" in input) patch.notes = input.notes;
    if ("proposalText" in input) patch.proposal_text = input.proposalText;
    if ("buyerInstructions" in input) patch.buyer_instructions = input.buyerInstructions;
    if ("turnaroundDays" in input) patch.turnaround_days = input.turnaroundDays;
    if ("revisionCount" in input) patch.revision_count = input.revisionCount;
    if ("sampleTitle" in input) patch.sample_title = input.sampleTitle;
    if ("sampleDescription" in input) patch.sample_description = input.sampleDescription;
    if ("sampleUrl" in input) patch.sample_url = input.sampleUrl;
    if ("lostReason" in input) patch.lost_reason = input.lostReason;

    const { data, error } = await supabase
      .from("sales_opportunities")
      .update(patch)
      .eq("id", id)
      .eq("property_id", property.id)
      .select(RECORD_COLUMNS)
      .single();

    if (error || !data) return { status: "error", message: "The opportunity could not be updated." };
    return { status: "success", opportunity: mapRow(data as unknown as SalesOpportunityRow) };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/** #5 — The only function permitted to change `status` via a plain status move. Permissive, any-to-any (same posture as clients.stage) — excludes 'converted', which only markSalesOpportunityConverted may set. */
export async function updateSalesOpportunityStatus(site: SiteConfig, id: string, nextStatusInput: unknown): Promise<SalesOpportunityMutationResult> {
  if (typeof nextStatusInput !== "string" || !(SALES_STATUSES as readonly string[]).includes(nextStatusInput) || nextStatusInput === "converted") {
    return { status: "error", message: "That status is not recognized." };
  }
  const nextStatus = nextStatusInput as SalesStatus;

  const property = await resolvePropertyId(site);
  if (!property) return { status: "error", message: "Property not found in Supabase" };

  try {
    const supabase = createSupabaseAdminClient();
    const existing = await supabase.from("sales_opportunities").select("id").eq("id", id).eq("property_id", property.id).maybeSingle();
    if (!existing.data) return { status: "error", message: "That opportunity does not belong to the selected property." };

    const { data, error } = await supabase
      .from("sales_opportunities")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("property_id", property.id)
      .select(RECORD_COLUMNS)
      .single();

    if (error || !data) return { status: "error", message: "The status could not be updated." };
    return { status: "success", opportunity: mapRow(data as unknown as SalesOpportunityRow) };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/**
 * #6 — The only function permitted to write `status: 'converted'` and the converted-* pair.
 * Called exclusively by the Convert to Project action after it has already created/connected
 * the Client and created the Project — this function only records the outcome. Guards
 * against overwriting an existing conversion (the action layer checks this first too, but
 * the guard is repeated here since this is the one place that could actually corrupt the
 * record if called twice).
 */
export async function markSalesOpportunityConverted(
  site: SiteConfig,
  id: string,
  projectId: string,
  clientId: string
): Promise<SalesOpportunityMutationResult> {
  const property = await resolvePropertyId(site);
  if (!property) return { status: "error", message: "Property not found in Supabase" };

  try {
    const supabase = createSupabaseAdminClient();
    const existing = await supabase
      .from("sales_opportunities")
      .select("id, converted_project_id")
      .eq("id", id)
      .eq("property_id", property.id)
      .maybeSingle();
    if (!existing.data) return { status: "error", message: "That opportunity does not belong to the selected property." };
    if (existing.data.converted_project_id) return { status: "error", message: "This opportunity has already been converted." };

    const { data, error } = await supabase
      .from("sales_opportunities")
      .update({
        status: "converted",
        converted_project_id: projectId,
        converted_client_id: clientId,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("property_id", property.id)
      .select(RECORD_COLUMNS)
      .single();

    if (error || !data) return { status: "error", message: "The opportunity could not be marked as converted." };
    return { status: "success", opportunity: mapRow(data as unknown as SalesOpportunityRow) };
  } catch {
    return { status: "error", message: "Supabase is not configured or reachable" };
  }
}

/**
 * Shared guard for create/update: an optional `client_id` must resolve to a row that
 * actually belongs to the same property — otherwise an opportunity could end up quietly
 * linked to another property's Client. Same convention as
 * lib/content/repository.ts's verifyRelationsBelongToProperty. Returns a message on
 * failure, null on success.
 */
async function verifyClientBelongsToProperty(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  propertyId: string,
  clientId: string
): Promise<string | null> {
  const { data } = await supabase.from("clients").select("id").eq("id", clientId).eq("property_id", propertyId).maybeSingle();
  if (!data) return "That client does not belong to the selected property.";
  return null;
}
