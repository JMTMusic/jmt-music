import type { LucideIcon } from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type Beat = {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  cover: string;
  artworkPath?: string | null;
  audioPath?: string | null;
  audioUrl?: string | null;
  genre: string;
  bpm: number;
  musicalKey: string;
  releaseDate: string;
  releaseDateValue?: string | null;
  beatstarsUrl?: string | null;
  featured: boolean;
  published?: boolean;
  sortOrder?: number;
};

/** Growth Engine lifecycle. Extends the client relationship — not a parallel "leads" system. */
export type LeadStage =
  | "new_lead"
  | "qualified"
  | "conversation"
  | "proposal_sent"
  | "negotiating"
  | "booked"
  | "project"
  | "repeat_client";

/**
 * A client/lead relationship. `artist_name` is the primary display identity (required);
 * `contact_name` is an optional individual contact person — display falls back to
 * artistName when contactName is blank. `name` is the deprecated legacy column, retained
 * for backward compatibility only; new code should never write to it.
 */
export type Client = {
  id: string;
  propertyId: string;
  artistName: string;
  contactName: string | null;
  legacyName: string | null;
  email: string | null;
  phone: string | null;
  projectType: string | null;
  budget: string | null;
  platform: string | null;
  socialLinks: Record<string, string>;
  tags: string[];
  stage: LeadStage;
  isArchived: boolean;
  nextFollowUpAt: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommunicationDirection = "inbound" | "outbound" | "internal";

/**
 * A manual entry in the Communication Timeline. `type` is free text by design (Email,
 * Instagram, Website Inquiry, Phone Call, Proposal, Contract, Invoice, Delivery,
 * Follow-up, Internal Note, ...) — same convention as Project.detailStage.
 */
export type Communication = {
  id: string;
  clientId: string;
  propertyId: string;
  projectId: string | null;
  direction: CommunicationDirection;
  type: string;
  platform: string | null;
  subject: string | null;
  body: string;
  sentAt: string;
  source: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

/** A reusable, manually authored piece of outreach/proposal/delivery text. No AI generation. */
export type Template = {
  id: string;
  propertyId: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  description: string | null;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

/** A deliberate, bounded taxonomy — unlike Template.category, new values require a migration. */
export type DocumentType =
  | "proposal"
  | "production_agreement"
  | "mixing_agreement"
  | "mastering_agreement"
  | "beat_license"
  | "session_agreement"
  | "invoice"
  | "welcome_packet"
  | "project_checklist";

export type DocumentStatus = "draft" | "sent" | "signed" | "paid" | "void";

/**
 * Metadata and an optional external link only. No generation, no PDF export, no
 * e-signature. A status of "signed" or "paid" is a manual entry, never system-verified.
 */
export type DocumentRecord = {
  id: string;
  propertyId: string;
  type: DocumentType;
  status: DocumentStatus;
  clientId: string | null;
  projectId: string | null;
  title: string;
  notes: string | null;
  externalUrl: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectType = "beat" | "client_work" | "sync" | "website" | "content" | "other";

export type ProjectPhase = "not_started" | "in_progress" | "finishing" | "ready" | "done";

export type Project = {
  id: string;
  propertyId: string;
  type: ProjectType;
  title: string;
  phase: ProjectPhase;
  detailStage: string | null;
  stageChangedAt: string;
  clientId: string | null;
  beatId: string | null;
  targetDate: string | null;
  isWaiting: boolean;
  waitingNote: string | null;
  waitingSince: string | null;
  nextActionOverride: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StatusItem = {
  label: string;
  detail: string;
  healthy: boolean;
};

export type SiteId = "jmt-music" | "jonathan-tripp";

export type SiteSummary = {
  id: SiteId;
  name: string;
  domain: string;
  connected: boolean;
  initials: string;
};

export type Metric = {
  label: string;
  value: string;
  detail: string;
  icon: "users" | "activity" | "audio" | "click" | "mail" | "eye" | "calendar";
};

export type WebsiteSection = {
  title: string;
  description: string;
  connected: boolean;
};

export type ContentChannel = {
  name: string;
  description: string;
  connected: boolean;
  accent: string;
};

export type BrandSetting = {
  label: string;
  value: string;
};

export type ActivityItem = {
  event: string;
  detail: string;
  time: string;
};

export type SiteConfig = SiteSummary & {
  focus: string;
  supportMessage?: string;
  dashboardMetrics: Metric[];
  websiteSections: WebsiteSection[];
  analyticsStatus: StatusItem[];
  contentChannels: ContentChannel[];
  leadCategories: string[];
  brandSettings: BrandSetting[];
  catalog: Beat[];
  catalogTitle: string;
  catalogDescription: string;
  activity: ActivityItem[];
  topPages: Array<{ label: string; value: string }>;
  topContent: Array<{ label: string; value: number }>;
  trafficSources: Array<{ label: string; value: string }>;
};

export type SitePageProps = {
  searchParams: Promise<{ site?: string }>;
};
