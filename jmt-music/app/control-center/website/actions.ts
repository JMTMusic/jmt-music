"use server";

import { revalidatePath } from "next/cache";
import { getControlCenterRole } from "@/lib/control-center/access";
import { siteRegistry } from "@/lib/control-center/site-registry";
import {
  WEBSITE_SECTION_KEYS,
  type CmsWebsiteSection,
  type WebsiteSectionContent,
  type WebsiteSectionKey
} from "@/lib/control-center/website-repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type WebsiteActionResult = {
  status: "error" | "success";
  message: string;
  section?: CmsWebsiteSection;
};

const DEFAULT_JMT_SECTIONS: Array<{ section_key: WebsiteSectionKey; title: string; sort_order: number }> = [
  { section_key: "homepage-hero", title: "Homepage Hero", sort_order: 0 },
  { section_key: "about", title: "About", sort_order: 10 },
  { section_key: "services", title: "Services", sort_order: 20 },
  { section_key: "contact", title: "Contact", sort_order: 30 },
  { section_key: "footer", title: "Footer", sort_order: 40 }
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
      .eq("property_id", property.id)
      .in("section_key", [...WEBSITE_SECTION_KEYS]);
    if (existingError) return { status: "error", message: "Existing website sections could not be checked." };

    const existingKeys = new Set((existing || []).map((row) => row.section_key));
    const missing = DEFAULT_JMT_SECTIONS.filter((section) => !existingKeys.has(section.section_key));
    if (!missing.length) return { status: "success", message: "All default JMT Music sections already exist." };

    const { error } = await supabase.from("website_sections").upsert(
      missing.map((section) => ({
        property_id: property.id,
        ...section,
        content: {},
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
  const title = String(formData.get("title") || "").trim();
  const sortOrder = Number(String(formData.get("sort_order") || "0"));
  const contentFields: WebsiteSectionContent = {
    eyebrow: optionalText(formData, "eyebrow", 80),
    heading: optionalText(formData, "heading", 160),
    body: optionalText(formData, "body", 5000),
    primary_cta_label: optionalText(formData, "primary_cta_label", 80),
    primary_cta_url: optionalText(formData, "primary_cta_url", 500),
    secondary_cta_label: optionalText(formData, "secondary_cta_label", 80),
    secondary_cta_url: optionalText(formData, "secondary_cta_url", 500)
  };

  if (!selectedSite) return { status: "error", message: "Select a valid property." };
  if (title.length < 2 || title.length > 120) return { status: "error", message: "Section title must use 2–120 characters." };
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
      .select("id, section_key, content")
      .eq("id", sectionId)
      .eq("property_id", property.id)
      .maybeSingle();
    if (sectionError || !existing || !WEBSITE_SECTION_KEYS.includes(existing.section_key as WebsiteSectionKey)) {
      return { status: "error", message: "That section does not belong to the selected property." };
    }

    const content = { ...((existing.content as WebsiteSectionContent | null) || {}), ...contentFields };
    const { data, error } = await supabase
      .from("website_sections")
      .update({
        title,
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
        sectionKey: data.section_key as WebsiteSectionKey,
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
