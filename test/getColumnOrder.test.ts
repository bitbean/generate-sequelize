import { describe, expect, it, vi } from "vitest";
import { Sequelize } from "sequelize";
import { getColumnOrder } from "../src/getColumnOrder";
import { GeneratorOptions } from "../src/types";

describe("getColumnOrder", () => {
  it("loads PostgreSQL ordinal positions for the configured schema", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        table_schema: "app",
        table_name: "users",
        column_name: "email",
        ordinal_position: "3",
      },
      {
        table_schema: "app",
        table_name: "users",
        column_name: "id",
        ordinal_position: "1",
      },
    ]);
    const sequelize = { query } as unknown as Sequelize;

    const order = await getColumnOrder(sequelize, {
      dialect: "postgres",
      directory: "models",
      schema: "app",
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("table_schema = :schema"),
      expect.objectContaining({ replacements: { schema: "app" } }),
    );
    expect(order?.get("app.users")?.get("id")).toBe(1);
    expect(order?.get("users")?.get("email")).toBe(3);
  });

  it("loads all non-system PostgreSQL schemas when none is configured", async () => {
    const query = vi.fn().mockResolvedValue([]);

    await getColumnOrder(
      { query } as unknown as Sequelize,
      {
        dialect: "postgres",
        directory: "models",
      },
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(
        "table_schema NOT IN ('pg_catalog', 'information_schema')",
      ),
      expect.objectContaining({ replacements: undefined }),
    );
  });

  it("does not query column metadata for other dialects", async () => {
    const query = vi.fn();

    const order = await getColumnOrder(
      { query } as unknown as Sequelize,
      {
        dialect: "mysql",
        directory: "models",
      } as GeneratorOptions,
    );

    expect(order).toBeUndefined();
    expect(query).not.toHaveBeenCalled();
  });
});
