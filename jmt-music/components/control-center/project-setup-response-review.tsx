import { SETUP_LABEL_OVERRIDES } from "@/lib/project-setup/config";
import { formatResponseFields, type FormattedField } from "@/lib/project-setup/response-formatter";
import type { CompletedBy } from "@/lib/project-setup/types";

const COMPLETED_BY_LABELS: Record<CompletedBy, string> = {
  client: "Client",
  jonathan: "Jonathan"
};

function FieldRow({ field, depth }: { field: FormattedField; depth: number }) {
  if (field.kind === "section") {
    return (
      <div className={depth > 0 ? "mt-3 border-t border-white/6 pt-3" : ""}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300">{field.label}</p>
        <div className="mt-2 space-y-2">
          {field.fields.map((child) => (
            <FieldRow key={child.key} field={child} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <p className="min-w-40 shrink-0 text-xs font-semibold text-slate-400">{field.label}</p>
      <p className="text-sm text-slate-200">{field.value}</p>
    </div>
  );
}

/**
 * Renders one Project Setup's submitted `responses` as readable, grouped sections — no
 * raw JSON. Labels come from lib/project-setup/config.ts's SETUP_LABEL_OVERRIDES — the
 * same config the artist-facing flow (app/project-setup/[token]) defines its questions
 * from, so a label is only ever written once. Any response key that config doesn't know
 * about (future questions, or anything unexpected) still falls back to
 * response-formatter.ts's generic humanized-key behavior rather than being dropped.
 */
export function ProjectSetupResponseReview({
  responses,
  completedBy
}: {
  responses: Record<string, unknown>;
  completedBy: CompletedBy | null;
}) {
  const fields = formatResponseFields(responses, SETUP_LABEL_OVERRIDES);

  return (
    <div>
      {completedBy && <p className="mb-3 text-xs text-slate-500">Completed by: {COMPLETED_BY_LABELS[completedBy]}</p>}
      {fields.length === 0 ? (
        <p className="text-sm text-slate-500">No responses have been recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {fields.map((field) => (
            <FieldRow key={field.key} field={field} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}
