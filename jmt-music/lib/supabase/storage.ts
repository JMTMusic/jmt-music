import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const BEAT_ARTWORK_BUCKET = "beat-artwork";
export const BEAT_ARTWORK_MAX_BYTES = 10 * 1024 * 1024;
export const BEAT_ARTWORK_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif"
] as const;

/**
 * Creates or normalizes the artwork bucket from an already-authorized server
 * workflow. This function must only receive a server-only service-role client.
 */
export async function ensureBeatArtworkBucket(
  supabase: SupabaseClient
): Promise<{ error: string | null }> {
  const options = {
    public: true,
    fileSizeLimit: BEAT_ARTWORK_MAX_BYTES,
    allowedMimeTypes: [...BEAT_ARTWORK_MIME_TYPES]
  };
  const current = await supabase.storage.getBucket(BEAT_ARTWORK_BUCKET);
  const result = current.data
    ? await supabase.storage.updateBucket(BEAT_ARTWORK_BUCKET, options)
    : await supabase.storage.createBucket(BEAT_ARTWORK_BUCKET, options);

  return { error: result.error?.message || null };
}
