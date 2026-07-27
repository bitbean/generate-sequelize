import { GeneratorOptions } from "./types";
import getTableData from "./getDbData";
import path from "path";
import * as crypto from "crypto";
import SequelizeAuto from "sequelize-auto";
import addJoinTables from "./addJoinTables";
import ejs from "ejs";
import { mkdirp } from "mkdirp";
import { existsSync, readFileSync, writeFileSync } from "fs";
import ImportManager from "./classes/ImportManager";
import prettier from "prettier";
import { setupAgents } from "./setupAgents";
import { getColumnOrder } from "./getColumnOrder";

// Regex pattern constants
const REGEX_CHECKSUM = /Template checksum: ([a-f0-9]{32})/i;
const MARKER_WARNING = " — DO NOT EDIT";

// Old format patterns (/* auto-generated X */.../* auto-generated X */)
const REGEX_OLD_FORMAT_REGIONS = /\/\* auto-generated ([a-z\-\s]+) \*\//g;
const REGEX_OLD_FORMAT_REGION_NAME = /\/\* auto-generated ([a-z\-\s]+) \*\//;

// New format patterns (warning text on start markers is optional for migration)
const REGEX_NEW_FORMAT_REGIONS =
  /\/\* start auto-generated ([a-z\-\s]+?)(?: — DO NOT EDIT)? \*\//g;
const REGEX_NEW_FORMAT_REGION_NAME =
  /\/\* start auto-generated ([a-z\-\s]+?)(?: — DO NOT EDIT)? \*\//;

// Template regex pattern functions - construct RegExp objects for content extraction and replacement
// Using string concatenation to avoid template literal escaping issues
const createOldFormatRegex = (escapedRegion: string) =>
  new RegExp(
    "/\\* auto-generated " +
      escapedRegion +
      " \\*/([\\s\\S]*?)/\\* auto-generated " +
      escapedRegion +
      " \\*/",
  );

const createNewFormatRegex = (escapedRegion: string) =>
  new RegExp(
    "/\\* start auto-generated " +
      escapedRegion +
      "(?: — DO NOT EDIT)? \\*/([\\s\\S]*?)/\\* end auto-generated " +
      escapedRegion +
      " \\*/",
  );

const createOldFormatReplaceRegex = (escapedRegion: string) =>
  new RegExp(
    "/\\* auto-generated " +
      escapedRegion +
      " \\*/([\\s\\S]*?)/\\* auto-generated " +
      escapedRegion +
      " \\*/",
    "g",
  );

const createNewFormatReplaceRegex = (escapedRegion: string) =>
  new RegExp(
    "/\\* start auto-generated " +
      escapedRegion +
      "(?: — DO NOT EDIT)? \\*/([\\s\\S]*?)/\\* end auto-generated " +
      escapedRegion +
      " \\*/",
    "g",
  );

/**
 * Used to determine if templates have changed between runs
 */
function calculateChecksum(content: string): string {
  return crypto.createHash("md5").update(content).digest("hex");
}

export async function main() {
  if (process.argv[2] === "setup-agents") {
    const agentsPath = process.argv[3] ?? "AGENTS.md";
    const result = setupAgents(agentsPath);
    // eslint-disable-next-line no-console
    console.log(`${agentsPath}: AI instructions ${result}`);
    return;
  }

  const configPath = path.join(
    process.cwd(),
    process.argv[2] ?? ".generate-sequelize.cjs",
  );
  const config = (await import(configPath)).default as GeneratorOptions;
  const {
    joinTables,
    username = "",
    password = "",
    database = "",
    targetLib = "sequelize",
    joinTableRenames = {},
    ...rest
  } = config;
  const auto = new SequelizeAuto(database, username, password, {
    ...rest,
    closeConnectionAutomatically: false,
    useDefine: false,
    singularize: !!rest.singularize,
  });
  let builtData;
  let columnOrder;
  try {
    builtData = await auto.build();
    columnOrder = await getColumnOrder(auto.sequelize, config);
  } finally {
    await auto.sequelize.close();
  }
  const td = auto.relate(builtData);
  const tableData = getTableData(td, config, columnOrder);

  joinTables && addJoinTables(tableData, joinTables, joinTableRenames);

  const templatesRoot = path.join(__dirname, "..", "templates");
  const targetLibTemplateDir = path.join(templatesRoot, targetLib);
  const modelTemplatePath = path.join(targetLibTemplateDir, "model.ejs");
  mkdirp.sync(config.directory);
  [...tableData.values()].forEach(async (table) => {
    const importManager = new ImportManager();
    const prep = await ejs.renderFile(
      modelTemplatePath,
      {
        ...table,
        generatedWarnings: config.generatedWarnings ?? false,
        markerWarning: config.generatedWarnings ? MARKER_WARNING : "",
      },
      {
        context: importManager,
      },
    );
    importManager.imports.delete(`./${table.fileName}`);
    const resolveImports = ejs.render(prep, importManager, {
      context: { dirName: path.join(templatesRoot, "partials") },
    });
    const checksum = calculateChecksum(resolveImports);

    const fileName = path.join(config.directory, `${table.fileName}.ts`);
    await write(fileName, resolveImports, config, table.tableName, checksum);
  });
  if (!config.noInitModels) {
    const initFile = await ejs.renderFile(
      path.join(targetLibTemplateDir, "init-models.ejs"),
      {
        allTables: [...tableData.values()].sort((a, b) =>
          a.fileName.localeCompare(b.fileName),
        ),
        markerWarning: config.generatedWarnings ? MARKER_WARNING : "",
      },
    );
    const initFilePath = path.join(config.directory, "init-models.ts");
    const initChecksum = calculateChecksum(initFile);

    await write(initFilePath, initFile, config, "init-models", initChecksum);
  }
}

