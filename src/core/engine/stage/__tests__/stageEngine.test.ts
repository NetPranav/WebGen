import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DocBuilder } from "../../../document/__tests__/fixtures/builder";
import { MAIN_COMPOSITION_ID } from "../../../document/compositions";
import type { Clip, MotionDocument } from "../../../document/schema";
import { evaluate } from "../../../kernel/evaluate";
import { KernelAdapter } from "../KernelAdapter";
import { animatedLayers, animatedPaths, styleWrites } from "../styleWrites";
import type { StyledElement } from "../types";

function fakeElement(initial: Record<string, string> = {}): StyledElement & { values: Map<string, string>; sets: number } {
  const values = new Map(Object.entries(initial));
  const el = {
    values,
    sets: 0,
    style: {
      setProperty(name: string, value: string) {
        el.sets++;
        values.set(name, value);
      },
      removeProperty(name: string) {
        const old = values.get(name) ?? "";
        values.delete(name);
        return old;
      },
      getPropertyValue(name: string) {
        return values.get(name) ?? "";
      },
    },
  };
  return el;
}

type TrackDraft = Clip["tracks"][number];

/** A document with one rectangle, `a`-style id from the builder, and one entrance clip per track list. */
function docWith(trackLists: TrackDraft[][]): { doc: MotionDocument; id: string; compositionId: string } {
  const b = new DocBuilder();
  const id = b.layer("rectangle", "Box", null);
  trackLists.forEach((tracks) => b.clip(id, { name: "Anim", type: "entrance", trigger: "mount", duration: 1, easing: "linear", tracks }));
  return { doc: b.build(), id, compositionId: MAIN_COMPOSITION_ID };
}

let trackCounter = 0;
const track = (property: string, from: number, to: number, ease = "linear"): TrackDraft => ({
  id: `trk_${trackCounter++}`,
  property,
  keyframes: [
    { id: "k0", time: 0, value: from },
    { id: "k1", time: 1, value: to, ease },
  ],
});

describe("styleWrites", () => {
  it("maps animated paths to CSS, with units", () => {
    const writes = styleWrites(["appearance.opacity", "frame.width"], { "appearance.opacity": 0.5, "frame.width": 120, "frame.widthUnit": "%" });
    assert.deepEqual(writes, { opacity: "0.5", width: "120%" });
  });

  it("folds every transform.* and the rotation into one transform, rotation first", () => {
    const writes = styleWrites(["transform.x", "frame.rotation"], { "frame.rotation": 30, transform: "translate3d(10px, 0px, 0px)" });
    assert.deepEqual(writes, { transform: "rotate(30deg) translate3d(10px, 0px, 0px)" });
  });

  it("gives `none` for a transform that is back at rest", () => {
    assert.deepEqual(styleWrites(["transform.x"], { transform: "none" }), { transform: "none" });
  });

  it("never gives a negative size and skips values it can't express", () => {
    assert.deepEqual(styleWrites(["frame.height"], { "frame.height": -5 }), { height: "0px" });
    assert.deepEqual(styleWrites(["appearance.opacity"], { "appearance.opacity": Number.NaN }), {});
  });
});

describe("animatedLayers", () => {
  it("lists the layers and the paths they animate, skipping muted tracks and disabled clips", () => {
    const { doc, id } = docWith([[track("appearance.opacity", 0, 1), { ...track("transform.x", 0, 10), muted: true }], [track("transform.y", 0, 5)]]);
    const second = Object.values(doc.clips)[1];
    doc.clips[second.id] = { ...second, enabled: false };
    assert.deepEqual([...animatedLayers(doc).keys()], [id]);
    assert.deepEqual([...animatedPaths(doc, id)], ["appearance.opacity"]);
  });
});

