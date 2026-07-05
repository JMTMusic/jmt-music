import { CalendarDays, CircleDollarSign, Mail, Plus, UserRound } from "lucide-react";
import { ActionButton, AdminCard, PageHeader } from "@/components/control-center/ui";
import { clients } from "@/lib/control-center/data";
import type { Client } from "@/lib/control-center/types";

const stages: Client["stage"][] = ["New", "Contacted", "In Progress", "Completed"];

/** Phase 1 CRM board for visualizing the client pipeline. */
export default function ClientsPage() {
  return <><PageHeader eyebrow="Relationships" title="Clients" description="A clear pipeline from first inquiry through completed work. Messaging and stage changes arrive in Phase 2." actions={<ActionButton primary><Plus className="h-4 w-4" /> Add Client</ActionButton>} /><div className="grid items-start gap-4 xl:grid-cols-4">{stages.map((stage) => { const stageClients = clients.filter((client) => client.stage === stage); return <section key={stage} className="rounded-2xl bg-white/[0.018] p-3"><div className="mb-3 flex items-center justify-between px-2 py-1"><h2 className="font-sans text-sm font-semibold">{stage}</h2><span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/5 px-1.5 text-[10px] text-slate-500">{stageClients.length}</span></div><div className="space-y-3">{stageClients.map((client) => <AdminCard key={client.id} className="p-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-sky-300/8 text-sky-300"><UserRound className="h-4 w-4" /></span><div><p className="text-sm font-semibold">{client.name}</p><p className="text-[10px] text-slate-500">{client.email}</p></div></div><p className="mt-5 text-sm text-slate-300">{client.project}</p><div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3 text-[10px] text-slate-500"><span className="flex items-center gap-1.5"><CircleDollarSign className="h-3.5 w-3.5" />{client.budget}</span><span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{client.date}</span></div></AdminCard>)}</div></section>; })}</div></>;
}
