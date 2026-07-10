import { ExternalLink } from "lucide-react";
import { AddDocumentDialog } from "@/components/control-center/add-document-dialog";
import { AdminCard } from "@/components/control-center/ui";
import { DOCUMENT_STATUS_LABELS, DOCUMENT_TYPE_LABELS } from "@/lib/control-center/document-display";
import type { Client, DocumentRecord, SiteId } from "@/lib/control-center/types";

const STATUS_CLASS: Record<DocumentRecord["status"], string> = {
  draft: "bg-white/[0.05] text-slate-400",
  sent: "bg-sky-300/10 text-sky-200",
  signed: "bg-emerald-300/10 text-emerald-200",
  paid: "bg-emerald-300/10 text-emerald-200",
  void: "bg-red-400/10 text-red-300"
};

export function DocumentRecordRow({ document, propertyId, canEdit, clients }: { document: DocumentRecord; propertyId: SiteId; canEdit: boolean; clients: Client[] }) {
  const content = (
    <AdminCard className="p-4 transition hover:border-sky-300/25">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300">{DOCUMENT_TYPE_LABELS[document.type]}</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{document.title}</p>
          {document.notes && <p className="mt-1 text-xs text-slate-500">{document.notes}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_CLASS[document.status]}`}>{DOCUMENT_STATUS_LABELS[document.status]}</span>
      </div>
      {document.externalUrl && (
        <a href={document.externalUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-300 hover:underline">
          <ExternalLink className="h-3.5 w-3.5" />View linked file
        </a>
      )}
      <p className="mt-3 border-t border-white/6 pt-3 text-[10px] text-slate-600">Manually recorded, not externally verified.</p>
    </AdminCard>
  );

  return canEdit ? <AddDocumentDialog propertyId={propertyId} document={document} clients={clients} trigger={content} /> : content;
}
