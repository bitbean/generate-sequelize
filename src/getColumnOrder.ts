import { QueryTypes, Sequelize } from "sequelize";
import { GeneratorOptions } from "./types";

export type ColumnOrder = Map<string, Map<string, number>>;

type PostgresColumn = {
  table_schema: string;
  table_name: string;
  column_name: string;
  ordinal_position: number;
};

export async function getColumnOrder(
  sequelize: Sequelize,
  options: GeneratorOptions,
): Promise<ColumnOrder | undefined> {
  if (options.dialect !== "postgres") return;

  const schemaFilter = options.schema
    ? "table_schema = :schema"
    : "table_schema NOT IN ('pg_catalog', 'information_schema')";
  const rows = await sequelize.query<PostgresColumn>(
    `SELECT table_schema, table_name, column_name, ordinal_position
FROM information_schema.columns
WHERE ${schemaFilter}
ORDER BY table_schema, table_name, ordinal_position`,
    {
      replacements: options.schema ? { schema: options.schema } : undefined,
      type: QueryTypes.SELECT,
    },
  );

  const order: ColumnOrder = new Map();
  for (const row of rows) {
    const qualifiedTableName = `${row.table_schema}.${row.table_name}`;
    const qualifiedColumns =
      order.get(qualifiedTableName) ??
      order.set(qualifiedTableName, new Map()).get(qualifiedTableName)!;
    qualifiedColumns.set(row.column_name, Number(row.ordinal_position));

    const columns =
      order.get(row.table_name) ??
      order.set(row.table_name, new Map()).get(row.table_name)!;
    columns.set(row.column_name, Number(row.ordinal_position));
  }

  return order;
}
