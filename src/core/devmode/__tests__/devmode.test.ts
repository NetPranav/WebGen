/**
 * FigCraft port F13: Dev Mode. Inspect's sections and formats (`devinspect.rs`), the CSS with a variable's code syntax
 * (`variables_behaviour_tests.rs` code_syntax_per_platform), annotations and categories (`annotations.rs`), measurements
 * kept on the canvas (`dev_measurements.rs`) and Compare changes (`devcompare.rs`), commit 6ea44e9, translated to our
 * layers. MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { documentCommands, getDocument, getResolvedDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { formatColor, inspectLayer, layerCss, num } from "../inspect";
import { addAnnotation, addCategory, addMeasurement, annotatedLayers, categoriesOf, compareChanges, devItems, placedMeasurements, removeCategory, removeMeasurement, setDevStatus, updateAnnotation } from "../devOps";
import { bindVariable, createStyle, createVariable, updateVariable } from "../../tokens/tokenOps";
import { deleteLayers } from "../../editing/editOps";

const L = () => getDocument().layers;
beforeEach(() =>
  setDocument(
    createDocumentFromLayers([
      createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: ["card", "other"], properties: { "frame.width": 1000, "frame.height": 800 } }) as Layer,
      createLayer({ id: "card", archetype: "container", parentId: "pg", name: "Card", children: ["title"], properties: { positioning: "absolute", "frame.x": 10, "frame.y": 20, "frame.width": 120, "frame.height": 80, "appearance.background.color": "#FF0000", "appearance.radius": 8, "layout.auto": true, "layout.display": "flex", "layout.flexDirection": "row", "layout.gap": 4, "layout.padding": 12, "paint.shadows": JSON.stringify([{ kind: "drop", x: 0, y: 4, blur: 8, spread: 0, color: "rgba(0, 0, 0, 0.25)" }]) } }) as Layer,
      createLayer({ id: "title", archetype: "text", parentId: "card", name: "Title", properties: { "content.text": "Hello", "typography.fontSize": 18, "typography.fontWeight": "600", "typography.color": "#111111" } }) as Layer,
      createLayer({ id: "other", archetype: "rectangle", parentId: "pg", name: "Other", properties: { positioning: "absolute", "frame.x": 200, "frame.y": 20, "frame.width": 50, "frame.height": 80 } }) as Layer,
    ]),
  ),
);

describe("FigCraft Dev Mode: inspect", () => {
  it("numbers and colours read as a designer reads them, in every format", () => {
    assert.deepEqual([num(12.345), num(-0.001), num(4)], ["12.35", "0", "4"]);
    assert.equal(formatColor("#ff0000"), "#FF0000");
    assert.equal(formatColor("rgba(255, 0, 0, 0.5)", "hex"), "#FF0000 · 50%");
    assert.equal(formatColor("#ff0000", "rgb"), "255, 0, 0");
    assert.equal(formatColor("rgba(255, 0, 0, 0.5)", "css"), "rgba(255, 0, 0, 0.5)");
    assert.equal(formatColor("#ff0000", "hsl"), "0, 100%, 50%");
    assert.equal(formatColor("#ff0000", "hsb"), "0, 100%, 100%");
  });

  it("a frame's sections: layout, auto layout, fills, effects; a text's typography; px or rem", () => {
    const s = inspectLayer(getDocument(), L().card, getResolvedDocument().layers.card);
    assert.deepEqual(s.map((x) => x.title), ["Layout", "Auto layout", "Fills", "Effects"]);
    const layout = Object.fromEntries(s[0].rows.map((r) => [r.label, r.value]));
    assert.deepEqual([layout.Width, layout.Height, layout.X, layout.Radius], ["120", "80", "10", "8"]);
    assert.deepEqual(s[1].rows.map((r) => r.value), ["horizontal", "4", "12"]);
    assert.deepEqual(s[2].rows[0], { label: "Solid", value: "#FF0000", color: "#FF0000" });
    assert.equal(s[3].rows[0].value, "0 4 8 0 #000000 · 25%");
    const rem = inspectLayer(getDocument(), L().card, getResolvedDocument().layers.card, undefined, { unit: "rem" });
    assert.equal(rem[0].rows[0].value, "7.5rem");
    const t = inspectLayer(getDocument(), L().title, getResolvedDocument().layers.title);
    assert.deepEqual(t.find((x) => x.title === "Typography")!.rows.slice(0, 2).map((r) => r.value), ["Inter 600", "18"]);
  });

  it("rows name the variable or style behind them; the CSS writes a bound property with the variable's code syntax", () => {
    const sp = createVariable("space/xs", "number", { light: 4 })!;
    updateVariable(sp, { codeSyntax: { WEB: "var(--space-tight)" } });
    bindVariable(["card"], "layout.gap", sp);
    const brand = createVariable("brand", "color", { light: "#ff0000" })!;
    bindVariable(["card"], "appearance.background.color", brand);
    const s = inspectLayer(getDocument(), L().card, getResolvedDocument().layers.card);
    assert.equal(s[1].rows[1].token, "space/xs");
    assert.equal(s[2].rows[0].token, "brand");
    const css = layerCss(getDocument(), L().card, getResolvedDocument().layers);
    assert.match(css, /gap: var\(--space-tight, 4px\);/);
    assert.match(css, /background-color: var\(--brand, #ff0000\);/);
    createStyle("text", "Heading", "title");
    const t = inspectLayer(getDocument(), L().title, getResolvedDocument().layers.title);
    assert.equal(t.find((x) => x.title === "Typography")!.rows[0].token, "Heading");
  });
});

describe("FigCraft Dev Mode: annotations", () => {
  it("notes with pinned properties and a category; saved, undoable; empty notes refused", () => {
    assert.equal(addAnnotation("card", { label: "Use the card component", properties: ["width", "fill", "width"], category: "Accessibility" }), 0);
    assert.deepEqual(L().card.annotations, [{ label: "Use the card component", properties: ["width", "fill"], category: "accessibility" }]);
    assert.equal(addAnnotation("card", { label: "   " }), null);
    updateAnnotation("card", 0, { label: "", properties: [] });
    assert.equal(L().card.annotations, undefined, "nothing left: gone");
    historyCommands.undo();
    assert.equal(L().card.annotations!.length, 1);
    assert.deepEqual(annotatedLayers(getDocument()).map((a) => a.id), ["card"]);
  });
  it("categories: the defaults until the file adds its own; removing one uncategorises its notes", () => {
    assert.deepEqual(categoriesOf(getDocument()).map((c) => c.name), ["Development", "Interaction", "Accessibility", "Content"]);
    const id = addCategory("Motion")!;
    assert.equal(categoriesOf(getDocument()).at(-1)!.color, "#D63A3A", "the next colour");
    assert.equal(addCategory("motion"), null, "names are unique");
    addAnnotation("card", { label: "Ease out", category: id });
    removeCategory("Motion");
    assert.equal(L().card.annotations![0].category, undefined);
  });
});

describe("FigCraft Dev Mode: measurements and handoff", () => {
  const boxOf = (id: string) => {
    const p = L()[id]?.properties;
    if (!p) return null;
    const x = Number(p["frame.x"] ?? 0);
    const y = Number(p["frame.y"] ?? 0);
    return { x0: x, y0: y, x1: x + Number(p["frame.width"]), y1: y + Number(p["frame.height"]) };
  };
  it("a measurement kept between two layers follows them; across a side measures it; one to a deleted layer goes", () => {
    assert.equal(addMeasurement("card", { to: "other" }), 0);
    assert.equal(addMeasurement("card", { to: "other" }), null, "no duplicates");
    addMeasurement("card", { side: "top" });
    let placed = placedMeasurements(getDocument(), boxOf);
    assert.deepEqual(placed.flatMap((p) => p.marks.map((m) => m.value)), [70, 120]);
    documentCommands.updateProps("other", { "frame.x": 230 });
    placed = placedMeasurements(getDocument(), boxOf);
    assert.equal(placed[0].marks[0].value, 100, "it follows the layer");
    deleteLayers(["other"]);
    assert.equal(placedMeasurements(getDocument(), boxOf).length, 1);
    historyCommands.undo();
    assert.equal(placedMeasurements(getDocument(), boxOf).length, 2, "undoing the deletion brings it back");
    removeMeasurement("card", 1);
    assert.equal(L().card.measurements!.length, 1);
  });

  it("ready for development keeps a snapshot; Compare changes lists what changed since, as Inspect writes it", () => {
    assert.equal(setDevStatus(["card", "title"], "ready"), 1, "frames and sections only");
    assert.deepEqual(devItems(getDocument()), [{ id: "card", name: "Card", status: "ready" }]);
    documentCommands.updateProps("card", { "frame.width": 136, "appearance.background.color": "#E03030" });
    documentCommands.updateProps("title", { "content.text": "Hi" });
    documentCommands.addLayer({ archetype: "rectangle", parentId: "card", name: "Badge", properties: { "frame.width": 10, "frame.height": 10 } });
    const changes = compareChanges("card")!;
    const card = changes.find((c) => c.id === "card")!;
    assert.ok(card.changes.some((c) => c.text === "width 120 → 136"), JSON.stringify(card.changes));
    assert.ok(card.changes.some((c) => c.text === "solid #FF0000 → #E03030"));
    assert.ok(changes.find((c) => c.id === "title")!.changes.some((c) => c.text === "text Hello → Hi"));
    assert.ok(changes.some((c) => c.kind === "added" && c.name === "Badge"));
    setDevStatus(["card"], null);
    assert.equal(compareChanges("card"), null, "no snapshot without a status");
  });
});
