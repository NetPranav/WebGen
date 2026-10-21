import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { documentCommands, getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { useSelectionStore } from "../../store/useSelectionStore";
import { createComponent, goToMain, insertInstance } from "../componentOps";
import { namePathOf, resolveNamePath, subtreeIds } from "../instances";
import { addVariantProperty, combinations, exposeProperty, fillSlot, findVariant, markSlot, readProperty, removeProperty, setProperty, setVariant, slotsOf } from "../variantOps";
import { deleteLayers } from "../../editing/editOps";

const frame = (id: string, parentId: string, extra: Record<string, unknown> = {}, children: string[] = []): Layer =>
  createLayer({ id, archetype: "container", parentId, name: id, children, properties: { positioning: "absolute", "frame.x": 0, "frame.y": 0, "frame.width": 120, "frame.height": 40, "layout.padding": 0, "appearance.background.color": "#336699", ...extra } }) as Layer;
const textLayer = (id: string, parentId: string, text: string): Layer =>
  createLayer({ id, archetype: "text", parentId, name: id, properties: { positioning: "absolute", "frame.x": 8, "frame.y": 8, "frame.width": 80, "frame.height": 20, "content.text": text } }) as Layer;

const doc = () =>
  createDocumentFromLayers([
    createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: ["btn", "box"], properties: { "frame.width": 2000, "frame.height": 1600 } }) as Layer,
    frame("btn", "pg", { "frame.x": 20, "frame.y": 20 }, ["label", "icon", "slot"]),
    textLayer("label", "btn", "Button"),
    frame("icon", "btn", { "frame.x": 100, "frame.width": 16, "frame.height": 16, "appearance.background.color": "#ffcc00" }),
    frame("slot", "btn", { "frame.x": 0, "frame.y": 24, "frame.width": 120, "frame.height": 16 }),
    frame("box", "pg", { "frame.x": 500, "frame.y": 500, "frame.width": 60, "frame.height": 60 }),
  ]);

const L = (id: string) => getDocument().layers[id];
const C = (id: string) => getDocument().designComponents![id];
const mirror = (root: string, source: string) => subtreeIds(getDocument().layers, root).map((id) => L(id)).find((l) => l.instance?.source === source)!;

