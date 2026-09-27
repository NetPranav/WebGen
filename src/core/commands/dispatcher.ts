"use client";

/**
 * The command bus's single keyboard entry point (ROADMAP Sub-Phase 43.1).
 * Installed once from `EditorShell.tsx`, replacing the ~7 independent
 * `window.addEventListener("keydown", ...)` listeners this phase found
 * scattered across the editor (EditorShell's own hardcoded if/else chain,
 * WhiteboardCanvas, MotionSequencer, BlueprintCanvas, StudioHeader,
 * ProjectHub, AssetDetailsInspector) — see the Phase 43 progress log.
 *
 * On every keydown, this normalizes the event and runs the first registered
 * command whose `keybinding` matches and whose `when` clause currently
 * passes. Because "exactly one focused region" holds (Sub-Phase 43.3), two
 * commands bound to the same key (Space in the canvas vs. Space in the
 * timeline) never both pass `when` at once, so first-match is unambiguous
 * in practice — this does not itself enforce uniqueness.
 */

import { getAllCommands } from "./registry";
import { getContextKeys, setTextEditing } from "./contextKeys";
import { isTextEditingTarget, normalizeShortcut } from "./normalize";

function handleKeyDown(e: KeyboardEvent): void {
  const normalized = normalizeShortcut(e);
  if (!normalized) return;

  const ctx = getContextKeys();
  for (const command of getAllCommands()) {
    if (!command.keybinding) continue;
    const bindings = Array.isArray(command.keybinding) ? command.keybinding : [command.keybinding];
    if (!bindings.includes(normalized)) continue;
    if (command.when && !command.when(ctx)) continue;
    e.preventDefault();
    void command.run();
    return;
  }
}

function handleFocusIn(e: FocusEvent): void {
  setTextEditing(isTextEditingTarget(e.target));
}

function handleFocusOut(e: FocusEvent): void {
  // A focusout to `null` (e.g. clicking the browser chrome) should also
  // clear textEditing; a focusout followed immediately by a focusin onto
  // another text field is corrected by that focusin, since it fires after.
  if (!isTextEditingTarget(e.relatedTarget)) setTextEditing(false);
}

/** Installs the command bus's keyboard dispatcher and text-editing tracking. Returns a cleanup function. */
export function installCommandDispatcher(target: Window = window): () => void {
  target.addEventListener("keydown", handleKeyDown);
  target.document.addEventListener("focusin", handleFocusIn);
  target.document.addEventListener("focusout", handleFocusOut);
  return () => {
    target.removeEventListener("keydown", handleKeyDown);
    target.document.removeEventListener("focusin", handleFocusIn);
    target.document.removeEventListener("focusout", handleFocusOut);
  };
}
