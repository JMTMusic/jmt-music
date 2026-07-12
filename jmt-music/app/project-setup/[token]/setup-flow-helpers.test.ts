import { describe, expect, it } from "vitest";
import { firstNameFrom, hasValue, hydrateAnswers, renderModeForStatus, REVIEW_STEP, stepForQuestionKey } from "./setup-flow-helpers";
import { SETUP_QUESTIONS } from "@/lib/project-setup/config";

describe("firstNameFrom", () => {
  it("prefers the contact name's first word", () => {
    expect(firstNameFrom({ artistName: "Some Artist", contactName: "Jamie Rivera" })).toBe("Jamie");
  });

  it("falls back to the artist name when there is no contact name", () => {
    expect(firstNameFrom({ artistName: "Some Artist", contactName: null })).toBe("Some");
  });

  it("returns null when neither name is available, so the caller can render a plain 'Welcome.'", () => {
    expect(firstNameFrom({ artistName: "", contactName: null })).toBeNull();
  });
});

describe("hydrateAnswers", () => {
  it("returns a blank slate for null/undefined/empty responses", () => {
    const answers = hydrateAnswers(null);
    expect(answers.communication_preference).toBe("");
    expect(answers.deliverables).toEqual([]);
  });

  it("resumes a returning artist's previously saved answers", () => {
    const answers = hydrateAnswers({ communication_preference: "Email", deliverables: ["Main version", "Stems"] });
    expect(answers.communication_preference).toBe("Email");
    expect(answers.deliverables).toEqual(["Main version", "Stems"]);
  });

  it("drops a value that doesn't match its question's expected shape instead of crashing", () => {
    const answers = hydrateAnswers({ deliverables: "not-an-array", communication_preference: ["not", "a", "string"] });
    expect(answers.deliverables).toEqual([]);
    expect(answers.communication_preference).toBe("");
  });

  it("still hydrates an unrecognized key without dropping the known ones", () => {
    const answers = hydrateAnswers({ communication_preference: "Text", some_future_key: "value" });
    expect(answers.communication_preference).toBe("Text");
  });
});

describe("stepForQuestionKey / REVIEW_STEP", () => {
  it("maps every top-level question key to a distinct step, in question order", () => {
    SETUP_QUESTIONS.forEach((question, index) => {
      expect(stepForQuestionKey(question.key)).toBe(index + 2);
    });
  });

  it("maps a follow-up key to the same step as its parent question", () => {
    const communication = SETUP_QUESTIONS.find((question) => question.followUp);
    expect(communication?.followUp).toBeDefined();
    if (communication?.followUp) {
      expect(stepForQuestionKey(communication.followUp.key)).toBe(stepForQuestionKey(communication.key));
    }
  });

  it("REVIEW_STEP is exactly one past the last question step", () => {
    expect(REVIEW_STEP).toBe(SETUP_QUESTIONS.length + 2);
  });
});

describe("hasValue", () => {
  it("treats an empty array, empty string, and whitespace-only string as no value", () => {
    expect(hasValue([])).toBe(false);
    expect(hasValue("")).toBe(false);
    expect(hasValue("   ")).toBe(false);
  });

  it("treats a non-empty array or non-blank string as a value", () => {
    expect(hasValue(["Main version"])).toBe(true);
    expect(hasValue("Email")).toBe(true);
  });
});

describe("renderModeForStatus", () => {
  it("locks submitted and confirmed Setups", () => {
    expect(renderModeForStatus("submitted")).toBe("locked_submitted");
    expect(renderModeForStatus("confirmed")).toBe("locked_confirmed");
  });

  it("treats draft and in_progress as interactive", () => {
    expect(renderModeForStatus("draft")).toBe("interactive");
    expect(renderModeForStatus("in_progress")).toBe("interactive");
  });
});
