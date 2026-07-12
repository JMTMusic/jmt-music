export const PROJECT_SETUP_STATUSES = ["draft", "in_progress", "submitted", "confirmed"] as const;
export type ProjectSetupStatus = typeof PROJECT_SETUP_STATUSES[number];

export const COMPLETED_BY_VALUES = ["client", "jonathan"] as const;
export type CompletedBy = typeof COMPLETED_BY_VALUES[number];

/**
 * Full internal record — everything Control Center / staff code may see. Never return
 * this shape from a token-authenticated public function; use PublicProjectSetupView.
 */
export type ProjectSetupRecord = {
  id: string;
  propertyId: string;
  projectId: string;
  discoveryId: string | null;
  tokenCreatedAt: string | null;
  tokenVersion: number;
  accessRevokedAt: string | null;
  status: ProjectSetupStatus;
  responses: Record<string, unknown>;
  completedBy: CompletedBy | null;
  internalNotes: string | null;
  createdBy: string | null;
  sentAt: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  reopenedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Minimum shape the future private, token-authenticated experience may see. Deliberately
 * omits internalNotes, createdBy, discoveryId, tokenVersion, accessRevokedAt, and every
 * hash/token field — none of that is the artist's business. Also omits propertyId; the
 * public route never needs to know which property it's scoped to beyond what the token
 * already implies.
 */
export type PublicProjectSetupView = {
  id: string;
  status: ProjectSetupStatus;
  responses: Record<string, unknown>;
  completedBy: CompletedBy | null;
  startedAt: string | null;
  submittedAt: string | null;
  project: { id: string; title: string; type: string };
  client: { artistName: string; contactName: string | null };
};

export type CreateProjectSetupInput = {
  projectId: string;
  discoveryId?: string | null;
  createdBy?: string | null;
};

/**
 * Result of createProjectSetup. Only a fresh "created" result ever carries a raw token —
 * an existing Setup's raw token was never persisted anywhere and cannot be recovered.
 * Callers who need to (re)send a link for an existing Setup must call
 * reissueProjectSetupToken instead, which mints a new token and invalidates the old one.
 */
export type CreateProjectSetupResult =
  | { status: "created"; setup: ProjectSetupRecord; rawToken: string }
  | { status: "exists"; setup: ProjectSetupRecord }
  | { status: "error"; message: string };

export type ReissueTokenResult =
  | { status: "success"; setup: ProjectSetupRecord; rawToken: string }
  | { status: "error"; message: string };

export type ProjectSetupMutationResult =
  | { status: "success"; setup: ProjectSetupRecord }
  | { status: "error"; message: string };

/**
 * Return shape for every token-gated PUBLIC mutation (start/saveDraft/submit) — same
 * "never expose internal fields" rule as PublicProjectSetupView itself, applied
 * consistently to writes as well as reads.
 */
export type PublicProjectSetupResult =
  | { status: "success"; view: PublicProjectSetupView }
  | { status: "error"; message: string };

export type ProjectSetupLookupResult =
  | { status: "found"; setup: ProjectSetupRecord }
  | { status: "not_found" }
  | { status: "error"; message: string };

/**
 * Distinct from ProjectSetupLookupResult: a token can resolve to a real row that is no
 * longer valid for access (revoked, or replaced by a later reissue). Kept distinct from
 * "not_found" so a future caller can choose how much to reveal — this is an internal
 * data-layer distinction, not a public-facing error message.
 */
export type TokenLookupResult =
  | { status: "found"; view: PublicProjectSetupView }
  | { status: "not_found" }
  | { status: "revoked" }
  | { status: "error"; message: string };