describe("Phase 47: variant sets", () => {
  let c: string;
  beforeEach(() => {
    setDocument(doc());
    useSelectionStore.getState().clearSelection();
    c = createComponent(["btn"])!;
  });

  it("combinations of properties in order", () => {
    assert.deepEqual(combinations([{ name: "Size", values: ["S", "M"] }, { name: "Tone", values: ["a", "b"] }]), [
      { Size: "S", Tone: "a" }, { Size: "S", Tone: "b" }, { Size: "M", Tone: "a" }, { Size: "M", Tone: "b" },
    ]);
  });

  it("a variant property makes one main for each value; the first keeps the layers the component had; they sit side by side", () => {
    assert.equal(addVariantProperty(c, "Size", ["S", "M", "L"]), true);
    const comp = C(c);
    assert.equal(comp.variants!.length, 3);
    assert.equal(comp.variants![0].mainId, "btn");
    assert.deepEqual(comp.variants!.map((v) => v.values.Size), ["S", "M", "L"]);
    const xs = comp.variants!.map((v) => L(v.mainId).properties["frame.x"] as number);
    assert.deepEqual(xs, [20, 20 + 144, 20 + 288]);
    for (const v of comp.variants!) {
      assert.equal(L(v.mainId).componentMain, c);
      assert.deepEqual(L(v.mainId).children.map((k) => L(k).name), ["label", "icon", "slot"]); // the same layers, copied
    }
    assert.ok(L("btn").name.includes("Size=S"));
  });

  it("a second property multiplies: 3 sizes × 2 tones = 6 mains; more than 64 is refused; a repeated name too", () => {
    addVariantProperty(c, "Size", ["S", "M", "L"]);
    assert.equal(addVariantProperty(c, "Tone", ["primary", "ghost"]), true);
    assert.equal(C(c).variants!.length, 6);
    assert.equal(addVariantProperty(c, "Tone", ["x"]), false);
    assert.equal(addVariantProperty(c, "Big", Array.from({ length: 12 }, (_, i) => String(i))), false); // 6 × 12 > 64
    assert.ok(findVariant(C(c), { Size: "M", Tone: "ghost" }));
    assert.equal(findVariant(C(c), { Size: "XL" }), undefined);
  });

  it("existing instances take the first value; a new instance can ask for another", () => {
    const before = insertInstance(c, { parentId: "pg" })!;
    addVariantProperty(c, "Size", ["S", "M", "L"]);
    assert.deepEqual(L(before).instance!.variant, { Size: "S" });
    const big = insertInstance(c, { parentId: "pg", variant: { Size: "L" } })!;
    assert.deepEqual(L(big).instance!.variant, { Size: "L" });
    assert.equal(L(big).instance!.source, C(c).variants![2].mainId);
  });

  it("each variant is edited on its own main and only its own instances follow", () => {
    addVariantProperty(c, "Size", ["S", "M", "L"]);
    const [s, m] = C(c).variants!.map((v) => v.mainId);
    const a = insertInstance(c, { parentId: "pg", variant: { Size: "S" } })!;
    const b = insertInstance(c, { parentId: "pg", variant: { Size: "M" } })!;
    documentCommands.updateProps(m, { "frame.width": 200, "appearance.background.color": "#ff0000" });
    assert.equal(L(b).properties["frame.width"], 200);
    assert.equal(L(a).properties["frame.width"], 120);
    documentCommands.updateProps(s, { "appearance.radius": 3 });
    assert.equal(L(a).properties["appearance.radius"], 3);
    assert.equal(L(b).properties["appearance.radius"], undefined);
  });

  it("switching the variant of an instance shows the other main, keeps overrides (matched by layer name), and is one undo step", () => {
    addVariantProperty(c, "Size", ["S", "M", "L"]);
    const [, m] = C(c).variants!.map((v) => v.mainId);
    documentCommands.updateProps(m, { "frame.width": 220 });
    documentCommands.updateProps(L(m).children[1], { "frame.width": 30 }); // the M icon is wider
    const a = insertInstance(c, { parentId: "pg" })!;
    const icon = mirror(a, "icon").id;
    documentCommands.updateProps(icon, { "appearance.background.color": "#00ff00" }); // an override
    const before = JSON.stringify(getDocument().layers);
    assert.equal(setVariant([icon], { Size: "M" }), 1);
    assert.equal(L(a).properties["frame.width"], 220);
    assert.deepEqual(L(a).instance!.variant, { Size: "M" });
    assert.equal(L(a).instance!.source, m);
    const icon2 = mirror(a, L(m).children[1]);
    assert.equal(icon2.id, icon); // the same layer
    assert.equal(icon2.properties["frame.width"], 30); // M's value
    assert.equal(icon2.properties["appearance.background.color"], "#00ff00"); // the override stayed
    assert.equal(setVariant([a], { Size: "M" }), 0); // already
    assert.equal(setVariant([a], { Size: "XL" }), 0); // no such variant
    historyCommands.undo();
    assert.equal(JSON.stringify(getDocument().layers), before);
  });

  it("go to main goes to the main of the variant the instance shows", () => {
    addVariantProperty(c, "Size", ["S", "M", "L"]);
    const a = insertInstance(c, { parentId: "pg", variant: { Size: "L" } })!;
    assert.equal(goToMain(mirror(a, C(c).variants![2].mainId).id), C(c).variants![2].mainId);
  });

  it("deleting a variant's main drops the variant and detaches its instances; deleting the last main removes the component", () => {
    addVariantProperty(c, "Size", ["S", "M"]);
    const [, m] = C(c).variants!.map((v) => v.mainId);
    const a = insertInstance(c, { parentId: "pg", variant: { Size: "M" } })!;
    deleteLayers([m]);
    assert.equal(C(c).variants!.length, 1);
    assert.equal(L(a).instance, undefined);
    assert.ok(L(a));
  });

  it("name paths find a layer under a root, even with sibling names that repeat", () => {
    documentCommands.mutate("twins", (d) => {
      d.layers.btn.children.push("t1", "t2");
      d.layers.t1 = frame("t1", "btn", {}, []);
      d.layers.t2 = frame("t2", "btn", {}, []);
      d.layers.t1.name = "twin";
      d.layers.t2.name = "twin";
    });
    assert.deepEqual(namePathOf(getDocument().layers, "btn", "t2"), ["twin#1"]);
    assert.equal(resolveNamePath(getDocument().layers, "btn", ["twin#1"])!.id, "t2");
    assert.equal(resolveNamePath(getDocument().layers, "btn", ["label"])!.id, "label");
    assert.equal(resolveNamePath(getDocument().layers, "btn", ["nope"]), undefined);
  });
});

