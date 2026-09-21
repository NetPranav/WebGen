import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createShowcaseSnapshot, createBlankCanvasSnapshot } from "../DemoProjectSnapshot";

describe("DemoProjectSnapshot: Stashing and Blank Canvas Presets", () => {
  it("creates a valid stashed showcase demo snapshot with elements and database schemas", () => {
    const showcase = createShowcaseSnapshot();
    assert.equal(showcase.projectId, "project_showcase_demo");
    assert.ok(showcase.elements["el_root_container"]);
    assert.ok(showcase.elements["el_hero_heading"]);
    assert.ok(showcase.elements["el_buy_button"]);
    assert.equal(showcase.elements["el_root_container"].children.length, 2);
    assert.ok(showcase.databaseSchemas["Products"]);
    assert.equal(showcase.databaseRecords["Products"].length, 2);
    assert.ok(showcase.stateVariables["cartTotal"]);
    assert.ok(showcase.animationSamples["sample_btn_pulse"]);
  });

  it("creates a valid pristine blank canvas snapshot with empty children and zero mock databases", () => {
    const blank = createBlankCanvasSnapshot();
    assert.equal(blank.projectId, "project_blank_canvas");
    assert.ok(blank.elements["el_root_container"]);
    assert.equal(blank.elements["el_root_container"].children.length, 0);
    assert.equal(Object.keys(blank.databaseSchemas).length, 0);
    assert.equal(Object.keys(blank.databaseRecords).length, 0);
    assert.equal(Object.keys(blank.stateVariables).length, 0);
  });
});
