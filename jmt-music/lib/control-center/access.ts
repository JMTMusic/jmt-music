import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ControlCenterRole = "owner" | "editor" | "viewer" | null;

/**
 * Resolves the current Basic Auth login's mapped Supabase profile role.
 * Missing configuration and query failures return no role and therefore no access.
 */
export async function getControlCenterRole(): Promise<ControlCenterRole> {
  const userId = process.env.CONTROL_CENTER_SUPABASE_USER_ID;
  if (!userId) return null;

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data || !["owner", "editor", "viewer"].includes(data.role)) return null;
    return data.role as Exclude<ControlCenterRole, null>;
  } catch {
    return null;
  }
}
