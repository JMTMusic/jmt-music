import { describe, expect, it } from "vitest";
import { emptySetupAnswers, questionByKey, SETUP_LABEL_OVERRIDES, SETUP_QUESTIONS, SETUP_SECTIONS } from "./config";

describe("SETUP_QUESTIONS", () => {
  it("has a unique key for every top-level question and follow-up", () => {
    const keys: string[] = [];
    for (const question of SETUP_QUESTIONS) {
      keys.push(question.key);
      if (question.followUp) keys.push(question.followUp.key);
    }
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every select question's options are non-empty and unique", () => {
    for (const question of SETUP_QUESTIONS) {
      if (question.type === "single_select" || question.type === "multi_select") {
        expect(question.options && question.options.length).toBeGreaterThan(0);
        expect(new Set(question.options)).toEqual(new Set(question.options));
      }
    }
  });
});

describe("SETUP_SECTIONS", () => {
  it("every questionKey referenced in a section resolves to a real question", () => {
    for (const section of SETUP_SECTIONS) {
      for (const key of section.questionKeys) {
        expect(questionByKey(key), `missing question for key "${key}" in section "${section.id}"`).toBeDefined();
      }
    }
  });

  it("every top-level question and follow-up belongs to exactly one section", () => {
    const sectioned = SETUP_SECTIONS.flatMap((section) => section.questionKeys);
    const keys: string[] = [];
    for (const question of SETUP_QUESTIONS) {
      keys.push(question.key);
      if (question.followUp) keys.push(question.followUp.key);
    }
    for (const key of keys) expect(sectioned.filter((k) => k === key)).toHaveLength(1);
  });
});

describe("questionByKey", () => {
  it("finds a top-level question", () => {
    expect(questionByKey("availability")?.label).toBe("Availability for Feedback");
  });

  it("finds a nested follow-up question", () => {
    expect(questionByKey("communication_best_time")?.label).toBe("Best Time to Reach You");
  });

  it("returns undefined for an unknown key", () => {
    expect(questionByKey("not_a_real_key")).toBeUndefined();
  });
});

describe("SETUP_LABEL_OVERRIDES", () => {
  it("has an entry for every question and follow-up, matching its label", () => {
    for (const question of SETUP_QUESTIONS) {
      expect(SETUP_LABEL_OVERRIDES[question.key]).toBe(question.label);
      if (question.followUp) expect(SETUP_LABEL_OVERRIDES[question.followUp.key]).toBe(question.followUp.label);
    }
  });
});

describe("emptySetupAnswers", () => {
  it("gives every multi_select question an empty array and everything else an empty string", () => {
    const answers = emptySetupAnswers();
    expect(answers.deliverables).toEqual([]);
    expect(answers.communication_preference).toBe("");
    expect(answers.communication_best_time).toBe("");
  });
});
