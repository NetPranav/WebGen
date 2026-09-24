import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ProjectScaffolder } from "../ProjectScaffolder";
import { useProjectStore } from "@/core/store/useProjectStore";
import { DiagnosticBus } from "@/core/engine/DiagnosticBus";
import { ForceDirectedLayout } from "@/ai/layout/ForceDirectedLayout";

describe("Sub-Phase 6.4: Full Project Scaffold Generator", () => {
  it("should scaffold 'SaaS with auth, a pricing page, and a dashboard' with zero BIND_ERR and DB_SCHEMA_ERR", () => {
    // Clear diagnostic history prior to run
    DiagnosticBus.clearHistory();

    const prompt = "SaaS with auth, a pricing page, and a dashboard";
    const result = ProjectScaffolder.scaffoldProject(prompt);

    // 1. Basic success & diagnostic gate
    assert.strictEqual(result.hasErrors, false, "Scaffolding should produce 0 errors");
    assert.strictEqual(result.diagnostics.length, 0, "No diagnostics should be emitted");

    const bindErrors = DiagnosticBus.getHistoryByChannel("BIND_ERR");
    const dbErrors = DiagnosticBus.getHistoryByChannel("DB_SCHEMA_ERR");
    assert.strictEqual(bindErrors.length, 0, "Must have zero [BIND_ERR] diagnostics");
    assert.strictEqual(dbErrors.length, 0, "Must have zero [DB_SCHEMA_ERR] diagnostics");

    const snapshot = result.snapshot;

    // 2. Pages verification
    const pageKeys = Object.keys(snapshot.pages);
    assert.ok(pageKeys.includes("page_home"), "Must include Home page");
    assert.ok(pageKeys.includes("page_auth"), "Must include Auth page");
    assert.ok(pageKeys.includes("page_pricing"), "Must include Pricing page");
    assert.ok(pageKeys.includes("page_dashboard"), "Must include Dashboard page");

    assert.strictEqual(snapshot.pages["page_auth"].slug, "/login");
    assert.strictEqual(snapshot.pages["page_pricing"].slug, "/pricing");
    assert.strictEqual(snapshot.pages["page_dashboard"].slug, "/dashboard");

    // 3. Outliner UI Element hierarchy verification
    // Auth page form and inputs
    assert.ok(snapshot.elements["auth_form"], "Must have auth form");
    assert.ok(snapshot.elements["email_input"], "Must have email input");
    assert.ok(snapshot.elements["pass_input"], "Must have password input");
    assert.ok(snapshot.elements["login_btn"], "Must have login button");
    assert.strictEqual(snapshot.elements["login_btn"].archetype, "button");

    // Pricing page cards
    assert.ok(snapshot.elements["pricing_grid"], "Must have pricing grid");
    assert.ok(snapshot.elements["card_pro"], "Must have Pro card");
    assert.ok(snapshot.elements["btn_pro"], "Must have Pro choose button");

    // Dashboard metrics
    assert.ok(snapshot.elements["stats_row"], "Must have stats row");
    assert.ok(snapshot.elements["stat_revenue_text"], "Must have revenue text");

    // 4. Database schemas & seed records
    assert.ok(snapshot.databaseSchemas["users"], "Must have users collection");
    assert.ok(snapshot.databaseSchemas["subscriptions"], "Must have subscriptions collection");
    assert.strictEqual(snapshot.databaseSchemas["users"].fields["email"].isUnique, true);
    assert.ok(snapshot.databaseRecords["users"].length >= 1, "Must have seed user records");
    assert.ok(snapshot.databaseRecords["subscriptions"].length >= 1, "Must have seed subscription records");

    // 5. Logic Blueprints verification & auto-layout
    const graphKeys = Object.keys(snapshot.blueprintGraphs);
    assert.ok(graphKeys.length >= 1, "Must have at least one logic blueprint");
    const mainGraph = snapshot.blueprintGraphs[graphKeys[0]];
    const nodeIds = Object.keys(mainGraph.nodes);
    assert.ok(nodeIds.length >= 2, "Blueprint must have nodes");

    // Assert zero overlapping nodes in laid-out blueprint
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const idA = nodeIds[i];
        const idB = nodeIds[j];
        const collides = ForceDirectedLayout.checkCollision(
          mainGraph.nodes[idA].position,
          mainGraph.nodes[idB].position,
          ForceDirectedLayout.DEFAULT_NODE_WIDTH,
          ForceDirectedLayout.DEFAULT_NODE_HEIGHT
        );
        assert.strictEqual(collides, false, `Nodes ${idA} and ${idB} should not overlap`);
      }
    }

    // 6. Data binding verification
    assert.ok(snapshot.bindings["bind_revenue"], "Must have revenue binding");
    assert.strictEqual(snapshot.bindings["bind_revenue"].target.elementId, "stat_revenue_text");
    assert.strictEqual(snapshot.bindings["bind_revenue"].sourceCollection, "subscriptions");

    // 7. useProjectStore integration (restores cleanly into live IDE state)
    useProjectStore.getState().restoreSnapshot(snapshot);
    const storeState = useProjectStore.getState();

    assert.strictEqual(storeState.pages["page_dashboard"].name, "Dashboard");
    assert.strictEqual(storeState.elements["login_btn"].name, "Login Button");
    assert.strictEqual(storeState.databaseSchemas["users"].displayName, "Users");
    assert.ok(storeState.blueprintGraphs[mainGraph.id], "Store must contain restored graph");
  });

  it("should scaffold an E-commerce store with Products and Orders cleanly", () => {
    DiagnosticBus.clearHistory();

    const prompt = "Build an E-commerce store with products catalog and orders";
    const result = ProjectScaffolder.scaffoldProject(prompt);

    assert.strictEqual(result.hasErrors, false);
    assert.ok(result.snapshot.pages["page_home"]);
    assert.ok(result.snapshot.databaseSchemas["users"]);

    const bindErrors = DiagnosticBus.getHistoryByChannel("BIND_ERR");
    const dbErrors = DiagnosticBus.getHistoryByChannel("DB_SCHEMA_ERR");
    assert.strictEqual(bindErrors.length, 0);
    assert.strictEqual(dbErrors.length, 0);
  });
});
