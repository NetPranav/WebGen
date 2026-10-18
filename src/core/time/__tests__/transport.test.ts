/**
 * Phase 54 gate: "frame stepping lands on exact frame times at 24, 30 and 60
 * fps (golden tests)", plus the transport's play, loop, shuttle and work-area
 * behaviour. The store is outside React, so every test drives it directly.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { advance, formatTimecode, frameToTime, getTransport, shuttleRate, snapToFrame, subscribeTransport, timeToFrame, transport } from "../transport";
import { installTransportCommands } from "../transportCommands";
import { getContextKeys, useContextKeysStore } from "../../commands/contextKeys";
import { getCommand, isCommandAvailable, runCommand } from "../../commands/registry";

const setup = (fps: number, duration = 5) => {
  transport.reset();
  transport.setComposition({ id: "comp_main", fps, duration });
};

describe("Phase 54: frame stepping is exact", () => {
  for (const fps of [24, 30, 60]) {
    it(`${fps} fps: N steps land on N / ${fps} seconds, forward and back`, () => {
      setup(fps);
      for (let n = 1; n <= fps * 2; n++) {
        transport.stepFrame(1);
        assert.equal(getTransport().time, n / fps, `frame ${n}`);
        assert.equal(timeToFrame(getTransport().time, fps), n);
      }
      for (let n = fps * 2 - 1; n >= 0; n--) {
        transport.stepFrame(-1);
        assert.equal(getTransport().time, n / fps, `back to frame ${n}`);
      }
    });
  }

  it("stepping from a mid-frame time goes to the neighbouring frame, not a fixed offset", () => {
    setup(30);
    transport.seek(0.1); // 3 frames
    transport.stepFrame(1);
    assert.equal(getTransport().time, 4 / 30);
    transport.seek(1.016); // 30.48 → nearest frame 30
    transport.stepFrame(1);
    assert.equal(getTransport().time, 31 / 30);
  });

  it("clamps to the composition and pauses playback", () => {
    setup(24, 1);
    transport.play();
    transport.stepFrame(-1);
    assert.equal(getTransport().time, 0);
    assert.equal(getTransport().playing, false);
    transport.seek(1);
    transport.stepFrame(1);
    assert.equal(getTransport().time, 1);
  });

  it("seekFrame, snapToFrame and frameToTime agree", () => {
    assert.equal(frameToTime(36, 24), 1.5);
    assert.equal(snapToFrame(1.51, 24), 1.5);
    setup(24);
    transport.seekFrame(48);
    assert.equal(getTransport().time, 2);
  });
});

describe("Phase 54: timecode", () => {
  it("formats MM:SS:FF from the frame count", () => {
    assert.equal(formatTimecode(0, 30), "00:00:00");
    assert.equal(formatTimecode(1.5, 30), "00:01:15");
    assert.equal(formatTimecode(61 + 12 / 24, 24), "01:01:12");
  });
});

describe("Phase 54: advancing time", () => {
  beforeEachSetup();

  it("one-shot playback stops at the work area's end", () => {
    transport.play();
    transport.tick(3);
    assert.equal(getTransport().time, 3);
    transport.tick(3);
    assert.equal(getTransport().time, 5);
    assert.equal(getTransport().playing, false);
  });

  it("playing again from the end restarts from the work area's start", () => {
    transport.seek(5);
    transport.play();
    assert.equal(getTransport().time, 0);
    assert.equal(getTransport().playing, true);
  });

  it("rate scales and reverses time", () => {
    transport.seek(4);
    transport.setRate(-2);
    transport.play();
    transport.tick(1);
    assert.equal(getTransport().time, 2);
    transport.tick(5);
    assert.equal(getTransport().time, 0);
    assert.equal(getTransport().playing, false);
  });

  it("loop wraps inside the work area, however large dt is", () => {
    transport.setWorkArea({ start: 1, end: 3 });
    transport.setLoop("loop");
    transport.seek(2.5);
    transport.play();
    transport.tick(1);
    assert.equal(getTransport().time, 1.5);
    transport.tick(10.5);
    assert.equal(getTransport().time, 2);
    assert.equal(getTransport().playing, true);
  });

  it("ping-pong reflects at both ends and tracks the direction", () => {
    transport.setLoop("ping-pong");
    transport.seek(4);
    transport.play();
    transport.tick(2); // 4 → 5 → back to 4
    assert.equal(getTransport().time, 4);
    assert.equal(getTransport().direction, -1);
    transport.tick(4.5); // 4 → 0 → 0.5
    assert.equal(getTransport().time, 0.5);
    assert.equal(getTransport().direction, 1);
  });

  it("is a pure function of state and dt", () => {
    const s = { ...getTransport(), playing: true, loop: "ping-pong" as const, time: 1.25 };
    assert.deepEqual(advance(s, 0.7), advance(s, 0.7));
    assert.deepEqual(advance({ ...s, playing: false }, 9), { time: 1.25, playing: false, direction: 1 });
  });

  it("ignores ticks while paused and non-positive dt", () => {
    transport.tick(1);
    assert.equal(getTransport().time, 0);
    transport.play();
    transport.tick(0);
    transport.tick(-1);
    assert.equal(getTransport().time, 0);
  });
});

describe("Phase 54: J / K / L shuttle", () => {
  beforeEachSetup();

  it("L climbs the ladder 1 → 2 → 4 → 8 and stays at 8", () => {
    const rates: number[] = [];
    for (let i = 0; i < 5; i++) {
      transport.shuttle("forward");
      rates.push(getTransport().rate);
    }
    assert.deepEqual(rates, [1, 2, 4, 8, 8]);
    assert.equal(getTransport().playing, true);
  });

  it("J from a stop plays reverse at -1x, and slowing past 1x stops instead of reversing", () => {
    transport.seek(3);
    transport.shuttle("reverse");
    assert.equal(getTransport().rate, -1);
    assert.equal(getTransport().playing, true);
    transport.shuttle("forward"); // -1 → stop
    assert.equal(getTransport().playing, false);
    assert.equal(getTransport().rate, 1);
  });

  it("opposite key slows a faster shuttle one rung", () => {
    transport.shuttle("forward");
    transport.shuttle("forward");
    transport.shuttle("forward");
    assert.equal(getTransport().rate, 4);
    transport.shuttle("reverse");
    assert.equal(getTransport().rate, 2);
  });

  it("K stops and resets to 1x", () => {
    transport.shuttle("forward");
    transport.shuttle("forward");
    transport.stopShuttle();
    assert.equal(getTransport().playing, false);
    assert.equal(getTransport().rate, 1);
  });

  it("shuttleRate is total over its input", () => {
    assert.equal(shuttleRate(3, true, 1), 1, "an off-ladder rate restarts at 1x in the pressed direction");
    assert.equal(shuttleRate(8, true, 1), 8);
    assert.equal(shuttleRate(-8, true, -1), -8);
    assert.equal(shuttleRate(1, false, -1), -1);
  });
});

describe("Phase 54: work area and composition", () => {
  beforeEachSetup();

  it("keeps the work area inside the composition and at least one frame long", () => {
    transport.setWorkArea({ start: -2, end: 99 });
    assert.deepEqual(getTransport().workArea, { start: 0, end: 5 });
    transport.setWorkArea({ start: 2, end: 2 });
    assert.deepEqual(getTransport().workArea, { start: 2, end: 2 + 1 / 30 });
    transport.setWorkArea({ start: 5, end: 5 });
    assert.ok(getTransport().workArea.end > getTransport().workArea.start);
  });

  it("switching composition resets the head and stops; the same composition keeps the head inside bounds", () => {
    transport.seek(4);
    transport.play();
    transport.setComposition({ id: "comp_main", fps: 24, duration: 3 });
    assert.equal(getTransport().time, 3);
    assert.equal(getTransport().playing, true);
    transport.setComposition({ id: "comp_hover", fps: 60, duration: 1 });
    assert.equal(getTransport().time, 0);
    assert.equal(getTransport().playing, false);
  });

  it("notifies subscribers with the previous state", () => {
    const seen: [number, number][] = [];
    const unsubscribe = subscribeTransport((s, prev) => seen.push([prev.time, s.time]));
    transport.seek(1);
    transport.seek(2);
    unsubscribe();
    transport.seek(3);
    assert.deepEqual(seen, [[0, 1], [1, 2]]);
  });
});

describe("Phase 54: commands", () => {
  beforeEachSetup();

  it("registers the transport commands, mirrors `playing` into the context key, and unregisters", () => {
    useContextKeysStore.setState({ canvasFocus: false, timelineFocus: true, textEditing: false, "transport.playing": false });
    const uninstall = installTransportCommands();
    for (const id of ["transport.togglePlay", "transport.stepForward", "transport.shuttleForward", "transport.shuttleStop", "transport.shuttleReverse"]) {
      assert.ok(getCommand(id), id);
    }
    assert.equal(runCommand("transport.togglePlay"), true);
    assert.equal(getContextKeys()["transport.playing"], true);
    runCommand("transport.stepForward");
    assert.equal(getContextKeys()["transport.playing"], false);
    assert.equal(getTransport().time, 1 / 30);
    uninstall();
    assert.equal(getCommand("transport.togglePlay"), undefined);
  });

  it("the J / K / L and step keys do not fire while a text field is being edited", () => {
    const uninstall = installTransportCommands();
    const ctx = { ...getContextKeys(), timelineFocus: true, canvasFocus: false, textEditing: true };
    assert.equal(isCommandAvailable(getCommand("transport.shuttleForward")!, ctx), false);
    assert.equal(isCommandAvailable(getCommand("transport.stepForward")!, ctx), false);
    assert.equal(isCommandAvailable(getCommand("transport.shuttleForward")!, { ...ctx, textEditing: false }), true);
    uninstall();
  });
});

function beforeEachSetup() {
  beforeEach(() => setup(30));
}
