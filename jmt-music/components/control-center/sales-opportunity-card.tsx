"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateSalesOpportunityStatusAction } from "@/app/control-center/sales/actions";
import { AdminCard } from "@/components/control-center/ui";
import { PLATFORM_LABELS, PROBABILITY_LABELS, SERVICE_TYPE_LABELS, STATUS_LABELS } from "@/lib/sales/display";
import { SELECTABLE_SALES_STATUSES } from "@/lib/sales/types";
import type { SalesOpportunityRecord, SalesProbability } from "@/lib/sales/types";
import type { SiteId } from "@/lib/control-center/types";

const PROBABILITY_TONE: Record<SalesProbability, string> = {
  low: "border-white/8 bg-white/[0.025] text-slate-400",
  medium: "border-sky-300/20 bg-sky-300/8 text-sky-200",
  high: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
};

type SalesOpportunityCardProps = {
  opportunity: SalesOpportunityRecord;
  propertyId: SiteId;
  canEdit: boolean;
  siteQuery: string;
};

/** Kanban card with a "Move to..." select instead of drag-and-drop — same pattern as LeadCard/ContentItemCard. Status moves are permissive (any-to-any), matching clients.stage's posture, not a bounded transition map. */
export function SalesOpportunityCard({ opportunity, propertyId, canEdit, siteQuery }: SalesOpportunityCardProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const moveTo = async (status: string) => {
    if (status === opportunity.status) return;
    setPending(true);
    setError("");
    try {
      const result = await updateSalesOpportunityStatusAction({ property: propertyId, id: opportunity.id, status });
      if (result.status === "error") setError(result.message);
      else router.refresh();
    } catch {
      setError("The opportunity's status could not be updated.");
    } finally {
      setPending(false);
    }
  };

  const followUpDate = opportunity.followUpAt
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(new Date(opportunity.followUpAt))
    : null;

  return (
    <AdminCard className="p-4">
      <Link href={`/control-center/sales/pipeline/${opportunity.id}${siteQuery}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 break-words text-sm font-semibold text-slate-100">{opportunity.title}</p>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${PROBABILITY_TONE[opportunity.probability]}`}>{PROBABILITY_LABELS[opportunity.probability]}</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">{opportunity.artistName}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
          <span className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1">{PLATFORM_LABELS[opportunity.platform]}</span>
          <span className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1">{SERVICE_TYPE_LABELS[opportunity.serviceType]}</span>
          {opportunity.budgetAmount !== null && <span className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1">{opportunity.currency} {opportunity.budgetAmount}</span>}
        </div>
        {followUpDate && (
          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-sky-200">
            <CalendarClock className="h-3.5 w-3.5" />
            {followUpDate}
          </div>
        )}
      </Link>
      {canEdit && (
        <div className="mt-4 border-t border-white/6 pt-3">
          <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Move to
            <select
              value={opportunity.status === "converted" ? "" : opportunity.status}
              disabled={pending || opportunity.status === "converted"}
              onChange={(event) => void moveTo(event.target.value)}
              className="min-h-9 flex-1 rounded-lg border border-white/10 bg-black/25 px-2 text-xs font-normal normal-case text-slate-200 outline-none focus:border-sky-300/60 disabled:opacity-50"
              aria-label={`Move ${opportunity.title} to a different status`}
            >
              {opportunity.status === "converted" && <option value="">{STATUS_LABELS.converted}</option>}
              {SELECTABLE_SALES_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
            </select>
            {pending && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-sky-300" />}
          </label>
        </div>
      )}
      {error && <p role="alert" className="mt-2 rounded-lg border border-red-400/20 bg-red-400/[0.06] p-2 text-[11px] text-red-200">{error}</p>}
    </AdminCard>
  );
}
