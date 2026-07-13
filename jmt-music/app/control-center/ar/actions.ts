"use server";

import { revalidatePath } from "next/cache";
import { getControlCenterRole } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { siteRegistry } from "@/lib/control-center/site-registry";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createLead, type LeadMutationState } from "@/app/control-center/growth/leads/actions";
import { createSalesOpportunityAction } from "@/app/control-center/sales/actions";
import { getSalesOpportunityById } from "@/lib/sales/repository";
import {
  createArArtist,
  getArArtistById,
  markArArtistConverted,
  updateArArtist,
  updateArArtistStatus
} from "@/lib/ar/repository";
import { isValidUuid } from "@/lib/ar/validation";
import { friendlyArMessage, SOURCE_LABELS } from "@/lib/ar/display";
import { friendlySalesMessage } from "@/lib/sales/display";
import type { ArArtistRecord, CreateArArtistInput, UpdateArArtistInput } from "@/lib/ar/types";
import type { SalesPlatform } from "@/lib/sales/types";

export type ArArtistActionResult =
  | { status: "success"; artist: ArArtistRecord }
  | { status: "error"; message: string };

export type ConvertArtistResult =
  | { status: "success"; salesOpportunityId: string; clientId: string }
  | { status: "needs_confirmation"; message: string; existingSalesOpportunityTitle: string | null }
  | { status: "error"; message: string };

async function requireMutationRole(): Promise<{ ok: true } | { ok: false; message: string }> {
  const role = await getControlCenterRole();
  if (role !== "owner" && role !== "editor") {
    return { ok: false, message: "You do not have permission to manage A&R artists." };
  }
  return { ok: true };
}

/** Same resolution convention as every other Control Center action file. */
function resolveSite(property: string) {
  const matched = siteRegistry.find((site) => site.id === property);
  if (!matched) return null;
  return getSiteConfig(matched.id);
}

const AR_LIST_PATHS = ["/control-center/ar", "/control-center/ar/discovery", "/control-center/ar/watchlist", "/control-center/ar/outreach"];

function revalidateArPaths(id?: string) {
  for (const path of AR_LIST_PATHS) revalidatePath(path);
  if (id) revalidatePath(`/control-center/ar/${id}`);
  revalidatePath("/control-center");
}

/**
 * Defense-in-depth beyond the type system, same convention as every other action file in
 * this codebase: a hand-built request bypassing TypeScript could still attach
 * `status`/`relatedSalesOpportunityId`/`propertyId`/`createdAt`/`updatedAt` at runtime,
 * even though the input types don't declare them. Stripped here so it's provably gone
 * before the repository is ever called.
 */
function stripProtectedFields(input: Record<string, unknown>): Record<string, unknown> {
  const fields = { ...input };
  delete fields.status;
  delete fields.relatedSalesOpportunityId;
  delete fields.propertyId;
  delete fields.createdAt;
  delete fields.updatedAt;
  return fields;
}

/**
 * #1 — Adds an A&R Artist. `property` resolves the site; every other field is the raw
 * create payload, validated end-to-end by lib/ar/validation.ts inside createArArtist —
 * this action does not re-parse artist fields itself, only the two things validation.ts
 * doesn't own: the property and the trusted server identity.
 */
export async function createArArtistAction(
  input: { property: string } & Omit<CreateArArtistInput, "createdBy">
): Promise<ArArtistActionResult> {
  const site = resolveSite(input.property);
  if (!site) return { status: "error", message: "Select a valid property." };

  const roleCheck = await requireMutationRole();
  if (!roleCheck.ok) return { status: "error", message: roleCheck.message };

  const { property: _property, ...rest } = input as { property: string } & Record<string, unknown>;
  const fields = stripProtectedFields(rest);
  delete fields.createdBy;

  try {
    const userId = process.env.CONTROL_CENTER_SUPABASE_USER_ID;
    const result = await createArArtist(site, { ...fields, createdBy: userId || null });
    if (result.status === "error") return { status: "error", message: friendlyArMessage(result.message) };

    revalidateArPaths(result.artist.id);
    return { status: "success", artist: result.artist };
  } catch {
    return { status: "error", message: "The artist could not be added. Please try again." };
  }
}

