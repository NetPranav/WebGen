import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { defineCommand, getCommand, getAllCommands, isCommandAvailable, runCommand } from "../registry";
import { useContextKeysStore } from "../contextKeys";
import type { Command } from "../types";

describe("Sub-Phase 43.1: Command Registry", () => {
  beforeEach(() => {
    // Registered test commands persist on the shared module-level Map across
    // tests (by design — panels register once and stay registered for their
    // lifetime); each test uses a unique id and cleans up via its unregister
    // function so tests don't leak into each other.
    useContextKeysStore.setState({
      canvasFocus: false,
      timelineFocus: false,
      blueprintFocus: false,
      textEditing: false,
      "selection.count": 0,
      "transport.playing": false,
    });
  });

  it("registers a command and finds it by id", () => {
    let ran = false;
    const unregister = defineCommand({
      id: "test.basic",
      title: "Basic Test Command",
      run: () => {
        ran = true;
      },
    });

    const found = getCommand("test.basic");
    assert.ok(found);
    assert.strictEqual(found.title, "Basic Test Command");
    assert.ok(getAllCommands().some((c) => c.id === "test.basic"));

    runCommand("test.basic");
    assert.strictEqual(ran, true);

    unregister();
    assert.strictEqual(getCommand("test.basic"), undefined);
  });

  it("runCommand returns false for an unregistered id and does nothing", () => {
    const result = runCommand("test.does_not_exist");
    assert.strictEqual(result, false);
  });

  it("re-registering the same id replaces the previous command", () => {
    let firstRan = false;
    let secondRan = false;
    const unregister1 = defineCommand({ id: "test.replace", title: "First", run: () => (firstRan = true) });
    const unregister2 = defineCommand({ id: "test.replace", title: "Second", run: () => (secondRan = true) });

    runCommand("test.replace");
    assert.strictEqual(firstRan, false);
    assert.strictEqual(secondRan, true);
    assert.strictEqual(getCommand("test.replace")?.title, "Second");

    // The first registration's unregister must not remove the second
    // command that has since taken its id (a stale cleanup running late,
    // e.g. an unmounting panel, must not undo a still-mounted one's command).
    unregister1();
    assert.ok(getCommand("test.replace"), "the second registration must survive the first's cleanup");

    unregister2();
    assert.strictEqual(getCommand("test.replace"), undefined);
  });

  it("`when` gates both isCommandAvailable and runCommand", () => {
    let ran = false;
    const command: Command = {
      id: "test.when_gated",
      title: "Gated Command",
      when: (ctx) => ctx.canvasFocus,
      run: () => {
        ran = true;
      },
    };
    const unregister = defineCommand(command);

    assert.strictEqual(isCommandAvailable(command), false);
    assert.strictEqual(runCommand("test.when_gated"), false);
    assert.strictEqual(ran, false);

    useContextKeysStore.setState({ canvasFocus: true });
    assert.strictEqual(isCommandAvailable(command), true);
    assert.strictEqual(runCommand("test.when_gated"), true);
    assert.strictEqual(ran, true);

    unregister();
  });

  it("two commands can share a keybinding when their `when` clauses are mutually exclusive", () => {
    // This is the actual Space-in-canvas-vs-Space-in-timeline shape: no
    // conflict rejection at registration time (unlike the old
    // ShortcutRegistry) — `when` clauses are what disambiguate them.
    let canvasRan = false;
    let timelineRan = false;
    const unregisterCanvas = defineCommand({
      id: "test.space_canvas",
      title: "Canvas Space",
      keybinding: "Space",
      when: (ctx) => ctx.canvasFocus,
      run: () => {
        canvasRan = true;
      },
    });
    const unregisterTimeline = defineCommand({
      id: "test.space_timeline",
      title: "Timeline Space",
      keybinding: "Space",
      when: (ctx) => ctx.timelineFocus,
      run: () => {
        timelineRan = true;
      },
    });

    useContextKeysStore.setState({ timelineFocus: true });
    assert.strictEqual(runCommand("test.space_canvas"), false);
    assert.strictEqual(runCommand("test.space_timeline"), true);
    assert.strictEqual(canvasRan, false);
    assert.strictEqual(timelineRan, true);

    unregisterCanvas();
    unregisterTimeline();
  });

  it("getCommand(id)?.run() executes even when `when` would fail, unlike runCommand", () => {
    // This is the exact mechanism CommandPalette.tsx's handleExecute relies
    // on: `onClose()` only schedules the palette's unmount, so its search
    // input is still focused (textEditing still true) at the instant a
    // clicked item's command would run. A command like edit.undo/edit.redo
    // (`when: !textEditing`) would silently no-op through `runCommand` here —
    // availability was already decided when the palette's list was built, so
    // execution must bypass `when`, not re-check it.
    let ran = false;
    const unregister = defineCommand({
      id: "test.palette_execute",
      title: "Palette Execute",
      when: (ctx) => !ctx.textEditing,
      run: () => {
        ran = true;
      },
    });

    useContextKeysStore.setState({ textEditing: true });
    assert.strictEqual(runCommand("test.palette_execute"), false);
    assert.strictEqual(ran, false);

    getCommand("test.palette_execute")?.run();
    assert.strictEqual(ran, true);

    unregister();
  });
});

