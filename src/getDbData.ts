import {
  ColumnData,
  GeneratorOptions,
  DBData,
  ReferenceData,
  RelationData,
  TableData,
} from "./types";
import { TableData as TData } from "sequelize-auto";
import { TSField } from "sequelize-auto/types";
import { getDataType, getTsType, recase, getDefaultValue } from "./utils";
import { IndexesOptions, ModelAttributeColumnOptions } from "sequelize";

export default function getTableData(
  tableData: TData,
  options: GeneratorOptions,
): DBData {
  const db: DBData = new Map();
  Object.entries(tableData.tables).forEach(([key, table]) => {
    if (key.toLowerCase().includes("sequelizemeta")) return;
    const split = key.split(".");
    const [schema, tableName] =
      split.length > 1 ? split : [undefined, split[0]!];
    const modelName = recase(tableName, options.caseModel, options.singularize);
    const fileName = recase(tableName, options.caseFile, options.singularize);
    const columnsData: TableData["columns"] = new Map();
    Object.entries(table).forEach(([field, col]) => {
      const {
        allowNull,
        autoIncrement,
        comment,
        defaultValue,
        elementType,
        primaryKey,
        special,
        type,
      } = col as TSField;
      const autoI =
        autoIncrement || !!(primaryKey && defaultValue) ? true : undefined;
      const unique = getUnique(field, tableData.indexes?.[key]);
      const typeStr = getDataType(type, special, elementType);
      const tsType = getTsType(type, special, elementType);
      const defaultVal = autoI
        ? undefined
        : getDefaultValue(defaultValue, tsType, typeStr);
      const fk = getFk(field, tableData?.foreignKeys?.[key]);
      const references = fk
        ? {
            model: fk.foreignSources.target_table,
            key: fk.foreignSources.target_column,
          }
        : undefined;
      const refData: ReferenceData | undefined = references
        ? {
            modelName: recase(references.model!, options.caseModel),
            key: references.key!,
            tableName: references.model!,
            fileName: recase(references.model!, options.caseFile),
          }
        : undefined;
      const name = recase(field, options.caseProp);
      const definition: ModelAttributeColumnOptions = {
        type: typeStr,
        allowNull: !!allowNull,
        defaultValue: defaultVal,
        autoIncrement: autoI,
        comment: comment ?? undefined,
        field: name === field ? undefined : field,
        primaryKey: primaryKey || undefined,
        unique,
        references,
      };
      const colData: ColumnData = {
        definition,
        field,
        name,
        tableName,
        tableModelName: modelName,
        tsType,
        refData,
      };
      columnsData.set(field, colData);
    });
    const td: TableData = {
      columns: columnsData,
      fileName,
      modelName,
      relations: new Map(),
      schema,
      tableName,
      indexes: [],
    };

    tableData.indexes[key]?.forEach((index) => {
      const indData: IndexesOptions = {
        name: index.name,
        unique: index.unique || undefined,
        using: index.type,
        fields: index.fields.map(({ order, attribute }) =>
          order === "ASC" || order === "DESC"
            ? {
                name: attribute,
                order,
              }
            : attribute,
        ),
      };
      td.indexes.push(indData);
    });
    db.set(tableName, td);
  });

  tableData.relations.forEach((rel) => {
    const {
      childModel,
      childProp,
      childTable,
      isOne,
      parentId,
      parentModel,
      parentProp,
      parentTable,
    } = rel;
    const [childTableName, parentTableName] = [
      childTable.split(".").pop()!,
      parentTable.split(".").pop()!,
    ];
    const childData = db.get(childTableName)!;
    const fk = [...childData.columns.values()].find(
      (c) => c.name === parentId,
    )!;
    const optional = fk.definition.allowNull;
    const parentData: RelationData = {
      foreignKey: parentId,
      targetFileName: recase(
        childTableName,
        options.caseFile,
        options.singularize,
      ),
      targetTableName: childTableName,
      targetName: childModel,
      type: isOne ? "hasOne" : "hasMany",
      optional: isOne && optional,
    };
    const childRelData: RelationData = {
      foreignKey: parentId,
      targetFileName: recase(
        parentTableName,
        options.caseFile,
        options.singularize,
      ),
      targetTableName: parentTableName,
      targetName: parentModel,
      type: "belongsTo",
      optional: optional,
    };
    childData.relations.set(parentProp, childRelData);
    db.get(parentTableName)!.relations.set(childProp, parentData);
  });

  return db;
}

function getFk(name: string, foreignKeys?: TData["foreignKeys"][string]) {
  if (foreignKeys?.[name]?.isForeignKey) return foreignKeys[name];
}

function getUnique(name: string, indexes?: TData["indexes"][string]) {
  const colIndex = indexes?.find(
    (i) =>
      !i.primary && i.unique && i.fields?.find((f) => f.attribute === name),
  );
  if (!colIndex) return undefined;
  if (colIndex?.fields?.length === 1) {
    return true;
  }
  return colIndex.name;
}
