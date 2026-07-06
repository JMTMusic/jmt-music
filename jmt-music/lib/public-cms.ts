import "server-only";

import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { WebsiteSectionContent } from "@/lib/control-center/website-types";

export const PUBLIC_CMS_TAG = "jmt-public-cms";

type PublishedSection = WebsiteSectionContent & { image_url?: string | null };

const readPublishedSections = unstable_cache(async (): Promise<Record<string, PublishedSection>> => {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", "jmt-music").maybeSingle();
    if (propertyError || !property) return {};
    const { data, error } = await supabase
      .from("website_sections")
      .select("section_key, content")
      .eq("property_id", property.id)
      .eq("published", true);
    if (error || !data) return {};

    return Object.fromEntries(data.flatMap((row) => {
      const draft = (row.content as WebsiteSectionContent | null) || {};
      const snapshot = draft.published_snapshot;
      if (!snapshot) return [];
      const imageUrl = typeof snapshot.image_path === "string"
        ? supabase.storage.from("website-media").getPublicUrl(snapshot.image_path).data.publicUrl
        : null;
      return [[row.section_key, { ...snapshot, image_url: imageUrl }]];
    }));
  } catch {
    return {};
  }
}, ["jmt-public-cms"], { revalidate: 300, tags: [PUBLIC_CMS_TAG] });

/** Returns one safe published snapshot, or null so callers retain hardcoded copy. */
export async function getPublishedSection(sectionKey: string): Promise<PublishedSection | null> {
  const sections = await readPublishedSections();
  return sections[sectionKey] || null;
}
