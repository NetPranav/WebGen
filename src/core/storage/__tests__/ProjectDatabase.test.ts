import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ProjectDatabase,
  generateProjectId,
  createDefaultBlankSnapshot,
} from "../ProjectDatabase";

describe("ProjectDatabase Client Storage Engine", () => {
  it("should generate a unique, well-formatted project ID", () => {
    const id1 = generateProjectId();
    const id2 = generateProjectId();
    assert.ok(id1.startsWith("prj_"));
    assert.ok(id2.startsWith("prj_"));
    assert.notStrictEqual(id1, id2);
  });

  it("should create a clean default blank project snapshot with empty elements", () => {
    const id = generateProjectId();
    const snapshot = createDefaultBlankSnapshot(id, "My Brand New Project");
    assert.strictEqual(snapshot.projectId, id);
    assert.strictEqual(snapshot.projectName, "My Brand New Project");
    assert.ok(snapshot.pages["page_home"]);
    const rootEl = snapshot.document.layers["elem_canvas_root"];
    assert.ok(rootEl);
    assert.strictEqual(rootEl.children.length, 0); // Empty canvas by default
    assert.deepStrictEqual(snapshot.databaseSchemas, {});
  });

  it("should register, retrieve, and update a project in the database", () => {
    const customId = "prj_test_custom_id";
    const registered = ProjectDatabase.registerProject({
      id: customId,
      name: "Custom Testing Studio",
      settings: { framework: "nextjs-app", template: "blank" },
    });

    assert.strictEqual(registered.id, customId);
    assert.strictEqual(registered.name, "Custom Testing Studio");

    // Fetch from database
    const fetched = ProjectDatabase.getProject(customId);
    assert.ok(fetched);
    assert.strictEqual(fetched.id, customId);
    assert.strictEqual(fetched.name, "Custom Testing Studio");
    assert.strictEqual(fetched.snapshot.document.layers["elem_canvas_root"].children.length, 0);

    // Save updated snapshot
    const updated = ProjectDatabase.saveProjectSnapshot(
      customId,
      {
        ...fetched.snapshot,
        projectName: "Renamed Studio",
      },
      "Renamed Studio"
    );

    assert.ok(updated);
    assert.strictEqual(updated.name, "Renamed Studio");

    const reFetched = ProjectDatabase.getProject(customId);
    assert.strictEqual(reFetched?.name, "Renamed Studio");
  });

  it("should list projects from the registry index", () => {
    const id = generateProjectId();
    ProjectDatabase.registerProject({
      id,
      name: "Listable Project",
    });

    const list = ProjectDatabase.listProjects();
    assert.ok(Array.isArray(list));
    const found = list.find((p) => p.id === id);
    assert.ok(found);
    assert.strictEqual(found.name, "Listable Project");
  });
});
