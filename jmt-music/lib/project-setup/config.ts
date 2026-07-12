/**
 * Shared, pure question/section definitions for Project Setup — the single source of
 * truth for both the artist-facing flow (app/project-setup/[token]) and the Control
 * Center's internal response review (project-setup-response-review.tsx via
 * SETUP_LABEL_OVERRIDES + response-formatter.ts's labelOverrides parameter). Deliberately
 * kept dependency-free and framework-agnostic so it's trivial to unit test and reuse from
 * a server component, a client component, or a future Control Center page.
 *
 * This is Version 1: one shared flow for every Project type. Step 7 of the Stage 4 spec
 * asks the architecture to be *capable* of service-specific sections without building them
 * yet — see SERVICE_SPECIFIC_SECTIONS at the bottom for that Stage 5 extension point.
 */

export type SetupQuestionType = "single_select" | "multi_select" | "textarea" | "text";

export type SetupQuestion = {
  /** The key this question is stored under in `project_setups.responses`. */
  key: string;
  /** Human-readable label used both in the artist review screen and the Control Center review. */
  label: string;
  /** The artist-facing question heading. */
  prompt: string;
  /** Optional supporting copy shown under the prompt. */
  helperText?: string;
  type: SetupQuestionType;
  /** Optional questions may be left blank and are skippable without a value. */
  optional?: boolean;
  /** For single_select/multi_select — each option's label IS its stored value, so there is never a second, disconnected label to keep in sync. */
  options?: readonly string[];
  /** An optional secondary question shown on the same screen, directly under this one (e.g. "best time to reach you" under communication preference). Never a separate screen. */
  followUp?: SetupQuestion;
};

export type SetupSection = {
  id: string;
  /** Review-screen and Control Center grouping heading. */
  title: string;
  questionKeys: readonly string[];
};

export const communicationPreferenceQuestion: SetupQuestion = {
  key: "communication_preference",
  label: "Preferred Communication",
  prompt: "How would you prefer we communicate throughout this project?",
  type: "single_select",
  options: ["Email", "Phone", "Text", "Video call", "A mix of these"],
  followUp: {
    key: "communication_best_time",
    label: "Best Time to Reach You",
    prompt: "Is there a particular time of day that usually works best for you?",
    type: "text",
    optional: true
  }
};

export const timelineQuestion: SetupQuestion = {
  key: "timeline_notes",
  label: "Important Dates & Scheduling",
  prompt: "Are there any important dates or scheduling details I should know about?",
  helperText: "Release dates, recording sessions, travel, and other commitments are all helpful to know.",
  type: "textarea",
  optional: true
};

export const availabilityQuestion: SetupQuestion = {
  key: "availability",
  label: "Availability for Feedback",
  prompt: "How available will you be for feedback and revisions during the project?",
  type: "single_select",
  options: ["Usually within one day", "Within a few days", "Mostly on weekends", "My schedule varies", "Let's discuss it"]
};

export const creativeReferencesQuestion: SetupQuestion = {
  key: "creative_references",
  label: "Creative References",
  prompt: "Are there any songs, artists, or projects you'd like me to keep in mind?",
  helperText: "Links are welcome as plain text.",
  type: "textarea",
  optional: true
};

export const deliverablesQuestion: SetupQuestion = {
  key: "deliverables",
  label: "Expected Deliverables",
  prompt: "Which final versions do you expect to need?",
  helperText: "We'll confirm the final deliverables together before work begins.",
  type: "multi_select",
  options: ["Main version", "Instrumental", "Clean version", "Acapella", "Performance version", "Stems", "Social-media edit", "Not sure yet", "Other"]
};

export const finalNotesQuestion: SetupQuestion = {
  key: "final_notes",
  label: "Final Notes",
  prompt: "Is there anything else that would help me prepare for your project?",
  type: "textarea",
  optional: true
};

/** Every Version 1 question, in the exact order the artist answers them. */
export const SETUP_QUESTIONS: readonly SetupQuestion[] = [
  communicationPreferenceQuestion,
  timelineQuestion,
  availabilityQuestion,
  creativeReferencesQuestion,
  deliverablesQuestion,
  finalNotesQuestion
];

/** Review-screen (and future Control Center) grouping — mirrors Stage 4 Step 10 exactly. */
export const SETUP_SECTIONS: readonly SetupSection[] = [
  { id: "communication", title: "Communication", questionKeys: ["communication_preference", "communication_best_time"] },
  { id: "timeline-availability", title: "Timeline and Availability", questionKeys: ["timeline_notes", "availability"] },
  { id: "creative-references", title: "Creative References", questionKeys: ["creative_references"] },
  { id: "deliverables", title: "Deliverables", questionKeys: ["deliverables"] },
  { id: "additional-notes", title: "Additional Notes", questionKeys: ["final_notes"] }
];

/** Flattens every top-level question and its follow-up into a single lookup list. */
function allQuestions(): SetupQuestion[] {
  const flat: SetupQuestion[] = [];
  for (const question of SETUP_QUESTIONS) {
    flat.push(question);
    if (question.followUp) flat.push(question.followUp);
  }
  return flat;
}

export function questionByKey(key: string): SetupQuestion | undefined {
  return allQuestions().find((question) => question.key === key);
}

/**
 * The single place Setup question labels are defined. Passed as `labelOverrides` to
 * lib/project-setup/response-formatter.ts's formatResponseFields() so the Control Center
 * review renders the exact same labels the artist saw — no second, disconnected copy of
 * these strings anywhere. Any response key NOT in this map (future questions, or anything
 * unexpected) still falls back to the formatter's generic humanized-key behavior.
 */
export const SETUP_LABEL_OVERRIDES: Record<string, string> = Object.fromEntries(allQuestions().map((question) => [question.key, question.label]));

/** A blank slate for the client-side working copy of responses. */
export function emptySetupAnswers(): Record<string, string | string[]> {
  const answers: Record<string, string | string[]> = {};
  for (const question of allQuestions()) answers[question.key] = question.type === "multi_select" ? [] : "";
  return answers;
}

/**
 * Stage 5 extension point: per-Project-type additional sections (Production, Mixing,
 * Mastering, Beat, Session-specific questions). Left empty and unused in Stage 4 — the
 * artist experience must never show an empty/placeholder screen, so nothing here is
 * rendered until a future stage actually populates it. See supabase/README.md's Stage 4
 * section for the documented plan.
 */
export const SERVICE_SPECIFIC_SECTIONS: Record<string, readonly SetupSection[]> = {};
