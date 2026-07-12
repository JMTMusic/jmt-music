import { describe, expect, it } from "vitest";
import { canPerformAction, resultingStatus, shouldSetStartedAt } from "./pipeline";

describe("canPerformAction", () => {
  it("allows start from draft or in_progress only", () => {
    expect(canPerformAction("start", "draft")).toBe(true);
    expect(canPerformAction("start", "in_progress")).toBe(true);
    expect(canPerformAction("start", "submitted")).toBe(false);
    expect(canPerformAction("start", "confirmed")).toBe(false);
  });

  it("allows submit from draft or in_progress only", () => {
    expect(canPerformAction("submit", "draft")).toBe(true);
    expect(canPerformAction("submit", "in_progress")).toBe(true);
    expect(canPerformAction("submit", "submitted")).toBe(false);
    expect(canPerformAction("submit", "confirmed")).toBe(false);
  });

  it("allows confirm from submitted only", () => {
    expect(canPerformAction("confirm", "submitted")).toBe(true);
    expect(canPerformAction("confirm", "draft")).toBe(false);
    expect(canPerformAction("confirm", "in_progress")).toBe(false);
    expect(canPerformAction("confirm", "confirmed")).toBe(false);
  });

  it("allows reopen from submitted or confirmed only", () => {
    expect(canPerformAction("reopen", "submitted")).toBe(true);
    expect(canPerformAction("reopen", "confirmed")).toBe(true);
    expect(canPerformAction("reopen", "draft")).toBe(false);
    expect(canPerformAction("reopen", "in_progress")).toBe(false);
  });
});

describe("resultingStatus", () => {
  it("start moves draft to in_progress, and is a no-op status-wise from in_progress", () => {
    expect(resultingStatus("start", "draft")).toBe("in_progress");
    expect(resultingStatus("start", "in_progress")).toBe("in_progress");
  });

  it("submit always results in submitted", () => {
    expect(resultingStatus("submit", "draft")).toBe("submitted");
    expect(resultingStatus("submit", "in_progress")).toBe("submitted");
  });

  it("confirm always results in confirmed", () => {
    expect(resultingStatus("confirm", "submitted")).toBe("confirmed");
  });

  it("reopen always results in in_progress", () => {
    expect(resultingStatus("reopen", "submitted")).toBe("in_progress");
    expect(resultingStatus("reopen", "confirmed")).toBe("in_progress");
  });
});

describe("shouldSetStartedAt", () => {
  it("is true only when startedAt has never been set", () => {
    expect(shouldSetStartedAt(null)).toBe(true);
    expect(shouldSetStartedAt("2026-07-11T00:00:00.000Z")).toBe(false);
  });
});
