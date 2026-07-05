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
import { BEAT_ARTWORK_MIME_TYPES, ensureWebsiteMediaBucket, WEBSITE_MEDIA_BUCKET, WEBSITE_MEDIA_MAX_BYTES } from "@/lib/supabase/storage";
import { CURRENT_JMT_SITE_SECTIONS } from "@/lib/control-center/current-site-sections";

export type WebsiteActionResult = {
  status: "error" | "success";
  message: string;
  section?: CmsWebsiteSection;
};

export type SectionMutation = "move-up" | "move-down" | "duplicate" | "toggle-hidden" | "delete" | "add-below" | "publish";

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
      .select("id, section_key, content")
      .eq("property_id", property.id);
    if (existingError) return { status: "error", message: "Existing website sections could not be checked." };

    const existingKeys = new Set((existing || []).map((row) => row.section_key));
    const defaultsByKey = new Map(CURRENT_JMT_SITE_SECTIONS.map((section) => [section.section_key, section]));
    const mergeResults = await Promise.all((existing || []).map((row) => {
      const fallback = defaultsByKey.get(row.section_key);
      if (!fallback) return Promise.resolve({ error: null });
      return supabase
        .from("website_sections")
        .update({ content: { ...fallback.content, ...((row.content as WebsiteSectionContent | null) || {}) } })
        .eq("id", row.id)
        .eq("property_id", property.id);
    }));
    if (mergeResults.some((result) => result.error)) return { status: "error", message: "Existing website sections could not be initialized." };
    const missing = CURRENT_JMT_SITE_SECTIONS.filter((section) => !existingKeys.has(section.section_key));
    if (!missing.length) {
      revalidatePath("/control-center/website");
      return { status: "success", message: "Current website content is loaded and existing edits were preserved." };
    }

    const { error } = await supabase.from("website_sections").upsert(
      missing.map((section) => ({
        property_id: property.id,
        section_key: section.section_key,
        title: section.title,
        sort_order: section.sort_order,
        content: section.content,
        published: false,
        created_by: userId
      })),
      { onConflict: "property_id,section_key", ignoreDuplicates: true }
    );
    if (error) return { status: "error", message: "Default website sections could not be created." };
    revalidatePath("/control-center/website");
    return { status: "success", message: `${missing.length} current-site section${missing.length === 1 ? " was" : "s were"} loaded.` };
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
    secondary_cta_url: optionalText(formData, "secondary_cta_url", 500),
    image_path: optionalText(formData, "image_path", 1000),
    image_position: {
      x: Math.max(0, Math.min(100, Number(formData.get("image_position_x") || 50))),
      y: Math.max(0, Math.min(100, Number(formData.get("image_position_y") || 50)))
    }
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
      .select("id, section_key, title, content, published")
      .eq("id", sectionId)
      .eq("property_id", property.id)
      .maybeSingle();
    if (sectionError || !existing) {
      return { status: "error", message: "That section does not belong to the selected property." };
    }
    if (contentFields.image_path && contentFields.image_path !== (existing.content as WebsiteSectionContent | null)?.image_path
      && !contentFields.image_path.startsWith(`${property.id}/${existing.id}/`)) {
      return { status: "error", message: "That image does not belong to this website section." };
    }

    const content = { ...((existing.content as WebsiteSectionContent | null) || {}), ...contentFields };
    const { data, error } = await supabase
      .from("website_sections")
      .update({
        title: existing.title,
        content,
        published: existing.published,
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

/** Creates a signed, property/section-scoped upload for visual-editor imagery. */
export async function prepareWebsiteImageUpload(input: {
  property: string;
  sectionId: string;
  type: string;
  size: number;
}): Promise<{ status: "error" | "success"; message: string; path?: string; token?: string; bucket?: string }> {
  const role = await getControlCenterRole();
  if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to upload website media." };
  if (!BEAT_ARTWORK_MIME_TYPES.includes(input.type as typeof BEAT_ARTWORK_MIME_TYPES[number]) || input.size > WEBSITE_MEDIA_MAX_BYTES) {
    return { status: "error", message: "Use a JPG, PNG, WebP, or AVIF image no larger than 10 MB." };
  }
  const selectedSite = siteRegistry.find((site) => site.id === input.property);
  if (!selectedSite) return { status: "error", message: "Select a valid property." };
  try {
    const supabase = createSupabaseAdminClient();
    const { data: property } = await supabase.from("properties").select("id").eq("slug", selectedSite.id).maybeSingle();
    if (!property) return { status: "error", message: "The selected property could not be found." };
    const { data: section } = await supabase.from("website_sections").select("id").eq("id", input.sectionId).eq("property_id", property.id).maybeSingle();
    if (!section) return { status: "error", message: "That section does not belong to the selected property." };
    const bucket = await ensureWebsiteMediaBucket(supabase);
    if (bucket.error) return { status: "error", message: "Website media storage is unavailable." };
    const path = `${property.id}/${section.id}/${crypto.randomUUID()}.webp`;
    const signed = await supabase.storage.from(WEBSITE_MEDIA_BUCKET).createSignedUploadUrl(path);
    if (signed.error) return { status: "error", message: "The image upload could not be prepared." };
    return { status: "success", message: "Upload prepared.", path, token: signed.data.token, bucket: WEBSITE_MEDIA_BUCKET };
  } catch {
    return { status: "error", message: "The image upload could not be prepared." };
  }
}

/** Performs visual-builder section operations without exposing property identifiers. */
export async function mutateWebsiteSection(input: {
  sectionId: string;
  property: string;
  mutation: SectionMutation;
}): Promise<WebsiteActionResult> {
  const userId = process.env.CONTROL_CENTER_SUPABASE_USER_ID;
  if (!userId) return { status: "error", message: "Control Center user mapping is not configured." };
  const role = await getControlCenterRole();
  if (role !== "owner" && role !== "editor") return { status: "error", message: "You do not have permission to change website sections." };
  const selectedSite = siteRegistry.find((site) => site.id === input.property);
  if (!selectedSite) return { status: "error", message: "Select a valid property." };
  const allowed: SectionMutation[] = ["move-up", "move-down", "duplicate", "toggle-hidden", "delete", "add-below", "publish"];
  if (!allowed.includes(input.mutation)) return { status: "error", message: "That section action is not supported." };

  try {
    const supabase = createSupabaseAdminClient();
    const { data: property } = await supabase.from("properties").select("id").eq("slug", selectedSite.id).maybeSingle();
    if (!property) return { status: "error", message: "The selected property could not be found." };
    const { data: section } = await supabase.from("website_sections").select("*").eq("id", input.sectionId).eq("property_id", property.id).maybeSingle();
    if (!section) return { status: "error", message: "That section does not belong to the selected property." };
    const content = (section.content as WebsiteSectionContent | null) || {};

    if (input.mutation === "delete") {
      const { error } = await supabase.from("website_sections").delete().eq("id", section.id).eq("property_id", property.id);
      if (error) return { status: "error", message: "The section could not be deleted." };
    } else if (input.mutation === "toggle-hidden") {
      const { error } = await supabase.from("website_sections").update({ content: { ...content, hidden: !content.hidden } }).eq("id", section.id).eq("property_id", property.id);
      if (error) return { status: "error", message: "Section visibility could not be changed." };
    } else if (input.mutation === "publish") {
      const { published_snapshot: _previous, ...draft } = content;
      const { error } = await supabase.from("website_sections").update({ content: { ...content, published_snapshot: draft }, published: true }).eq("id", section.id).eq("property_id", property.id);
      if (error) return { status: "error", message: "The section could not be published." };
    } else if (input.mutation === "duplicate" || input.mutation === "add-below") {
      const duplicate = input.mutation === "duplicate";
      let inserted = false;
      for (let index = 1; index <= 100 && !inserted; index += 1) {
        const key = `${section.section_key}-${duplicate ? "copy" : "section"}${index === 1 ? "" : `-${index}`}`;
        const { error } = await supabase.from("website_sections").insert({
          property_id: property.id,
          section_key: key,
          title: duplicate ? `${section.title} Copy` : "New Text Section",
          content: duplicate ? { ...content, published_snapshot: undefined } : {
            page_key: content.page_key || "home",
            section_type: "text",
            hidden: false,
            heading: "New section",
            body: "Click Edit to replace this text."
          },
          published: false,
          sort_order: section.sort_order + (duplicate ? 1 : 5),
          created_by: userId
        });
        if (!error) inserted = true;
        else if (error.code !== "23505") return { status: "error", message: "The new section could not be created." };
      }
      if (!inserted) return { status: "error", message: "A unique section key could not be generated." };
    } else {
      const ascending = input.mutation === "move-down";
      let query = supabase.from("website_sections").select("id, section_key, sort_order, content").eq("property_id", property.id);
      query = ascending ? query.gt("sort_order", section.sort_order).order("sort_order", { ascending: true }) : query.lt("sort_order", section.sort_order).order("sort_order", { ascending: false });
      const { data: candidates } = await query.limit(20);
      const pageFor = (key: string, value: WebsiteSectionContent) => value.page_key
        || (key === "services" ? "services" : key === "contact" ? "contact" : key === "footer" ? "global" : key.split("-")[0] === "sync" ? "sync" : key.split("-")[0] === "beats" ? "beats" : "home");
      const currentPage = pageFor(section.section_key, content);
      const sibling = candidates?.find((candidate) => pageFor(candidate.section_key, (candidate.content as WebsiteSectionContent | null) || {}) === currentPage);
      if (sibling) {
        const { error: firstError } = await supabase.from("website_sections").update({ sort_order: sibling.sort_order }).eq("id", section.id);
        const { error: secondError } = await supabase.from("website_sections").update({ sort_order: section.sort_order }).eq("id", sibling.id);
        if (firstError || secondError) return { status: "error", message: "The section order could not be changed." };
      }
    }
    revalidatePath("/control-center/website");
    return { status: "success", message: input.mutation === "publish" ? "Section published to the staged snapshot." : "Section updated." };
  } catch {
    return { status: "error", message: "The section action could not be completed." };
  }
}
