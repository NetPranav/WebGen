/**
 * FigCraft port F9: nested components. The cases of FigCraft's `crates/engine/src/nested_override_tests.rs` (commit
 * 6ea44e9) translated to our components: a button holding an icon instance; overrides inside the nested instance
 * survive edits of both mains, swaps (carried by name path), variant switches and the main restructuring; detaching
 * keeps the nested instances; an instance-swap property; a component can't contain itself; inner mains sync first.
 * MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { documentCommands, getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { useSelectionStore } from "../../store/useSelectionStore";
import { createComponent, detachInstances, goToMain, insertInstance, resetOverrides, swapInstance } from "../componentOps";
import { subtreeIds } from "../instances";
import { addVariantProperty, exposeProperty, readProperty, setProperty, setVariant } from "../variantOps";
import { innerComponentOf } from "../componentExtras";
import { groupLayers } from "../../editing/editOps";

const L = () => getDocument().layers;
const frame = (id: string, parentId: string, x: number, children: string[] = [], extra: Record<string, unknown> = {}): Layer =>
  createLayer({ id, archetype: "container", parentId, name: id, children, properties: { positioning: "absolute", "frame.x": x, "frame.y": 0, "frame.width": 120, "frame.height": 40, "layout.padding": 0, ...extra } }) as Layer;
const shape = (id: string, parentId: string, name: string, color: string): Layer =>
  createLayer({ id, archetype: "container", parentId, name, properties: { positioning: "absolute", "frame.x": 2, "frame.y": 2, "frame.width": 20, "frame.height": 20, "appearance.background.color": color } }) as Layer;
const fill = (id: string) => L()[id].properties["appearance.background.color"];
/** The layer of an instance that mirrors `source`. */
const copyOf = (root: string, source: string) => subtreeIds(L(), root).find((id) => L()[id].instance?.source === source)!;
const kid = (id: string, i = 0) => L()[id].children[i];

/** An icon component ("Shape" inside), another with a same-named layer, an unrelated one, and a button holding an icon instance. */
function setup() {
  setDocument(
    createDocumentFromLayers([
      createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: ["icon", "other", "unrelated", "btn"], properties: { "frame.width": 2000, "frame.height": 2000 } }) as Layer,
      frame("icon", "pg", 0, ["iconShape"]),
      shape("iconShape", "icon", "Shape", "#111111"),
      frame("other", "pg", 200, ["otherShape"]),
      shape("otherShape", "other", "Shape", "#333333"),
      frame("unrelated", "pg", 400, ["glyph"]),
      shape("glyph", "unrelated", "Glyph", "#555555"),
      frame("btn", "pg", 600, ["bg"], { "frame.width": 200 }),
      shape("bg", "btn", "Bg", "#ffffff"),
    ]),
  );
  useSelectionStore.getState().clearSelection();
  const icon = createComponent(["icon"])!;
  const other = createComponent(["other"])!;
  const unrelated = createComponent(["unrelated"])!;
  const nested = insertInstance(icon, { parentId: "btn", at: { x: 8, y: 8 } })!;
  const button = createComponent(["btn"])!;
  return { icon, other, unrelated, button, nested };
}

