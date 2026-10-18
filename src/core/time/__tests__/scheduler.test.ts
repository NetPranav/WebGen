/**
 * Phase 55 gate (unit half): ordered phases, one loop, errors contained, and a
 * deterministic mode driven only by `step`. The browser half is
 * `tests/e2e/deterministic-clock.spec.ts` case 3.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { FRAME_PHASES, FrameScheduler, MAX_FRAME_GAP, type SchedulerEnvironment } from "../scheduler";
import { getTransport, transport } from "../transport";
import { installTransportDriver } from "../transportDriver";

/** A manual frame source: `fire(ms)` runs the one pending callback at that timestamp. */
function manualEnvironment() {
  let pending: ((now: number) => void) | null = null;
  let requests = 0;
  const env: SchedulerEnvironment = {
    now: () => 0,
    request: (cb) => {
      requests++;
      pending = cb;
      return requests;
    },
    cancel: () => {
      pending = null;
    },
  };
  return {
    env,
    get requests() {
      return requests;
    },
    get pending() {
      return pending !== null;
    },
    fire(now: number) {
      const cb = pending;
      pending = null;
      cb?.(now);
    },
  };
}

describe("Phase 55: phases and ordering", () => {
  it("runs input → evaluate → apply → render → overlay → stats, whatever the registration order", () => {
    const m = manualEnvironment();
    const s = new FrameScheduler(m.env);
    const order: string[] = [];
    for (const phase of [...FRAME_PHASES].reverse()) s.register(phase, () => order.push(phase));
    m.fire(16);
    assert.deepEqual(order, [...FRAME_PHASES]);
  });

  it("runs tasks within a phase in registration order, and a task registered mid-frame starts next frame", () => {
    const m = manualEnvironment();
    const s = new FrameScheduler(m.env);
    const seen: string[] = [];
    s.register("render", () => {
      seen.push("a");
      s.register("render", () => seen.push("late"));
    });
    s.register("render", () => seen.push("b"));
    m.fire(0);
    assert.deepEqual(seen, ["a", "b"]);
    m.fire(16);
    assert.deepEqual(seen, ["a", "b", "a", "b", "late"]);
  });

  it("a throwing task is counted and skipped; the rest of the frame still runs", () => {
    const m = manualEnvironment();
    const s = new FrameScheduler(m.env);
    const ran: string[] = [];
    const log = console.error;
    console.error = () => {};
    try {
      s.register("evaluate", () => {
        throw new Error("boom");
      });
      s.register("evaluate", () => ran.push("after"));
      s.register("overlay", () => ran.push("overlay"));
      m.fire(0);
    } finally {
      console.error = log;
    }
    assert.deepEqual(ran, ["after", "overlay"]);
    assert.equal(s.stats.taskErrors, 1);
  });
});

describe("Phase 55: one loop that runs only when needed", () => {
  it("requests no frame until a task exists, keeps exactly one pending, and stops when the last task leaves", () => {
    const m = manualEnvironment();
    const s = new FrameScheduler(m.env);
    assert.equal(m.requests, 0);
    const offA = s.register("apply", () => {});
    const offB = s.register("render", () => {});
    assert.equal(m.requests, 1, "two tasks share one request");
    m.fire(16);
    assert.equal(m.requests, 2);
    offA();
    assert.equal(m.pending, true);
    offB();
    assert.equal(m.pending, false, "the loop stops with no tasks");
    s.register("apply", () => {});
    assert.equal(m.pending, true, "and restarts when one returns");
  });

  it("dt is seconds since the previous frame: 0 first, clamped when the gap is huge, never negative", () => {
    const m = manualEnvironment();
    const s = new FrameScheduler(m.env);
    const dts: number[] = [];
    s.register("input", (f) => dts.push(f.dt));
    m.fire(1000);
    m.fire(1016);
    m.fire(9000); // the tab was hidden
    m.fire(100); // the clock was replaced by a test clock that started again near 0
    m.fire(116);
    assert.deepEqual(dts.map((d) => Math.round(d * 1000) / 1000), [0, 0.016, MAX_FRAME_GAP, 0, 0.016]);
  });

  it("counts frames and smooths an fps estimate from the real gaps", () => {
    const m = manualEnvironment();
    const s = new FrameScheduler(m.env);
    s.register("stats", () => {});
    for (let i = 0; i < 10; i++) m.fire(i * 20);
    assert.equal(s.stats.frames, 10);
    assert.ok(Math.abs(s.stats.fps - 50) < 1e-6, `fps ${s.stats.fps}`);
  });

  it("is inert without a browser (no environment): registering never throws", () => {
    const s = new FrameScheduler(null);
    s.register("render", () => {})();
    assert.equal(s.stats.running, false);
  });
});