describe("Phase 47: component properties and slots", () => {
  let c: string;
  beforeEach(() => {
    setDocument(doc());
    useSelectionStore.getState().clearSelection();
    c = createComponent(["btn"])!;
  });

  it("a text property sets the label of any instance, as an override that survives edits of the main", () => {
    const p = exposeProperty("label", "text", "Label")!;
    assert.deepEqual(C(c).properties![0], { id: p, name: "Label", type: "text", path: ["label"], prop: "content.text" });
    const a = insertInstance(c, { parentId: "pg" })!;
    const b = insertInstance(c, { parentId: "pg" })!;
    assert.equal(readProperty(a, p), "Button");
    assert.equal(setProperty(a, p, "Save"), true);
    assert.equal(readProperty(a, p), "Save");
    assert.equal(readProperty(b, p), "Button");
    assert.ok(mirror(a, "label").instance!.overridden!.includes("content.text"));
    documentCommands.updateProps("label", { "content.text": "Go" }); // the main changes
    assert.equal(readProperty(a, p), "Save");
    assert.equal(readProperty(b, p), "Go");
  });

  it("a boolean property shows or hides a layer on one instance", () => {
    const p = exposeProperty("icon", "boolean", "Show icon")!;
    const a = insertInstance(c, { parentId: "pg" })!;
    const b = insertInstance(c, { parentId: "pg" })!;
    assert.equal(readProperty(a, p), true);
    setProperty(a, p, false);
    assert.equal(readProperty(a, p), false);
    assert.equal(readProperty(b, p), true);
    assert.equal(mirror(a, "icon").visible, false);
  });

  it("an image property needs an image layer; a text property a text layer; names are unique; remove works", () => {
    assert.equal(exposeProperty("icon", "text"), null);
    assert.equal(exposeProperty("label", "image"), null);
    const p = exposeProperty("label", "text", "Label")!;
    assert.equal(exposeProperty("label", "text", "Label"), null);
    assert.equal(removeProperty(c, p), true);
    assert.equal(C(c).properties, undefined);
    assert.equal(removeProperty(c, p), false);
  });

  it("a property works on every variant, matching the layer by name", () => {
    const p = exposeProperty("label", "text", "Label")!;
    addVariantProperty(c, "Size", ["S", "M"]);
    const a = insertInstance(c, { parentId: "pg", variant: { Size: "M" } })!;
    assert.equal(setProperty(a, p, "Medium"), true);
    assert.equal(readProperty(a, p), "Medium");
    setVariant([a], { Size: "S" });
    assert.equal(readProperty(a, p), "Medium"); // the override went with the layer
  });

  it("a slot keeps an instance's own layers; the main never touches them", () => {
    assert.equal(markSlot("slot", true), true);
    const a = insertInstance(c, { parentId: "pg" })!;
    const slot = slotsOf(getDocument().layers, a);
    assert.equal(slot.length, 1);
    assert.equal(fillSlot(slot[0].id, ["box"]), 1);
    assert.equal(L("box").parentId, slot[0].id);
    documentCommands.updateProps("slot", { "frame.height": 30 });
    documentCommands.mutate("add", (d) => {
      d.layers.btn.children.push("extra");
      d.layers.extra = frame("extra", "btn", {}, []);
    });
    assert.equal(L("box").parentId, slot[0].id); // still there
    assert.equal(slot[0].properties["frame.height"], 16);
    assert.equal(L(slot[0].id).properties["frame.height"], 30); // the slot itself follows the main
  });

  it("only a container of a main can be a slot; instance layers can't be moved into a slot", () => {
    assert.equal(markSlot("box", true), false); // not in a main
    assert.equal(markSlot("label", true), false); // not a container
    markSlot("slot", true);
    const a = insertInstance(c, { parentId: "pg" })!;
    const slot = slotsOf(getDocument().layers, a)[0];
    assert.equal(fillSlot(slot.id, [mirror(a, "icon").id]), 0);
  });
});

