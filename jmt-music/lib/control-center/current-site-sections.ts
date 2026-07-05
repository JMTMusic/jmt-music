import type { WebsitePageKey, WebsiteSectionContent } from "@/lib/control-center/website-types";

export type CurrentSiteSection = {
  section_key: string;
  page_key: WebsitePageKey;
  title: string;
  sort_order: number;
  content: WebsiteSectionContent;
};

/** Editable snapshot of the current hard-coded JMT Music public website. */
export const CURRENT_JMT_SITE_SECTIONS: CurrentSiteSection[] = [
  { section_key: "homepage-hero", page_key: "home", title: "Hero", sort_order: 0, content: { page_key: "home", section_type: "hero", eyebrow: "JMT Music · Production Studio", heading: "Crafted with purpose.", body: "A production studio built on exceptional craftsmanship, genuine care, and the belief that every song deserves to become something unforgettable.", primary_cta_label: "Start a Project", primary_cta_url: "/contact", secondary_cta_label: "Browse Instrumentals", secondary_cta_url: "/beats", preview_image_url: "/assets/jmt-studio-hero.png", hidden: false } },
  { section_key: "home-services", page_key: "home", title: "Studio Services", sort_order: 10, content: { page_key: "home", section_type: "services", eyebrow: "Studio services", heading: "From direction to delivery.", body: "Flexible production support for independent artists, visual storytellers, and creative teams.", primary_cta_label: "View Services", primary_cta_url: "/services", hidden: false } },
  { section_key: "home-featured-work", page_key: "home", title: "Featured Work", sort_order: 20, content: { page_key: "home", section_type: "beat-grid", eyebrow: "Featured work · Recent releases", heading: "The work speaks first.", body: "Recent JMT Music releases, selected as proof of range, musicality, and care in every detail.", primary_cta_label: "View all work", primary_cta_url: "/portfolio", hidden: false } },
  { section_key: "about", page_key: "home", title: "JMT Music Philosophy", sort_order: 30, content: { page_key: "home", section_type: "text", eyebrow: "The JMT Music philosophy", heading: "Craftsmanship behind every note.", body: "JMT Music exists to create music with exceptional craftsmanship and genuine care. We believe every artist, every project, and every song deserves the time, attention, and dedication it takes to become something unforgettable.", hidden: false } },
  { section_key: "home-final-cta", page_key: "home", title: "Project CTA", sort_order: 40, content: { page_key: "home", section_type: "cta", eyebrow: "Your next record starts here", heading: "Ready to build something?", primary_cta_label: "Start a Project", primary_cta_url: "/contact", hidden: false } },

  { section_key: "beats-hero", page_key: "beats", title: "Beats Hero", sort_order: 0, content: { page_key: "beats", section_type: "hero", eyebrow: "Beat catalog", heading: "Find your starting point.", body: "Browse artist-ready instrumentals by sound. Need a different arrangement or something built from scratch? Start a custom project.", hidden: false } },
  { section_key: "beats-library", page_key: "beats", title: "Beat Catalog", sort_order: 10, content: { page_key: "beats", section_type: "beat-grid", eyebrow: "Browse by sound", heading: "Artist-ready instrumentals.", body: "Filter the current catalog by genre and preview available beats.", secondary_cta_label: "Start a custom project", secondary_cta_url: "/contact", hidden: false } },

  { section_key: "services", page_key: "services", title: "Services Hero", sort_order: 0, content: { page_key: "services", section_type: "hero", eyebrow: "Services", heading: "One creative partner. A complete sound.", body: "Choose the support your project needs, from a single keyboard performance to full production and final master.", hidden: false } },
  { section_key: "services-list", page_key: "services", title: "Production Services", sort_order: 10, content: { page_key: "services", section_type: "services", eyebrow: "Production services", heading: "Support for every stage of the record.", body: "Custom Music Production · Mixing · Mastering · Piano & Keyboard Recording · Beat Licensing · Sync Licensing", primary_cta_label: "Start a project", primary_cta_url: "/contact", hidden: false } },
  { section_key: "services-cta", page_key: "services", title: "Services CTA", sort_order: 20, content: { page_key: "services", section_type: "cta", eyebrow: "Not sure what you need?", heading: "Send the song. We'll find the right next step.", primary_cta_label: "Talk to JMT Music", primary_cta_url: "/contact", hidden: false } },

  { section_key: "sync-hero", page_key: "sync", title: "Sync Hero", sort_order: 0, content: { page_key: "sync", section_type: "hero", eyebrow: "Sync licensing", heading: "Music built to support the story.", body: "Original, sync-ready instrumentals for film, advertising, podcasts, games, and branded content.", hidden: false } },
  { section_key: "sync-details", page_key: "sync", title: "Sync Capabilities", sort_order: 10, content: { page_key: "sync", section_type: "services", eyebrow: "Sync capabilities", heading: "Catalog, custom music, and clear licensing.", body: "Original Catalog · Custom Music · Clear Licensing", hidden: false } },
  { section_key: "sync-cta", page_key: "sync", title: "Sync CTA", sort_order: 20, content: { page_key: "sync", section_type: "cta", eyebrow: "Start a sync inquiry", heading: "Tell me about the picture and the feeling.", primary_cta_label: "Discuss your project", primary_cta_url: "/contact", hidden: false } },

  { section_key: "contact", page_key: "contact", title: "Contact Introduction", sort_order: 0, content: { page_key: "contact", section_type: "hero", eyebrow: "Start a project", heading: "Tell me what you're making.", body: "Share the vision, the timeline, and where the project is right now. You'll hear back with a clear next step.", hidden: false } },
  { section_key: "contact-form", page_key: "contact", title: "Inquiry Form", sort_order: 10, content: { page_key: "contact", section_type: "contact", eyebrow: "Project inquiry", heading: "Start the conversation.", body: "Tell JMT Music about your project, service needs, timeline, and budget.", primary_cta_label: "Send inquiry", hidden: false } },

  { section_key: "footer", page_key: "global", title: "Global Footer", sort_order: 0, content: { page_key: "global", section_type: "cta", eyebrow: "JMT Music", heading: "Let's make something unforgettable.", body: "Production, mixing, mastering, and original music by Jonathan Tripp. Connect on Instagram, BeatStars, or Fiverr.", primary_cta_label: "Start a Project", primary_cta_url: "/contact", secondary_cta_label: "Instagram · BeatStars · Fiverr", hidden: false } }
];
