/**
 * FigCraft port F14: SVG import as an editable design. The cases of FigCraft's `crates/svg/src/import/structure_tests.rs`,
 * `paint_tests.rs`, `shape_tests.rs` and `hostile_tests.rs` (commit 6ea44e9), translated to our plan and layers.
 * MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decodeId, parseTransform, planSvgImport, type PlanLayer } from "../svgImport";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { importSvgDesign } from "../../editing/svgImportOps";

const svg = (body: string, attrs = 'width="100" height="100"') => `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;
const plan = (body: string, attrs?: string) => planSvgImport(svg(body, attrs))!;
/** The plan as (depth, archetype, name) rows. */
const tree = (layers: PlanLayer[], depth = 0): [number, string, string][] => layers.flatMap((l) => [[depth, l.archetype, l.name] as [number, string, string], ...tree(l.children, depth + 1)]);
const find = (layers: PlanLayer[], name: string): PlanLayer | undefined => {
  for (const l of layers) {
    if (l.name === name) return l;
    const f = find(l.children, name);
    if (f) return f;
  }
  return undefined;
};
const fills = (l: PlanLayer) => JSON.parse(String(l.properties["paint.fills"]));

describe("FigCraft SVG import: structure", () => {
  it("wrappers merge into their element; a named group stays; empty groups go", () => {
    const p = plan('<rect id="r" width="10" height="10" transform="translate(5 5)" opacity="0.5"/>');
    assert.deepEqual(tree(p.layers), [[0, "rectangle", "r"]]);
    assert.deepEqual([p.layers[0].box.x, p.layers[0].properties["appearance.opacity"]], [5, 0.5]);
    const q = plan('<g id="logo"><circle r="5"/></g><g opacity="0.5"><rect width="1" height="1"/><rect x="2" width="1" height="1"/></g>');
    assert.deepEqual(tree(q.layers), [[0, "container", "logo"], [1, "ellipse", "Ellipse"], [0, "container", "Group"], [1, "rectangle", "Rectangle"], [1, "rectangle", "Rectangle"]]);
    assert.deepEqual(tree(plan('<g id="empty"/><g><g/></g>')?.layers ?? []), []);
  });

  it("a group's opacity and its only layer's multiply when they merge", () => {
    const p = plan('<g opacity="0.5"><rect id="r" width="10" height="10" opacity="0.5"/></g>');
    assert.deepEqual(tree(p.layers), [[0, "rectangle", "r"]]);
    assert.equal(p.layers[0].properties["appearance.opacity"], 0.25);
  });

  it("strokes and dashes scale with their layer; a group's box is its layers'", () => {
    const p = plan('<g transform="scale(3)"><line id="l" x2="10" stroke="black" stroke-width="2" stroke-dasharray="4 2"/></g>');
    const l = find(p.layers, "l")!;
    assert.deepEqual([l.archetype, l.properties["svg.strokeWidth"], l.properties["svg.strokeDasharray"]], ["svgPath", 6, "12 6"]);
    assert.ok(l.box.w > 30 && l.box.w < 40, "30 long, the path layer's box padded for its stroke");
    const g = plan('<g id="g"><rect x="10" y="10" width="10" height="10"/><rect x="40" y="30" width="10" height="10"/></g>').layers[0];
    assert.deepEqual(g.box, { x: 10, y: 10, w: 40, h: 30 });
  });

  it("transforms are baked: a moved or scaled rectangle stays one, a turned one becomes a path", () => {
    const r = plan('<rect id="a" x="1" y="2" width="10" height="20" rx="2" transform="translate(10 0) scale(2)"/>').layers[0];
    assert.deepEqual([r.archetype, r.box, r.properties["shape.cornerRadius"]], ["rectangle", { x: 12, y: 4, w: 20, h: 40 }, 4]);
    assert.equal(plan('<rect width="10" height="20" transform="rotate(30)"/>').layers[0].archetype, "svgPath");
    assert.equal(plan('<rect width="10" height="20" rx="2" ry="5"/>').layers[0].archetype, "svgPath", "uneven corners: a path");
    assert.deepEqual(parseTransform("translate(10) rotate(90)").map((v) => Math.round(v * 1000) / 1000), [0, 1, -1, 0, 10, 0]);
  });

  it("a compound path keeps its holes in one layer; `<use>` copies what it points at; the viewBox maps into the picture", () => {
    const p = plan('<path id="donut" fill-rule="evenodd" d="M0 0H10V10H0Z M3 3H7V7H3Z"/>');
    assert.equal(p.layers[0].properties["svg.fillRule"], "evenodd");
    assert.equal((String(p.layers[0].properties["svg.path"]).match(/M/g) ?? []).length, 2);
    const u = plan('<defs><rect id="dot" width="4" height="4" fill="#0f0"/></defs><use href="#dot" x="10" y="20"/><use href="#dot" x="30" y="20"/>');
    assert.deepEqual(u.layers.map((l) => [l.archetype, l.box.x, l.box.y]), [["rectangle", 10, 20], ["rectangle", 30, 20]]);
    const v = planSvgImport(svg('<rect width="10" height="10"/>', 'viewBox="0 0 10 10" width="100" height="100"'))!;
    assert.deepEqual(v.layers[0].box, { x: 0, y: 0, w: 100, h: 100 });
  });

  it("styles inherit; inline style and `<style>` rules by tag, class and id apply", () => {
    const p = plan('<style>.blue { fill: #0000ff } #big { stroke: red; stroke-width: 3 }</style><g fill="#ff0000"><rect id="a" width="1" height="1"/><rect class="blue" id="b" width="1" height="1"/><rect id="big" width="1" height="1" style="fill:#00ff00"/></g>');
    assert.equal(find(p.layers, "a")!.properties["svg.fill"], "#ff0000");
    assert.equal(find(p.layers, "b")!.properties["svg.fill"], "#0000ff");
    const big = find(p.layers, "big")!;
    assert.deepEqual([big.properties["svg.fill"], big.properties["svg.stroke"], big.properties["svg.strokeWidth"]], ["#00ff00", "red", 3]);
  });

  it("linked files are never read; text layers are named by their text or id; a scaled text keeps its look in its size", () => {
    assert.deepEqual(tree(plan('<image width="4" height="2" href="/etc/secret.png"/><image width="4" height="2" href="file:///etc/x.png"/>')?.layers ?? []), []);
    const t = plan('<text x="10" y="20">Hello there</text><text id="Caption_x20_1" x="10" y="60">Small</text>');
    assert.deepEqual(tree(t.layers), [[0, "text", "Hello there"], [0, "text", "Caption 1"]]);
    const big = plan('<text transform="scale(2)" x="10" y="20" font-size="10">Big</text>').layers[0];
    assert.equal(big.properties["typography.fontSize"], 20);
    assert.equal(decodeId("a_x2D_b"), "a-b");
  });

  it("filters: a drop shadow and a blur carry over; others, clip paths and masks are noted", () => {
    const p = plan('<filter id="s"><feDropShadow dx="2" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.5"/></filter><filter id="b"><feGaussianBlur stdDeviation="5"/></filter><filter id="x"><feTurbulence/></filter><rect id="a" width="5" height="5" filter="url(#s)"/><rect id="c" width="5" height="5" filter="url(#b)"/><rect id="d" width="5" height="5" filter="url(#x)" clip-path="url(#q)"/>');
    assert.deepEqual(JSON.parse(String(find(p.layers, "a")!.properties["paint.shadows"]))[0], { kind: "drop", x: 2, y: 3, blur: 8, spread: 0, color: "rgba(0, 0, 0, 0.50)" });
    assert.equal(find(p.layers, "c")!.properties["filter.blur"], 5);
    assert.ok(p.notes.some((n) => n.includes("Filters other")));
    assert.ok(p.notes.some((n) => n.includes("Clip paths")));
  });
});

