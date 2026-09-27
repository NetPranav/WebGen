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
