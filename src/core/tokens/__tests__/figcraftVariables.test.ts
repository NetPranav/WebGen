/**
 * FigCraft port F10: variables and styles. The cases of FigCraft's `crates/engine/src/variables_behaviour_tests.rs`,
 * `variable_tests.rs` and `instance_modes_tests.rs` (commit 6ea44e9), translated to our tokens: four types and their
 * starting values, modes added, duplicated, reordered and removed, aliases (chains, no cycles), scopes, modes
 * inherited down the tree, deleting a bound or aliased variable, code syntax, collections, string and boolean
 * bindings, paint and grid styles with variables bound inside them, and the modes instances take from their main.
 * MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { documentCommands, getDocument, getResolvedDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { useModeStore } from "../../store/useModeStore";
import { codeSyntaxOf, collectionsOf, resolveVariable, scopeOfPath, SCOPES, variablesFor, type Variable } from "../tokens";
import {
  STARTING_VALUE,
  addMode,
  applyStyle,
  bindVariable,
  createCollection,
  createStyle,
  createVariable,
  deleteCollection,
  deleteStyle,
  deleteVariable,
  moveMode,
  removeMode,
  setAlias,
  setLayerMode,
  updateStyle,
  updateVariable,
} from "../tokenOps";
import { createComponent, insertInstance } from "../../components/componentOps";
import { subtreeIds } from "../../components/instances";

const frame = (id: string, parentId: string | null, children: string[] = [], extra: Record<string, unknown> = {}): Layer =>
  createLayer({ id, archetype: "container", parentId, name: id, children, properties: { positioning: "absolute", "frame.x": 0, "frame.y": 0, "frame.width": 200, "frame.height": 200, "appearance.background.color": "#888888", ...extra } }) as Layer;

const doc = () =>
  createDocumentFromLayers([
    frame("pg", null, ["outer", "free", "txt", "shape"], { "frame.width": 1000, "frame.height": 800 }),
    frame("outer", "pg", ["inner"]),
    frame("inner", "outer", ["r"]),
    frame("r", "inner"),
    frame("free", "pg"),
    createLayer({ id: "txt", archetype: "text", parentId: "pg", name: "txt", properties: { positioning: "absolute", "frame.x": 0, "frame.y": 300, "frame.width": 100, "frame.height": 20, "content.text": "Hello", "typography.color": "#111111" } }) as Layer,
    createLayer({ id: "shape", archetype: "rectangle", parentId: "pg", name: "shape", properties: { positioning: "absolute", "frame.x": 300, "frame.y": 300, "frame.width": 50, "frame.height": 50, "svg.fill": "#00aa00" } }) as Layer,
  ]);

const L = () => getDocument().layers;
const fill = (id: string) => String(getResolvedDocument().layers[id].properties["appearance.background.color"]).toUpperCase().replace("#", "");
const V = (id: string) => getDocument().variables![id] as Variable;
const byName = (name: string) => Object.values(getDocument().variables ?? {}).find((v) => v.name === name)!.id;
const modeId = (coll: string, name: string) => collectionsOf(getDocument()).find((c) => c.id === coll)!.modes.find((m) => m.name === name)!.id;

/** A "Theme" collection with Light and Dark and a colour variable `bg` (white / black). */
function theme() {
  const t = createCollection("Theme", ["Light", "Dark"])!;
  createVariable("bg", "color", { light: "#FFFFFF", dark: "#000000" }, { collection: t });
  return t;
}

beforeEach(() => {
  setDocument(doc());
  useModeStore.getState().setActive(null);
});

