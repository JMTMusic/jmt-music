"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, CalendarClock, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { archiveLead, setLeadFollowUp } from "@/app/control-center/growth/leads/actions";
import type { Client, SiteId } from "@/lib/control-center/types";

/** Follow-up date setter and archive/restore toggle for the Lead detail page. */
export function LeadDetailActions({ lead, propertyId, canEdit }: { lead: Client; propertyId: SiteId; canEdit: boolean }) {
  const [followUp, setFollowUp] = useState(lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : "");
  const [pending, setPending] = useState<"followup" | "archive" | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const saveFollowUp = async () => {
    setPending("followup");
    setError("");
    try {
      const result = await setLeadFollowUp({ property: propertyId, leadId: lead.id, nextFollowUpAt: followUp || null });
      if (result.status === "error") setError(result.message);
      else router.refresh();
    } catch {
      setError("The follow-up date could not be updated.");
    } finally {
      setPending(null);
    }
  };

  const toggleArchive = async () => {
    setPending("archive");
    setError("");
    try {
      const result = await archiveLead({ property: propertyId, leadId: lead.id, isArchived: !lead.isArchived });
      if (result.status === "error") setError(result.message);
      else router.refresh();
    } catch {
      setError("The lead could not be updated.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <label className="text-xs font-semibold text-slate-300">
        Next follow-up
        <div className="mt-2 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-slate-500" />
          <input type="date" disabled={!canEdit} value={followUp} onChange={(event) => setFollowUp(event.target.value)} className="min-h-11 rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white outline-none focus:border-sky-300/60 disabled:opacity-50" />
          {canEdit && <button type="button" onClick={saveFollowUp} disabled={pending !== null} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-semibold text-slate-300 hover:border-sky-300/40 disabled:opacity-50">{pending === "followup" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : "Save"}</button>}
        </div>
      </label>
      {canEdit && (
        <button type="button" onClick={toggleArchive} disabled={pending !== null} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:border-red-300/30 hover:text-red-200 disabled:opacity-50">
          {pending === "archive" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : lead.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          {lead.isArchived ? "Restore Lead" : "Archive Lead"}
        </button>
      )}
      {error && <p role="alert" className="w-full rounded-lg border border-red-400/20 bg-red-400/[0.06] p-2 text-[11px] text-red-200">{error}</p>}
    </div>
  );
}
