import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DeploymentEngine } from "../../../../runtime/DeploymentEngine";
import {
  INITIAL_PIPELINE_STEPS,
  DeploymentConfig,
  DeploymentRecord,
} from "../../../../core/types/deployment";
import { useProjectStore } from "../../../../core/store/useProjectStore";
import { DiagnosticBus } from "../../../../core/engine/DiagnosticBus";
import { loadDocument } from "@/core/document/migrations";

describe("Sub-Phase 7.1: Build Pipeline Visualizer & Cloud Deploy (Panel 19)", () => {
  beforeEach(() => {
    // Reset project store to valid baseline
    useProjectStore.setState({
      projectName: "Test Cloud App",
      activePageId: "page_home",
      pages: {
        page_home: {
          id: "page_home",
          name: "Home",
          slug: "/",
          rootElementId: "el_root",
        },
      },
      document: loadDocument({ elements: {
        el_root: {
          id: "el_root",
          name: "Root Container",
          archetype: "container",
          parentId: null,
          children: [],
          properties: {},
        },
      } }),
      databaseSchemas: {
        col_users: {
          id: "col_users",
          name: "User",
          displayName: "Users",
          fields: {
            fld_id: {
              id: "fld_id",
              name: "id",
              type: "String",
              isPrimaryKey: true,
            },
            fld_name: {
              id: "fld_name",
              name: "name",
              type: "String",
              isPrimaryKey: false,
            },
          },
        },
      },
      redirectRules: {},
    });
  });

  describe("Pipeline Step Specifications & Contracts", () => {
    it("defines the canonical 6-stage build & deployment sequence", () => {
      assert.strictEqual(INITIAL_PIPELINE_STEPS.length, 6);
      const stepIds = INITIAL_PIPELINE_STEPS.map((s) => s.id);
      assert.deepStrictEqual(stepIds, [
        "validate_ast",
        "compile_blueprints",
        "build_bundle",
        "run_migrations",
        "deploy_cdn",
        "health_check",
      ]);

      // All initial steps start as pending
      for (const step of INITIAL_PIPELINE_STEPS) {
        assert.strictEqual(step.status, "pending");
        assert.strictEqual(step.logs.length, 0);
      }
    });

    it("seeds an initial baseline deployment record for UX display", () => {
      const initial = DeploymentEngine.getCurrentDeployment();
      assert.ok(initial);
      assert.strictEqual(initial?.status, "ready");
      assert.strictEqual(initial?.target, "vercel");
      assert.strictEqual(initial?.environment, "production");
      assert.strictEqual(initial?.steps.length, 6);
      assert.ok(initial);
    assert.ok(initial.health.uptimePct >= 99);
    });
  });

  describe("Pre-Flight Compiler & AST Validation", () => {
    it("passes pre-flight check when project is structurally valid", () => {
      const result = DeploymentEngine.validatePreflight();
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it("fails pre-flight check when project has no pages configured", () => {
      useProjectStore.setState({ pages: {} });
      const result = DeploymentEngine.validatePreflight();
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes("no pages configured")));
    });

    it("fails pre-flight check when route collision exists", () => {
      useProjectStore.setState({
        pages: {
          p1: { id: "p1", name: "Page 1", slug: "/dashboard", rootElementId: "el_1" },
          p2: { id: "p2", name: "Page 2", slug: "/dashboard", rootElementId: "el_2" },
        },
      });
      const result = DeploymentEngine.validatePreflight();
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes("Route collision detected")));
    });

    it("fails pre-flight check when a database collection has no primary key", () => {
      useProjectStore.setState({
        databaseSchemas: {
          bad_col: {
            id: "bad_col",
            name: "AuditLog",
            displayName: "Audit Logs",
            fields: {
              fld_msg: {
                id: "fld_msg",
                name: "message",
                type: "String",
                isPrimaryKey: false,
              },
            },
          },
        },
      });
      const result = DeploymentEngine.validatePreflight();
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes("missing a designated Primary Key")));
    });
  });

  describe("Deployment Execution & Terminal Logging", () => {
    it("executes the full 6-stage build pipeline and updates history", async () => {
      const config: DeploymentConfig = {
        target: "vercel",
        environment: "production",
        productionDomain: "test-app.vercel.app",
      };

      const emittedUpdates: DeploymentRecord[] = [];
      const unsubscribe = DeploymentEngine.subscribe((record) => {
        emittedUpdates.push({ ...record });
      });

      const record = await DeploymentEngine.triggerDeploy(config);
      unsubscribe();

      // Verify final record status
      assert.strictEqual(record.status, "ready");
      assert.strictEqual(record.target, "vercel");
      assert.strictEqual(record.environment, "production");
      assert.strictEqual(record.domain, "test-app.vercel.app");
      assert.strictEqual(record.steps.length, 6);

      // Verify each step completed with logs
      for (const step of record.steps) {
        assert.strictEqual(step.status, "completed");
        assert.ok(step.logs.length > 0);
        assert.ok(typeof step.durationMs === "number");
      }

      // Verify health HUD metrics populated
      assert.ok(record.health.uptimePct > 99);
      assert.ok(record.health.latencyMs > 0);
      assert.strictEqual(record.health.errorRatePct, 0);

      // Verify history contains the new record at index 0
      const history = DeploymentEngine.getHistory();
      assert.strictEqual(history[0].id, record.id);
      assert.ok(history.length >= 2);
    });

    it("prevents triggering a deploy if pre-flight checks fail", async () => {
      useProjectStore.setState({ pages: {} });

      const config: DeploymentConfig = {
        target: "docker",
        environment: "staging",
        productionDomain: "staging.app.io",
      };

      await assert.rejects(
        async () => {
          await DeploymentEngine.triggerDeploy(config);
        },
        /Pre-flight checks failed/
      );
    });
  });

  describe("1-Click Instant Rollback", () => {
    it("reverts traffic instantly to an earlier deployment record", async () => {
      const history = DeploymentEngine.getHistory();
      assert.ok(history.length > 0);
      const targetBuild = history[history.length - 1];

      const rollbackRecord = DeploymentEngine.rollback(targetBuild.id);
      assert.ok(rollbackRecord);
      assert.strictEqual(rollbackRecord.status, "ready");
      assert.ok(rollbackRecord.id.startsWith("dep_rollback_"));
      assert.strictEqual(rollbackRecord.author, "Rollback (Instant Revert)");

      const latestHistory = DeploymentEngine.getHistory();
      assert.strictEqual(latestHistory[0].id, rollbackRecord.id);
    });

    it("throws error when attempting to rollback to a non-existent deployment id", () => {
      assert.throws(() => {
        DeploymentEngine.rollback("invalid_id_99999");
      }, /not found in history/);
    });
  });
});
