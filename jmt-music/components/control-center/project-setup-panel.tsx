"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy, LoaderCircle, RefreshCw, ShieldOff, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  confirmProjectSetupAction,
  createProjectSetupAction,
  reissueProjectSetupLinkAction,
  reopenProjectSetupAction,
  revokeProjectSetupAccessAction
} from "@/app/control-center/projects/setup-actions";
import { ProjectSetupResponseReview } from "@/components/control-center/project-setup-response-review";
import { ACCESS_REVOKED_LABEL, NO_SETUP_LABEL, STATUS_LABELS } from "@/lib/project-setup/display";
import type { ProjectSetupRecord } from "@/lib/project-setup/types";
import type { SiteId } from "@/lib/control-center/types";

type ConfirmKind = "reissue" | "revoke" | "reopen" | "confirm";

const CONFIRM_COPY: Record<ConfirmKind, { title: string; body: string; confirmLabel: string }> = {
  reissue: {
    title: "Reissue Project Setup Link?",
    body: "This generates a brand new private link and immediately invalidates the current one — anyone still using the old link will no longer be able to access it. Only the newest link is ever valid.",
    confirmLabel: "Reissue Link"
  },
  revoke: {
    title: "Revoke Access?",
    body: "This immediately disables the artist's current link. It does not change the Setup's status or answers — reissue a new link later to restore access.",
    confirmLabel: "Revoke Access"
  },
  reopen: {
    title: "Reopen Project Setup?",
    body: "The artist regains the ability to edit their answers using their current valid link. If access has been revoked, reopening will not restore it — reissue a new link separately if the artist needs one.",
    confirmLabel: "Reopen Setup"
  },
  confirm: {
    title: "Confirm Project Setup?",
    body: "This marks the Setup as reviewed and approved by JMT Music. It does not trigger any contract, payment, or phase change on its own.",
    confirmLabel: "Confirm Setup"
  }
};

function formatTimestamp(value: string | null): string | null {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

function LifecycleRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/6 py-2.5 text-xs last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-300">{value}</span>
    </div>
  );
}

/**
 * Full Control Center control surface for one Project's Setup: create, one-time link
 * reveal, reissue/revoke, submitted response review, and reopen/confirm. Mirrors this
 * codebase's convention of a single client component owning a card's actions (see
 * play-detail-actions.tsx, lead-detail-actions.tsx) rather than one component per button.
 */
