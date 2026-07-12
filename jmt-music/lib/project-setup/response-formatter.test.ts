import { describe, expect, it } from "vitest";
import { formatResponseFields, humanizeKey } from "./response-formatter";

describe("humanizeKey", () => {
  it("humanizes snake_case, camelCase, and kebab-case", () => {
    expect(humanizeKey("artist_name")).toBe("Artist Name");
    expect(humanizeKey("artistName")).toBe("Artist Name");
    expect(humanizeKey("artist-name")).toBe("Artist Name");
  });

  it("falls back to the raw key if it can't be spaced out", () => {
    expect(humanizeKey("")).toBe("");
  });
});

describe("formatResponseFields", () => {
  it("returns an empty list for null/undefined/non-object input", () => {
    expect(formatResponseFields(null)).toEqual([]);
    expect(formatResponseFields(undefined)).toEqual([]);
  });

  it("formats plain strings and numbers as-is", () => {
    const fields = formatResponseFields({ artist_name: "Some Artist", track_count: 4 });
    expect(fields).toEqual([
      { kind: "field", key: "artist_name", label: "Artist Name", value: "Some Artist" },
      { kind: "field", key: "track_count", label: "Track Count", value: "4" }
    ]);
  });

  it("formats booleans as Yes/No", () => {
    const fields = formatResponseFields({ wants_mastering: true, has_stems: false });
    expect(fields).toEqual([
      { kind: "field", key: "wants_mastering", label: "Wants Mastering", value: "Yes" },
      { kind: "field", key: "has_stems", label: "Has Stems", value: "No" }
    ]);
  });

  it("omits null, undefined, empty string, empty array, and empty object values", () => {
    const fields = formatResponseFields({
      a: null,
      b: undefined,
      c: "",
      d: "   ",
      e: [],
      f: {},
      g: "kept"
    });
    expect(fields).toEqual([{ kind: "field", key: "g", label: "G", value: "kept" }]);
  });

  it("formats an array of scalars as a comma list", () => {
    const fields = formatResponseFields({ genres: ["Trap", "Lo-Fi", "Boom Bap"] });
    expect(fields).toEqual([{ kind: "field", key: "genres", label: "Genres", value: "Trap, Lo-Fi, Boom Bap" }]);
  });

  it("falls back to JSON per item for an array containing objects", () => {
    const fields = formatResponseFields({ links: [{ label: "Instagram", url: "https://instagram.com/x" }] });
    expect(fields[0].kind).toBe("field");
    expect((fields[0] as { value: string }).value).toContain("Instagram");
  });

  it("turns a nested object into a section with its own formatted fields", () => {
    const fields = formatResponseFields({
      contact: { email: "a@b.com", phone: "" }
    });
    expect(fields).toEqual([
      {
        kind: "section",
        key: "contact",
        label: "Contact",
        fields: [{ kind: "field", key: "email", label: "Email", value: "a@b.com" }]
      }
    ]);
  });

  it("omits a nested object section entirely if every field inside it is empty", () => {
    const fields = formatResponseFields({ contact: { email: "", phone: "" }, kept: "yes" });
    expect(fields).toEqual([{ kind: "field", key: "kept", label: "Kept", value: "yes" }]);
  });

  it("handles unknown/future keys the same as known ones", () => {
    const fields = formatResponseFields({ some_future_question_2027: "an answer" });
    expect(fields).toEqual([{ kind: "field", key: "some_future_question_2027", label: "Some Future Question 2027", value: "an answer" }]);
  });

  it("applies labelOverrides when supplied", () => {
    const fields = formatResponseFields({ artist_name: "Some Artist" }, { artist_name: "Artist / Stage Name" });
    expect(fields).toEqual([{ kind: "field", key: "artist_name", label: "Artist / Stage Name", value: "Some Artist" }]);
  });
});
