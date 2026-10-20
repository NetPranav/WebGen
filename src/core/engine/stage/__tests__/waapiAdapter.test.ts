import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DocBuilder } from "../../../document/__tests__/fixtures/builder";
import { MAIN_COMPOSITION_ID } from "../../../document/compositions";
import type { Clip, MotionDocument } from "../../../document/schema";
import { evaluate } from "../../../kernel/evaluate";
import { StageAdapters } from "../StageAdapters";
import { WaapiAdapter, type WaapiAnimation, type WaapiElement } from "../WaapiAdapter";
import { canRunOnWaapi } from "../waapiEligibility";
import { styleWrites } from "../styleWrites";

type Frame = Record<string, string | number>;

class FakeAnimation implements WaapiAnimation {
  currentTime: number | null = 0;
  playbackRate = 1;
  state: "paused" | "running" | "canceled" = "running";
  id = "";
  constructor(readonly keyframes: Frame[], readonly duration: number) {}
  play() {
    this.state = "running";
  }
  pause() {
    this.state = "paused";
  }
  cancel() {
    this.state = "canceled";
  }
  /** The keyframe values at the current time, interpolated linearly the way the browser does between baked frames. */
  valueAt(property: string): string | number | undefined {
    const t = Math.min(1, Math.max(0, (this.currentTime ?? 0) / this.duration));
    const frames = this.keyframes.filter((f) => f[property] !== undefined);
    const i = frames.findIndex((f) => (f.offset as number) >= t);
    if (i <= 0) return frames[0]?.[property];
    const a = frames[i - 1];
    const b = frames[i];
    const av = parseFloat(String(a[property]));
    const bv = parseFloat(String(b[property]));
    if (Number.isFinite(av) && Number.isFinite(bv)) {
      const span = (b.offset as number) - (a.offset as number);
      const k = span === 0 ? 1 : (t - (a.offset as number)) / span;
      return av + (bv - av) * k;
    }
    return a[property];
  }
}

class FakeElement implements WaapiElement {
  animations: FakeAnimation[] = [];
  animate(keyframes: Frame[], options: { duration: number }) {
    const a = new FakeAnimation(keyframes, options.duration);
    this.animations.push(a);
    return a;
  }
}

const track = (property: string, from: number, to: number, ease = "linear") => ({
  id: `t_${property}_${from}_${to}`,
  property,
  keyframes: [{ id: "k0", time: 0, value: from }, { id: "k1", time: 1, value: to, ease }],
});

function build(tracks: Clip["tracks"]): { doc: MotionDocument; id: string } {
  const b = new DocBuilder();
  const id = b.layer("rectangle", "Box", null);
  b.clip(id, { name: "A", type: "entrance", trigger: "mount", duration: 1, easing: "linear", tracks });
  return { doc: b.build(), id };
}

function setup(doc: MotionDocument, element = new FakeElement()) {
  const adapter = new WaapiAdapter();
  adapter.mount({ node: () => element as unknown as Element, getDocument: () => doc, compositionId: () => MAIN_COMPOSITION_ID, fps: () => 60, duration: () => 1 });
  return { adapter, element };
}

describe("canRunOnWaapi", () => {
  it("accepts compositor and paint properties the rules route to css", () => {
    assert.equal(canRunOnWaapi(["transform.x", "appearance.opacity"]), true);
    assert.equal(canRunOnWaapi(["appearance.background.color", "frame.width", "frame.rotation"]), true);
  });
  it("sends svg-only, 3D, path and discrete properties to the kernel", () => {
    assert.equal(canRunOnWaapi(["svg.pathMorph"]), false);
    assert.equal(canRunOnWaapi(["scene3d.position"]), false);
    assert.equal(canRunOnWaapi(["transform.motionPath"]), false);
    assert.equal(canRunOnWaapi(["appearance.border.style"]), false);
    assert.equal(canRunOnWaapi([]), false);
  });
});

