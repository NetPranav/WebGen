import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PrismaSchemaEmitter } from "../emitters/PrismaSchemaEmitter";
import { CollectionSchema } from "../../core/types/database";

describe("Sub-Phase 6.2: PrismaSchemaEmitter (schema.prisma & SQL Migrations)", () => {
  const sampleSchemas: Record<string, CollectionSchema> = {
    Users: {
      id: "col_users",
      name: "Users",
      displayName: "Users",
      fields: {
        id: { id: "f_uid", name: "id", type: "String", isPrimaryKey: true },
        email: { id: "f_email", name: "email", type: "String", isUnique: true },
        name: { id: "f_name", name: "name", type: "String", isNullable: true },
        role: {
          id: "f_role",
          name: "role",
          type: "Enum",
          enumValues: ["USER", "ADMIN", "EDITOR"],
          defaultValue: "USER",
        },
        createdAt: { id: "f_created", name: "createdAt", type: "DateTime", defaultValue: "now()" },
        updatedAt: { id: "f_updated", name: "updatedAt", type: "DateTime" },
      },
    },
    Posts: {
      id: "col_posts",
      name: "Posts",
      displayName: "Blog Posts",
      fields: {
        id: { id: "f_pid", name: "id", type: "String", isPrimaryKey: true },
        title: { id: "f_title", name: "title", type: "String" },
        published: { id: "f_pub", name: "published", type: "Boolean", defaultValue: false },
        authorId: {
          id: "f_author_rel",
          name: "author",
          type: "Relation",
          relation: {
            targetCollection: "Users",
            foreignKey: "authorId",
            referencesField: "id",
            cardinality: "1:N",
            onDelete: "CASCADE",
          },
        },
      },
      indexes: [
        {
          name: "title_idx",
          fields: ["title"],
          isUnique: false,
        },
      ],
    },
  };

  // --------------------------------------------------------------------------
  // 1. Prisma Schema Generation
  // --------------------------------------------------------------------------
  it("generates production schema.prisma with models, enums, and relations", () => {
    const file = PrismaSchemaEmitter.emitSchema(sampleSchemas, {
      provider: "postgresql",
    });

    assert.equal(file.language, "typescript");
    assert.equal(file.path, "prisma/schema.prisma");

    // Datasource & Generator
    assert.match(file.content, /datasource db \{/);
    assert.match(file.content, /provider = "postgresql"/);
    assert.match(file.content, /url\s+= env\("DATABASE_URL"\)/);
    assert.match(file.content, /generator client \{/);

    // Enum
    assert.match(file.content, /enum UsersRole \{/);
    assert.match(file.content, /USER/);
    assert.match(file.content, /ADMIN/);

    // Users Model
    assert.match(file.content, /model Users \{/);
    assert.match(file.content, /id\s+String\s+@id @default\(uuid\(\)\)/);
    assert.match(file.content, /email\s+String\s+@unique/);
    assert.match(file.content, /name\s+String\?/);
    assert.match(file.content, /updatedAt\s+DateTime\s+@updatedAt/);

    // Posts Model & Relation
    assert.match(file.content, /model Posts \{/);
    assert.match(file.content, /published\s+Boolean\s+@default\(false\)/);
    assert.match(
      file.content,
      /@relation\(fields: \[authorId\], references: \[id\], onDelete: Cascade\)/
    );
    assert.match(file.content, /@@index\(\[title\]\)/);
  });

  // --------------------------------------------------------------------------
  // 2. Raw SQL Migration DDL Generation
  // --------------------------------------------------------------------------
  it("generates raw SQL DDL migration statements with primary keys, indexes, and FKs", () => {
    const file = PrismaSchemaEmitter.emitSqlMigration(sampleSchemas, {
      provider: "postgresql",
    });

    assert.equal(file.path, "prisma/migrations/0_init/migration.sql");

    // Table creation
    assert.match(file.content, /CREATE TABLE "Users" \(/);
    assert.match(file.content, /CONSTRAINT "Users_pkey" PRIMARY KEY \("id"\)/);

    assert.match(file.content, /CREATE TABLE "Posts" \(/);
    assert.match(file.content, /CONSTRAINT "Posts_pkey" PRIMARY KEY \("id"\)/);

    // Unique index
    assert.match(file.content, /CREATE UNIQUE INDEX "Users_email_key" ON "Users"\("email"\);/);

    // Index
    assert.match(file.content, /CREATE INDEX "Posts_title_idx_idx" ON "Posts"\("title"\);/);

    // Foreign key constraint
    assert.match(
      file.content,
      /ALTER TABLE "Posts" ADD CONSTRAINT "Posts_authorId_fkey" FOREIGN KEY \("authorId"\) REFERENCES "Users"\("id"\) ON DELETE CASCADE/
    );
  });
});
