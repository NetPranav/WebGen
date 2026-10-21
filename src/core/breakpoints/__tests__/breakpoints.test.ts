import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { documentCommands, getDocument, getResolvedDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { useBreakpointStore } from "../../store/useBreakpointStore";
import { useSelectionStore } from "../../store/useSelectionStore";
import { setVisible } from "../../editing/editOps";
import { DEFAULT_BREAKPOINTS, appliedBreakpoints, breakpointsOf, isBase, resolveDocumentAt, resolveLayerAt, overrideSource } from "../breakpoints";
import { addBreakpoint, removeBreakpoint, resetOverrides, setActiveBreakpoint, updateBreakpoint } from "../breakpointOps";

const rect = (id: string, parentId: string, x: number, y: number, w: number, h: number, extra: Record<string, unknown> = {}): Layer =>
  createLayer({ id, archetype: "rectangle", parentId, name: id, properties: { positioning: "absolute", "frame.x": x, "frame.y": y, "frame.width": w, "frame.height": h, ...extra } }) as Layer;

const doc = () =>
  createDocumentFromLayers([
    createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: ["a", "b", "r"], properties: { "frame.x": 0, "frame.y": 0, "frame.width": 1440, "frame.height": 900, "breakpoints.responsive": true } }) as Layer,
    rect("a", "pg", 100, 100, 300, 200),
    rect("b", "pg", 500, 100, 300, 200),
    rect("r", "pg", 1100, 50, 100, 100, { "constraints.horizontal": "right" }),
  ]);

const base = (id: string) => getDocument().layers[id].properties as Record<string, unknown>;
const seen = (id: string) => getResolvedDocument().layers[id].properties as Record<string, unknown>;

describe("Phase 43: the rule", () => {
  it("documents have Desktop, Tablet and Mobile unless they say otherwise; the widest is the base", () => {
    assert.deepEqual(breakpointsOf({}), [...DEFAULT_BREAKPOINTS]);
    assert.equal(isBase(breakpointsOf({}), null), true);
    assert.equal(isBase(breakpointsOf({}), "desktop"), true);
    assert.equal(isBase(breakpointsOf({}), "mobile"), false);
    assert.equal(isBase(breakpointsOf({}), "gone"), true);
  });

  it("overrides apply from the base down: Mobile sees Tablet's then its own", () => {
    const list = breakpointsOf({});
    assert.deepEqual(appliedBreakpoints(list, "tablet").map((b) => b.id), ["tablet"]);
    assert.deepEqual(appliedBreakpoints(list, "mobile").map((b) => b.id), ["tablet", "mobile"]);
    assert.deepEqual(appliedBreakpoints(list, null), []);
    const layer = { ...rect("x", "pg", 0, 0, 10, 10), overrides: { tablet: { "frame.x": 5, "frame.y": 6 }, mobile: { "frame.y": 9 } } } as Layer;
    assert.equal(resolveLayerAt(layer, appliedBreakpoints(list, "tablet")).properties["frame.y"], 6);
    const m = resolveLayerAt(layer, appliedBreakpoints(list, "mobile"));
    assert.deepEqual([m.properties["frame.x"], m.properties["frame.y"]], [5, 9]);
    assert.equal(overrideSource(layer, appliedBreakpoints(list, "mobile"), "frame.x")?.id, "tablet");
  });

  it("a custom breakpoint takes its place by width", () => {
    const list = breakpointsOf({ breakpoints: [{ id: "wide", name: "Wide", width: 1920 }, { id: "d", name: "D", width: 1024 }, { id: "m", name: "M", width: 400 }] });
    assert.deepEqual(list.map((b) => b.id), ["wide", "d", "m"]);
    assert.deepEqual(appliedBreakpoints(list, "m").map((b) => b.id), ["d", "m"]);
  });
});

