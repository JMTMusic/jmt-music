import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DocumentRecord, DocumentStatus, DocumentType, SiteConfig } from "./types";

type DocumentRow = {
  id: string;
  property_id: string;
  type: DocumentType;
  status: DocumentStatus;
  client_id: string | null;
  project_id: string | null;
  title: string;
  notes: string | null;
  external_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentsResult = {
  documents: DocumentRecord[];
  status: "empty" | "error" | "ready";
  detail: string;
};

const DOCUMENT_COLUMNS = "id, property_id, type, status, client_id, project_id, title, notes, external_url, created_by, created_at, updated_at";

function mapDocumentRow(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    propertyId: row.property_id,
    type: row.type,
    status: row.status,
    clientId: row.client_id,
    projectId: row.project_id,
    title: row.title,
    notes: row.notes,
    externalUrl: row.external_url,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/** Reads document metadata records for one validated property, optionally filtered to a client and/or project. */
export async function getPropertyDocuments(
  site: SiteConfig,
  filters: { clientId?: string; projectId?: string; status?: DocumentStatus } = {}
): Promise<DocumentsResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", site.id)
      .maybeSingle();

    if (propertyError || !property) {
      return { documents: [], status: "error", detail: propertyError ? "Property lookup failed" : "Property not found in Supabase" };
    }

    let query = supabase
      .from("document_records")
      .select(DOCUMENT_COLUMNS)
      .eq("property_id", property.id)
      .order("updated_at", { ascending: false });

    if (filters.clientId) query = query.eq("client_id", filters.clientId);
    if (filters.projectId) query = query.eq("project_id", filters.projectId);
    if (filters.status) query = query.eq("status", filters.status);

    const { data, error } = await query;

    if (error) {
      return { documents: [], status: "error", detail: "Supabase document query failed — has migration 7 (document_records) been applied yet?" };
    }

    const documents = ((data || []) as unknown as DocumentRow[]).map(mapDocumentRow);
    return {
      documents,
      status: documents.length ? "ready" : "empty",
      detail: documents.length ? `${documents.length} document record${documents.length === 1 ? "" : "s"} from Supabase` : "No document records yet"
    };
  } catch {
    return { documents: [], status: "error", detail: "Supabase is not configured or reachable" };
  }
}
