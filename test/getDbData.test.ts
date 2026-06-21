import { describe, it, expect } from "vitest";
import { TableData as TData } from "sequelize-auto";
import getTableData from "../src/getDbData";
import { GeneratorOptions } from "../src/types";

/**
 * Regression tests for getDbData relation handling.
 *
 * These reproduce the crashes that occurred when tables were excluded via
 * `skipTables`/`tables`: sequelize-auto still emits `relations` that reference
 * the excluded tables, and the FK column lookup can come up empty. Previously
 * getDbData used non-null assertions (`db.get(...)!`, `find(...)!`) and threw:
 *   - "Cannot read properties of undefined (reading 'definition')"
 *   - "Cannot read properties of undefined (reading 'relations')"
 */

const options: GeneratorOptions = {
  dialect: "postgres",
  directory: "out",
  caseModel: "p",
  caseFile: "p",
  caseProp: "o",
  singularize: false,
};

// Minimal column descriptor matching sequelize-auto's TSField shape.
function col(type: string, overrides: Record<string, unknown> = {}) {
  return {
    type,
    allowNull: true,
    primaryKey: false,
    autoIncrement: false,
    defaultValue: null,
    comment: null,
    special: [],
    elementType: "",
    ...overrides,
  };
}

// Build a TData with the given tables and relations; empty fk/index metadata.
function makeTData(
  tables: TData["tables"],
  relations: TData["relations"],
): TData {
  return {
    tables,
    foreignKeys: {},
    indexes: {},
    hasTriggerTables: {},
    relations,
  } as unknown as TData;
}

describe("getTableData relations", () => {
  it("wires belongsTo + hasMany for a normal relation between present tables", () => {
    const td = makeTData(
      {
        users: { id: col("integer", { primaryKey: true }) },
        posts: {
          id: col("integer", { primaryKey: true }),
          user_id: col("integer"),
        },
      },
      [
        {
          parentTable: "users",
          parentModel: "User",
          parentProp: "user",
          parentId: "user_id",
          childTable: "posts",
          childModel: "Post",
          childProp: "posts",
          isOne: false,
          isM2M: false,
        },
      ],
    );

    const db = getTableData(td, options);

    const posts = db.get("posts")!;
    const users = db.get("users")!;
    expect(posts.relations.get("user")?.type).toBe("belongsTo");
    expect(posts.relations.get("user")?.targetTableName).toBe("users");
    expect(users.relations.get("posts")?.type).toBe("hasMany");
    expect(users.relations.get("posts")?.targetTableName).toBe("posts");
  });

  it("does not throw when a relation references a skipped/absent parent table", () => {
    // `source_chunks` is excluded (not in tables), but a relation to it remains.
    const td = makeTData(
      {
        source_citations: {
          id: col("integer", { primaryKey: true }),
          chunk_id: col("integer"),
        },
      },
      [
        {
          parentTable: "source_chunks",
          parentModel: "SourceChunk",
          parentProp: "sourceChunk",
          parentId: "chunk_id",
          childTable: "source_citations",
          childModel: "SourceCitation",
          childProp: "sourceCitations",
          isOne: false,
          isM2M: false,
        },
      ],
    );

    let db!: ReturnType<typeof getTableData>;
    expect(() => {
      db = getTableData(td, options);
    }).not.toThrow();

    // The present table is still emitted; no bogus relation to the skipped one.
    expect(db.get("source_citations")).toBeDefined();
    expect(db.has("source_chunks")).toBe(false);
    expect(db.get("source_citations")!.relations.size).toBe(0);
  });

  it("does not throw when a relation references a skipped/absent child table", () => {
    const td = makeTData(
      { users: { id: col("integer", { primaryKey: true }) } },
      [
        {
          parentTable: "users",
          parentModel: "User",
          parentProp: "user",
          parentId: "user_id",
          childTable: "source_chunks",
          childModel: "SourceChunk",
          childProp: "sourceChunks",
          isOne: false,
          isM2M: false,
        },
      ],
    );

    let db!: ReturnType<typeof getTableData>;
    expect(() => {
      db = getTableData(td, options);
    }).not.toThrow();
    expect(db.get("users")!.relations.size).toBe(0);
  });

  it("does not throw when the FK column is missing from the child table", () => {
    // Composite-PK join tables surfaced relations whose parentId did not map
    // to a single resolvable column, leaving the FK lookup empty.
    const td = makeTData(
      {
        users: { id: col("integer", { primaryKey: true }) },
        memberships: {
          user_id: col("integer", { primaryKey: true }),
          org_id: col("integer", { primaryKey: true }),
        },
      },
      [
        {
          parentTable: "users",
          parentModel: "User",
          parentProp: "user",
          parentId: "missing_fk_column",
          childTable: "memberships",
          childModel: "Membership",
          childProp: "memberships",
          isOne: false,
          isM2M: false,
        },
      ],
    );

    let db!: ReturnType<typeof getTableData>;
    expect(() => {
      db = getTableData(td, options);
    }).not.toThrow();
    // Relation skipped because the FK column could not be resolved.
    expect(db.get("memberships")!.relations.size).toBe(0);
    expect(db.get("users")!.relations.size).toBe(0);
  });
});