describe("Phase 43: edits at a breakpoint are overrides", () => {
  beforeEach(() => {
    setDocument(doc());
    useBreakpointStore.getState().setActive(null);
  });

  it("a change at Mobile leaves the base alone, shows at Mobile, and doesn't show at Desktop", () => {
    useBreakpointStore.getState().setActive("mobile");
    documentCommands.updateProps("a", { "frame.x": 10, "frame.width": 200 });
    assert.equal(base("a")["frame.x"], 100);
    assert.deepEqual(getDocument().layers.a.overrides, { mobile: { "frame.x": 10, "frame.width": 200 } });
    assert.equal(seen("a")["frame.x"], 10);
    useBreakpointStore.getState().setActive(null);
    assert.equal(seen("a")["frame.x"], 100);
  });

  it("is one undo step, and undo removes the override", () => {
    useBreakpointStore.getState().setActive("mobile");
    const before = JSON.stringify(getDocument().layers);
    documentCommands.updateProps("a", { "frame.x": 10, "frame.y": 20 });
    historyCommands.undo();
    assert.equal(JSON.stringify(getDocument().layers), before);
    assert.equal(getDocument().layers.a.overrides, undefined);
  });

  it("writing what the layer already shows, or the base value again, leaves no override", () => {
    useBreakpointStore.getState().setActive("mobile");
    documentCommands.updateProps("a", { "frame.x": 100 });
    assert.equal(getDocument().layers.a.overrides, undefined);
    documentCommands.updateProps("a", { "frame.x": 50 });
    assert.equal(seen("a")["frame.x"], 50);
    documentCommands.updateProps("a", { "frame.x": 100 }); // back to the base value: the override goes
    assert.equal(getDocument().layers.a.overrides, undefined);
  });

  it("Tablet overrides reach Mobile; a Mobile override wins over them", () => {
    useBreakpointStore.getState().setActive("tablet");
    documentCommands.updateProps("a", { "frame.x": 40, "frame.y": 41 });
    useBreakpointStore.getState().setActive("mobile");
    assert.equal(seen("a")["frame.x"], 40);
    documentCommands.updateProps("a", { "frame.x": 7 });
    assert.equal(seen("a")["frame.x"], 7);
    assert.equal(seen("a")["frame.y"], 41);
    useBreakpointStore.getState().setActive("tablet");
    assert.equal(seen("a")["frame.x"], 40);
  });

  it("reset removes one override or all of them, in one undo step", () => {
    useBreakpointStore.getState().setActive("mobile");
    documentCommands.updateProps("a", { "frame.x": 1, "frame.y": 2, "frame.width": 3 });
    assert.equal(resetOverrides(["a"], ["frame.y"]), 1);
    assert.deepEqual(Object.keys(getDocument().layers.a.overrides!.mobile).sort(), ["frame.width", "frame.x"]);
    assert.equal(resetOverrides(["a"]), 1);
    assert.equal(getDocument().layers.a.overrides, undefined);
    assert.equal(resetOverrides(["a"]), 0);
    historyCommands.undo();
    assert.ok(getDocument().layers.a.overrides);
  });

  it("hiding at a breakpoint is an override of visibility, not a change of the base", () => {
    useBreakpointStore.getState().setActive("mobile");
    setVisible(["b"], false);
    assert.equal(getDocument().layers.b.visible, undefined);
    assert.equal(getResolvedDocument().layers.b.visible, false);
    useBreakpointStore.getState().setActive(null);
    assert.notEqual(getResolvedDocument().layers.b.visible, false);
    useBreakpointStore.getState().setActive("mobile");
    setVisible(["b"], true);
    assert.equal(getDocument().layers.b.overrides, undefined);
  });

  it("a top-level frame's canvas position and the responsive flag are not breakpoint overrides", () => {
    useBreakpointStore.getState().setActive("mobile");
    documentCommands.updateProps("pg", { "frame.x": 50, "frame.y": 60 });
    assert.equal(base("pg")["frame.x"], 50);
    assert.equal(getDocument().layers.pg.overrides, undefined);
  });
});

describe("Phase 43: the page seen at a breakpoint", () => {
  beforeEach(() => {
    setDocument(doc());
    useBreakpointStore.getState().setActive(null);
  });

  it("a responsive frame is as wide as the breakpoint, and its pinned layers follow", () => {
    useBreakpointStore.getState().setActive("mobile");
    assert.equal(seen("pg")["frame.width"], 375);
    // the layer pinned to the right keeps its distance from the right edge: 1440 - 1100 = 340 from the right
    assert.equal(seen("r")["frame.x"], 1100 + (375 - 1440));
    assert.equal(base("pg")["frame.width"], 1440);
  });

  it("a layer's own override wins over where its constraint put it, and a frame's width override over the breakpoint's", () => {
    useBreakpointStore.getState().setActive("mobile");
    documentCommands.updateProps("r", { "frame.x": 200 });
    assert.equal(seen("r")["frame.x"], 200);
    documentCommands.updateProps("pg", { "frame.width": 400 });
    assert.equal(seen("pg")["frame.width"], 400);
  });

  it("the same document object comes back at the base and when nothing differs", () => {
    const d = getDocument();
    assert.equal(resolveDocumentAt(d, null), d);
    assert.equal(resolveDocumentAt(d, "tablet") === resolveDocumentAt(d, "tablet"), true); // memoised
  });

  it("a frame that isn't responsive keeps its width", () => {
    documentCommands.updateProps("pg", { "breakpoints.responsive": undefined });
    useBreakpointStore.getState().setActive("mobile");
    assert.equal(seen("pg")["frame.width"], 1440);
  });
});

describe("Phase 43: managing breakpoints", () => {
  beforeEach(() => {
    setDocument(doc());
    useBreakpointStore.getState().setActive(null);
  });

  it("adds a breakpoint in order, refuses a duplicate width, renames and resizes, removes with its overrides", () => {
    const id = addBreakpoint("Laptop", 1024)!;
    assert.deepEqual(breakpointsOf(getDocument()).map((b) => b.width), [1440, 1024, 768, 375]);
    assert.equal(addBreakpoint("Same", 1024), null);
    assert.equal(addBreakpoint("Tiny", 50), null);
    assert.equal(updateBreakpoint(id, { name: "Small laptop", width: 1100 }), true);
    assert.equal(breakpointsOf(getDocument()).find((b) => b.id === id)!.name, "Small laptop");
    useBreakpointStore.getState().setActive(id);
    documentCommands.updateProps("a", { "frame.x": 3 });
    assert.ok(getDocument().layers.a.overrides![id]);
    assert.equal(removeBreakpoint(id), true);
    assert.equal(getDocument().layers.a.overrides, undefined);
    assert.equal(useBreakpointStore.getState().activeId, null);
    assert.equal(removeBreakpoint("desktop"), false); // the base stays
  });

  it("choosing a smaller breakpoint makes the frame of the selection responsive the first time", () => {
    documentCommands.updateProps("pg", { "breakpoints.responsive": undefined });
    useSelectionStore.getState().select("a", "element");
    assert.equal(setActiveBreakpoint("nope"), false);
    assert.equal(setActiveBreakpoint("mobile"), true);
    assert.equal(base("pg")["breakpoints.responsive"], true);
    assert.equal(useBreakpointStore.getState().activeId, "mobile");
    assert.equal(seen("pg")["frame.width"], 375);
    assert.equal(setActiveBreakpoint("desktop"), true);
    assert.equal(useBreakpointStore.getState().activeId, null);
  });
});
