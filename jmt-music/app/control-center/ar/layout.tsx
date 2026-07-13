import type { ReactNode } from "react";
import { ArTabs } from "@/components/control-center/ar-tabs";

/** Shared sub-navigation for every A&R module page (Overview, Discovery Inbox, Watchlist, Ready for Outreach). */
export default function ArLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ArTabs />
      {children}
    </>
  );
}
