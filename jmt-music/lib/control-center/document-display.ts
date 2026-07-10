import type { DocumentStatus, DocumentType } from "./types";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  proposal: "Proposal",
  production_agreement: "Production Agreement",
  mixing_agreement: "Mixing Agreement",
  mastering_agreement: "Mastering Agreement",
  beat_license: "Beat License",
  session_agreement: "Session Agreement",
  invoice: "Invoice",
  welcome_packet: "Welcome Packet",
  project_checklist: "Project Checklist"
};

export const DOCUMENT_TYPES: DocumentType[] = [
  "proposal",
  "production_agreement",
  "mixing_agreement",
  "mastering_agreement",
  "beat_license",
  "session_agreement",
  "invoice",
  "welcome_packet",
  "project_checklist"
];

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  signed: "Signed",
  paid: "Paid",
  void: "Void"
};

export const DOCUMENT_STATUSES: DocumentStatus[] = ["draft", "sent", "signed", "paid", "void"];
