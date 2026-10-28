import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer, attachClip, hydrateClip } from "../../document/factories";
import type { Layer, MotionDocument } from "../../document/schema";
import { evaluate } from "../../kernel/evaluate";
import { setDocument } from "../../store/documentState";
import { documentCommands, getDocument } from "../../store/useDocumentStore";
import { invokeCommand } from "../../commands";
import { StageAdapters } from "../../engine/stage/StageAdapters";
import { installStageEngine } from "../../engine/stage/StageEngine";
import { FrameScheduler } from "../../time/scheduler";
import { StageRenderer } from "../../render/StageRenderer";
import { DEFAULT_END, DEFAULT_START, advanceTriggered, initialTriggered, isScrollPosition, parseScrollPosition, pinOffset, resolveRange, scrollEvents, scrubSmoothing, smoothProgress, triggeredTime, viewProgress } from "../model";
import { ScrollDriver, scrollClips, scrollStore, type ScrollHost } from "../ScrollDriver";
import { registerScrollCommands } from "../scrollCommands";

const box = (id: string, top: number, height = 100): Layer =>
  createLayer({ id, archetype: "container", parentId: null, name: id, children: [], properties: { "frame.width": 100, "frame.height": height, "frame.y": top, "appearance.opacity": 1 } }) as Layer;

describe("Phase 81: the scroll model", () => {
  it("reads positions the way GSAP and CSS write them", () => {
    assert.deepEqual(parseScrollPosition("top 80%", DEFAULT_START), { element: { fraction: 0 }, viewport: { fraction: 0.8 } });
    assert.deepEqual(parseScrollPosition("center center", DEFAULT_START), { element: { fraction: 0.5 }, viewport: { fraction: 0.5 } });
    assert.deepEqual(parseScrollPosition("bottom 100px", DEFAULT_START), { element: { fraction: 1 }, viewport: { px: 100 } });
    assert.deepEqual(parseScrollPosition("nonsense", DEFAULT_END), { element: { fraction: 1 }, viewport: { fraction: 0 } }, "falls back to the default");
    assert.deepEqual(parseScrollPosition(undefined, DEFAULT_START), { element: { fraction: 0 }, viewport: { fraction: 1 } });
    assert.equal(isScrollPosition("top 80%"), true);
    assert.equal(isScrollPosition("top"), false);
    assert.equal(isScrollPosition("sideways 10%"), false);
  });

  it("the default range runs from the element's top meeting the viewport's bottom to its bottom leaving the top", () => {
    const range = resolveRange({ top: 1000, height: 200 }, 800);
    assert.deepEqual(range, { startScroll: 200, endScroll: 1200 });
    assert.equal(viewProgress(0, range), 0);
    assert.equal(viewProgress(200, range), 0);
    assert.equal(viewProgress(700, range), 0.5);
    assert.equal(viewProgress(1200, range), 1);
    assert.equal(viewProgress(5000, range), 1);
  });

  it("a custom range (top 80% to top 20%) is where the reveal happens", () => {
    const range = resolveRange({ top: 1000, height: 200 }, 800, "top 80%", "top 20%");
    assert.deepEqual(range, { startScroll: 360, endScroll: 840 });
    assert.equal(viewProgress(600, range), 0.5);
  });

  it("a range with no length is a step", () => {
    assert.equal(viewProgress(99, { startScroll: 100, endScroll: 100 }), 0);
    assert.equal(viewProgress(100, { startScroll: 100, endScroll: 100 }), 1);
  });

  it("gives the four crossings, and both on a jump over the whole range", () => {
    assert.deepEqual(scrollEvents(0, 0.3), ["enter"]);
    assert.deepEqual(scrollEvents(0.3, 1), ["leave"]);
    assert.deepEqual(scrollEvents(1, 0.6), ["enterBack"]);
    assert.deepEqual(scrollEvents(0.4, 0), ["leaveBack"]);
    assert.deepEqual(scrollEvents(0, 1), ["enter", "leave"]);
    assert.deepEqual(scrollEvents(1, 0), ["enterBack", "leaveBack"]);
    assert.deepEqual(scrollEvents(0.4, 0.6), []);
    assert.deepEqual(scrollEvents(0.5, 0.5), []);
  });

  it("smooths a scrub toward its target and then lands on it", () => {
    assert.equal(smoothProgress(0, 1, 0.016, 0), 1, "no smoothing follows exactly");
    const a = smoothProgress(0, 1, 0.1, 1);
    assert.ok(a > 0 && a < 0.2, `a tenth of a second closes about a tenth (${a})`);
    let p = 0;
    for (let i = 0; i < 600; i++) p = smoothProgress(p, 1, 1 / 60, 0.5);
    assert.equal(p, 1);
    assert.equal(scrubSmoothing(true), 0);
    assert.equal(scrubSmoothing(1.5), 1.5);
    assert.equal(scrubSmoothing(undefined), 0);
  });

  it("pin holds the layer for the length of the range, then lets it go", () => {
    const range = { startScroll: 100, endScroll: 500 };
    assert.equal(pinOffset(50, range), 0);
    assert.equal(pinOffset(300, range), 200);
    assert.equal(pinOffset(500, range), 400);
    assert.equal(pinOffset(900, range), 400, "after the range it scrolls away normally");
  });

  it("a triggered clip plays once on enter, and rewinds when you scroll back above it", () => {
    let s = advanceTriggered(initialTriggered(), 0, 0, 1000);
    assert.equal(triggeredTime(s, 5000, 1), 0, "not entered: its first frame");
    s = advanceTriggered(s, 0.2, 1000, 1000);
    assert.equal(triggeredTime(s, 1000, 1), 0);
    assert.equal(triggeredTime(s, 1400, 1), 0.4);
    assert.equal(triggeredTime(s, 9000, 1), 1, "stays at its end");
    s = advanceTriggered(s, 0.7, 2000, 1000);
    assert.equal(triggeredTime(s, 9000, 1), 1, "scrolling on doesn't replay it");
    s = advanceTriggered(s, 0, 3000, 1000);
    assert.equal(triggeredTime(s, 3500, 1), 0, "leave-back rewinds");
    s = advanceTriggered(s, 0.1, 4000, 1000);
    assert.equal(triggeredTime(s, 4250, 1), 0.25, "and it plays again");
    assert.ok(Math.abs(triggeredTime(s, 4400, 1, 0.3) - 0.1) < 1e-9, "a delay is taken off");
  });

  it("a page that already has the layer in view starts it, and one already past it finishes it", () => {
    const inView = advanceTriggered(initialTriggered(), 0.5, 7000, 1000);
    assert.equal(triggeredTime(inView, 7000, 1), 0);
    assert.equal(triggeredTime(inView, 7500, 1), 0.5);
    const past = advanceTriggered(initialTriggered(), 1, 7000, 1000);
    assert.equal(triggeredTime(past, 7000, 1), 1);
  });
});

