import { mkdtempSync, rmSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { replaceRegions } from "../src";

const checksum = "0123456789abcdef0123456789abcdef";
const template = `/**
 * PARTIALLY AUTO-GENERATED — DO NOT EDIT MARKED SECTIONS.
 * Changes inside auto-generated markers will be overwritten.
 * Add custom code outside those markers.
 */

/* start auto-generated imports — DO NOT EDIT */
import { Current } from "./current.js";
/* end auto-generated imports */

export const custom = true;
`;
const temporaryDirectories: string[] = [];

function temporaryPath(): string {
  const directory = mkdtempSync(path.join(os.tmpdir(), "generate-sequelize-"));
  temporaryDirectories.push(directory);
  return path.join(directory, "model.ts");
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

describe("replaceRegions", () => {
  it("omits generated-region warnings by default", () => {
    const filePath = temporaryPath();
    writeFileSync(
      filePath,
      `/* start auto-generated imports */
stale
/* end auto-generated imports */
`,
    );

    const output = replaceRegions(filePath, template, checksum);

    expect(output).toContain("/* start auto-generated imports */");
    expect(output).not.toContain("/* start auto-generated imports — DO NOT EDIT */");
  });

  it("adds the checksum to a new model header", () => {
    const output = replaceRegions(temporaryPath(), template, checksum);

    expect(output).toContain(` * Template checksum: ${checksum}`);
    expect(output).not.toContain("Generated on:");
  });

  it("updates generated regions and preserves custom code", () => {
    const filePath = temporaryPath();
    writeFileSync(
      filePath,
      `/**
 * MODEL FILE WITH AUTO-GENERATED SECTIONS
 * Generated on: 2025-01-01T00:00:00.000Z
 */

/* start auto-generated imports */
import { Stale } from "./stale.js";
/* end auto-generated imports */

export const keepMe = true;
`,
    );

    const output = replaceRegions(filePath, template, checksum, true);

    expect(output).toContain("PARTIALLY AUTO-GENERATED");
    expect(output).toContain(`Template checksum: ${checksum}`);
    expect(output).not.toContain("Generated on:");
    expect(output).toContain(
      "/* start auto-generated imports — DO NOT EDIT */",
    );
    expect(output).toContain('import { Current } from "./current.js";');
    expect(output).not.toContain("Stale");
    expect(output).toContain("export const keepMe = true;");
  });

  it("migrates paired old-format markers", () => {
    const filePath = temporaryPath();
    writeFileSync(
      filePath,
      `/* auto-generated imports */
stale
/* auto-generated imports */
`,
    );

    const output = replaceRegions(filePath, template, checksum, true);

    expect(output).toContain(
      "/* start auto-generated imports — DO NOT EDIT */",
    );
    expect(output).toContain("/* end auto-generated imports */");
    expect(output).not.toContain("\nstale\n");
  });
});
