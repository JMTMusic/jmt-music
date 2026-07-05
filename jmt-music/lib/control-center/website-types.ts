export const WEBSITE_PAGES = [
  { key: "home", label: "Home" },
  { key: "beats", label: "Beats" },
  { key: "services", label: "Services" },
  { key: "sync", label: "Sync" },
  { key: "contact", label: "Contact" },
  { key: "global", label: "Footer / Global" }
] as const;

export type WebsitePageKey = typeof WEBSITE_PAGES[number]["key"];

export type WebsiteSectionContent = {
  eyebrow?: string | null;
  heading?: string | null;
  body?: string | null;
  primary_cta_label?: string | null;
  primary_cta_url?: string | null;
  secondary_cta_label?: string | null;
  secondary_cta_url?: string | null;
  page_key?: WebsitePageKey;
  [key: string]: unknown;
};

export type CmsWebsiteSection = {
  id: string;
  sectionKey: string;
  pageKey: WebsitePageKey;
  title: string;
  content: WebsiteSectionContent;
  published: boolean;
  sortOrder: number;
  updatedAt: string;
};
