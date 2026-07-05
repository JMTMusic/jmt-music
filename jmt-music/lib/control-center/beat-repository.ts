import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Beat, SiteConfig } from "./types";

type BeatRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  artwork_path: string | null;
  audio_path: string | null;
  genre: string | null;
  bpm: number | null;
  musical_key: string | null;
  release_date: string | null;
  beatstars_url: string | null;
  featured: boolean;
  published: boolean;
  sort_order: number;
};

export type BeatLibraryResult = {
  beats: Beat[];
  source: "supabase" | "mock";
  detail: string;
};

function formatReleaseDate(value: string | null): string {
  if (!value) return "Unscheduled";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${value}T00:00:00Z`));
}

/**
 * Reads beats for exactly one validated property. The service-role client stays
 * server-only and is required until Control Center uses Supabase Auth sessions.
 */
export async function getPropertyBeatLibrary(site: SiteConfig): Promise<BeatLibraryResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", site.id)
      .maybeSingle();

    if (propertyError || !property) {
      return {
        beats: site.catalog,
        source: "mock",
        detail: propertyError ? "Property lookup failed" : "Property not found in Supabase"
      };
    }

    const { data, error } = await supabase
      .from("beats")
      .select("id, title, slug, description, artwork_path, audio_path, genre, bpm, musical_key, release_date, beatstars_url, featured, published, sort_order")
      .eq("property_id", property.id)
      .order("sort_order", { ascending: true })
      .order("release_date", { ascending: false });

    if (error || !data?.length) {
      return {
        beats: site.catalog,
        source: "mock",
        detail: error ? "Supabase beat query failed" : "No Supabase beats yet"
      };
    }

    const beats = (data as BeatRow[]).map((row) => {
      const cover = row.artwork_path
        ? supabase.storage.from("beat-artwork").getPublicUrl(row.artwork_path).data.publicUrl
        : "/assets/jmt-studio-hero.png";
      const audioUrl = row.audio_path
        ? supabase.storage.from("beat-audio").getPublicUrl(row.audio_path).data.publicUrl
        : null;

      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        description: row.description || "",
        cover,
        artworkPath: row.artwork_path,
        audioPath: row.audio_path,
        audioUrl,
        genre: row.genre || "Uncategorized",
        bpm: row.bpm || 0,
        musicalKey: row.musical_key || "Not set",
        releaseDate: formatReleaseDate(row.release_date),
        releaseDateValue: row.release_date,
        beatstarsUrl: row.beatstars_url,
        featured: row.featured,
        published: row.published,
        sortOrder: row.sort_order
      };
    });

    return {
      beats,
      source: "supabase",
      detail: `${beats.length} beat${beats.length === 1 ? "" : "s"} from Supabase`
    };
  } catch {
    return {
      beats: site.catalog,
      source: "mock",
      detail: "Supabase is not configured or reachable"
    };
  }
}
