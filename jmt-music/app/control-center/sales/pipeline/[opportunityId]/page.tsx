import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Mail } from "lucide-react";
import { ConvertOpportunityDialog } from "@/components/control-center/convert-opportunity-dialog";
import { SalesOpportunityDetailActions } from "@/components/control-center/sales-opportunity-detail-actions";
import { AdminCard, PageHeader, SectionHeading } from "@/components/control-center/ui";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { getPropertyClients } from "@/lib/control-center/client-repository";
import { getDisplayName } from "@/lib/control-center/lead-pipeline";
import { getSalesOpportunityById } from "@/lib/sales/repository";
import { PLATFORM_LABELS, SERVICE_TYPE_LABELS, STATUS_LABELS, friendlySalesMessage } from "@/lib/sales/display";
import type { SitePageProps } from "@/lib/control-center/types";

type OpportunityDetailPageProps = SitePageProps & { params: Promise<{ opportunityId: string }> };

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value));
}

function daysAgo(value: string): number {
  return Math.floor((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24));
}

/** One Sales Opportunity's full record: artist/opportunity details, proposal contents, sample info, dates, notes, status/probability controls, and Convert to Project. */
export default async function SalesOpportunityDetailPage({ searchParams, params }: OpportunityDetailPageProps) {
  const { site: requestedSite } = await searchParams;
  const { opportunityId } = await params;
  const site = getSiteConfig(requestedSite);
  const siteQuery = site.id === "jmt-music" ? "" : `?site=${site.id}`;

  const [lookup, clientsResult, access] = await Promise.all([
    getSalesOpportunityById(site, opportunityId),
    getPropertyClients(site),
    getControlCenterAccessStatus()
  ]);

  if (lookup.status === "not_found") notFound();
  if (lookup.status === "error") {
    return (
      <>
        <Link href={`/control-center/sales/pipeline${siteQuery}`} className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Back to Sales Pipeline</Link>
        <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">Sales unavailable:</strong>{friendlySalesMessage(lookup.message)}</div>
      </>
    );
  }
  const opportunity = lookup.opportunity;
  const relatedClient = opportunity.clientId ? clientsResult.clients.find((client) => client.id === opportunity.clientId) : null;

  const activity = [
    { label: "Created", detail: `${formatDate(opportunity.createdAt)} (${daysAgo(opportunity.createdAt)}d ago)` },
    opportunity.proposalSentAt && { label: "Proposal sent", detail: `${formatDate(opportunity.proposalSentAt)} (${daysAgo(opportunity.proposalSentAt)}d ago)` },
    opportunity.followUpAt && { label: "Follow-up", detail: formatDate(opportunity.followUpAt) },
    opportunity.deadline && { label: "Deadline", detail: formatDate(opportunity.deadline) },
    { label: "Last updated", detail: `${daysAgo(opportunity.updatedAt)}d ago` }
  ].filter(Boolean) as { label: string; detail: string }[];

  return (
    <>
      <Link href={`/control-center/sales/pipeline${siteQuery}`} className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Back to Sales Pipeline</Link>

      <PageHeader
        eyebrow={`${site.name} · ${STATUS_LABELS[opportunity.status]}`}
        title={opportunity.title}
        description={`${opportunity.artistName} · ${PLATFORM_LABELS[opportunity.platform]} · ${SERVICE_TYPE_LABELS[opportunity.serviceType]}`}
        actions={
          opportunity.convertedProjectId ? (
            <Link href={`/control-center/projects/${opportunity.convertedProjectId}${siteQuery}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:border-sky-300/40 hover:bg-sky-300/10">View Project<ArrowUpRight className="h-4 w-4" /></Link>
          ) : (
            <div className="flex flex-col items-end gap-1.5">
              <ConvertOpportunityDialog propertyId={site.id} opportunityId={opportunity.id} opportunityDeadline={opportunity.deadline} opportunityClientId={opportunity.clientId} clients={clientsResult.clients} disabled={!access.canCreate || opportunity.status !== "won"} />
              {opportunity.status !== "won" && <p className="text-[11px] text-slate-500">Move this opportunity to Won before converting.</p>}
            </div>
          )
        }
      />

      <AdminCard className="mb-8 p-5">
        <SalesOpportunityDetailActions opportunity={opportunity} propertyId={site.id} canEdit={access.canCreate} />
        <div className="mt-5 grid gap-3 border-t border-white/6 pt-5 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
          {opportunity.artistEmail && <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-500" />{opportunity.artistEmail}</span>}
          {relatedClient && <Link href={`/control-center/growth/leads/${relatedClient.id}${siteQuery}`} className="text-sky-300 hover:underline">Related client: {getDisplayName(relatedClient)}</Link>}
          {opportunity.genre && <span>Genre: {opportunity.genre}</span>}
          {opportunity.budgetAmount !== null && <span>Budget: {opportunity.currency} {opportunity.budgetAmount}</span>}
          {opportunity.turnaroundDays !== null && <span>Turnaround: {opportunity.turnaroundDays}d</span>}
          {opportunity.revisionCount !== null && <span>Revisions: {opportunity.revisionCount}</span>}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/6 pt-4">
          {activity.map((item) => <span key={item.label} className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[10px] text-slate-400">{item.label}: {item.detail}</span>)}
        </div>
      </AdminCard>

      {(opportunity.sourceUrl || opportunity.musicUrl) && (
        <section className="mb-8">
          <SectionHeading title="Links" />
          <div className="flex flex-wrap gap-3">
            {opportunity.sourceUrl && <a href={opportunity.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-semibold text-slate-200 hover:border-sky-300/40">Source listing<ArrowUpRight className="h-3.5 w-3.5" /></a>}
            {opportunity.musicUrl && <a href={opportunity.musicUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-semibold text-slate-200 hover:border-sky-300/40">Music reference<ArrowUpRight className="h-3.5 w-3.5" /></a>}
          </div>
        </section>
      )}

      {(opportunity.sampleTitle || opportunity.sampleDescription || opportunity.sampleUrl) && (
        <section className="mb-8">
          <SectionHeading title="Sample Sent" description="The work sample shared as part of the proposal." />
          <AdminCard className="p-5">
            {opportunity.sampleTitle && <p className="text-sm font-semibold text-slate-100">{opportunity.sampleTitle}</p>}
            {opportunity.sampleDescription && <p className="mt-2 text-sm leading-6 text-slate-400">{opportunity.sampleDescription}</p>}
            {opportunity.sampleUrl && <a href={opportunity.sampleUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-300">Listen<ArrowUpRight className="h-3.5 w-3.5" /></a>}
          </AdminCard>
        </section>
      )}

      {opportunity.buyerInstructions && (
        <section className="mb-8">
          <SectionHeading title="Buyer Instructions" />
          <AdminCard className="p-5"><p className="whitespace-pre-line text-sm leading-6 text-slate-300">{opportunity.buyerInstructions}</p></AdminCard>
        </section>
      )}

      {opportunity.proposalText && (
        <section className="mb-8">
          <SectionHeading title="Proposal Sent" />
          <AdminCard className="p-5"><p className="whitespace-pre-line text-sm leading-6 text-slate-300">{opportunity.proposalText}</p></AdminCard>
        </section>
      )}

      {opportunity.notes && (
        <section className="mb-8">
          <SectionHeading title="Notes" />
          <AdminCard className="p-5"><p className="whitespace-pre-line text-sm leading-6 text-slate-300">{opportunity.notes}</p></AdminCard>
        </section>
      )}
    </>
  );
}
