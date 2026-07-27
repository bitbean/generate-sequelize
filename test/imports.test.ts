import { describe, expect, it } from "vitest";
import ejs from "ejs";
import path from "path";

describe("generated import specifiers", () => {
  it("adds .js only to relative imports", async () => {
    const partials = path.resolve(__dirname, "../templates/partials");
    const output = await ejs.renderFile(
      path.join(partials, "imports.ejs"),
      {
        imports: new Map([
          ["sequelize", new Set(["fn"])],
          ["@sequelize/core", new Set(["Model"])],
          ["./user", new Set(["User"])],
          ["../shared/base", new Set(["Base"])],
        ]),
      },
      { context: { dirName: partials } },
    );

    expect(output).toContain("from 'sequelize';");
    expect(output).toContain("from '@sequelize/core';");
    expect(output).toContain("from './user.js';");
    expect(output).toContain("from '../shared/base.js';");
    expect(output).not.toContain("sequelize.js");
  });
});
