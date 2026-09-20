import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { MockDatabase } from "../../../runtime/MockDatabase";
import { MockApiServer } from "../../../runtime/MockApiServer";
import { CollectionSchema } from "../../types/database";
import { DiagnosticBus } from "../../engine/DiagnosticBus";

describe("Sub-Phase 5.2: MockApiServer & Fetch Interceptor", () => {
  let db: MockDatabase;
  let server: MockApiServer;

  const sampleSchemas: Record<string, CollectionSchema> = {
    Products: {
      id: "col_products",
      name: "Products",
      displayName: "Products",
      fields: {
        id: { id: "f_id", name: "id", type: "Int", isPrimaryKey: true },
        title: { id: "f_title", name: "title", type: "String" },
        price: { id: "f_price", name: "price", type: "Float" },
        inStock: { id: "f_stock", name: "inStock", type: "Boolean" },
      },
    },
  };

  const sampleRecords = {
    Products: [
      { id: 1, title: "Pro Plan", price: 29.0, inStock: true },
      { id: 2, title: "Enterprise Plan", price: 199.0, inStock: true },
      { id: 3, title: "Free Plan", price: 0.0, inStock: false },
    ],
  };

  beforeEach(() => {
    DiagnosticBus.clearHistory();
    db = new MockDatabase();
    db.seed(sampleSchemas, sampleRecords);
    // 0ms latency in test environment for instant execution
    server = new MockApiServer({ database: db, latencyMs: 0 });
  });

  it("handles GET /api/:collection with query filters, limit, and sorting", async () => {
    // 1. Basic collection query
    const res = await server.handleRequest("/api/Products");
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Content-Type"), "application/json");

    const data = await res.json();
    assert.equal(Array.isArray(data), true);
    assert.equal(data.length, 3);

    // 2. Query with filtering and sorting: price desc, limit 2
    const filteredRes = await server.handleRequest(
      "/api/Products?sort=price&direction=desc&limit=2"
    );
    assert.equal(filteredRes.status, 200);
    const filteredData = await filteredRes.json();
    assert.equal(filteredData.length, 2);
    assert.equal(filteredData[0].title, "Enterprise Plan");
    assert.equal(filteredData[1].title, "Pro Plan");

    // 3. Query with boolean filter
    const inStockRes = await server.handleRequest("/api/Products?inStock=false");
    const inStockData = await inStockRes.json();
    assert.equal(inStockData.length, 1);
    assert.equal(inStockData[0].title, "Free Plan");
  });

  it("handles GET /api/:collection/:id returning 200 or 404", async () => {
    // Found
    const res = await server.handleRequest("/api/Products/1");
    assert.equal(res.status, 200);
    const item = await res.json();
    assert.equal(item.title, "Pro Plan");

    // Not Found
    const notFoundRes = await server.handleRequest("/api/Products/999");
    assert.equal(notFoundRes.status, 404);
  });

  it("handles POST /api/:collection creating a new record", async () => {
    const payload = {
      title: "Team Addon",
      price: 49.0,
      inStock: true,
    };

    const res = await server.handleRequest("/api/Products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 201);
    const created = await res.json();
    assert.equal(created.id, 4);
    assert.equal(created.title, "Team Addon");
    assert.equal(db.count("Products"), 4);
  });

  it("handles PUT /api/:collection/:id updating an existing record", async () => {
    const updates = {
      title: "Pro Plan 2026",
      price: 35.0,
    };

    const res = await server.handleRequest("/api/Products/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.equal(updated.title, "Pro Plan 2026");
    assert.equal(updated.price, 35.0);
    assert.equal(db.getById("Products", 1)?.title, "Pro Plan 2026");
  });

  it("handles DELETE /api/:collection/:id removing record", async () => {
    const res = await server.handleRequest("/api/Products/3", {
      method: "DELETE",
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(db.count("Products"), 2);
    assert.equal(db.getById("Products", 3), null);
  });

  it("supports meta routes /api/_schema and /api/_reset", async () => {
    // Introspect schema
    const schemaRes = await server.handleRequest("/api/_schema");
    assert.equal(schemaRes.status, 200);
    const schemaData = await schemaRes.json();
    assert.ok(schemaData.schemas.Products);

    // Mutate and reset
    await server.handleRequest("/api/Products", {
      method: "POST",
      body: JSON.stringify({ title: "Temporary", price: 1.0, inStock: true }),
    });
    assert.equal(db.count("Products"), 4);

    const resetRes = await server.handleRequest("/api/_reset", { method: "POST" });
    assert.equal(resetRes.status, 200);
    assert.equal(db.count("Products"), 3);
  });

  it("simulates network latency accurately", async () => {
    server.setLatency(30);
    const start = performance.now();
    await server.handleRequest("/api/Products");
    const duration = performance.now() - start;
    assert.ok(duration >= 25, `Expected latency >= 25ms, got ${duration}ms`);
  });

  it("simulates error injection for specific endpoints", async () => {
    server.setSimulatedError("/api/Products", 503);

    const res = await server.handleRequest("/api/Products");
    assert.equal(res.status, 503);
    const data = await res.json();
    assert.ok(data.error.includes("503"));

    // Reset error
    server.clearSimulatedErrors();
    const okRes = await server.handleRequest("/api/Products");
    assert.equal(okRes.status, 200);
  });

  it("generates valid in-sandbox injection script", () => {
    const script = server.getInjectedScript();
    assert.ok(script.includes("window.fetch"));
    assert.ok(script.includes("MOCK_API_REQUEST"));
    assert.ok(script.includes("MOCK_API_RESPONSE"));
    assert.ok(script.includes("__MOCK_API_ACTIVE__"));
  });

  it("dispatches structured telemetry to DiagnosticBus on MOCK_API_INFO and MOCK_API_ERR", async () => {
    // Successful call
    await server.handleRequest("/api/Products");
    const infoLogs = DiagnosticBus.getHistoryByChannel("MOCK_API_INFO");
    assert.ok(infoLogs.length >= 1);
    assert.ok(infoLogs[0].message.includes("GET /api/Products • 200"));

    // 404 call
    await server.handleRequest("/api/NonExistent");
    const errLogs = DiagnosticBus.getHistoryByChannel("MOCK_API_ERR");
    assert.ok(errLogs.length >= 1);
    assert.ok(errLogs[0].message.includes("404"));
  });
});
