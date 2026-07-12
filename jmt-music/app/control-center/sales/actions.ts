"use server";

import { revalidatePath } from "next/cache";
import { getControlCenterRole } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { siteRegistry } from "@/lib/control-center/site-registry";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createLead, type LeadMutationState } from "@/app/control-center/growth/leads/actions";
import { createProject } from "@/app/control-center/projects/actions";
import {
  createSalesOpportunity,
  getSalesOpportunityById,
  markSalesOpportunityConverted,
  updateSalesOpportunity,
  updateSalesOpportunityStatus
} from "@/lib/sales/repository";
import { isValidUuid } from "@/lib/sales/validation";
import { friendlySalesMessage, PLATFORM_LABELS, SERVICE_TYPE_LABELS } from "@/lib/sales/display";
import type { CreateSalesOpportunityInput, SalesOpportunityRecord, UpdateSalesOpportunityInput } from "@/lib/sales/types";

export type SalesOpportunityActionResult =
  | { status: "success"; opportunity: SalesOpportunityRecord }
  | { status: "error"; message: string };

export type ConvertOpportunityResult =
  | { status: "success"; projectId: string; clientId: string }
  | { status: "error"; message: string };

async function requireMutationRole(): Promise<{ ok: true } | { ok: false; message: string }> {
  const role = await getControlCenterRole();
  if (role !== "owner" && role !== "editor") {
    return { ok: false, message: "You do not have permission to manage Sales opportunities." };
  }
  return { ok: true };
}

/** Same resolution convention as every other Control Center action file: siteRegistry (client-safe summary) confirms the id is real, getSiteConfig loads the full server-only config the repository layer requires. */
function resolveSite(property: string) {
  const matched = siteRegistry.find((site) => site.id === property);
  if (!matched) return null;
  return getSiteConfig(matched.id);
}

const SALES_LIST_PATHS = ["/control-center/sales", "/control-center/sales/pipeline", "/control-center/sales/opportunities"];

function revalidateSalesPaths(id?: string) {
  for (const path of SALES_LIST_PATHS) revalidatePath(path);
  if (id) revalidatePath(`/control-center/sales/pipeline/${id}`);
  revalidatePath("/control-center");
}

/**
 * Defense-in-depth beyond the type system, same convention as
 * app/control-center/content/actions.ts's stripProtectedFields: a hand-built request
 * bypassing TypeScript could still attach `status`/`convertedProjectId`/`convertedClientId`/
 * `propertyId`/`createdAt`/`updatedAt` at runtime, even though the input types don't declare
 * them. Stripped here so it's provably gone before the repository is ever called.
 */
function stripProtectedFields(input: Record<string, unknown>): Record<string, unknown> {
  const fields = { ...input };
  delete fields.status;
  delete fields.convertedProjectId;
  delete fields.convertedClientId;
  delete fields.propertyId;
  delete fields.createdAt;
  delete fields.updatedAt;
  return fields;
}

/**
 * #1 — Creates a Sales Opportunity. `property` resolves the site; every other field is the
 * raw create payload, validated end-to-end by lib/sales/validation.ts inside
 * createSalesOpportunity — this action does not re-parse opportunity fields itself, only the
 * two things validation.ts doesn't own: the property and the trusted server identity.
 */
export async function createSalesOpportunityAction(
  input: { property: string } & Omit<CreateSalesOpportunityInput, "createdBy">
): Promise<SalesOpportunityActionResult> {
  const site = resolveSite(input.property);
  if (!site) return { status: "error", message: "Select a valid property." };

  const roleCheck = await requireMutationRole();
  if (!roleCheck.ok) return { status: "error", message: roleCheck.message };

  const { property: _property, ...rest } = input as { property: string } & Record<string, unknown>;
  const fields = stripProtectedFields(rest);
  delete fields.createdBy;

  try {
    const userId = process.env.CONTROL_CENTER_SUPABASE_USER_ID;
    const result = await createSalesOpportunity(site, { ...fields, createdBy: userId || null });
    if (result.status === "error") return { status: "error", message: friendlySalesMessage(result.message) };

    revalidateSalesPaths(result.opportunity.id);
    return { status: "success", opportunity: result.opportunity };
  } catch {
    return { status: "error", message: "The opportunity could not be created. Please try again." };
  }
}

/**
 * #2 — General metadata update. Never changes `status` or the converted-* pair — the input
 * type has no such fields, and validateUpdateSalesOpportunityInput only ever reads the keys
 * it explicitly whitelists. Use updateSalesOpportunityStatusAction for status, and
 * convertSalesOpportunityToProjectAction for conversion.
 */
export async function updateSalesOpportunityAction(
  input: { property: string; id: string } & UpdateSalesOpportunityInput
): Promise<SalesOpportunityActionResult> {
  const site = resolveSite(input.property);
  if (!site) return { status: "error", message: "Select a valid property." };
  if (!isValidUuid(input.id)) return { status: "error", message: "Select a valid opportunity." };

  const roleCheck = await requireMutationRole();
  if (!roleCheck.ok) return { status: "error", message: roleCheck.message };

  const { property: _property, id, ...rest } = input as { property: string; id: string } & Record<string, unknown>;
  const fields = stripProtectedFields(rest);

  try {
    const result = await updateSalesOpportunity(site, id, fields);
    if (result.status === "error") return { status: "error", message: friendlySalesMessage(result.message) };

    revalidateSalesPaths(id);
    return { status: "success", opportunity: result.opportunity };
  } catch {
    return { status: "error", message: "The opportunity could not be updated. Please try again." };
  }
}

