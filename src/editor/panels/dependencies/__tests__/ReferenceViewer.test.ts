import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DependencyAnalysisEngine } from "../../../../core/engine/DependencyAnalysisEngine";
import { useDependencyStore } from "../../../../core/store/useDependencyStore";
import { useProjectStore, ProjectStateSnapshot } from "../../../../core/store/useProjectStore";
import { DiagnosticBus } from "../../../../core/engine/DiagnosticBus";
import { DiagnosticEvent } from "../../../../core/types/diagnostics";
import { loadDocument } from "@/core/document/migrations";

describe("Sub-Phase 8.3: Panel 26 — Reference Viewer & Dependency Graph", () => {
  let baselineSnapshot: ProjectStateSnapshot;

  beforeEach(() => {
    // Construct rich cross-domain project snapshot
    baselineSnapshot = {
      projectName: "Dependency Graph Project",
      activePageId: "page_home",
      pages: {
        page_home: {
          id: "page_home",
          name: "Home Page",
          slug: "/",
          rootElementId: "el_container",
        },
        page_profile: {
          id: "page_profile",
          name: "User Profile",
          slug: "/profile",
          rootElementId: "el_profile_root",
        },
      },
      document: loadDocument({ elements: {
        el_container: {
          id: "el_container",
          name: "Main Container",
          archetype: "container",
          parentId: null,
          children: ["el_btn_submit", "el_header"],
          properties: {},
        },
        el_header: {
          id: "el_header",
          name: "Greeting Title",
          archetype: "text",
          parentId: "el_container",
          children: [],
          properties: {
            content: "Hello {{state.userName}}",
          },
        },
        el_btn_submit: {
          id: "el_btn_submit",
          name: "Save Profile Button",
          archetype: "button",
          parentId: "el_container",
          children: [],
          properties: {
            blueprintGraphId: "graph_save_user",
          },
        },
        el_profile_root: {
          id: "el_profile_root",
          name: "Profile Root",
          archetype: "container",
          parentId: null,
          children: [],
          properties: {},
        },
        // Detached orphan element
        el_orphan_badge: {
          id: "el_orphan_badge",
          name: "Unused Promotional Badge",
          archetype: "button",
          parentId: null,
          children: [],
          properties: {},
        },
      } }),
      databaseSchemas: {
        col_users: {
          id: "col_users",
          name: "Users",
          displayName: "User Accounts",
          fields: {
            fld_id: { id: "fld_id", name: "id", type: "String", isPrimaryKey: true },
            fld_name: { id: "fld_name", name: "name", type: "String" },
          },
        },
        // Unqueried orphan schema
        col_archive: {
          id: "col_archive",
          name: "ArchiveLogs",
          displayName: "Archive Logs",
          fields: {},
        },
      },
      databaseRecords: {},
      stateVariables: {
        var_user_name: {
          id: "var_user_name",
          name: "userName",
          type: "string",
          value: "Alice",
          defaultValue: "Alice",
          scope: "global",
        },
        // Dead orphan variable
        var_dead_counter: {
          id: "var_dead_counter",
          name: "deadCounter",
          type: "number",
          value: 0,
          defaultValue: 0,
          scope: "global",
        },
      },
      animationSamples: {},
      bindings: {
        binding_header: {
          id: "binding_header",
          target: {
            elementId: "el_header",
            archetype: "text",
            propertyKey: "content",
          },
          sourceType: "state_variable",
          stateVariableId: "var_user_name",
        },
      },
      databaseLatches: {},
      blueprintGraphs: {
        graph_save_user: {
          id: "graph_save_user",
          name: "Save User Mutation",
          type: "event",
          nodes: {
            node_db: {
              id: "node_db",
              type: "database.query",
              title: "Save To Users Collection",
              position: { x: 100, y: 100 },
              customParams: {
                collectionId: "col_users",
              },
            },
          },
          wires: [],
          variables: [],
        },
      },
      activeBlueprintGraphId: "graph_save_user",
      redirectRules: {
        rule_old_home: {
          id: "rule_old_home",
          sourcePattern: "/old-home",
          targetPattern: "/",
          statusCode: 301,
        },
      },
    };

    useProjectStore.getState().restoreSnapshot(baselineSnapshot);
  });

  it("should extract all nodes across pages, elements, schemas, variables, blueprints, and redirects", () => {
    const graph = DependencyAnalysisEngine.buildGraph(baselineSnapshot);

    assert.strictEqual(graph.metrics.totalNodes, 13);
    assert.ok(graph.nodes.page_home);
    assert.strictEqual(graph.nodes.page_home.type, "page");
    assert.ok(graph.nodes.el_container);
    assert.strictEqual(graph.nodes.el_container.type, "element");
    assert.ok(graph.nodes.col_users);
    assert.strictEqual(graph.nodes.col_users.type, "schema");
    assert.ok(graph.nodes.var_user_name);
    assert.strictEqual(graph.nodes.var_user_name.type, "variable");
    assert.ok(graph.nodes.graph_save_user);
    assert.strictEqual(graph.nodes.graph_save_user.type, "blueprint");
    assert.ok(graph.nodes.rule_old_home);
    assert.strictEqual(graph.nodes.rule_old_home.type, "redirect");
  });

  it("should construct directed relationship edges across all domains", () => {
    const graph = DependencyAnalysisEngine.buildGraph(baselineSnapshot);

    // 1. Page contains root
    const pageEdge = graph.edges.find((e) => e.sourceId === "page_home" && e.targetId === "el_container");
    assert.ok(pageEdge);
    assert.strictEqual(pageEdge.relationType, "contains");

    // 2. Element contains child
    const childEdge = graph.edges.find((e) => e.sourceId === "el_container" && e.targetId === "el_btn_submit");
    assert.ok(childEdge);
    assert.strictEqual(childEdge.relationType, "contains");

    // 3. Element binds to state variable
    const bindingEdge = graph.edges.find((e) => e.sourceId === "el_header" && e.targetId === "var_user_name");
    assert.ok(bindingEdge);
    assert.strictEqual(bindingEdge.relationType, "binds_to");

    // 4. Element triggers blueprint graph
    const triggerEdge = graph.edges.find((e) => e.sourceId === "el_btn_submit" && e.targetId === "graph_save_user");
    assert.ok(triggerEdge);
    assert.strictEqual(triggerEdge.relationType, "triggers");

    // 5. Blueprint queries database schema
    const queryEdge = graph.edges.find((e) => e.sourceId === "graph_save_user" && e.targetId === "col_users");
    assert.ok(queryEdge);
    assert.strictEqual(queryEdge.relationType, "queries");

    // 6. Redirect navigates to page
    const redirectEdge = graph.edges.find((e) => e.sourceId === "rule_old_home" && e.targetId === "page_home");
    assert.ok(redirectEdge);
    assert.strictEqual(redirectEdge.relationType, "navigates_to");
  });

  it("should compute forward dependencies and backward referencers accurately", () => {
    const graph = DependencyAnalysisEngine.buildGraph(baselineSnapshot);

    // Forward references: What does el_header depend on?
    const forward = DependencyAnalysisEngine.getForwardReferences(graph, "el_header");
    assert.strictEqual(forward.length, 1);
    assert.strictEqual(forward[0].id, "var_user_name");

    // Backward references: Who depends on var_user_name?
    const backward = DependencyAnalysisEngine.getBackwardReferences(graph, "var_user_name");
    assert.ok(backward.some((n) => n.id === "el_header"));

    // Complete transitive dependency chain for el_btn_submit:
    // el_btn_submit -> graph_save_user -> col_users
    const chain = DependencyAnalysisEngine.getDependencyChain(graph, "el_btn_submit");
    const chainNodeIds = chain.nodes.map((n) => n.id);
    assert.ok(chainNodeIds.includes("el_btn_submit"));
    assert.ok(chainNodeIds.includes("graph_save_user"));
    assert.ok(chainNodeIds.includes("col_users"));
  });

  it("should detect orphan assets and emit [ORPHAN_ASSET_WARN] via DiagnosticBus", () => {
    const emitted: DiagnosticEvent[] = [];
    const unsubscribe = DiagnosticBus.subscribe((evt) => {
      if (evt.channel === "ORPHAN_ASSET_WARN") {
        emitted.push(evt);
      }
    });

    const graph = DependencyAnalysisEngine.buildGraph(baselineSnapshot);

    assert.ok(graph.orphanNodes.length >= 3);
    const orphanIds = graph.orphanNodes.map((n) => n.id);

    // Detached element
    assert.ok(orphanIds.includes("el_orphan_badge"));
    assert.strictEqual(graph.nodes.el_orphan_badge.isOrphan, true);

    // Dead variable
    assert.ok(orphanIds.includes("var_dead_counter"));
    assert.strictEqual(graph.nodes.var_dead_counter.isOrphan, true);

    // Unqueried schema
    assert.ok(orphanIds.includes("col_archive"));
    assert.strictEqual(graph.nodes.col_archive.isOrphan, true);

    assert.strictEqual(emitted.length, 1);
    assert.strictEqual(emitted[0].channel, "ORPHAN_ASSET_WARN");
    assert.strictEqual(emitted[0].severity, "warning");

    unsubscribe();
  });

  it("should detect circular redirect loops and emit [CIRCULAR_REF_ERR] via DiagnosticBus", () => {
    const emitted: DiagnosticEvent[] = [];
    const unsubscribe = DiagnosticBus.subscribe((evt) => {
      if (evt.channel === "CIRCULAR_REF_ERR") {
        emitted.push(evt);
      }
    });

    const cyclicSnapshot: ProjectStateSnapshot = JSON.parse(JSON.stringify(baselineSnapshot));
    cyclicSnapshot.redirectRules = {
      rule_a: {
        id: "rule_a",
        sourcePattern: "/route-a",
        targetPattern: "/route-b",
        statusCode: 301,
      },
      rule_b: {
        id: "rule_b",
        sourcePattern: "/route-b",
        targetPattern: "/route-a",
        statusCode: 301,
      },
    };

    const graph = DependencyAnalysisEngine.buildGraph(cyclicSnapshot);

    assert.ok(graph.circularChains.length > 0);
    assert.strictEqual(emitted.length, 1);
    assert.strictEqual(emitted[0].channel, "CIRCULAR_REF_ERR");
    assert.strictEqual(emitted[0].severity, "error");
    assert.ok(graph.circularChains[0].description.includes("route-a"));

    unsubscribe();
  });

  it("should integrate with useDependencyStore for reactive graph analysis", () => {
    const store = useDependencyStore.getState();

    // 1. Refresh graph
    const graphData = store.refreshGraph();
    assert.ok(graphData);
    assert.strictEqual(useDependencyStore.getState().graphData?.metrics.totalNodes, 13);

    // 2. Select node
    store.selectNode("el_btn_submit");
    assert.strictEqual(store.getSelectedNode()?.name, "Save Profile Button");

    // 3. Check forward references via store
    const deps = store.getForwardReferences();
    assert.strictEqual(deps.length, 1);
    assert.strictEqual(deps[0].id, "graph_save_user");

    // 4. View mode switcher and zoom controls
    store.setViewMode("sizemap");
    assert.strictEqual(useDependencyStore.getState().viewMode, "sizemap");

    store.setZoomLevel(1.5);
    assert.strictEqual(useDependencyStore.getState().zoomLevel, 1.5);
  });
});
