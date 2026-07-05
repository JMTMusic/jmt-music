import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const BEAT_ARTWORK_BUCKET = "beat-artwork";
export const BEAT_AUDIO_BUCKET = "beat-audio";
export const BEAT_ARTWORK_MAX_BYTES = 10 * 1024 * 1024;
export const BEAT_AUDIO_MAX_BYTES = 100 * 1024 * 1024;
export const BEAT_ARTWORK_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif"
] as const;
export const BEAT_AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a"
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

/** Creates or normalizes the audio preview bucket for authorized uploads. */
export async function ensureBeatAudioBucket(
  supabase: SupabaseClient
): Promise<{ error: string | null }> {
  const options = {
    public: true,
    fileSizeLimit: BEAT_AUDIO_MAX_BYTES,
    allowedMimeTypes: [...BEAT_AUDIO_MIME_TYPES]
  };
  const current = await supabase.storage.getBucket(BEAT_AUDIO_BUCKET);
  const result = current.data
    ? await supabase.storage.updateBucket(BEAT_AUDIO_BUCKET, options)
    : await supabase.storage.createBucket(BEAT_AUDIO_BUCKET, options);

  return { error: result.error?.message || null };
}
