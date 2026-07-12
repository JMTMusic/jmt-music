/**
 * Pure helper functions extracted out of setup-flow.tsx specifically so they're
 * unit-testable without a DOM/jsdom — this codebase's Vitest setup is deliberately
 * scoped to pure business logic (see vitest.config.ts), not component rendering, and
 * these are exactly the pieces of that client component with real branching logic worth
 * covering directly.
 */
import { emptySetupAnswers, questionByKey, SETUP_QUESTIONS } from "@/lib/project-setup/config";
import type { ProjectSetupStatus } from "@/lib/project-setup/types";

export type SetupAnswers = Record<string, string | string[]>;

export type SetupClientLike = { artistName: string; contactName: string | null };

/** "Welcome, [First Name]." — falls back to null (rendered as plain "Welcome.") if no name is on file at all. */
export function firstNameFrom(client: SetupClientLike): string | null {
  const source = client.contactName || client.artistName || "";
  const first = source.trim().split(/\s+/)[0];
  return first || null;
}

/**
 * Merges whatever responses already exist in Supabase into a full, typed working copy.
 * Every known Setup question always gets a defined starting value (empty string or empty
 * array) even if it was never answered. Validation is config-driven, not hardcoded to any
 * one question: for a key that matches a real question (questionByKey), the stored value
 * is checked against THAT question's own type — a multi_select question always resolves
 * to an array of strings (falling back to []), and every other question type (text,
 * textarea, single_select, date, ...) always resolves to a string (falling back to "").
 * This matters because a value's own JS shape isn't enough to tell you what it should be:
 * a stray string stored under a multi_select key, or a stray array under a single_select/
 * text key, must fall back to that question's typed default rather than silently
 * flowing through as the wrong shape (which is exactly what let e.g. a malformed
 * `deliverables: "not-an-array"` render as a raw string instead of an empty selection).
 * A key with no matching question at all (a future/unrecognized key) is preserved only
 * when it already happens to be a plain string or a string array — anything else is
 * dropped rather than introducing a shape the rest of this flow can't render or resave.
 * None of this ever crashes the flow, and it's what lets a returning artist's answers
 * resume correctly after closing and reopening their private link.
 */
export function hydrateAnswers(responses: Record<string, unknown> | null | undefined): SetupAnswers {
  const answers = emptySetupAnswers();
  for (const [key, value] of Object.entries(responses || {})) {
    const question = questionByKey(key);

    if (question) {
      if (question.type === "multi_select") {
        answers[key] = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
      } else {
        answers[key] = typeof value === "string" ? value : "";
      }
      continue;
    }

    if (Array.isArray(value)) {
      const strings = value.filter((item): item is string => typeof item === "string");
      if (strings.length === value.length) answers[key] = strings;
    } else if (typeof value === "string") {
      answers[key] = value;
    }
  }
  return answers;
}

export const REVIEW_STEP = 2 + SETUP_QUESTIONS.length;

/** Which question-screen step a given response key (top-level or follow-up) belongs to, for the review screen's per-section "Edit" links. */
export function stepForQuestionKey(key: string): number {
  const index = SETUP_QUESTIONS.findIndex((question) => question.key === key || question.followUp?.key === key);
  return index === -1 ? 2 : index + 2;
}

export function hasValue(value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value && value.trim());
}

export type SetupRenderMode = "locked_submitted" | "locked_confirmed" | "interactive";

/**
 * A submitted or confirmed Setup is read-only, full stop — this is the single choke point
 * that guarantees there is no code path where SetupFlow renders editable screens for
 * either of those two statuses. A reopened Setup (status flips back to "in_progress" by
 * lib/project-setup/repository.ts's reopenProjectSetup) naturally falls through to
 * "interactive" here with no special case needed.
 */
export function renderModeForStatus(status: ProjectSetupStatus): SetupRenderMode {
  if (status === "submitted") return "locked_submitted";
  if (status === "confirmed") return "locked_confirmed";
  return "interactive";
}
