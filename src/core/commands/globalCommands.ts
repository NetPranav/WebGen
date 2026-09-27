"use client";

/**
 * ============================================================================
 * GLOBAL EDITING COMMANDS (Sub-Phase 43.1)
 * ============================================================================
 * `edit.undo` / `edit.redo` / `file.save` only touch module-level singletons
 * (`historyCommands`, `projectSession`), so they're valid in ANY window that
 * has the app's JS loaded — not just the main `EditorShell` tree. Detached
 * panels (`/editor/detach/[panelId]`) render in a separate browser tab with
 * their own module registry and no `EditorShell`, so without this they'd
 * have no dispatcher and no undo/redo/save at all (the raw keydown listeners
 * this phase replaced used to cover that; this is what replaces them there).
 * `installGlobalCommands` bundles these three with `installCommandDispatcher`
 * so a caller can't install one without the other and end up with commands
 * that are registered but never dispatched, or a dispatcher with nothing to
 * dispatch to.
 * ============================================================================
 */

import { historyCommands } from "@/core/store/useDocumentStore";
import { projectSession } from "@/core/storage/ProjectSession";
import { defineCommand } from "./registry";
import { installCommandDispatcher } from "./dispatcher";

export function installGlobalCommands(target: Window = window): () => void {
  const unregisters = [
    defineCommand({
      id: "edit.undo",
      title: "Undo",
      category: "Edit",
      keybinding: "Ctrl+Z",
      when: (ctx) => !ctx.textEditing,
      run: () => historyCommands.undo(),
    }),
    defineCommand({
      id: "edit.redo",
      title: "Redo",
      category: "Edit",
      keybinding: ["Ctrl+Shift+Z", "Ctrl+Y"],
      when: (ctx) => !ctx.textEditing,
      run: () => historyCommands.redo(),
    }),
    defineCommand({
      id: "file.save",
      title: "Save Project",
      category: "File",
      keybinding: "Ctrl+S",
      // The dispatcher runs only the first matching command whose `when`
      // passes, not every match — so a plain second "also fires on Ctrl+S"
      // command bound while blueprint is focused would never actually run
      // once this one (which has no `when` of its own) is registered.
      // `blueprint.save` covers the project flush itself in that case, and
      // wins deterministically via this `when` rather than depending on
      // which of the two commands the registry happens to visit first.
      // This is the exact logical negation of blueprint.save's own
      // `blueprintFocus && !textEditing` — not just `!blueprintFocus` — so
      // there's no gap where NEITHER command matches (blueprint hovered
      // while a text field elsewhere has focus, e.g. editing a pin value)
      // and Ctrl+S falls through to the browser's native Save Page dialog.
      when: (ctx) => !ctx.blueprintFocus || ctx.textEditing,
      run: () => void projectSession.flush(),
    }),
  ];

  const uninstallDispatcher = installCommandDispatcher(target);

  return () => {
    for (const unregister of unregisters) unregister();
    uninstallDispatcher();
  };
}
