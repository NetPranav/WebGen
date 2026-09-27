import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeShortcut, isTextEditingTarget, formatKeybinding } from "../normalize";

describe("Sub-Phase 43.1: Shortcut Normalization", () => {
  it("normalizes case-insensitive string shortcuts into canonical order", () => {
    assert.strictEqual(normalizeShortcut("ctrl+s"), "Ctrl+S");
    assert.strictEqual(normalizeShortcut("cmd+shift+p"), "Ctrl+Shift+P");
    assert.strictEqual(normalizeShortcut("meta+alt+enter"), "Ctrl+Alt+Enter");
    assert.strictEqual(normalizeShortcut("shift+ctrl+d"), "Ctrl+Shift+D");
    assert.strictEqual(normalizeShortcut("escape"), "Escape");
    assert.strictEqual(normalizeShortcut("space"), "Space");
  });

  it("normalizes KeyboardEvent objects into canonical shortcut strings", () => {
    const mockEvent1 = {
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: true,
      key: "f",
    } as unknown as KeyboardEvent;
    assert.strictEqual(normalizeShortcut(mockEvent1), "Ctrl+Shift+F");

    const mockEvent2 = {
      ctrlKey: false,
      metaKey: true, // Mac Command
      altKey: false,
      shiftKey: false,
      key: "p",
    } as unknown as KeyboardEvent;
    assert.strictEqual(normalizeShortcut(mockEvent2), "Ctrl+P");

    // The DOM reports the spacebar's `key` as a literal space character —
    // this must normalize to the same "Space" that the string form
    // (normalizeShortcut("space")) produces, or a Command registered with
    // keybinding: "Space" would never match a real spacebar press.
    const spaceEvent = {
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      key: " ",
    } as unknown as KeyboardEvent;
    assert.strictEqual(normalizeShortcut(spaceEvent), "Space");
  });

  it("isTextEditingTarget recognizes inputs, textareas and contentEditable, but not select", () => {
    assert.strictEqual(isTextEditingTarget({ tagName: "INPUT", isContentEditable: false } as unknown as EventTarget), true);
    assert.strictEqual(isTextEditingTarget({ tagName: "TEXTAREA", isContentEditable: false } as unknown as EventTarget), true);
    // Deliberately false: a native <select> keeps focus after a choice, and
    // edit.undo/edit.redo (global, gate on !textEditing) must keep working
    // right after using any dropdown anywhere in the app. See normalize.ts.
    assert.strictEqual(isTextEditingTarget({ tagName: "SELECT", isContentEditable: false } as unknown as EventTarget), false);
    assert.strictEqual(isTextEditingTarget({ tagName: "DIV", isContentEditable: true } as unknown as EventTarget), true);
    assert.strictEqual(isTextEditingTarget({ tagName: "DIV", isContentEditable: false } as unknown as EventTarget), false);
    assert.strictEqual(isTextEditingTarget(null), false);
  });

  it("formatKeybinding renders a single binding as-is and several joined", () => {
    assert.strictEqual(formatKeybinding("Ctrl+S"), "Ctrl+S");
    assert.strictEqual(formatKeybinding(["Ctrl+Shift+Z", "Ctrl+Y"]), "Ctrl+Shift+Z / Ctrl+Y");
    assert.strictEqual(formatKeybinding(undefined), undefined);
  });
});