export function ProjectSetupPanel({
  propertyId,
  projectId,
  hasClient,
  canEdit,
  setup,
  schemaUnavailable
}: {
  propertyId: SiteId;
  projectId: string;
  hasClient: boolean;
  canEdit: boolean;
  setup: ProjectSetupRecord | null;
  schemaUnavailable: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);
  const router = useRouter();

  if (schemaUnavailable) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] p-4 text-xs text-amber-100/80">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <p>Project Setup is not available until the latest Supabase migration is applied.</p>
      </div>
    );
  }

  const runCreate = async () => {
    setPending(true);
    setError("");
    try {
      const result = await createProjectSetupAction({ property: propertyId, projectId });
      if (result.status === "error") setError(result.message);
      else if (result.status === "created") {
        setRevealedToken(result.rawToken);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch {
      setError("The Setup could not be created. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const runConfirmedAction = async (kind: ConfirmKind) => {
    setPending(true);
    setError("");
    try {
      if (kind === "reissue") {
        const result = await reissueProjectSetupLinkAction({ property: propertyId, projectId });
        if (result.status === "error") setError(result.message);
        else if (result.status === "reissued") {
          setRevealedToken(result.rawToken);
          setConfirmKind(null);
          router.refresh();
        }
        return;
      }

      const action = kind === "revoke" ? revokeProjectSetupAccessAction : kind === "reopen" ? reopenProjectSetupAction : confirmProjectSetupAction;
      const result = await action({ property: propertyId, projectId });
      if (result.status === "error") setError(result.message);
      else {
        setConfirmKind(null);
        router.refresh();
      }
    } catch {
      setError("That action could not be completed. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const copyLink = async (raw: string) => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/project-setup/${raw}` : `/project-setup/${raw}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard — you can select and copy the link manually.");
    }
  };

  // --- No Setup yet ---
  if (!setup) {
    return (
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{NO_SETUP_LABEL}</p>
        <p className="mt-2 text-sm text-slate-400">No Project Setup has been created for this Project yet.</p>
        {!hasClient ? (
          <p className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] p-3 text-xs text-amber-100/80">Link a Client to this Project before creating Project Setup.</p>
        ) : (
          canEdit && (
            <button type="button" onClick={runCreate} disabled={pending} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-300 bg-sky-300 px-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-200 disabled:opacity-60">
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Create Project Setup
            </button>
          )
        )}
        {revealedToken && <RevealedLinkCallout rawToken={revealedToken} copied={copied} onCopy={copyLink} onDismiss={() => setRevealedToken(null)} />}
        {error && <p role="alert" className="mt-4 rounded-lg border border-red-400/20 bg-red-400/[0.06] p-2 text-[11px] text-red-200">{error}</p>}
      </div>
    );
  }

  const revoked = Boolean(setup.accessRevokedAt);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300">{STATUS_LABELS[setup.status]}</p>
        {revoked && (
          <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-300">
            <ShieldOff className="h-3 w-3" />
            {ACCESS_REVOKED_LABEL}
          </p>
        )}
      </div>

      {canEdit && (
        <div className="mt-4 flex flex-wrap gap-2">
          {(setup.status === "draft" || setup.status === "in_progress") && (
            <button type="button" onClick={() => setConfirmKind("reissue")} disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:border-sky-300/40 hover:bg-sky-300/10 disabled:opacity-50"><RefreshCw className="h-4 w-4" />Reissue Link</button>
          )}
          {(setup.status === "draft" || setup.status === "in_progress") && !revoked && (
            <button type="button" onClick={() => setConfirmKind("revoke")} disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:border-red-300/30 hover:text-red-200 disabled:opacity-50"><ShieldOff className="h-4 w-4" />Revoke Access</button>
          )}

          {setup.status === "submitted" && (
            <>
              <button type="button" onClick={() => setConfirmKind("confirm")} disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-300 bg-sky-300 px-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-200 disabled:opacity-60"><Check className="h-4 w-4" />Confirm Setup</button>
              <button type="button" onClick={() => setConfirmKind("reopen")} disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:border-sky-300/40 hover:bg-sky-300/10 disabled:opacity-50">Reopen Setup</button>
              <button type="button" onClick={() => setConfirmKind("reissue")} disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:border-sky-300/40 hover:bg-sky-300/10 disabled:opacity-50"><RefreshCw className="h-4 w-4" />Reissue Link</button>
              {!revoked && <button type="button" onClick={() => setConfirmKind("revoke")} disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:border-red-300/30 hover:text-red-200 disabled:opacity-50"><ShieldOff className="h-4 w-4" />Revoke Access</button>}
            </>
          )}

          {setup.status === "confirmed" && (
            <>
              <button type="button" onClick={() => setConfirmKind("reopen")} disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:border-sky-300/40 hover:bg-sky-300/10 disabled:opacity-50">Reopen Setup</button>
              <button type="button" onClick={() => setConfirmKind("reissue")} disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:border-sky-300/40 hover:bg-sky-300/10 disabled:opacity-50"><RefreshCw className="h-4 w-4" />Reissue Link</button>
              {!revoked && <button type="button" onClick={() => setConfirmKind("revoke")} disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:border-red-300/30 hover:text-red-200 disabled:opacity-50"><ShieldOff className="h-4 w-4" />Revoke Access</button>}
            </>
          )}
        </div>
      )}

      {revealedToken && <RevealedLinkCallout rawToken={revealedToken} copied={copied} onCopy={copyLink} onDismiss={() => setRevealedToken(null)} />}
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-400/20 bg-red-400/[0.06] p-2 text-[11px] text-red-200">{error}</p>}

      <div className="mt-5 border-t border-white/6 pt-4">
        <LifecycleRow label="Created" value={formatTimestamp(setup.createdAt)} />
        <LifecycleRow label="Sent" value={formatTimestamp(setup.sentAt)} />
        <LifecycleRow label="Started" value={formatTimestamp(setup.startedAt)} />
        <LifecycleRow label="Submitted" value={formatTimestamp(setup.submittedAt)} />
        <LifecycleRow label="Confirmed" value={formatTimestamp(setup.confirmedAt)} />
        <LifecycleRow label="Reopened" value={formatTimestamp(setup.reopenedAt)} />
        <LifecycleRow label="Access revoked" value={formatTimestamp(setup.accessRevokedAt)} />
        <LifecycleRow label="Token version" value={String(setup.tokenVersion)} />
        {setup.discoveryId && <LifecycleRow label="Discovery origin" value={setup.discoveryId} />}
      </div>

      {Object.keys(setup.responses || {}).length > 0 && (
        <div className="mt-5 border-t border-white/6 pt-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {setup.status === "draft" || setup.status === "in_progress" ? "Responses (in progress)" : "Responses"}
          </p>
          <ProjectSetupResponseReview responses={setup.responses} completedBy={setup.completedBy} />
        </div>
      )}

      {confirmKind && (
        <ConfirmDialog
          kind={confirmKind}
          pending={pending}
          onCancel={() => setConfirmKind(null)}
          onConfirm={() => runConfirmedAction(confirmKind)}
        />
      )}
    </div>
  );
}

function RevealedLinkCallout({
  rawToken,
  copied,
  onCopy,
  onDismiss
}: {
  rawToken: string;
  copied: boolean;
  onCopy: (raw: string) => void;
  onDismiss: () => void;
}) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/project-setup/${rawToken}` : `/project-setup/${rawToken}`;
  return (
    <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4">
      <p className="text-sm font-semibold text-emerald-100">Private Setup link — shown once</p>
      <p className="mt-1 text-xs text-emerald-100/70">Copy this now. It won&apos;t be shown again — if it&apos;s lost, reissue a new one (which invalidates this link).</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-200">{url}</code>
        <button type="button" onClick={() => onCopy(rawToken)} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-300/40 bg-emerald-300/10 px-3 text-xs font-semibold text-emerald-100 hover:bg-emerald-300/20">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy Link"}
        </button>
      </div>
      <button type="button" onClick={onDismiss} className="mt-3 text-xs font-semibold text-emerald-100/60 hover:text-emerald-100">Done</button>
    </div>
  );
}

function ConfirmDialog({
  kind,
  pending,
  onCancel,
  onConfirm
}: {
  kind: ConfirmKind;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy = CONFIRM_COPY[kind];
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" role="presentation">
      <section role="dialog" aria-modal="true" className="my-8 w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0f16] shadow-2xl">
        <header className="flex items-start justify-between border-b border-white/8 p-6">
          <h2 className="font-sans text-xl font-semibold">{copy.title}</h2>
          <button type="button" onClick={onCancel} disabled={pending} aria-label="Close" className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
        </header>
        <div className="p-6">
          <p className="text-sm leading-6 text-slate-400">{copy.body}</p>
        </div>
        <footer className="flex justify-end gap-3 border-t border-white/8 p-6">
          <button type="button" disabled={pending} onClick={onCancel} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button>
          <button type="button" disabled={pending} onClick={onConfirm} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {copy.confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}
