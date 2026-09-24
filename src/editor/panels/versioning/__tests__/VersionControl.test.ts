import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { VersionControlEngine } from "../../../../core/engine/VersionControlEngine";
import { useVersionControlStore } from "../../../../core/store/useVersionControlStore";
import { useProjectStore, ProjectStateSnapshot } from "../../../../core/store/useProjectStore";
import { DiagnosticBus } from "../../../../core/engine/DiagnosticBus";
import { DiagnosticEvent } from "../../../../core/types/diagnostics";
import { loadDocument } from "@/core/document/migrations";

describe("Sub-Phase 8.2: Panel 24 — Version Control & Snapshots", () => {
  let baselineSnapshot: ProjectStateSnapshot;

  beforeEach(() => {
    useVersionControlStore.getState().clearAllSnapshots();

    // Valid baseline project snapshot
    baselineSnapshot = {
      projectName: "Versioned Web App",
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
          children: ["el_btn"],
          properties: {
            padding: 16,
          },
        },
        el_btn: {
          id: "el_btn",
          name: "Submit Button",
          archetype: "button",
          parentId: "el_root",
          children: [],
          properties: {
            label: "Submit",
            variant: "outline",
          },
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
          },
        },
      },
      databaseRecords: {},
      stateVariables: {},
      animationSamples: {},
      bindings: {},
      databaseLatches: {},
      blueprintGraphs: {},
      activeBlueprintGraphId: "",
      redirectRules: {},
    };

    useProjectStore.getState().restoreSnapshot(baselineSnapshot);
  });

  it("should compute snapshot size in bytes and create valid ProjectSnapshotRecord", () => {
    const size = VersionControlEngine.computeSnapshotSize(baselineSnapshot);
    assert.ok(size > 100, `Expected size > 100 bytes, got ${size}`);

    const record = VersionControlEngine.createSnapshotRecord({
      name: "Initial Baseline",
      description: "Project bootstrap checkpoint",
      author: "Architect",
      branchName: "main",
      tags: ["milestone", "v1.0"],
      isAutoSnapshot: false,
      snapshot: baselineSnapshot,
    });

    assert.ok(record.id.startsWith("snap_"));
    assert.strictEqual(record.name, "Initial Baseline");
    assert.strictEqual(record.description, "Project bootstrap checkpoint");
    assert.strictEqual(record.author, "Architect");
    assert.strictEqual(record.branchName, "main");
    assert.deepStrictEqual(record.tags, ["milestone", "v1.0"]);
    assert.strictEqual(record.sizeBytes, size);
    assert.strictEqual(record.isAutoSnapshot, false);
  });

  it("should detect zero changes when diffing two identical snapshots", () => {
    const report = VersionControlEngine.diffSnapshots(baselineSnapshot, baselineSnapshot);
    assert.strictEqual(report.isIdentical, true);
    assert.strictEqual(report.totalAdded, 0);
    assert.strictEqual(report.totalModified, 0);
    assert.strictEqual(report.totalRemoved, 0);
    assert.strictEqual(report.elements.length, 0);
    assert.strictEqual(report.pages.length, 0);
  });

  it("should detect added, modified, and removed elements and properties in semantic AST diff", () => {
    const targetSnapshot: ProjectStateSnapshot = JSON.parse(JSON.stringify(baselineSnapshot));

    // 1. Modify property on el_btn
    targetSnapshot.document.layers.el_btn.properties.variant = "primary";
    targetSnapshot.document.layers.el_btn.properties.fontSize = 14;

    // 2. Add a new text element
    targetSnapshot.document.layers.el_txt = {
      id: "el_txt",
      name: "Header Text",
      archetype: "text",
      parentId: "el_root",
      children: [],
      properties: { content: "Welcome" },
    };

    // 3. Remove database collection col_users
    delete targetSnapshot.databaseSchemas.col_users;

    // 4. Add a new page
    targetSnapshot.pages.page_about = {
      id: "page_about",
      name: "About Us",
      slug: "/about",
      rootElementId: "el_root_about",
    };

    const report = VersionControlEngine.diffSnapshots(baselineSnapshot, targetSnapshot);

    assert.strictEqual(report.isIdentical, false);
    assert.strictEqual(report.totalAdded, 2); // 1 element (el_txt) + 1 page (page_about)
    assert.strictEqual(report.totalModified, 1); // 1 element (el_btn)
    assert.strictEqual(report.totalRemoved, 1); // 1 schema (col_users)

    // Verify element diff
    const elBtnDiff = report.elements.find((e) => e.id === "el_btn");
    assert.ok(elBtnDiff);
    assert.strictEqual(elBtnDiff.status, "modified");
    assert.strictEqual(elBtnDiff.propertyDiffs.length, 2);

    const variantDiff = elBtnDiff.propertyDiffs.find((p) => p.key === "variant");
    assert.ok(variantDiff);
    assert.strictEqual(variantDiff.oldValue, "outline");
    assert.strictEqual(variantDiff.newValue, "primary");
    assert.strictEqual(variantDiff.status, "modified");

    const fontSizeDiff = elBtnDiff.propertyDiffs.find((p) => p.key === "fontSize");
    assert.ok(fontSizeDiff);
    assert.strictEqual(fontSizeDiff.newValue, 14);
    assert.strictEqual(fontSizeDiff.status, "added");
  });

  it("should trap corrupted snapshots and emit [SNAPSHOT_DIFF_ERR] via DiagnosticBus", () => {
    const emitted: DiagnosticEvent[] = [];
    const unsubscribe = DiagnosticBus.subscribe((evt) => {
      if (evt.channel === "SNAPSHOT_DIFF_ERR") {
        emitted.push(evt);
      }
    });

    const report = VersionControlEngine.diffSnapshots(
      null as unknown as ProjectStateSnapshot,
      baselineSnapshot
    );

    assert.strictEqual(report.isIdentical, false);
    assert.ok(report.summary.includes("integrity violation"));
    assert.strictEqual(emitted.length, 1);
    assert.strictEqual(emitted[0].channel, "SNAPSHOT_DIFF_ERR");
    assert.strictEqual(emitted[0].severity, "error");

    unsubscribe();
  });

  it("should manage branches, tracking distinct HEAD snapshots and switching active branches", () => {
    const store = useVersionControlStore.getState();

    // 1. Snapshot on main
    const snap1 = store.createSnapshot("Main Checkpoint 1", "Initial on main");
    assert.strictEqual(store.getActiveBranch().name, "main");
    assert.strictEqual(store.getActiveBranch().headSnapshotId, snap1.id);

    // 2. Create feature branch
    const featureBranch = store.createBranch("feature/dark-mode", store.activeBranchId, "Dark mode rework");
    assert.strictEqual(featureBranch.headSnapshotId, snap1.id);

    // 3. Switch to feature branch
    const switched = store.switchBranch(featureBranch.id, false);
    assert.strictEqual(switched, true);
    assert.strictEqual(store.getActiveBranch().id, featureBranch.id);

    // 4. Create snapshot on feature branch
    const snap2 = store.createSnapshot("Dark Mode Colors Added", "Updated color tokens");
    assert.strictEqual(store.getActiveBranch().headSnapshotId, snap2.id);

    // 5. Switch back to main
    store.switchBranch("branch_main", true);
    assert.strictEqual(store.getActiveBranch().name, "main");
    assert.strictEqual(store.getActiveBranch().headSnapshotId, snap1.id);
  });

  it("should detect merge conflicts when branches concurrently mutate the same element property", () => {
    const emitted: DiagnosticEvent[] = [];
    const unsubscribe = DiagnosticBus.subscribe((evt) => {
      if (evt.channel === "BRANCH_MERGE_CONFLICT") {
        emitted.push(evt);
      }
    });

    const baseSnapshot = baselineSnapshot;

    // Current branch changes button variant to "primary"
    const currentHead: ProjectStateSnapshot = JSON.parse(JSON.stringify(baselineSnapshot));
    currentHead.document.layers.el_btn.properties.variant = "primary";

    // Incoming branch changes button variant to "secondary"
    const incomingHead: ProjectStateSnapshot = JSON.parse(JSON.stringify(baselineSnapshot));
    incomingHead.document.layers.el_btn.properties.variant = "secondary";

    const result = VersionControlEngine.detectMergeConflicts(baseSnapshot, currentHead, incomingHead);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.conflicts.length, 1);
    assert.strictEqual(result.conflicts[0].entityType, "property");
    assert.strictEqual(result.conflicts[0].entityId, "el_btn");
    assert.strictEqual(result.conflicts[0].currentValue, "primary");
    assert.strictEqual(result.conflicts[0].incomingValue, "secondary");

    assert.strictEqual(emitted.length, 1);
    assert.strictEqual(emitted[0].channel, "BRANCH_MERGE_CONFLICT");

    unsubscribe();
  });

  it("should cleanly merge non-conflicting changes from incoming branch", () => {
    const baseSnapshot = baselineSnapshot;

    // Current branch changes button variant
    const currentHead: ProjectStateSnapshot = JSON.parse(JSON.stringify(baselineSnapshot));
    currentHead.document.layers.el_btn.properties.variant = "primary";

    // Incoming branch adds a new container element
    const incomingHead: ProjectStateSnapshot = JSON.parse(JSON.stringify(baselineSnapshot));
    incomingHead.document.layers.el_card = {
      id: "el_card",
      name: "Profile Card",
      archetype: "container",
      parentId: "el_root",
      children: [],
      properties: { shadow: "md" },
    };

    const result = VersionControlEngine.detectMergeConflicts(baseSnapshot, currentHead, incomingHead);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.conflicts.length, 0);
    assert.ok(result.mergedSnapshot);

    // Merged snapshot should have BOTH the button variant update AND the new card element
    assert.strictEqual(result.mergedSnapshot.document.layers.el_btn.properties.variant, "primary");
    assert.ok(result.mergedSnapshot.document.layers.el_card);
    assert.strictEqual(result.mergedSnapshot.document.layers.el_card.name, "Profile Card");
  });

  it("should restore snapshot cleanly into useProjectStore", () => {
    const store = useVersionControlStore.getState();

    // 1. Create baseline snapshot
    const baselineRecord = store.createSnapshot("Baseline V1", "Original elements");

    // 2. Mutate live project store
    useProjectStore.setState({
      projectName: "Mutated Project Name",
      document: loadDocument({ elements: {} }),
    });

    assert.strictEqual(useProjectStore.getState().projectName, "Mutated Project Name");
    assert.strictEqual(Object.keys(useProjectStore.getState().document.layers).length, 0);

    // 3. Restore snapshot
    const restored = store.restoreSnapshot(baselineRecord.id);
    assert.strictEqual(restored, true);

    // 4. Confirm project store has restored elements and original project name
    assert.strictEqual(useProjectStore.getState().projectName, "Versioned Web App");
    assert.ok(useProjectStore.getState().document.layers.el_btn);
    assert.strictEqual(useProjectStore.getState().document.layers.el_btn.properties.label, "Submit");
  });
});
