import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Layer } from "../../document/schema";
import { createLayer } from "../../document/factories";
import { createDocumentFromLayers } from "../../document/factories";
import { documentStore, getDocument } from "../../store/documentState";
import { documentCommands } from "../../store/useDocumentStore";
import { createPlanStore } from "../planStore";
import { LayerNodeRegistry } from "../LayerNodeRegistry";
import { StageRenderer } from "../StageRenderer";
import { RenderTree } from "../RenderLayer";

/** A root container with `n` text children, as a layers map. */
function bigDocument(n: number): Record<string, Layer> {
  const layers: Record<string, Layer> = {};
  const childIds: string[] = [];
  for (let i = 0; i < n; i++) {
    const id = `t${i}`;
    childIds.push(id);
    layers[id] = createLayer({ id, archetype: "text", parentId: "root", properties: { "content.text": `Layer ${i}` } }) as Layer;
  }
  layers.root = createLayer({ id: "root", archetype: "container", parentId: null, children: childIds }) as Layer;
  return layers;
}

describe("Phase 19: the render plan store", () => {
  it("hands out the same child array while a layer's children are unchanged, and notifies only on structural change", () => {
    const layers = bigDocument(5);
    const plan = createPlanStore();
    let notified = 0;
    plan.subscribe(() => notified++);

    assert.equal(plan.refresh(layers, ["root"]), true);
    const rootChildren = plan.get("root");
    assert.deepEqual(rootChildren, ["t0", "t1", "t2", "t3", "t4"]);
    assert.equal(notified, 1);

    // A property edit changes a layer object but not the structure: nothing to do, nobody notified.
    const edited = { ...layers, t2: { ...layers.t2, properties: { ...layers.t2.properties, "content.text": "changed" } } };
    assert.equal(plan.refresh(edited, ["root"]), false);
    assert.equal(notified, 1);
    assert.equal(plan.get("root"), rootChildren, "the same array");
  });

  it("a structural change re-plans, keeps the arrays of layers whose children didn't change, and notifies once", () => {
    const layers = bigDocument(3);
    layers.t1 = createLayer({ id: "t1", archetype: "container", parentId: "root", children: ["t1a"] }) as Layer;
    layers.t1a = createLayer({ id: "t1a", archetype: "text", parentId: "t1" }) as Layer;
    const plan = createPlanStore();
    plan.refresh(layers, ["root"]);
    const nested = plan.get("t1");
    let notified = 0;
    plan.subscribe(() => notified++);

    const added = { ...layers, t9: createLayer({ id: "t9", archetype: "text", parentId: "root" }) as Layer, root: { ...layers.root, children: [...layers.root.children, "t9"] } };
    assert.equal(plan.refresh(added, ["root"]), true);
    assert.equal(notified, 1);
    assert.deepEqual(plan.get("root"), ["t0", "t1", "t2", "t9"]);
    assert.equal(plan.get("t1"), nested, "an untouched subtree keeps its array, so its layers do not re-render");
  });

  it("hiding a layer, changing the roots and a cycle are all handled", () => {
    const layers = bigDocument(2);
    const plan = createPlanStore();
    plan.refresh(layers, ["root"]);
    assert.equal(plan.refresh({ ...layers, t0: { ...layers.t0, visible: false } }, ["root"]), true);
    assert.deepEqual(plan.get("root"), ["t1"]);
    assert.equal(plan.get("t0"), undefined, "a hidden layer is not drawn");
    assert.equal(plan.refresh(layers, ["t1"]), true);
    assert.deepEqual(plan.roots(), ["t1"]);
    const a = createLayer({ id: "a", archetype: "container", parentId: null, children: ["b"] }) as Layer;
    const b = createLayer({ id: "b", archetype: "container", parentId: "a", children: ["a"] }) as Layer;
    plan.refresh({ a, b }, ["a"]);
    assert.deepEqual([plan.get("a"), plan.get("b")], [["b"], []], "the edge that closes the cycle is cut");
  });
});

describe("Phase 19: per-entity selectors rest on structural sharing", () => {
  it("editing one layer's property leaves every other layer object identical", () => {
    const before = documentStore.getState().document;
    documentStore.setState({ document: createDocumentFromLayers(Object.values(bigDocument(500))) });
    const layersBefore = { ...getDocument().layers };
    documentCommands.updateProps("t250", { "content.text": "edited" }, "test edit");
    const layersAfter = getDocument().layers;
    let changed = 0;
    for (const id of Object.keys(layersBefore)) if (layersAfter[id] !== layersBefore[id]) changed++;
    assert.equal(changed, 1, "exactly one layer object changed");
    assert.notEqual(layersAfter.t250, layersBefore.t250);
    assert.equal(layersAfter.t251, layersBefore.t251);
    assert.equal(layersAfter.root, layersBefore.root, "even the parent keeps its object, since its children list is unchanged");
    documentStore.setState({ document: before });
  });
});

