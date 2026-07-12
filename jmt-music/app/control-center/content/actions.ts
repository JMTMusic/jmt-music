"use server";

import { revalidatePath } from "next/cache";
import { getControlCenterRole } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { siteRegistry } from "@/lib/control-center/site-registry";
import {
  archiveContentItem,
  createContentItem,
  updateContentItem,
  updateContentStatus
} from "@/lib/content/repository";
import { isValidUuid } from "@/lib/content/validation";
import { friendlyContentMessage } from "@/lib/content/display";
import type { ContentItemRecord, CreateContentItemInput, UpdateContentItemInput } from "@/lib/content/types";

/**
 * Control Center-facing results only. A Content Item carries no token/hash-shaped
 * secrets the way Project Setup does, so it's safe to return the full record directly —
 * enough for the caller to navigate straight to the item's detail page once Stage 3
 * builds one. Every error message here is hand-written and user-safe; nothing from
 * Supabase is ever passed through directly (see lib/content/display.ts's friendlyContentMessage).
 */
export type ContentItemActionResult =
  | { status: "success"; item: ContentItemRecord }
  | { status: "error"; message: string };

async function requireMutationRole(): Promise<{ ok: true } | { ok: false; message: string }> {
  const role = await getControlCenterRole();
  if (role !== "owner" && role !== "editor") {
    return { ok: false, message: "You do not have permission to manage Content Workspace items." };
  }
  return { ok: true };
}

/** Same resolution convention as every other Control Center action file: siteRegistry (client-safe summary) confirms the id is real, getSiteConfig loads the full server-only config the repository layer requires. */
function resolveSite(property: string) {
  const matched = siteRegistry.find((site) => site.id === property);
  if (!matched) return null;
  return getSiteConfig(matched.id);
}

const CONTENT_LIST_PATH = "/control-center/content";

function revalidateContentPaths(id?: string) {
  revalidatePath(CONTENT_LIST_PATH);
  if (id) revalidatePath(`${CONTENT_LIST_PATH}/${id}`);
}

/**
 * Defense-in-depth beyond the type system: even though CreateContentItemInput/
 * UpdateContentItemInput don't declare `status`, `publishedAt`, `propertyId`,
 * `createdAt`, or `updatedAt` as accepted fields at all (so a well-typed caller can't
 * construct one), a hand-built request bypassing TypeScript could still attach one at
 * runtime. Stripped here so it's provably gone before the repository is ever called,
 * not merely relying on lib/content/validation.ts to ignore it one layer down.
 */
function stripProtectedFields(input: Record<string, unknown>): Record<string, unknown> {
  const fields = { ...input };
  delete fields.status;
  delete fields.publishedAt;
  delete fields.propertyId;
  delete fields.createdAt;
  delete fields.updatedAt;
  return fields;
}

/**
 * #1 — Creates a Content Item. `property` resolves the site; every other field is the raw
 * create payload, validated end-to-end by lib/content/validation.ts inside
 * createContentItem (Stage 1) — this action does not re-parse content fields itself, only
 * the two things validation.ts doesn't own: the property and the trusted server identity.
 *
 * Protected-field handling: the input type is CreateContentItemInput minus `createdBy` —
 * a caller cannot even construct a well-typed call that supplies one. Any `createdBy` (or
 * `property`) that arrives anyway at runtime (e.g. a hand-built fetch bypassing the type)
 * is stripped and overwritten with the server-resolved value below; nothing from the
 * browser ever reaches the created_by column. `property_id`, `status`, `created_at`, and
 * `updated_at` are not accepted parameters anywhere in this input shape at all — every
 * Content Item starts at 'idea' (the migration's own default) and gets its property from
 * `site`, never from client-supplied data.
 */
export async function createContentItemAction(
  input: { property: string } & Omit<CreateContentItemInput, "createdBy">
): Promise<ContentItemActionResult> {
  const site = resolveSite(input.property);
  if (!site) return { status: "error", message: "Select a valid property." };

  const roleCheck = await requireMutationRole();
  if (!roleCheck.ok) return { status: "error", message: roleCheck.message };

  const { property: _property, ...rest } = input as { property: string } & Record<string, unknown>;
  const fields = stripProtectedFields(rest);
  delete fields.createdBy;

  try {
    const userId = process.env.CONTROL_CENTER_SUPABASE_USER_ID;
    const result = await createContentItem(site, { ...fields, createdBy: userId || null });
    if (result.status === "error") return { status: "error", message: friendlyContentMessage(result.message) };

    revalidateContentPaths(result.item.id);
    return { status: "success", item: result.item };
  } catch {
    return { status: "error", message: "The content item could not be created. Please try again." };
  }
}

/**
 * #2 — General metadata update. Never changes `status` or `publishedAt` — the input type
 * (UpdateContentItemInput, Stage 1) has no such fields at all, and validateUpdateContentItemInput
 * only ever reads the keys it explicitly whitelists, so there is no path through this
 * action that can move the pipeline stage. Use updateContentStatusAction for that.
 * Fields not supplied are left exactly as they are — validateUpdateContentItemInput only
 * includes a key in its result when the caller's input actually contains it, and
 * updateContentItem's patch is built the same way, so an unspecified field is never
 * silently cleared.
 */
