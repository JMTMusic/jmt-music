"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Search } from "lucide-react";
import { AdminCard, EmptyState } from "@/components/control-center/ui";
import { SALES_PLATFORMS, SALES_SERVICE_TYPES, SELECTABLE_SALES_STATUSES } from "@/lib/sales/types";
import { PLATFORM_LABELS, PROBABILITY_LABELS, SERVICE_TYPE_LABELS, STATUS_LABELS } from "@/lib/sales/display";
import type { SalesOpportunityRecord } from "@/lib/sales/types";

type SortMode = "follow_up" | "newest" | "budget";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "follow_up", label: "Follow-up date" },
  { value: "newest", label: "Newest" },
  { value: "budget", label: "Budget" }
];

function sortOpportunities(opportunities: SalesOpportunityRecord[], sort: SortMode): SalesOpportunityRecord[] {
  const list = [...opportunities];
  if (sort === "newest") return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (sort === "budget") return list.sort((a, b) => (b.budgetAmount || 0) - (a.budgetAmount || 0));
  return list.sort((a, b) => {
    if (!a.followUpAt && !b.followUpAt) return 0;
    if (!a.followUpAt) return 1;
    if (!b.followUpAt) return -1;
    return new Date(a.followUpAt).getTime() - new Date(b.followUpAt).getTime();
  });
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(new Date(value));
}

/** Searchable, filterable, sortable list of every Sales Opportunity — the flat alternative to the Pipeline board. */
export function SalesOpportunityList({ opportunities, siteQuery }: { opportunities: SalesOpportunityRecord[]; siteQuery: string }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [sort, setSort] = useState<SortMode>("follow_up");

  const selectClass = "min-h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-xs text-slate-200 outline-none focus:border-sky-300/60";

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const results = opportunities.filter((opportunity) => {
      if (statusFilter && opportunity.status !== statusFilter) return false;
      if (platformFilter && opportunity.platform !== platformFilter) return false;
      if (serviceFilter && opportunity.serviceType !== serviceFilter) return false;
      if (query && !opportunity.title.toLowerCase().includes(query) && !opportunity.artistName.toLowerCase().includes(query)) return false;
      return true;
    });
    return sortOpportunities(results, sort);
  }, [opportunities, search, statusFilter, platformFilter, serviceFilter, sort]);

  return (
    <div>
      <AdminCard className="mb-6 flex flex-col gap-3 p-3 md:flex-row md:flex-wrap md:items-center">
        <label className="flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-white/8 bg-black/20 px-4 text-slate-500">
          <Search className="h-4 w-4" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full border-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" placeholder="Search by title or artist" />
        </label>
        <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={selectClass}>
          <option value="">All statuses</option>
          {SELECTABLE_SALES_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
          <option value="converted">{STATUS_LABELS.converted}</option>
        </select>
        <select aria-label="Filter by platform" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)} className={selectClass}>
          <option value="">All platforms</option>
          {SALES_PLATFORMS.map((platform) => <option key={platform} value={platform}>{PLATFORM_LABELS[platform]}</option>)}
        </select>
        <select aria-label="Filter by service" value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)} className={selectClass}>
          <option value="">All services</option>
          {SALES_SERVICE_TYPES.map((type) => <option key={type} value={type}>{SERVICE_TYPE_LABELS[type]}</option>)}
        </select>
        <select aria-label="Sort by" value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className={selectClass}>
          {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>Sort: {option.label}</option>)}
        </select>
      </AdminCard>

      {filtered.length ? (
        <AdminCard className="p-2">
          {filtered.map((opportunity) => {
            const followUpDate = formatDate(opportunity.followUpAt);
            return (
              <Link key={opportunity.id} href={`/control-center/sales/pipeline/${opportunity.id}${siteQuery}`} className="flex flex-wrap items-center gap-4 rounded-xl p-3 transition hover:bg-white/[0.035]">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-100">{opportunity.title}</p>
                  <p className="truncate text-xs text-slate-500">{opportunity.artistName} · {PLATFORM_LABELS[opportunity.platform]} · {SERVICE_TYPE_LABELS[opportunity.serviceType]}</p>
                </div>
                <span className="shrink-0 rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[10px] font-semibold text-slate-300">{STATUS_LABELS[opportunity.status]}</span>
                <span className="shrink-0 rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[10px] text-slate-400">{PROBABILITY_LABELS[opportunity.probability]}</span>
                {opportunity.budgetAmount !== null && <span className="shrink-0 text-xs text-slate-400">{opportunity.currency} {opportunity.budgetAmount}</span>}
                {followUpDate && <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[10px] text-sky-200"><CalendarClock className="h-3.5 w-3.5" />{followUpDate}</span>}
              </Link>
            );
          })}
        </AdminCard>
      ) : (
        <EmptyState title="No matching opportunities" message="Try a different search term or clear a filter." />
      )}
    </div>
  );
}
