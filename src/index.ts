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

/**
 * Used to determine if templates have changed between runs
 * Excludes the timestamp from the calculation to prevent unnecessary updates
 */
function calculateChecksum(content: string): string {
  const normalizedContent = content.replace(/Generated on: [^\n]+\n?/, "");
  return crypto.createHash("md5").update(normalizedContent).digest("hex");
}

export async function main() {
  const configPath = path.join(
    process.cwd(),
    process.argv[2] ?? ".generate-sequelize.cjs",
  );
  console.log(configPath, "PATH FROM:", process.argv.length, process.argv);
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
    useDefine: false,
    singularize: !!rest.singularize,
  });
  const td = auto.relate(await auto.build());
  const tableData = getTableData(td, config);

  joinTables && addJoinTables(tableData, joinTables, joinTableRenames);

  const templatesRoot = path.join(__dirname, "..", "templates");
  const targetLibTemplateDir = path.join(templatesRoot, targetLib);
  const modelTemplatePath = path.join(targetLibTemplateDir, "model.ejs");
  mkdirp.sync(config.directory);
  [...tableData.values()].forEach(async (table) => {
    const importManager = new ImportManager();
    const prep = await ejs.renderFile(modelTemplatePath, table, {
      context: importManager,
    });
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
      },
    );
    const initFilePath = path.join(config.directory, "init-models.ts");
    const initChecksum = calculateChecksum(initFile);

    await write(initFilePath, initFile, config, "init-models", initChecksum);
  }
}

