import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const BEAT_ARTWORK_BUCKET = "beat-artwork";
export const BEAT_AUDIO_BUCKET = "beat-audio";
export const WEBSITE_MEDIA_BUCKET = "website-media";
export const PORTAL_AUDIO_BUCKET = "portal-audio";
export const WEBSITE_MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const BEAT_ARTWORK_MAX_BYTES = 10 * 1024 * 1024;
export const BEAT_AUDIO_MAX_BYTES = 100 * 1024 * 1024;
export const PORTAL_AUDIO_MAX_BYTES = 100 * 1024 * 1024;
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
  if (current.data) return { error: null };
  if (current.error && !current.error.message.toLowerCase().includes("not found")) {
    console.error("[beat-audio] Bucket lookup failed:", current.error.message);
    return { error: current.error.message };
  }

  const created = await supabase.storage.createBucket(BEAT_AUDIO_BUCKET, options);
  if (created.error) console.error("[beat-audio] Bucket creation failed:", created.error.message);
  return { error: created.error?.message || null };
}

/**
 * Creates or normalizes the client-portal preview-audio bucket. Unlike the
 * beat/website buckets this one is PRIVATE — playback goes through short-lived
 * signed URLs scoped to a valid portal token, never a public URL.
 */
export async function ensurePortalAudioBucket(
  supabase: SupabaseClient
): Promise<{ error: string | null }> {
  const options = {
    public: false,
    fileSizeLimit: PORTAL_AUDIO_MAX_BYTES,
    allowedMimeTypes: [...BEAT_AUDIO_MIME_TYPES]
  };
  const current = await supabase.storage.getBucket(PORTAL_AUDIO_BUCKET);
  if (current.data) return { error: null };

  // Don't gate the create attempt on matching a specific "not found" wording — Supabase's
  // exact error text isn't a stable contract, and getting this wrong short-circuits every
  // upload with a misleading permissions-flavored message before create is ever tried.
  const created = await supabase.storage.createBucket(PORTAL_AUDIO_BUCKET, options);
  if (!created.error) return { error: null };
  // A concurrent request (or a bucket created outside this code path) racing us here is a
  // success, not a failure — the bucket exists either way.
  if (created.error.message.toLowerCase().includes("already exists")) return { error: null };
  console.error("[portal-audio] Bucket creation failed:", created.error.message);
  return { error: created.error.message };
}

/** Ensures the public website media bucket exists for authorized CMS uploads. */
export async function ensureWebsiteMediaBucket(supabase: SupabaseClient): Promise<{ error: string | null }> {
  const current = await supabase.storage.getBucket(WEBSITE_MEDIA_BUCKET);
  if (current.data) return { error: null };
  if (current.error && !current.error.message.toLowerCase().includes("not found")) return { error: current.error.message };
  const created = await supabase.storage.createBucket(WEBSITE_MEDIA_BUCKET, {
    public: true,
    fileSizeLimit: WEBSITE_MEDIA_MAX_BYTES,
    allowedMimeTypes: [...BEAT_ARTWORK_MIME_TYPES]
  });
  return { error: created.error?.message || null };
}