describe("Phase 19: the layer node registry", () => {
  const el = (name: string) => ({ name }) as unknown as Element;

  it("remembers the element for a layer, and lets a late cleanup not remove a newer one", () => {
    const registry = new LayerNodeRegistry();
    const first = el("first");
    const second = el("second");
    registry.register("a", first);
    assert.equal(registry.get("a"), first);
    registry.register("a", second); // the layer was drawn into a new element
    registry.unregister("a", first); // the old element's cleanup arrives late
    assert.equal(registry.get("a"), second);
    registry.unregister("a", second);
    assert.equal(registry.has("a"), false);
    assert.equal(registry.size, 0);
  });

  it("tells subscribers when a layer's element appears, changes or goes", () => {
    const registry = new LayerNodeRegistry();
    const seen: [string, string | null][] = [];
    const off = registry.subscribe((id, e) => seen.push([id, e ? (e as unknown as { name: string }).name : null]));
    registry.register("a", el("x"));
    registry.register("a", el("x")); // not even a new object: still new
    registry.unregister("a");
    off();
    registry.register("b", el("y"));
    assert.deepEqual(seen.map((s) => s[1]), ["x", "x", null]);
    assert.deepEqual(registry.ids(), ["b"]);
  });
});

describe("Phase 19: renderer.measure", () => {
  /** A fake element with a box, counting how often it is read. */
  function box(left: number, top: number, width: number, height: number) {
    const probe = {
      reads: 0,
      getBoundingClientRect() {
        probe.reads++;
        return { left, top, width, height };
      },
    };
    return probe as unknown as Element & { reads: number };
  }

  function setup() {
    const frameWindow = { scrollX: 0, scrollY: 0, addEventListener() {}, removeEventListener() {} };
    let frameCallbacks: (() => void)[] = [];
    const bumpers: (() => void)[] = [];
    const renderer = new StageRenderer({
      createResizeObserver: (cb) => (bumpers.push(cb), { observe() {}, disconnect() {} }),
      createMutationObserver: (cb) => (bumpers.push(cb), { observe() {}, disconnect() {} }),
      requestFrame: (cb) => void frameCallbacks.push(cb),
    });
    renderer.attach({ window: frameWindow as never, root: {} as Element });
    return { renderer, frameWindow, runFrame: () => { const cbs = frameCallbacks; frameCallbacks = []; cbs.forEach((c) => c()); }, moved: () => bumpers.forEach((b) => b()) };
  }

  it("returns document-space rectangles (the frame's scroll is added) and null for a layer that isn't drawn", () => {
    const { renderer, frameWindow } = setup();
    renderer.registry.register("a", box(10, 20, 100, 40));
    frameWindow.scrollX = 5;
    frameWindow.scrollY = 300;
    assert.deepEqual(renderer.measureNow(["a", "nope"]), [{ id: "a", x: 15, y: 320, width: 100, height: 40 }, null]);
  });

  it("serves repeat reads from the cache until something may have moved", () => {
    const { renderer, moved } = setup();
    const a = box(0, 0, 10, 10);
    renderer.registry.register("a", a);
    renderer.measureNow(["a"]);
    renderer.measureNow(["a"]);
    assert.equal(a.reads, 1, "second read came from the cache");
    moved(); // a ResizeObserver / MutationObserver callback
    renderer.measureNow(["a"]);
    assert.equal(a.reads, 2);
  });

  it("batches calls made in the same frame into one read pass, one read per layer", async () => {
    const { renderer, runFrame } = setup();
    const a = box(1, 2, 3, 4);
    const b = box(5, 6, 7, 8);
    renderer.registry.register("a", a);
    renderer.registry.register("b", b);
    const before = renderer.passes;
    const first = renderer.measure(["a", "b"]);
    const second = renderer.measure(["b", "a", "missing"]);
    const third = renderer.measure(["a"]);
    assert.equal(a.reads + b.reads, 0, "nothing is read until the frame");
    runFrame();
    const [r1, r2, r3] = await Promise.all([first, second, third]);
    assert.equal(renderer.passes - before, 1, "one pass for three calls");
    assert.equal(a.reads, 1);
    assert.equal(b.reads, 1);
    assert.deepEqual(r1.map((r) => r?.id), ["a", "b"]);
    assert.deepEqual(r2.map((r) => r?.id ?? null), ["b", "a", null]);
    assert.deepEqual(r3[0], { id: "a", x: 1, y: 2, width: 3, height: 4 });
  });

  it("a layer drawn into a new element is measured from the new element", () => {
    const { renderer } = setup();
    renderer.registry.register("a", box(0, 0, 10, 10));
    renderer.measureNow(["a"]);
    renderer.registry.register("a", box(50, 60, 70, 80));
    assert.deepEqual(renderer.measureNow(["a"])[0], { id: "a", x: 50, y: 60, width: 70, height: 80 });
  });
});

describe("Phase 19: 500 layers", () => {
  it("draw in well under the 500 ms budget (server render as a CPU proxy for the client mount)", () => {
    const layers = bigDocument(500);
    const t0 = performance.now();
    const html = renderToStaticMarkup(createElement(RenderTree, { layers }));
    const ms = performance.now() - t0;
    assert.equal((html.match(/data-archetype="text"/g) ?? []).length, 500);
    assert.ok(ms < 500, `500 layers rendered in ${ms.toFixed(0)} ms`);
  });
});
