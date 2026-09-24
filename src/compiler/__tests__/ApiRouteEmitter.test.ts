import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ApiRouteEmitter } from "../emitters/ApiRouteEmitter";
import { CollectionSchema } from "../../core/types/database";
import { BlueprintGraph } from "../../core/ast/ASTManager";

describe("Sub-Phase 6.2: ApiRouteEmitter (Next.js 15 App Router Endpoints)", () => {
  const sampleSchema: CollectionSchema = {
    id: "col_products",
    name: "Products",
    displayName: "Products",
    fields: {
      id: { id: "f1", name: "id", type: "String", isPrimaryKey: true },
      title: { id: "f2", name: "title", type: "String" },
      price: { id: "f3", name: "price", type: "Float" },
    },
  };

  // --------------------------------------------------------------------------
  // 1. Collection Route (GET list & POST create)
  // --------------------------------------------------------------------------
  it("generates Next.js 15 App Router collection route with GET and POST", () => {
    const file = ApiRouteEmitter.emitCollectionRoute(sampleSchema);

    assert.equal(file.language, "typescript");
    assert.equal(file.path, "app/api/products/route.ts");

    // Imports
    assert.match(file.content, /import \{ NextRequest, NextResponse \} from "next\/server";/);
    assert.match(file.content, /import \{ prisma \} from "@\/lib\/prisma";/);

    // GET handler
    assert.match(file.content, /export async function GET\(request: NextRequest\)/);
    assert.match(file.content, /await prisma\.products\.findMany\(/);
    assert.match(file.content, /NextResponse\.json\(records, \{ status: 200 \}\)/);

    // POST handler
    assert.match(file.content, /export async function POST\(request: NextRequest\)/);
    assert.match(file.content, /const body = await request\.json\(\);/);
    assert.match(file.content, /await prisma\.products\.create\(\{/);
    assert.match(file.content, /NextResponse\.json\(newRecord, \{ status: 201 \}\)/);
  });

  // --------------------------------------------------------------------------
  // 2. Item Route (GET, PUT, DELETE by ID)
  // --------------------------------------------------------------------------
  it("generates item-level route with GET, PUT, and DELETE by ID", () => {
    const file = ApiRouteEmitter.emitItemRoute(sampleSchema);

    assert.equal(file.path, "app/api/products/[id]/route.ts");

    // GET by ID
    assert.match(file.content, /export async function GET\(request: NextRequest, context: RouteContext\)/);
    assert.match(file.content, /await prisma\.products\.findUnique\(\{ where: \{ id \} \}\)/);
    assert.match(file.content, /\{ error: "Record not found" \}, \{ status: 404 \}/);

    // PUT by ID
    assert.match(file.content, /export async function PUT\(request: NextRequest, context: RouteContext\)/);
    assert.match(file.content, /await prisma\.products\.update\(\{/);

    // DELETE by ID
    assert.match(file.content, /export async function DELETE\(request: NextRequest, context: RouteContext\)/);
    assert.match(file.content, /await prisma\.products\.delete\(\{ where: \{ id \} \}\)/);
    assert.match(file.content, /NextResponse\.json\(\{ success: true \}, \{ status: 200 \}\)/);
  });

  // --------------------------------------------------------------------------
  // 3. Custom Blueprint Logic Endpoint
  // --------------------------------------------------------------------------
  it("generates custom API route wrapping a compiled Blueprint logic graph", () => {
    const graph: BlueprintGraph = {
      id: "g_checkout",
      name: "ProcessCheckout",
      type: "function",
      nodes: {},
      wires: [],
      variables: [],
    };

    const file = ApiRouteEmitter.emitCustomApiRoute("/api/checkout", graph);

    assert.equal(file.path, "app/api/checkout/route.ts");
    assert.match(file.content, /import \{ processCheckout \} from "@\/server\/logic\/processCheckout";/);
    assert.match(file.content, /export async function POST\(request: NextRequest\)/);
    assert.match(file.content, /const result = await processCheckout\(body\);/);
    assert.match(file.content, /NextResponse\.json\(result \?\? \{ success: true \}, \{ status: 200 \}\);/);
  });
});
