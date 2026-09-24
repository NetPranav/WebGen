"use client";

/**
 * ============================================================================
 * PRISMA SCHEMA & SQL MIGRATION EMITTER
 * ============================================================================
 * Compiles visual database schemas (CollectionSchema) into standard
 * `schema.prisma` definitions and raw SQL DDL migration files.
 * Architecture Ref: ROADMAP.md §Sub-Phase 6.2 & SCHEMA_REFERENCE.md §13.1
 * ============================================================================
 */

import { CollectionSchema, DatabaseField, DatabaseFieldType } from "@/core/types/database";
import { PrismaSchemaEmitterOptions, EmittedFile } from "@/core/types/compiler";

export class PrismaSchemaEmitter {
  /**
   * Translates visual field types into Prisma native scalar types.
   */
  public static mapPrismaScalarType(
    field: DatabaseField,
    collectionName: string
  ): string {
    switch (field.type) {
      case "String":
        return "String";
      case "Int":
        return "Int";
      case "Float":
        return "Float";
      case "Boolean":
        return "Boolean";
      case "DateTime":
        return "DateTime";
      case "JSON":
        return "Json";
      case "Enum":
        return `${collectionName}${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`;
      case "Relation":
        return field.relation?.targetCollection || "String";
      default:
        return "String";
    }
  }

  /**
   * Translates visual field types into standard SQL column data types.
   */
  public static mapSqlColumnType(
    field: DatabaseField,
    provider: "postgresql" | "sqlite" | "mysql" = "postgresql"
  ): string {
    switch (field.type) {
      case "String":
        return provider === "sqlite" ? "TEXT" : "VARCHAR(255)";
      case "Int":
        return provider === "sqlite" && field.isPrimaryKey ? "INTEGER" : "INT";
      case "Float":
        return provider === "sqlite" ? "REAL" : "DOUBLE PRECISION";
      case "Boolean":
        return provider === "sqlite" ? "INTEGER" : "BOOLEAN";
      case "DateTime":
        return provider === "sqlite" ? "DATETIME" : "TIMESTAMP(3)";
      case "JSON":
        return provider === "sqlite" ? "TEXT" : "JSONB";
      case "Enum":
        return "VARCHAR(100)";
      case "Relation":
        return provider === "sqlite" ? "TEXT" : "VARCHAR(255)";
      default:
        return "TEXT";
    }
  }

  /**
   * Generates a complete `schema.prisma` file from a map of CollectionSchemas.
   */
  public static emitSchema(
    schemas: Record<string, CollectionSchema>,
    options?: PrismaSchemaEmitterOptions
  ): EmittedFile {
    const provider = options?.provider || "postgresql";
    const urlEnvVar = options?.urlEnvVar || "DATABASE_URL";
    const clientGen = options?.clientGenerator || "prisma-client-js";

    const lines: string[] = [];

    // Header
    lines.push("// ==========================================================================");
    lines.push("// PRISMA SCHEMA DEFINITIONS");
    lines.push("// WebAPPBuilder Visual Compiler — Next.js 15 & Prisma ORM");
    lines.push("// ==========================================================================");
    lines.push("");

    // Datasource & Generator blocks
    lines.push("datasource db {");
    lines.push(`  provider = "${provider}"`);
    lines.push(`  url      = env("${urlEnvVar}")`);
    lines.push("}");
    lines.push("");
    lines.push("generator client {");
    lines.push(`  provider = "${clientGen}"`);
    lines.push("}");
    lines.push("");

    // Collect and emit Enums
    const enumsToEmit: { name: string; values: string[] }[] = [];
    for (const [colName, schema] of Object.entries(schemas)) {
      for (const [fieldName, field] of Object.entries(schema.fields)) {
        if (field.type === "Enum" && field.enumValues && field.enumValues.length > 0) {
          const enumName = `${colName}${fieldName.charAt(0).toUpperCase() + field.name.slice(1)}`;
          enumsToEmit.push({ name: enumName, values: field.enumValues });
        }
      }
    }

    if (enumsToEmit.length > 0) {
      lines.push("// --- Enums ---");
      for (const en of enumsToEmit) {
        lines.push(`enum ${en.name} {`);
        for (const v of en.values) {
          lines.push(`  ${v}`);
        }
        lines.push("}");
        lines.push("");
      }
    }

    // Models
    lines.push("// --- Models ---");
    for (const [colName, schema] of Object.entries(schemas)) {
      lines.push(`model ${colName} {`);

      const fieldLines: string[] = [];
      const relationHolders: string[] = [];

      for (const field of Object.values(schema.fields)) {
        let typeName = PrismaSchemaEmitter.mapPrismaScalarType(field, colName);
        const isOptional = field.isNullable && !field.isPrimaryKey;
        if (isOptional && field.type !== "Relation") {
          typeName += "?";
        }

        const attributes: string[] = [];

        // Primary key
        if (field.isPrimaryKey) {
          attributes.push("@id");
          if (field.isAutoIncrement || field.type === "Int") {
            attributes.push("@default(autoincrement())");
          } else if (field.type === "String") {
            attributes.push("@default(uuid())");
          }
        }

        // Unique
        if (field.isUnique && !field.isPrimaryKey) {
          attributes.push("@unique");
        }

        // Default value
        if (field.defaultValue !== undefined && !field.isPrimaryKey) {
          if (typeof field.defaultValue === "string") {
            attributes.push(`@default("${field.defaultValue}")`);
          } else if (typeof field.defaultValue === "number" || typeof field.defaultValue === "boolean") {
            attributes.push(`@default(${field.defaultValue})`);
          } else if (field.defaultValue === "now()") {
            attributes.push("@default(now())");
          }
        }

        // UpdatedAt
        if (field.name === "updatedAt" && field.type === "DateTime") {
          attributes.push("@updatedAt");
        }

        // Relation field attribute
        if (field.type === "Relation" && field.relation) {
          const rel = field.relation;
          const onDeleteClause = rel.onDelete
            ? rel.onDelete === "CASCADE"
              ? "Cascade"
              : rel.onDelete === "SET_NULL"
              ? "SetNull"
              : "Restrict"
            : "Cascade";

          const relAttr = `@relation(fields: [${rel.foreignKey}], references: [${rel.referencesField}], onDelete: ${onDeleteClause})`;
          attributes.push(relAttr);
        }

        const attrStr = attributes.length > 0 ? " " + attributes.join(" ") : "";
        fieldLines.push(`  ${field.name.padEnd(20)} ${typeName.padEnd(16)}${attrStr}`);
      }

      lines.push(fieldLines.join("\n"));

      // Composite indexes or uniques
      if (schema.indexes && schema.indexes.length > 0) {
        lines.push("");
        for (const idx of schema.indexes) {
          const fieldsStr = idx.fields.join(", ");
          if (idx.isUnique) {
            lines.push(`  @@unique([${fieldsStr}])`);
          } else {
            lines.push(`  @@index([${fieldsStr}])`);
          }
        }
      }

      lines.push("}");
      lines.push("");
    }

    return {
      path: "prisma/schema.prisma",
      content: lines.join("\n"),
      language: "typescript",
      type: "schema",
    };
  }

