import { describe, expect, it } from "vitest";
import { escapeComment } from "../src/utils/escapeComment";

describe("escapeComment", () => {
  it("does not escape single quotes in double-quoted comments", () => {
    expect(escapeComment("normal, 'flagged' = warning only")).toBe(
      "normal, 'flagged' = warning only",
    );
  });

  it("escapes double quotes and backslashes", () => {
    expect(escapeComment('Use "quoted" C:\\path')).toBe(
      'Use \\"quoted\\" C:\\\\path',
    );
  });
});