/**
 * #2 — General metadata/fit-score update. Never changes `status` or
 * `relatedSalesOpportunityId` — the input type has no such fields, and
 * validateUpdateArArtistInput only ever reads the keys it explicitly whitelists. Use
 * updateArArtistStatusAction for status, and convertArArtistToSalesAction for conversion.
 */
export async function updateArArtistAction(
  input: { property: string; id: string } & UpdateArArtistInput
): Promise<ArArtistActionResult> {
  const site = resolveSite(input.property);
  if (!site) return { status: "error", message: "Select a valid property." };
  if (!isValidUuid(input.id)) return { status: "error", message: "Select a valid artist." };

  const roleCheck = await requireMutationRole();
  if (!roleCheck.ok) return { status: "error", message: roleCheck.message };

  const { property: _property, id, ...rest } = input as { property: string; id: string } & Record<string, unknown>;
  const fields = stripProtectedFields(rest);

  try {
    const result = await updateArArtist(site, id, fields);
    if (result.status === "error") return { status: "error", message: friendlyArMessage(result.message) };

    revalidateArPaths(id);
    return { status: "success", artist: result.artist };
  } catch {
    return { status: "error", message: "The artist could not be updated. Please try again." };
  }
}

/**
 * #3 — The only action permitted to move `status` directly (excluding 'converted', which
 * lib/ar/repository.ts's updateArArtistStatus itself refuses to accept — use
 * convertArArtistToSalesAction for that transition).
 */
export async function updateArArtistStatusAction(input: {
  property: string;
  id: string;
  status: string;
}): Promise<ArArtistActionResult> {
  const site = resolveSite(input.property);
  if (!site) return { status: "error", message: "Select a valid property." };
  if (!isValidUuid(input.id)) return { status: "error", message: "Select a valid artist." };

  const roleCheck = await requireMutationRole();
  if (!roleCheck.ok) return { status: "error", message: roleCheck.message };

  try {
    const result = await updateArArtistStatus(site, input.id, input.status);
    if (result.status === "error") return { status: "error", message: friendlyArMessage(result.message) };

    revalidateArPaths(input.id);
    return { status: "success", artist: result.artist };
  } catch {
    return { status: "error", message: "The status could not be updated. Please try again." };
  }
}

/** No clean 1:1 mapping exists between A&R's discovery/platform taxonomy and Sales' marketplace-platform taxonomy (A&R has spotify/youtube/vampr/reddit/manual; Sales has airgigs/fiverr/soundbetter/email) — anything without a direct match becomes 'other' rather than a guessed, potentially misleading value. */
function mapArSourceToSalesPlatform(source: string | null): SalesPlatform {
  if (source === "instagram" || source === "website" || source === "local" || source === "referral" || source === "other") return source;
  return "other";
}

/**
 * #4 — Converts an artist into a real Sales Opportunity. Reuses existing systems
 * end-to-end rather than duplicating any of them:
 *  - Client: connects to an existing Client (`input.clientId`, or the artist's own
 *    `relatedClientId` if already set and no explicit override was supplied) or creates a
 *    new one via `createLead` (Growth Engine's own action) — the exact same path
 *    `convertSalesOpportunityToProjectAction` already uses for the identical purpose.
 *  - Sales Opportunity: calls `createSalesOpportunityAction`
 *    (app/control-center/sales/actions.ts) directly — full validation/authorization stays
 *    in one place, not duplicated here. Deal-specific fields (title, service type, budget,
 *    probability, follow-up, notes) come from the caller's own input, never invented —
 *    only identity/research fields (artist name, email, platform, genre, profile/source
 *    URL, music URL, outreach draft) are copied automatically from the A&R record.
 *  - Only after both succeed does `markArArtistConverted` (lib/ar/repository.ts) record
 *    the outcome — a partial failure never leaves the artist marked converted without a
 *    real Sales Opportunity/Client behind it.
 *
 * Duplicate-conversion guard: a soft confirm-to-override, not a hard block — see
 * markArArtistConverted's own comment for why this differs from Sales' own
 * opportunity-to-project conversion. If the artist already has a `relatedSalesOpportunityId`
 * and the caller hasn't passed `confirmed: true`, this returns `needs_confirmation` without
 * creating anything.
 */
