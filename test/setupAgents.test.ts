import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  AGENTS_BLOCK_END,
  AGENTS_BLOCK_START,
  AGENTS_INSTRUCTIONS,
  setupAgents,
} from "../src/setupAgents";

const temporaryDirectories: string[] = [];

function temporaryFile(): string {
  const directory = mkdtempSync(path.join(os.tmpdir(), "generate-sequelize-"));
  temporaryDirectories.push(directory);
  return path.join(directory, "AGENTS.md");
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

describe("setupAgents", () => {
  it("creates AGENTS.md with the generated-model instructions", () => {
    const filePath = temporaryFile();

    expect(setupAgents(filePath)).toBe("created");
    expect(readFileSync(filePath, "utf8")).toBe(`${AGENTS_INSTRUCTIONS}\n`);
    expect(setupAgents(filePath)).toBe("unchanged");
  });

  it("appends instructions without changing existing content", () => {
    const filePath = temporaryFile();
    writeFileSync(filePath, "# Existing instructions\n");

    expect(setupAgents(filePath)).toBe("added");
    expect(readFileSync(filePath, "utf8")).toBe(
      `# Existing instructions\n\n${AGENTS_INSTRUCTIONS}\n`,
    );
  });

  it("updates only its managed block", () => {
    const filePath = temporaryFile();
    writeFileSync(
      filePath,
      `Before\n\n${AGENTS_BLOCK_START}\noutdated\n${AGENTS_BLOCK_END}\n\nAfter\n`,
    );

    expect(setupAgents(filePath)).toBe("updated");
    expect(readFileSync(filePath, "utf8")).toBe(
      `Before\n\n${AGENTS_INSTRUCTIONS}\n\nAfter\n`,
    );
  });
});
