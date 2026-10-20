import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer, attachClip, hydrateClip } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { layerBar } from "../../document/compositions";
import { documentCommands, getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { selectRenderable } from "../../render/RenderLayer";
import { buildRows } from "../../layers/layerTree";
import { transport } from "../../time/transport";
import { useTimelineUiStore } from "../../store/useTimelineUiStore";
import { loadDocument } from "../../document/migrations";
import { BLEND_MODES, buildTimelineItems, buildTimelineRows, clampWorkArea, motionIndex, motionLabel, rulerLabel, slideBar, snapTime, tickStep, trimIn, trimOut } from "../model";
import { KEYFRAMES_CLIP, addMarkerAt, parentChoices, removeMarkerById, setLayerBarTimes, setLayerSwitch, setStopwatch, setWorkArea, setWorkAreaEdge, slideLayer, trimLayer } from "../timelineOps";

const COMP = "comp_main";
const dims = { duration: 5, fps: 60 };
const box = (id: string, parentId: string | null, children: string[] = []): Layer =>
  createLayer({ id, archetype: "container", parentId, name: id, children, properties: { "frame.width": 100, "frame.height": 100 } }) as Layer;

const fresh = () => {
  const clip = attachClip(hydrateClip({ name: "Fade", type: "entrance", trigger: "mount", duration: 1, easing: "linear", tracks: [{ property: "appearance.opacity", keyframes: [{ time: 0, value: 0 }, { time: 1, value: 1 }] }] }), "a");
  setDocument(createDocumentFromLayers([box("page", null, ["a", "b", "c"]), box("a", "page"), box("b", "page"), box("c", "page")], [clip]));
  transport.setComposition({ id: COMP, fps: 60, duration: 5, workArea: { start: 0, end: 5 } });
};

describe("Phase 61: bar arithmetic", () => {
  const bar = { start: 0, in: 1, out: 3, stretch: 1 };
  it("snaps to whole frames", () => {
    assert.equal(snapTime(1.0083, 60), 1);
    assert.ok(Math.abs(snapTime(1.0084, 60) - 61 / 60) < 1e-12);
  });
  it("trims the in point inside the bar and the composition", () => {
    assert.equal(trimIn(bar, -4, dims).in, 0);
    assert.ok(Math.abs(trimIn(bar, 9, dims).in - (3 - 1 / 60)) < 1e-12, "at least a frame before out");
    assert.equal(trimIn(bar, 1.5, dims).in, 1.5);
  });
  it("trims the out point inside the bar and the composition", () => {
    assert.equal(trimOut(bar, 99, dims).out, 5);
    assert.ok(Math.abs(trimOut(bar, 0, dims).out - (1 + 1 / 60)) < 1e-12);
  });
  it("slides the whole bar, with its own time 0, and stops at the composition's edges", () => {
    assert.deepEqual(slideBar(bar, 0.5, dims), { start: 0.5, in: 1.5, out: 3.5, stretch: 1 });
    assert.deepEqual(slideBar(bar, 10, dims), { start: 2, in: 3, out: 5, stretch: 1 });
    assert.deepEqual(slideBar(bar, -10, dims), { start: -1, in: 0, out: 2, stretch: 1 });
  });
  it("clamps the work area and keeps it a frame long", () => {
    assert.deepEqual(clampWorkArea(1, 2, dims), { start: 1, end: 2 });
    assert.deepEqual(clampWorkArea(-3, 99, dims), { start: 0, end: 5 });
    const tiny = clampWorkArea(2, 2, dims)!;
    assert.ok(tiny.end - tiny.start >= 1 / 60 - 1e-12);
  });
  it("labels the ruler as timecode or frames and spaces the ticks", () => {
    assert.equal(rulerLabel(1.5, 60, "timecode"), "00:01:30");
    assert.equal(rulerLabel(1.5, 60, "frames"), "90");
    assert.equal(rulerLabel(65, 24, "timecode"), "01:05:00");
    assert.equal(tickStep(120), 1, "70 px apart at 120 px/s needs a second");
    assert.equal(tickStep(1200), 0.1);
  });
  it("offers the CSS blend modes", () => {
    assert.ok(BLEND_MODES.includes("multiply") && BLEND_MODES.includes("normal"));
  });
});

describe("Phase 61: rows and badges", () => {
  beforeEach(fresh);
  it("lists the Layers panel's rows in the same order, with each layer's bar and switches", () => {
    const expanded = new Set(["page"]);
    const layers = getDocument().layers;
    const rows = buildTimelineRows(getDocument(), COMP, expanded);
    assert.deepEqual(rows.map((r) => r.id), buildRows(layers, expanded).map((r) => r.id));
    assert.deepEqual(rows[1].bar, { start: 0, in: 0, out: 5, stretch: 1 }, "an untrimmed layer spans the composition");
    assert.equal(rows[1].trimmed, false);
    assert.equal(rows[0].parentName, null);
    assert.equal(rows[1].parentName, "page");
  });
  it("hides shy layers on request", () => {
    setLayerSwitch(["b"], "shy", true);
    const expanded = new Set(["page"]);
    assert.ok(buildTimelineRows(getDocument(), COMP, expanded).some((r) => r.id === "b"));
    assert.ok(!buildTimelineRows(getDocument(), COMP, expanded, { hideShy: true }).some((r) => r.id === "b"));
  });
  it("summarises what each layer animates for the motion badge", () => {
    const index = motionIndex(getDocument());
    assert.deepEqual(index.get("a"), { clips: 1, states: 0, engine: "web animations" });
    assert.equal(index.has("b"), false);
    assert.equal(motionLabel(index.get("a")!), "1 animation, plays on web animations");
    documentCommands.addState("b", "hover", {});
    assert.equal(motionLabel(motionIndex(getDocument()).get("b")!), "1 state");
  });
});

describe("Phase 61: timeline operations are document edits", () => {
  beforeEach(fresh);

  it("trimming creates a sparse bar, and trimming back removes it", () => {
    assert.equal(getDocument().compositions[COMP].layers.a, undefined);
    trimLayer("a", "in", 1);
    assert.deepEqual(getDocument().compositions[COMP].layers.a, { start: 0, in: 1, out: 5, stretch: 1 });
    trimLayer("a", "in", 0);
    assert.equal(getDocument().compositions[COMP].layers.a, undefined, "back to the default: no entry");
  });

  it("a trim really changes when the layer's animation runs (the kernel honours the bar)", () => {
    trimLayer("a", "in", 2);
    assert.deepEqual(layerBar(getDocument().compositions[COMP], "a"), { start: 0, in: 2, out: 5, stretch: 1 });
  });

  it("slides a bar and refuses nonsense", () => {
    setLayerBarTimes("a", { in: 1, out: 2 });
    slideLayer("a", 1);
    assert.deepEqual(getDocument().compositions[COMP].layers.a, { start: 1, in: 2, out: 3, stretch: 1 });
    assert.equal(setLayerBarTimes("a", { in: 4, out: 3 }), null, "out before in");
    assert.equal(setLayerBarTimes("a", { out: 9 }), null, "past the end");
    assert.deepEqual(getDocument().compositions[COMP].layers.a, { start: 1, in: 2, out: 3, stretch: 1 });
  });

  it("sets the work area, or just one edge of it", () => {
    assert.deepEqual(setWorkArea(1, 3), { start: 1, end: 3 });
    assert.deepEqual(getDocument().compositions[COMP].workArea, { start: 1, end: 3 });
    setWorkAreaEdge("start", 2);
    assert.deepEqual(getDocument().compositions[COMP].workArea, { start: 2, end: 3 });
    setWorkAreaEdge("end", 4);
    assert.deepEqual(getDocument().compositions[COMP].workArea, { start: 2, end: 4 });
    assert.equal(setWorkArea(2, 4), null, "unchanged");
  });

  it("adds, orders and deletes markers", () => {
    const late = addMarkerAt(3, "Late")!;
    const early = addMarkerAt(1, "Early")!;
    assert.deepEqual(getDocument().compositions[COMP].markers.map((m) => m.label), ["Early", "Late"]);
    assert.equal(removeMarkerById(late), true);
    assert.equal(removeMarkerById("nope"), false);
    assert.deepEqual(getDocument().compositions[COMP].markers.map((m) => m.id), [early]);
  });

  it("solo, shy and motion blur are saved on the layer and each is one undo step", () => {
    assert.equal(setLayerSwitch(["a", "b"], "solo", true), 2);
    assert.equal(getDocument().layers.a.solo, true);
    assert.equal(setLayerSwitch(["a"], "solo", true), 0, "already on");
    setLayerSwitch(["a"], "motionBlur", true);
    assert.equal(getDocument().layers.a.motionBlur, true);
    historyCommands.undo();
    assert.equal(getDocument().layers.a.motionBlur, undefined);
    historyCommands.undo();
    assert.equal(getDocument().layers.a.solo, undefined);
    assert.equal(getDocument().layers.b.solo, undefined, "both layers in one step");
  });

  it("every operation undoes in one step", () => {
    const before = JSON.stringify(getDocument().compositions[COMP]);
    trimLayer("a", "out", 3);
    setWorkArea(1, 2);
    addMarkerAt(1.5);
    historyCommands.undo();
    historyCommands.undo();
    historyCommands.undo();
    assert.equal(JSON.stringify(getDocument().compositions[COMP]), before);
  });

  it("the parent choices follow the rules for moving layers", () => {
    const names = parentChoices("a").map((c) => c.id);
    assert.ok(names.includes("page") && names.includes("b"));
    assert.ok(!names.includes("a"), "never itself");
    assert.ok(!parentChoices("page").some((c) => c.id === "a"), "never something inside it");
  });
});

describe("Phase 61: solo", () => {
  beforeEach(fresh);
  it("draws everything when nothing is soloed", () => {
    const plan = selectRenderable(getDocument().layers, ["page"]);
    assert.deepEqual([...plan.keys()].sort(), ["a", "b", "c", "page"]);
  });
  it("with a layer soloed draws only it and what contains it", () => {
    setLayerSwitch(["b"], "solo", true);
    const plan = selectRenderable(getDocument().layers, ["page"]);
    assert.deepEqual([...plan.keys()].sort(), ["b", "page"]);
    assert.deepEqual(plan.get("page"), ["b"]);
  });
  it("draws a soloed container's children too, and several soloed layers together", () => {
    setDocument(createDocumentFromLayers([box("page", null, ["group", "c"]), box("group", "page", ["x"]), box("x", "group"), box("c", "page")]));
    setLayerSwitch(["group"], "solo", true);
    assert.deepEqual([...selectRenderable(getDocument().layers, ["page"]).keys()].sort(), ["group", "page", "x"]);
    setLayerSwitch(["c"], "solo", true);
    assert.deepEqual([...selectRenderable(getDocument().layers, ["page"]).keys()].sort(), ["c", "group", "page", "x"]);
  });
  it("a hidden soloed layer stays hidden", () => {
    setLayerSwitch(["b"], "solo", true);
    documentCommands.setLayerFlags("b", { visible: false });
    assert.equal(selectRenderable(getDocument().layers, ["page"]).has("b"), false);
  });
});

describe("Phase 62: twirl-downs and stopwatches", () => {
  beforeEach(fresh);
  const closed = { open: new Set<string>(), reveal: {} as Record<string, "animated" | "modified"> };
  const items = (view: { open: Set<string>; reveal: Record<string, "animated" | "modified"> } = closed) => buildTimelineItems(getDocument(), COMP, new Set(["page"]), view);
  const trackOf = (layerId: string, property: string) =>
    Object.values(getDocument().clips).flatMap((c) => (c.layerId === layerId ? c.tracks.map((t) => ({ clip: c, track: t })) : [])).find((x) => x.track.property === property);

  it("a layer is closed until its twirl is opened, then shows its six groups", () => {
    assert.ok(items().every((i) => i.kind === "layer"));
    const opened = items({ ...closed, open: new Set(["b"]) });
    const groups = opened.filter((i) => i.kind === "group").map((i) => (i as { group: string }).group);
    assert.deepEqual(groups, ["transform", "appearance", "effects", "states", "behaviours", "links"]);
  });

  it("a group is closed until opened, then lists its properties with their stopwatches off", () => {
    const view = { ...closed, open: new Set(["b", "b|transform"]) };
    const props = items(view).filter((i) => i.kind === "property");
    assert.ok(props.length >= 5);
    assert.ok(props.every((p) => p.kind === "property" && p.path.startsWith("transform.") && !p.animated));
    assert.deepEqual(props.slice(0, 2).map((p) => (p as { label: string }).label), ["Position X", "Position Y"], "plain words");
  });

  it("turning a stopwatch on starts keyframing: one keyframe at the playhead holding the current value", () => {
    const result = setStopwatch("b", "transform.x", true, 1);
    assert.equal(result.changed, true);
    const found = trackOf("b", "transform.x")!;
    assert.equal(found.clip.name, KEYFRAMES_CLIP);
    assert.equal(found.track.keyframes.length, 1);
    assert.equal(found.track.keyframes[0].time, 1);
    assert.equal(found.track.keyframes[0].value, 0, "the property's current value");
    assert.equal(found.clip.duration, 5, "the clip covers the composition");
    const row = items({ ...closed, open: new Set(["b", "b|transform"]) }).find((i) => i.kind === "property" && i.path === "transform.x");
    assert.ok(row && row.kind === "property" && row.animated && row.keys.length === 1 && Math.abs(row.keys[0].time - 1) < 1e-9);
  });

  it("starts from the value the layer shows at that moment, animation included", () => {
    setStopwatch("a", "transform.y", true, 0);
    const first = trackOf("a", "transform.y")!;
    assert.equal(first.clip.name, "Fade", "an existing clip of the layer holds the new track");
    documentCommands.setKeyframe(first.clip.id, first.track.id, { id: "k_late", time: 2, value: 50 });
    setStopwatch("a", "transform.x", true, 1);
    assert.ok(trackOf("a", "transform.x"));
  });

  it("is a no-op when already on, and refuses a property the layer can't animate", () => {
    setStopwatch("b", "transform.x", true, 0);
    assert.equal(setStopwatch("b", "transform.x", true, 0).changed, false);
    assert.equal(setStopwatch("b", "content.text", true, 0).changed, false);
    assert.equal(setStopwatch("b", "transform.y", false, 0).changed, false, "off when off");
  });

  it("turning it off removes the keyframes and the empty Keyframes clip", () => {
    setStopwatch("b", "transform.x", true, 1);
    setStopwatch("b", "appearance.opacity", true, 2);
    setStopwatch("b", "transform.x", false);
    assert.equal(trackOf("b", "transform.x"), undefined);
    assert.ok(trackOf("b", "appearance.opacity"), "the other stopwatch is untouched");
    setStopwatch("b", "appearance.opacity", false);
    assert.equal(Object.values(getDocument().clips).filter((c) => c.layerId === "b").length, 0, "the empty Keyframes clip went with it");
  });

  it("on and off round-trip through undo, redo and a save", () => {
    const before = JSON.stringify(getDocument().clips);
    setStopwatch("b", "transform.x", true, 1.5);
    const withTrack = JSON.stringify(getDocument().clips);
    assert.notEqual(withTrack, before);
    historyCommands.undo();
    assert.equal(JSON.stringify(getDocument().clips), before, "one undo step turns it off");
    historyCommands.redo();
    assert.equal(JSON.stringify(getDocument().clips), withTrack);
    // A save and reload goes through the same validator the document is stored with.
    const reloaded = loadDocument({ document: JSON.parse(JSON.stringify(getDocument())) });
    assert.ok(Object.values(reloaded.clips).some((c) => c.layerId === "b" && c.tracks.some((t) => t.property === "transform.x" && t.keyframes[0].time === 1.5)));
    setStopwatch("b", "transform.x", false);
    historyCommands.undo();
    assert.equal(JSON.stringify(getDocument().clips), withTrack, "turning it off undoes in one step too");
  });

  it("keyframes sit on the ruler through the layer's bar", () => {
    setStopwatch("b", "transform.x", true, 1);
    setLayerBarTimes("b", { start: 2, in: 2, out: 5 });
    const row = items({ ...closed, open: new Set(["b", "b|transform"]) }).find((i) => i.kind === "property" && i.path === "transform.x");
    assert.ok(row && row.kind === "property");
    assert.ok(Math.abs(row.keys[0].time - 3) < 1e-9, "the layer's own time 0 moved to 2 s, so its 1 s keyframe is at 3 s");
  });

  it("a stopwatch later than the clip's end lengthens the clip rather than failing", () => {
    setStopwatch("a", "transform.y", true, 0);
    const clip = trackOf("a", "transform.y")!.clip;
    documentCommands.updateClip(clip.id, { duration: 1 });
    setStopwatch("a", "appearance.radius", true, 4);
    assert.equal(getDocument().clips[clip.id].duration, 4);
  });

  it("U reveals only the animated properties of the layer; a second press quickly reveals the modified ones", () => {
    setStopwatch("b", "transform.x", true, 0);
    documentCommands.updateProps("b", { "appearance.radius": 12 });
    const revealed = (mode: "animated" | "modified") => items({ ...closed, reveal: { b: mode } }).filter((i) => i.kind === "property").map((i) => (i as { path: string }).path);
    assert.deepEqual(revealed("animated"), ["transform.x"]);
    assert.deepEqual(revealed("modified").sort(), ["appearance.radius", "transform.x"]);
    const groups = items({ ...closed, reveal: { b: "animated" } }).filter((i) => i.kind === "group").map((i) => (i as { group: string }).group);
    assert.deepEqual(groups, ["transform"], "empty groups are left out");
  });

  it("the U key toggles, and a quick second press asks for the modified ones", () => {
    const ids = ["u-test-1", "u-test-2"];
    const store = useTimelineUiStore.getState();
    assert.equal(store.pressReveal(ids), "animated");
    assert.equal(store.pressReveal(ids), "modified", "a second press within 450 ms");
    store.setReveal(ids, null);
    assert.deepEqual(useTimelineUiStore.getState().reveal["u-test-1"], undefined);
  });

  it("lists what a layer has under Effects, States, Behaviours and Links", () => {
    documentCommands.addState("b", "hover", { "appearance.opacity": 0.5 });
    const view = { ...closed, open: new Set(["b", "b|states"]) };
    const info = items(view).filter((i) => i.kind === "info");
    assert.deepEqual(info.map((i) => (i as { label: string }).label), ["hover"]);
  });
});
