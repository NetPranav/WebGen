import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import { ProjectDatabaseManager, generateProjectId, createDefaultBlankSnapshot } from "../ProjectDatabase";
import { MemoryStorage } from "./memoryStorage";

describe("ProjectDatabase (IndexedDB, Phase 3.2)", () => {
  it("generates unique, well-formed project ids", () => {
    const a = generateProjectId();
    const b = generateProjectId();
    assert.ok(a.startsWith("prj_") && b.startsWith("prj_"));
    assert.notEqual(a, b);
  });

  it("creates a clean blank snapshot", () => {
    const snapshot = createDefaultBlankSnapshot("prj_x", "My Brand New Project");
    assert.equal(snapshot.projectName, "My Brand New Project");
    assert.equal(snapshot.document.layers.elem_canvas_root.children.length, 0);
    assert.deepEqual(snapshot.databaseSchemas, {});
  });

  it("registers, reads, updates and lists projects; a second connection sees them (reload)", async () => {
    const factory = new IDBFactory();
    const db = new ProjectDatabaseManager(() => factory, () => null);
    assert.equal(await db.isPersistent(), true);

    const registered = await db.registerProject({ id: "prj_custom", name: "Custom Studio" });
    assert.equal(registered.revision, 1);
    const fetched = await db.getProject("prj_custom");
    assert.equal(fetched?.name, "Custom Studio");

    const updated = await db.saveProjectSnapshot("prj_custom", { ...fetched!.snapshot, projectName: "Renamed" }, {
      history: { past: [], future: [] },
    });
    assert.equal(updated?.revision, 2);

    const reopened = new ProjectDatabaseManager(() => factory, () => null);
    assert.equal((await reopened.getProject("prj_custom"))?.name, "Renamed");
    assert.deepEqual(await reopened.loadHistory("prj_custom"), { past: [], future: [] });
    assert.deepEqual(
      (await reopened.listProjects()).map((p) => p.id),
      ["prj_custom"]
    );

    await reopened.deleteProject("prj_custom");
    assert.equal(await reopened.getProject("prj_custom"), null);
    assert.deepEqual(await reopened.listProjects(), []);
  });

  it("moves projects saved in localStorage by older builds into IndexedDB, once", async () => {
    const legacy = new MemoryStorage();
    const snapshot = createDefaultBlankSnapshot("prj_old", "Old Project");
    legacy.setItem(
      "__uweb_proj_prj_old",
      JSON.stringify({ id: "prj_old", name: "Old Project", createdAt: "2026-01-01", updatedAt: "2026-01-02", settings: {}, snapshot })
    );
    legacy.setItem("__uweb_project_registry_v1__", "[]");
    legacy.setItem("ui:theme", "dark");

    const factory = new IDBFactory();
    const db = new ProjectDatabaseManager(() => factory, () => legacy);
    const migrated = await db.getProject("prj_old");
    assert.equal(migrated?.name, "Old Project");
    assert.equal(migrated?.revision, 0);
    assert.equal(legacy.getItem("__uweb_proj_prj_old"), null, "the localStorage copy is removed");
    assert.equal(legacy.getItem("ui:theme"), "dark", "UI preferences stay");
  });

  it("falls back to memory when IndexedDB is unavailable", async () => {
    const db = new ProjectDatabaseManager(() => null, () => null);
    assert.equal(await db.isPersistent(), false);
    await db.registerProject({ id: "prj_mem", name: "In Memory" });
    assert.equal((await db.getProject("prj_mem"))?.name, "In Memory");
  });
});
