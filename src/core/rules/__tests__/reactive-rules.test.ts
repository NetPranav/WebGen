/**
 * Sub-Phase 8.1 (v0.2 growth): grammar §13.4 rules 6.9 (blend conflicts),
 * 6.10 (signal cycles), 6.11 (touch parity) and 6.16 (event bridging),
 * against real `Binding`s built the same way the Phase 7 gate does.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DocBuilder } from "../../document/__tests__/fixtures/builder";
import { findBlendConflicts, findSignalCycles, findTouchParityViolations, findEventBridgingViolations, REACTIVE_RULE_GAPS } from "../reactive-rules";

describe("Grammar §6.10: signal cycles (Sub-Phase 8.1)", () => {
  it("flags two layers whose Reactive bindings read each other (an indirect cycle)", () => {
    const b = new DocBuilder();
    const a = b.layer("container", "A", null);
    const other = b.layer("container", "B", null);
    b.binding(a, "proximity(B) -> A.uniform.x");
    b.binding(other, "proximity(A) -> B.uniform.y");
    const doc = b.build();

    const diagnostics = findSignalCycles(doc);
    const layerIds = diagnostics.map((d) => d.layerId);
    assert.ok(layerIds.includes(a), "expected A to be flagged");
    assert.ok(layerIds.includes(other), "expected B to be flagged");
  });

  it("does not flag a plain cross-layer read with no cycle", () => {
    const b = new DocBuilder();
    b.layer("button", "cta", null);
    const bg = b.layer("container", "bg", null);
    b.binding(bg, "proximity(cta) -> bg.uniform.uIntensity");
    const doc = b.build();

    const diagnostics = findSignalCycles(doc);
    assert.equal(diagnostics.length, 0);
  });
});

describe("Grammar §6.9: channel blending conflicts (Sub-Phase 8.1)", () => {
  it("flags two bindings on the same channel with conflicting explicit blend modes", () => {
    const b = new DocBuilder();
    const a = b.layer("container", "A", null);
    b.binding(a, "pointer.x -> A.transform.x blend add");
    b.binding(a, "pointer.y -> A.transform.x blend replace");
    const doc = b.build();

    const diagnostics = findBlendConflicts(doc);
    assert.equal(diagnostics.length, 1);
  });

  it("does not flag two bindings on the same channel with the same blend mode", () => {
    const b = new DocBuilder();
    const a = b.layer("container", "A", null);
    b.binding(a, "pointer.x -> A.transform.x blend add");
    b.binding(a, "pointer.y -> A.transform.x blend add");
    const doc = b.build();

    assert.equal(findBlendConflicts(doc).length, 0);
  });
});

describe("Grammar §6.11: touch parity (Sub-Phase 8.1, partial)", () => {
  it("flags a pointer-driven binding on a layer with no Surface", () => {
    const b = new DocBuilder();
    const a = b.layer("container", "A", null);
    b.binding(a, "pointer.uv(local) -> A.transform.x");
    const doc = b.build();

    const diagnostics = findTouchParityViolations(doc);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].code, "INPUT_TOUCH");
  });

  it("does not flag a non-pointer-driven binding", () => {
    const b = new DocBuilder();
    const a = b.layer("container", "A", null);
    b.binding(a, "scroll.progress -> A.transform.x");
    const doc = b.build();

    assert.equal(findTouchParityViolations(doc).length, 0);
  });
});

describe("Grammar §6.16: event bridging (Sub-Phase 8.1)", () => {
  it("flags a continuous signal targeting an event with no edge/threshold operator", () => {
    const b = new DocBuilder();
    const a = b.layer("container", "A", null);
    b.binding(a, "pointer.speed -> event(Ripple)");
    const doc = b.build();

    const diagnostics = findEventBridgingViolations(doc);
    assert.equal(diagnostics.length, 1);
  });

  it("does not flag an event target with an upstream edge operator", () => {
    const b = new DocBuilder();
    const a = b.layer("container", "A", null);
    b.binding(a, "pointer.down |> edge(rise) -> event(Ripple)");
    const doc = b.build();

    assert.equal(findEventBridgingViolations(doc).length, 0);
  });
});

describe("Sub-Phase 8.1: what's explicitly not covered yet (6.12–6.15)", () => {
  it("names the gaps rather than silently assuming compliance", () => {
    const rules = REACTIVE_RULE_GAPS.map((g) => g.rule);
    assert.ok(rules.some((r) => r.startsWith("6.12")));
    assert.ok(rules.some((r) => r.startsWith("6.13")));
    assert.ok(rules.some((r) => r.startsWith("6.14")));
  });
});