describe("KernelAdapter", () => {
  function setup(fixture: ReturnType<typeof docWith>, element = fakeElement()) {
    const holder = { doc: fixture.doc };
    const adapter = new KernelAdapter();
    adapter.mount({ node: () => element as unknown as Element, getDocument: () => holder.doc, compositionId: () => fixture.compositionId });
    return { adapter, element, holder };
  }

  it("shows the kernel's value at any time, in any order", () => {
    const f = docWith([[track("appearance.opacity", 0, 1)]]);
    const { adapter, element } = setup(f);
    for (const t of [0.5, 0.1, 1, 0.75, 0]) {
      adapter.seek(t);
      const expected = evaluate(f.doc, f.compositionId, f.id, t)["appearance.opacity"];
      assert.equal(Number(element.values.get("opacity")), expected, `opacity at ${t}`);
    }
  });

  it("applies the track's easing exactly as the kernel does", () => {
    const f = docWith([[track("transform.x", 0, 100, "power2.inOut")]]);
    const { adapter, element } = setup(f);
    adapter.seek(0.3);
    const expected = evaluate(f.doc, f.compositionId, f.id, 0.3).transform;
    assert.ok(typeof expected === "string" && expected !== "none");
    assert.equal(element.values.get("transform"), expected);
  });

  it("does not write again when nothing changed", () => {
    const f = docWith([[track("appearance.opacity", 0, 1)]]);
    const { adapter, element } = setup(f);
    adapter.seek(0.5);
    const sets = element.sets;
    assert.ok(sets > 0);
    adapter.seek(0.5);
    assert.equal(element.sets, sets);
  });

  it("writes again after invalidate (React may have redrawn the element)", () => {
    const f = docWith([[track("appearance.opacity", 0, 1)]]);
    const { adapter, element } = setup(f);
    adapter.seek(0.5);
    element.values.set("opacity", "1");
    adapter.invalidate();
    adapter.seek(0.5);
    assert.equal(element.values.get("opacity"), "0.5");
  });

  it("leaves layers that animate nothing alone", () => {
    const f = docWith([]);
    const { adapter, element } = setup(f);
    adapter.seek(0.5);
    assert.equal(element.sets, 0);
  });

  it("puts back what was drawn when disposed", () => {
    const f = docWith([[track("appearance.opacity", 0, 1), track("transform.x", 0, 10)]]);
    const { adapter, element } = setup(f, fakeElement({ opacity: "0.9" }));
    adapter.seek(0.5);
    assert.notEqual(element.values.get("opacity"), "0.9");
    adapter.dispose();
    assert.equal(element.values.get("opacity"), "0.9");
    assert.equal(element.values.has("transform"), false, "a style that wasn't there is removed");
  });

  it("gives a style back when its track is removed", () => {
    const f = docWith([[track("appearance.opacity", 0, 1), track("transform.x", 0, 10)]]);
    const { adapter, element, holder } = setup(f, fakeElement({ opacity: "0.9" }));
    adapter.seek(0.5);
    holder.doc = docWith([[track("transform.x", 0, 10)]]).doc;
    adapter.invalidate();
    adapter.seek(0.5);
    assert.equal(element.values.get("opacity"), "0.9");
    assert.ok(element.values.get("transform"));
  });

  it("gives everything back when a layer stops animating", () => {
    const f = docWith([[track("appearance.opacity", 0, 1)]]);
    const { adapter, element, holder } = setup(f, fakeElement({ opacity: "0.9" }));
    adapter.seek(0.5);
    holder.doc = docWith([]).doc;
    adapter.invalidate();
    adapter.seek(0.5);
    assert.equal(element.values.get("opacity"), "0.9");
  });

  it("matches the kernel for 10 reference animations seeked at 5 times each (Phase 57 gate)", () => {
    const refs: Array<[string, number, number, string]> = [
      ["transform.x", 0, 240, "linear"],
      ["transform.y", -50, 50, "power2.inOut"],
      ["transform.x", 10, 10, "linear"],
      ["frame.width", 40, 400, "power1.out"],
      ["frame.height", 400, 40, "linear"],
      ["frame.x", 0, 300, "power3.out"],
      ["frame.y", 0, 120, "linear"],
      ["appearance.radius", 0, 60, "power2.out"],
      ["transform.y", 0, 999, "power2.in"],
      ["transform.x", 300, 0, "power4.in"],
    ];
    const times = [0, 0.2, 0.5, 0.8, 1];
    for (const [property, from, to, ease] of refs) {
      const f = docWith([[track(property, from, to, ease)]]);
      const { adapter, element } = setup(f);
      for (const t of times) {
        adapter.seek(t);
        const expected = styleWrites([property], evaluate(f.doc, f.compositionId, f.id, t));
        const css = Object.keys(expected);
        assert.ok(css.length > 0, `${property} produces a style`);
        for (const name of css) assert.equal(element.values.get(name), expected[name], `${property} at ${t}`);
      }
    }
  });
});