export async function convertArArtistToSalesAction(input: {
  property: string;
  artistId: string;
  title: string;
  serviceType: string;
  budgetAmount?: number | string | null;
  probability?: string;
  followUpAt?: string | null;
  notes?: string | null;
  clientId?: string | null;
  keepOnWatchlist?: boolean;
  confirmed?: boolean;
}): Promise<ConvertArtistResult> {
  const site = resolveSite(input.property);
  if (!site) return { status: "error", message: "Select a valid property." };
  if (!isValidUuid(input.artistId)) return { status: "error", message: "Select a valid artist." };
  if (input.clientId && !isValidUuid(input.clientId)) return { status: "error", message: "Select a valid client." };

  const roleCheck = await requireMutationRole();
  if (!roleCheck.ok) return { status: "error", message: roleCheck.message };

  try {
    const lookup = await getArArtistById(site, input.artistId);
    if (lookup.status === "not_found") return { status: "error", message: "That artist could not be found." };
    if (lookup.status === "error") return { status: "error", message: friendlyArMessage(lookup.message) };
    const artist = lookup.artist;

    if (artist.relatedSalesOpportunityId && !input.confirmed) {
      const existingOpportunity = await getSalesOpportunityById(site, artist.relatedSalesOpportunityId);
      return {
        status: "needs_confirmation",
        message: "This artist already has a related Sales Opportunity. Confirm you want to create another.",
        existingSalesOpportunityTitle: existingOpportunity.status === "found" ? existingOpportunity.opportunity.title : null
      };
    }

    let clientId = input.clientId || artist.relatedClientId || null;
    if (!clientId) {
      const formData = new FormData();
      formData.set("property", input.property);
      formData.set("artist_name", artist.artistName);
      if (artist.email) formData.set("email", artist.email);
      if (artist.primaryPlatform) formData.set("platform", SOURCE_LABELS[artist.primaryPlatform]);
      const conversionNote = `Converted from an A&R Artist record: "${artist.artistName}".`;
      formData.set("notes", artist.discoveryNotes ? `${conversionNote}\n\n${artist.discoveryNotes}` : conversionNote);

      const leadResult: LeadMutationState = await createLead(undefined, formData);
      if (leadResult.status !== "success" || !leadResult.leadId) {
        return { status: "error", message: leadResult.message || "The client could not be created." };
      }
      clientId = leadResult.leadId;
    } else {
      const supabase = createSupabaseAdminClient();
      const { data: property } = await supabase.from("properties").select("id").eq("slug", site.id).maybeSingle();
      if (!property) return { status: "error", message: "The selected property could not be found." };
      const { data: client } = await supabase.from("clients").select("id").eq("id", clientId).eq("property_id", property.id).maybeSingle();
      if (!client) return { status: "error", message: "That client does not belong to the selected property." };
    }

    const researchNotes = [artist.fitSummary, artist.strengths, artist.opportunities, artist.concerns, input.notes]
      .filter((value): value is string => Boolean(value && value.trim()))
      .join("\n\n");

    const opportunityResult = await createSalesOpportunityAction({
      property: input.property,
      title: input.title,
      artistName: artist.artistName,
      artistEmail: artist.email,
      clientId,
      platform: mapArSourceToSalesPlatform(artist.primaryPlatform || artist.discoverySource),
      serviceType: input.serviceType,
      genre: artist.genre,
      budgetAmount: input.budgetAmount ?? null,
      probability: input.probability,
      followUpAt: input.followUpAt,
      sourceUrl: artist.profileUrl || artist.websiteUrl,
      musicUrl: artist.musicUrl,
      notes: researchNotes || null,
      proposalText: artist.outreachDraft
    });
    if (opportunityResult.status === "error") return { status: "error", message: friendlySalesMessage(opportunityResult.message) };

    const marked = await markArArtistConverted(site, artist.id, opportunityResult.opportunity.id, clientId, Boolean(input.keepOnWatchlist));
    if (marked.status === "error") return { status: "error", message: friendlyArMessage(marked.message) };

    revalidateArPaths(artist.id);
    revalidatePath("/control-center/sales");
    revalidatePath("/control-center/sales/pipeline");
    revalidatePath("/control-center/sales/opportunities");
    revalidatePath("/control-center/growth/leads");
    return { status: "success", salesOpportunityId: opportunityResult.opportunity.id, clientId };
  } catch {
    return { status: "error", message: "The artist could not be converted. Please try again." };
  }
}
