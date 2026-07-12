import type { ReactNode } from "react";
import { SalesTabs } from "@/components/control-center/sales-tabs";

/** Shared sub-navigation for every Sales module page (Overview, Pipeline, Opportunities). */
export default function SalesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SalesTabs />
      {children}
    </>
  );
}