/**
 * #3 — The only action permitted to move `status` directly (excluding 'converted', which
 * lib/sales/repository.ts's updateSalesOpportunityStatus itself refuses to accept — use
 * convertSalesOpportunityToProjectAction for that transition).
 */
export async function updateSalesOpportunityStatusAction(input: {
  property: string;
  id: string;
  status: string;
}): Promise<SalesOpportunityActionResult> {
  const site = resolveSite(input.property);
  if (!site) return { status: "error", message: "Select a valid property." };
  if (!isValidUuid(input.id)) return { status: "error", message: "Select a valid opportunity." };

  const roleCheck = await requireMutationRole();
  if (!roleCheck.ok) return { status: "error", message: roleCheck.message };

  try {
    const result = await updateSalesOpportunityStatus(site, input.id, input.status);
    if (result.status === "error") return { status: "error", message: friendlySalesMessage(result.message) };

    revalidateSalesPaths(input.id);
    return { status: "success", opportunity: result.opportunity };
  } catch {
    return { status: "error", message: "The status could not be updated. Please try again." };
  }
}

/**
 * #4 — Converts a won opportunity into real project work. Reuses existing systems
 * end-to-end rather than duplicating any of them:
 *  - Client: connects to an existing Client — either `input.clientId` (explicit, from the
 *    dialog) or, if omitted, the opportunity's own pre-conversion `clientId` (set before
 *    conversion, e.g. by a future Opportunity Engine picker) — verified to belong to the
 *    same property either way, or creates a new one by calling `createLead` (Growth
 *    Engine's own action) directly — the exact same validation, insert, and error-mapping
 *    path the Add Lead form uses, not a second copy of it.
 *  - Project: calls `createProject` (app/control-center/projects/actions.ts) with
 *    `type: "client_work"`, the same action Lead Pipeline's `convertLeadToProject` already
 *    calls for the identical purpose.
 *  - Only after both succeed does `markSalesOpportunityConverted` (lib/sales/repository.ts)
 *    record the outcome — a partial failure never leaves the opportunity marked converted
 *    without a real Project/Client behind it.
 *
 * Duplicate-conversion guard: checked here before doing any work (cheap, fast-failing) and
 * again inside markSalesOpportunityConverted (authoritative, race-safe against the
 * database) — see that function's own comment for why the check is deliberately repeated.
 */
export async function convertSalesOpportunityToProjectAction(input: {
  property: string;
  opportunityId: string;
  clientId?: string | null;
  targetDate?: string | null;
}): Promise<ConvertOpportunityResult> {
  const site = resolveSite(input.property);
  if (!site) return { status: "error", message: "Select a valid property." };
  if (!isValidUuid(input.opportunityId)) return { status: "error", message: "Select a valid opportunity." };
  if (input.clientId && !isValidUuid(input.clientId)) return { status: "error", message: "Select a valid client." };

  const roleCheck = await requireMutationRole();
  if (!roleCheck.ok) return { status: "error", message: roleCheck.message };

  try {
    const lookup = await getSalesOpportunityById(site, input.opportunityId);
    if (lookup.status === "not_found") return { status: "error", message: "That opportunity could not be found." };
    if (lookup.status === "error") return { status: "error", message: friendlySalesMessage(lookup.message) };
    const opportunity = lookup.opportunity;
    if (opportunity.convertedProjectId) return { status: "error", message: "This opportunity has already been converted." };

    // Prefer an explicit caller-supplied clientId; fall back to the opportunity's own
    // pre-conversion client_id (set before conversion, e.g. by a future Opportunity Engine
    // picker) before ever creating a brand new Client.
    let clientId = input.clientId || opportunity.clientId || null;
    if (!clientId) {
      const formData = new FormData();
      formData.set("property", input.property);
      formData.set("artist_name", opportunity.artistName);
      if (opportunity.artistEmail) formData.set("email", opportunity.artistEmail);
      formData.set("platform", PLATFORM_LABELS[opportunity.platform]);
      formData.set("project_type", SERVICE_TYPE_LABELS[opportunity.serviceType]);
      if (opportunity.budgetAmount) formData.set("budget", `${opportunity.currency} ${opportunity.budgetAmount}`);
      const conversionNote = `Converted from a Sales Opportunity: "${opportunity.title}".`;
      formData.set("notes", opportunity.notes ? `${conversionNote}\n\n${opportunity.notes}` : conversionNote);

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

    const projectTitle = `${opportunity.title} — ${SERVICE_TYPE_LABELS[opportunity.serviceType]}`.slice(0, 160);
    const projectResult = await createProject({
      property: input.property,
      type: "client_work",
      title: projectTitle,
      clientId,
      targetDate: input.targetDate || opportunity.deadline || null
    });
    if (projectResult.status === "error" || !projectResult.projectId) {
      return { status: "error", message: projectResult.message };
    }

    const marked = await markSalesOpportunityConverted(site, opportunity.id, projectResult.projectId, clientId);
    if (marked.status === "error") return { status: "error", message: friendlySalesMessage(marked.message) };

    revalidateSalesPaths(opportunity.id);
    revalidatePath("/control-center/projects");
    revalidatePath("/control-center/growth/leads");
    return { status: "success", projectId: projectResult.projectId, clientId };
  } catch {
    return { status: "error", message: "The opportunity could not be converted. Please try again." };
  }
}