describe("FigCraft nested components", () => {
  let c: ReturnType<typeof setup>;
  beforeEach(() => (c = setup()));

  it("a main can hold an instance; an instance of it holds a copy that knows its own component", () => {
    assert.ok(c.button, "a component around an instance is allowed");
    const i = insertInstance(c.button, { at: { x: 0, y: 400 } })!;
    const inested = copyOf(i, c.nested);
    assert.equal(innerComponentOf(getDocument(), inested), c.icon);
    assert.equal(goToMain(inested), "icon", "go to main from the nested copy: the icon's main");
    // an edit of the icon's main reaches the copy in the button's main, then the button's instances
    documentCommands.updateProps("iconShape", { "appearance.background.color": "#00aa00" });
    assert.equal(fill(kid(c.nested)), "#00aa00");
    assert.equal(fill(kid(inested)), "#00aa00");
  });

  it("swapping a nested instance keeps overrides on matching layers; they survive edits of both mains; no match drops them; swapping back resets", () => {
    const i = insertInstance(c.button, { at: { x: 0, y: 400 } })!;
    const inested = copyOf(i, c.nested);
    documentCommands.updateProps(kid(inested), { "appearance.background.color": "#ff00ff", "appearance.opacity": 0.5 });
    assert.equal(swapInstance(inested, c.other), inested, "swapped in place");
    assert.equal(innerComponentOf(getDocument(), inested), c.other);
    assert.equal(fill(kid(inested)), "#ff00ff");
    assert.equal(L()[kid(inested)].properties["appearance.opacity"], 0.5);
    // edits of the outer main and of the swapped-in main
    documentCommands.updateProps("btn", { "appearance.background.color": "#00ff00" });
    documentCommands.updateProps("otherShape", { "appearance.radius": 5, "appearance.background.color": "#222222" });
    assert.equal(fill(kid(copyOf(i, c.nested))), "#ff00ff");
    assert.equal(L()[kid(copyOf(i, c.nested))].properties["appearance.radius"], 5);
    // no matching layer: the overrides go
    swapInstance(inested, c.unrelated);
    assert.equal(fill(kid(inested)), "#555555");
    // back to its own component: it shows its main again
    swapInstance(inested, c.icon);
    assert.equal(innerComponentOf(getDocument(), inested), c.icon);
    assert.equal(fill(kid(inested)), fill(kid(c.nested)));
  });

  it("a variant switch keeps the nested overrides and the swap", () => {
    addVariantProperty(c.button, "State", ["Default", "Hover"]);
    const comp = getDocument().designComponents![c.button];
    const hover = comp.variants![1].mainId;
    documentCommands.updateProps(L()[hover].children.find((k) => L()[k].name === "Bg")!, { "appearance.background.color": "#eeeeee" });
    const i = insertInstance(c.button, { at: { x: 0, y: 400 } })!;
    const inested = copyOf(i, c.nested);
    documentCommands.updateProps(kid(inested), { "appearance.background.color": "#ff8800" });
    documentCommands.updateProps(inested, { "appearance.opacity": 0.4 });
    setVariant([i], { State: "Hover" });
    const n2 = L()[i].children.find((k) => L()[k].name === L()[inested]?.name && innerComponentOf(getDocument(), k))!;
    assert.equal(fill(L()[i].children.find((k) => L()[k].name === "Bg")!), "#eeeeee", "the new variant shows");
    assert.equal(fill(kid(n2)), "#ff8800", "override inside the nested instance kept");
    assert.equal(L()[n2].properties["appearance.opacity"], 0.4, "override on the nested instance kept");
    swapInstance(n2, c.other);
    setVariant([i], { State: "Default" });
    const n3 = L()[i].children.find((k) => innerComponentOf(getDocument(), k))!;
    assert.equal(innerComponentOf(getDocument(), n3), c.other, "the swap survives switching back");
    assert.equal(fill(kid(n3)), "#ff8800");
  });

  it("nested overrides survive the main wrapping its nested instance in a frame, and the main swapping it", () => {
    const i = insertInstance(c.button, { at: { x: 0, y: 400 } })!;
    const ishape = kid(copyOf(i, c.nested));
    documentCommands.updateProps(ishape, { "appearance.background.color": "#ff00ff" });
    groupLayers([c.nested], "frame");
    assert.equal(fill(kid(copyOf(i, c.nested))), "#ff00ff", "kept when the main moves the nested instance into a frame");
    swapInstance(c.nested, c.other);
    assert.equal(L()[c.nested].instance!.component, c.other, "the main's nested instance swapped in place");
    assert.equal(fill(kid(copyOf(i, c.nested))), "#ff00ff");
  });

  it("detaching the outer instance keeps the nested instances (a swapped one as what it was swapped to) and their overrides", () => {
    const i = insertInstance(c.button, { at: { x: 0, y: 400 } })!;
    const inested = copyOf(i, c.nested);
    swapInstance(inested, c.other);
    documentCommands.updateProps(kid(inested), { "appearance.background.color": "#ff00ff" });
    detachInstances([i]);
    assert.equal(L()[i].instance, undefined);
    assert.deepEqual([L()[inested].instance!.component, L()[inested].instance!.root], [c.other, true]);
    assert.equal(L()[kid(inested)].instance!.source, "otherShape");
    documentCommands.updateProps("otherShape", { "appearance.radius": 7 });
    assert.equal(L()[kid(inested)].properties["appearance.radius"], 7, "still follows its main");
    assert.equal(fill(kid(inested)), "#ff00ff", "its override kept");
  });

  it("an instance-swap property swaps the nested instance from the outer instance", () => {
    const p = exposeProperty(c.nested, "instance", "Icon")!;
    assert.ok(p);
    assert.equal(exposeProperty("bg", "instance", "Nope"), null, "only on a nested instance");
    const i = insertInstance(c.button, { at: { x: 0, y: 400 } })!;
    assert.equal(readProperty(i, p), c.icon);
    assert.equal(setProperty(i, p, c.other), true);
    assert.equal(readProperty(i, p), c.other);
    assert.equal(fill(kid(copyOf(i, c.nested))), "#333333");
    resetOverrides([i]);
  });

  it("a component can't contain itself: not by inserting, not by swapping, not by moving", () => {
    // the icon's instance placed in the icon's main lands elsewhere; a button instance in the icon's main too
    const x = insertInstance(c.icon, { parentId: "icon" })!;
    assert.notEqual(L()[x].parentId, "icon");
    const y = insertInstance(c.button, { parentId: "icon" })!;
    assert.notEqual(L()[y].parentId, "icon", "the button holds the icon: it can't go inside it");
    // swapping the button's nested icon to the button itself
    assert.equal(swapInstance(c.nested, c.button), null);
    // moving a button instance into the icon's main is refused, and nothing changes
    const before = JSON.stringify(L());
    assert.throws(() => documentCommands.moveLayer(y, "icon", 0));
    assert.equal(JSON.stringify(L()), before);
  });

  it("one undo step brings back what a nested swap changed", () => {
    const i = insertInstance(c.button, { at: { x: 0, y: 400 } })!;
    const inested = copyOf(i, c.nested);
    swapInstance(inested, c.other);
    historyCommands.undo();
    assert.equal(innerComponentOf(getDocument(), inested), c.icon);
  });
});
