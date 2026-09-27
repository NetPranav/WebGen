import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installCommandDispatcher } from "../dispatcher";
import { defineCommand } from "../registry";
import { useContextKeysStore } from "../contextKeys";

/**
 * `installCommandDispatcher` takes an injectable target instead of always
 * using the real `window`, specifically so it's testable without jsdom (this
 * project has none — see Sub-Phase 41.3's documented substitution for the
 * same reason). This fake implements only what the dispatcher calls:
 * `addEventListener`/`removeEventListener` on itself and on `.document`.
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
    fireFocusIn(target: unknown) {
      for (const handler of documentListeners.get("focusin") ?? []) handler({ target });
    },
    fireFocusOut(target: unknown, relatedTarget: unknown = null) {
      for (const handler of documentListeners.get("focusout") ?? []) handler({ target, relatedTarget });
    },
  };
}

describe("Sub-Phase 43.1: Command Dispatcher", () => {
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

  it("resolves a keydown to the matching command and prevents default", () => {
    const fake = createFakeWindow();
    const uninstall = installCommandDispatcher(fake.window);

    let ran = false;
    const unregister = defineCommand({
      id: "test.dispatch.save",
      title: "Save",
      keybinding: "Ctrl+S",
      run: () => {
        ran = true;
      },
    });

    let prevented = false;
    fake.fireKeyDown({ ctrlKey: true, key: "s", preventDefault: () => (prevented = true) } as Partial<KeyboardEvent>);

    assert.strictEqual(ran, true);
    assert.strictEqual(prevented, true);

    unregister();
    uninstall();
  });

  it("routes the same keybinding to whichever command's `when` currently passes", () => {
    const fake = createFakeWindow();
    const uninstall = installCommandDispatcher(fake.window);

    let canvasRan = false;
    let timelineRan = false;
    const unregisterCanvas = defineCommand({
      id: "test.dispatch.space_canvas",
      title: "Canvas Space",
      keybinding: "Space",
      when: (ctx) => ctx.canvasFocus,
      run: () => (canvasRan = true),
    });
    const unregisterTimeline = defineCommand({
      id: "test.dispatch.space_timeline",
      title: "Timeline Space",
      keybinding: "Space",
      when: (ctx) => ctx.timelineFocus,
      run: () => (timelineRan = true),
    });

    useContextKeysStore.setState({ canvasFocus: true });
    fake.fireKeyDown({ key: " " });
    assert.strictEqual(canvasRan, true);
    assert.strictEqual(timelineRan, false);

    useContextKeysStore.setState({ canvasFocus: false, timelineFocus: true });
    fake.fireKeyDown({ key: " " });
    assert.strictEqual(timelineRan, true);

    unregisterCanvas();
    unregisterTimeline();
    uninstall();
  });

  it("does not run a command whose `when` clause fails, and does not preventDefault", () => {
    const fake = createFakeWindow();
    const uninstall = installCommandDispatcher(fake.window);

    let ran = false;
    const unregister = defineCommand({
      id: "test.dispatch.blueprint_only",
      title: "Blueprint Only",
      keybinding: "Delete",
      when: (ctx) => ctx.blueprintFocus,
      run: () => (ran = true),
    });

    let prevented = false;
    fake.fireKeyDown({ key: "Delete", preventDefault: () => (prevented = true) } as Partial<KeyboardEvent>);

    assert.strictEqual(ran, false);
    assert.strictEqual(prevented, false);

    unregister();
    uninstall();
  });

  it("tracks textEditing from document focusin/focusout", () => {
    const fake = createFakeWindow();
    const uninstall = installCommandDispatcher(fake.window);

    assert.strictEqual(useContextKeysStore.getState().textEditing, false);

    fake.fireFocusIn({ tagName: "INPUT", isContentEditable: false });
    assert.strictEqual(useContextKeysStore.getState().textEditing, true);

    fake.fireFocusOut({ tagName: "INPUT", isContentEditable: false }, null);
    assert.strictEqual(useContextKeysStore.getState().textEditing, false);

    uninstall();
  });
});
