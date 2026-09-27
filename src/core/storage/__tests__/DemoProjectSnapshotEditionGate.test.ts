import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createShowcaseSnapshot, createBlankCanvasSnapshot } from "../DemoProjectSnapshot";

/**
 * Sub-Phase 41.1: `mountDemoProject`/`clearToBlankCanvas` are core (both
 * editions), but their demo content pre-dates the After-track split and
 * includes a full blueprint graph, database and state variables — without
 * trimming, clicking "Mount Showcase Demo" in the Initial edition would hand
 * it working After-track data through the back door, bypassing the gated
 * actions entirely. Skipped under `npm run test:unit:full-edition` (the
 * inverse of what this checks) — see DemoProjectSnapshot.test.ts for that side.
 */
const IS_FULL_EDITION = process.env.NEXT_PUBLIC_EDITION === "full";
const SKIP = IS_FULL_EDITION && "only meaningful outside the full edition";

describe("Sub-Phase 41.1: DemoProjectSnapshot trims After-track fields outside the full edition", () => {
  it("createShowcaseSnapshot returns empty blueprints/databases/state variables/redirects", { skip: SKIP }, () => {
    const showcase = createShowcaseSnapshot();

    // Still present: the document, pages and animation samples are core content.
    assert.ok(showcase.document.layers["el_buy_button"]);
    assert.ok(showcase.animationSamples["sample_btn_pulse"]);

    // Trimmed: the After-track fields.
    assert.deepEqual(showcase.databaseSchemas, {});
    assert.deepEqual(showcase.databaseRecords, {});
    assert.deepEqual(showcase.stateVariables, {});
    assert.deepEqual(showcase.databaseLatches, {});
    assert.deepEqual(showcase.blueprintGraphs, {});
    assert.equal(showcase.activeBlueprintGraphId, "");
    assert.deepEqual(showcase.redirectRules, {});
  });

  it("createBlankCanvasSnapshot returns an empty blueprint graph, not the seeded 'Main Event Graph'", { skip: SKIP }, () => {
    const blank = createBlankCanvasSnapshot();

    assert.deepEqual(blank.blueprintGraphs, {});
    assert.equal(blank.activeBlueprintGraphId, "");
  });
});
