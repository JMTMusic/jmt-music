"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, Kanban, LayoutDashboard } from "lucide-react";
import { normalizeSiteId } from "@/lib/control-center/site-registry";

const tabs = [
  { label: "Dashboard", href: "/control-center/content", icon: LayoutDashboard },
  { label: "Pipeline", href: "/control-center/content/pipeline", icon: Kanban },
  { label: "Calendar", href: "/control-center/content/calendar", icon: CalendarDays }
];

/** Sub-navigation for the Content Workspace module. Preserves the `site` query param on every link. */
export function ContentTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const siteId = normalizeSiteId(searchParams.get("site"));
  const siteQuery = siteId === "jmt-music" ? "" : `?site=${siteId}`;

  return (
    <nav aria-label="Content Workspace" className="mb-8 -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {tabs.map(({ label, href, icon: Icon }) => {
        const active = href === "/control-center/content" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={`${href}${siteQuery}`}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              active ? "bg-sky-300/12 text-sky-200 shadow-[inset_0_0_0_1px_rgba(125,211,252,.12)]" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