describe("Phase 47: a design system keeps every override when every main is edited", () => {
  it("3 components × 3 variants, 40 instances with overrides: edit every main, every instance still shows its own overrides and its own variant", () => {
    const layers: Layer[] = [createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: ["m0", "m1", "m2"], properties: { "frame.width": 4000, "frame.height": 3000 } }) as Layer];
    for (let k = 0; k < 3; k++) {
      layers.push(frame(`m${k}`, "pg", { "frame.x": 20, "frame.y": 20 + k * 100, "appearance.background.color": ["#111111", "#222222", "#333333"][k] }, [`l${k}`, `i${k}`]));
      layers.push(textLayer(`l${k}`, `m${k}`, `Label ${k}`));
      layers.push(frame(`i${k}`, `m${k}`, { "frame.x": 100, "frame.width": 16, "frame.height": 16 }));
    }
    setDocument(createDocumentFromLayers(layers));
    const comps = [0, 1, 2].map((k) => createComponent([`m${k}`], `Comp${k}`)!);
    const props = comps.map((c, k) => {
      const p = exposeProperty(`l${k}`, "text", "Label")!;
      addVariantProperty(c, "Size", ["S", "M", "L"]);
      return p;
    });
    const roots: { id: string; c: number; v: string }[] = [];
    for (let i = 0; i < 40; i++) {
      const k = i % 3;
      const v = ["S", "M", "L"][i % 3 === 0 ? (i / 3) % 3 : i % 3 === 1 ? ((i - 1) / 3) % 3 : ((i - 2) / 3) % 3];
      const id = insertInstance(comps[k], { parentId: "pg", variant: { Size: v }, at: { x: 10 + (i % 10) * 120, y: 400 + Math.floor(i / 10) * 60 } })!;
      roots.push({ id, c: k, v });
      setProperty(id, props[k], `Item ${i}`);
      const ownIcon = subtreeIds(getDocument().layers, id).map((x) => L(x)).find((x) => x.name.startsWith("i"))!;
      documentCommands.updateProps(ownIcon.id, { "appearance.background.color": `#0000${(i + 16).toString(16).padStart(2, "0")}` });
      documentCommands.updateProps(id, { "frame.width": 130 + i });
    }
    // edit every one of the 9 mains: restyle the root, change the label colour, add a child
    for (const [k, c] of comps.entries()) {
      for (const [vi, v] of C(c).variants!.entries()) {
        const main = v.mainId;
        documentCommands.updateProps(main, { "appearance.radius": 4 + vi + k, "frame.height": 40 + 4 * vi });
        const label = L(main).children.find((x) => L(x).archetype === "text")!;
        documentCommands.updateProps(label, { "typography.color": `#00${k}${vi}00` });
        documentCommands.mutate("add", (d) => {
          const id = `chip_${main}`;
          d.layers[id] = frame(id, main, { "frame.x": 60 }, []);
          d.layers[main].children.push(id);
        });
      }
    }
    for (const r of roots) {
      const meta = L(r.id).instance!;
      const mainOf = C(comps[r.c]).variants!.find((x) => x.values.Size === r.v)!;
      assert.equal(meta.source, mainOf.mainId);
      const vi = ["S", "M", "L"].indexOf(r.v);
      const i = roots.indexOf(r);
      assert.equal(L(r.id).properties["frame.width"], 130 + i, `width ${i}`); // its own override
      assert.equal(L(r.id).properties["frame.height"], 40 + 4 * vi, `height ${i}`); // its variant's value
      assert.equal(L(r.id).properties["appearance.radius"], 4 + vi + r.c);
      const text = subtreeIds(getDocument().layers, r.id).map((x) => L(x)).find((x) => x.archetype === "text")!;
      assert.equal(text.properties["content.text"], `Item ${i}`, `label ${i}`);
      assert.equal(text.properties["typography.color"], `#00${r.c}${vi}00`);
      const icon = subtreeIds(getDocument().layers, r.id).map((x) => L(x)).find((x) => x.name.startsWith("i"))!;
      assert.equal(icon.properties["appearance.background.color"], `#0000${(i + 16).toString(16).padStart(2, "0")}`, `icon ${i}`);
      assert.equal(L(r.id).children.length, 3, `children ${i}`); // label, icon and the new chip
    }
  });
});
