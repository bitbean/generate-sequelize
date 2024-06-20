import type { ModelAttributeColumnOptions, IndexesOptions } from "sequelize";
import type { AutoOptions } from "sequelize-auto/types";
import type { Options } from "prettier";
export interface CustomOptions
  extends Omit<
    AutoOptions,
    | "additional"
    | "closeConnectionAutomatically"
    | "indentation"
    | "lang"
    | "noIndexes"
  > {
  targetLib?: "sequelize" | "sequelize-typescript" | "@sequelize/core";
  replacements?: [RegExp, string][];
  joinTables?: string[];
  prettierOptions?: Options;
}

export type ReferenceData = {
  modelName: string;
  tableName: string;
  key: string;
  fileName: string;
};

export type ColumnData = {
  definition: ModelAttributeColumnOptions;
  tsType: string;
  name: string;
  tableName: string;
  tableModelName: string;
  tsTypeOverride?: string;
  field: string;
  refData?: ReferenceData;
};

export type RelationData = {
  targetName: string;
  targetTableName: string;
  targetFileName: string;
  foreignKey: string;
  optional?: boolean;
} & RelMeta;

type RelMeta =
  | {
      type: "belongsTo" | "hasMany" | "hasOne";
    }
  | {
      type: "belongsToMany";
      through: string;
      throughFileName: string;
      otherKey: string;
    };

export type Imports = Map<string, Set<string>>;

export type TableData = {
  modelName: string;
  tableName: string;
  schema?: string;
  columns: Map<string, ColumnData>;
  relations: Map<string, RelationData>;
  fileName: string;
  indexes: IndexesOptions[];
};

export type DBData = Map<string, TableData>;
