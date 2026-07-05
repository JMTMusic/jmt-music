import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ControlCenterRole = "owner" | "editor" | "viewer" | null;
export type ControlCenterAccessStatus = {
  role: ControlCenterRole;
  canCreate: boolean;
  reason: "allowed" | "missing_mapping" | "invalid_mapping" | "profile_not_found" | "query_failed" | "viewer";
  detail: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Returns a non-sensitive explanation of the current permission bridge state. */
export async function getControlCenterAccessStatus(): Promise<ControlCenterAccessStatus> {
  const userId = process.env.CONTROL_CENTER_SUPABASE_USER_ID;
  if (!userId) return { role: null, canCreate: false, reason: "missing_mapping", detail: "Supabase user mapping is not configured." };
  if (!uuidPattern.test(userId)) return { role: null, canCreate: false, reason: "invalid_mapping", detail: "Supabase user mapping is not a valid Auth UUID." };

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (error) return { role: null, canCreate: false, reason: "query_failed", detail: "Profile permission lookup failed." };
    if (!data) return { role: null, canCreate: false, reason: "profile_not_found", detail: "No profile matches the configured Auth user." };
    if (data.role === "viewer") return { role: "viewer", canCreate: false, reason: "viewer", detail: "Viewer accounts cannot create beats." };
    if (data.role === "owner" || data.role === "editor") return { role: data.role, canCreate: true, reason: "allowed", detail: `${data.role === "owner" ? "Owner" : "Editor"} access confirmed.` };
    return { role: null, canCreate: false, reason: "query_failed", detail: "Profile role is not recognized." };
  } catch {
    return { role: null, canCreate: false, reason: "query_failed", detail: "Profile permission lookup failed." };
  }
}

/**
 * Resolves the current Basic Auth login's mapped Supabase profile role.
 * Missing configuration and query failures return no role and therefore no access.
 */
export async function getControlCenterRole(): Promise<ControlCenterRole> {
  return (await getControlCenterAccessStatus()).role;
}
