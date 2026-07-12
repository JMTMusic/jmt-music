"use server";

import { revalidatePath } from "next/cache";
import { getControlCenterRole } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { siteRegistry } from "@/lib/control-center/site-registry";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  confirmProjectSetup,
  createProjectSetup,
  reissueProjectSetupToken,
  reopenProjectSetup,
  revokeProjectSetupAccess
} from "@/lib/project-setup/repository";

/**
 * Control Center-facing results only. A raw token is ever present on "created" or
 * "reissued" — never on any other result, and never re-derivable once this response is
 * gone. Every message here is hand-written and user-safe; nothing from Supabase is ever
 * passed through directly (see friendlyMessage below).
 */
export type ProjectSetupActionResult =
  | { status: "created"; rawToken: string }
  | { status: "exists" }
  | { status: "reissued"; rawToken: string }
  | { status: "success" }
  | { status: "error"; message: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

const MISSING_SCHEMA_MESSAGE = "Project Setup is not available until the latest Supabase migration is applied.";

/**
 * The data layer's MIGRATION_HINT string is deliberately generic and safe to show, but
 * this project surface has its own required wording for the same condition. Any other
 * repository message is already hand-written and user-safe, so it's passed through as-is
 * — this never forwards a raw Postgrest/Supabase error.
 */
function friendlyMessage(message: string): string {
  if (message.toLowerCase().includes("has migration")) return MISSING_SCHEMA_MESSAGE;
  return message;
}

async function requireMutationRole(): Promise<{ ok: true } | { ok: false; message: string }> {
  const role = await getControlCenterRole();
  if (role !== "owner" && role !== "editor") {
    return { ok: false, message: "You do not have permission to manage Project Setup." };
  }
  return { ok: true };
}

function resolveSite(property: string) {
  const matched = siteRegistry.find((site) => site.id === property);
  if (!matched) return null;
  return getSiteConfig(matched.id);
}

/**
 * #1 — Creates a Project Setup for a Project that already has a linked Client. Blocks
 * creation (without auto-creating a Client) when the Project has none, per explicit
 * product requirement. Idempotent: if a Setup already exists, returns "exists" rather
 * than an error or a second raw token — resending a link is reissueProjectSetupLinkAction's
 * job, since the original raw token was never stored anywhere and can't be recovered.
 */
export async function createProjectSetupAction(input: { property: string; projectId: string }): Promise<ProjectSetupActionResult> {
  if (!uuidPattern.test(input.projectId)) return { status: "error", message: "Select a valid project." };
  const site = resolveSite(input.property);
  if (!site) return { status: "error", message: "Select a valid property." };

  const roleCheck = await requireMutationRole();
  if (!roleCheck.ok) return { status: "error", message: roleCheck.message };

  const userId = process.env.CONTROL_CENTER_SUPABASE_USER_ID;

  try {
    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", site.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, client_id")
      .eq("id", input.projectId)
      .eq("property_id", property.id)
      .maybeSingle();
    if (projectError) return { status: "error", message: friendlyMessage("Supabase project lookup failed.") };
    if (!project) return { status: "error", message: "That project does not belong to the selected property." };
    if (!project.client_id) return { status: "error", message: "Link a Client to this Project before creating Project Setup." };

    const result = await createProjectSetup(site, { projectId: input.projectId, createdBy: userId || null });
    if (result.status === "error") return { status: "error", message: friendlyMessage(result.message) };

    revalidatePath(`/control-center/projects/${input.projectId}`);
    if (result.status === "exists") return { status: "exists" };
    return { status: "created", rawToken: result.rawToken };
  } catch {
    return { status: "error", message: "The Setup could not be created. Please try again." };
  }
}

/**
 * #2 — Mints a brand new link, immediately invalidating whatever link was shown before —
 * there is only ever one valid link per Setup. Also clears any prior revocation, since
 * reissuing is how access is restored after a revoke.
 */
export async function reissueProjectSetupLinkAction(input: { property: string; projectId: string }): Promise<ProjectSetupActionResult> {
  if (!uuidPattern.test(input.projectId)) return { status: "error", message: "Select a valid project." };
  const site = resolveSite(input.property);
  if (!site) return { status: "error", message: "Select a valid property." };

  const roleCheck = await requireMutationRole();
  if (!roleCheck.ok) return { status: "error", message: roleCheck.message };

  try {
    const result = await reissueProjectSetupToken(site, input.projectId);
    if (result.status === "error") return { status: "error", message: friendlyMessage(result.message) };

    revalidatePath(`/control-center/projects/${input.projectId}`);
    return { status: "reissued", rawToken: result.rawToken };
  } catch {
    return { status: "error", message: "The link could not be reissued. Please try again." };
  }
}

/** #3 — Revokes access without touching status, responses, or any other lifecycle field. */
export async function revokeProjectSetupAccessAction(input: { property: string; projectId: string }): Promise<ProjectSetupActionResult> {
  if (!uuidPattern.test(input.projectId)) return { status: "error", message: "Select a valid project." };
  const site = resolveSite(input.property);
  if (!site) return { status: "error", message: "Select a valid property." };

  const roleCheck = await requireMutationRole();
  if (!roleCheck.ok) return { status: "error", message: roleCheck.message };

  try {
    const result = await revokeProjectSetupAccess(site, input.projectId);
    if (result.status === "error") return { status: "error", message: friendlyMessage(result.message) };

    revalidatePath(`/control-center/projects/${input.projectId}`);
    return { status: "success" };
  } catch {
    return { status: "error", message: "Access could not be revoked. Please try again." };
  }
}

/**
 * #4 — Reopens a submitted/confirmed Setup for further edits. Deliberately does not touch
 * access_revoked_at: if access was revoked, the artist's last known link still won't work
 * after this, and Jonathan must reissue a new one separately (see reissueProjectSetupLinkAction).
 */
export async function reopenProjectSetupAction(input: { property: string; projectId: string }): Promise<ProjectSetupActionResult> {
  if (!uuidPattern.test(input.projectId)) return { status: "error", message: "Select a valid project." };
  const site = resolveSite(input.property);
  if (!site) return { status: "error", message: "Select a valid property." };

  const roleCheck = await requireMutationRole();
  if (!roleCheck.ok) return { status: "error", message: roleCheck.message };

  try {
    const result = await reopenProjectSetup(site, input.projectId);
    if (result.status === "error") return { status: "error", message: friendlyMessage(result.message) };

    revalidatePath(`/control-center/projects/${input.projectId}`);
    return { status: "success" };
  } catch {
    return { status: "error", message: "The Setup could not be reopened. Please try again." };
  }
}

/**
 * #5 — Marks a submitted Setup reviewed/approved by JMT Music. Deliberately a pure status
 * flip: it must never auto-trigger contracts, payments, or any other phase change.
 */
export async function confirmProjectSetupAction(input: { property: string; projectId: string }): Promise<ProjectSetupActionResult> {
  if (!uuidPattern.test(input.projectId)) return { status: "error", message: "Select a valid project." };
  const site = resolveSite(input.property);
  if (!site) return { status: "error", message: "Select a valid property." };

  const roleCheck = await requireMutationRole();
  if (!roleCheck.ok) return { status: "error", message: roleCheck.message };

  try {
    const result = await confirmProjectSetup(site, input.projectId);
    if (result.status === "error") return { status: "error", message: friendlyMessage(result.message) };

    revalidatePath(`/control-center/projects/${input.projectId}`);
    return { status: "success" };
  } catch {
    return { status: "error", message: "The Setup could not be confirmed. Please try again." };
  }
}
