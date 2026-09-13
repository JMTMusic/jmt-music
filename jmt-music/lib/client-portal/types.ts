export type PortalFileType = "audio" | "stems" | "artwork" | "document" | "other";
export type PortalApprovalStatus = "approved" | "changes_requested";

export type PortalComment = {
  id: string;
  authorName: string;
  authorType: "client" | "staff";
  body: string;
  timestampSeconds: number | null;
  createdAt: string;
};

export type PortalFile = {
  id: string;
  title: string;
  fileType: PortalFileType;
  versionLabel: string | null;
  driveUrl: string;
  note: string | null;
  createdAt: string;
  comments: PortalComment[];
  approval: { status: PortalApprovalStatus; clientName: string; note: string | null; updatedAt: string } | null;
};

export type ClientPortalView = {
  project: { id: string; title: string; type: string };
  client: { artistName: string; contactName: string | null };
  files: PortalFile[];
};
