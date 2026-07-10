import Link from "next/link";
import { ArrowLeft, Mail, Phone, Tag } from "lucide-react";
import { notFound } from "next/navigation";
import { AddLeadDialog } from "@/components/control-center/add-lead-dialog";
import { CommunicationTimeline } from "@/components/control-center/communication-timeline";
import { ConvertToProjectDialog } from "@/components/control-center/convert-to-project-dialog";
import { DocumentRecordRow } from "@/components/control-center/document-record-row";
import { LeadDetailActions } from "@/components/control-center/lead-detail-actions";
import { LogCommunicationDialog } from "@/components/control-center/log-communication-dialog";
import { AdminCard, PageHeader, SectionHeading } from "@/components/control-center/ui";
import { getControlCenterAccessStatus, getControlCenterRole } from "@/lib/control-center/access";
import { getPropertyClientMessages, getPropertyClients } from "@/lib/control-center/client-repository";
import { getPropertyDocuments } from "@/lib/control-center/document-repository";
import { getSiteConfig } from "@/lib/control-center/data";
import { STAGE_LABELS } from "@/lib/control-center/lead-display";
import { getDisplayName } from "@/lib/control-center/lead-pipeline";
import { getClientProjects } from "@/lib/control-center/project-repository";
import { PROJECT_TYPE_LABELS } from "@/lib/control-center/project-display";
import type { SitePageProps } from "@/lib/control-center/types";

type LeadDetailPageProps = SitePageProps & { params: Promise<{ leadId: string }> };

/** One lead's full record: editable identity, embedded Communication Timeline, linked Projects and Documents. */
export default async function LeadDetailPage({ searchParams, params }: LeadDetailPageProps) {
  const { site: requestedSite } = await searchParams;
  const { leadId } = await params;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;

  const [clientsResult, messagesResult, projectsResult, documentsResult, access, role] = await Promise.all([
    getPropertyClients(site),
    getPropertyClientMessages(site, { clientId: leadId }),
    getClientProjects(site, leadId),
    getPropertyDocuments(site, { clientId: leadId }),
    getControlCenterAccessStatus(),
    getControlCenterRole()
  ]);

  const lead = clientsResult.clients.find((client) => client.id === leadId);
  if (!lead) notFound();

  const activeProjects = projectsResult.projects.filter((project) => project.phase !== "done");

  return (
    <>
      <Link href={`/control-center/growth/leads${siteQuery}`} className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Back to Lead Pipeline</Link>

      <PageHeader
        eyebrow={`${site.name} · ${STAGE_LABELS[lead.stage]}${lead.isArchived ? " · Archived" : ""}`}
        title={getDisplayName(lead)}
        description={lead.contactName ? `Contact for ${lead.artistName}` : "No separate contact on file — artist is the primary contact."}
        actions={
          <>
            <AddLeadDialog propertyId={site.id} lead={lead} disabled={!access.canCreate} trigger={<span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:border-sky-300/40 hover:bg-sky-300/10">Edit Lead</span>} />
            <ConvertToProjectDialog propertyId={site.id} leadId={lead.id} disabled={!access.canCreate} />
          </>
        }
      />

      <AdminCard className="mb-8 p-5">
        <LeadDetailActions lead={lead} propertyId={site.id} canEdit={access.canCreate} />
        <div className="mt-5 grid gap-3 border-t border-white/6 pt-5 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
          {lead.email && <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-500" />{lead.email}</span>}
          {lead.phone && <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-500" />{lead.phone}</span>}
          {lead.platform && <span>Source: {lead.platform}</span>}
          {lead.budget && <span>Budget: {lead.budget}</span>}
        </div>
        {lead.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/6 pt-4">
            <Tag className="h-3.5 w-3.5 text-slate-500" />
            {lead.tags.map((tag) => <span key={tag} className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[10px] text-slate-400">{tag}</span>)}
          </div>
        )}
        {lead.notes && <p className="mt-4 border-t border-white/6 pt-4 text-sm text-slate-300">{lead.notes}</p>}
      </AdminCard>

      {activeProjects.length > 0 && (
        <section className="mb-8">
          <SectionHeading title="Linked Projects" description="Active work already representing this relationship." />
          <div className="grid gap-3 sm:grid-cols-2">
            {activeProjects.map((project) => (
              <AdminCard key={project.id} className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300">{PROJECT_TYPE_LABELS[project.type]}</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{project.title}</p>
                <p className="mt-1 text-xs text-slate-500">{project.phase.replace("_", " ")}</p>
              </AdminCard>
            ))}
          </div>
        </section>
      )}

      {documentsResult.documents.length > 0 && (
        <section className="mb-8">
          <SectionHeading title="Linked Documents" description="Metadata records only — no files are generated or stored here." />
          <div className="grid gap-3 sm:grid-cols-2">
            {documentsResult.documents.map((document) => <DocumentRecordRow key={document.id} document={document} propertyId={site.id} canEdit={access.canCreate} clients={clientsResult.clients} />)}
          </div>
        </section>
      )}

      <section>
        <SectionHeading
          title="Communication Timeline"
          description="Every logged email, call, DM, and note for this relationship."
          action={<LogCommunicationDialog propertyId={site.id} clientId={lead.id} clientLabel={getDisplayName(lead)} disabled={!access.canCreate} />}
        />
        {messagesResult.status === "error" ? (
          <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75">{messagesResult.detail}</div>
        ) : (
          <CommunicationTimeline messages={messagesResult.messages} propertyId={site.id} canDelete={role === "owner"} />
        )}
      </section>
    </>
  );
}
