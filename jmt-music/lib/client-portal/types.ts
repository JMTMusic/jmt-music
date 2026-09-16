export type PortalFileType = "audio" | "stems" | "artwork" | "document" | "other";
export type PortalApprovalStatus = "approved" | "changes_requested";
export type PortalStageName = "production" | "mixing" | "mastering" | "delivery";
export type PortalStageStatus = "not_started" | "in_progress" | "ready" | "complete";
export type PortalStage = { stage: PortalStageName; status: PortalStageStatus; progressPct: number; clientNote: string | null; updatedAt: string | null };

export type PortalComment = {
  id: string;
  authorName: string;
  authorType: "client" | "staff";
  body: string;
  timestampSeconds: number | null;
  createdAt: string;
};

/** A song: its own metadata plus the one Supabase-hosted preview copy used for playback. */
export type PortalSong = {
  id: string;
  title: string;
  versionLabel: string | null;
  bpm: string | null;
  musicalKey: string | null;
  createdAt: string;
  /** Object path in the private portal-audio bucket, if a preview copy was uploaded. Staff-facing only. */
  previewAudioPath: string | null;
  /** Short-lived signed URL for previewAudioPath, resolved per-request. Null until a preview copy exists. */
  previewAudioUrl: string | null;
  comments: PortalComment[];
  approval: { status: PortalApprovalStatus; clientName: string; note: string | null; updatedAt: string } | null;
};

/** A downloadable attachment (WAV master, stems, artwork, session notes). Attached to a song via songId, or null for a project-level file not tied to one song. */
export type PortalFile = {
  id: string;
  songId: string | null;
  title: string;
  fileType: PortalFileType;
  versionLabel: string | null;
  driveUrl: string;
  note: string | null;
  createdAt: string;
};

export type ClientPortalView = {
  project: { id: string; title: string; type: string };
  client: { artistName: string; contactName: string | null };
  songs: PortalSong[];
  files: PortalFile[];
  stages: PortalStage[];
};