export async function updateContentItemAction(
  input: { property: string; id: string } & UpdateContentItemInput
): Promise<ContentItemActionResult> {
  const site = resolveSite(input.property);
  if (!site) return { status: "error", message: "Select a valid property." };
  if (!isValidUuid(input.id)) return { status: "error", message: "Select a valid content item." };

  const roleCheck = await requireMutationRole();
  if (!roleCheck.ok) return { status: "error", message: roleCheck.message };

  const { property: _property, id, ...rest } = input as { property: string; id: string } & Record<string, unknown>;
  const fields = stripProtectedFields(rest);
  delete fields.createdBy;

  try {
    const result = await updateContentItem(site, id, fields);
    if (result.status === "error") return { status: "error", message: friendlyContentMessage(result.message) };

    revalidateContentPaths(id);
    return { status: "success", item: result.item };
  } catch {
    return { status: "error", message: "The content item could not be updated. Please try again." };
  }
}

/**
 * #3 — The only action permitted to change `status`. Delegates entirely to
 * updateContentStatus (lib/content/repository.ts), which itself delegates the actual
 * allow/deny decision to canTransitionContentStatus (lib/content/pipeline.ts) — the
 * transition rules are not duplicated here. `publishedAt` is set automatically by that
 * same repository function the first time status reaches 'published', and is never
 * cleared on any later move (including archiving) — this action does not touch it
 * directly in either direction. `scheduledAt` is untouched by this action entirely; it
 * only ever changes through updateContentItemAction's general metadata update.
 */
export async function updateContentStatusAction(input: {
  property: string;
  id: string;
  status: string;
}): Promise<ContentItemActionResult> {
  const site = resolveSite(input.property);
  if (!site) return { status: "error", message: "Select a valid property." };
  if (!isValidUuid(input.id)) return { status: "error", message: "Select a valid content item." };

  const roleCheck = await requireMutationRole();
  if (!roleCheck.ok) return { status: "error", message: roleCheck.message };

  try {
    const result = await updateContentStatus(site, input.id, input.status);
    if (result.status === "error") return { status: "error", message: friendlyContentMessage(result.message) };

    revalidateContentPaths(input.id);
    return { status: "success", item: result.item };
  } catch {
    return { status: "error", message: "The status could not be updated. Please try again." };
  }
}

/**
 * #4 — Thin, explicitly named wrapper over updateContentStatus. Only succeeds from
 * 'published' (lib/content/pipeline.ts defines no other route to 'archived') — this
 * moves the item to 'archived', it never deletes anything.
 */
export async function archiveContentItemAction(input: { property: string; id: string }): Promise<ContentItemActionResult> {
  const site = resolveSite(input.property);
  if (!site) return { status: "error", message: "Select a valid property." };
  if (!isValidUuid(input.id)) return { status: "error", message: "Select a valid content item." };

  const roleCheck = await requireMutationRole();
  if (!roleCheck.ok) return { status: "error", message: roleCheck.message };

  try {
    const result = await archiveContentItem(site, input.id);
    if (result.status === "error") return { status: "error", message: friendlyContentMessage(result.message) };

    revalidateContentPaths(input.id);
    return { status: "success", item: result.item };
  } catch {
    return { status: "error", message: "The content item could not be archived. Please try again." };
  }
}

/**
 * #5 — Restoring an archived item is a distinct, deliberate action, per the approved
 * Stage 1 pipeline rule that 'archived' only ever moves back to 'published' and nowhere
 * else. This is a thin wrapper around updateContentStatus so a future UI never needs to
 * know or guess which raw status string means "restore" — it's named exactly what it
 * does. publishedAt is untouched here too (repository-level: it was already set the
 * first time this item was published, and this transition doesn't clear or reset it).
 */
export async function restoreContentItemAction(input: { property: string; id: string }): Promise<ContentItemActionResult> {
  const site = resolveSite(input.property);
  if (!site) return { status: "error", message: "Select a valid property." };
  if (!isValidUuid(input.id)) return { status: "error", message: "Select a valid content item." };

  const roleCheck = await requireMutationRole();
  if (!roleCheck.ok) return { status: "error", message: roleCheck.message };

  try {
    const result = await updateContentStatus(site, input.id, "published");
    if (result.status === "error") return { status: "error", message: friendlyContentMessage(result.message) };

    revalidateContentPaths(input.id);
    return { status: "success", item: result.item };
  } catch {
    return { status: "error", message: "The content item could not be restored. Please try again." };
  }
}

// No deleteContentItemAction: permanent deletion is not an existing pattern in this
// codebase for historical business records. `clients` and `project_setups` are both
// owner-only-delete at the RLS layer (`*_owner_all` policies) with no app-level delete
// function anywhere — content_items follows the same posture (see the Stage 1 migration's
// RLS policies). archiveContentItemAction is the supported "retire this" path.
