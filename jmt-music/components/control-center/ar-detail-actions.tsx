"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateArArtistAction, updateArArtistStatusAction } from "@/app/control-center/ar/actions";
import { AR_PRIORITIES, SELECTABLE_AR_STATUSES } from "@/lib/ar/types";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/ar/display";
import type { ArArtistRecord } from "@/lib/ar/types";
import type { SiteId } from "@/lib/control-center/types";

/** Status and priority controls for the Artist Detail page. Status locks once converted — only Convert to Sales may set or unset that state. */
export function ArDetailActions({ artist, propertyId, canEdit }: { artist: ArArtistRecord; propertyId: SiteId; canEdit: boolean }) {
  const [pending, setPending] = useState<"status" | "priority" | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const isConverted = artist.status === "converted";

  const changeStatus = async (status: string) => {
    if (status === artist.status) return;
    setPending("status");
    setError("");
    try {
      const result = await updateArArtistStatusAction({ property: propertyId, id: artist.id, status });
      if (result.status === "error") setError(result.message);
      else router.refresh();
    } catch {
      setError("The status could not be updated.");
    } finally {
      setPending(null);
    }
  };

  const changePriority = async (priority: string) => {
    if (priority === artist.priority) return;
    setPending("priority");
    setError("");
    try {
      const result = await updateArArtistAction({ property: propertyId, id: artist.id, priority });
      if (result.status === "error") setError(result.message);
      else router.refresh();
    } catch {
      setError("The priority could not be updated.");
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
          <select value={isConverted ? "" : artist.status} disabled={!canEdit || pending !== null || isConverted} onChange={(event) => void changeStatus(event.target.value)} className={selectClass}>
            {isConverted && <option value="">{STATUS_LABELS.converted}</option>}
            {SELECTABLE_AR_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
          </select>
          {pending === "status" && <LoaderCircle className="h-4 w-4 animate-spin text-sky-300" />}
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          Priority
          <select value={artist.priority} disabled={!canEdit || pending !== null} onChange={(event) => void changePriority(event.target.value)} className={selectClass}>
            {AR_PRIORITIES.map((priority) => <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>)}
          </select>
          {pending === "priority" && <LoaderCircle className="h-4 w-4 animate-spin text-sky-300" />}
        </label>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-400/20 bg-red-400/[0.06] p-2 text-[11px] text-red-200">{error}</p>}
    </div>
  );
}
