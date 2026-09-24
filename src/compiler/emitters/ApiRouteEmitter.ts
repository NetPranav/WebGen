"use client";

/**
 * ============================================================================
 * API ROUTE EMITTER (NEXT.JS 15 APP ROUTER REST & LOGIC ENDPOINTS)
 * ============================================================================
 * Compiles database collection schemas and API-tagged Blueprint graphs into
 * production Next.js 15 App Router route handlers (`app/api/.../route.ts`).
 * Architecture Ref: ROADMAP.md §Sub-Phase 6.2 & DETAILED_ROADMAP.md §19.2
 * ============================================================================
 */

import { CollectionSchema } from "@/core/types/database";
import { BlueprintGraph } from "@/core/ast/ASTManager";
import { ApiRouteEmitterOptions, EmittedFile } from "@/core/types/compiler";
import { LogicFlowEmitter } from "./LogicFlowEmitter";

export class ApiRouteEmitter {
  /**
   * Generates a collection-level REST route handler (`app/api/[collection]/route.ts`)
   * supporting GET (list/filter/paginate) and POST (create).
   */
  public static emitCollectionRoute(
    schema: CollectionSchema,
    options?: ApiRouteEmitterOptions
  ): EmittedFile {
    const colName = schema.name;
    const colLower = colName.charAt(0).toLowerCase() + colName.slice(1);
    const prismaPath = options?.prismaImportPath || "@/lib/prisma";
    const defaultLimit = options?.defaultLimit || 50;

    const lines: string[] = [];

    lines.push("/* ==========================================================================");
    lines.push(` * NEXT.JS 15 API ROUTE: /api/${colLower}`);
    lines.push(` * Collection: ${colName} (${schema.displayName})`);
    lines.push(" * WebAPPBuilder Visual Compiler — Next.js 15 App Router & Prisma ORM");
    lines.push(" * ========================================================================== */");
    lines.push("");

    lines.push('import { NextRequest, NextResponse } from "next/server";');
    lines.push(`import { prisma } from "${prismaPath}";`);
    lines.push("");

    // 1. GET /api/[collection]
    lines.push("/**");
    lines.push(` * GET /api/${colLower} — Query, filter, and paginate ${colName} records`);
    lines.push(" */");
    lines.push("export async function GET(request: NextRequest) {");
    lines.push("  try {");
    lines.push("    const { searchParams } = new URL(request.url);");
    lines.push(`    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "${defaultLimit}", 10)));`);
    lines.push('    const skip = Math.max(0, parseInt(searchParams.get("skip") || "0", 10));');
    lines.push('    const orderByField = searchParams.get("orderBy") || undefined;');
    lines.push('    const orderDirection = searchParams.get("order") === "desc" ? "desc" : "asc";');
    lines.push("");
    lines.push(`    const records = await prisma.${colLower}.findMany({`);
    lines.push("      take: limit,");
    lines.push("      skip: skip,");
    lines.push("      orderBy: orderByField ? { [orderByField]: orderDirection } : undefined,");
    lines.push("    });");
    lines.push("");
    lines.push("    return NextResponse.json(records, { status: 200 });");
    lines.push("  } catch (error: any) {");
    lines.push(`    console.error("[API:GET /api/${colLower}] Error:", error);`);
    lines.push("    return NextResponse.json(");
    lines.push('      { error: "Failed to fetch records", details: error?.message },');
    lines.push("      { status: 500 }");
    lines.push("    );");
    lines.push("  }");
    lines.push("}");
    lines.push("");

    // 2. POST /api/[collection]
    lines.push("/**");
    lines.push(` * POST /api/${colLower} — Create a new ${colName} record`);
    lines.push(" */");
    lines.push("export async function POST(request: NextRequest) {");
    lines.push("  try {");
    lines.push("    const body = await request.json();");
    lines.push("    if (!body || typeof body !== 'object') {");
    lines.push("      return NextResponse.json(");
    lines.push("        { error: 'Invalid JSON request body' },");
    lines.push("        { status: 400 }");
    lines.push("      );");
    lines.push("    }");
    lines.push("");
    lines.push(`    const newRecord = await prisma.${colLower}.create({`);
    lines.push("      data: body,");
    lines.push("    });");
    lines.push("");
    lines.push("    return NextResponse.json(newRecord, { status: 201 });");
    lines.push("  } catch (error: any) {");
    lines.push(`    console.error("[API:POST /api/${colLower}] Error:", error);`);
    lines.push("    return NextResponse.json(");
    lines.push('      { error: "Failed to create record", details: error?.message },');
    lines.push("      { status: 500 }");
    lines.push("    );");
    lines.push("  }");
    lines.push("}");
    lines.push("");

    return {
      path: `app/api/${colLower}/route.ts`,
      content: lines.join("\n"),
      language: "typescript",
      type: "api",
    };
  }

