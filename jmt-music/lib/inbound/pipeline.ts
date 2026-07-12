import { BEAT_INQUIRY_STATUSES, DISCOVERY_STATUSES, MESSAGE_STATUSES, type InboundKind, type InboundRecord } from "./types";

export const statusSets = { discoveries: DISCOVERY_STATUSES, messages: MESSAGE_STATUSES, "beat-inquiries": BEAT_INQUIRY_STATUSES } as const;
export function isAllowedStatus(kind: InboundKind, status: string) { return (statusSets[kind] as readonly string[]).includes(status); }
export function projectTypeForInbound(kind: InboundKind) { return kind === "beat-inquiries" ? "beat" : kind === "discoveries" ? "client_work" : null; }
export function nextActionForInbound(kind: InboundKind) { return kind === "discoveries" ? "Prepare and send Project Setup invitation" : kind === "beat-inquiries" ? "Discuss license and next steps" : null; }
export function canConvertInbound(kind: InboundKind, record: Pick<InboundRecord,"project_id">) { return kind !== "messages" && !record.project_id; }
export function countNew(records: Pick<InboundRecord,"status">[]) { return records.filter((record) => record.status === "new").length; }

export function sanitizeDiscoveryDraft(value: unknown, empty: Record<string,string>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...empty };
  const input=value as Record<string,unknown>; const output={...empty};
  for(const key of Object.keys(empty)) if(typeof input[key]==="string") output[key]=input[key];
  return output;
}
export function thankYouFirstName(value: unknown) { return typeof value === "string" ? value.trim().split(/\s+/)[0] || "" : ""; }
