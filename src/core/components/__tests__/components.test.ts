import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { documentCommands, getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { useSelectionStore } from "../../store/useSelectionStore";
import { createComponent, deleteComponent, detachInstances, goToMain, insertInstance, instanceCount, renameComponent, resetOverrides, swapInstance } from "../componentOps";
import { instanceRootOf, subtreeIds } from "../instances";
import { deleteLayers } from "../../editing/editOps";

const box = (id: string, parentId: string, extra: Record<string, unknown> = {}, children: string[] = []): Layer =>
  createLayer({ id, archetype: "container", parentId, name: id, children, properties: { positioning: "absolute", "frame.x": 0, "frame.y": 0, "frame.width": 200, "frame.height": 60, "layout.padding": 0, "appearance.background.color": "#336699", ...extra } }) as Layer;

const doc = () =>
  createDocumentFromLayers([
    createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: ["btn", "other"], properties: { "frame.width": 1000, "frame.height": 800 } }) as Layer,
    box("btn", "pg", { "frame.x": 20, "frame.y": 20 }, ["label", "icon"]),
    box("label", "btn", { "frame.x": 40, "appearance.background.color": "#ffffff" }),
    box("icon", "btn", { "frame.x": 8, "frame.width": 24 }),
    box("other", "pg", { "frame.x": 500 }),
  ]);

const props = (id: string) => getDocument().layers[id].properties as Record<string, unknown>;
const L = (id: string) => getDocument().layers[id];
const instanceRoots = (cid: string) => Object.values(getDocument().layers).filter((l) => l.instance?.component === cid && l.instance.root).map((l) => l.id);
/** The instance layer that mirrors a main layer, inside an instance root. */
const mirror = (root: string, source: string) => subtreeIds(getDocument().layers, root).map((id) => L(id)).find((l) => l.instance?.source === source)!;

describe("Phase 46: creating components and instances", () => {
  beforeEach(() => {
    setDocument(doc());
    useSelectionStore.getState().clearSelection();
  });

  it("a container becomes the main component, named after it", () => {
    const c = createComponent(["btn"])!;
    assert.deepEqual(getDocument().designComponents![c], { id: c, name: "btn", mainId: "btn" });
    assert.equal(L("btn").componentMain, c);
  });

  it("several layers are wrapped in a frame first; one undo step", () => {
    const before = JSON.stringify(getDocument().layers);
    const c = createComponent(["label", "icon"])!;
    const main = getDocument().designComponents![c].mainId;
    assert.deepEqual(L(main).children, ["label", "icon"]);
    historyCommands.undo();
    assert.equal(JSON.stringify(getDocument().layers), before);
    assert.equal(getDocument().designComponents, undefined);
  });

  it("refuses what already holds a component or an instance (no nesting)", () => {
    const c = createComponent(["btn"])!;
    const i = insertInstance(c, { parentId: "pg" })!;
    assert.equal(createComponent(["btn"]), null);
    assert.equal(createComponent([i]), null);
    documentCommands.mutate("nest", (d) => {
      d.layers.other.children.push("inner");
      d.layers.inner = box("inner", "other", {}, []);
    });
    assert.equal(createComponent(["pg"]), null); // the page contains the main and an instance
  });

  it("an instance mirrors the main's layers, remembers what each came from, and is placed where asked", () => {
    const c = createComponent(["btn"])!;
    const i = insertInstance(c, { parentId: "pg", at: { x: 300, y: 400 } })!;
    assert.deepEqual([props(i)["frame.x"], props(i)["frame.y"], props(i).positioning], [300, 400, "absolute"]);
    assert.equal(L(i).instance!.root, true);
    assert.equal(L(i).children.length, 2);
    assert.equal(mirror(i, "label").properties["frame.x"], 40);
    assert.equal(mirror(i, "label").instance!.component, c);
    assert.deepEqual(L("pg").children.includes(i), true);
    assert.equal(instanceCount(c), 1);
  });

  it("an instance can't go into the main itself, and is one undo step", () => {
    const c = createComponent(["btn"])!;
    const before = JSON.stringify(getDocument().layers);
    const i = insertInstance(c, { parentId: "btn" })!; // lands in the page instead
    assert.equal(L(i).parentId, "pg");
    historyCommands.undo();
    assert.equal(JSON.stringify(getDocument().layers), before);
    assert.equal(instanceRoots(c).length, 0);
  });
});

