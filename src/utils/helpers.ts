import _ from "lodash";
import { AutoOptions } from "sequelize-auto";
import { Utils } from "sequelize";

export function recase(
  name: string,
  caseModel: AutoOptions["caseFile"],
  singularize?: boolean,
) {
  name = singularize ? Utils.singularize(name) : name;
  switch (caseModel) {
    case "c":
      return _.camelCase(name);
    case "p":
      return _.upperFirst(_.camelCase(name));
    case "u":
      return _.snakeCase(name).toUpperCase();
    case "l":
      return _.snakeCase(name).toLowerCase();
    case "k":
      return _.kebabCase(name);
    default:
      return name;
  }
}

export function replaceRegion(
  regionName: string,
  insert: string,
  file: string,
) {
  const regionMarker = `(\\/\\* auto-generated ${regionName} \\*\\/)`;
  const reg = `${regionMarker}[\\s\\S]*?${regionMarker}`;
  return file.replace(new RegExp(reg, "g"), (match, p1, p2) => {
    return `${p1}\n${insert}\n${p2}`;
  });
}

export function addImports(imports: ImportsMap): AddImport {
  return (name, fileName, condition) =>
    addImport(imports, name, fileName, condition);
}

export type ImportsMap = Map<string, Set<string>>;

function addImport(
  imports: ImportsMap,
  name: string,
  fileName: string,
  condition = true,
) {
  if (condition)
    (imports.get(fileName) ||
      imports.set(fileName, new Set()).get(fileName))!.add(name);
}

type AddImport = (name: string, fileName: string, condition?: boolean) => void;
