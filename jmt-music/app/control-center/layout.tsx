import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/control-center/admin-shell";

export const metadata: Metadata = {
  title: "Control Center",
  description: "Private JMT Music operations dashboard.",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer"
};

export const dynamic = "force-dynamic";

/** Authenticated layout for the complete JMT Music administration area. */
export default function ControlCenterLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
