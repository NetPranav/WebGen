import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { useProjectMetaStore, getProjectMeta, splitProjectMeta, INITIAL_PROJECT_META } from "../useProjectMetaStore";
import { useProjectStore } from "../useProjectStore";
import { captureProjectState } from "../useProjectStore";

describe("Phase 13: project metadata store", () => {
  beforeEach(() => useProjectMetaStore.setState({ ...INITIAL_PROJECT_META, projectId: undefined }));

  it("owns id, name, scope and root archetype, and getProjectMeta returns plain data", () => {
    useProjectMetaStore.getState().setProjectId("p1");
    useProjectMetaStore.getState().setProjectName("Hero");
    assert.deepEqual(getProjectMeta(), { projectId: "p1", projectName: "Hero", scope: "element", rootArchetype: "button" });
  });

  it("the project store's snapshot is composed from it, and restoring a snapshot writes it back", () => {
    useProjectMetaStore.getState().setProjectMeta({ projectId: "p2", projectName: "Card", scope: "component", rootArchetype: "container" });
    const snapshot = useProjectStore.getState().getSnapshot();
    assert.equal(snapshot.projectId, "p2");
    assert.equal(snapshot.projectName, "Card");
    assert.equal(snapshot.scope, "component");
    assert.equal(snapshot.rootArchetype, "container");

    useProjectMetaStore.setState({ ...INITIAL_PROJECT_META, projectId: undefined });
    useProjectStore.getState().restoreSnapshot(snapshot);
    assert.deepEqual(getProjectMeta(), { projectId: "p2", projectName: "Card", scope: "component", rootArchetype: "container" });
  });

  it("the project store itself no longer holds the metadata fields", () => {
    const state = useProjectStore.getState() as unknown as Record<string, unknown>;
    for (const key of ["projectId", "projectName", "scope", "rootArchetype"]) assert.equal(key in state, false, key);
  });

  it("history swaps carry the name, scope and root archetype", () => {
    useProjectMetaStore.getState().setProjectName("Before");
    const captured = captureProjectState();
    assert.equal(captured.projectName, "Before");
    assert.equal("projectId" in captured, false, "identity is not swapped by undo");
    const { meta, rest } = splitProjectMeta(captured);
    assert.equal(meta.projectName, "Before");
    assert.equal("projectName" in rest, false);
  });
});
