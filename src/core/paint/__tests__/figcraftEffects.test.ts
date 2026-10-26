/**
 * FigCraft port F7: effects. The cases of FigCraft's `crates/doc/src/blur_tests.rs` and `effects_tests.rs` (commit
 * 6ea44e9) translated to our effect list (files from before progressive blur, camel- and snake-case names, hostile
 * values, reach, glass), and what reaches the markup: a noise or texture filter defined once and used by the layer,
 * a progressive blur as stepped backdrop layers inside a frame, glass as a frosted backdrop with edge highlights.
 * MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { RenderLayer } from "../../render/RenderLayer";
import {
  DEFAULT_GLASS,
  EFFECT_TYPES,
  MAX_BLUR_RADIUS,
  backdropRadius,
  blurBands,
  effectFilter,
  effectLabel,
  effectOfType,
  effectReach,
  glassCss,
  maxBend,
  maxRadius,
  parseEffect,
  parseEffects,
  sanitizeBlur,
  sanitizeGlass,
  scaledBlur,
  serializeEffects,
  type Blur,
  type Effect,
} from "../effects";
import { effectsOf, setEffects } from "../paintOps";

describe("FigCraft blur settings (blur_tests.rs)", () => {
  it("old blur files open as uniform", () => {
    const e = parseEffect({ type: "layerBlur", radius: 6 })!;
    assert.equal(e.type, "layerBlur");
    assert.deepEqual([(e as Blur).radius, (e as Blur).blurType], [6, "uniform"]);
    const b = parseEffect({ type: "backgroundBlur", radius: 3, visible: false })!;
    assert.deepEqual([(b as Blur).radius, (b as Blur).blurType, b.visible], [3, "uniform", false]);
  });

  it("progressive fields round-trip; snake-case names and NORMAL read too", () => {
    const e = parseEffect({ type: "layerBlur", radius: 20, blurType: "PROGRESSIVE", startRadius: 2, startOffset: [0.1, 0.2], endOffset: [0.9, 0.8] }) as Effect & Blur;
    assert.deepEqual([e.blurType, e.radius, e.startRadius, e.start, e.end], ["progressive", 20, 2, [0.1, 0.2], [0.9, 0.8]]);
    assert.deepEqual(parseEffects(serializeEffects([e])), [e]);
    const s = parseEffect({ type: "backgroundBlur", radius: 4, blur_type: "normal", start_radius: 9 }) as Effect & Blur;
    assert.equal(s.blurType, "uniform");
  });

  it("hostile blur values are made safe", () => {
    const b = sanitizeBlur({ radius: Infinity, blurType: "progressive", startRadius: -5, start: [NaN, 1e9], end: [-Infinity, 0.5] });
    assert.deepEqual([b.radius, b.startRadius], [0, 0]);
    assert.deepEqual([b.start, b.end], [[0.5, 1000], [0.5, 0.5]]);
    assert.equal(maxRadius({ ...sanitizeBlur({}), radius: 1e300 }), MAX_BLUR_RADIUS);
  });

  it("reach and backdrop cover the largest radius; scaling scales radii, not points", () => {
    const b: Blur = { radius: 2, blurType: "progressive", startRadius: 30, start: [0.5, 0], end: [0.5, 1] };
    assert.equal(maxRadius(b), 30);
    assert.equal(maxRadius({ ...b, blurType: "uniform" }), 2, "a uniform blur ignores the start radius");
    assert.equal(effectReach({ type: "layerBlur", visible: true, ...b }), 45);
    assert.equal(backdropRadius({ type: "backgroundBlur", visible: true, ...b }), 30);
    const s = scaledBlur(b, 2);
    assert.deepEqual([s.radius, s.startRadius, s.start, s.end], [4, 60, b.start, b.end]);
  });
});

describe("FigCraft effect kinds (effects_tests.rs)", () => {
  it("effect types by name", () => {
    for (const [label, type] of EFFECT_TYPES) {
      const e = effectOfType(type)!;
      assert.equal(effectLabel(e), label);
      assert.ok(e.visible);
    }
    assert.equal(effectOfType("background blur")!.type, "backgroundBlur");
    assert.equal(effectOfType("blur")!.type, "layerBlur");
    assert.equal(effectOfType("LAYER_BLUR")!.type, "layerBlur");
    assert.equal(effectOfType("Glass")!.type, "glass");
    assert.equal(effectOfType("sparkle"), null);
  });

  it("old noise and texture files still open; camel-case glass reads too; each round-trips", () => {
    const n = parseEffect({ type: "noise", size: 1, density: 0.3, color: { r: 1, g: 0, b: 0, a: 0.5 } })!;
    assert.ok(n.type === "noise");
    assert.deepEqual([n.mode, n.size, n.density, n.sizeY], ["mono", 1, 0.3, undefined]);
    assert.match(n.color, /255, 0, 0, 0\.5|#ff000080/i);
    const t = parseEffect({ type: "texture", size: 2, radius: 3, visible: false })!;
    assert.ok(t.type === "texture");
    assert.deepEqual([t.size, t.radius, t.clipToShape, t.visible], [2, 3, false, false]);
    const g = parseEffect({ type: "glass", lightAngle: 30, lightIntensity: 0.5, depth: 12 })!;
    assert.ok(g.type === "glass");
    assert.deepEqual([g.lightAngle, g.lightIntensity, g.depth, g.refraction], [30, 0.5, 12, DEFAULT_GLASS.refraction]);
    for (const e of ["noise", "texture", "glass"].map((x) => effectOfType(x)!)) assert.deepEqual(parseEffects(serializeEffects([e])), [e]);
  });

  it("glass values are clamped and reach their backdrop", () => {
    const g = sanitizeGlass({ refraction: 7, depth: -3, dispersion: NaN, frost: Infinity, splay: -1 });
    assert.deepEqual([g.refraction, g.depth, g.dispersion, g.splay], [1, 1, DEFAULT_GLASS.dispersion, 0]);
    assert.ok(Number.isFinite(g.frost));
    const e = effectOfType("glass")!;
    assert.ok(e.type === "glass");
    assert.ok(backdropRadius(e) >= e.frost + maxBend(e) / 1.5 - 1e-9);
    assert.equal(backdropRadius(effectOfType("background blur")!), 4);
    assert.equal(backdropRadius({ ...e, visible: false }), 0);
  });

  it("junk in a list is dropped, the list is bounded", () => {
    assert.deepEqual(parseEffects("nope"), []);
    assert.deepEqual(parseEffects(JSON.stringify([{ type: "sparkle" }, null, 4, { type: "noise", density: 9 }])).map((e) => e.type), ["noise"]);
    assert.equal((parseEffects(JSON.stringify([{ type: "noise", density: 9 }]))[0] as { density: number }).density, 1);
    assert.equal(parseEffects(JSON.stringify(Array.from({ length: 40 }, () => ({ type: "glass" })))).length, 16);
  });
});

describe("FigCraft port F7: drawing", () => {
  it("noise and texture make one filter in list order; noise only lands on the layer's pixels", () => {
    const f = effectFilter("lay_1", [effectOfType("texture")!, { ...effectOfType("noise")!, mode: "duo" } as Effect])!;
    assert.equal(f.id, "fx-lay_1");
    const tags = f.primitives.map((p) => p.tag);
    assert.ok(tags.indexOf("feDisplacementMap") < tags.lastIndexOf("feTurbulence"), "texture first");
    assert.ok(f.primitives.some((p) => p.tag === "feComposite" && p.attrs.in2 === "SourceAlpha"), "grains clipped to the layer");
    assert.equal(f.primitives.filter((p) => p.tag === "feFlood").length, 2, "duo: two colours");
    assert.equal(effectFilter("x", [effectOfType("glass")!]), null);
    assert.equal(effectFilter("x", [{ ...effectOfType("noise")!, visible: false }]), null);
    // the same layer always has the same grain
    assert.deepEqual(effectFilter("lay_1", [effectOfType("noise")!]), effectFilter("lay_1", [effectOfType("noise")!]));
  });

  it("a progressive blur steps from the start radius to the end one along its line", () => {
    const bands = blurBands({ radius: 10, blurType: "progressive", startRadius: 0, start: [0.5, 0], end: [0.5, 1] }, 5);
    assert.deepEqual(bands.map((b) => b.radius), [2, 4, 6, 8, 10]);
    assert.match(bands[0].mask, /^linear-gradient\(180deg, transparent 0%, black 20%, transparent 40%\)$/);
    assert.match(bands[4].mask, /black 100%\)$/, "the last band holds to the end");
    assert.deepEqual(blurBands({ radius: 6, blurType: "uniform", startRadius: 0, start: [0, 0], end: [0, 1] }), [{ radius: 6, mask: "none" }]);
    assert.match(blurBands({ radius: 10, blurType: "progressive", startRadius: 0, start: [0, 0.5], end: [1, 0.5] })[0].mask, /90deg/);
  });

  it("glass is a frosted backdrop with highlights on the side the light comes from", () => {
    const g = glassCss({ ...DEFAULT_GLASS, lightAngle: 0, frost: 6 });
    assert.match(g.backdropFilter, /^blur\(6px\) saturate\(/);
    assert.match(g.boxShadow, /^inset -0px 3px|^inset 0px 3px/, g.boxShadow);
  });
});

describe("FigCraft port F7: on layers", () => {
  const rect = (id: string, parentId: string, props: Record<string, unknown>, archetype: "container" | "rectangle" = "container"): Layer =>
    createLayer({ id, archetype, parentId, name: id, properties: { positioning: "absolute", "frame.x": 0, "frame.y": 0, "frame.width": 100, "frame.height": 60, ...props } }) as Layer;
  beforeEach(() =>
    setDocument(
      createDocumentFromLayers([
        createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: ["card", "shape"], properties: { "frame.width": 400, "frame.height": 300 } }) as Layer,
        rect("card", "pg", { "appearance.background.color": "#ffffff" }),
        rect("shape", "pg", { "svg.fill": "#ff0000" }, "rectangle"),
      ]),
    ),
  );
  const html = () => renderToStaticMarkup(createElement(RenderLayer, { layerId: "pg", layers: getDocument().layers }));

  it("setting effects sanitises them, is one undo step, and the stage draws them", () => {
    assert.equal(setEffects(["card", "shape"], [{ type: "noise", density: 0.4 }, { type: "glass", frost: 9999 }, { type: "junk" }]), 2);
    assert.deepEqual(effectsOf("card").map((e) => e.type), ["noise", "glass"]);
    assert.equal((effectsOf("card")[1] as { frost: number }).frost, 1000);
    const out = html();
    assert.ok(out.includes('<filter id="fx-card"') && out.includes('<filter id="fx-shape"'), "the frame defines both filters once");
    assert.equal(out.match(/data-effect-defs/g)?.length, 1);
    assert.match(out, /data-element-id="card"[^>]*filter:url\(#fx-card\)/);
    assert.match(out, /data-element-id="card"[^>]*backdrop-filter:blur\(200px\) saturate/, "glass frosts the backdrop (capped)");
    historyCommands.undo();
    assert.deepEqual(effectsOf("card"), []);
    assert.ok(!html().includes("data-effect-defs"), "nothing drawn without effects");
  });

  it("a progressive blur in a frame is drawn by its backdrop layers; a uniform one in the list wins over the plain blur", () => {
    setEffects(["card"], [{ type: "backgroundBlur", blurType: "progressive", radius: 10, startRadius: 0, start: [0.5, 0], end: [0.5, 1] }]);
    const out = html();
    assert.equal(out.match(/data-effect-band="backgroundBlur"/g)?.length, 5);
    assert.doesNotMatch(out, /data-element-id="card"[^>]*backdrop-filter/, "the frame itself has no backdrop blur");
    setEffects(["shape"], [{ type: "layerBlur", radius: 7 }]);
    setDocument({ ...getDocument(), layers: { ...getDocument().layers, shape: { ...getDocument().layers.shape, properties: { ...getDocument().layers.shape.properties, "filter.blur": 3 } } } });
    assert.match(html(), /data-element-id="shape"[^>]*filter:blur\(7px\)/);
  });
});
