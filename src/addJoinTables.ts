import { Utils } from "sequelize";
import { DBData, RelationData } from "./types";

export default function addJoinTables(tableData: DBData, joinTables: string[]) {
  joinTables.forEach((tableName) => {
    const table = tableData.get(tableName)!;
    const { relations } = table;
    const belongTos = [...relations.entries()].filter(
      ([, r]) => r.type === "belongsTo",
    );
    belongTos.forEach(([name, r]) => {
      const { targetTableName, foreignKey } = r;
      const targetTable = tableData.get(targetTableName)!;
      belongTos.forEach(([otherName, other]) => {
        if (name === otherName) return;
        const m2m: RelationData = {
          foreignKey,
          type: "belongsToMany",
          otherKey: other.foreignKey,
          targetName: other.targetName,
          targetTableName: other.targetTableName,
          targetFileName: other.targetFileName,
          through: table.modelName,
          throughAlias: Utils.singularize(table.modelName),
          throughFileName: table.fileName,
        };
        targetTable.relations.set(Utils.pluralize(otherName), m2m);
      });
    });
  });
}