describe("FigCraft SVG import: paints", () => {
  const STOPS = '<stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#00f"/>';
  it("linear handles land in the layer's own space (bounding box and user space, through a turned group)", () => {
    const g = fills(plan(`<linearGradient id="g">${STOPS}</linearGradient><rect x="10" y="20" width="200" height="100" fill="url(#g)"/>`, 'width="300" height="200"').layers[0])[0];
    assert.deepEqual([g.type, g.from, g.to, g.stops.length], ["linear", { x: 0, y: 0 }, { x: 1, y: 0 }, 2]);
    const u = fills(plan(`<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="50">${STOPS}</linearGradient><g transform="translate(100 100) rotate(90)"><rect width="100" height="50" fill="url(#g)"/></g>`, 'width="300" height="300"').layers[0])[0];
    assert.deepEqual([u.from, u.to], [{ x: 0, y: 0 }, { x: 0, y: 1 }]);
  });

  it("a radial gradient centres on its focal point", () => {
    const g = fills(plan(`<radialGradient id="g" fx="0.25">${STOPS}</radialGradient><rect width="100" height="50" fill="url(#g)"/>`).layers[0])[0];
    assert.deepEqual([g.type, g.center, g.radius], ["radial", { x: 0.25, y: 0.5 }, { x: 0.5, y: 0.5 }]);
  });

  it("reflect and repeat unroll over the box", () => {
    const of = (m: string) => fills(plan(`<linearGradient id="g" x2="0.25" spreadMethod="${m}">${STOPS}</linearGradient><rect width="100" height="10" fill="url(#g)"/>`, 'width="100" height="10"').layers[0])[0];
    const r = of("reflect");
    assert.deepEqual([r.from, r.to], [{ x: 0, y: 0 }, { x: 1, y: 0 }]);
    assert.deepEqual(r.stops.map((s: { at: number }) => s.at), [0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1]);
    assert.ok(r.stops[2].color === "#00f" && r.stops[3].color === "#f00", "every other period runs backwards");
    const p = of("repeat");
    assert.ok(p.stops[2].color === "#f00" && p.stops[3].color === "#00f", "a hard edge at each period");
    assert.equal(of("pad").stops.length, 2);
  });

  it("opacity and stop opacity carry over", () => {
    const p = fills(plan('<linearGradient id="g"><stop offset="0" stop-color="#000" stop-opacity="0.25"/><stop offset="1" stop-color="#000"/></linearGradient><rect width="10" height="10" fill="url(#g)" fill-opacity="0.5"/>').layers[0])[0];
    assert.equal(p.opacity, 0.5);
    assert.deepEqual(p.stops.map((s: { color: string }) => s.color), ["rgba(0, 0, 0, 0.25)", "#000"]);
    assert.equal(plan('<rect width="1" height="1" fill="#f00" fill-opacity="0.5"/>').layers[0].properties["svg.fill"], "rgba(255, 0, 0, 0.50)");
  });
});

