import type { Metadata } from "next";
import { ThankYouLetter } from "./thank-you-letter";

export const metadata: Metadata = {
  title: "Thank You",
  description: "A personal note from JMT Music.",
  robots: { index: false, follow: false }
};

export default function ProjectDiscoveryThankYouPage() {
  return <ThankYouLetter />;
}