import { z } from "zod";
import { tryRunCommand, invokeCommand } from "../registry";

describe("Phase 13: typed command arguments", () => {
  it("validates args against the schema and passes the parsed value to run", () => {
    let received: unknown;
    const unregister = defineCommand({
      id: "test.typed.move",
      title: "Move",
      args: z.object({ dx: z.number(), dy: z.number().default(0) }),
      result: z.object({ moved: z.boolean() }),
      run: (a) => {
        received = a;
        return { moved: true };
      },
    });
    const ok = tryRunCommand("test.typed.move", { dx: 5 });
    assert.deepEqual(ok, { ok: true, result: { moved: true } });
    assert.deepEqual(received, { dx: 5, dy: 0 });
    unregister();
  });

  it("refuses invalid args without running, and says why", () => {
    let ran = false;
    const unregister = defineCommand({
      id: "test.typed.reject",
      title: "Reject",
      args: z.object({ id: z.string() }),
      run: () => void (ran = true),
    });
    const outcome = tryRunCommand("test.typed.reject", { id: 7 });
    assert.equal(outcome.ok, false);
    assert.equal(outcome.ok === false && outcome.reason, "invalid-args");
    assert.equal(ran, false);
    assert.equal(runCommand("test.typed.reject", {}), false);
    assert.equal(invokeCommand("test.typed.reject", { id: 7 }), false);
    unregister();
  });

  it("rejects a result that breaks the declared schema, and reports a throwing command", () => {
    const u1 = defineCommand({ id: "test.typed.badresult", title: "Bad", result: z.number(), run: () => "nope" });
    const u2 = defineCommand({ id: "test.typed.throws", title: "Throws", run: () => { throw new Error("boom"); } });
    const bad = tryRunCommand("test.typed.badresult");
    assert.equal(bad.ok === false && bad.reason, "invalid-result");
    const thrown = tryRunCommand("test.typed.throws");
    assert.deepEqual(thrown, { ok: false, reason: "threw", message: "boom" });
    u1();
    u2();
  });

  it("reports unknown and unavailable commands distinctly", () => {
    const unregister = defineCommand({ id: "test.typed.gated", title: "Gated", when: (c) => c.canvasFocus, run: () => 1 });
    assert.equal(tryRunCommand("test.typed.nope").ok === false && (tryRunCommand("test.typed.nope") as { reason: string }).reason, "unknown-command");
    const gated = tryRunCommand("test.typed.gated");
    assert.equal(gated.ok === false && gated.reason, "unavailable");
    unregister();
  });
});
