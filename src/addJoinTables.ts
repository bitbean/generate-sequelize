import { Utils } from "sequelize";
import { DBData, RelationData, JoinTables } from "./types";

export default function addJoinTables(
  tableData: DBData,
  joinTables: JoinTables,
) {
  const jt: [string, string[] | true | string[][]][] = Array.isArray(joinTables)
    ? joinTables.map((t) => [t, true])
    : Object.entries(joinTables).map(([tableName, trueOrFields]) => [
        tableName,
        trueOrFields,
      ]);
  jt.forEach(([tableName, trueOrFields]) => {
    const table = tableData.get(tableName)!;
    const { relations } = table;
    const belongTos = [...relations.entries()].filter(
      ([, r]) =>
        r.type === "belongsTo" &&
        (trueOrFields === true || trueOrFields.flat().includes(r.foreignKey)),
    );
    belongTos.forEach(([name, r]) => {
      const { targetTableName, foreignKey } = r;
      const targetTable = tableData.get(targetTableName)!;
      belongTos.forEach(([otherName, other]) => {
        if (name === otherName) return;
        if (
          Array.isArray(trueOrFields) &&
          !trueOrFields.find(
            (f) =>
              typeof f === "string" ||
              (f.includes(foreignKey) && f.includes(other.foreignKey)),
          )
        ) {
          return;
        }
        if (targetTable.relations.has(Utils.pluralize(otherName))) {
          console.warn(
            'skipping join table "' +
              otherName +
              '" for table "' +
              name +
              '" because it already exists',
          );
          return;
        }
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

// [task_id, media_id], [chat_id, media_id]