describe("FigCraft port F10: variables", () => {
  it("four types and their starting values (asked for: Phase 45 refuses a variable with no value); every mode of the collection gets one", () => {
    const c = createCollection("C", ["A", "B"])!;
    for (const type of ["color", "number", "string", "boolean"] as const) {
      const v = createVariable(type, type, {}, { collection: c, starting: true })!;
      assert.equal(V(v).type, type);
      assert.deepEqual(Object.keys(V(v).values).sort(), ["a", "b"]);
      assert.ok(Object.values(V(v).values).every((x) => x === STARTING_VALUE[type]), `${type}: ${JSON.stringify(V(v).values)}`);
    }
    assert.equal(createVariable("y", "number", { a: "wide" as unknown as number }, { collection: c }), null);
    assert.equal(createVariable("z", "number", {}, { collection: c }), null, "Phase 45's rule without `starting`");
  });

  it("modes: new, duplicated, reordered (the first is the default) and removed", () => {
    const t = theme();
    const value = (m: string) => V(byName("bg")).values[modeId(t, m)];
    addMode("Dim", t);
    assert.equal(value("Dim"), value("Light"), "a new mode: the first column's values");
    addMode("Dark 2", t, "dark");
    assert.equal(value("Dark 2"), value("Dark"), "a duplicated mode: that mode's values");
    assert.equal(addMode("X", t, "nope"), null);
    for (const id of ["free", "r"]) bindVariable([id], "appearance.background.color", byName("bg"));
    setLayerMode(["inner"], t, "light");
    assert.deepEqual([fill("free"), fill("r")], ["FFFFFF", "FFFFFF"]);
    moveMode("dark", 0, t);
    assert.deepEqual(collectionsOf(getDocument()).find((c) => c.id === t)!.modes.map((m) => m.name), ["Dark", "Light", "Dim", "Dark 2"]);
    assert.equal(fill("free"), "000000", "Auto follows the new default");
    assert.equal(fill("r"), "FFFFFF", "an explicit mode stays");
    moveMode("dark", 99, t);
    assert.equal(collectionsOf(getDocument()).find((c) => c.id === t)!.modes.at(-1)!.name, "Dark");
    assert.equal(fill("free"), "FFFFFF");
    historyCommands.undo();
    assert.equal(fill("free"), "000000");
    assert.equal(moveMode("nope", 0, t), false);
    removeMode("light", t);
    assert.equal((L().inner as { variableModes?: unknown }).variableModes, undefined, "a frame set to a removed mode goes back to Auto");
    assert.equal(fill("r"), "000000");
  });

  it("aliases: same type, chains resolve and follow, no cycles", () => {
    const t = theme();
    const brand = createCollection("Brand", ["Base"])!;
    const blue = createVariable("blue", "color", { base: "#0000FF" }, { collection: brand })!;
    const n = createVariable("n", "number", { base: 4 }, { collection: brand })!;
    const accent = createVariable("accent", "color", { light: { alias: blue } }, { collection: t })!;
    const link = createVariable("link", "color", { light: { alias: accent } }, { collection: t })!;
    bindVariable(["free"], "appearance.background.color", link);
    assert.equal(fill("free"), "0000FF", "link → accent → blue");
    updateVariable(blue, { values: { base: "#00FF00" } });
    assert.equal(fill("free"), "00FF00", "the chain follows its end");
    assert.equal(setAlias(blue, "base", link), false, "a loop through the chain");
    assert.equal(setAlias(accent, "light", accent), false, "itself");
    assert.equal(setAlias(accent, "light", n), false, "another type");
    assert.equal(createVariable("x", "color", { light: { alias: n } }, { collection: t }), null, "create: another type");
    assert.equal(createVariable("y", "color", { light: { alias: "missing" } }, { collection: t }), null, "create: no such variable");
    // a cycle written by hand (an old or edited file) resolves to nothing: the layer keeps its own value
    documentCommands.mutate("loop", (d) => {
      d.variables![blue].values.base = { alias: link };
    });
    assert.equal(resolveVariable(getDocument(), link, {}), undefined);
    assert.equal(fill("free"), "888888");
  });

  it("scopes limit pickers only; unknown scope ids are refused", () => {
    const radius = createVariable("radius", "number", { light: 8 })!;
    assert.equal(updateVariable(radius, { scopes: ["CORNER_RADIUS"] }), true);
    const offered = (path: string) => variablesFor(getDocument(), path, "container", path === "frame.width" ? "length" : "length").some((v) => v.id === radius);
    assert.ok(offered("appearance.radius"));
    assert.ok(!offered("frame.width"), "out of scope: not offered for width");
    assert.equal(bindVariable(["free"], "frame.width", radius), 1, "binding out of scope still works");
    assert.equal(getResolvedDocument().layers.free.properties["frame.width"], 8);
    for (const want of ["GAP", "CORNER_RADIUS", "FONT_WEIGHT", "FONT_SIZE", "LINE_HEIGHT", "LETTER_SPACING", "PARAGRAPH_SPACING", "PARAGRAPH_INDENT", "OPACITY", "EFFECT_FLOAT", "STROKE_FLOAT", "TEXT_CONTENT", "WIDTH_HEIGHT"])
      assert.ok(SCOPES.number.some(([k]) => k === want), want);
    assert.equal(scopeOfPath("typography.fontWeight", "text"), "FONT_WEIGHT");
    assert.equal(scopeOfPath("appearance.background.color", "container"), "FRAME_FILL");
    assert.equal(scopeOfPath("svg.fill", "rectangle"), "SHAPE_FILL");
    assert.equal(updateVariable(radius, { scopes: ["TEXT_FILL"] }), false);
    updateVariable(radius, { scopes: SCOPES.number.map(([k]) => k) });
    assert.equal(V(radius).scopes, undefined, "every scope: no limit");
  });

  it("modes inherit down the tree: the nearest frame that chose one wins", () => {
    const t = theme();
    for (const id of ["r", "free"]) bindVariable([id], "appearance.background.color", byName("bg"));
    const steps: [string, () => void, string, string][] = [
      ["nothing set: the default mode", () => {}, "FFFFFF", "FFFFFF"],
      ["page Dark: everything on it", () => setLayerMode(["pg"], t, "dark"), "000000", "000000"],
      ["outer Light: its subtree", () => setLayerMode(["outer"], t, "light"), "FFFFFF", "000000"],
      ["inner Dark: the nearest wins", () => setLayerMode(["inner"], t, "dark"), "000000", "000000"],
      ["inner back to Auto: outer's again", () => setLayerMode(["inner"], t, null), "FFFFFF", "000000"],
    ];
    for (const [what, step, nested, loose] of steps) {
      step();
      assert.deepEqual([fill("r"), fill("free")], [nested, loose], what);
    }
    documentCommands.moveLayer("free", "outer", 0);
    assert.equal(fill("free"), "FFFFFF", "moved into another frame: that frame's mode");
    assert.equal(setLayerMode(["outer"], t, "nope"), 0);
  });

  it("the default collection follows the view's mode; another collection doesn't", () => {
    const t = theme();
    const local = createVariable("local", "color", { light: "#FF0000", dark: "#0000FF" })!;
    bindVariable(["free"], "appearance.background.color", local);
    bindVariable(["r"], "appearance.background.color", byName("bg"));
    useModeStore.getState().setActive("dark");
    assert.equal(fill("free"), "0000FF");
    assert.equal(fill("r"), "FFFFFF", "Theme is still on its default mode");
    assert.equal(t, "theme");
  });

  it("deleting a bound variable keeps its last value; aliases of it take its values; so does deleting its collection", () => {
    const t = theme();
    const surface = createVariable("surface", "color", { light: { alias: byName("bg") }, dark: { alias: byName("bg") } }, { collection: t })!;
    bindVariable(["r"], "appearance.background.color", byName("bg"));
    bindVariable(["free"], "appearance.background.color", surface);
    setLayerMode(["pg"], t, "dark");
    deleteVariable(byName("bg"));
    assert.equal(fill("r"), "000000", "the last value stays");
    assert.equal(L().r.tokens, undefined, "no longer connected");
    assert.deepEqual(V(surface).values, { light: "#FFFFFF", dark: "#000000" });
    assert.equal(fill("free"), "000000");
    historyCommands.undo();
    assert.ok(L().r.tokens?.["appearance.background.color"]);
    // the whole collection, with an alias into it from another one
    const other = createCollection("Other")!;
    const o = createVariable("o", "color", { [modeId(other, "Mode 1")]: { alias: byName("bg") } }, { collection: other })!;
    deleteCollection(t);
    assert.equal(fill("r"), "000000");
    assert.equal(L().r.tokens, undefined);
    assert.equal(V(o).values[modeId(other, "Mode 1")], "#FFFFFF");
    assert.ok(!collectionsOf(getDocument()).some((c) => c.id === t));
    assert.equal(deleteCollection("default"), false, "the default collection stays");
  });

  it("code syntax per platform; an empty one clears it; the web default is a CSS variable", () => {
    const sp = createCollection("Spacing")!;
    const xs = createVariable("space/xs", "number", { [modeId(sp, "Mode 1")]: 4 }, { collection: sp })!;
    updateVariable(xs, { codeSyntax: { WEB: "var(--space-tight)", iOS: "Spacing.tight", ANDROID: "spacing_xs" } });
    assert.equal(V(xs).codeSyntax?.WEB, "var(--space-tight)");
    assert.equal(Object.keys(V(xs).codeSyntax!).length, 3);
    updateVariable(xs, { codeSyntax: { ANDROID: "" } });
    assert.equal(Object.keys(V(xs).codeSyntax!).length, 2);
    assert.equal(codeSyntaxOf(V(xs)), "var(--space-tight)");
    assert.equal(codeSyntaxOf({ name: "Brand / Primary" }), "var(--brand-primary)");
    assert.equal(codeSyntaxOf({ name: "space/xs" }, "iOS"), "spaceXs");
  });

  it("a collection keeps at least one named mode", () => {
    for (const modes of [[], ["", "  "], ["A", " "]]) assert.equal(createCollection("C", modes), null, JSON.stringify(modes));
    assert.equal(createCollection("  "), null);
    assert.equal(getDocument().collections, undefined, "a refused call creates nothing");
    const c = createCollection("C", [" Light ", "Dark"])!;
    assert.deepEqual(collectionsOf(getDocument()).find((x) => x.id === c)!.modes.map((m) => m.name), ["Light", "Dark"]);
  });

  it("string variables set text, boolean ones visibility; showing a layer by hand detaches it", () => {
    const greeting = createVariable("greeting", "string", { light: "Hi", dark: "Hallo" })!;
    const shown = createVariable("shown", "boolean", { light: true, dark: false })!;
    assert.equal(bindVariable(["txt"], "content.text", greeting), 1);
    assert.equal(bindVariable(["txt"], "visible", shown), 1);
    assert.equal(bindVariable(["txt"], "visible", greeting), 0, "visibility takes a boolean");
    assert.equal(bindVariable(["free"], "content.text", greeting), 0, "a frame has no text");
    assert.equal(getResolvedDocument().layers.txt.properties["content.text"], "Hi");
    useModeStore.getState().setActive("dark");
    assert.equal(getResolvedDocument().layers.txt.properties["content.text"], "Hallo");
    assert.equal(getResolvedDocument().layers.txt.visible, false);
    documentCommands.setLayerFlags("txt", { visible: true });
    assert.equal(L().txt.tokens!.visible.detached, true);
    assert.notEqual(getResolvedDocument().layers.txt.visible, false);
  });
});

