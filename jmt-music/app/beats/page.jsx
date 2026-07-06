import { BeatsPageContent } from "@/components/beats-page-content";
import { getPublishedSection } from "@/lib/public-cms";

export default async function BeatsPage() {
  const [hero, catalog] = await Promise.all([
    getPublishedSection("beats-hero"),
    getPublishedSection("beats-library")
  ]);
  return <BeatsPageContent hero={hero} catalog={catalog} />;
}
