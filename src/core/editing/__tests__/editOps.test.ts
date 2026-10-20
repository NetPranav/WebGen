import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { documentCommands, getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { useSelectionStore } from "../../store/useSelectionStore";
import { useCanvasViewStore } from "../../store/useCanvasViewStore";
import { showAll, unlockAll, copyText, deleteLayers, duplicateLayers, groupLayers, nudgeLayers, pasteText, renameLayer, reorder, reorderLayers, resetDuplicateMemory, toggleHidden, toggleLock, ungroupLayers } from "../editOps";
import { parseClip, serializeClip, CLIP_MARK } from "../clipboard";

const rect = (id: string, parentId: string, x: number, y: number, w: number, h: number, extra: Partial<Layer> = {}): Layer => ({
  ...(createLayer({ id, archetype: "rectangle", parentId, name: id, properties: { positioning: "absolute", "frame.x": x, "frame.y": y, "frame.width": w, "frame.height": h } }) as Layer),
  ...extra,
});

const doc = () =>
  createDocumentFromLayers([
    createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: ["a", "b", "c", "box"], properties: { "frame.x": 0, "frame.y": 0, "frame.width": 800, "frame.height": 600 } }) as Layer,
    rect("a", "pg", 10, 10, 100, 50),
    rect("b", "pg", 200, 20, 80, 80),
    rect("c", "pg", 400, 30, 60, 60),
    createLayer({ id: "box", archetype: "container", parentId: "pg", name: "Box", children: ["d"], properties: { positioning: "absolute", "frame.x": 300, "frame.y": 300, "frame.width": 200, "frame.height": 200 } }) as Layer,
    rect("d", "box", 20, 20, 50, 50),
    createLayer({ id: "pg2", archetype: "container", parentId: null, name: "Page 2", children: [], properties: { "frame.x": 1000, "frame.y": 0, "frame.width": 800, "frame.height": 600 } }) as Layer,
  ]);

const props = (id: string) => getDocument().layers[id].properties as Record<string, unknown>;
const selected = () => useSelectionStore.getState().selectedIds;
/** The layers as text with keys sorted: an undo restores the same content, not necessarily the same key order. */
const snapshot = () =>
  JSON.stringify(getDocument().layers, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  );

describe("Phase 29: copy, cut and paste", () => {
  beforeEach(() => {
    setDocument(doc());
    resetDuplicateMemory();
    useSelectionStore.getState().clearSelection();
    useCanvasViewStore.setState({ activeFrameId: null });
  });

  it("a copy pastes as new layers with new ids, beside the original, one undo step", () => {
    const text = copyText(["a"])!;
    assert.ok(text.startsWith(CLIP_MARK));
    const before = snapshot();
    const [id] = pasteText(text);
    assert.notEqual(id, "a");
    assert.equal(getDocument().layers[id].parentId, "pg");
    assert.deepEqual([props(id)["frame.x"], props(id)["frame.y"]], [26, 26], "nudged 16 so it doesn't hide the original");
    assert.deepEqual(selected(), [id]);
    assert.deepEqual([props("a")["frame.x"], props("a")["frame.y"]], [10, 10], "the original is untouched");
    historyCommands.undo();
    assert.equal(snapshot(), before);
  });

  it("paste in place keeps the exact position", () => {
    const [id] = pasteText(copyText(["b"]), { inPlace: true });
    assert.deepEqual([props(id)["frame.x"], props(id)["frame.y"]], [200, 20]);
  });

  it("paste into a container puts the layers inside it", () => {
    const [id] = pasteText(copyText(["a"]), { into: "box" });
    assert.equal(getDocument().layers[id].parentId, "box");
    assert.ok(getDocument().layers.box.children.includes(id));
  });

  it("copying a group brings its children and animations, all re-id'd", () => {
    documentCommands.addClip("d", { id: "", name: "fade", type: "entrance", trigger: "mount", duration: 1, easing: "linear", enabled: true, tracks: [] }, "Add clip");
    const [group] = pasteText(copyText(["box"]), { inPlace: true });
    const l = getDocument().layers;
    assert.equal(l[group].children.length, 1);
    const child = l[group].children[0];
    assert.notEqual(child, "d");
    assert.equal(l[child].parentId, group);
    const clips = Object.values(getDocument().clips).filter((c) => c.layerId === child);
    assert.equal(clips.length, 1, "the animation came along");
    assert.ok(Object.values(getDocument().clips).filter((c) => c.layerId === "d").length === 1, "the original's animation is its own");
  });

  it("a copy pastes into another project: where it came from doesn't exist, so it goes into the first frame at the same place", () => {
    const text = copyText(["a", "b"])!;
    setDocument(createDocumentFromLayers([createLayer({ id: "other", archetype: "container", parentId: null, name: "Other", children: [], properties: { "frame.x": 0, "frame.y": 0, "frame.width": 500, "frame.height": 500 } }) as Layer]));
    const ids = pasteText(text);
    assert.equal(ids.length, 2);
    for (const id of ids) assert.equal(getDocument().layers[id].parentId, "other");
    assert.deepEqual([props(ids[0])["frame.x"], props(ids[1])["frame.x"]], [10, 200], "same coordinates");
  });

  it("copying a frame pastes a new frame to the right of the others", () => {
    const [id] = pasteText(copyText(["pg2"]));
    const l = getDocument().layers;
    assert.equal(l[id].parentId, null);
    assert.ok((l[id].properties["frame.x"] as number) >= 1800 + 100);
  });

  it("text that isn't ours, or is malformed, pastes nothing and changes nothing", () => {
    const before = snapshot();
    for (const bad of ["hello", "", null, undefined, `${CLIP_MARK}\nnot json`, `${CLIP_MARK}\n{"v":1}`, `${CLIP_MARK}\n{"v":1,"layers":[],"clips":[],"roots":["x"],"source":{"parentId":null,"at":1}}`]) {
      assert.deepEqual(pasteText(bad as string), []);
    }
    assert.equal(snapshot(), before);
    assert.equal(parseClip(serializeClip({ v: 1, layers: [getDocument().layers.a], clips: [], roots: ["zzz"], source: { parentId: "pg", at: 1 } })), null, "a root that isn't in the payload");
  });

  it("an empty selection copies nothing", () => {
    assert.equal(copyText([]), null);
  });
});

