"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Dot, LoaderCircle, StickyNote, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteCommunication } from "@/app/control-center/growth/communications/actions";
import { AdminCard, EmptyState } from "@/components/control-center/ui";
import { DIRECTION_LABELS, DIRECTION_META } from "@/lib/control-center/communication-display";
import type { Communication, SiteId } from "@/lib/control-center/types";

const DIRECTION_ICONS = { inbound: ArrowDownLeft, outbound: ArrowUpRight, internal: StickyNote } as const;

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

type CommunicationTimelineProps = {
  messages: Communication[];
  propertyId: SiteId;
  canDelete: boolean;
  showClientColumn?: boolean;
  clientLabels?: Record<string, string>;
};

/**
 * Renders manual communication records: direction, type, platform, date/time, subject,
 * source, and related project when present. Direction is distinguished by icon + label,
 * not color alone.
 */
export function CommunicationTimeline({ messages, propertyId, canDelete, showClientColumn = false, clientLabels }: CommunicationTimelineProps) {
  if (!messages.length) return <EmptyState title="No communications yet" message="Logged emails, calls, DMs, and notes will appear here in order." />;

  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <CommunicationRow
          key={message.id}
          message={message}
          propertyId={propertyId}
          canDelete={canDelete}
          clientLabel={showClientColumn ? clientLabels?.[message.clientId] : undefined}
        />
      ))}
    </div>
  );
}

function CommunicationRow({
  message,
  propertyId,
  canDelete,
  clientLabel
}: {
  message: Communication;
  propertyId: SiteId;
  canDelete: boolean;
  clientLabel?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();
  const Icon = DIRECTION_ICONS[message.direction];
  const meta = DIRECTION_META[message.direction];

  const remove = async () => {
    setPending(true);
    setError("");
    try {
      const result = await deleteCommunication({ property: propertyId, communicationId: message.id });
      if (result.status === "error") setError(result.message);
      else router.refresh();
    } catch {
      setError("The communication could not be deleted.");
    } finally {
      setPending(false);
      setConfirmOpen(false);
    }
  };

  return (
    <AdminCard className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border ${meta.className}`}><Icon className="h-4 w-4" /></span>
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-200">
              <span>{DIRECTION_LABELS[message.direction]}</span>
              <Dot className="h-3 w-3 text-slate-600" />
              <span>{message.type}</span>
              {message.platform && <><Dot className="h-3 w-3 text-slate-600" /><span className="text-slate-400">{message.platform}</span></>}
              {clientLabel && <><Dot className="h-3 w-3 text-slate-600" /><span className="text-sky-300">{clientLabel}</span></>}
            </div>
            {message.subject && <p className="mt-1 text-sm font-medium text-slate-100">{message.subject}</p>}
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-400">{message.body}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-600">
              <span>{formatDateTime(message.sentAt)}</span>
              <span>Source: {message.source}</span>
              {message.projectId && <span>Linked to a project</span>}
            </div>
          </div>
        </div>
        {canDelete && (
          <button type="button" onClick={() => setConfirmOpen(true)} disabled={pending} aria-label="Delete communication" className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>
        )}
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg border border-red-400/20 bg-red-400/[0.06] p-2 text-[11px] text-red-200">{error}</p>}
      {confirmOpen && (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-black/85 p-4 backdrop-blur-sm">
          <section role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-red-400/20 bg-[#0a0f16] p-6 shadow-2xl">
            <Trash2 className="h-6 w-6 text-red-300" />
            <h2 className="mt-5 font-sans text-xl font-semibold">Delete this communication?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">This removes it from the timeline permanently. This cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={pending} onClick={() => setConfirmOpen(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">Keep</button>
              <button type="button" disabled={pending} onClick={remove} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-red-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Deleting</> : <><Trash2 className="h-4 w-4" />Delete</>}</button>
            </div>
          </section>
        </div>
      )}
    </AdminCard>
  );
}
