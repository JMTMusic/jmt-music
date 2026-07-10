"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CheckSquare, FileText, LayoutDashboard, MessagesSquare, Users } from "lucide-react";
import { normalizeSiteId } from "@/lib/control-center/site-registry";

const tabs = [
  { label: "Outreach", href: "/control-center/growth", icon: LayoutDashboard },
  { label: "Lead Pipeline", href: "/control-center/growth/leads", icon: Users },
  { label: "Communications", href: "/control-center/growth/communications", icon: MessagesSquare },
  { label: "Templates", href: "/control-center/growth/templates", icon: FileText },
  { label: "Documents", href: "/control-center/growth/documents", icon: CheckSquare }
];

/** Sub-navigation for the Growth Engine module. Preserves the `site` query param on every link. */
export function GrowthTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const siteId = normalizeSiteId(searchParams.get("site"));
  const siteQuery = siteId === "jmt-music" ? "" : `?site=${siteId}`;

  return (
    <nav aria-label="Growth Engine" className="mb-8 -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {tabs.map(({ label, href, icon: Icon }) => {
        const active = href === "/control-center/growth" ? pathname === href : pathname.startsWith(href);
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
