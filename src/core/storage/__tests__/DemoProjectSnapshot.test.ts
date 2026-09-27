import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createShowcaseSnapshot, createBlankCanvasSnapshot } from "../DemoProjectSnapshot";

/**
 * Sub-Phase 41.1: `createShowcaseSnapshot`/`createBlankCanvasSnapshot` trim
 * their After-track fields (blueprints, databases, state variables, redirects)
 * unless `edition === "full"` (@/core/flags) — a module-level constant, cached
 * for the life of the process on first import. The showcase assertions below
 * need the untrimmed content, so they're skipped here and instead verified by
 * `npm run test:unit:full-edition`, which sets the env var before the process
 * starts at all. `DemoProjectSnapshotEditionGate.test.ts` covers the inverse
 * (trimmed outside the full edition) under the default `test:unit`.
 */
const IS_FULL_EDITION = process.env.NEXT_PUBLIC_EDITION === "full";

describe("DemoProjectSnapshot: Stashing and Blank Canvas Presets", () => {
  it(
    "creates a valid stashed showcase demo snapshot with elements and database schemas",
    { skip: !IS_FULL_EDITION && "only runs under `npm run test:unit:full-edition`" },
    () => {
      const showcase = createShowcaseSnapshot();
      assert.equal(showcase.projectId, "project_showcase_demo");
      assert.ok(showcase.document.layers["el_root_container"]);
      assert.ok(showcase.document.layers["el_hero_heading"]);
      assert.ok(showcase.document.layers["el_buy_button"]);
      assert.equal(showcase.document.layers["el_root_container"].children.length, 2);
      assert.ok(showcase.databaseSchemas["Products"]);
      assert.equal(showcase.databaseRecords["Products"].length, 2);
      assert.ok(showcase.stateVariables["cartTotal"]);
      assert.ok(showcase.animationSamples["sample_btn_pulse"]);
    }
  );

  it("creates a valid pristine blank canvas snapshot with empty children and zero mock databases", () => {
    const blank = createBlankCanvasSnapshot();
    assert.equal(blank.projectId, "project_blank_canvas");
    assert.ok(blank.document.layers["el_root_container"]);
    assert.equal(blank.document.layers["el_root_container"].children.length, 0);
    assert.equal(Object.keys(blank.databaseSchemas).length, 0);
    assert.equal(Object.keys(blank.databaseRecords).length, 0);
    assert.equal(Object.keys(blank.stateVariables).length, 0);
  });
});