describe("FigCraft port F10: paint and grid styles", () => {
  it("a paint style made from a layer's fills, applied as a fill, a stroke and a text colour; editing a fill lets go", () => {
    const brand = createStyle("paint", "Brand", "shape")!;
    assert.equal(getDocument().styles![brand].kind, "paint");
    assert.equal((L().shape.styleRefs as Record<string, string>).fill, brand, "the layer it came from follows it");
    assert.equal(applyStyle(["free"], brand), 1);
    assert.match(String(getResolvedDocument().layers.free.properties["paint.fills"]), /#00aa00/);
    assert.equal(applyStyle(["shape"], brand, "stroke"), 1);
    assert.match(String(getResolvedDocument().layers.shape.properties["paint.strokes"]), /#00aa00/);
    assert.equal(applyStyle(["txt"], brand), 1);
    assert.equal(getResolvedDocument().layers.txt.properties["typography.color"], "#00aa00");
    assert.equal(applyStyle(["free"], brand, "stroke"), 0, "a frame has no stroke list");
    // a change to the style reaches every layer
    updateStyle(brand, { props: { "paint.fills": JSON.stringify([{ type: "solid", color: "#ff00ff", opacity: 1, visible: true }]) } });
    assert.equal(getResolvedDocument().layers.txt.properties["typography.color"], "#ff00ff");
    // editing the fill by hand keeps what the style gave, then the edit
    documentCommands.updateProps("free", { "appearance.background.color": "#123456" });
    assert.equal((L().free.styleRefs as Record<string, string> | undefined)?.fill, undefined);
    assert.match(String(L().free.properties["paint.fills"]), /#ff00ff/);
    // deleting the style: layers keep its look
    deleteStyle(brand);
    assert.equal(L().txt.properties["typography.color"], "#ff00ff");
    assert.equal(L().txt.styleRefs, undefined);
  });

  it("a variable bound inside a paint style resolves in each layer's own modes", () => {
    const t = theme();
    const brand = createStyle("paint", "Surface", "shape")!;
    assert.equal(updateStyle(brand, { bound: { "paint.fills/0/color": byName("bg") } }), true);
    applyStyle(["r"], brand);
    applyStyle(["free"], brand);
    setLayerMode(["outer"], t, "dark");
    const color = (id: string) => (JSON.parse(String(getResolvedDocument().layers[id].properties["paint.fills"])) as { color: string }[])[0].color;
    assert.equal(color("free"), "#FFFFFF");
    assert.equal(color("r"), "#000000", "inside the Dark frame");
    assert.equal(updateStyle(brand, { bound: { "paint.fills/0/color": createVariable("n", "number", { light: 1 })! } }), false, "a colour takes a colour variable");
    deleteVariable(byName("bg"));
    assert.equal(getDocument().styles![brand].bound, undefined);
  });

  it("a grid style carries layout grids from frame to frame", () => {
    const grids = JSON.stringify([{ kind: "columns", size: 0, count: 12, gutter: 20, offset: 0, align: "stretch", color: "rgba(255, 0, 0, 0.1)", visible: true }]);
    documentCommands.updateProps("outer", { "frame.layoutGrids": grids });
    const g = createStyle("grid", "12 columns", "outer")!;
    assert.equal(applyStyle(["free"], g), 1);
    assert.equal(getResolvedDocument().layers.free.properties["frame.layoutGrids"], grids);
    assert.equal(applyStyle(["txt"], g), 0, "text has no layout grids");
  });

  it("a text style keeps working as before, and binds a variable for its font size", () => {
    const size = createVariable("size", "number", { light: 14, dark: 20 })!;
    documentCommands.updateProps("txt", { "typography.fontSize": 14, "typography.fontFamily": "Inter" });
    const ts = createStyle("text", "Body", "txt")!;
    updateStyle(ts, { bound: { "typography.fontSize": size } });
    useModeStore.getState().setActive("dark");
    assert.equal(getResolvedDocument().layers.txt.properties["typography.fontSize"], 20);
  });
});

describe("FigCraft port F10: modes and instances", () => {
  it("instances take the modes their main's frames chose; the instance's own choice wins; a main mode is closer than the frame around the instance", () => {
    const t = theme();
    bindVariable(["r"], "appearance.background.color", byName("bg"));
    setLayerMode(["inner"], t, "dark");
    const c = createComponent(["outer"])!;
    const inst = insertInstance(c, { at: { x: 500, y: 0 } })!;
    const copyOf = (src: string) => subtreeIds(L(), inst).find((id) => L()[id].instance?.source === src)!;
    assert.equal(fill(copyOf("r")), "000000", "the main's inner frame chose Dark");
    // the main chooses later: the instance follows
    setLayerMode(["inner"], t, "light");
    assert.equal(fill(copyOf("r")), "FFFFFF");
    // a mode set on the instance root is its own and wins for what isn't closer
    setLayerMode(["inner"], t, null);
    setLayerMode([inst], t, "dark");
    assert.equal(fill(copyOf("r")), "000000");
    // set on a layer inside the instance: an override that survives main edits
    setLayerMode([copyOf("inner")], t, "light");
    assert.ok(L()[copyOf("inner")].instance!.overridden?.includes("variableModes"));
    setLayerMode(["inner"], t, "dark");
    documentCommands.updateProps("r", { "frame.width": 120 });
    assert.equal(fill(copyOf("r")), "FFFFFF", "the instance's own choice inside it stays");
    assert.equal(fill("r"), "000000");
  });
});
