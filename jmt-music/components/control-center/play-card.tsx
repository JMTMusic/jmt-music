"use client";

import { useState } from "react";
import { Check, Copy, Star } from "lucide-react";
import Link from "next/link";
import { togglePlayFavorite } from "@/app/control-center/growth/playbook/actions";
import { AdminCard } from "@/components/control-center/ui";
import { STATUS_LABELS } from "@/lib/control-center/playbook-display";
import type { Play, SiteId } from "@/lib/control-center/types";

/**
 * List-view card. Copy here (as on the detail page) copies ONLY message_body — never
 * purpose, internal notes, metadata, or version.
 */
export function PlayCard({ play, propertyId, siteQuery }: { play: Play & { playNumber: string }; propertyId: SiteId; siteQuery: string }) {
  const [copied, setCopied] = useState(false);
  const [favorite, setFavorite] = useState(play.isFavorite);
  const [favoritePending, setFavoritePending] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(play.messageBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail silently (permissions/insecure context) — no error UI needed for a quick-copy affordance.
    }
  };

  const toggleFavorite = async () => {
    setFavoritePending(true);
    const next = !favorite;
    setFavorite(next);
    try {
      const result = await togglePlayFavorite({ property: propertyId, playId: play.id, isFavorite: next });
      if (result.status === "error") setFavorite(!next);
    } catch {
      setFavorite(!next);
    } finally {
      setFavoritePending(false);
    }
  };

  return (
    <AdminCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300">{play.playNumber}{play.status !== "active" && ` · ${STATUS_LABELS[play.status]}`}</p>
          <Link href={`/control-center/growth/playbook/${play.id}${siteQuery}`} className="mt-1 block text-sm font-semibold text-slate-100 hover:text-sky-200">{play.title}</Link>
        </div>
        <button type="button" onClick={toggleFavorite} disabled={favoritePending} aria-label={favorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={favorite} className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:text-amber-300 disabled:opacity-50">
          <Star className={`h-4 w-4 ${favorite ? "fill-amber-300 text-amber-300" : ""}`} />
        </button>
      </div>
      {play.purpose && <p className="mt-2 text-xs text-slate-500">{play.purpose}</p>}
      {play.bestUsedFor.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">{play.bestUsedFor.map((context) => <span key={context} className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[10px] text-slate-500">{context}</span>)}</div>
      )}
      <pre className="mt-4 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/8 bg-black/25 p-3 font-mono text-[11px] leading-5 text-slate-300">{play.messageBody}</pre>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/6 pt-4">
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-slate-400 transition hover:bg-white/[0.05] hover:text-white">{copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy Message"}</button>
        <Link href={`/control-center/growth/playbook/${play.id}${siteQuery}`} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-slate-400 transition hover:bg-white/[0.05] hover:text-white">Open Play</Link>
      </div>
    </AdminCard>
  );
}