describe("FigCraft SVG import: hostile files", () => {
  it("references to themselves and deep or wide files are bounded", () => {
    for (const body of [
      '<use id="u" href="#u"/>',
      '<g id="a"><use href="#b"/></g><g id="b"><use href="#a"/></g>',
      '<linearGradient id="g" href="#h"/><linearGradient id="h" href="#g"/><rect width="10" height="10" fill="url(#g)"/>',
      `${"<g>".repeat(3000)}<rect width="1" height="1"/>${"</g>".repeat(3000)}`,
      Array.from({ length: 12_000 }, (_, i) => `<rect x="${i % 100}" width="1" height="1"/>`).join(""),
    ]) {
      const p = planSvgImport(svg(body));
      assert.ok(p === null || p.layers.length <= 10_000);
    }
    assert.equal(planSvgImport("not svg at all"), null);
    assert.equal(planSvgImport('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')?.layers.length ?? 0, 0);
  });
});

describe("FigCraft port F14: placed as layers", () => {
  it("a frame named after the file holds the groups and shapes, each in its parent's space, scaled; one undo step", () => {
    setDocument(createDocumentFromLayers([createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: [], properties: { "frame.width": 800, "frame.height": 600 } }) as Layer]));
    const r = importSvgDesign(svg('<g id="logo"><rect id="a" x="10" y="10" width="20" height="20" fill="#f00" stroke="#000" stroke-width="2"/><circle id="b" cx="60" cy="20" r="10"/></g>'), "pg", { x: 100, y: 50 }, 2, "logo.svg")!;
    const L = getDocument().layers;
    const frame = L[r.frame];
    assert.deepEqual([frame.name, frame.parentId, frame.properties["frame.x"], frame.properties["frame.width"]], ["logo", "pg", 100, 200]);
    const logo = L[frame.children[0]];
    assert.deepEqual([logo.name, logo.properties["frame.x"], logo.properties["frame.y"], logo.properties["frame.width"]], ["logo", 20, 20, 120]);
    const a = L[logo.children[0]];
    assert.deepEqual([a.archetype, a.properties["frame.x"], a.properties["frame.width"], a.properties["svg.strokeWidth"]], ["rectangle", 0, 40, 4]);
    assert.ok(L.pg.children.includes(r.frame));
    historyCommands.undo();
    assert.equal(getDocument().layers[r.frame], undefined);
  });
});
