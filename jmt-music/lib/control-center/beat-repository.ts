import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Beat, SiteConfig } from "./types";

type BeatRow = {
  id: string;
  title: string;
  artwork_path: string | null;
  genre: string | null;
  bpm: number | null;
  musical_key: string | null;
  release_date: string | null;
  featured: boolean;
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
      .select("id, title, artwork_path, genre, bpm, musical_key, release_date, featured")
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

      return {
        id: row.id,
        title: row.title,
        cover,
        genre: row.genre || "Uncategorized",
        bpm: row.bpm || 0,
        musicalKey: row.musical_key || "Not set",
        releaseDate: formatReleaseDate(row.release_date),
        featured: row.featured
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
