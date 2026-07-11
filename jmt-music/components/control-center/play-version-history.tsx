import { AdminCard } from "@/components/control-center/ui";
import type { PlayVersion } from "@/lib/control-center/types";

/** Read-only list of prior versions, newest first. No restore/diff feature in this build. */
export function PlayVersionHistory({ versions }: { versions: PlayVersion[] }) {
  if (!versions.length) return null;
  return (
    <div className="space-y-3">
      {versions.map((version) => (
        <AdminCard key={version.id} className="p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Version {version.versionNumber}</p>
            <p className="text-[11px] text-slate-500">{new Date(version.changedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</p>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-200">{version.title}</p>
          <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/8 bg-black/25 p-3 font-mono text-[11px] leading-5 text-slate-400">{version.messageBody}</pre>
        </AdminCard>
      ))}
    </div>
  );
}
