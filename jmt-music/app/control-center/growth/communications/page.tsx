import { CommunicationTimeline } from "@/components/control-center/communication-timeline";
import { LogCommunicationDialog } from "@/components/control-center/log-communication-dialog";
import { PageHeader } from "@/components/control-center/ui";
import { getControlCenterAccessStatus, getControlCenterRole } from "@/lib/control-center/access";
import { getPropertyClientMessages, getPropertyClients } from "@/lib/control-center/client-repository";
import { getSiteConfig } from "@/lib/control-center/data";
import { getDisplayName } from "@/lib/control-center/lead-pipeline";
import type { SitePageProps } from "@/lib/control-center/types";

/** Property-wide Communication Timeline across every lead/client relationship. */
export default async function CommunicationsPage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  const [clientsResult, messagesResult, access, role] = await Promise.all([
    getPropertyClients(site),
    getPropertyClientMessages(site, { limit: 100 }),
    getControlCenterAccessStatus(),
    getControlCenterRole()
  ]);

  const clientLabels = Object.fromEntries(clientsResult.clients.map((client) => [client.id, getDisplayName(client)]));

  return (
    <>
      <PageHeader
        eyebrow={`${site.name} · Growth Engine`}
        title="Communications"
        description="Every logged email, DM, call, and note across every lead and client relationship, newest first."
        actions={<LogCommunicationDialog propertyId={site.id} clients={clientsResult.clients} disabled={!access.canCreate || !clientsResult.clients.length} />}
      />
      {messagesResult.status === "error" ? (
        <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">Communications unavailable:</strong>{messagesResult.detail}</div>
      ) : (
        <CommunicationTimeline messages={messagesResult.messages} propertyId={site.id} canDelete={role === "owner"} showClientColumn clientLabels={clientLabels} />
      )}
    </>
  );
}
