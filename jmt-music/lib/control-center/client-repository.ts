import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Client, Communication, CommunicationDirection, LeadStage, SiteConfig } from "./types";

type ClientRow = {
  id: string;
  property_id: string;
  artist_name: string;
  contact_name: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  project_type: string | null;
  budget: string | null;
  platform: string | null;
  social_links: Record<string, string> | null;
  tags: string[] | null;
  stage: LeadStage;
  is_archived: boolean;
  next_follow_up_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  client_id: string;
  property_id: string;
  project_id: string | null;
  direction: CommunicationDirection;
  type: string;
  platform: string | null;
  subject: string | null;
  body: string;
  sent_at: string;
  source: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientsResult = {
  clients: Client[];
  status: "empty" | "error" | "ready";
  detail: string;
};

export type MessagesResult = {
  messages: Communication[];
  status: "empty" | "error" | "ready";
  detail: string;
};

const CLIENT_COLUMNS =
  "id, property_id, artist_name, contact_name, name, email, phone, project_type, budget, platform, social_links, tags, stage, is_archived, next_follow_up_at, notes, created_by, created_at, updated_at";

const MESSAGE_COLUMNS =
  "id, client_id, property_id, project_id, direction, type, platform, subject, body, sent_at, source, created_by, created_at, updated_at";

function mapClientRow(row: ClientRow): Client {
  return {
    id: row.id,
    propertyId: row.property_id,
    // Falls back to the legacy `name` column for any row that predates the artist_name
    // backfill migration, or was somehow written before the application layer switched over.
    artistName: row.artist_name || row.name || "Unnamed lead",
    contactName: row.contact_name,
    legacyName: row.name,
    email: row.email,
    phone: row.phone,
    projectType: row.project_type,
    budget: row.budget,
    platform: row.platform,
    socialLinks: row.social_links || {},
    tags: row.tags || [],
    stage: row.stage,
    isArchived: row.is_archived,
    nextFollowUpAt: row.next_follow_up_at,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMessageRow(row: MessageRow): Communication {
  return {
    id: row.id,
    clientId: row.client_id,
    propertyId: row.property_id,
    projectId: row.project_id,
    direction: row.direction,
    type: row.type,
    platform: row.platform,
    subject: row.subject,
    body: row.body,
    sentAt: row.sent_at,
    source: row.source,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Reads every client/lead for one validated property. No mock fallback: production UI
 * must not present fictional leads as real business records. An unreachable or
 * not-yet-migrated Supabase surfaces as status "error" with a clear detail message,
 * and the page renders an empty state — never fabricated data.
 */
export async function getPropertyClients(site: SiteConfig): Promise<ClientsResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", site.id)
      .maybeSingle();

    if (propertyError || !property) {
      return { clients: [], status: "error", detail: propertyError ? "Property lookup failed" : "Property not found in Supabase" };
    }

    const { data, error } = await supabase
      .from("clients")
      .select(CLIENT_COLUMNS)
      .eq("property_id", property.id)
      .order("stage", { ascending: true })
      .order("updated_at", { ascending: false });

    if (error) {
      return { clients: [], status: "error", detail: "Supabase client query failed — has migration 4 (clients extension) been applied yet?" };
    }

    const clients = ((data || []) as unknown as ClientRow[]).map(mapClientRow);
    return {
      clients,
      status: clients.length ? "ready" : "empty",
      detail: clients.length ? `${clients.length} lead${clients.length === 1 ? "" : "s"} from Supabase` : "No leads yet"
    };
  } catch {
    return { clients: [], status: "error", detail: "Supabase is not configured or reachable" };
  }
}

/**
 * Reads communications for one property, optionally scoped to a single client.
 * Omitting `clientId` returns the most recent `limit` entries property-wide
 * (Outreach Dashboard, Communications page); passing it returns one client's full
 * timeline (Lead detail page), newest first.
 */
export async function getPropertyClientMessages(
  site: SiteConfig,
  options: { clientId?: string; limit?: number } = {}
): Promise<MessagesResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", site.id)
      .maybeSingle();

    if (propertyError || !property) {
      return { messages: [], status: "error", detail: propertyError ? "Property lookup failed" : "Property not found in Supabase" };
    }

    let query = supabase
      .from("client_messages")
      .select(MESSAGE_COLUMNS)
      .eq("property_id", property.id)
      .order("sent_at", { ascending: false });

    if (options.clientId) query = query.eq("client_id", options.clientId);
    if (options.limit) query = query.limit(options.limit);

    const { data, error } = await query;

    if (error) {
      return { messages: [], status: "error", detail: "Supabase communication query failed — has migration 5 (client_messages extension) been applied yet?" };
    }

    const messages = ((data || []) as unknown as MessageRow[]).map(mapMessageRow);
    return {
      messages,
      status: messages.length ? "ready" : "empty",
      detail: messages.length ? `${messages.length} communication${messages.length === 1 ? "" : "s"} from Supabase` : "No communications logged yet"
    };
  } catch {
    return { messages: [], status: "error", detail: "Supabase is not configured or reachable" };
  }
}
