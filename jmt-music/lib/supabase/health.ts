import "server-only";

export type SupabaseHealth = {
  configured: boolean;
  connected: boolean;
  detail: string;
  latencyMs?: number;
};

/**
 * Probes Supabase Auth's public health endpoint without querying business data
 * or using the privileged service-role key.
 */
export async function getSupabaseHealth(): Promise<SupabaseHealth> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return {
      configured: false,
      connected: false,
      detail: "Environment variables not configured"
    };
  }

  const startedAt = Date.now();

  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
      headers: { apikey: anonKey },
      cache: "no-store",
      signal: AbortSignal.timeout(5000)
    });

    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      return {
        configured: true,
        connected: false,
        detail: `Health check returned HTTP ${response.status}`,
        latencyMs
      };
    }

    return {
      configured: true,
      connected: true,
      detail: `Connected · ${latencyMs} ms`,
      latencyMs
    };
  } catch {
    return {
      configured: true,
      connected: false,
      detail: "Configured but unreachable"
    };
  }
}
