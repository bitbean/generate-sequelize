import { describe, expect, it } from "vitest";
import getDefaultValue from "../src/utils/getDefaultValue";

describe("getDefaultValue PostgreSQL arrays", () => {
  it.each([
    ["(ARRAY[]::text[])", "string[]"],
    ["(ARRAY[]::integer[])", "number[]"],
    ["('{}'::text[])", "string[]"],
    ["(ARRAY[]::text[])", "string[] | null"],
  ])("emits an empty array for %s", (defaultValue, tsType) => {
    expect(
      getDefaultValue(defaultValue, tsType, "DataTypes.ARRAY(DataTypes.TEXT)"),
    ).toBe("[]");
  });

  it("preserves a populated SQL array constructor as a literal", () => {
    expect(
      getDefaultValue(
        "(ARRAY['a','b']::text[])",
        "string[]",
        "DataTypes.ARRAY(DataTypes.TEXT)",
      ),
    ).toBe(`literal("ARRAY['a','b']::text[]")`);
  });

  it("continues to parse PostgreSQL brace arrays", () => {
    expect(
      getDefaultValue(
        "{alpha,beta}",
        "string[] | null",
        "DataTypes.ARRAY(DataTypes.TEXT)",
      ),
    ).toBe('["alpha","beta"]');
  });
});