  /**
   * Generates an item-level REST route handler (`app/api/[collection]/[id]/route.ts`)
   * supporting GET (by ID), PUT (update by ID), and DELETE (remove by ID).
   */
  public static emitItemRoute(
    schema: CollectionSchema,
    options?: ApiRouteEmitterOptions
  ): EmittedFile {
    const colName = schema.name;
    const colLower = colName.charAt(0).toLowerCase() + colName.slice(1);
    const prismaPath = options?.prismaImportPath || "@/lib/prisma";

    const lines: string[] = [];

    lines.push("/* ==========================================================================");
    lines.push(` * NEXT.JS 15 API ROUTE: /api/${colLower}/[id]`);
    lines.push(` * Collection Item: ${colName} (${schema.displayName})`);
    lines.push(" * WebAPPBuilder Visual Compiler — Next.js 15 App Router & Prisma ORM");
    lines.push(" * ========================================================================== */");
    lines.push("");

    lines.push('import { NextRequest, NextResponse } from "next/server";');
    lines.push(`import { prisma } from "${prismaPath}";`);
    lines.push("");

    // Helper to resolve params
    lines.push("interface RouteContext {");
    lines.push("  params: Promise<{ id: string }>;");
    lines.push("}");
    lines.push("");

    // 1. GET by ID
    lines.push("export async function GET(request: NextRequest, context: RouteContext) {");
    lines.push("  try {");
    lines.push("    const { id } = await context.params;");
    lines.push(`    const record = await prisma.${colLower}.findUnique({ where: { id } });`);
    lines.push("    if (!record) {");
    lines.push('      return NextResponse.json({ error: "Record not found" }, { status: 404 });');
    lines.push("    }");
    lines.push("    return NextResponse.json(record, { status: 200 });");
    lines.push("  } catch (error: any) {");
    lines.push(`    console.error("[API:GET /api/${colLower}/:id] Error:", error);`);
    lines.push('    return NextResponse.json({ error: "Internal server error" }, { status: 500 });');
    lines.push("  }");
    lines.push("}");
    lines.push("");

    // 2. PUT update by ID
    lines.push("export async function PUT(request: NextRequest, context: RouteContext) {");
    lines.push("  try {");
    lines.push("    const { id } = await context.params;");
    lines.push("    const body = await request.json();");
    lines.push(`    const updated = await prisma.${colLower}.update({`);
    lines.push("      where: { id },");
    lines.push("      data: body,");
    lines.push("    });");
    lines.push("    return NextResponse.json(updated, { status: 200 });");
    lines.push("  } catch (error: any) {");
    lines.push(`    console.error("[API:PUT /api/${colLower}/:id] Error:", error);`);
    lines.push('    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });');
    lines.push("  }");
    lines.push("}");
    lines.push("");

    // 3. DELETE by ID
    lines.push("export async function DELETE(request: NextRequest, context: RouteContext) {");
    lines.push("  try {");
    lines.push("    const { id } = await context.params;");
    lines.push(`    await prisma.${colLower}.delete({ where: { id } });`);
    lines.push("    return NextResponse.json({ success: true }, { status: 200 });");
    lines.push("  } catch (error: any) {");
    lines.push(`    console.error("[API:DELETE /api/${colLower}/:id] Error:", error);`);
    lines.push('    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });');
    lines.push("  }");
    lines.push("}");
    lines.push("");

    return {
      path: `app/api/${colLower}/[id]/route.ts`,
      content: lines.join("\n"),
      language: "typescript",
      type: "api",
    };
  }

  /**
   * Compiles an API-tagged custom Blueprint graph into a dedicated Next.js App Router route.
   */
  public static emitCustomApiRoute(
    endpointSlug: string,
    graph: BlueprintGraph,
    options?: ApiRouteEmitterOptions
  ): EmittedFile {
    const cleanSlug = endpointSlug.replace(/^\/api\//, "").replace(/^\//, "");
    const fnName = LogicFlowEmitter.toFunctionName(graph.name);

    const lines: string[] = [];

    lines.push("/* ==========================================================================");
    lines.push(` * CUSTOM API ROUTE: /api/${cleanSlug}`);
    lines.push(` * Blueprint Graph: ${graph.name}`);
    lines.push(" * WebAPPBuilder Visual Compiler — Next.js 15 App Router");
    lines.push(" * ========================================================================== */");
    lines.push("");

    lines.push('import { NextRequest, NextResponse } from "next/server";');
    lines.push(`import { ${fnName} } from "@/server/logic/${fnName}";`);
    lines.push("");

    lines.push("export async function POST(request: NextRequest) {");
    lines.push("  try {");
    lines.push("    const body = await request.json().catch(() => ({}));");
    lines.push(`    const result = await ${fnName}(body);`);
    lines.push("    return NextResponse.json(result ?? { success: true }, { status: 200 });");
    lines.push("  } catch (error: any) {");
    lines.push(`    console.error("[API:POST /api/${cleanSlug}] Error:", error);`);
    lines.push("    return NextResponse.json(");
    lines.push('      { error: "Endpoint execution failed", message: error?.message },');
    lines.push("      { status: 500 }");
    lines.push("    );");
    lines.push("  }");
    lines.push("}");
    lines.push("");

    return {
      path: `app/api/${cleanSlug}/route.ts`,
      content: lines.join("\n"),
      language: "typescript",
      type: "api",
    };
  }
}
