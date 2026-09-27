/**
 * ============================================================================
 * COMMAND BUS TYPES (ROADMAP Sub-Phase 43.1)
 * ============================================================================
 * Every action — shortcut, menu item, palette entry, toolbar button, an AI
 * co-pilot patch — is a `Command`. A command's `when` clause reads context
 * keys (which region has focus, whether a text field is being edited, ...)
 * to decide whether it currently applies, the same way VS Code's keybindings
 * do. This is what lets one physical key mean different things in different
 * places: Space is `canvasFocus` in one command and `timelineFocus` in
 * another, and "exactly one focused region" (Sub-Phase 43.3) guarantees at
 * most one of them is ever true at a time.
 * ============================================================================
 */

/** Which region currently has pointer/keyboard focus, for shortcut disambiguation. Exactly one (or none) at a time — see `useFocusScope`. */
export type FocusScope = "canvas" | "timeline" | "blueprint";

export interface ContextKeys {
  canvasFocus: boolean;
  timelineFocus: boolean;
  blueprintFocus: boolean;
  /** True whenever a text input, textarea, or contentEditable element has focus. Wins over every focus-scoped command. */
  textEditing: boolean;
  "selection.count": number;
  "transport.playing": boolean;
}

export type ContextKeyName = keyof ContextKeys;

export interface Command {
  id: string;
  title: string;
  category?: string;
  description?: string;
  /** A normalized shortcut string (see `normalizeShortcut`), e.g. "Ctrl+S", "Space", "Delete" — or several, for a command with more than one binding (e.g. redo's `Ctrl+Shift+Z` and the Windows/Linux-convention `Ctrl+Y` alias). Omit for palette/menu-only commands with no keybinding. */
  keybinding?: string | string[];
  /** Returns whether this command currently applies, given the live context keys. Omit for a command that's always available (most global commands). */
  when?: (ctx: ContextKeys) => boolean;
  /** Return value is always discarded (callers `void` it) — a command can be a plain function whose own return isn't `void`. */
  run: () => unknown;
}