describe("Phase 46: editing the main", () => {
  let c: string;
  let a: string;
  let b: string;
  beforeEach(() => {
    setDocument(doc());
    useSelectionStore.getState().clearSelection();
    c = createComponent(["btn"])!;
    a = insertInstance(c, { parentId: "pg", at: { x: 100, y: 100 } })!;
    b = insertInstance(c, { parentId: "pg", at: { x: 100, y: 300 } })!;
  });

  it("a change to the main reaches every instance, except the properties an instance changed itself", () => {
    documentCommands.updateProps(mirror(a, "label").id, { "appearance.background.color": "#ff0000" }); // an override
    documentCommands.updateProps("label", { "appearance.background.color": "#00ff00", "frame.x": 55 });
    assert.equal(mirror(a, "label").properties["appearance.background.color"], "#ff0000"); // kept
    assert.equal(mirror(a, "label").properties["frame.x"], 55); // not overridden: follows
    assert.equal(mirror(b, "label").properties["appearance.background.color"], "#00ff00");
    assert.deepEqual(mirror(a, "label").instance!.overridden, ["appearance.background.color"]);
    // the root keeps its own place
    assert.deepEqual([props(a)["frame.x"], props(a)["frame.y"]], [100, 100]);
  });

  it("the main's root properties reach the instance roots (fill, size) but not their placement", () => {
    documentCommands.updateProps("btn", { "appearance.background.color": "#111111", "frame.width": 260, "frame.x": 999 });
    assert.equal(props(a)["appearance.background.color"], "#111111");
    assert.equal(props(a)["frame.width"], 260);
    assert.equal(props(a)["frame.x"], 100);
  });

  it("an instance resized on its own keeps its size when the main is resized", () => {
    documentCommands.updateProps(a, { "frame.width": 333 });
    documentCommands.updateProps("btn", { "frame.width": 400 });
    assert.equal(props(a)["frame.width"], 333);
    assert.equal(props(b)["frame.width"], 400);
  });

  it("a layer added to the main appears in every instance; a deleted one goes; the order follows; an instance's own layers stay", () => {
    const own = "own1";
    documentCommands.mutate("add own", (d) => {
      d.layers[own] = box(own, a, {}, []);
      d.layers[a].children.push(own);
    });
    documentCommands.mutate("add to main", (d) => {
      d.layers.badge = box("badge", "btn", { "frame.x": 3 }, []);
      d.layers.btn.children.splice(1, 0, "badge"); // between label and icon
    });
    for (const r of [a, b]) {
      assert.deepEqual(L(r).children.map((id) => L(id).instance?.source ?? "own"), ["label", "badge", "icon", ...(r === a ? ["own"] : [])]);
    }
    documentCommands.removeLayer("label");
    for (const r of [a, b]) assert.deepEqual(L(r).children.map((id) => L(id).instance?.source ?? "own").filter((s) => s !== "own"), ["badge", "icon"]);
    assert.ok(L(own)); // never touched
  });

  it("hiding a layer in the main hides it everywhere; an instance that showed it itself keeps showing it", () => {
    documentCommands.setLayerFlags(mirror(a, "icon").id, { visible: true });
    documentCommands.setLayerFlags("icon", { visible: false });
    assert.equal(mirror(b, "icon").visible, false);
    assert.equal(mirror(a, "icon").visible, true);
  });

  it("deleting a layer inside an instance hides it instead", () => {
    const id = mirror(a, "icon").id;
    deleteLayers([id]);
    assert.ok(L(id));
    assert.equal(L(id).visible, false);
    assert.ok(L(id).instance!.overridden!.includes("visible"));
    documentCommands.updateProps("icon", { "frame.width": 30 }); // a later sync doesn't bring it back or lose the hiding
    assert.equal(L(id).visible, false);
  });

  it("an edit of the main and the instances it updates are one undo step", () => {
    const before = JSON.stringify(getDocument().layers);
    documentCommands.updateProps("label", { "frame.x": 77 });
    assert.equal(mirror(b, "label").properties["frame.x"], 77);
    historyCommands.undo();
    assert.equal(JSON.stringify(getDocument().layers), before);
  });
});

