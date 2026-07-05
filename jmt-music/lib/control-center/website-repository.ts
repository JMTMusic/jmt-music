import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SiteConfig } from "@/lib/control-center/types";

export const WEBSITE_SECTION_KEYS = [
  "homepage-hero",
  "about",
  "services",
  "contact",
  "footer"
] as const;

export type WebsiteSectionKey = typeof WEBSITE_SECTION_KEYS[number];

export type WebsiteSectionContent = {
  eyebrow?: string | null;
  heading?: string | null;
  body?: string | null;
  primary_cta_label?: string | null;
  primary_cta_url?: string | null;
  secondary_cta_label?: string | null;
  secondary_cta_url?: string | null;
  [key: string]: unknown;
};

export type CmsWebsiteSection = {
  id: string;
  sectionKey: WebsiteSectionKey;
  title: string;
  content: WebsiteSectionContent;
  published: boolean;
  sortOrder: number;
  updatedAt: string;
};

export type WebsiteSectionsResult = {
  sections: CmsWebsiteSection[];
  status: "empty" | "error" | "ready";
  detail: string;
};

type SectionRow = {
  id: string;
  section_key: string;
  title: string;
  content: WebsiteSectionContent | null;
  published: boolean;
  sort_order: number;
  updated_at: string;
};

function isWebsiteSectionKey(value: string): value is WebsiteSectionKey {
  return WEBSITE_SECTION_KEYS.includes(value as WebsiteSectionKey);
}

/** Reads only recognized CMS sections for one selected property. */
export async function getPropertyWebsiteSections(site: SiteConfig): Promise<WebsiteSectionsResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", site.id)
      .maybeSingle();
    if (propertyError || !property) {
      return { sections: [], status: "error", detail: propertyError ? "Property lookup failed." : "Property not found in Supabase." };
    }

    const { data, error } = await supabase
      .from("website_sections")
      .select("id, section_key, title, content, published, sort_order, updated_at")
      .eq("property_id", property.id)
      .in("section_key", [...WEBSITE_SECTION_KEYS])
      .order("sort_order", { ascending: true });
    if (error) return { sections: [], status: "error", detail: "Website sections could not be loaded." };
    if (!data?.length) return { sections: [], status: "empty", detail: "No CMS sections exist for this property yet." };

    const sections = (data as SectionRow[])
      .filter((row) => isWebsiteSectionKey(row.section_key))
      .map((row) => ({
        id: row.id,
        sectionKey: row.section_key as WebsiteSectionKey,
        title: row.title,
        content: row.content || {},
        published: row.published,
        sortOrder: row.sort_order,
        updatedAt: row.updated_at
      }));
    return { sections, status: "ready", detail: `${sections.length} CMS section${sections.length === 1 ? "" : "s"} loaded from Supabase.` };
  } catch {
    return { sections: [], status: "error", detail: "Supabase is not configured or reachable." };
  }
}
