/**
 * FigCraft port F12: the Scale tool. The cases of FigCraft's `crates/engine/src/scale_tool_tests.rs` (commit 6ea44e9)
 * translated to our layers: anchors, the factor and pivot of a handle drag, scaling strokes, effects and radii in one
 * undo step, frames scaling their children whatever their constraints, several layers together, every size-like
 * property. MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { worldBox } from "../layerBoxes";
import { anchorName, anchorOf, scaleFactor, scaleLayers, scaleProps, scaleSelection, type Anchor } from "../scaleLayers";
import { parseShadows } from "../../paint/paints";
import { parseEffects } from "../../paint/effects";

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const tl: Anchor = [0, 0];

describe("FigCraft scale: anchors and the factor of a drag", () => {
  it("anchors round-trip by name", () => {
    ["tl", "t", "tr", "l", "c", "r", "bl", "b", "br"].forEach((name, i) => {
      assert.deepEqual(anchorOf(name), [i % 3, Math.floor(i / 3)]);
      assert.equal(anchorName(anchorOf(name)!), name);
    });
    assert.deepEqual(anchorOf(" BR "), [2, 2]);
    assert.equal(anchorOf("middle"), null);
    assert.equal(anchorName([9, 9]), "br");
  });

  it("the pivot is the anchor unless it is on the dragged side; corners follow the axis that moved most; Alt or a centre anchor scales about the centre", () => {
    const [w, h] = [100, 50];
    assert.deepEqual(scaleFactor({ corner: 2 }, { x: 200, y: 60 }, w, h, tl, false), { k: 2, pivot: { x: 0, y: 0 } });
    assert.deepEqual(scaleFactor({ corner: 1 }, { x: 150, y: -25 }, w, h, tl, false), { k: 1.5, pivot: { x: 0, y: 50 } });
    assert.deepEqual(scaleFactor({ edge: 1 }, { x: 50, y: 999 }, w, h, tl, false), { k: 0.5, pivot: { x: 0, y: 0 } });
    assert.deepEqual(scaleFactor({ edge: 3 }, { x: -100, y: 0 }, w, h, tl, false), { k: 2, pivot: { x: 100, y: 25 } });
    assert.deepEqual(scaleFactor({ corner: 2 }, { x: 150, y: 75 }, w, h, [1, 1], false), { k: 2, pivot: { x: 50, y: 25 } });
    assert.deepEqual(scaleFactor({ edge: 2 }, { x: 0, y: 75 }, w, h, tl, true), { k: 2, pivot: { x: 50, y: 25 } });
    // past the pivot flips; it never collapses to nothing
    assert.equal(scaleFactor({ corner: 2 }, { x: -100, y: -50 }, w, h, tl, false)!.k, -1);
    assert.equal(scaleFactor({ corner: 2 }, { x: 0, y: 0 }, w, h, tl, false)!.k, 0.01);
    // lines (no height) scale along their length
    assert.equal(scaleFactor({ corner: 1 }, { x: 300, y: 7 }, 100, 0, tl, false)!.k, 3);
    for (const bad of [NaN, Infinity]) assert.equal(scaleFactor({ corner: 2 }, { x: bad, y: 0 }, w, h, tl, false), null);
    assert.equal(scaleFactor({ corner: 2 }, { x: 5, y: 5 }, 0, 0, tl, false), null);
  });
});

describe("FigCraft scale: on layers", () => {
  const rect = (id: string, x: number, y: number, w: number, h: number, extra: Record<string, unknown> = {}, parentId = "pg"): Layer =>
    createLayer({ id, archetype: "rectangle", parentId, name: id, properties: { positioning: "absolute", "frame.x": x, "frame.y": y, "frame.width": w, "frame.height": h, ...extra } }) as Layer;
  const page = (layers: Layer[]) =>
    setDocument(createDocumentFromLayers([createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: layers.filter((l) => l.parentId === "pg").map((l) => l.id), properties: { "frame.x": 0, "frame.y": 0, "frame.width": 2000, "frame.height": 2000 } }) as Layer, ...layers]));
  const bounds = (id: string) => {
    const b = worldBox(id)!;
    return [b.cx - b.w / 2, b.cy - b.h / 2, b.cx + b.w / 2, b.cy + b.h / 2].map((v) => Math.round(v * 1000) / 1000);
  };

  it("scaling scales strokes, effects and radii, in one undo step", () => {
    page([rect("r", 0, 0, 100, 50, { "svg.strokeWidth": 2, "shape.cornerRadius": 8, "paint.shadows": JSON.stringify([{ kind: "drop", x: 0, y: 4, blur: 4, spread: 1, color: "#000" }]), "paint.effects": JSON.stringify([{ type: "layerBlur", radius: 3 }]) })]);
    assert.equal(scaleLayers(["r"], 2, { x: 0, y: 0 }), 1);
    assert.deepEqual(bounds("r"), [0, 0, 200, 100]);
    const p = getDocument().layers.r.properties;
    assert.deepEqual([p["svg.strokeWidth"], p["shape.cornerRadius"]], [4, 16]);
    const sh = parseShadows(p["paint.shadows"])[0];
    assert.ok(near(sh.blur, 8) && near(sh.y, 8) && near(sh.spread, 2));
    assert.equal((parseEffects(p["paint.effects"])[0] as { radius: number }).radius, 6);
    historyCommands.undo();
    assert.deepEqual(bounds("r"), [0, 0, 100, 50]);
    assert.equal(getDocument().layers.r.properties["svg.strokeWidth"], 2);
  });

  it("the anchor decides what stays put", () => {
    page([rect("r", 0, 0, 100, 50)]);
    scaleSelection(["r"], 2, [1, 1]);
    assert.deepEqual(bounds("r"), [-50, -25, 150, 75]);
  });

  it("frames scale their children whatever their constraints, and text sizes with them", () => {
    page([
      createLayer({ id: "f", archetype: "container", parentId: "pg", name: "f", children: ["c", "t"], properties: { positioning: "absolute", "frame.x": 0, "frame.y": 0, "frame.width": 200, "frame.height": 100, "constraints.horizontal": "right" } }) as Layer,
      rect("c", 150, 60, 40, 30, { "constraints.horizontal": "right", "constraints.vertical": "bottom" }, "f"),
      createLayer({ id: "t", archetype: "text", parentId: "f", name: "t", properties: { positioning: "absolute", "frame.x": 0, "frame.y": 0, "frame.width": 80, "frame.height": 20, "content.text": "Hi", "typography.fontSize": 16, "typography.paragraphIndent": 4 } }) as Layer,
    ]);
    scaleLayers(["f"], 1.5, { x: 0, y: 0 });
    assert.deepEqual(bounds("f"), [0, 0, 300, 150]);
    assert.deepEqual(bounds("c"), [225, 90, 285, 135]);
    assert.equal(getDocument().layers.t.properties["typography.fontSize"], 24);
    assert.equal(getDocument().layers.t.properties["typography.paragraphIndent"], 6);
  });

  it("several layers scale together about the pivot", () => {
    page([rect("a", 0, 0, 50, 50), rect("b", 100, 50, 50, 50)]);
    scaleSelection(["a", "b"], 2, tl);
    assert.deepEqual(bounds("a"), [0, 0, 100, 100]);
    assert.deepEqual(bounds("b"), [200, 100, 300, 200]);
  });

  it("dragging past the pivot turns the layer over: it lands on the other side, its size kept", () => {
    page([rect("r", 0, 0, 100, 50)]);
    scaleLayers(["r"], -1, { x: 0, y: 0 });
    assert.deepEqual(bounds("r"), [-100, -50, 0, 0]);
  });

  it("every size-like property scales: min and max sizes, layout grids, guides, spacing, dashes, side weights", () => {
    const l = createLayer({
      id: "f",
      archetype: "container",
      parentId: "pg",
      name: "f",
      properties: {
        "layout.minWidth": 50,
        "layout.maxWidth": 400,
        "layout.gap": 8,
        "layout.paddingTop": 10,
        "frame.layoutGrids": JSON.stringify([{ kind: "columns", count: 4, gutter: 20, offset: 10, size: 30 }]),
        "frame.guides": JSON.stringify([{ axis: "x", pos: 40 }]),
        "svg.strokeDasharray": "4 2",
        "stroke.sides": "[1,2,3,4]",
        "typography.letterSpacing": 2,
        "typography.lineHeight": 1.4,
      },
    }) as Layer;
    const p = scaleProps(l, 2);
    assert.deepEqual([p["layout.minWidth"], p["layout.maxWidth"], p["layout.gap"], p["layout.paddingTop"]], [100, 800, 16, 20]);
    const g = JSON.parse(String(p["frame.layoutGrids"]))[0];
    assert.deepEqual([g.gutter, g.offset, g.size, g.count], [40, 20, 60, 4]);
    assert.equal(JSON.parse(String(p["frame.guides"]))[0].pos, 80);
    assert.equal(p["svg.strokeDasharray"], "8 4");
    assert.equal(p["stroke.sides"], "[2,4,6,8]");
    assert.equal(p["typography.letterSpacing"], 4, "pixels by default");
    assert.equal(p["typography.lineHeight"], undefined, "a line-height multiplier follows the font size by itself");
  });
});
