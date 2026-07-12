import type { Metadata } from "next";
import { ProjectIntake } from "./project-intake";

export const metadata: Metadata = {
  title: "Start Your Project",
  description: "Begin a project conversation with JMT Music.",
  robots: { index: false, follow: false }
};

export default function StartYourProjectPage() {
  return <ProjectIntake />;
}
