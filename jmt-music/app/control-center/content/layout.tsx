import type { ReactNode } from "react";
import { ContentTabs } from "@/components/control-center/content-tabs";

/** Shared sub-navigation for every Content Workspace page (Dashboard, Pipeline, Calendar). */
export default function ContentLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ContentTabs />
      {children}
    </>
  );
}
