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
