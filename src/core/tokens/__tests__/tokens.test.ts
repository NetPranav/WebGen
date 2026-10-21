import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { documentCommands, getDocument, getResolvedDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { useModeStore } from "../../store/useModeStore";
import { useBreakpointStore } from "../../store/useBreakpointStore";
import { DEFAULT_MODES, groupVariables, modesOf, resolveLayerTokens, valueIn, variableTypeFor } from "../tokens";
import { addMode, applyStyle, bindVariable, createStyle, createVariable, deleteStyle, deleteVariable, detachBinding, detachStyle, removeMode, setActiveMode, unbind, updateStyle, updateVariable } from "../tokenOps";
import { resolveDocumentAt } from "../../breakpoints/breakpoints";

const box = (id: string, parentId: string, extra: Record<string, unknown> = {}, archetype: "container" | "text" = "container"): Layer =>
  createLayer({ id, archetype, parentId, name: id, properties: { positioning: "absolute", "frame.x": 0, "frame.y": 0, "frame.width": 100, "frame.height": 50, "appearance.background.color": "#ffffff", ...extra } }) as Layer;

const doc = () =>
  createDocumentFromLayers([
    createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: ["a", "b", "c", "t"], properties: { "frame.width": 800, "frame.height": 600, "appearance.background.color": "#ffffff" } }) as Layer,
    box("a", "pg"),
    box("b", "pg"),
    box("c", "pg", { "appearance.radius": 4 }),
    box("t", "pg", { "typography.fontSize": 14, "typography.fontWeight": "400", "typography.fontFamily": "Inter", "typography.color": "#111111" }, "text"),
  ]);

const seen = (id: string) => getResolvedDocument().layers[id].properties as Record<string, unknown>;
const base = (id: string) => getDocument().layers[id].properties as Record<string, unknown>;

describe("Phase 45: the rule", () => {
  it("documents have Light and Dark unless they say otherwise; a mode without a value shows the first mode's", () => {
    assert.deepEqual(modesOf({}), [...DEFAULT_MODES]);
    const v = { id: "v", name: "x", type: "color" as const, values: { light: "#fff" } };
    assert.equal(valueIn(v, "dark", modesOf({})), "#fff");
    assert.equal(valueIn(v, null, modesOf({})), "#fff");
  });

  it("a colour variable binds to colour properties and a number to number or length ones", () => {
    assert.equal(variableTypeFor("color"), "color");
    assert.equal(variableTypeFor("length"), "number");
    assert.equal(variableTypeFor("number"), "number");
    assert.equal(variableTypeFor("string"), null);
  });

  it("a layer shows its bound property at the variable's value in the mode, a detached one at its own, and a missing variable leaves it", () => {
    const d = { variables: { v: { id: "v", name: "bg", type: "color" as const, values: { light: "#fff", dark: "#000" } } }, styles: {}, modes: undefined };
    const l = { ...box("x", "pg"), tokens: { "appearance.background.color": { variable: "v" }, "appearance.border.color": { variable: "gone" } } } as Layer;
    assert.equal(resolveLayerTokens(l, d, "dark").properties["appearance.background.color"], "#000");
    assert.equal(resolveLayerTokens(l, d, null).properties["appearance.background.color"], "#fff");
    const det = { ...l, tokens: { "appearance.background.color": { variable: "v", detached: true } } } as Layer;
    assert.equal(resolveLayerTokens(det, d, "dark"), det);
    assert.equal(resolveLayerTokens(l, d, "dark").properties["appearance.border.color"], undefined);
  });

  it("variables group by the first part of their name", () => {
    const g = groupVariables([
      { id: "1", name: "brand/primary", type: "color", values: {} },
      { id: "2", name: "brand/accent", type: "color", values: {} },
      { id: "3", name: "radius", type: "number", values: {} },
    ]);
    assert.deepEqual(g.map((x) => [x.group, x.items.length]), [["brand", 2], ["", 1]]);
  });
});

