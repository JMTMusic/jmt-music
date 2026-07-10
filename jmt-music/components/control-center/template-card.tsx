"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, Check, Copy, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { archiveTemplate } from "@/app/control-center/growth/templates/actions";
import { AddTemplateDialog } from "@/components/control-center/add-template-dialog";
import { AdminCard } from "@/components/control-center/ui";
import type { SiteId, Template } from "@/lib/control-center/types";

export function TemplateCard({ template, propertyId, canEdit }: { template: Template; propertyId: SiteId; canEdit: boolean }) {
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(template.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  };

  const toggleArchive = async () => {
    setPending(true);
    setError("");
    try {
      const result = await archiveTemplate({ property: propertyId, templateId: template.id, isArchived: !template.isArchived });
      if (result.status === "error") setError(result.message);
      else router.refresh();
    } catch {
      setError("The template could not be updated.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AdminCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300">{template.category}</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{template.title}</p>
        </div>
      </div>
      {template.description && <p className="mt-2 text-xs text-slate-500">{template.description}</p>}
      <pre className="mt-4 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/8 bg-black/25 p-3 font-mono text-[11px] leading-5 text-slate-300">{template.content}</pre>
      {template.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">{template.tags.map((tag) => <span key={tag} className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[10px] text-slate-500">{tag}</span>)}</div>
      )}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/6 pt-4">
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-slate-400 transition hover:bg-white/[0.05] hover:text-white">{copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}</button>
        {canEdit && <AddTemplateDialog propertyId={propertyId} template={template} trigger={<span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-slate-400 transition hover:bg-white/[0.05] hover:text-white">Edit</span>} />}
        {canEdit && (
          <button type="button" onClick={toggleArchive} disabled={pending} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50">
            {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : template.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
            {template.isArchived ? "Restore" : "Archive"}
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg border border-red-400/20 bg-red-400/[0.06] p-2 text-[11px] text-red-200">{error}</p>}
    </AdminCard>
  );
}
