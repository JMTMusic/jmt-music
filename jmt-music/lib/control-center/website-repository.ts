import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SiteConfig } from "@/lib/control-center/types";
import {
  WEBSITE_PAGES,
  type CmsWebsiteSection,
  type WebsitePageKey,
  type WebsiteSectionContent
} from "@/lib/control-center/website-types";
import { CURRENT_JMT_SITE_SECTIONS } from "@/lib/control-center/current-site-sections";

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

function resolvePageKey(sectionKey: string, content: WebsiteSectionContent): WebsitePageKey {
  if (WEBSITE_PAGES.some((page) => page.key === content.page_key)) return content.page_key as WebsitePageKey;
  if (sectionKey === "homepage-hero" || sectionKey === "about") return "home";
  if (sectionKey === "services") return "services";
  if (sectionKey === "contact") return "contact";
  if (sectionKey === "footer") return "global";
  const prefix = sectionKey.split("-")[0];
  return WEBSITE_PAGES.some((page) => page.key === prefix) ? prefix as WebsitePageKey : "home";
}

/** Reads and page-groups all CMS sections for one selected property. */
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
      .order("sort_order", { ascending: true });
    if (error) return { sections: [], status: "error", detail: "Website sections could not be loaded." };
    const rows = (data || []) as SectionRow[];
    if (site.id !== "jmt-music") {
      if (!rows.length) return { sections: [], status: "empty", detail: "No CMS sections exist for this property yet." };
      const sections = rows.map((row) => {
        const content = row.content || {};
        return { id: row.id, sectionKey: row.section_key, pageKey: resolvePageKey(row.section_key, content), title: row.title, content, published: row.published, sortOrder: row.sort_order, updatedAt: row.updated_at, persisted: true };
      });
      return { sections, status: "ready", detail: `${sections.length} CMS sections loaded from Supabase.` };
    }
    const rowByKey = new Map(rows.map((row) => [row.section_key, row]));
    const mappedDefaults: CmsWebsiteSection[] = CURRENT_JMT_SITE_SECTIONS.map((fallback) => {
      const row = rowByKey.get(fallback.section_key);
      const content = { ...fallback.content, ...(row?.content || {}) };
      return {
        id: row?.id || `fallback-${fallback.section_key}`,
        sectionKey: fallback.section_key,
        pageKey: resolvePageKey(fallback.section_key, content),
        title: row?.title || fallback.title,
        content,
        published: row?.published || false,
        sortOrder: row?.sort_order ?? fallback.sort_order,
        updatedAt: row?.updated_at || "",
        persisted: Boolean(row)
      };
    });
    const knownKeys = new Set(CURRENT_JMT_SITE_SECTIONS.map((section) => section.section_key));
    const extraSections: CmsWebsiteSection[] = rows.filter((row) => !knownKeys.has(row.section_key)).map((row) => {
      const content = row.content || {};
      return { id: row.id, sectionKey: row.section_key, pageKey: resolvePageKey(row.section_key, content), title: row.title, content, published: row.published, sortOrder: row.sort_order, updatedAt: row.updated_at, persisted: true };
    });
    const sections = [...mappedDefaults, ...extraSections];
    const fallbackCount = sections.filter((section) => !section.persisted).length;
    return { sections, status: "ready", detail: fallbackCount ? `${fallbackCount} current-site section${fallbackCount === 1 ? " is" : "s are"} ready to load into Supabase.` : `${sections.length} CMS sections loaded from Supabase.` };
  } catch {
    return { sections: [], status: "error", detail: "Supabase is not configured or reachable." };
  }
}