  /**
   * Generates a raw SQL DDL migration file (`migration.sql`) from CollectionSchemas.
   */
  public static emitSqlMigration(
    schemas: Record<string, CollectionSchema>,
    options?: PrismaSchemaEmitterOptions
  ): EmittedFile {
    const provider = options?.provider || "postgresql";
    const lines: string[] = [];

    lines.push("-- ==========================================================================");
    lines.push("-- AUTOMATICALLY GENERATED INITIAL SQL MIGRATION");
    lines.push(`-- Dialect: ${provider.toUpperCase()}`);
    lines.push("-- WebAPPBuilder Visual Compiler — Next.js 15 & Prisma ORM");
    lines.push("-- ==========================================================================");
    lines.push("");

    const foreignKeysToApply: string[] = [];

    for (const [colName, schema] of Object.entries(schemas)) {
      lines.push(`-- CreateTable "${colName}"`);
      lines.push(`CREATE TABLE "${colName}" (`);

      const colDefs: string[] = [];
      const primaryKeys: string[] = [];

      for (const field of Object.values(schema.fields)) {
        if (field.type === "Relation") continue; // Virtual relation in SQL

        const colType = PrismaSchemaEmitter.mapSqlColumnType(field, provider);
        const nullability = field.isNullable && !field.isPrimaryKey ? "" : " NOT NULL";

        let defaultClause = "";
        if (field.defaultValue !== undefined && !field.isPrimaryKey) {
          if (typeof field.defaultValue === "string") {
            defaultClause = ` DEFAULT '${field.defaultValue}'`;
          } else if (typeof field.defaultValue === "number" || typeof field.defaultValue === "boolean") {
            defaultClause = ` DEFAULT ${field.defaultValue}`;
          } else if (field.defaultValue === "now()") {
            defaultClause = " DEFAULT CURRENT_TIMESTAMP";
          }
        }

        if (field.isPrimaryKey) {
          primaryKeys.push(`"${field.name}"`);
        }

        colDefs.push(`    "${field.name}" ${colType}${nullability}${defaultClause}`);
      }

      if (primaryKeys.length > 0) {
        colDefs.push(`    CONSTRAINT "${colName}_pkey" PRIMARY KEY (${primaryKeys.join(", ")})`);
      }

      lines.push(colDefs.join(",\n"));
      lines.push(");");
      lines.push("");

      // Unique and standard indexes
      for (const field of Object.values(schema.fields)) {
        if (field.isUnique && !field.isPrimaryKey) {
          lines.push(`CREATE UNIQUE INDEX "${colName}_${field.name}_key" ON "${colName}"("${field.name}");`);
        }
        if (field.type === "Relation" && field.relation) {
          const rel = field.relation;
          const fkName = `${colName}_${rel.foreignKey}_fkey`;
          const onDelete = rel.onDelete || "CASCADE";
          foreignKeysToApply.push(
            `ALTER TABLE "${colName}" ADD CONSTRAINT "${fkName}" FOREIGN KEY ("${rel.foreignKey}") REFERENCES "${rel.targetCollection}"("${rel.referencesField}") ON DELETE ${onDelete} ON UPDATE CASCADE;`
          );
        }
      }

      if (schema.indexes && schema.indexes.length > 0) {
        for (const idx of schema.indexes) {
          const quotedFields = idx.fields.map((f) => `"${f}"`).join(", ");
          const uniqueStr = idx.isUnique ? "UNIQUE " : "";
          lines.push(`CREATE ${uniqueStr}INDEX "${colName}_${idx.name}_idx" ON "${colName}"(${quotedFields});`);
        }
      }
      lines.push("");
    }

    // Apply foreign keys
    if (foreignKeysToApply.length > 0) {
      lines.push("-- AddForeignKey Constraints");
      for (const fk of foreignKeysToApply) {
        lines.push(fk);
      }
      lines.push("");
    }

    return {
      path: "prisma/migrations/0_init/migration.sql",
      content: lines.join("\n"),
      language: "typescript",
      type: "schema",
    };
  }
}
