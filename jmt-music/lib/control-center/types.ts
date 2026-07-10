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

export type Client = {
  id: string;
  name: string;
  email: string;
  project: string;
  budget: string;
  date: string;
  stage: "New" | "Contacted" | "In Progress" | "Completed";
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
  clients: Client[];
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
