import "server-only";

import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { WebsiteSectionContent } from "@/lib/control-center/website-types";

export const PUBLIC_CMS_TAG = "jmt-public-cms";

export type PublishedCmsSection = {
  sectionKey: string;
  sortOrder: number;
  content: WebsiteSectionContent & { image_url?: string | null };
};

const readPublishedSections = unstable_cache(async (): Promise<PublishedCmsSection[]> => {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", "jmt-music").maybeSingle();
    if (propertyError || !property) return [];
    const { data, error } = await supabase
      .from("website_sections")
      .select("section_key, sort_order, content")
      .eq("property_id", property.id)
      .eq("published", true);
    if (error || !data) return [];

    return data.flatMap((row) => {
      const draft = (row.content as WebsiteSectionContent | null) || {};
      const snapshot = draft.published_snapshot;
      if (!snapshot) return [];
      const imageUrl = typeof snapshot.image_path === "string"
        ? supabase.storage.from("website-media").getPublicUrl(snapshot.image_path).data.publicUrl
        : null;
      return [{ sectionKey: row.section_key, sortOrder: typeof snapshot.published_sort_order === "number" ? snapshot.published_sort_order : row.sort_order, content: { ...snapshot, hidden: Boolean(snapshot.hidden || snapshot.deleted), image_url: imageUrl } }];
    }).sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    return [];
  }
}, ["jmt-public-cms"], { revalidate: 300, tags: [PUBLIC_CMS_TAG] });

/** Returns one safe published snapshot, or null so callers retain hardcoded copy. */
export async function getPublishedSection(sectionKey: string): Promise<PublishedCmsSection["content"] | null> {
  const sections = await readPublishedSections();
  return sections.find((section) => section.sectionKey === sectionKey)?.content || null;
}

/** Returns every published snapshot assigned to one visual-editor page. */
export async function getPublishedPageSections(pageKey: string): Promise<PublishedCmsSection[]> {
  const sections = await readPublishedSections();
  return sections.filter((section) => section.content.page_key === pageKey);
}
