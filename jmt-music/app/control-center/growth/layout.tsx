import type { ReactNode } from "react";
import { GrowthTabs } from "@/components/control-center/growth-tabs";

/** Shared sub-navigation for every Growth Engine module page (Outreach, Leads, Communications, Templates, Documents). */
export default function GrowthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <GrowthTabs />
      {children}
    </>
  );
}
