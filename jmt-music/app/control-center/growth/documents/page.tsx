import { AddDocumentDialog } from "@/components/control-center/add-document-dialog";
import { DocumentRecordRow } from "@/components/control-center/document-record-row";
import { EmptyState, PageHeader } from "@/components/control-center/ui";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getPropertyClients } from "@/lib/control-center/client-repository";
import { getPropertyDocuments } from "@/lib/control-center/document-repository";
import { getSiteConfig } from "@/lib/control-center/data";
import type { SitePageProps } from "@/lib/control-center/types";

/**
 * Document Center: metadata and external links only. No generation, no PDF export, no
 * e-signature. A status of Signed or Paid is a manual note, never system-verified — and
 * nothing here should be read as legally approved contract language.
 */
export default async function DocumentCenterPage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  const [result, clientsResult, access] = await Promise.all([
    getPropertyDocuments(site),
    getPropertyClients(site),
    getControlCenterAccessStatus()
  ]);

  return (
    <>
      <PageHeader
        eyebrow={`${site.name} · Growth Engine`}
        title="Document Center"
        description="Metadata and external links only. Proposals, agreements, licenses, and invoices are tracked here — never generated, stored, or signed by this system."
        actions={<AddDocumentDialog propertyId={site.id} clients={clientsResult.clients} disabled={!access.canCreate} />}
      />
      {result.status === "error" && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">Document records unavailable:</strong>{result.detail}</div>
      )}
      {result.status === "empty" ? (
        <EmptyState title="No document records yet" message="Add a record to track a proposal, agreement, license, or invoice — with a link to wherever the real file lives." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {result.documents.map((document) => <DocumentRecordRow key={document.id} document={document} propertyId={site.id} canEdit={access.canCreate} clients={clientsResult.clients} />)}
        </div>
      )}
    </>
  );
}
