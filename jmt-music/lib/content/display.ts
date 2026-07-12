import { CONTENT_STATUSES } from "./types";
import type { ContentPlatform, ContentPriority, ContentStatus, ContentType } from "./types";

/** Not consumed by any UI yet (Stage 1 is data-layer only) — provided now so Stage 3's UI never needs to invent a second copy of these labels. */
export const STATUS_LABELS: Record<ContentStatus, string> = {
  idea: "Idea",
  planned: "Planned",
  needs_filming: "Needs Filming",
  needs_editing: "Needs Editing",
  ready: "Ready",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived"
};

/** Fixed left-to-right pipeline order for any future Kanban-style board. */
export const STATUS_ORDER: readonly ContentStatus[] = CONTENT_STATUSES;

export const PRIORITY_LABELS: Record<ContentPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent"
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  piano_performance: "Piano Performance",
  cover: "Cover",
  original_performance: "Original Performance",
  beat_showcase: "Beat Showcase",
  beat_breakdown: "Beat Breakdown",
  behind_the_beat: "Behind the Beat",
  behind_the_scenes: "Behind the Scenes",
  studio_tour: "Studio Tour",
  workflow: "Workflow",
  production_tip: "Production Tip",
  piano_tip: "Piano Tip",
  recording_tip: "Recording Tip",
  release_announcement: "Release Announcement",
  client_highlight: "Client Highlight",
  testimonial: "Testimonial",
  gear: "Gear",
  lifestyle: "Lifestyle",
  story_post: "Story Post",
  other: "Other"
};

export const PLATFORM_LABELS: Record<ContentPlatform, string> = {
  instagram_reel: "Instagram Reel",
  instagram_feed: "Instagram Feed",
  instagram_story: "Instagram Story",
  youtube_short: "YouTube Short",
  youtube: "YouTube",
  tiktok: "TikTok",
  facebook: "Facebook",
  website: "Website",
  email: "Email"
};

export const MISSING_SCHEMA_MESSAGE = "Content Workspace is not available until the latest Supabase migration is applied.";

/**
 * Rewrites the data layer's generic MIGRATION_HINT (lib/content/repository.ts) into the
 * one user-safe wording every Control Center surface uses for this condition. Every other
 * repository message is already hand-written and safe, so it passes through unchanged —
 * this never forwards a raw Postgrest/Supabase error, and never mentions a table or column
 * name to the browser. Shared by the Stage 2 action layer and every Stage 3/4 page that
 * reads from lib/content/repository.ts directly, so the wording can never drift between them.
 */
export function friendlyContentMessage(message: string): string {
  if (message.toLowerCase().includes("has migration")) return MISSING_SCHEMA_MESSAGE;
  return message;
}