describe("Phase 55: deterministic mode", () => {
  it("stops the loop; only step() runs frames, on a virtual clock with exact dt", () => {
    const m = manualEnvironment();
    const s = new FrameScheduler(m.env);
    const frames: { now: number; dt: number; frame: number }[] = [];
    s.register("evaluate", (f) => frames.push(f));
    s.setDeterministic(true, 1000);
    assert.equal(m.pending, false);
    s.step(0.5);
    s.step(0.25);
    assert.deepEqual(frames, [{ now: 1500, dt: 0.5, frame: 1 }, { now: 1750, dt: 0.25, frame: 2 }]);
    s.setDeterministic(false);
    assert.equal(m.pending, true, "real frames resume");
  });

  it("step() outside deterministic mode is an error, not a silent extra frame", () => {
    assert.throws(() => new FrameScheduler(manualEnvironment().env).step(0.016), /deterministic/);
  });

  it("the same step script gives the same transport time, every run", () => {
    const run = () => {
      transport.reset();
      transport.setComposition({ id: "comp_main", fps: 60, duration: 10 });
      const s = new FrameScheduler(manualEnvironment().env);
      s.setDeterministic(true);
      const off = installTransportDriver(s);
      transport.play();
      for (let i = 0; i < 25; i++) s.step(0.016);
      off();
      return getTransport().time;
    };
    const first = run();
    assert.equal(run(), first);
    assert.ok(Math.abs(first - 0.4) < 1e-9, `25 × 16 ms = 0.4 s, got ${first}`);
  });
});

describe("Phase 55: the transport driver", () => {
  beforeEach(() => {
    transport.reset();
    transport.setComposition({ id: "comp_main", fps: 30, duration: 5 });
  });

  it("advances the transport in the evaluate phase, before apply and render read it", () => {
    const s = new FrameScheduler(null);
    s.setDeterministic(true);
    const off = installTransportDriver(s);
    const seenAtApply: number[] = [];
    s.register("apply", () => seenAtApply.push(getTransport().time));
    transport.play();
    s.step(1);
    s.step(1);
    off();
    assert.deepEqual(seenAtApply, [1, 2]);
  });

  it("does not move a paused transport", () => {
    const s = new FrameScheduler(null);
    s.setDeterministic(true);
    const off = installTransportDriver(s);
    s.step(1);
    off();
    assert.equal(getTransport().time, 0);
  });
});

describe("Phase 55: wake", () => {
  it("replaces a lost frame request, and playback starting wakes the scheduler", () => {
    const m = manualEnvironment();
    const s = new FrameScheduler(m.env);
    s.register("apply", () => {});
    assert.equal(m.requests, 1);
    s.wake(); // as if the page's rAF had been swapped and the pending request lost
    assert.equal(m.requests, 2);
    assert.equal(m.pending, true);

    transport.reset();
    const off = installTransportDriver(s);
    const before = m.requests;
    transport.play();
    assert.equal(m.requests, before + 1);
    off();
    transport.reset();
  });
});
