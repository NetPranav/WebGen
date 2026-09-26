/**
 * ROADMAP Phase 7 Verification Gate.
 *
 * "Each of these 12 reference effects can be *expressed* as a valid MDM
 * document with no escape hatches … So can 4 interactive ones … (v3.2) the
 * reference build is expressible as a valid document: a helper ellipse with a
 * Follow on its bottom-centre pin, a Split group of letters, and the two
 * interaction rules."
 *
 * "No escape hatches" is checked, not asserted: no `generic` layers, no prop
 * holding a free-form object, every entity strict-typed (unknown keys fail),
 * every binding round-trips through its text form, and every document
 * survives JSON and a reload unchanged. The review checklist is
 * DOCS/Initial/audit/phase7-gate-checklist.md.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateMotionDocument, type MotionDocument } from "../schema";
import { loadDocument } from "../migrations";
import { getPropertyDefinition } from "../properties";
import { formatBinding, parseBinding, type BindingDraft } from "../signals";
import { EffectDefinitionSchema, validateEffectInstance } from "../effect-definition";
import { behaviourToBindings } from "../behaviour-presets";
import { AURORA_VEIL, INTERACTIVE_REFERENCE_EFFECTS, REFERENCE_BUILD, REFERENCE_EFFECTS } from "./fixtures/reference-effects";

function assertExpressible(name: string, doc: MotionDocument) {
  const check = validateMotionDocument(doc);
  assert.ok(check.ok, `${name}: ${check.ok ? "" : JSON.stringify(check.issues.slice(0, 5), null, 1)}`);

  for (const layer of Object.values(doc.layers)) {
    assert.notEqual(layer.archetype, "generic", `${name}: "${layer.name}" is a generic layer (an escape hatch)`);
    for (const path of Object.keys(layer.properties)) {
      const def = getPropertyDefinition(path)!;
      // 3D geometry descriptors are the one typed object value the registry declares.
      if (def.valueType === "object") assert.equal(path, "scene3d.geometry", `${name}: "${path}" holds a free-form object`);
    }
  }
  for (const binding of Object.values(doc.bindings)) {
    const draft: Partial<typeof binding> = { ...binding };
    for (const key of ["id", "ownerLayerId", "enabled", "name"] as const) delete draft[key];
    assert.deepEqual(parseBinding(formatBinding(draft as BindingDraft)), draft, `${name}: binding ${binding.id} round-trips through its text form`);
  }
  // Reload: stored as JSON, loaded through the migration entry point, unchanged.
  assert.deepEqual(loadDocument({ document: JSON.parse(JSON.stringify(doc)) }), doc, `${name}: reloads unchanged`);
}

describe("Phase 7 gate: the 12 reference effects are expressible", () => {
  for (const [name, build] of Object.entries(REFERENCE_EFFECTS)) it(name, () => assertExpressible(name, build()));

  it("the aurora background's library definition is valid and the instance matches it", () => {
    const def = EffectDefinitionSchema.safeParse(AURORA_VEIL);
    assert.ok(def.success, def.success ? "" : JSON.stringify(def.error.issues.slice(0, 5)));
    const doc = REFERENCE_EFFECTS["aurora shader background"]();
    for (const instance of Object.values(doc.effects)) assert.deepEqual(validateEffectInstance(instance, def.data), []);
  });

  it("behaviours expand to bindings that are themselves valid in the document", () => {
    for (const build of [REFERENCE_EFFECTS["magnet button"], REFERENCE_EFFECTS["3D tilt card"]]) {
      const doc = build();
      for (const behaviour of Object.values(doc.behaviours)) {
        const expanded = behaviourToBindings(behaviour);
        assert.ok(expanded.bindings.length > 0);
        const withBindings = structuredClone(doc);
        withBindings.behaviours = {};
        expanded.bindings.forEach((draft, i) => {
          withBindings.bindings[`bind_${i}`] = { id: `bind_${i}`, ownerLayerId: behaviour.layerId, enabled: true, ...draft };
        });
        // `state(Hover)` guards need the layer's grammar states: the button has them.
        const check = validateMotionDocument(withBindings);
        assert.ok(check.ok, check.ok ? "" : JSON.stringify(check.issues.slice(0, 3)));
      }
    }
  });
});

describe("Phase 7 gate (v3.0): the 4 interactive effects are expressible", () => {
  for (const [name, build] of Object.entries(INTERACTIVE_REFERENCE_EFFECTS)) it(name, () => assertExpressible(name, build()));
});

describe("Phase 7 gate (v3.2): the reference build is expressible", () => {
  for (const [name, build] of Object.entries(REFERENCE_BUILD)) it(name, () => assertExpressible(name, build()));

  it("has a helper ellipse following the pointer by its bottom-centre pin, a Split group of letters, and the two rules", () => {
    const doc = REFERENCE_BUILD["reference build (Blueprint form)"]();
    const circle = Object.values(doc.layers).find((l) => l.name === "Cursor Circle")!;
    assert.equal(circle.archetype, "ellipse");
    assert.equal(circle.properties["render.role"], "helper");
    const follow = Object.values(doc.components).find((c) => c.type === "follow" && c.layerId === circle.id);
    assert.ok(follow && follow.type === "follow");
    assert.equal(follow.pin, "bottomCentre");
    assert.deepEqual(follow.target, { kind: "pointer", space: "frame" });
    assert.equal(follow.touch, "while-pressed");

    const split = Object.values(doc.generators).find((g) => g.kind === "split")!;
    assert.equal(split.pieces.map((p) => p.char).join(""), "LAZYLAYOUT");
    assert.equal(doc.layers[split.groupLayerId].properties["a11y.label"], "LAZYLAYOUT", "read once by assistive technology (grammar 6.18)");

    const graph = Object.values(doc.graphs)[0];
    assert.deepEqual(graph.nodes.filter((n) => n.kind === "event").map((n) => n.type), ["OverlapStay", "OverlapEnd"]);
    assert.deepEqual(graph.nodes.filter((n) => n.kind === "action").map((n) => n.type), ["KeepOut", "AddSpin", "SpringHome"]);
  });
});