function replaceRegions(
  filePath: string,
  templateFile: string,
  checksum?: string,
): string {
  if (existsSync(filePath)) {
    const existingContent = readFileSync(filePath, "utf-8");
    let newContent = existingContent;

    const checksumFound = existingContent.match(
      /Template checksum: ([a-f0-9]{32})/i,
    );
    const existingChecksum = checksumFound ? checksumFound[1] : null;

    // Note: We don't early return even if checksums match to ensure all regions are properly maintained
    const checksumMatches =
      checksum && existingChecksum && existingChecksum === checksum;

    // Function to extract content between markers, regardless of format
    const extractTemplateContent = (region: string) => {
      // Escape any special regex characters in the region name
      const escapedRegion = region.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

      // Try to find content in new format first
      const newFormatMatch = templateFile.match(
        new RegExp(
          `\\/\\* start auto-generated ${escapedRegion} \\*\\/([\\s\\S]*?)\\/\\* end auto-generated ${escapedRegion} \\*\\/`,
        ),
      );
      if (newFormatMatch && newFormatMatch[1]) {
        return newFormatMatch[1];
      }

      // Fall back to old format
      const oldFormatMatch = templateFile.match(
        new RegExp(
          `\\/\\* auto-generated ${escapedRegion} \\*\\/([\\s\\S]*?)\\/\\* auto-generated ${escapedRegion} \\*\\/`,
        ),
      );
      if (oldFormatMatch && oldFormatMatch[1]) {
        return oldFormatMatch[1];
      }

      return "";
    };

    // First handle old format /* auto-generated X */ ... /* auto-generated X */
    // and convert to new format /* start auto-generated X */ ... /* end auto-generated X */
    const oldFormatRegions = existingContent.match(
      /\/\* auto-generated ([a-z\-\s]+) \*\//g,
    );
    if (oldFormatRegions) {
      const uniqueRegions = [
        ...new Set(
          oldFormatRegions
            .map((r) => r.match(/\/\* auto-generated ([a-z\-\s]+) \*\//)?.[1])
            .filter(Boolean),
        ),
      ];

      for (const region of uniqueRegions) {
        if (!region) continue;

        const contentToInsert = extractTemplateContent(region);
        // Escape any special regex characters in the region name
        const escapedRegion = region.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        newContent = newContent.replace(
          new RegExp(
            `\\/\\* auto-generated ${escapedRegion} \\*\\/([\\s\\S]*?)\\/\\* auto-generated ${escapedRegion} \\*\\/`,
            "g",
          ),
          `/* start auto-generated ${region} */${contentToInsert}/* end auto-generated ${region} */`,
        );
      }
    }

    // Then handle new format /* start auto-generated X */ ... /* end auto-generated X */
    const newFormatRegions = existingContent.match(
      /\/\* start auto-generated ([a-z\-\s]+) \*\//g,
    );
    if (newFormatRegions) {
      const uniqueRegions = [
        ...new Set(
          newFormatRegions
            .map(
              (r) =>
                r.match(/\/\* start auto-generated ([a-z\-\s]+) \*\//)?.[1],
            )
            .filter(Boolean),
        ),
      ];

      for (const region of uniqueRegions) {
        if (!region) continue;

        const contentToInsert = extractTemplateContent(region);
        // Escape any special regex characters in the region name
        const escapedRegion = region.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        newContent = newContent.replace(
          new RegExp(
            `\\/\\* start auto-generated ${escapedRegion} \\*\\/[\\s\\S]*?\\/\\* end auto-generated ${escapedRegion} \\*\\/`,
            "g",
          ),
          `/* start auto-generated ${region} */${contentToInsert}/* end auto-generated ${region} */`,
        );
      }
    }

    // Determine if we need to update the timestamp based only on checksum change
    const updateTimestamp = !checksumMatches;
    const currentTimestamp = updateTimestamp
      ? new Date().toISOString()
      : undefined;

    // Check if file has a header section with timestamp
    const hasHeaderWithTimestamp = /Generated on: [^\n]+/.test(newContent);

    if (checksum) {
      if (checksumFound) {
        // Found a checksum in the file
        if (!checksumMatches) {
          // Checksums don't match - update both timestamp and checksum
          newContent = newContent.replace(
            /Generated on: [^\n]+[\s\S]*?Template checksum: [a-f0-9]{32}/i,
            `Generated on: ${currentTimestamp}\n * Template checksum: ${checksum}`,
          );
        }
        // If checksums match, nothing to update
      } else if (hasHeaderWithTimestamp) {
        if (updateTimestamp) {
          // Has timestamp but no checksum, add it. Also update timestamp
          newContent = newContent.replace(
            /Generated on: [^\n]+/,
            `Generated on: ${currentTimestamp}\n * Template checksum: ${checksum}`,
          );
        } else {
          // Just add checksum, keep existing timestamp
          newContent = newContent.replace(
            /Generated on: ([^\n]+)/,
            `Generated on: $1\n * Template checksum: ${checksum}`,
          );
        }
      } else {
        // File has no header section at all, extract header from template and add it
        const headerMatch = templateFile.match(
          /^([\s\S]*?)(\/\* start auto-generated|export)/m,
        );
        let headerSection = "";

        if (headerMatch && headerMatch[1]) {
          // Just add the checksum after the existing timestamp
          headerSection = headerMatch[1].replace(
            /(Generated on: [^\n]+)/,
            `$1\n * Template checksum: ${checksum}`,
          );
        } else {
          // Fallback in case we can't extract the header
          headerSection = `/**\n * MODEL FILE WITH AUTO-GENERATED SECTIONS\n * Generated on: ${currentTimestamp}\n * Template checksum: ${checksum}\n */\n\n`;
        }
        // Add the header at the beginning of the file
        newContent = headerSection + newContent;
      }
    } else if (hasHeaderWithTimestamp && updateTimestamp) {
      // No checksum provided, just update timestamp if needed
      newContent = newContent.replace(
        /Generated on: [^\n]+/,
        `Generated on: ${currentTimestamp}`,
      );
    }

    return newContent;
  }

  // If file doesn't exist yet, add timestamp and checksum if provided
  if (checksum) {
    const newTimestamp = new Date().toISOString();
    let content = templateFile;

    // Add checksum to the header comment
    content = content.replace(
      /Generated on: [^\n]+/,
      `Generated on: ${newTimestamp}\n * Template checksum: ${checksum}`,
    );

    return content;
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
  templateFile = replaceRegions(filePath, templateFile, checksum);
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
            templateFile = templateFile.replace(pattern, replacement);
          }
        }
      },
    );
  }
  writeFileSync(filePath, templateFile);
}