describe("WaapiAdapter", () => {
  it("bakes the kernel's curve, easing included, into one animation per layer", () => {
    const { doc, id } = build([track("appearance.opacity", 1, 0, "power2.inOut"), track("transform.x", 0, 100, "power3.out")]);
    const { adapter, element } = setup(doc);
    adapter.seek(0.4);
    assert.equal(element.animations.length, 1, "one animation covers every property of the layer");
    const [anim] = element.animations;
    assert.equal(anim.state, "paused", "seeking shows a frame, it does not play");
    assert.equal(anim.currentTime, 400);
    const expected = evaluate(doc, MAIN_COMPOSITION_ID, id, 0.4);
    assert.ok(Math.abs((anim.valueAt("opacity") as number) - (expected["appearance.opacity"] as number)) < 0.005);
  });

  it("matches the kernel at five times for ten reference animations", () => {
    const refs: Array<[string, number, number, string]> = [
      ["appearance.opacity", 1, 0.2, "power1.inOut"],
      ["appearance.radius", 0, 40, "power2.out"],
      ["frame.width", 40, 160, "power1.out"],
      ["frame.height", 120, 30, "linear"],
      ["frame.x", 10, 300, "power3.out"],
      ["frame.y", 10, 150, "linear"],
      ["appearance.opacity", 0, 1, "power4.in"],
      ["appearance.radius", 40, 0, "power2.in"],
      ["frame.width", 400, 40, "power2.inOut"],
      ["frame.x", 300, 0, "power4.in"],
    ];
    const css: Record<string, string> = { "appearance.opacity": "opacity", "appearance.radius": "borderRadius", "frame.width": "width", "frame.height": "height", "frame.x": "left", "frame.y": "top" };
    for (const [property, from, to, ease] of refs) {
      const { doc, id } = build([track(property, from, to, ease)]);
      const { adapter, element } = setup(doc);
      for (const t of [0, 0.2, 0.5, 0.8, 1]) {
        adapter.seek(t);
        const expected = styleWrites([property], evaluate(doc, MAIN_COMPOSITION_ID, id, t));
        const name = Object.keys(expected)[0];
        const want = parseFloat(expected[name]);
        const got = parseFloat(String(element.animations[0].valueAt(css[property])));
        assert.ok(Math.abs(got - want) <= (property === "appearance.opacity" ? 0.005 : 0.5), `${property} at ${t}: ${got} vs ${want}`);
      }
    }
  });

  it("plays at the transport's rate from the transport's time", () => {
    const { doc } = build([track("transform.x", 0, 100)]);
    const { adapter, element } = setup(doc);
    adapter.play(0.25, 2);
    const [anim] = element.animations;
    assert.equal(anim.state, "running");
    assert.equal(anim.playbackRate, 2);
    assert.equal(anim.currentTime, 250);
    adapter.pause(0.5);
    assert.equal(anim.state, "paused");
    assert.equal(anim.currentTime, 500);
  });

  it("leaves a running animation alone while it agrees with the transport, and moves it when it doesn't", () => {
    const { doc } = build([track("transform.x", 0, 100)]);
    const { adapter, element } = setup(doc);
    adapter.play(0, 1);
    const [anim] = element.animations;
    anim.currentTime = 300;
    adapter.seek(0.3 + 1 / 60); // within two frames
    assert.equal(anim.currentTime, 300, "no write");
    adapter.seek(0.9); // the user clicked the ruler, or the loop wrapped
    assert.equal(anim.currentTime, 900);
  });

  it("bakes again, keeping the time and play state, when the document changes", () => {
    const first = build([track("transform.x", 0, 100)]);
    const holder = { doc: first.doc };
    const element = new FakeElement();
    const adapter = new WaapiAdapter();
    adapter.mount({ node: () => element as unknown as Element, getDocument: () => holder.doc, compositionId: () => MAIN_COMPOSITION_ID, fps: () => 60, duration: () => 1 });
    adapter.play(0.4, 1);
    holder.doc = build([track("transform.x", 0, 200)]).doc;
    adapter.invalidate();
    adapter.seek(0.4);
    assert.equal(element.animations[0].state, "canceled");
    const next = element.animations[1];
    assert.equal(next.state, "running");
    assert.equal(next.currentTime, 400);
  });

  it("cancels everything when disposed", () => {
    const { doc } = build([track("transform.x", 0, 100)]);
    const { adapter, element } = setup(doc);
    adapter.seek(0.5);
    adapter.dispose();
    assert.equal(element.animations[0].state, "canceled");
  });
});

describe("StageAdapters", () => {
  it("gives each animated layer to exactly one adapter", () => {
    const b = new DocBuilder();
    const smooth = b.layer("rectangle", "Smooth", null);
    const morph = b.layer("rectangle", "Morph", null);
    b.clip(smooth, { name: "A", type: "entrance", trigger: "mount", duration: 1, easing: "linear", tracks: [track("appearance.opacity", 0, 1)] });
    b.clip(morph, { name: "B", type: "entrance", trigger: "mount", duration: 1, easing: "linear", tracks: [track("appearance.border.style", 0, 1)] });
    const doc = b.build();
    const smoothEl = new FakeElement();
    const styled = { style: { values: new Map<string, string>(), setProperty(n: string, v: string) { this.values.set(n, v); }, removeProperty(n: string) { this.values.delete(n); return ""; }, getPropertyValue(n: string) { return this.values.get(n) ?? ""; } }, animate: () => { throw new Error("the kernel layer must not use WAAPI"); } };
    const engines = new StageAdapters({ waapi: true });
    engines.mount({
      node: (id) => (id === smooth ? (smoothEl as unknown as Element) : (styled as unknown as Element)),
      getDocument: () => doc,
      compositionId: () => MAIN_COMPOSITION_ID,
      fps: () => 60,
      duration: () => 1,
    });
    engines.seek(0.5);
    assert.equal(smoothEl.animations.length, 1);
    assert.equal(engines.kernel.stats.evaluations, 1, "the other layer is drawn by the kernel");
  });

  it("falls back to the kernel where Web Animations don't exist", () => {
    const { doc, id } = build([track("appearance.opacity", 0, 1)]);
    const values = new Map<string, string>();
    const el = { style: { setProperty: (n: string, v: string) => values.set(n, v), removeProperty: (n: string) => (values.delete(n), ""), getPropertyValue: (n: string) => values.get(n) ?? "" } };
    const engines = new StageAdapters({ waapi: false });
    engines.mount({ node: () => el as unknown as Element, getDocument: () => doc, compositionId: () => MAIN_COMPOSITION_ID, fps: () => 60, duration: () => 1 });
    engines.seek(0.5);
    assert.equal(Number(values.get("opacity")), evaluate(doc, MAIN_COMPOSITION_ID, id, 0.5)["appearance.opacity"]);
  });
});