const sceneDoc = (): MotionDocument => {
  const parallax = attachClip(hydrateClip({ name: "Parallax", type: "scroll", trigger: "scrollProgress", duration: 1, easing: "linear", scrollTrigger: { scrub: true }, tracks: [{ property: "transform.y", keyframes: [{ time: 0, value: 100 }, { time: 1, value: -100 }] }] }), "p");
  const reveal = attachClip(hydrateClip({ name: "Reveal", type: "entrance", trigger: "inView", duration: 0.5, easing: "linear", scrollTrigger: { start: "top 80%", end: "top 30%" }, tracks: [{ property: "appearance.opacity", keyframes: [{ time: 0, value: 0 }, { time: 0.5, value: 1 }] }] }), "r");
  return createDocumentFromLayers([box("p", 1000, 200), box("r", 1500, 100)], [parallax, reveal]);
};

/** A fake page: scroll position, viewport and layout boxes you set; records pins. */
const fakeHost = (doc: MotionDocument) => {
  const page = { scrollY: 0, viewportHeight: 800, boxes: { p: { top: 1000, height: 200 }, r: { top: 1500, height: 100 } } as Record<string, { top: number; height: number }>, pins: [] as Array<[string, number | null]> };
  const host: ScrollHost = { getDocument: () => doc, metrics: () => ({ scrollY: page.scrollY, viewportHeight: page.viewportHeight }), box: (id) => page.boxes[id] ?? null, setPin: (id, px) => page.pins.push([id, px]) };
  return { page, host };
};
const clipOf = (doc: MotionDocument, name: string) => Object.values(doc.clips).find((c) => c.name === name)!;

