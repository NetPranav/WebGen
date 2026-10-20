import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PROPERTY_PATHS, PROPERTY_REGISTRY, isPropertyLegalFor } from "../../document/properties";
import { ARCHETYPE_IDS } from "../../document/registry";
import { PRO_GROUPS, controlKind, coveredPaths, groupOf, proGroupsFor, propertyLabel, scrubValue, stepFor, stepValue, unitOwner, type ControlKind } from "../proModel";

const KINDS: ControlKind[] = ["number", "color", "select", "text", "longtext", "toggle", "vector", "json"];

describe("Phase 34: the Pro face has a control for every registry property of every archetype", () => {
  it("every legal path of every archetype is covered, as a row or as its unit select", () => {
    const missing: string[] = [];
    for (const archetype of ARCHETYPE_IDS) {
      const covered = coveredPaths(proGroupsFor([archetype]));
      for (const path of PROPERTY_PATHS) if (isPropertyLegalFor(path, archetype) && !covered.has(path)) missing.push(`${archetype}: ${path}`);
      for (const path of covered) assert.ok(isPropertyLegalFor(path, archetype), `${archetype} lists ${path}, which is not legal for it`);
    }
    assert.deepEqual(missing, [], "properties with no control");
  });

  it("every path in the registry is reachable from some archetype's face", () => {
    const covered = coveredPaths(proGroupsFor([...ARCHETYPE_IDS]));
    assert.deepEqual(PROPERTY_PATHS.filter((p) => !covered.has(p)), []);
  });

  it("every property gets a known control kind that can hold its value type", () => {
    for (const path of PROPERTY_PATHS) {
      const def = PROPERTY_REGISTRY[path];
      const kind = controlKind(path, def);
      assert.ok(KINDS.includes(kind), `${path}: ${kind}`);
      if (def.valueType === "boolean") assert.equal(kind, "toggle", path);
      if (def.valueType === "color") assert.equal(kind, "color", path);
      if (def.valueType === "vector3" || def.valueType === "quaternion") assert.equal(kind, "vector", path);
      if (def.valueType === "enum" && def.options?.length) assert.equal(kind, "select", path);
      if (["number", "length", "angle"].includes(def.valueType)) assert.equal(kind, "number", path);
    }
  });

  it("groups come in the face's order and every property lands in a known group", () => {
    const order = PRO_GROUPS.map((g) => g.id);
    for (const archetype of ARCHETYPE_IDS) {
      const ids = proGroupsFor([archetype]).map((g) => g.id);
      assert.deepEqual(ids, order.filter((id) => ids.includes(id)), `${archetype}: group order`);
    }
    for (const path of PROPERTY_PATHS) assert.ok(order.includes(groupOf(path)), `${path} has no group`);
  });

  it("no property is listed twice, and unit companions have no row of their own", () => {
    const groups = proGroupsFor([...ARCHETYPE_IDS]);
    const paths = groups.flatMap((g) => g.properties.map((p) => p.path));
    assert.equal(new Set(paths).size, paths.length);
    for (const p of paths) assert.equal(unitOwner(p), null, `${p} is a unit companion with its own row`);
    const width = groups.flatMap((g) => g.properties).find((p) => p.path === "frame.width")!;
    assert.equal(width.unitPath, "frame.widthUnit");
  });

  it("a selection lists the union of what its layers have", () => {
    const rect = coveredPaths(proGroupsFor(["rectangle"]));
    const text = coveredPaths(proGroupsFor(["text"]));
    const both = coveredPaths(proGroupsFor(["rectangle", "text"]));
    assert.ok(rect.has("shape.cornerRadius") && !text.has("shape.cornerRadius"));
    assert.ok(text.has("typography.fontSize") && !rect.has("typography.fontSize"));
    assert.ok(both.has("shape.cornerRadius") && both.has("typography.fontSize"));
    assert.deepEqual(proGroupsFor([]), []);
  });
});

describe("Phase 34: labels, steps and keyboard increments", () => {
  it("labels read as words", () => {
    assert.equal(propertyLabel("typography.fontSize"), "Font size");
    assert.equal(propertyLabel("svg.strokeWidth"), "Stroke width");
    assert.equal(propertyLabel("appearance.border.width"), "Border width");
    assert.equal(propertyLabel("positioning"), "Positioning");
    assert.equal(propertyLabel("frame.widthUnit"), "Width unit");
  });

  it("steps: whole numbers by one, fractions finer", () => {
    assert.equal(stepFor(PROPERTY_REGISTRY["frame.width"]), 1);
    assert.equal(stepFor(PROPERTY_REGISTRY["appearance.opacity"]), 0.01); // 0..1
    assert.equal(stepFor(PROPERTY_REGISTRY["shape.innerRadius"]), 0.01); // 0..1
    assert.equal(stepFor(PROPERTY_REGISTRY["shape.points"]), 1); // an integer
  });

  it("stepValue moves by steps, clamps to the range and rounds to the step's precision", () => {
    const radius = PROPERTY_REGISTRY["shape.cornerRadius"]; // min 0
    assert.equal(stepValue(radius, 4, 1), 5);
    assert.equal(stepValue(radius, 4, 10), 14);
    assert.equal(stepValue(radius, 4, -10), 0, "never below the minimum");
    const inner = PROPERTY_REGISTRY["shape.innerRadius"]; // 0..1, step 0.01
    assert.equal(stepValue(inner, 0.5, 1), 0.51);
    assert.equal(stepValue(inner, 0.99, 5), 1, "never above the maximum");
    assert.equal(stepValue(inner, 0.1, 1, 0.01 * 0.1), 0.101, "Alt takes a tenth of a step");
    assert.equal(stepValue(PROPERTY_REGISTRY["appearance.opacity"], 0.1 + 0.2, 1), 0.31, "no floating-point dust");
    assert.equal(stepValue(PROPERTY_REGISTRY["frame.width"], 10, 1), 11, "whole numbers stay whole");
    assert.equal(stepValue(PROPERTY_REGISTRY["frame.width"], 20.9, -1), 19.9, "a value keeps the precision it has");
  });
});

describe("Phase 34: scrubbing", () => {
  const width = PROPERTY_REGISTRY["frame.width"];
  const opacity = PROPERTY_REGISTRY["appearance.opacity"];
  it("four pixels of drag make one step", () => {
    assert.equal(scrubValue(width, 100, 40), 110);
    assert.equal(scrubValue(width, 100, -8), 98);
    assert.equal(scrubValue(width, 100, 0), 100);
  });
  it("Shift is ten times faster and Alt a tenth", () => {
    assert.equal(scrubValue(width, 100, 40, { shift: true }), 200);
    assert.equal(scrubValue(width, 100, 40, { alt: true }), 101);
    assert.equal(scrubValue(opacity, 0.5, 40, { alt: true }), 0.51);
  });
  it("stays inside the range", () => {
    assert.equal(scrubValue(opacity, 0.5, 4000), 1);
    assert.equal(scrubValue(opacity, 0.5, -4000), 0);
    assert.equal(scrubValue(PROPERTY_REGISTRY["shape.cornerRadius"], 3, -400), 0);
  });
});