describe("Phase 46: reset, detach, swap, go to main, rename, delete", () => {
  let c: string;
  let a: string;
  beforeEach(() => {
    setDocument(doc());
    useSelectionStore.getState().clearSelection();
    c = createComponent(["btn"])!;
    a = insertInstance(c, { parentId: "pg" })!;
  });

  it("reset puts overrides back to the main's value: one property, a layer, or the whole instance", () => {
    const label = mirror(a, "label").id;
    documentCommands.updateProps(label, { "appearance.background.color": "#ff0000", "frame.x": 90 });
    documentCommands.updateProps(a, { "appearance.background.color": "#00ff00" });
    assert.equal(resetOverrides([label], ["frame.x"]), 1);
    assert.equal(L(label).properties["frame.x"], 40);
    assert.equal(L(label).properties["appearance.background.color"], "#ff0000");
    assert.equal(resetOverrides([a]), 2); // the root selected: everything in the instance
    assert.equal(L(label).properties["appearance.background.color"], "#ffffff");
    assert.equal(props(a)["appearance.background.color"], "#336699");
    assert.equal(resetOverrides([a]), 0);
  });

  it("detach makes plain layers that keep their look and stop following", () => {
    detachInstances([mirror(a, "label").id]); // any layer of it works
    assert.equal(L(a).instance, undefined);
    documentCommands.updateProps("label", { "frame.x": 5 });
    assert.equal(subtreeIds(getDocument().layers, a).every((id) => !L(id).instance), true);
    assert.equal(L(L(a).children[0]).properties["frame.x"], 40);
  });

  it("swap puts an instance of another component in the same place, position and size kept", () => {
    const c2 = createComponent(["other"])!;
    documentCommands.updateProps(a, { "frame.x": 222, "frame.y": 333 });
    const index = L("pg").children.indexOf(a);
    const s = swapInstance(a, c2)!;
    assert.equal(L(a), undefined);
    assert.equal(L("pg").children.indexOf(s), index);
    assert.deepEqual([props(s)["frame.x"], props(s)["frame.y"]], [222, 333]);
    assert.equal(L(s).instance!.component, c2);
    assert.equal(swapInstance(s, c2), null); // already that component
  });

  it("go to main selects it from an instance or from the main itself", () => {
    assert.equal(goToMain(mirror(a, "icon").id), "btn");
    assert.deepEqual(useSelectionStore.getState().selectedIds, ["btn"]);
    assert.equal(goToMain("btn"), "btn");
    assert.equal(goToMain("pg"), null);
  });

  it("rename changes the component and its main layer", () => {
    assert.equal(renameComponent(c, "Primary button"), true);
    assert.equal(getDocument().designComponents![c].name, "Primary button");
    assert.equal(L("btn").name, "Primary button");
  });

  it("deleting the component, or the main layer, turns its instances into plain layers", () => {
    assert.equal(deleteComponent(c), true);
    assert.equal(getDocument().designComponents, undefined);
    assert.equal(L("btn").componentMain, undefined);
    assert.equal(L(a).instance, undefined);
    // the same through deleting the main layer
    setDocument(doc());
    const c2 = createComponent(["btn"])!;
    const i2 = insertInstance(c2, { parentId: "pg" })!;
    deleteLayers(["btn"]);
    assert.equal(getDocument().designComponents, undefined);
    assert.equal(L(i2).instance, undefined);
    assert.ok(L(i2));
  });

  it("instanceRootOf finds the root from any layer of an instance", () => {
    assert.equal(instanceRootOf(getDocument().layers, mirror(a, "icon").id), a);
    assert.equal(instanceRootOf(getDocument().layers, "other"), null);
  });
});

describe("Phase 46: forty instances keep every override when the main is edited", () => {
  it("each of 40 instances keeps its own colour, size and hidden layer through edits of every kind to the main", () => {
    setDocument(doc());
    const c = createComponent(["btn"])!;
    const roots: string[] = [];
    for (let i = 0; i < 40; i++) roots.push(insertInstance(c, { parentId: "pg", at: { x: i * 10, y: i * 5 } })!);
    roots.forEach((r, i) => {
      documentCommands.updateProps(mirror(r, "label").id, { "appearance.background.color": `#${String(100000 + i).slice(0, 6)}` });
      documentCommands.updateProps(r, { "frame.width": 200 + i });
      if (i % 4 === 0) documentCommands.setLayerFlags(mirror(r, "icon").id, { visible: false });
    });
    // edit the main: restyle, resize, add and reorder a child, change another property of a layer everyone overrides
    documentCommands.updateProps("btn", { "appearance.radius": 12, "frame.height": 64 });
    documentCommands.updateProps("label", { "appearance.radius": 6, "frame.x": 44 });
    documentCommands.mutate("add", (d) => {
      d.layers.chip = box("chip", "btn", { "frame.x": 150 }, []);
      d.layers.btn.children.unshift("chip");
    });
    roots.forEach((r, i) => {
      assert.equal(mirror(r, "label").properties["appearance.background.color"], `#${String(100000 + i).slice(0, 6)}`, `colour of ${i}`);
      assert.equal(props(r)["frame.width"], 200 + i, `width of ${i}`);
      assert.equal(mirror(r, "icon").visible, i % 4 === 0 ? false : undefined, `hidden icon of ${i}`);
      assert.equal(props(r)["appearance.radius"], 12);
      assert.equal(props(r)["frame.height"], 64);
      assert.equal(mirror(r, "label").properties["appearance.radius"], 6);
      assert.equal(mirror(r, "label").properties["frame.x"], 44);
      assert.deepEqual(L(r).children.map((id) => L(id).instance!.source), ["chip", "label", "icon"]);
      assert.deepEqual([props(r)["frame.x"], props(r)["frame.y"]], [i * 10, i * 5]);
    });
    assert.equal(instanceCount(c), 40);
  });
});
