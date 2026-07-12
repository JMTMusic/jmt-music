"use server";

/**
 * Public, token-authenticated server actions for the artist-facing Project Setup flow.
 * There is no role check here by design — the raw token IS the entire authorization,
 * exactly like every other public function in lib/project-setup/repository.ts. These are
 * thin wrappers: all real validation (token plausibility, revocation, status transitions,
 * response shape/size limits) already lives in the data layer and is not duplicated here.
 *
 * completedBy is deliberately never accepted as a parameter from the client — this route
 * only ever represents the artist, so it's hardcoded to "client" rather than trusting
 * anything the browser sends. "jonathan" as a completedBy value is reserved for a
 * possible future internal completion path and can never be reached from here.
 */

import { getProjectSetupByRawToken, saveProjectSetupDraft, startProjectSetup, submitProjectSetup } from "@/lib/project-setup/repository";
import type { PublicProjectSetupResult, TokenLookupResult } from "@/lib/project-setup/types";

/** Loads the current public view for a token without changing anything — used for the initial page render. */
export async function loadProjectSetupAction(rawToken: string): Promise<TokenLookupResult> {
  try {
    return await getProjectSetupByRawToken(rawToken);
  } catch {
    return { status: "error", message: "This Project Setup is temporarily unavailable." };
  }
}

/** Transitions draft -> in_progress and stamps started_at exactly once. Idempotent for an already in_progress Setup. */
export async function beginProjectSetupAction(rawToken: string): Promise<PublicProjectSetupResult> {
  try {
    return await startProjectSetup(rawToken);
  } catch {
    return { status: "error", message: "This Project Setup could not be started. Please try again." };
  }
}

/** Saves the artist's current answers. Writes only the `responses` column — nothing else can be changed through this action. */
export async function saveProjectSetupDraftAction(rawToken: string, responses: unknown): Promise<PublicProjectSetupResult> {
  try {
    return await saveProjectSetupDraft(rawToken, responses);
  } catch {
    return { status: "error", message: "Your progress could not be saved just now. Please try again." };
  }
}

/** Submits the Setup. completedBy is always "client" here — see the file-level note above. */
export async function submitProjectSetupAction(rawToken: string, responses: unknown): Promise<PublicProjectSetupResult> {
  try {
    const saved = await saveProjectSetupDraft(rawToken, responses);
    if (saved.status === "error") return saved;
    return await submitProjectSetup(rawToken, "client");
  } catch {
    return { status: "error", message: "I'm sorry—your Project Setup could not be sent just yet. Everything you entered is still here. Please try again in a moment." };
  }
}
