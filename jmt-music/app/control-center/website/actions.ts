"use server";

import { revalidatePath } from "next/cache";
import { getControlCenterRole } from "@/lib/control-center/access";
import { siteRegistry } from "@/lib/control-center/site-registry";
import {
  WEBSITE_PAGES,
  type CmsWebsiteSection,
  type WebsiteSectionContent,
  type WebsitePageKey
} from "@/lib/control-center/website-types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type WebsiteActionResult = {
  status: "error" | "success";
  message: string;
  section?: CmsWebsiteSection;
};

const DEFAULT_JMT_SECTIONS: Array<{ section_key: string; page_key: WebsitePageKey; title: string; sort_order: number }> = [
  { section_key: "homepage-hero", page_key: "home", title: "Hero", sort_order: 0 },
  { section_key: "about", page_key: "home", title: "About Preview", sort_order: 10 },
  { section_key: "home-services", page_key: "home", title: "Services Preview", sort_order: 20 },
  { section_key: "beats-hero", page_key: "beats", title: "Beats Hero", sort_order: 0 },
  { section_key: "beats-library", page_key: "beats", title: "Beat Library", sort_order: 10 },
  { section_key: "services", page_key: "services", title: "Services Hero", sort_order: 0 },
  { section_key: "services-list", page_key: "services", title: "Services List", sort_order: 10 },
  { section_key: "sync-hero", page_key: "sync", title: "Sync Hero", sort_order: 0 },
  { section_key: "sync-details", page_key: "sync", title: "Sync Details", sort_order: 10 },
  { section_key: "contact", page_key: "contact", title: "Contact Hero", sort_order: 0 },
  { section_key: "contact-form", page_key: "contact", title: "Contact Form Intro", sort_order: 10 },
  { section_key: "footer", page_key: "global", title: "Footer", sort_order: 0 }
];

function optionalText(formData: FormData, key: string, max: number): string | null {
  const value = String(formData.get(key) || "").trim();
  return value ? value.slice(0, max) : null;
}

function validCmsUrl(value: string | null): boolean {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** Inserts only missing default sections for the JMT Music property. */
export async function setupJmtWebsiteSections(): Promise<WebsiteActionResult> {
  const userId = process.env.CONTROL_CENTER_SUPABASE_USER_ID;
  if (!userId) return { status: "error", message: "Control Center user mapping is not configured." };
  const role = await getControlCenterRole();
  if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to set up website sections." };

  try {
    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", "jmt-music").maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The JMT Music property could not be found." };

    const { data: existing, error: existingError } = await supabase
      .from("website_sections")
      .select("section_key")
      .eq("property_id", property.id);
    if (existingError) return { status: "error", message: "Existing website sections could not be checked." };

    const existingKeys = new Set((existing || []).map((row) => row.section_key));
    const missing = DEFAULT_JMT_SECTIONS.filter((section) => !existingKeys.has(section.section_key));
    if (!missing.length) return { status: "success", message: "All default JMT Music sections already exist." };

    const { error } = await supabase.from("website_sections").upsert(
      missing.map((section) => ({
        property_id: property.id,
        section_key: section.section_key,
        title: section.title,
        sort_order: section.sort_order,
        content: { page_key: section.page_key },
        published: false,
        created_by: userId
      })),
      { onConflict: "property_id,section_key", ignoreDuplicates: true }
    );
    if (error) return { status: "error", message: "Default website sections could not be created." };
    revalidatePath("/control-center/website");
    return { status: "success", message: `${missing.length} default website section${missing.length === 1 ? " was" : "s were"} created.` };
  } catch {
    return { status: "error", message: "Website section setup failed. Please try again." };
  }
}

/** Updates one recognized section only when it belongs to the selected property. */
export async function updateWebsiteSection(
  _previousState: WebsiteActionResult,
  formData: FormData
): Promise<WebsiteActionResult> {
  if (!process.env.CONTROL_CENTER_SUPABASE_USER_ID) return { status: "error", message: "Control Center user mapping is not configured." };
  const role = await getControlCenterRole();
  if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to edit website sections." };

  const sectionId = String(formData.get("section_id") || "");
  const propertySlug = String(formData.get("property") || "");
  const selectedSite = siteRegistry.find((site) => site.id === propertySlug);
  const sortOrder = Number(String(formData.get("sort_order") || "0"));
  const pageKey = String(formData.get("page_key") || "");
  const validPageKey = WEBSITE_PAGES.some((page) => page.key === pageKey);
  const contentFields: WebsiteSectionContent = {
    page_key: validPageKey ? pageKey as WebsitePageKey : undefined,
    eyebrow: optionalText(formData, "eyebrow", 80),
    heading: optionalText(formData, "heading", 160),
    body: optionalText(formData, "body", 5000),
    primary_cta_label: optionalText(formData, "primary_cta_label", 80),
    primary_cta_url: optionalText(formData, "primary_cta_url", 500),
    secondary_cta_label: optionalText(formData, "secondary_cta_label", 80),
    secondary_cta_url: optionalText(formData, "secondary_cta_url", 500)
  };

  if (!selectedSite) return { status: "error", message: "Select a valid property." };
  if (!validPageKey) return { status: "error", message: "Select a valid website page." };
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) return { status: "error", message: "Sort order must be a whole number from 0–10,000." };
  if (!validCmsUrl(contentFields.primary_cta_url as string | null) || !validCmsUrl(contentFields.secondary_cta_url as string | null)) {
    return { status: "error", message: "CTA links must be secure https:// URLs or internal paths beginning with /." };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", selectedSite.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "The selected property could not be found." };
    const { data: existing, error: sectionError } = await supabase
      .from("website_sections")
      .select("id, section_key, title, content")
      .eq("id", sectionId)
      .eq("property_id", property.id)
      .maybeSingle();
    if (sectionError || !existing) {
      return { status: "error", message: "That section does not belong to the selected property." };
    }

    const content = { ...((existing.content as WebsiteSectionContent | null) || {}), ...contentFields };
    const { data, error } = await supabase
      .from("website_sections")
      .update({
        title: existing.title,
        content,
        published: formData.get("published") === "on",
        sort_order: sortOrder,
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id)
      .eq("property_id", property.id)
      .select("id, section_key, title, content, published, sort_order, updated_at")
      .single();
    if (error || !data) return { status: "error", message: "The website section could not be saved." };

    revalidatePath("/control-center/website");
    return {
      status: "success",
      message: "Website section saved.",
      section: {
        id: data.id,
        sectionKey: data.section_key,
        pageKey: ((data.content as WebsiteSectionContent | null)?.page_key || pageKey) as WebsitePageKey,
        title: data.title,
        content: (data.content as WebsiteSectionContent | null) || {},
        published: data.published,
        sortOrder: data.sort_order,
        updatedAt: data.updated_at
      }
    };
  } catch {
    return { status: "error", message: "The website section could not be saved. Please try again." };
  }
}
