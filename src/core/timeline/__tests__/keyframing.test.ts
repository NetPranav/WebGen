import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer, attachClip, hydrateClip } from "../../document/factories";
import type { Layer, MotionDocument } from "../../document/schema";
import { documentCommands, getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { getTransport, transport } from "../../time/transport";
import { evaluate } from "../../kernel/evaluate";
import { sampleCubicBezier } from "../../kernel/easing";
import { useTimelineUiStore } from "../../store/useTimelineUiStore";
import { getCommand, invokeCommand } from "../../commands";
import { registerTimelineCommands } from "../timelineCommands";
import { setLayerProps } from "../../editing/editOps";
import { animatedIndex, animatedProperties, buildTimelineItems, type KeyframeMark } from "../model";
import { KEY_RADIUS, ROW_HEIGHT, drawLanes, hitKey, keysInBox, laneRows, visibleWindow, type LaneContext } from "../lanes";
import { breadcrumbs, compositionTabs, nestedRows, triggerLabel } from "../tabs";
import { addPrecomp, closeComposition, goToParent, openBreadcrumb, openComposition } from "../compositionOps";
import { setStopwatch } from "../timelineOps";
import { alignKeyframes, allKeyframeIds, clearKeyClipboard, copyKeyframes, deleteKeyframes, distributeKeyframes, installAutoKey, keyClipboard, locateKeyframes, moveKeyframes, pasteKeyframes, scaleKeyframeTime, setKeyframeAt } from "../keyframeOps";
import { EASE_PRESETS, bezierEase, bezierHandles, boundsOf, curvePoints, curveValue, easeKind, graphCurves, handleFromPoint, handlePoint, setKeyframeEase, setKeyframeSpring, speedPoints, springControlLabels, springEase, springParams } from "../graph";

const COMP = "comp_main";
const box = (id: string, parentId: string | null, children: string[] = []): Layer =>
  createLayer({ id, archetype: "container", parentId, name: id, children, properties: { "frame.width": 100, "frame.height": 100 } }) as Layer;

const fresh = () => {
  const clip = attachClip(hydrateClip({ name: "Fade", type: "entrance", trigger: "mount", duration: 1, easing: "linear", tracks: [{ property: "appearance.opacity", keyframes: [{ time: 0, value: 0 }, { time: 1, value: 1 }] }] }), "a");
  setDocument(createDocumentFromLayers([box("page", null, ["a", "b", "c"]), box("a", "page"), box("b", "page"), box("c", "page")], [clip]));
  transport.setComposition({ id: COMP, fps: 60, duration: 5, workArea: { start: 0, end: 5 } });
  transport.seek(0);
  useTimelineUiStore.setState({ selectedKeys: new Set(), recordMode: false, trail: [], openPrecomps: [] });
  clearKeyClipboard();
};

const keysOf = (layerId: string, path: string): Array<{ id: string; time: number; value: unknown; ease?: string; hold?: boolean }> =>
  Object.values(getDocument().clips).flatMap((c) => (c.layerId === layerId ? c.tracks.filter((t) => t.property === path).flatMap((t) => t.keyframes) : []));
const times = (layerId: string, path: string) => keysOf(layerId, path).map((k) => Math.round(k.time * 1000) / 1000);
const undo = () => historyCommands.undo();

describe("Phase 64: keyframes at scale", () => {
  beforeEach(fresh);

  it("the one-pass index agrees with the per-layer lookup", () => {
    setStopwatch("b", "transform.x", true, 1);
    setStopwatch("b", "transform.y", true, 2);
    const index = animatedIndex(getDocument(), COMP);
    for (const id of ["a", "b", "c"]) {
      const single = animatedProperties(getDocument(), COMP, id);
      const many = index.get(id) ?? new Map<string, KeyframeMark[]>();
      assert.deepEqual([...many.keys()].sort(), [...single.keys()].sort());
      for (const [path, marks] of single) assert.deepEqual(many.get(path), marks);
    }
    assert.equal(index.has("c"), false, "a layer with no keyframes is absent");
  });

  it("builds only the rows in view, with spacers for the rest", () => {
    assert.deepEqual(visibleWindow(1000, 0, 260, 26, 0), { start: 0, end: 10, before: 0, after: 990 * 26 });
    const mid = visibleWindow(1000, 26 * 100, 260, 26, 4);
    assert.deepEqual([mid.start, mid.end], [96, 114]);
    assert.equal(mid.before, 96 * 26);
    assert.equal(mid.after, (1000 - 114) * 26);
    assert.deepEqual(visibleWindow(5, 9999, 260, 26, 4), { start: 5, end: 5, before: 130, after: 0 }, "scrolled past the end: nothing to build");
    assert.deepEqual(visibleWindow(0, 0, 100), { start: 0, end: 0, before: 0, after: 0 });
  });

  it("a layer's summary dots show while it is closed, and its properties' diamonds while it is open", () => {
    setStopwatch("b", "transform.x", true, 1);
    setStopwatch("b", "transform.y", true, 1);
    const closedItems = buildTimelineItems(getDocument(), COMP, new Set(["page"]), { open: new Set(), reveal: {} });
    const closed = laneRows(closedItems, { start: 0, end: closedItems.length });
    const summary = closed.find((r) => r.kind === "layer" && closedItems[r.index].kind === "layer" && (closedItems[r.index] as { row: { id: string } }).row.id === "b")!;
    assert.deepEqual(summary.keys.map((k) => k.time), [1], "two keys at one time are one dot");
    const openItems = buildTimelineItems(getDocument(), COMP, new Set(["page"]), { open: new Set(["b", "b|transform"]), reveal: {} });
    const open = laneRows(openItems, { start: 0, end: openItems.length });
    assert.ok(open.filter((r) => r.kind === "property").length === 2);
    assert.ok(!open.some((r) => r.kind === "layer" && (openItems[r.index] as { row?: { id: string } }).row?.id === "b"), "an open layer has no summary");
  });

  it("paints one diamond per visible keyframe, batched by colour, and skips what is off screen", () => {
    const calls: string[] = [];
    const ctx: LaneContext = {
      clearRect: () => calls.push("clear"), save: () => calls.push("save"), restore: () => calls.push("restore"), beginPath: () => calls.push("begin"), moveTo: () => calls.push("move"),
      lineTo: () => calls.push("line"), closePath: () => calls.push("close"), fill: () => calls.push("fill"), stroke: () => calls.push("stroke"), fillStyle: "", strokeStyle: "", lineWidth: 1,
    };
    const rows = [
      { index: 0, kind: "property" as const, keys: [{ id: "k1", time: 1 }, { id: "k2", time: 2 }, { id: "k3", time: 50 }] },
      { index: 500, kind: "property" as const, keys: [{ id: "k4", time: 1 }] },
    ];
    const drawn = drawLanes(ctx, rows, { pixelsPerSecond: 100, scrollLeft: 0, scrollTop: 0, width: 400, height: 260, selected: new Set(["k2"]) });
    assert.equal(drawn, 2, "k3 is right of the view and row 500 is below it");
    assert.equal(calls.filter((c) => c === "begin").length, 2, "one path for the plain keys, one for the selected");
    assert.equal(calls.filter((c) => c === "move").length, 2);
  });

  it("finds the keyframe under a press, and the ones inside a dragged box", () => {
    const keys = [{ id: "a", time: 1 }, { id: "b", time: 1.05 }, { id: "c", time: 3 }];
    assert.equal(hitKey(keys, 100, 100), "a");
    assert.equal(hitKey(keys, 104, 100), "b", "the nearer of two close keys");
    assert.equal(hitKey(keys, 200, 100), null);
    assert.equal(hitKey(keys, 100 + KEY_RADIUS + 1, 100), "b".length ? "b" : null);
    setStopwatch("b", "transform.x", true, 1);
    setStopwatch("b", "transform.y", true, 3);
    const items = buildTimelineItems(getDocument(), COMP, new Set(["page"]), { open: new Set(["b", "b|transform"]), reveal: {} });
    const bRow = items.findIndex((i) => i.kind === "property" && i.path === "transform.x");
    const yRow = items.findIndex((i) => i.kind === "property" && i.path === "transform.y");
    const ids = keysInBox(items, { x0: 50, y0: bRow * ROW_HEIGHT + 2, x1: 150, y1: yRow * ROW_HEIGHT + 20 }, 100);
    assert.deepEqual(ids, [keysOf("b", "transform.x")[0].id], "only the keyframe at 1 s is inside the box's time range");
  });

  it("200 layers × 20 tracks: the list, the lanes and a repaint stay inside a frame's budget", () => {
    const layers: Layer[] = [box("page", null, Array.from({ length: 200 }, (_, i) => `l${i}`))];
    const clips = [];
    const paths = ["transform.x", "transform.y", "transform.scale", "transform.rotate", "appearance.opacity"];
    for (let i = 0; i < 200; i++) {
      layers.push(box(`l${i}`, "page"));
      clips.push(attachClip(hydrateClip({ name: "Motion", type: "entrance", trigger: "mount", duration: 4, easing: "linear", tracks: Array.from({ length: 20 }, (_, t) => ({ property: paths[t % paths.length], keyframes: [{ time: 0.1 * t, value: 0 }, { time: 0.1 * t + 1, value: 1 }, { time: 3, value: 0 }] })) }), `l${i}`));
    }
    setDocument(createDocumentFromLayers(layers, clips));
    const view = { open: new Set(Array.from({ length: 200 }, (_, i) => `l${i}`).concat(Array.from({ length: 200 }, (_, i) => `l${i}|transform`))), reveal: {} };
    const expanded = new Set(["page"]);
    const median = (fn: () => void, runs = 9) => {
      const samples: number[] = [];
      for (let i = 0; i < runs; i++) {
        const t0 = performance.now();
        fn();
        samples.push(performance.now() - t0);
      }
      return samples.sort((a, b) => a - b)[Math.floor(runs / 2)];
    };
    let items = buildTimelineItems(getDocument(), COMP, expanded, view);
    const build = median(() => void (items = buildTimelineItems(getDocument(), COMP, expanded, view)));
    assert.ok(items.length > 1000, `a long list (${items.length} rows)`);
    const win = visibleWindow(items.length, 26 * 400, 520);
    const rows = laneRows(items, win);
    const noop = () => undefined;
    const ctx: LaneContext = { clearRect: noop, save: noop, restore: noop, beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop, fill: noop, stroke: noop, fillStyle: "", strokeStyle: "", lineWidth: 1 };
    const paint = median(() => void drawLanes(ctx, rows, { pixelsPerSecond: 240, scrollLeft: 0, scrollTop: 26 * 400, width: 1200, height: 520 }), 25);
    console.log(`      200 layers x 20 tracks: build ${build.toFixed(1)} ms for ${items.length} rows, paint ${paint.toFixed(2)} ms for ${rows.length} rows`);
    assert.ok(build < 120, `building the list took ${build} ms`);
    assert.ok(paint < 4, `a repaint took ${paint} ms (16 ms is a frame)`);
    assert.ok(win.end - win.start < 60, "only a screenful of rows is built");
  });
});

describe("Phase 65: composition tabs and breadcrumbs", () => {
  beforeEach(fresh);

  it("Main is always a tab; interaction compositions are tabs named for their trigger", () => {
    documentCommands.addClip("b", { name: "Lift", type: "hover", trigger: "hover", duration: 0.4, easing: "power2.out", enabled: true, tracks: [{ id: "t1", property: "transform.y", keyframes: [{ id: "k1", time: 0, value: 0 }, { id: "k2", time: 0.4, value: -4 }] }] } as never);
    const tabs = compositionTabs(getDocument(), [], COMP);
    assert.deepEqual(tabs.map((t) => t.kind), ["main", "interaction"]);
    assert.equal(tabs[0].active, true);
    assert.equal(tabs[1].trigger, "Hover on b");
    assert.equal(tabs[1].closable, false);
    const comp = Object.values(getDocument().compositions).find((c) => c.kind === "interaction")!;
    assert.equal(triggerLabel(getDocument(), comp), "Hover on b");
  });

  it("a precomp is a tab only once opened, and its tab closes", () => {
    const { compositionId, nestedId } = addPrecomp("Logo", 2);
    assert.deepEqual(compositionTabs(getDocument(), [], COMP).map((t) => t.kind), ["main"], "placed but not opened");
    assert.equal(getDocument().compositions[COMP].nested[0].id, nestedId);
    assert.equal(openComposition(compositionId, true).opened, true);
    assert.equal(getTransport().compositionId, compositionId);
    assert.equal(getTransport().duration, 2);
    const tabs = compositionTabs(getDocument(), useTimelineUiStore.getState().openPrecomps, compositionId);
    assert.deepEqual(tabs.map((t) => [t.name, t.closable, t.active]), [["Main", false, false], ["Logo", true, true]]);
    assert.equal(closeComposition(compositionId), true);
    assert.equal(getTransport().compositionId, COMP, "closing the tab you are on goes back up");
    assert.deepEqual(compositionTabs(getDocument(), useTimelineUiStore.getState().openPrecomps, COMP).map((t) => t.kind), ["main"]);
  });

  it("opening from a bar grows the breadcrumbs, and a breadcrumb or 'up' goes back", () => {
    const outer = addPrecomp("Outer", 3);
    openComposition(outer.compositionId, true);
    const inner = addPrecomp("Inner", 1);
    openComposition(inner.compositionId, true);
    const doc = getDocument();
    assert.deepEqual(breadcrumbs(doc, useTimelineUiStore.getState().trail, inner.compositionId).map((c) => c.name), ["Main", "Outer", "Inner"]);
    assert.equal(openBreadcrumb(1).opened, true);
    assert.equal(getTransport().compositionId, outer.compositionId);
    assert.deepEqual(breadcrumbs(getDocument(), useTimelineUiStore.getState().trail, outer.compositionId).map((c) => c.name), ["Main", "Outer"]);
    assert.equal(goToParent().opened, true);
    assert.equal(getTransport().compositionId, COMP);
    assert.equal(goToParent().opened, false, "already at the top");
  });

  it("refuses to open from a bar a composition that isn't placed in the one showing", () => {
    const orphan = addPrecomp("Orphan", 1);
    documentCommands.removeNested(COMP, getDocument().compositions[COMP].nested[0].id);
    const result = openComposition(orphan.compositionId, true);
    assert.equal(result.opened, false);
    assert.equal(openComposition(orphan.compositionId).opened, true, "from a tab it opens");
  });

  it("keyframes made while a precomp is open live in the precomp, and the parent's bar shows them", () => {
    const { compositionId } = addPrecomp("Logo", 2);
    openComposition(compositionId, true);
    transport.seek(0.5);
    setStopwatch("b", "transform.x", true, 0.5);
    const clip = Object.values(getDocument().clips).find((c) => c.layerId === "b")!;
    assert.deepEqual(getDocument().compositions[compositionId].clips.map((p) => p.clipId), [clip.id], "placed in the precomp");
    assert.equal(getDocument().compositions[COMP].clips.some((p) => p.clipId === clip.id), false, "and not in Main");
    // back in Main, the precomp's bar says what is inside it
    openBreadcrumb(0);
    const [row] = nestedRows(getDocument(), COMP);
    assert.equal(row.name, "Logo");
    assert.deepEqual(row.keyTimes, [0.5]);
    assert.deepEqual(row.layers, ["b"]);
    assert.equal(row.childDuration, 2);
    // a second edit in the precomp shows up in the parent
    openComposition(compositionId, true);
    setStopwatch("b", "transform.y", true, 1.5);
    openBreadcrumb(0);
    assert.deepEqual(nestedRows(getDocument(), COMP)[0].keyTimes, [0.5, 1.5]);
  });

  it("keyframes made in an interaction tab stay in that interaction composition", () => {
    documentCommands.addClip("b", { name: "Lift", type: "hover", trigger: "hover", duration: 0.4, easing: "linear", enabled: true, tracks: [{ id: "t1", property: "transform.y", keyframes: [{ id: "k1", time: 0, value: 0 }] }] } as never);
    const hover = Object.values(getDocument().compositions).find((c) => c.kind === "interaction")!;
    openComposition(hover.id);
    transport.seek(0.2);
    setStopwatch("b", "transform.x", true, 0.2);
    const comps = Object.values(getDocument().compositions);
    assert.equal(comps.filter((c) => c.kind === "interaction").length, 1, "no stray interaction composition");
    const clipIds = getDocument().compositions[hover.id].clips.map((p) => p.clipId);
    const holder = clipIds.map((id) => getDocument().clips[id]).find((c) => c.tracks.some((t) => t.property === "transform.x"));
    assert.ok(holder, "the new track is in the hover composition");
  });

  it("a trail that no longer matches the document falls back to the composition showing", () => {
    const { compositionId } = addPrecomp("Logo", 1);
    openComposition(compositionId, true);
    documentCommands.removeNested(COMP, getDocument().compositions[COMP].nested[0].id);
    assert.deepEqual(breadcrumbs(getDocument(), useTimelineUiStore.getState().trail, compositionId).map((c) => c.name), ["Logo"]);
  });
});

describe("Phase 66: keyframing", () => {
  beforeEach(fresh);

  it("adds a keyframe at the playhead holding the value shown, and replaces one already there", () => {
    const id = setKeyframeAt("b", "transform.x", 1)!;
    assert.deepEqual(times("b", "transform.x"), [1]);
    assert.equal(keysOf("b", "transform.x")[0].value, 0);
    assert.equal(setKeyframeAt("b", "transform.x", 1, { value: 40 }), id, "same moment: same keyframe");
    assert.equal(keysOf("b", "transform.x").length, 1);
    assert.equal(keysOf("b", "transform.x")[0].value, 40);
    setKeyframeAt("b", "transform.x", 2, { value: 80 });
    assert.deepEqual(times("b", "transform.x"), [1, 2]);
    undo();
    assert.deepEqual(times("b", "transform.x"), [1], "one undo step per keyframe");
  });

  it("refuses a property the layer can't animate", () => {
    assert.equal(setKeyframeAt("b", "nope.nothing", 1), null);
    assert.equal(setKeyframeAt("ghost", "transform.x", 1), null);
  });

  it("moves selected keyframes together, snapped to frames and stopped at the edges, in one undo step", () => {
    const k1 = setKeyframeAt("b", "transform.x", 1, { value: 1 })!;
    const k2 = setKeyframeAt("b", "transform.x", 2, { value: 2 })!;
    assert.equal(moveKeyframes([k1, k2], 0.5), 2);
    assert.deepEqual(times("b", "transform.x"), [1.5, 2.5]);
    moveKeyframes([k1, k2], 99);
    assert.deepEqual(times("b", "transform.x"), [2.5, 3.5].map((t) => t + 1.5), "the later one stops at 5 s and the pair keeps its spacing");
    undo();
    assert.deepEqual(times("b", "transform.x"), [1.5, 2.5]);
    moveKeyframes([k1, k2], -99);
    assert.deepEqual(times("b", "transform.x"), [0, 1]);
    assert.equal(moveKeyframes([k1, k2], 0.001), 0, "less than a frame: nothing");
  });

  it("deletes keyframes; the last one takes the track, and the Keyframes clip, with it", () => {
    const k1 = setKeyframeAt("b", "transform.x", 1)!;
    const k2 = setKeyframeAt("b", "transform.x", 2)!;
    deleteKeyframes([k1]);
    assert.deepEqual(times("b", "transform.x"), [2]);
    deleteKeyframes([k2]);
    assert.equal(keysOf("b", "transform.x").length, 0);
    assert.equal(Object.values(getDocument().clips).some((c) => c.layerId === "b"), false, "the empty Keyframes clip is gone");
    undo();
    assert.deepEqual(times("b", "transform.x"), [2], "undo brings it back whole");
  });

  it("copies keyframes and pastes them on other layers at the playhead, keeping their spacing", () => {
    const k1 = setKeyframeAt("b", "transform.x", 1, { value: 10 })!;
    const k2 = setKeyframeAt("b", "transform.x", 2, { value: 20 })!;
    assert.equal(copyKeyframes([k1, k2]), 2);
    assert.equal(keyClipboard()!.groups.length, 1);
    const made = pasteKeyframes(["c", "a"], 3);
    assert.equal(made.length, 4, "two keyframes on each of two layers");
    assert.deepEqual(times("c", "transform.x"), [3, 4]);
    assert.deepEqual(times("a", "transform.x"), [3, 4]);
    assert.deepEqual(keysOf("c", "transform.x").map((k) => k.value), [10, 20]);
    assert.deepEqual(times("b", "transform.x"), [1, 2], "the source is untouched");
    undo();
    assert.equal(keysOf("c", "transform.x").length + keysOf("a", "transform.x").length, 0, "one undo takes the whole paste away");
  });

  it("copied from several layers, the keys go on the targets in order", () => {
    const kb = setKeyframeAt("b", "transform.x", 1, { value: 1 })!;
    const kc = setKeyframeAt("c", "transform.y", 1, { value: 2 })!;
    copyKeyframes([kb, kc]);
    pasteKeyframes(["a"], 2);
    assert.deepEqual(times("a", "transform.x"), [2], "the first copied layer's key lands on the first target");
    assert.equal(keysOf("a", "transform.y").length, 0, "the second copied layer had no second target");
  });

  it("aligns to the playhead or the first or last key, distributes evenly, and scales time", () => {
    const ids = [1, 1.2, 3].map((t, i) => setKeyframeAt("b", i === 0 ? "transform.x" : i === 1 ? "transform.y" : "transform.scale", t, { value: i })!);
    const all = () => ids.map((id) => locateKeyframes(getDocument(), COMP, [id])[0].time);
    distributeKeyframes(ids);
    assert.deepEqual(all().map((t) => Math.round(t * 1000) / 1000), [1, 2, 3]);
    transport.seek(4);
    alignKeyframes(ids, "playhead");
    assert.deepEqual(all().map((t) => Math.round(t * 1000) / 1000), [4, 4, 4]);
    moveKeyframes([ids[0]], -3);
    alignKeyframes(ids, "first");
    assert.deepEqual(all().map((t) => Math.round(t * 1000) / 1000), [1, 1, 1]);
    moveKeyframes([ids[2]], 2);
    scaleKeyframeTime(ids, 2);
    assert.deepEqual(all().map((t) => Math.round(t * 1000) / 1000), [1, 1, 5], "around the first key; the far one stops at the end (5 s)");
    assert.equal(scaleKeyframeTime(ids, 0), 0);
    assert.equal(distributeKeyframes(ids.slice(0, 2)), 0, "needs three");
  });

  it("selects every keyframe of the selected layers", () => {
    setKeyframeAt("b", "transform.x", 1);
    setKeyframeAt("c", "transform.x", 1);
    assert.equal(allKeyframeIds(getDocument(), COMP, ["b"]).length, 1);
    assert.equal(allKeyframeIds(getDocument(), COMP).length, 4, "b, c and a's two opacity keys");
  });

  describe("auto-key (record mode)", () => {
    let remove: () => void;
    beforeEach(() => {
      remove = installAutoKey();
    });
    afterEach(() => remove());

    it("with record off, an edit changes the property and nothing else", () => {
      setLayerProps(["b"], { "transform.x": 50 });
      assert.equal(getDocument().layers.b.properties["transform.x"], 50);
      assert.equal(keysOf("b", "transform.x").length, 0);
    });

    it("3 recorded changes make 3 keyframes, playback matches evaluate(), and undo removes them", () => {
      useTimelineUiStore.getState().setRecordMode(true);
      for (const [t, x] of [[0, 10], [1, 60], [2, 120]] as const) {
        transport.seek(t);
        setLayerProps(["b"], { "transform.x": x });
      }
      assert.deepEqual(times("b", "transform.x"), [0, 1, 2]);
      assert.deepEqual(keysOf("b", "transform.x").map((k) => k.value), [10, 60, 120]);
      for (const [t, x] of [[0, 10], [0.5, 35], [1, 60], [1.5, 90], [2, 120], [4, 120]] as const) {
        assert.ok(Math.abs((evaluate(getDocument(), COMP, "b", t)["transform.x"] as number) - x) < 1e-6, `at ${t} s`);
      }
      undo();
      assert.deepEqual(times("b", "transform.x"), [0, 1], "the keyframe goes with the edit: one step");
      undo();
      undo();
      assert.equal(keysOf("b", "transform.x").length, 0);
      assert.equal(getDocument().layers.b.properties["transform.x"] ?? 0, 0, "and the value is back where it was");
    });

    it("changing the same property twice at one moment keeps one keyframe", () => {
      useTimelineUiStore.getState().setRecordMode(true);
      transport.seek(1);
      setLayerProps(["b"], { "transform.x": 10 });
      setLayerProps(["b"], { "transform.x": 30 });
      assert.deepEqual(keysOf("b", "transform.x").map((k) => k.value), [30]);
    });

    it("records into the layer's existing clip, on every animatable property that changed", () => {
      useTimelineUiStore.getState().setRecordMode(true);
      transport.seek(0.5);
      setLayerProps(["a"], { "transform.y": 12, "appearance.opacity": 0.4 });
      assert.equal(Object.values(getDocument().clips).filter((c) => c.layerId === "a").length, 1, "the Fade clip took both");
      assert.deepEqual(times("a", "transform.y"), [0.5]);
      assert.deepEqual(times("a", "appearance.opacity"), [0, 0.5, 1]);
    });

    it("doesn't record a property edit on a layer made in the same step, or any non-animatable one", () => {
      useTimelineUiStore.getState().setRecordMode(true);
      transport.seek(1);
      documentCommands.renameLayer?.("b", "Renamed");
      assert.equal(Object.values(getDocument().clips).filter((c) => c.layerId === "b").length, 0);
    });
  });

  it("the commands act on the selected keyframes and one of them runs from the keyboard", () => {
    const off = registerTimelineCommands();
    try {
      const k = setKeyframeAt("b", "transform.x", 1, { value: 5 })!;
      invokeCommand("timeline.selectKeyframes", { ids: [k] });
      assert.deepEqual([...useTimelineUiStore.getState().selectedKeys], [k]);
      invokeCommand("timeline.moveKeyframes", { delta: 1 });
      assert.deepEqual(times("b", "transform.x"), [2]);
      const del = getCommand("timeline.deleteKeyframes")!;
      assert.deepEqual(del.keybinding, ["Delete", "Backspace"]);
      const ctx = { canvasFocus: false, timelineFocus: true, blueprintFocus: false, textEditing: false, "selection.count": 0, "transport.playing": false };
      assert.equal(del.when!(ctx), true);
      assert.equal(del.when!({ ...ctx, timelineFocus: false, canvasFocus: true }), false, "the canvas keeps Delete for layers");
      assert.equal(del.when!({ ...ctx, textEditing: true }), false);
      invokeCommand("timeline.deleteKeyframes");
      assert.equal(keysOf("b", "transform.x").length, 0);
      assert.equal(useTimelineUiStore.getState().selectedKeys.size, 0);
      assert.equal(getCommand("timeline.copyKeyframes")!.when!(ctx), false, "nothing selected, nothing to copy");
    } finally {
      off();
    }
  });
});

describe("Phase 67: the graph editor and easing", () => {
  beforeEach(fresh);
  const twoKeys = () => {
    const a = setKeyframeAt("b", "transform.x", 0, { value: 0 })!;
    const b = setKeyframeAt("b", "transform.x", 1, { value: 100 })!;
    return { a, b };
  };

  it("sets the easing into a keyframe, and the kernel plays it", () => {
    const { a, b } = twoKeys();
    assert.equal(setKeyframeEase([a], "linear"), 0, "the first keyframe has no segment into it");
    assert.equal(setKeyframeEase([b], "cubic-bezier(0.25, 0.1, 0.25, 1)"), 1);
    assert.equal(keysOf("b", "transform.x")[1].ease, "cubic-bezier(0.25, 0.1, 0.25, 1)");
    const kernel = evaluate(getDocument(), COMP, "b", 0.5)["transform.x"] as number;
    assert.ok(Math.abs(kernel - 100 * sampleCubicBezier(0.25, 0.1, 0.25, 1, 0.5)) < 1e-9);
    assert.ok(Math.abs(kernel - 80.24) < 0.05, `CSS "ease" is 0.8024 at the half-way mark, got ${kernel}`);
    assert.equal(setKeyframeEase([b], "not an easing"), 0);
    undo();
    assert.equal(keysOf("b", "transform.x")[1].ease, undefined);
  });

  it("the graph's curve matches the kernel's golden values at every sample", () => {
    const { b } = twoKeys();
    for (const ease of ["linear", "cubic-bezier(0.42, 0, 0.58, 1)", "power2.out", "back.out(1.7)", springEase(0.3, 0.6), "steps(4)"]) {
      setKeyframeEase([b], ease);
      const [curve] = graphCurves(getDocument(), COMP, new Set([b]), []);
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const kernel = evaluate(getDocument(), COMP, "b", t)["transform.x"] as number;
        assert.ok(Math.abs(curveValue(curve, t) - kernel) < 1e-6, `${ease} at ${t}: graph ${curveValue(curve, t)} vs kernel ${kernel}`);
      }
    }
    setKeyframeEase([b], "cubic-bezier(0.42, 0, 0.58, 1)");
    assert.ok(Math.abs((evaluate(getDocument(), COMP, "b", 0.5)["transform.x"] as number) - 50) < 1e-6, "ease-in-out is symmetric");
  });

  it("holds a value until the next keyframe, and a later easing releases the hold", () => {
    const { b } = twoKeys();
    setKeyframeEase([b], "hold");
    assert.equal(keysOf("b", "transform.x")[0].hold, true);
    assert.equal(evaluate(getDocument(), COMP, "b", 0.9)["transform.x"], 0);
    assert.equal(evaluate(getDocument(), COMP, "b", 1)["transform.x"], 100);
    const [curve] = graphCurves(getDocument(), COMP, new Set([b]), []);
    assert.equal(curveValue(curve, 0.9), 0);
    setKeyframeEase([b], "linear");
    assert.equal(keysOf("b", "transform.x")[0].hold, undefined);
    assert.ok(Math.abs((evaluate(getDocument(), COMP, "b", 0.5)["transform.x"] as number) - 50) < 1e-9);
  });

  it("springs are written and read as Bounce and Time", () => {
    assert.equal(springEase(0.3, 0.6), "spring(bounce: 0.3, time: 0.6)");
    assert.equal(springEase(5, 0), "spring(bounce: 1, time: 0.1)", "clamped");
    assert.deepEqual(springParams("spring(bounce: 0.3, time: 0.6)"), { bounce: 0.3, time: 0.6 });
    assert.equal(springParams("spring(stiffness: 300, damping: 20)"), null, "physical springs aren't Bounce and Time");
    assert.equal(easeKind("spring(bounce: 0.3, time: 0.6)"), "spring");
    assert.equal(easeKind("spring(stiffness: 300, damping: 20)"), "physical spring");
    const { b } = twoKeys();
    assert.equal(setKeyframeSpring([b], 0.45, 0.5), 1);
    assert.equal(keysOf("b", "transform.x")[1].ease, "spring(bounce: 0.45, time: 0.5)");
    const overshoot = Math.max(...Array.from({ length: 40 }, (_, i) => evaluate(getDocument(), COMP, "b", i / 40)["transform.x"] as number));
    assert.ok(overshoot > 100, `a bouncy spring goes past the target (${overshoot})`);
  });

  it("the preset strip has the four named feels first, all valid, and Hold", () => {
    assert.deepEqual(EASE_PRESETS.slice(0, 4).map((p) => p.label), ["Snappy", "Smooth", "Bouncy", "Lazy"]);
    for (const p of EASE_PRESETS) assert.ok(p.value === "hold" || easeKind(p.value) !== undefined);
    for (const p of EASE_PRESETS.filter((x) => x.group === "feel")) assert.equal(easeKind(p.value), "spring", p.label);
    assert.ok(EASE_PRESETS.some((p) => p.value === "hold"));
    const { b } = twoKeys();
    for (const p of EASE_PRESETS) assert.equal(setKeyframeEase([b], p.value), 1, p.label);
  });

  it("the Simple face shows Bounce and Time, never stiffness or damping (label check)", () => {
    assert.deepEqual(springControlLabels("simple"), ["Bounce", "Time"]);
    const simple = springControlLabels("simple").join(" ").toLowerCase();
    assert.ok(!simple.includes("stiffness") && !simple.includes("damping") && !simple.includes("mass"));
    assert.deepEqual(springControlLabels("pro"), ["Bounce", "Time", "Stiffness", "Damping", "Mass"]);
    for (const p of EASE_PRESETS) {
      const text = `${p.label} ${p.hint}`.toLowerCase();
      assert.ok(!text.includes("stiffness") && !text.includes("damping"), `preset ${p.label}`);
    }
  });

  it("bezier handles round-trip through the easing string, and other easings have none", () => {
    assert.deepEqual(bezierHandles("cubic-bezier(0.25, 0.1, 0.25, 1)"), { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 });
    assert.deepEqual(bezierHandles("linear"), { x1: 0, y1: 0, x2: 1, y2: 1 });
    assert.ok(bezierHandles("power2.out"), "named power curves can be picked up");
    assert.equal(bezierHandles(springEase(0.3, 0.6)), null);
    assert.equal(bezierHandles("steps(4)"), null);
    assert.equal(bezierEase({ x1: -1, y1: 2, x2: 3, y2: -0.5 }), "cubic-bezier(0, 2, 1, -0.5)", "x handles stay inside 0..1; y may overshoot");
    const seg = { fromTime: 1, toTime: 3, fromValue: 10, toValue: 50 };
    const p = handlePoint(seg, 0.25, 1.5);
    assert.deepEqual(p, { time: 1.5, value: 70 });
    assert.deepEqual(handleFromPoint(seg, p.time, p.value), { x: 0.25, y: 1.5 });
    assert.equal(handleFromPoint({ ...seg, toValue: 10 }, 2, 10), null, "a flat segment has nothing to measure a handle against");
  });

  it("value and speed graphs: speed peaks where the curve is steepest", () => {
    const { b } = twoKeys();
    setKeyframeEase([b], "cubic-bezier(0.42, 0, 0.58, 1)");
    const [curve] = graphCurves(getDocument(), COMP, new Set([b]), []);
    const pts = curvePoints(curve, 40);
    assert.equal(pts[0][0], 0);
    assert.equal(pts[pts.length - 1][1], 100);
    const speed = speedPoints(curve, 40);
    const peak = speed.reduce((best, p) => (p[1] > best[1] ? p : best));
    assert.ok(Math.abs(peak[0] - 0.5) < 0.1, `fastest in the middle (${peak[0]})`);
    assert.ok(speed[0][1] < peak[1] / 4 && speed[speed.length - 1][1] < peak[1] / 4, "slow at both ends");
    const bounds = boundsOf(pts);
    assert.ok(bounds.v0 < 0 && bounds.v1 > 100 && bounds.t0 === 0 && bounds.t1 === 1);
    const flat = boundsOf([[0, 5], [1, 5]]);
    assert.ok(flat.v1 > flat.v0, "a constant curve still has a scale");
  });

  it("graph curves follow the selection: selected keyframes' tracks, else the selected layers' numeric tracks", () => {
    const { a } = twoKeys();
    setKeyframeAt("b", "appearance.background.color", 0, { value: "#ff0000" });
    setKeyframeAt("c", "transform.y", 0, { value: 3 });
    assert.deepEqual(graphCurves(getDocument(), COMP, new Set([a]), []).map((c) => c.property), ["transform.x"]);
    assert.deepEqual(graphCurves(getDocument(), COMP, new Set(), ["b"]).map((c) => c.property), ["transform.x"], "the colour track has no curve");
    assert.deepEqual(graphCurves(getDocument(), COMP, new Set(), ["b", "c"]).map((c) => c.property).sort(), ["transform.x", "transform.y"]);
    assert.deepEqual(graphCurves(getDocument(), COMP, new Set(), []), []);
    assert.equal(graphCurves(getDocument(), COMP, new Set([a]), [])[0].label, "Position X", "plain words");
  });

  it("setting easing on several keyframes is one undo step", () => {
    const a = setKeyframeAt("b", "transform.x", 0, { value: 0 })!;
    const b = setKeyframeAt("b", "transform.x", 1, { value: 10 })!;
    const c = setKeyframeAt("b", "transform.x", 2, { value: 0 })!;
    assert.equal(setKeyframeEase([a, b, c], "power2.out"), 2);
    undo();
    assert.deepEqual(keysOf("b", "transform.x").map((k) => k.ease), [undefined, undefined, undefined]);
  });
});

void ({} as MotionDocument);
