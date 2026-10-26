/**
 * FigCraft port F9: more component behaviour, from the cases of FigCraft's `crates/engine/src/components_tests.rs` and
 * `docs/components-parity.md` (commit 6ea44e9), translated to our components: push changes, combine as variants,
 * duplicating a main makes an instance, descriptions, the top-left default variant, and an instance's inner layers
 * keeping the main's layout. MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { documentCommands, getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { useSelectionStore } from "../../store/useSelectionStore";
import { createComponent, insertInstance } from "../componentOps";
import { subtreeIds } from "../instances";
import { addVariantProperty } from "../variantOps";
import { combineAsVariants, defaultVariantMain, lockedByInstance, pushChanges, setComponentDescription } from "../componentExtras";
import { duplicateLayers } from "../../editing/editOps";

const frame = (id: string, parentId: string, extra: Record<string, unknown> = {}, children: string[] = []): Layer =>
  createLayer({ id, archetype: "container", parentId, name: id, children, properties: { positioning: "absolute", "frame.x": 0, "frame.y": 0, "frame.width": 120, "frame.height": 40, "appearance.background.color": "#336699", ...extra } }) as Layer;

const doc = () =>
  createDocumentFromLayers([
    createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: ["btn", "card", "chip"], properties: { "frame.width": 2000, "frame.height": 1600 } }) as Layer,
    frame("btn", "pg", { "frame.x": 20, "frame.y": 20 }, ["icon"]),
    frame("icon", "btn", { "frame.x": 100, "frame.y": 10, "frame.width": 16, "frame.height": 16, "appearance.background.color": "#ffcc00" }),
    frame("card", "pg", { "frame.x": 400, "frame.y": 20 }),
    frame("chip", "pg", { "frame.x": 800, "frame.y": 20 }),
  ]);

const L = (id: string) => getDocument().layers[id];
const C = (id: string) => getDocument().designComponents?.[id];
const mirror = (root: string, source: string) => subtreeIds(getDocument().layers, root).map((id) => L(id)).find((l) => l.instance?.source === source)!;

describe("FigCraft port F9: components", () => {
  let c: string;
  beforeEach(() => {
    setDocument(doc());
    useSelectionStore.getState().clearSelection();
    c = createComponent(["btn"])!;
  });

  it("push changes: an instance's change goes to the main and every other instance, in one undo step", () => {
    const a = insertInstance(c, { at: { x: 0, y: 300 } })!;
    const b = insertInstance(c, { at: { x: 0, y: 400 } })!;
    const icon = mirror(a, "icon").id;
    documentCommands.updateProps(icon, { "appearance.background.color": "#ff0000" });
    documentCommands.updateProps(a, { "frame.width": 200 });
    assert.equal(mirror(b, "icon").properties["appearance.background.color"], "#ffcc00", "an override stays on its instance");
    assert.equal(pushChanges([a]), 2);
    assert.equal(L("icon").properties["appearance.background.color"], "#ff0000");
    assert.equal(L("btn").properties["frame.width"], 200);
    assert.equal(mirror(b, "icon").properties["appearance.background.color"], "#ff0000", "the other instance follows");
    assert.equal(L(b).properties["frame.width"], 200);
    assert.equal(L(icon).instance!.overridden, undefined, "the pushing instance follows the main again");
    assert.ok((L(a).instance!.overridden ?? []).every((k) => ["frame.x", "frame.y", "positioning"].includes(k)), "only its own place stays its own");
    assert.notEqual(L("btn").properties["frame.y"], 300, "the instance's position didn't move the main");
    historyCommands.undo();
    assert.equal(L("icon").properties["appearance.background.color"], "#ffcc00");
    assert.equal(L(icon).properties["appearance.background.color"], "#ff0000", "the override is back");
  });

  it("push changes from one inner layer pushes only that layer; a main or a plain layer pushes nothing", () => {
    const a = insertInstance(c, { at: { x: 0, y: 300 } })!;
    const icon = mirror(a, "icon").id;
    documentCommands.updateProps(icon, { "appearance.background.color": "#00ff00" });
    documentCommands.updateProps(a, { "appearance.background.color": "#000000" });
    assert.equal(pushChanges([icon]), 1);
    assert.equal(L("icon").properties["appearance.background.color"], "#00ff00");
    assert.equal(L("btn").properties["appearance.background.color"], "#336699", "the root's change stays on the instance");
    assert.equal(pushChanges(["btn", "card"]), 0);
  });

  it("an instance's inner layers can't be moved or rotated, but can change their look; the instance itself moves", () => {
    const a = insertInstance(c, { at: { x: 0, y: 300 } })!;
    const icon = mirror(a, "icon").id;
    documentCommands.updateProps(icon, { "frame.x": 5, "frame.rotation": 45, "appearance.background.color": "#123456" });
    assert.equal(L(icon).properties["frame.x"], 100);
    assert.equal(L(icon).properties["frame.rotation"], undefined);
    assert.equal(L(icon).properties["appearance.background.color"], "#123456");
    assert.deepEqual(L(icon).instance!.overridden, ["appearance.background.color"]);
    documentCommands.updateProps(a, { "frame.x": 50 });
    assert.equal(L(a).properties["frame.x"], 50);
    assert.ok(lockedByInstance(L(icon), "frame.y") && !lockedByInstance(L(a), "frame.y") && !lockedByInstance(L("icon"), "frame.y"));
  });

  it("a layer in an instance keeps its own size and resizing through edits of the main; reset brings the main's back (FigCraft instance_resizing_tests)", () => {
    const a = insertInstance(c, { at: { x: 0, y: 300 } })!;
    const icon = mirror(a, "icon").id;
    documentCommands.updateProps(icon, { "sizing.horizontal": "fill", "frame.height": 30 });
    documentCommands.updateProps("icon", { "frame.height": 12, "frame.width": 18, "appearance.radius": 4 });
    assert.equal(L(icon).properties["sizing.horizontal"], "fill");
    assert.equal(L(icon).properties["frame.height"], 30, "only the overridden property stays");
    assert.equal(L(icon).properties["frame.width"], 18);
    assert.equal(L(icon).properties["appearance.radius"], 4);
    assert.equal(L(icon).properties["frame.x"], 100, "its place is still the main's");
    documentCommands.updateProps("icon", { "frame.x": 90 });
    assert.equal(L(icon).properties["frame.x"], 90);
  });

  it("combine as variants: separate components become one set, one value each, and their instances follow", () => {
    const c2 = createComponent(["card"])!;
    const c3 = createComponent(["chip"])!;
    const inst = insertInstance(c2, { at: { x: 0, y: 600 } })!;
    const set = combineAsVariants(["btn", "card", "chip"])!;
    assert.equal(set, c);
    assert.equal(C(c2), undefined);
    assert.equal(C(c3), undefined);
    assert.deepEqual(C(c)!.variantProps, [{ name: "Variant", values: ["btn", "card", "chip"] }]);
    assert.deepEqual(C(c)!.variants!.map((v) => v.mainId), ["btn", "card", "chip"]);
    assert.ok(["btn", "card", "chip"].every((m) => L(m).componentMain === c));
    assert.equal(L("card").name, "btn, Variant=card");
    assert.equal(L(inst).instance!.component, c);
    assert.deepEqual(L(inst).instance!.variant, { Variant: "card" });
    assert.equal(L(inst).instance!.source, "card");
    historyCommands.undo();
    assert.ok(C(c2) && C(c3) && !C(c)!.variantProps);
    assert.equal(combineAsVariants(["btn"]), null, "needs two");
  });

  it("combine as variants: same-named components get distinct values; a set can't be combined again", () => {
    const c2 = createComponent(["card"])!;
    documentCommands.mutate("rename", (d) => void (d.designComponents![c2].name = d.designComponents![c].name));
    combineAsVariants([c, c2]);
    assert.deepEqual(C(c)!.variantProps![0].values, ["btn", "btn 2"]);
    const c3 = createComponent(["chip"])!;
    assert.equal(combineAsVariants([c, c3]), null, "a variant set isn't a separate component");
  });

  it("duplicating a main makes an instance of it, beside it", () => {
    const [copy] = duplicateLayers(["btn"]);
    assert.ok(L(copy).instance?.root);
    assert.equal(L(copy).instance!.component, c);
    assert.equal(L("pg").children.indexOf(copy), L("pg").children.indexOf("btn") + 1);
    assert.notEqual(L(copy).properties["frame.x"], 20, "offset from the main");
    assert.equal(Object.values(getDocument().layers).filter((l) => l.componentMain === c).length, 1, "still one main");
    // a variant main duplicates as an instance of that variant
    addVariantProperty(c, "Size", ["S", "M"]);
    const m = C(c)!.variants![1].mainId;
    const [vcopy] = duplicateLayers([m]);
    assert.deepEqual(L(vcopy).instance!.variant, { Size: "M" });
    assert.equal(L(vcopy).instance!.source, m);
  });

  it("descriptions, and the top-left variant is the default", () => {
    assert.equal(setComponentDescription(c, "  Primary action  "), true);
    assert.equal((C(c) as { description?: string }).description, "Primary action");
    setComponentDescription(c, "");
    assert.equal((C(c) as { description?: string }).description, undefined);
    assert.equal(setComponentDescription("nope", "x"), false);
    addVariantProperty(c, "Size", ["S", "M", "L"]);
    const [s, m] = C(c)!.variants!.map((v) => v.mainId);
    assert.equal(defaultVariantMain(c), s);
    // move M above S: it is now the top-left one, and what a new instance shows
    documentCommands.updateProps(m, { "frame.y": 0 });
    assert.equal(defaultVariantMain(c), m);
    const inst = insertInstance(c, { at: { x: 0, y: 900 } })!;
    assert.equal(L(inst).instance!.source, m);
    assert.deepEqual(L(inst).instance!.variant, { Size: "M" });
  });
});