describe("Phase 81: the scroll driver", () => {
  it("finds the scroll-driven clips", () => {
    assert.deepEqual(scrollClips(sceneDoc()).map((c) => c.name).sort(), ["Parallax", "Reveal"]);
  });

  it("a scrubbed clip follows view progress exactly", () => {
    const doc = sceneDoc();
    const { page, host } = fakeHost(doc);
    const driver = new ScrollDriver(host);
    const parallax = clipOf(doc, "Parallax").id;
    const expected: Array<[number, number]> = [[0, 0], [200, 0], [700, 0.5], [1200, 1], [2000, 1]];
    for (const [scrollY, progress] of expected) {
      page.scrollY = scrollY;
      const update = driver.update({ now: 0, dt: 1 / 60 });
      assert.ok(Math.abs(update.clipTime[parallax] - progress) < 1e-9, `scroll ${scrollY}: ${update.clipTime[parallax]} vs ${progress}`);
    }
    assert.deepEqual(scrollStore.getState().progress.p, 1);
  });

  it("the kernel plays it: 5 scroll positions match evaluate() at the clip time", () => {
    const doc = sceneDoc();
    const { page, host } = fakeHost(doc);
    const driver = new ScrollDriver(host);
    const parallax = clipOf(doc, "Parallax").id;
    for (const [scrollY, y] of [[0, 100], [200, 100], [450, 50], [700, 0], [1200, -100]] as const) {
      page.scrollY = scrollY;
      const { clipTime } = driver.update({ now: 0, dt: 1 / 60 });
      const resolved = evaluate(doc, "comp_main", "p", 0, { scrollClipTime: clipTime });
      assert.ok(Math.abs((resolved["transform.y"] as number) - y) < 1e-6, `at ${scrollY}: ${resolved["transform.y"]}`);
      assert.ok(Math.abs(clipTime[parallax] - (100 - y) / 200) < 1e-9);
    }
  });

  it("without the driver a scroll clip does nothing (Design mode): the layer is as drawn", () => {
    const doc = sceneDoc();
    const resolved = evaluate(doc, "comp_main", "p", 0);
    assert.equal(resolved["transform.y"], undefined);
  });

  it("a triggered clip waits for its range, plays once and stays", () => {
    const doc = sceneDoc();
    const { page, host } = fakeHost(doc);
    const driver = new ScrollDriver(host);
    const reveal = clipOf(doc, "Reveal").id;
    page.scrollY = 0;
    assert.equal(driver.update({ now: 0, dt: 0.016 }).clipTime[reveal], 0, "above the range: its first frame (hidden)");
    page.scrollY = 700; // r.top 1500: start = 1500 - 640 = 860, end = 1500 - 240 = 1260
    assert.equal(driver.update({ now: 100, dt: 0.016 }).clipTime[reveal], 0);
    page.scrollY = 900;
    assert.equal(driver.update({ now: 200, dt: 0.016 }).clipTime[reveal], 0, "entered this frame");
    assert.ok(Math.abs(driver.update({ now: 450, dt: 0.016 }).clipTime[reveal] - 0.25) < 1e-9);
    assert.equal(driver.update({ now: 5000, dt: 0.016 }).clipTime[reveal], 0.5);
    page.scrollY = 0;
    assert.equal(driver.update({ now: 6000, dt: 0.016 }).clipTime[reveal], 0, "scrolled back above it: rewound");
  });

  it("reports a change only when something moved", () => {
    const doc = sceneDoc();
    const { page, host } = fakeHost(doc);
    const driver = new ScrollDriver(host);
    page.scrollY = 300;
    assert.equal(driver.update({ now: 0, dt: 0.016 }).changed, true);
    assert.equal(driver.update({ now: 16, dt: 0.016 }).changed, false, "same scroll, same time");
    page.scrollY = 301;
    assert.equal(driver.update({ now: 32, dt: 0.016 }).changed, true);
  });

  it("scrub smoothing makes the clip chase the scroll", () => {
    const doc = sceneDoc();
    const parallax = clipOf(doc, "Parallax");
    doc.clips[parallax.id] = { ...parallax, scrollTrigger: { scrub: 1 } };
    const { page, host } = fakeHost(doc);
    const driver = new ScrollDriver(host);
    page.scrollY = 0;
    driver.update({ now: 0, dt: 0.016 });
    page.scrollY = 1200;
    const first = driver.update({ now: 16, dt: 0.1 }).clipTime[parallax.id];
    assert.ok(first > 0 && first < 0.2, `one step does not jump (${first})`);
    let last = first;
    for (let i = 0; i < 600; i++) last = driver.update({ now: 32 + i * 16, dt: 1 / 60 }).clipTime[parallax.id];
    assert.equal(last, 1);
  });

  it("pins a layer for the length of its range, and puts it back on reset", () => {
    const doc = sceneDoc();
    const parallax = clipOf(doc, "Parallax");
    doc.clips[parallax.id] = { ...parallax, scrollTrigger: { scrub: true, start: "top top", end: "bottom top", pin: true } };
    const { page, host } = fakeHost(doc);
    const driver = new ScrollDriver(host);
    page.scrollY = 1100; // p.top 1000: range 1000..1200
    driver.update({ now: 0, dt: 0.016 });
    assert.deepEqual(page.pins.at(-1), ["p", 100]);
    page.scrollY = 5000;
    driver.update({ now: 16, dt: 0.016 });
    assert.deepEqual(page.pins.at(-1), ["p", 200]);
    driver.reset();
    assert.deepEqual(page.pins.at(-1), ["p", null]);
  });

  it("with no frame, scroll clips sit at their first frame", () => {
    const doc = sceneDoc();
    const { host } = fakeHost(doc);
    const driver = new ScrollDriver({ ...host, metrics: () => null });
    const update = driver.update({ now: 0, dt: 0.016 });
    assert.deepEqual(Object.values(update.clipTime), [0, 0]);
  });
});

