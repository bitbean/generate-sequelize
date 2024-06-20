import { CustomOptions } from "./types";
import getTableData from "./getDbData";
import path from "path";
import SequelizeAuto from "sequelize-auto";
import addJoinTables from "./addJoinTables";
import ejs from "ejs";
import * as mkdirp from "mkdirp";
import { existsSync, readFileSync, writeFileSync } from "fs";
import ImportManager from "./classes/ImportManager";
import prettier from "prettier";

export async function main() {
  const configPath = path.join(
    process.cwd(),
    process.argv[2] ?? ".generate-sequelize.cjs",
  );
  console.log(configPath, "PATH FROM:", process.argv.length, process.argv);
  const config = (await import(configPath)).default as CustomOptions;
  const { joinTables = [], username, password, database, ...rest } = config;
  const auto = new SequelizeAuto(database!, username!, password!, rest);
  const td = auto.relate(await auto.build());

  const tableData = getTableData(td, config);

  addJoinTables(tableData, joinTables);
  const templatesFolder = path.join(
    "templates",
    config.targetLib || "sequelize",
  );
  const fileTemplatePath = path.join(templatesFolder, "model.ejs");
  mkdirp.sync(config.directory);
  [...tableData.values()].forEach(async (table) => {
    const importManager = new ImportManager();
    const prep = await ejs.renderFile(fileTemplatePath, table, {
      context: importManager,
    });
    const resolveImports = ejs.render(prep, importManager, {
      context: { dirName: path.join(__dirname, "..", "templates", "partials") },
    });
    const fileName = path.join(config.directory, `${table.fileName}.ts`);
    await write(fileName, resolveImports, config);
  });
  const initFile = await ejs.renderFile(
    path.join(templatesFolder, "init-models.ejs"),
    { allTables: [...tableData.values()] },
  );
  const initFilePath = path.join(config.directory, "init-models.ts");
  await write(initFilePath, initFile, config);
}

function replaceRegions(filePath: string, templateFile: string) {
  if (existsSync(filePath)) {
    return readFileSync(filePath, "utf-8").replace(
      /\/\* auto-generated ([a-z]+) \*\/[\s\S]*?\/\* auto-generated \1 \*\//g,
      (_, region) => {
        return (
          templateFile.match(
            new RegExp(
              `\\/\\* auto-generated ${region} \\*\\/[\\s\\S]*?\\/\\* auto-generated ${region} \\*\\/`,
            ),
          )?.[0] || ""
        );
      },
    );
  }
  return templateFile;
}

async function write(
  filePath: string,
  templateFile: string,
  config: CustomOptions,
) {
  templateFile = replaceRegions(filePath, templateFile);
  templateFile = await prettier.format(templateFile, {
    ...config.prettierOptions,
    parser: "typescript",
    semi: true,
    trailingComma: "all",
  });
  if (config.replacements) {
    config.replacements.forEach(([pattern, replacement]) => {
      templateFile = templateFile.replace(pattern, replacement);
    });
  }
  writeFileSync(filePath, templateFile);
}
