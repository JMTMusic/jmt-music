"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, LoaderCircle, Music2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateContentStatusAction } from "@/app/control-center/content/actions";
import { AdminCard } from "@/components/control-center/ui";
import { getAllowedNextStatuses } from "@/lib/content/pipeline";
import type { ContentItemRecord, ContentPriority } from "@/lib/content/types";
import { PLATFORM_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/content/display";
import type { SiteId } from "@/lib/control-center/types";

const PRIORITY_TONE: Record<ContentPriority, string> = {
  low: "border-white/8 bg-white/[0.025] text-slate-400",
  normal: "border-sky-300/20 bg-sky-300/8 text-sky-200",
  high: "border-amber-300/25 bg-amber-300/10 text-amber-200",
  urgent: "border-red-400/25 bg-red-400/10 text-red-300"
};

type ContentItemCardProps = {
  item: ContentItemRecord;
  propertyId: SiteId;
  canEdit: boolean;
  siteQuery: string;
  beatTitleById: Record<string, string>;
  clientLabelById: Record<string, string>;
};

/** Kanban card with a "Move to..." select instead of drag-and-drop, matching LeadCard's pattern exactly. Stage movement calls updateContentStatusAction (Stage 2) — no status logic lives here. */
export function ContentItemCard({ item, propertyId, canEdit, siteQuery, beatTitleById, clientLabelById }: ContentItemCardProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const moveTo = async (status: string) => {
    if (status === item.status) return;
    setPending(true);
    setError("");
    try {
      const result = await updateContentStatusAction({ property: propertyId, id: item.id, status });
      if (result.status === "error") setError(result.message);
      else router.refresh();
    } catch {
      setError("The content item's status could not be updated.");
    } finally {
      setPending(false);
    }
  };

  const beatTitle = item.beatId ? beatTitleById[item.beatId] : null;
  const clientLabel = item.clientId ? clientLabelById[item.clientId] : null;
  const scheduledDate = item.scheduledAt
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(new Date(item.scheduledAt))
    : null;

  return (
    <AdminCard className="p-4">
      <Link href={`/control-center/content/pipeline/${item.id}${siteQuery}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 break-words text-sm font-semibold text-slate-100">{item.title}</p>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${PRIORITY_TONE[item.priority]}`}>{PRIORITY_LABELS[item.priority]}</span>
        </div>
        {item.platforms.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
            {item.platforms.map((platform) => <span key={platform} className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1">{PLATFORM_LABELS[platform]}</span>)}
          </div>
        )}
        {(beatTitle || clientLabel) && (
          <div className="mt-3 space-y-1.5 text-xs text-slate-400">
            {beatTitle && <p className="flex items-center gap-1.5"><Music2 className="h-3.5 w-3.5 text-slate-500" />{beatTitle}</p>}
            {clientLabel && <p className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5 text-slate-500" />{clientLabel}</p>}
          </div>
        )}
        {scheduledDate && (
          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-sky-200">
            <CalendarClock className="h-3.5 w-3.5" />
            {scheduledDate}
          </div>
        )}
      </Link>
      {canEdit && (
        <div className="mt-4 border-t border-white/6 pt-3">
          <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Move to
            <select
              value={item.status}
              disabled={pending}
              onChange={(event) => void moveTo(event.target.value)}
              className="min-h-9 flex-1 rounded-lg border border-white/10 bg-black/25 px-2 text-xs font-normal normal-case text-slate-200 outline-none focus:border-sky-300/60"
              aria-label={`Move ${item.title} to a different stage`}
            >
              <option value={item.status}>{STATUS_LABELS[item.status]}</option>
              {getAllowedNextStatuses(item.status).map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
            </select>
            {pending && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-sky-300" />}
          </label>
        </div>
      )}
      {error && <p role="alert" className="mt-2 rounded-lg border border-red-400/20 bg-red-400/[0.06] p-2 text-[11px] text-red-200">{error}</p>}
    </AdminCard>
  );
}
