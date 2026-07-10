import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SiteConfig, Template } from "./types";

type TemplateRow = {
  id: string;
  property_id: string;
  category: string;
  title: string;
  content: string;
  tags: string[] | null;
  description: string | null;
  sort_order: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type TemplatesResult = {
  templates: Template[];
  status: "empty" | "error" | "ready";
  detail: string;
};

const TEMPLATE_COLUMNS = "id, property_id, category, title, content, tags, description, sort_order, is_archived, created_at, updated_at";

function mapTemplateRow(row: TemplateRow): Template {
  return {
    id: row.id,
    propertyId: row.property_id,
    category: row.category,
    title: row.title,
    content: row.content,
    tags: row.tags || [],
    description: row.description,
    sortOrder: row.sort_order,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Reads templates for one validated property. No fabricated starter content ships with
 * this repository — an empty result renders a polished empty state, not fake templates
 * presented as real production records.
 */
export async function getPropertyTemplates(site: SiteConfig, includeArchived = false): Promise<TemplatesResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", site.id)
      .maybeSingle();

    if (propertyError || !property) {
      return { templates: [], status: "error", detail: propertyError ? "Property lookup failed" : "Property not found in Supabase" };
    }

    let query = supabase
      .from("template_library")
      .select(TEMPLATE_COLUMNS)
      .eq("property_id", property.id)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });

    if (!includeArchived) query = query.eq("is_archived", false);

    const { data, error } = await query;

    if (error) {
      return { templates: [], status: "error", detail: "Supabase template query failed — has migration 6 (template_library) been applied yet?" };
    }

    const templates = ((data || []) as unknown as TemplateRow[]).map(mapTemplateRow);
    return {
      templates,
      status: templates.length ? "ready" : "empty",
      detail: templates.length ? `${templates.length} template${templates.length === 1 ? "" : "s"} from Supabase` : "No templates yet"
    };
  } catch {
    return { templates: [], status: "error", detail: "Supabase is not configured or reachable" };
  }
}
