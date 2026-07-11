"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PlayCard } from "@/components/control-center/play-card";
import { EmptyState } from "@/components/control-center/ui";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/control-center/playbook-display";
import { groupPlaysByCategory, searchPlays } from "@/lib/control-center/playbook-pipeline";
import type { Play, SiteId } from "@/lib/control-center/types";

type NumberedPlay = Play & { playNumber: string };

/** Client-side search (Title, Category, Keywords, Message contents) over an already-fetched Playbook. */
export function PlaybookBrowser({ plays, propertyId, siteQuery }: { plays: NumberedPlay[]; propertyId: SiteId; siteQuery: string }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => searchPlays(plays, query, CATEGORY_LABELS), [plays, query]);
  const grouped = useMemo(() => groupPlaysByCategory(filtered), [filtered]);

  return (
    <div>
      <label className="relative mb-8 block max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, category, keywords, or message…"
          aria-label="Search the Communication Playbook"
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/25 pl-10 pr-3.5 text-sm text-white outline-none transition focus:border-sky-300/60"
        />
      </label>

      {filtered.length === 0 ? (
        <EmptyState title="No Plays match" message="Try a different search term, or clear the search to see the full Playbook." />
      ) : (
        <div className="space-y-10">
          {CATEGORY_ORDER.filter((category) => grouped.has(category)).map((category) => (
            <section key={category}>
              <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-slate-400">{CATEGORY_LABELS[category]}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {(grouped.get(category) || []).map((play) => <PlayCard key={play.id} play={play} propertyId={propertyId} siteQuery={siteQuery} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
