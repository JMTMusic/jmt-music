import { BeatsPageContent } from "@/components/beats-page-content";
import { getPublishedPageSections, getPublishedSection } from "@/lib/public-cms";

export const metadata = {
  title: "Beats & Licensing",
  description: "Listen to original JMT Music instrumentals and inquire about beat licensing, customization, and exclusive options."
};

export default async function BeatsPage() {
  const [hero, catalog, sections] = await Promise.all([
    getPublishedSection("beats-hero"),
    getPublishedSection("beats-library"),
    getPublishedPageSections("beats")
  ]);
  const extras = sections.filter((section) => !["beats-hero", "beats-library"].includes(section.sectionKey));
  return <BeatsPageContent hero={hero} catalog={catalog} extraSections={extras} />;
}
