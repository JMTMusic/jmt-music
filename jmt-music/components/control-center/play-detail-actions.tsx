"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, Check, Copy, LoaderCircle, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { duplicatePlay, setPlayStatus, togglePlayFavorite } from "@/app/control-center/growth/playbook/actions";
import { AddPlayDialog } from "@/components/control-center/add-play-dialog";
import type { Play, SiteId } from "@/lib/control-center/types";

/**
 * The five Play detail actions: Copy Message, Duplicate, Archive, Favorite, Edit.
 * Copy copies ONLY message_body — never purpose, internal notes, metadata, or version.
 */
export function PlayDetailActions({ play, propertyId, canEdit }: { play: Play; propertyId: SiteId; canEdit: boolean }) {
  const [copied, setCopied] = useState(false);
  const [favorite, setFavorite] = useState(play.isFavorite);
  const [pending, setPending] = useState<"duplicate" | "archive" | "favorite" | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(play.messageBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  };

  const duplicate = async () => {
    setPending("duplicate");
    setError("");
    try {
      const result = await duplicatePlay({ property: propertyId, playId: play.id });
      if (result.status === "error") setError(result.message);
      else if (result.playId) router.push(`/control-center/growth/playbook/${result.playId}`);
    } catch {
      setError("The Play could not be duplicated.");
    } finally {
      setPending(null);
    }
  };

  const toggleArchive = async () => {
    setPending("archive");
    setError("");
    try {
      const nextStatus = play.status === "archived" ? "active" : "archived";
      const result = await setPlayStatus({ property: propertyId, playId: play.id, status: nextStatus });
      if (result.status === "error") setError(result.message);
      else router.refresh();
    } catch {
      setError("The Play could not be updated.");
    } finally {
      setPending(null);
    }
  };

  const toggleFavorite = async () => {
    setPending("favorite");
    setError("");
    const next = !favorite;
    setFavorite(next);
    try {
      const result = await togglePlayFavorite({ property: propertyId, playId: play.id, isFavorite: next });
      if (result.status === "error") {
        setError(result.message);
        setFavorite(!next);
      } else {
        router.refresh();
      }
    } catch {
      setError("The Play could not be updated.");
      setFavorite(!next);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-300 bg-sky-300 px-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-200">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy Message"}</button>
        {canEdit && <AddPlayDialog propertyId={propertyId} play={play} trigger={<span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:border-sky-300/40 hover:bg-sky-300/10">Edit</span>} />}
        {canEdit && (
          <button type="button" onClick={duplicate} disabled={pending !== null} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:border-sky-300/40 hover:bg-sky-300/10 disabled:opacity-50">
            {pending === "duplicate" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}Duplicate
          </button>
        )}
        {canEdit && (
          <button type="button" onClick={toggleFavorite} disabled={pending !== null} aria-pressed={favorite} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:border-amber-300/40 hover:bg-amber-300/10 disabled:opacity-50">
            <Star className={`h-4 w-4 ${favorite ? "fill-amber-300 text-amber-300" : ""}`} />{favorite ? "Favorited" : "Favorite"}
          </button>
        )}
        {canEdit && (
          <button type="button" onClick={toggleArchive} disabled={pending !== null} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:border-red-300/30 hover:text-red-200 disabled:opacity-50">
            {pending === "archive" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : play.status === "archived" ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            {play.status === "archived" ? "Restore" : "Archive"}
          </button>
        )}
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/[0.06] p-2 text-[11px] text-red-200">{error}</p>}
    </div>
  );
}
