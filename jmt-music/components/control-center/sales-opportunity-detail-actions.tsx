"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateSalesOpportunityAction, updateSalesOpportunityStatusAction } from "@/app/control-center/sales/actions";
import { PROBABILITY_LABELS, STATUS_LABELS } from "@/lib/sales/display";
import { SALES_PROBABILITIES, SELECTABLE_SALES_STATUSES } from "@/lib/sales/types";
import type { SalesOpportunityRecord } from "@/lib/sales/types";
import type { SiteId } from "@/lib/control-center/types";

/** Status and probability controls for the Opportunity detail page, plus a lost-reason note shown only once the opportunity is Lost. */
export function SalesOpportunityDetailActions({ opportunity, propertyId, canEdit }: { opportunity: SalesOpportunityRecord; propertyId: SiteId; canEdit: boolean }) {
  const [pending, setPending] = useState<"status" | "probability" | "lost_reason" | null>(null);
  const [error, setError] = useState("");
  const [lostReason, setLostReason] = useState(opportunity.lostReason || "");
  const router = useRouter();

  const isConverted = opportunity.status === "converted";

  const changeStatus = async (status: string) => {
    if (status === opportunity.status) return;
    setPending("status");
    setError("");
    try {
      const result = await updateSalesOpportunityStatusAction({ property: propertyId, id: opportunity.id, status });
      if (result.status === "error") setError(result.message);
      else router.refresh();
    } catch {
      setError("The status could not be updated.");
    } finally {
      setPending(null);
    }
  };

  const changeProbability = async (probability: string) => {
    if (probability === opportunity.probability) return;
    setPending("probability");
    setError("");
    try {
      const result = await updateSalesOpportunityAction({ property: propertyId, id: opportunity.id, probability });
      if (result.status === "error") setError(result.message);
      else router.refresh();
    } catch {
      setError("The probability could not be updated.");
    } finally {
      setPending(null);
    }
  };

  const saveLostReason = async () => {
    setPending("lost_reason");
    setError("");
    try {
      const result = await updateSalesOpportunityAction({ property: propertyId, id: opportunity.id, lostReason: lostReason || null });
      if (result.status === "error") setError(result.message);
      else router.refresh();
    } catch {
      setError("The lost reason could not be saved.");
    } finally {
      setPending(null);
    }
  };

  const selectClass = "min-h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm font-normal text-slate-200 outline-none focus:border-sky-300/60 disabled:opacity-50";

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          Status
          <select value={isConverted ? "" : opportunity.status} disabled={!canEdit || pending !== null || isConverted} onChange={(event) => void changeStatus(event.target.value)} className={selectClass}>
            {isConverted && <option value="">{STATUS_LABELS.converted}</option>}
            {SELECTABLE_SALES_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
          </select>
          {pending === "status" && <LoaderCircle className="h-4 w-4 animate-spin text-sky-300" />}
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          Probability
          <select value={opportunity.probability} disabled={!canEdit || pending !== null || isConverted} onChange={(event) => void changeProbability(event.target.value)} className={selectClass}>
            {SALES_PROBABILITIES.map((probability) => <option key={probability} value={probability}>{PROBABILITY_LABELS[probability]}</option>)}
          </select>
          {pending === "probability" && <LoaderCircle className="h-4 w-4 animate-spin text-sky-300" />}
        </label>
      </div>

      {opportunity.status === "lost" && canEdit && (
        <div className="mt-5 border-t border-white/6 pt-5">
          <label className="text-xs font-semibold text-slate-300">
            Lost reason
            <textarea value={lostReason} onChange={(event) => setLostReason(event.target.value)} maxLength={2000} className="mt-2 min-h-20 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 py-3 text-sm text-white outline-none transition focus:border-sky-300/60" placeholder="What happened? (budget, timing, went with someone else, ...)" />
          </label>
          <button type="button" disabled={pending !== null} onClick={saveLostReason} className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-semibold text-slate-300 hover:border-sky-300/40 disabled:opacity-50">
            {pending === "lost_reason" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : "Save"}
          </button>
        </div>
      )}

      {error && <p role="alert" className="mt-4 rounded-lg border border-red-400/20 bg-red-400/[0.06] p-2 text-[11px] text-red-200">{error}</p>}
    </div>
  );
}
