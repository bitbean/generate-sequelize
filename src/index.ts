import { GeneratorOptions } from "./types";
import getTableData from "./getDbData";
import path from "path";
import SequelizeAuto from "sequelize-auto";
import addJoinTables from "./addJoinTables";
import ejs from "ejs";
import { mkdirp } from "mkdirp";
import { existsSync, readFileSync, writeFileSync } from "fs";
import ImportManager from "./classes/ImportManager";
import prettier from "prettier";

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
    const fileName = path.join(config.directory, `${table.fileName}.ts`);
    await write(fileName, resolveImports, config, table.tableName);
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
    await write(initFilePath, initFile, config, "init-models");
  }
}

function replaceRegions(filePath: string, templateFile: string): string {
  if (existsSync(filePath)) {
    const existingContent = readFileSync(filePath, "utf-8");
    let newContent = existingContent;

    // Function to extract content between markers, regardless of format
    const extractTemplateContent = (region: string) => {
      // Try to find content in new format first
      const newFormatMatch = templateFile.match(
        new RegExp(
          `\\/\\* start auto-generated ${region} \\*\\/([\\s\\S]*?)\\/\\* end auto-generated ${region} \\*\\/`,
        ),
      );
      if (newFormatMatch && newFormatMatch[1]) {
        return newFormatMatch[1];
      }

      // Fall back to old format
      const oldFormatMatch = templateFile.match(
        new RegExp(
          `\\/\\* auto-generated ${region} \\*\\/([\\s\\S]*?)\\/\\* auto-generated ${region} \\*\\/`,
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
      /\/\* auto-generated ([a-z]+) \*\//g,
    );
    if (oldFormatRegions) {
      const uniqueRegions = [
        ...new Set(
          oldFormatRegions
            .map((r) => r.match(/\/\* auto-generated ([a-z]+) \*\//)?.[1])
            .filter(Boolean),
        ),
      ];

      for (const region of uniqueRegions) {
        if (!region) continue;

        const contentToInsert = extractTemplateContent(region);
        newContent = newContent.replace(
          new RegExp(
            `\\/\\* auto-generated ${region} \\*\\/([\\s\\S]*?)\\/\\* auto-generated ${region} \\*\\/`,
            "g",
          ),
          `/* start auto-generated ${region} */${contentToInsert}/* end auto-generated ${region} */`,
        );
      }
    }

    // Then handle new format /* start auto-generated X */ ... /* end auto-generated X */
    const newFormatRegions = existingContent.match(
      /\/\* start auto-generated ([a-z]+) \*\//g,
    );
    if (newFormatRegions) {
      const uniqueRegions = [
        ...new Set(
          newFormatRegions
            .map((r) => r.match(/\/\* start auto-generated ([a-z]+) \*\//)?.[1])
            .filter(Boolean),
        ),
      ];

      for (const region of uniqueRegions) {
        if (!region) continue;

        const contentToInsert = extractTemplateContent(region);
        newContent = newContent.replace(
          new RegExp(
            `\\/\\* start auto-generated ${region} \\*\\/[\\s\\S]*?\\/\\* end auto-generated ${region} \\*\\/`,
            "g",
          ),
          `/* start auto-generated ${region} */${contentToInsert}/* end auto-generated ${region} */`,
        );
      }
    }

    // Update the timestamp at the end if content has changed
    if (newContent !== existingContent) {
      const currentTimestamp = new Date().toISOString();
      newContent = newContent.replace(
        /Generated on: [^\n]+/,
        `Generated on: ${currentTimestamp}`,
      );
    }

    return newContent;
  }

  return templateFile;
}

async function write(
  filePath: string,
  templateFile: string,
  config: GeneratorOptions,
  tableName: string,
) {
  templateFile = replaceRegions(filePath, templateFile);
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
