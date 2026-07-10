"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateLeadStage } from "@/app/control-center/growth/leads/actions";
import { AdminCard } from "@/components/control-center/ui";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/control-center/lead-display";
import { getDisplayName, isFollowUpDueToday, isFollowUpOverdue } from "@/lib/control-center/lead-pipeline";
import type { Client, SiteId } from "@/lib/control-center/types";

type LeadCardProps = {
  lead: Client;
  propertyId: SiteId;
  canEdit: boolean;
  siteQuery: string;
};

/**
 * Kanban card with a "Move to..." select instead of drag-and-drop — fully keyboard
 * operable, deliberately simple per the Vision's "don't overbuild" instruction for
 * this module.
 */
export function LeadCard({ lead, propertyId, canEdit, siteQuery }: LeadCardProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const moveTo = async (stage: Client["stage"]) => {
    if (stage === lead.stage) return;
    setPending(true);
    setError("");
    try {
      const result = await updateLeadStage({ property: propertyId, leadId: lead.id, stage });
      if (result.status === "error") setError(result.message);
      else router.refresh();
    } catch {
      setError("The lead stage could not be updated.");
    } finally {
      setPending(false);
    }
  };

  const dueToday = isFollowUpDueToday(lead);
  const overdue = isFollowUpOverdue(lead);

  return (
    <AdminCard className="p-4">
      <Link href={`/control-center/growth/leads/${lead.id}${siteQuery}`} className="block">
        <p className="text-sm font-semibold text-slate-100">{getDisplayName(lead)}</p>
        {lead.contactName && <p className="text-[11px] text-slate-500">{lead.artistName}</p>}
        {lead.projectType && <p className="mt-2 text-sm text-slate-300">{lead.projectType}</p>}
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
        {lead.platform && <span className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1">{lead.platform}</span>}
        {lead.budget && <span className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1">{lead.budget}</span>}
      </div>
      {(dueToday || overdue) && (
        <div className={`mt-3 flex items-center gap-1.5 text-[10px] font-semibold ${overdue ? "text-red-300" : "text-amber-200"}`}>
          <CalendarClock className="h-3.5 w-3.5" />
          {overdue ? "Follow-up overdue" : "Follow-up due today"}
        </div>
      )}
      {canEdit && (
        <div className="mt-4 border-t border-white/6 pt-3">
          <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Move to
            <select
              value={lead.stage}
              disabled={pending}
              onChange={(event) => void moveTo(event.target.value as Client["stage"])}
              className="min-h-9 flex-1 rounded-lg border border-white/10 bg-black/25 px-2 text-xs font-normal normal-case text-slate-200 outline-none focus:border-sky-300/60"
              aria-label={`Move ${getDisplayName(lead)} to a different stage`}
            >
              {STAGE_ORDER.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}
            </select>
            {pending && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-sky-300" />}
          </label>
        </div>
      )}
      {error && <p role="alert" className="mt-2 rounded-lg border border-red-400/20 bg-red-400/[0.06] p-2 text-[11px] text-red-200">{error}</p>}
    </AdminCard>
  );
}
