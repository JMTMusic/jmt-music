import type { LucideIcon } from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type Beat = {
  id: string;
  title: string;
  cover: string;
  genre: string;
  bpm: number;
  musicalKey: string;
  releaseDate: string;
  featured: boolean;
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
