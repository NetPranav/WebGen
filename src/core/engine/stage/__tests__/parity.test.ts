import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { DocBuilder } from "../../../document/__tests__/fixtures/builder";
import { MAIN_COMPOSITION_ID } from "../../../document/compositions";
import type { Clip } from "../../../document/schema";
import { evaluate } from "../../../kernel/evaluate";
import { FrameScheduler } from "../../../time/scheduler";
import { ParityMonitor, parityStore, sameValue, type MatrixParser } from "../parity";
import { styleWrites } from "../styleWrites";
import type { RunningLayer } from "../WaapiAdapter";

const track = (property: string, from: number, to: number, ease: string): Clip["tracks"][number] => ({
  id: `t_${property}`,
  property,
  keyframes: [{ id: "k0", time: 0, value: from }, { id: "k1", time: 1, value: to, ease }],
});

/** A matrix parser good enough for translate3d(x, y, z): the monitor only needs the numbers. */
const parseMatrix: MatrixParser = (css) => {
  const m = /translate3d\(([-\d.e]+)px,\s*([-\d.e]+)px,\s*([-\d.e]+)px\)/.exec(css);
  const out = Array(16).fill(0);
  out[0] = out[5] = out[10] = out[15] = 1;
  if (m) [out[12], out[13], out[14]] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return out;
};

function setup(ease: string, shown: (expected: Record<string, string>) => Record<string, string>) {
  const b = new DocBuilder();
  const id = b.layer("rectangle", "Box", null);
  b.clip(id, { name: "A", type: "entrance", trigger: "mount", duration: 1, easing: "linear", tracks: [track("transform.x", 0, 100, ease), track("appearance.opacity", 1, 0, ease)] });
  const doc = b.build();
  const state = { time: 0.4, transport: 0.4, playing: true };
  const element = {} as Element;
  const warnings: string[] = [];
  const monitor = new ParityMonitor({
    scheduler: new FrameScheduler(null),
    getDocument: () => doc,
    compositionId: () => MAIN_COMPOSITION_ID,
    fps: () => 60,
    transportTime: () => state.transport,
    isPlaying: () => state.playing,
    running: (): RunningLayer[] => [{ layerId: id, element, paths: new Set(["transform.x", "appearance.opacity"]), time: state.time }],
    read: (_el, property) => shown(styleWrites(["transform.x", "appearance.opacity"], evaluate(doc, MAIN_COMPOSITION_ID, id, state.time)))[property] ?? "",
    parseMatrix,
    warn: (m) => warnings.push(m),
  });
  return { monitor, state, warnings };
}

afterEach(() => parityStore.setState({ status: "idle", checked: 0, samples: 0, drifts: [] }));

describe("sameValue", () => {
  it("compares lengths within half a pixel and opacity within 0.01", () => {
    assert.equal(sameValue("left", "100px", "100.4px"), true);
    assert.equal(sameValue("left", "100px", "101px"), false);
    assert.equal(sameValue("opacity", "0.5", "0.505"), true);
    assert.equal(sameValue("opacity", "0.5", "0.55"), false);
  });
  it("compares transforms through their matrices", () => {
    assert.equal(sameValue("transform", "translate3d(10px, 0px, 0px)", "translate3d(10.3px, 0px, 0px)", parseMatrix), true);
    assert.equal(sameValue("transform", "translate3d(10px, 0px, 0px)", "translate3d(12px, 0px, 0px)", parseMatrix), false);
  });
  it("leaves what it can't compare alone (percentages, colours)", () => {
    assert.equal(sameValue("width", "50%", "300px"), true);
    assert.equal(sameValue("background-color", "red", "rgb(255, 0, 0)"), true);
  });
});

describe("ParityMonitor", () => {
  it("stays green while the engine shows what the kernel says", () => {
    const { monitor, warnings } = setup("power2.inOut", (expected) => expected);
    const result = monitor.sample();
    assert.equal(result.status, "ok");
    assert.equal(result.checked, 1);
    assert.deepEqual(warnings, []);
  });

  it("raises [PARITY_DRIFT] when the engine's easing is wrong, once, and recovers when it is right", () => {
    let wrong = true;
    const { monitor, warnings } = setup("power2.inOut", (expected) => (wrong ? { ...expected, transform: "translate3d(5px, 0px, 0px)", opacity: "0.9" } : expected));
    assert.equal(monitor.sample().status, "drift");
    assert.equal(warnings.length, 2, "one warning per property");
    assert.ok(warnings.every((w) => w.startsWith("[PARITY_DRIFT]")));
    assert.equal(parityStore.getState().drifts.length, 2);
    monitor.sample();
    assert.equal(warnings.length, 2, "the same drift is not reported again");
    wrong = false;
    assert.equal(monitor.sample().status, "ok");
    wrong = true;
    monitor.sample();
    assert.equal(warnings.length, 4, "a new drift after recovering is reported");
  });

  it("is idle when nothing is playing", () => {
    const { monitor, state } = setup("linear", (e) => e);
    state.playing = false;
    assert.equal(monitor.sample().status, "idle");
  });

  it("reports an engine clock that stays away from the transport, but not a single late sample", () => {
    const { monitor, state, warnings } = setup("linear", (e) => e);
    state.transport = 0.4;
    state.time = 0.6;
    assert.equal(monitor.sample().status, "ok", "one late sample is a transient");
    assert.equal(monitor.sample().status, "drift");
    assert.ok(warnings.some((w) => w.includes("clock")));
    state.time = 0.4;
    assert.equal(monitor.sample().status, "ok");
  });

  it("samples every N frames on the scheduler", () => {
    const scheduler = new FrameScheduler(null);
    scheduler.setDeterministic(true);
    const { monitor } = setup("linear", (e) => e);
    const sampler = new ParityMonitor({ ...(monitor as unknown as { env: ConstructorParameters<typeof ParityMonitor>[0] }).env, scheduler, every: 5 });
    const off = sampler.install();
    for (let i = 0; i < 12; i++) scheduler.step(1 / 60);
    assert.equal(parityStore.getState().samples, 2);
    off();
  });
});
