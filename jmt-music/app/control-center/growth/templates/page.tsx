import { AddTemplateDialog } from "@/components/control-center/add-template-dialog";
import { TemplateCard } from "@/components/control-center/template-card";
import { EmptyState, PageHeader } from "@/components/control-center/ui";
import { getControlCenterAccessStatus } from "@/lib/control-center/access";
import { getPropertyTemplates } from "@/lib/control-center/template-repository";
import { getSiteConfig } from "@/lib/control-center/data";
import type { SitePageProps } from "@/lib/control-center/types";

/**
 * Template Library: manually authored reusable text. No AI generation, no fabricated
 * starter content — an empty property shows a polished empty state, not fake templates.
 */
export default async function TemplateLibraryPage({ searchParams }: SitePageProps) {
  const { site: requestedSite } = await searchParams;
  const site = getSiteConfig(requestedSite);
  const [result, access] = await Promise.all([getPropertyTemplates(site), getControlCenterAccessStatus()]);

  const byCategory = new Map<string, typeof result.templates>();
  for (const template of result.templates) {
    const list = byCategory.get(template.category) || [];
    list.push(template);
    byCategory.set(template.category, list);
  }

  return (
    <>
      <PageHeader
        eyebrow={`${site.name} · Growth Engine`}
        title="Template Library"
        description="Reusable outreach, proposal, delivery, and follow-up text. Use {{variable}} as a placeholder convention — nothing here is auto-filled or AI-generated."
        actions={<AddTemplateDialog propertyId={site.id} disabled={!access.canCreate} />}
      />
      {result.status === "error" && (
        <div className="mb-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-4 py-3 text-xs text-amber-100/75"><strong className="mr-2 text-amber-200">Templates unavailable:</strong>{result.detail}</div>
      )}
      {result.status === "empty" ? (
        <EmptyState title="No templates yet" message="Add your first reusable outreach, proposal, or follow-up template — it'll be organized by category automatically." />
      ) : (
        <div className="space-y-10">
          {Array.from(byCategory.entries()).map(([category, templates]) => (
            <section key={category}>
              <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-slate-400">{category}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {templates.map((template) => <TemplateCard key={template.id} template={template} propertyId={site.id} canEdit={access.canCreate} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