describe("Phase 45: variables, bindings and modes", () => {
  beforeEach(() => {
    setDocument(doc());
    useModeStore.getState().setActive(null);
    useBreakpointStore.getState().setActive(null);
  });

  it("changing a variable restyles every layer bound to it; switching mode shows the other value", () => {
    const bg = createVariable("surface/bg", "color", { light: "#ffffff", dark: "#101010" })!;
    assert.equal(bindVariable(["a", "b", "pg"], "appearance.background.color", bg), 3);
    assert.equal(seen("a")["appearance.background.color"], "#ffffff");
    setActiveMode("dark");
    assert.equal(seen("a")["appearance.background.color"], "#101010");
    assert.equal(seen("pg")["appearance.background.color"], "#101010");
    assert.equal(base("a")["appearance.background.color"], "#ffffff"); // the document keeps its own value
    updateVariable(bg, { values: { dark: "#202020" } });
    assert.equal(seen("b")["appearance.background.color"], "#202020");
    setActiveMode(null);
    updateVariable(bg, { values: { light: "#f5f5f5" } });
    assert.equal(seen("a")["appearance.background.color"], "#f5f5f5");
  });

  it("a number variable binds a radius", () => {
    const r = createVariable("radius/card", "number", { light: 12 })!;
    assert.equal(bindVariable(["c"], "appearance.radius", r), 1);
    assert.equal(seen("c")["appearance.radius"], 12);
    assert.equal(bindVariable(["c"], "appearance.background.color", r), 0); // the wrong kind
  });

  it("editing a bound property by hand detaches it: the value stays, and it no longer follows the variable or the mode", () => {
    const bg = createVariable("bg", "color", { light: "#ffffff", dark: "#101010" })!;
    bindVariable(["a", "b"], "appearance.background.color", bg);
    documentCommands.updateProps("a", { "appearance.background.color": "#ff0000" });
    assert.deepEqual(getDocument().layers.a.tokens, { "appearance.background.color": { variable: bg, detached: true } });
    setActiveMode("dark");
    assert.equal(seen("a")["appearance.background.color"], "#ff0000");
    assert.equal(seen("b")["appearance.background.color"], "#101010");
    updateVariable(bg, { values: { dark: "#303030" } });
    assert.equal(seen("a")["appearance.background.color"], "#ff0000");
  });

  it("Detach keeps what the layer shows in the mode being viewed", () => {
    const bg = createVariable("bg", "color", { light: "#ffffff", dark: "#101010" })!;
    bindVariable(["a"], "appearance.background.color", bg);
    setActiveMode("dark");
    assert.equal(detachBinding(["a"], "appearance.background.color"), 1);
    assert.equal(base("a")["appearance.background.color"], "#101010");
    setActiveMode(null);
    assert.equal(seen("a")["appearance.background.color"], "#101010");
    // binding it again follows the variable once more
    bindVariable(["a"], "appearance.background.color", bg);
    assert.equal(seen("a")["appearance.background.color"], "#ffffff");
  });

  it("Unbind and Delete variable keep the look; both are one undo step", () => {
    const bg = createVariable("bg", "color", { light: "#abcdef", dark: "#000000" })!;
    bindVariable(["a", "b"], "appearance.background.color", bg);
    assert.equal(unbind(["a"], "appearance.background.color"), 1);
    assert.equal(base("a")["appearance.background.color"], "#abcdef");
    const before = JSON.stringify(getDocument().layers);
    assert.equal(deleteVariable(bg), true);
    assert.equal(base("b")["appearance.background.color"], "#abcdef");
    assert.equal(getDocument().layers.b.tokens, undefined);
    historyCommands.undo();
    assert.equal(JSON.stringify(getDocument().layers), before);
  });

  it("modes: add one (it starts as a copy of the first), remove it (its values go), the first can't be removed", () => {
    const bg = createVariable("bg", "color", { light: "#ffffff", dark: "#101010" })!;
    const hc = addMode("High contrast")!;
    assert.equal(getDocument().variables![bg].values[hc], "#ffffff");
    assert.equal(addMode("light"), null);
    setActiveMode(hc);
    assert.equal(useModeStore.getState().activeModeId, hc);
    assert.equal(removeMode(hc), true);
    assert.equal(useModeStore.getState().activeModeId, null);
    assert.equal(getDocument().variables![bg].values[hc], undefined);
    assert.equal(removeMode("light"), false);
    assert.equal(setActiveMode("nope"), false);
  });

  it("the page seen at a breakpoint still has its tokens applied, and an override wins over a binding", () => {
    const bg = createVariable("bg", "color", { light: "#ffffff", dark: "#101010" })!;
    bindVariable(["a"], "appearance.background.color", bg);
    useBreakpointStore.getState().setActive("mobile");
    setActiveMode("dark");
    assert.equal(seen("a")["appearance.background.color"], "#101010");
    documentCommands.updateProps("a", { "appearance.background.color": "#00ff00" });
    assert.equal(seen("a")["appearance.background.color"], "#00ff00");
    assert.equal(base("a")["appearance.background.color"], "#ffffff");
    useBreakpointStore.getState().setActive(null);
    assert.equal(seen("a")["appearance.background.color"], "#101010");
  });

  it("a document with no tokens and no breakpoint is returned as itself", () => {
    const d = getDocument();
    assert.equal(resolveDocumentAt(d, null, null), d);
  });
});

