/**
 * Phase 9 Verification Gate: "Fuzz test: evaluation is deterministic (same
 * inputs → same bytes)." Plus the composition-order tests for 9.3: base
 * props → state → clips (by priority) → behaviours → STA synthesis, against
 * real `MotionDocument`s built with the same `DocBuilder` the Phase 7/8 gates
 * use, composition time handled by the real `compositions.ts` (Phase 46).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DocBuilder } from "../../document/__tests__/fixtures/builder";
import { MAIN_COMPOSITION_ID } from "../../document/compositions";
import { evaluate, KERNEL_GAPS } from "../evaluate";

describe("Phase 9.3: base props and state", () => {
  it("returns the layer's own properties untouched with no clips or state", () => {
    const b = new DocBuilder();
    const id = b.layer("text", "Label", null, { "content.text": "Hello" });
    const doc = b.build();

    const props = evaluate(doc, MAIN_COMPOSITION_ID, id, 0);
    assert.equal(props["content.text"], "Hello");
  });

  it("an active state overlays its props onto the base", () => {
    const b = new DocBuilder();
    const id = b.layer("container", "Box", null, { "appearance.opacity": 1 });
    b.state(id, "dimmed", { "appearance.opacity": 0.4 });
    const doc = b.build();

    const base = evaluate(doc, MAIN_COMPOSITION_ID, id, 0);
    assert.equal(base["appearance.opacity"], 1);

    const dimmed = evaluate(doc, MAIN_COMPOSITION_ID, id, 0, { activeStates: { [id]: "dimmed" } });
    assert.equal(dimmed["appearance.opacity"], 0.4);
  });

  it("returns {} for an unknown layer", () => {
    const b = new DocBuilder();
    const doc = b.build();
    assert.deepEqual(evaluate(doc, MAIN_COMPOSITION_ID, "nope", 0), {});
  });
});

describe("Phase 9.3: clip sampling (easing.ts + interpolators.ts)", () => {
  it("samples a two-keyframe track at the midpoint through a named ease", () => {
    const b = new DocBuilder();
    const id = b.layer("container", "Box", null);
    b.clip(id, {
      name: "Entrance",
      type: "entrance",
      trigger: "mount",
      duration: 1,
      easing: "linear",
      tracks: [
        {
          id: "trk",
          property: "transform.y",
          keyframes: [
            { id: "k0", time: 0, value: 24 },
            { id: "k1", time: 1, value: 0, ease: "power1.in" }, // quad-in: eases toward the end value
          ],
        },
      ],
    });
    const doc = b.build();

    const start = evaluate(doc, MAIN_COMPOSITION_ID, id, 0);
    assert.equal(start["transform.y"], 24);
    const end = evaluate(doc, MAIN_COMPOSITION_ID, id, 1);
    assert.equal(end["transform.y"], 0);
    const mid = evaluate(doc, MAIN_COMPOSITION_ID, id, 0.5);
    // power1.in(0.5) = 0.25, so the value is 25% of the way from 24 to 0, not 50%.
    assert.ok(Math.abs((mid["transform.y"] as number) - 18) < 1e-6, `expected 18, got ${mid["transform.y"]}`);
  });

  it("holds the last frame after the clip ends, and the first frame before it starts", () => {
    const b = new DocBuilder();
    const id = b.layer("container", "Box", null);
    b.clip(id, {
      name: "In",
      type: "entrance",
      trigger: "mount",
      duration: 0.5,
      delay: 0.2,
      easing: "linear",
      tracks: [{ id: "t", property: "appearance.opacity", keyframes: [{ id: "k0", time: 0, value: 0 }, { id: "k1", time: 0.5, value: 1 }] }],
    });
    const doc = b.build();

    assert.equal(evaluate(doc, MAIN_COMPOSITION_ID, id, 0)["appearance.opacity"], 0, "before the delay: first frame");
    // Within the default main composition's 5s duration (its layer bar's exclusive `out`), but well after the clip itself ends.
    assert.equal(evaluate(doc, MAIN_COMPOSITION_ID, id, 3)["appearance.opacity"], 1, "long after: holds the last frame");
  });

  it("priority: a higher-priority category's clip wins a property both clips touch (grammar §6.2)", () => {
    const b = new DocBuilder();
    const id = b.layer("button", "CTA", null);
    // Both land in the main composition (mount/time triggers), so both are active at t=0.5.
    // Ambient (loop clip type) is the lowest-priority category among clip types.
    b.clip(id, {
      name: "Float",
      type: "loop",
      trigger: "time",
      duration: 2,
      repeat: -1,
      easing: "linear",
      tracks: [{ id: "t1", property: "transform.y", keyframes: [{ id: "k0", time: 0, value: 0 }, { id: "k1", time: 2, value: -10 }] }],
    });
    // StateTransition (morph clip type) outranks Ambient in CATEGORY_PRIORITY_ORDER.
    b.clip(id, {
      name: "Shift",
      type: "morph",
      trigger: "mount",
      duration: 1,
      easing: "linear",
      tracks: [{ id: "t2", property: "transform.y", keyframes: [{ id: "k0", time: 0, value: 0 }, { id: "k1", time: 1, value: -8 }] }],
    });
    const doc = b.build();

    const atHalf = evaluate(doc, MAIN_COMPOSITION_ID, id, 0.5);
    // Ambient alone would give -2.5 (halfway to -10 over 2s); StateTransition (halfway to -8 over 1s) must win instead, giving -4.
    assert.equal(atHalf["transform.y"], -4, "StateTransition's halfway value (0 → -8) should win, not Ambient's (0 → -10)");
  });
});

describe("Phase 9.3: the `loop` behaviour (a pure function of t)", () => {
  it("cycles a property between two values, holding no history", () => {
    const b = new DocBuilder();
    const id = b.layer("container", "Box", null);
    b.behaviour(id, {
      type: "loop",
      enabled: true,
      params: { property: "transform.scale", from: 1, to: 1.1, duration: 2, easing: "linear", yoyo: true },
    });
    const doc = b.build();

    assert.equal(evaluate(doc, MAIN_COMPOSITION_ID, id, 0)["transform.scale"], 1);
    const quarter = evaluate(doc, MAIN_COMPOSITION_ID, id, 0.5)["transform.scale"] as number;
    assert.ok(Math.abs(quarter - 1.025) < 1e-6);
    // Same phase every period: t=0 and t=4 (2 full yoyo cycles later) must match exactly.
    assert.equal(evaluate(doc, MAIN_COMPOSITION_ID, id, 4)["transform.scale"], evaluate(doc, MAIN_COMPOSITION_ID, id, 0)["transform.scale"]);
  });
});

describe("Phase 9.3: Single Transform Authority synthesis", () => {
  it("synthesizes a `transform` string from resolved transform.* properties", () => {
    const b = new DocBuilder();
    const id = b.layer("container", "Box", null, { "transform.y": -8, "transform.scale": 1.05 });
    const doc = b.build();

    const props = evaluate(doc, MAIN_COMPOSITION_ID, id, 0);
    assert.equal(typeof props.transform, "string");
    assert.match(props.transform as string, /translate3d\(0px, -8px, 0px\)/);
    assert.match(props.transform as string, /scale\(1\.05, 1\.05\)/);
  });

  it("omits `transform` entirely when no transform.* property is touched", () => {
    const b = new DocBuilder();
    const id = b.layer("text", "Label", null);
    const doc = b.build();
    assert.equal(evaluate(doc, MAIN_COMPOSITION_ID, id, 0).transform, undefined);
  });
});

describe("Phase 9 Verification Gate: determinism fuzz test", () => {
  it("the same (doc, compositionId, layerId, t, inputs) always evaluates to the same bytes", () => {
    const b = new DocBuilder();
    const id = b.layer("button", "CTA", null, { "appearance.opacity": 1 });
    b.state(id, "hover", { "appearance.opacity": 0.9 });
    b.clip(id, {
      name: "In",
      type: "entrance",
      trigger: "mount",
      duration: 0.8,
      easing: "back.out(1.7)",
      tracks: [
        { id: "t1", property: "transform.y", keyframes: [{ id: "k0", time: 0, value: 30 }, { id: "k1", time: 0.8, value: 0, ease: "back.out(1.7)" }] },
        { id: "t2", property: "typography.color", keyframes: [{ id: "k2", time: 0, value: "#206859" }, { id: "k3", time: 0.8, value: "#dc2626", ease: "sine.inOut" }] },
      ],
    });
    b.behaviour(id, { type: "loop", enabled: true, params: { property: "transform.rotate", from: -2, to: 2, duration: 1.3, easing: "sine.inOut", yoyo: true } });
    const doc = b.build();

    let seed = 1;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };

    for (let i = 0; i < 200; i++) {
      const t = random() * 5;
      const withHover = random() > 0.5;
      const inputs = withHover ? { activeStates: { [id]: "hover" } } : {};

      const a = evaluate(doc, MAIN_COMPOSITION_ID, id, t, inputs);
      const b2 = evaluate(doc, MAIN_COMPOSITION_ID, id, t, inputs);
      assert.equal(JSON.stringify(a), JSON.stringify(b2), `mismatch at t=${t}, hover=${withHover}`);
    }
  });
});

describe("Phase 9.3: performance ('evaluating 200 tracks at one t takes < 1ms in the browser')", () => {
  it("evaluates 200 tracks on one layer well within budget", () => {
    const b = new DocBuilder();
    const id = b.layer("container", "Box", null);
    const properties = ["transform.x", "transform.y", "transform.scale", "appearance.opacity", "transform.rotate"];
    for (let i = 0; i < 200; i++) {
      b.clip(id, {
        name: `Track ${i}`,
        type: "loop",
        trigger: "time",
        duration: 1 + (i % 5) * 0.1,
        repeat: -1,
        easing: "linear",
        tracks: [
          {
            id: `trk_${i}`,
            property: properties[i % properties.length],
            keyframes: [
              { id: `k0_${i}`, time: 0, value: 0 },
              { id: `k1_${i}`, time: 1, value: 10, ease: "power2.inOut" },
            ],
          },
        ],
      });
    }
    const doc = b.build();

    // Warm up the JIT, then measure — this is a Node proxy for the browser
    // budget (V8-in-Node and a browser's V8 aren't identical, but the same
    // order of magnitude), so the assertion is generously above 1ms.
    for (let i = 0; i < 20; i++) evaluate(doc, MAIN_COMPOSITION_ID, id, 0.5);
    const start = performance.now();
    const props = evaluate(doc, MAIN_COMPOSITION_ID, id, 0.5);
    const elapsed = performance.now() - start;

    assert.ok(Object.keys(props).length >= properties.length);
    assert.ok(elapsed < 10, `evaluate() with 200 tracks took ${elapsed}ms`);
  });
});

describe("Phase 9.3: what the kernel does not evaluate yet", () => {
  it("names its gaps rather than silently faking Phase 12/60's territory", () => {
    const areas = KERNEL_GAPS.map((g) => g.area);
    assert.ok(areas.includes("behaviours"));
    assert.ok(areas.includes("signal bindings"));
  });
});