describe("Phase 29: duplicate and delete", () => {
  beforeEach(() => {
    setDocument(doc());
    resetDuplicateMemory();
    useSelectionStore.getState().clearSelection();
  });

  it("duplicate puts the copy right after the original, offset by 16, selected", () => {
    const [copy] = duplicateLayers(["b"]);
    const order = getDocument().layers.pg.children;
    assert.equal(order.indexOf(copy), order.indexOf("b") + 1);
    assert.deepEqual([props(copy)["frame.x"], props(copy)["frame.y"]], [216, 36]);
    assert.deepEqual(selected(), [copy]);
  });

  it("duplicate remembers the offset: move the copy, duplicate it again, and the next copy repeats the move", () => {
    const [first] = duplicateLayers(["a"]);
    documentCommands.updateProps(first, { "frame.x": 60, "frame.y": 110 }); // the person moved it: (+50, +100) from "a"
    const [second] = duplicateLayers([first]);
    assert.deepEqual([props(second)["frame.x"], props(second)["frame.y"]], [110, 210]);
  });

  it("duplicating a frame makes a new frame beside the others", () => {
    const [copy] = duplicateLayers(["pg"]);
    assert.equal(getDocument().layers[copy].parentId, null);
    assert.ok(getDocument().layers[copy].children.length === 4);
  });

  it("one undo undoes a duplicate of several layers", () => {
    const before = snapshot();
    duplicateLayers(["a", "b", "c"]);
    assert.equal(getDocument().layers.pg.children.length, 7);
    historyCommands.undo();
    assert.equal(snapshot(), before);
  });

  it("delete removes the layers and what is in them, clears the selection, and is one undo step", () => {
    const before = snapshot();
    useSelectionStore.getState().selectMultiple(["a", "box", "d"], "element");
    assert.equal(deleteLayers(selected()), 2, "d is inside box: two top-level layers go");
    const l = getDocument().layers;
    assert.deepEqual([l.a, l.box, l.d], [undefined, undefined, undefined]);
    assert.deepEqual(selected(), []);
    historyCommands.undo();
    assert.equal(snapshot(), before);
  });

  it("delete never removes the last frame", () => {
    assert.equal(deleteLayers(["pg", "pg2"]), 1);
    assert.equal(Object.values(getDocument().layers).filter((l) => l.parentId === null).length, 1);
    assert.equal(deleteLayers(["pg2"]) + deleteLayers(["pg"]), 0);
  });
});

