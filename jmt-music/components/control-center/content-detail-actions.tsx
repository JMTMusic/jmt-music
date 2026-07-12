"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { archiveContentItemAction, restoreContentItemAction, updateContentStatusAction } from "@/app/control-center/content/actions";
import { getAllowedNextStatuses } from "@/lib/content/pipeline";
import { STATUS_LABELS } from "@/lib/content/display";
import type { ContentItemRecord } from "@/lib/content/types";
import type { SiteId } from "@/lib/control-center/types";

/**
 * Pipeline status control for the Content Detail page. 'published' and 'archived' each
 * have exactly one allowed next status (lib/content/pipeline.ts), so those two states get
 * a dedicated, explicitly labeled button calling the Stage 2 wrapper actions built for
 * exactly this — archiveContentItemAction / restoreContentItemAction — rather than a
 * generic select with a single option. Every other status uses the same "Move to" select
 * pattern as ContentItemCard, calling updateContentStatusAction directly.
 */
export function ContentDetailActions({ item, propertyId, canEdit }: { item: ContentItemRecord; propertyId: SiteId; canEdit: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  if (!canEdit) return null;

  const moveTo = async (status: string) => {
    if (status === item.status) return;
    setPending(true);
    setError("");
    try {
      const result = await updateContentStatusAction({ property: propertyId, id: item.id, status });
      if (result.status === "error") setError(result.message);
      else router.refresh();
    } catch {
      setError("The status could not be updated.");
    } finally {
      setPending(false);
    }
  };

  const archive = async () => {
    setPending(true);
    setError("");
    try {
      const result = await archiveContentItemAction({ property: propertyId, id: item.id });
      if (result.status === "error") setError(result.message);
      else router.refresh();
    } catch {
      setError("The content item could not be archived.");
    } finally {
      setPending(false);
    }
  };

  const restore = async () => {
    setPending(true);
    setError("");
    try {
      const result = await restoreContentItemAction({ property: propertyId, id: item.id });
      if (result.status === "error") setError(result.message);
      else router.refresh();
    } catch {
      setError("The content item could not be restored.");
    } finally {
      setPending(false);
    }
  };

  if (item.status === "published") {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">Published content moves to Archived when it's retired.</p>
        <button type="button" disabled={pending} onClick={() => void archive()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:border-red-300/30 hover:text-red-200 disabled:opacity-50">
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
          Archive Content Item
        </button>
        {error && <p role="alert" className="w-full rounded-lg border border-red-400/20 bg-red-400/[0.06] p-2 text-[11px] text-red-200">{error}</p>}
      </div>
    );
  }

  if (item.status === "archived") {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">Restoring returns this item to Published — the only way out of Archived.</p>
        <button type="button" disabled={pending} onClick={() => void restore()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:border-sky-300/40 hover:text-sky-200 disabled:opacity-50">
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />}
          Restore to Published
        </button>
        {error && <p role="alert" className="w-full rounded-lg border border-red-400/20 bg-red-400/[0.06] p-2 text-[11px] text-red-200">{error}</p>}
      </div>
    );
  }

  const allowed = getAllowedNextStatuses(item.status);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
        Move to
        <select
          value={item.status}
          disabled={pending}
          onChange={(event) => void moveTo(event.target.value)}
          className="min-h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm font-normal text-slate-200 outline-none focus:border-sky-300/60"
        >
          <option value={item.status}>{STATUS_LABELS[item.status]}</option>
          {allowed.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
        </select>
        {pending && <LoaderCircle className="h-4 w-4 animate-spin text-sky-300" />}
      </label>
      {error && <p role="alert" className="w-full rounded-lg border border-red-400/20 bg-red-400/[0.06] p-2 text-[11px] text-red-200">{error}</p>}
    </div>
  );
}
