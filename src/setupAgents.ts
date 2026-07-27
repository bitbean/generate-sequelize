import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

export const AGENTS_BLOCK_START = "<!-- generate-sequelize:start -->";
export const AGENTS_BLOCK_END = "<!-- generate-sequelize:end -->";

export const AGENTS_INSTRUCTIONS = `${AGENTS_BLOCK_START}
## Generated Sequelize models

Files produced by \`generate-sequelize\` are partially auto-generated. Before
editing a model, read its file header and do not modify content between
\`start auto-generated\` and \`end auto-generated\` markers. Those changes will
be overwritten. Update the database schema or migrations and regenerate instead.
Custom code may be added outside the marked sections.
${AGENTS_BLOCK_END}`;

export type SetupAgentsResult = "created" | "added" | "updated" | "unchanged";

export function setupAgents(filePath = "AGENTS.md"): SetupAgentsResult {
  const resolvedPath = path.resolve(process.cwd(), filePath);

  if (!existsSync(resolvedPath)) {
    writeFileSync(resolvedPath, `${AGENTS_INSTRUCTIONS}\n`);
    return "created";
  }

  const content = readFileSync(resolvedPath, "utf8");
  const start = content.indexOf(AGENTS_BLOCK_START);
  const end = content.indexOf(AGENTS_BLOCK_END);

  if ((start === -1) !== (end === -1) || (start !== -1 && end < start)) {
    throw new Error(
      `Cannot update ${resolvedPath}: generate-sequelize instruction markers are malformed.`,
    );
  }

  if (start !== -1) {
    const blockEnd = end + AGENTS_BLOCK_END.length;
    const updatedContent =
      content.slice(0, start) + AGENTS_INSTRUCTIONS + content.slice(blockEnd);

    if (updatedContent === content) {
      return "unchanged";
    }

    writeFileSync(resolvedPath, updatedContent);
    return "updated";
  }

  const separator =
    content.length === 0 ? "" : content.endsWith("\n") ? "\n" : "\n\n";
  writeFileSync(resolvedPath, `${content}${separator}${AGENTS_INSTRUCTIONS}\n`);
  return "added";
}