describe("Phase 45: styles", () => {
  beforeEach(() => {
    setDocument(doc());
    useModeStore.getState().setActive(null);
  });

  it("a text style made from a layer is followed by another; changing the style restyles both; editing a property detaches and keeps the rest", () => {
    documentCommands.updateProps("t", { "typography.fontSize": 24, "typography.fontWeight": "700" });
    const s = createStyle("text", "Heading", "t")!;
    assert.equal(getDocument().styles![s].props["typography.fontSize"], 24);
    documentCommands.mutate("add", (d) => {
      d.layers.pg.children.push("t2");
      d.layers.t2 = box("t2", "pg", { "typography.fontSize": 10 }, "text");
    });
    assert.equal(applyStyle(["t", "t2"], s), 2);
    assert.equal(seen("t2")["typography.fontSize"], 24);
    updateStyle(s, { props: { "typography.fontSize": 30 } });
    assert.equal(seen("t")["typography.fontSize"], 30);
    assert.equal(seen("t2")["typography.fontWeight"], "700");
    // a hand edit of one carried property lets go of the whole style
    documentCommands.updateProps("t2", { "typography.fontSize": 18 });
    assert.equal(getDocument().layers.t2.styleRefs, undefined);
    assert.equal(seen("t2")["typography.fontSize"], 18);
    assert.equal(seen("t2")["typography.fontWeight"], "700"); // copied across
    assert.equal(seen("t")["typography.fontSize"], 30);
  });

  it("Detach style and Delete style keep the look", () => {
    documentCommands.updateProps("t", { "typography.fontSize": 22 });
    const s = createStyle("text", "Body", "t")!;
    applyStyle(["t"], s);
    assert.equal(detachStyle(["t"], "text"), 1);
    assert.equal(base("t")["typography.fontSize"], 22);
    applyStyle(["t"], s);
    updateStyle(s, { props: { "typography.fontSize": 40 } });
    assert.equal(deleteStyle(s), true);
    assert.equal(base("t")["typography.fontSize"], 40);
    assert.equal(getDocument().layers.t.styleRefs, undefined);
  });

  it("an effect style carries shadows and blur and works on any layer; a text style only on text", () => {
    documentCommands.updateProps("a", { "filter.blur": 6 });
    const e = createStyle("effect", "Soft", "a")!;
    assert.equal(applyStyle(["b"], e), 1);
    assert.equal(seen("b")["filter.blur"], 6);
    const s = createStyle("text", "Body", "t")!;
    assert.equal(applyStyle(["b"], s), 0);
  });

  it("refuses a style with nothing to carry, and variables with no value", () => {
    assert.equal(createStyle("text", "Empty", "a"), null);
    assert.equal(createVariable("x", "color", {}), null);
    assert.equal(createVariable("", "color", { light: "#fff" }), null);
  });
});
