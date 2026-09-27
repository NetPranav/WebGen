import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installGlobalCommands } from "../globalCommands";
import { getCommand, isCommandAvailable } from "../registry";
import { useContextKeysStore } from "../contextKeys";

/**
 * Minimal fake `Window` — same shape as dispatcher.test.ts's, since
 * `installGlobalCommands` installs the real dispatcher under the hood.
 */
function createFakeWindow() {
  const listeners = new Map<string, Set<(e: unknown) => void>>();
  const documentListeners = new Map<string, Set<(e: unknown) => void>>();

  const fakeWindow = {
    addEventListener(type: string, handler: (e: unknown) => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(handler);
    },
    removeEventListener(type: string, handler: (e: unknown) => void) {
      listeners.get(type)?.delete(handler);
    },
    document: {
      addEventListener(type: string, handler: (e: unknown) => void) {
        if (!documentListeners.has(type)) documentListeners.set(type, new Set());
        documentListeners.get(type)!.add(handler);
      },
      removeEventListener(type: string, handler: (e: unknown) => void) {
        documentListeners.get(type)?.delete(handler);
      },
    },
  };

  return {
    window: fakeWindow as unknown as Window,
    fireKeyDown(event: Partial<KeyboardEvent>) {
      const full = { preventDefault: () => {}, target: null, ...event };
      for (const handler of listeners.get("keydown") ?? []) handler(full);
      return full;
    },
  };
}

describe("Sub-Phase 43.1: Global Commands (shared by EditorShell and detached panels)", () => {
  beforeEach(() => {
    useContextKeysStore.setState({
      canvasFocus: false,
      timelineFocus: false,
      blueprintFocus: false,
      textEditing: false,
      "selection.count": 0,
      "transport.playing": false,
    });
  });

  it("registers edit.undo, edit.redo and file.save, and installs a working dispatcher", () => {
    const fake = createFakeWindow();
    const uninstall = installGlobalCommands(fake.window);

    assert.ok(getCommand("edit.undo"));
    assert.ok(getCommand("edit.redo"));
    assert.ok(getCommand("file.save"));

    // The dispatcher these three commands need to ever fire is installed by
    // the same call — a detached panel's tab has no `EditorShell` to install
    // it separately, so without this bundling it would register commands
    // nothing ever dispatches to.
    let prevented = false;
    fake.fireKeyDown({ ctrlKey: true, key: "z", preventDefault: () => (prevented = true) });
    assert.strictEqual(prevented, true);

    uninstall();
    assert.strictEqual(getCommand("edit.undo"), undefined);
  });

  it("file.save yields to a blueprint-focused save so the two don't race on registration order", () => {
    const fake = createFakeWindow();
    const uninstall = installGlobalCommands(fake.window);

    assert.strictEqual(
      isCommandAvailable(getCommand("file.save")!, { blueprintFocus: false, textEditing: false } as never),
      true
    );
    assert.strictEqual(
      isCommandAvailable(getCommand("file.save")!, { blueprintFocus: true, textEditing: false } as never),
      false
    );

    uninstall();
  });

  it("file.save still fires when blueprint is focused AND a text field elsewhere has focus, so Ctrl+S never falls through to neither command", () => {
    // Regression: blueprint.save requires `blueprintFocus && !textEditing`. A
    // naive `file.save` gate of just `!blueprintFocus` leaves a gap where
    // BOTH keys are true (e.g. editing a pin value with the pointer over the
    // graph) and neither command matches, so the dispatcher never calls
    // preventDefault and the browser's native Save Page dialog opens.
    const fake = createFakeWindow();
    const uninstall = installGlobalCommands(fake.window);

    assert.strictEqual(
      isCommandAvailable(getCommand("file.save")!, { blueprintFocus: true, textEditing: true } as never),
      true
    );

    uninstall();
  });
});