describe("Phase 81: the stage engine feeds the driver, in Preview only", () => {
  it("puts scroll-driven values on the layers' elements when live, and takes them off when not", () => {
    const doc = sceneDoc();
    setDocument(doc);
    const writes = new Map<string, Map<string, string>>();
    const element = (id: string) => ({ style: { setProperty: (n: string, v: string) => (writes.get(id) ?? writes.set(id, new Map()).get(id)!).set(n, v), removeProperty: (n: string) => (writes.get(id)?.delete(n) ?? "") && "", getPropertyValue: (n: string) => writes.get(id)?.get(n) ?? "" } });
    const nodes = { p: element("p"), r: element("r") };
    const renderer = new StageRenderer();
    renderer.registry.get = ((id: string) => nodes[id as "p" | "r"]) as never;
    const { page, host } = fakeHost(doc);
    let live = false;
    const scheduler = new FrameScheduler(null);
    scheduler.setDeterministic(true, 0);
    const uninstall = installStageEngine(renderer, { scheduler, adapter: new StageAdapters({ waapi: false }), parity: false, scroll: { host, active: () => live } });
    scheduler.step(1 / 60);
    assert.equal(writes.get("p")?.get("transform") ?? "none", "none", "Design: untouched");
    live = true;
    page.scrollY = 450;
    scheduler.step(1 / 60);
    assert.equal(writes.get("p")?.get("transform"), "translate3d(0px, 50px, 0px)", "Preview: a quarter through the parallax is 50 px down from 100");
    assert.equal(writes.get("r")?.get("opacity"), "0", "the reveal waits at its first frame");
    live = false;
    scheduler.step(1 / 60);
    assert.equal(writes.get("p")?.get("transform"), "none", "leaving Preview puts the layer back to its base look");
    assert.equal(writes.get("r")?.get("opacity"), "1");
    uninstall();
  });
});

describe("Phase 81: motion.setScrollTrigger", () => {
  let off: () => void;
  beforeEach(() => {
    setDocument(sceneDoc());
    off = registerScrollCommands();
  });
  afterEach(() => off());

  it("sets the range, scrub and pin, keeping what it isn't given", () => {
    const id = clipOf(getDocument(), "Reveal").id;
    assert.equal(invokeCommand("motion.setScrollTrigger", { clipId: id, start: "top 90%", end: "top 40%" }), true);
    assert.deepEqual(getDocument().clips[id].scrollTrigger, { start: "top 90%", end: "top 40%" });
    invokeCommand("motion.setScrollTrigger", { clipId: id, scrub: 0.5, pin: true });
    assert.deepEqual(getDocument().clips[id].scrollTrigger, { start: "top 90%", end: "top 40%", scrub: 0.5, pin: true });
    invokeCommand("motion.setScrollTrigger", { clipId: id, clear: true });
    assert.equal(getDocument().clips[id].scrollTrigger, undefined);
  });

  it("refuses a position it can't read and a clip that isn't scroll-driven", () => {
    const id = clipOf(getDocument(), "Reveal").id;
    assert.equal(invokeCommand("motion.setScrollTrigger", { clipId: id, start: "soon" }), false);
    const hover = documentCommands.addClip("p", { name: "Lift", type: "hover", trigger: "hover", duration: 0.3, easing: "linear", enabled: true, tracks: [] } as never);
    invokeCommand("motion.setScrollTrigger", { clipId: hover, scrub: true });
    assert.equal(getDocument().clips[hover].scrollTrigger, undefined);
  });

  it("is one undo step", async () => {
    const { historyCommands } = await import("../../store/useDocumentStore");
    const id = clipOf(getDocument(), "Reveal").id;
    invokeCommand("motion.setScrollTrigger", { clipId: id, start: "top 90%" });
    historyCommands.undo();
    assert.deepEqual(getDocument().clips[id].scrollTrigger, { start: "top 80%", end: "top 30%" });
  });
});