export function replaceRegions(
  filePath: string,
  templateFile: string,
  checksum?: string,
  generatedWarnings = false,
): string {
  if (existsSync(filePath)) {
    const existingContent = readFileSync(filePath, "utf-8");
    let newContent = existingContent;

    // Function to extract content between markers, regardless of format
    const extractTemplateContent = (region: string) => {
      // Escape any special regex characters in the region name
      const escapedRegion = region.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

      // Try to find content in new format first
      const newFormatMatch = templateFile.match(
        createNewFormatRegex(escapedRegion),
      );
      if (newFormatMatch && newFormatMatch[1]) {
        return newFormatMatch[1];
      }

      // Fall back to old format
      const oldFormatMatch = templateFile.match(
        createOldFormatRegex(escapedRegion),
      );
      if (oldFormatMatch && oldFormatMatch[1]) {
        return oldFormatMatch[1];
      }

      return "";
    };

    // First handle old format /* auto-generated X */ ... /* auto-generated X */
    // and convert to new format /* start auto-generated X */ ... /* end auto-generated X */
    const oldFormatRegions = existingContent.match(REGEX_OLD_FORMAT_REGIONS);
    if (oldFormatRegions) {
      const uniqueRegions = [
        ...new Set(
          oldFormatRegions
            .map((r) => r.match(REGEX_OLD_FORMAT_REGION_NAME)?.[1])
            .filter(Boolean),
        ),
      ];

      for (const region of uniqueRegions) {
        if (!region) continue;

        const contentToInsert = extractTemplateContent(region);
        // Escape any special regex characters in the region name
        const escapedRegion = region.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        newContent = newContent.replace(
          createOldFormatReplaceRegex(escapedRegion),
          `/* start auto-generated ${region}${generatedWarnings ? MARKER_WARNING : ""} */${contentToInsert}/* end auto-generated ${region} */`,
        );
      }
    }

    // Then handle new format /* start auto-generated X */ ... /* end auto-generated X */
    const newFormatRegions = existingContent.match(REGEX_NEW_FORMAT_REGIONS);
    if (newFormatRegions) {
      const uniqueRegions = [
        ...new Set(
          newFormatRegions
            .map((r) => r.match(REGEX_NEW_FORMAT_REGION_NAME)?.[1])
            .filter(Boolean),
        ),
      ];

      for (const region of uniqueRegions) {
        if (!region) continue;

        const contentToInsert = extractTemplateContent(region);
        // Escape any special regex characters in the region name
        const escapedRegion = region.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        newContent = newContent.replace(
          createNewFormatReplaceRegex(escapedRegion),
          `/* start auto-generated ${region}${generatedWarnings ? MARKER_WARNING : ""} */${contentToInsert}/* end auto-generated ${region} */`,
        );
      }
    }

    const templateHeader = templateFile.match(
      /^\/\*\*[\s\S]*?PARTIALLY AUTO-GENERATED[\s\S]*?\*\/\s*/,
    )?.[0];

    if (checksum && templateHeader) {
      const headerWithChecksum = templateHeader.replace(
        /\n \*\/(\s*)$/,
        `\n * Template checksum: ${checksum}\n */$1`,
      );
      const existingHeader = newContent.match(/^\/\*\*[\s\S]*?\*\/\s*/)?.[0];
      const isGeneratedHeader =
        existingHeader?.includes("MODEL FILE WITH AUTO-GENERATED SECTIONS") ||
        existingHeader?.includes("PARTIALLY AUTO-GENERATED") ||
        REGEX_CHECKSUM.test(existingHeader ?? "");

      if (existingHeader && isGeneratedHeader) {
        newContent =
          headerWithChecksum + newContent.slice(existingHeader.length);
      } else {
        newContent = headerWithChecksum + newContent;
      }
    }

    return newContent;
  }

  // If the file doesn't exist yet, add a checksum to model headers.
  if (checksum && templateFile.includes("PARTIALLY AUTO-GENERATED")) {
    return templateFile.replace(
      /(\n \*\/)/,
      `\n * Template checksum: ${checksum}$1`,
    );
  }

  return templateFile;
}

async function write(
  filePath: string,
  templateFile: string,
  config: GeneratorOptions,
  tableName: string,
  checksum?: string,
) {
  templateFile = replaceRegions(
    filePath,
    templateFile,
    checksum,
    config.generatedWarnings,
  );
  templateFile = await prettier.format(templateFile, {
    ...config.prettierOptions,
    parser: "typescript",
    semi: true,
  });
  if (config.replacements) {
    config.replacements.forEach(
      ([pattern, replacement, tables, excludeTables]) => {
        if (!tables || tables.includes(tableName)) {
          if (!excludeTables?.includes(tableName)) {
            templateFile = templateFile.replaceAll(pattern, replacement);
          }
        }
      },
    );
  }
  writeFileSync(filePath, templateFile);
}