describe("Phase 29: nudge, z-order, group, lock, hide, rename", () => {
  beforeEach(() => {
    setDocument(doc());
    useSelectionStore.getState().clearSelection();
  });

  it("nudge moves by the step; a group of layers moves together", () => {
    nudgeLayers(["a", "b"], 1, 0);
    nudgeLayers(["a", "b"], 0, 10);
    assert.deepEqual([props("a")["frame.x"], props("a")["frame.y"], props("b")["frame.x"], props("b")["frame.y"]], [11, 20, 201, 30]);
  });

  it("reorder: forward / backward move one place past an unselected sibling, front / back to the ends, keeping relative order", () => {
    const sel = new Set(["a", "c"]);
    const kids = ["a", "b", "c", "d"];
    assert.deepEqual(reorder(kids, sel, "forward"), ["b", "a", "d", "c"]);
    assert.deepEqual(reorder(kids, sel, "backward"), ["a", "c", "b", "d"]);
    assert.deepEqual(reorder(["b", "a", "d", "c"], sel, "backward"), ["a", "b", "c", "d"]);
    assert.deepEqual(reorder(kids, sel, "front"), ["b", "d", "a", "c"]);
    assert.deepEqual(reorder(kids, sel, "back"), ["a", "c", "b", "d"]);
    assert.deepEqual(reorder(kids, new Set(["d"]), "forward"), kids, "already on top");
    assert.deepEqual(reorder(kids, new Set(["a"]), "backward"), kids, "already at the back");
  });

  it("reordering layers changes the document's order, once", () => {
    const before = snapshot();
    assert.equal(reorderLayers(["a"], "front"), true);
    assert.deepEqual(getDocument().layers.pg.children, ["b", "c", "box", "a"]);
    assert.equal(reorderLayers(["a"], "front"), false);
    assert.equal(reorderLayers(["pg"], "front"), false, "frames have no z-order");
    historyCommands.undo();
    assert.equal(snapshot(), before);
  });

  it("group wraps the selected siblings at their combined box, keeping every child where it was on the canvas", () => {
    const before = snapshot();
    const g = groupLayers(["a", "c"])!;
    const l = getDocument().layers;
    assert.equal(l[g].name, "Group");
    assert.equal(l[g].parentId, "pg");
    assert.deepEqual(l[g].children, ["a", "c"]);
    // union of a (10,10,100x50) and c (400,30,60x60) is x 10..460, y 10..90
    assert.deepEqual([props(g)["frame.x"], props(g)["frame.y"], props(g)["frame.width"], props(g)["frame.height"]], [10, 10, 450, 80]);
    assert.deepEqual([props("a")["frame.x"], props("a")["frame.y"]], [0, 0]);
    assert.deepEqual([props("c")["frame.x"], props("c")["frame.y"]], [390, 20]);
    assert.deepEqual(selected(), [g]);
    assert.equal(l.pg.children.indexOf(g), 0, "the group sits where its first member was");
    historyCommands.undo();
    assert.equal(snapshot(), before, "one undo step");
  });

  it("frame selection makes a white frame instead of an invisible group", () => {
    const g = groupLayers(["b"], "frame")!;
    assert.equal(getDocument().layers[g].name, "Frame");
    assert.equal(props(g)["appearance.background.color"], "#ffffff");
  });

  it("ungroup puts the children back in the group's place at their canvas positions, and removes the group", () => {
    const g = groupLayers(["a", "c"])!;
    const freed = ungroupLayers([g]);
    const l = getDocument().layers;
    assert.deepEqual(freed, ["a", "c"]);
    assert.equal(l[g], undefined);
    assert.equal(l.a.parentId, "pg");
    assert.deepEqual([props("a")["frame.x"], props("a")["frame.y"], props("c")["frame.x"], props("c")["frame.y"]], [10, 10, 400, 30]);
    assert.deepEqual(selected(), ["a", "c"]);
  });

  it("ungroup of a plain frame or a layer with no children does nothing", () => {
    assert.deepEqual(ungroupLayers(["pg"]), []);
    assert.deepEqual(ungroupLayers(["a"]), []);
  });

  it("lock and hide toggle, and a hidden layer leaves the selection", () => {
    assert.equal(toggleLock(["a", "b"]), true);
    assert.equal(getDocument().layers.a.locked, true);
    assert.equal(toggleLock(["a", "b"]), false);
    assert.equal(getDocument().layers.a.locked, false);
    toggleLock(["a"]);
    assert.equal(toggleLock(["a", "b"]), true, "a mix locks them all");
    useSelectionStore.getState().select("c", "element");
    assert.equal(toggleHidden(["c"]), true);
    assert.equal(getDocument().layers.c.visible, false);
    assert.deepEqual(selected(), []);
    assert.equal(toggleHidden(["c"]), false);
    assert.equal(getDocument().layers.c.visible, true);
  });

  it("unlock all and show all bring back what can't be clicked", () => {
    toggleLock(["a", "b"]);
    toggleHidden(["c"]);
    assert.equal(unlockAll(), 2);
    assert.equal(showAll(), 1);
    assert.equal(unlockAll() + showAll(), 0);
    assert.deepEqual([getDocument().layers.a.locked, getDocument().layers.c.visible], [false, true]);
  });

  it("rename trims, and refuses an empty name or an unknown layer", () => {
    renameLayer("a", "  Hero  ");
    assert.equal(getDocument().layers.a.name, "Hero");
    assert.throws(() => renameLayer("a", "   "), /needs a name/);
    assert.throws(() => renameLayer("zzz", "x"), /No layer/);
  });
});
