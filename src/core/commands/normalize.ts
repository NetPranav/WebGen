/**
 * Normalizes a keyboard event or shortcut string into a canonical form, e.g.
 * "Ctrl+Shift+P", "Ctrl+S", "Space", "Delete". Ported from the old
 * `src/runtime/ShortcutRegistry.ts` (Sub-Phase 43.1 — that module is retired
 * in favor of `src/core/commands/`), unchanged: `Meta`/`Cmd` both normalize
 * to `Ctrl` so one binding covers both Windows/Linux and macOS.
 */
export function normalizeShortcut(input: KeyboardEvent | string): string {
  if (typeof input === "string") {
    const parts = input.split("+").map((p) => p.trim());
    let hasCtrl = false;
    let hasAlt = false;
    let hasShift = false;
    let key = "";

    for (const part of parts) {
      const lower = part.toLowerCase();
      if (lower === "ctrl" || lower === "control" || lower === "meta" || lower === "cmd" || lower === "command") {
        hasCtrl = true;
      } else if (lower === "alt" || lower === "option") {
        hasAlt = true;
      } else if (lower === "shift") {
        hasShift = true;
      } else {
        key = part.length === 1 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1);
      }
    }

    const result: string[] = [];
    if (hasCtrl) result.push("Ctrl");
    if (hasAlt) result.push("Alt");
    if (hasShift) result.push("Shift");
    if (key) result.push(key);
    return result.join("+");
  }

  const e = input;
  const result: string[] = [];
  if (e.ctrlKey || e.metaKey) result.push("Ctrl");
  if (e.altKey) result.push("Alt");
  if (e.shiftKey) result.push("Shift");

  let key = e.key;
  if (key === "Control" || key === "Meta" || key === "Alt" || key === "Shift") {
    return result.join("+");
  }

  // The DOM reports the spacebar's `key` as a literal " " (one space
  // character), which the single-character branch below would otherwise
  // just re-uppercase into another space — indistinguishable from an empty
  // key and never matching the word-form "Space" a Command's `keybinding`
  // uses. Every other key `normalizeShortcut("space")` (string form) already
  // produces "Space" via the multi-character branch, so this makes the two
  // input forms agree.
  if (key === " ") {
    key = "Space";
  } else if (key.length === 1) {
    key = key.toUpperCase();
  } else {
    key = key.charAt(0).toUpperCase() + key.slice(1);
  }

  result.push(key);
  return result.join("+");
}

/**
 * True when the event's target is a text input, textarea, dropdown, or
 * contentEditable element. Includes `<select>`: `BlueprintCanvas.tsx`'s own
 * pre-migration guard checked it (a dropdown focused over the graph
 * shouldn't have "c"/Tab/Delete act on the graph), but `EditorShell.tsx`'s
 * didn't — unifying on the stricter of the two rather than the laxer one.
 */
export function isTextEditingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

/** Renders a command's keybinding (possibly several) as one display string, e.g. "Ctrl+Z" or "Ctrl+Shift+Z / Ctrl+Y". */
export function formatKeybinding(keybinding: string | string[] | undefined): string | undefined {
  if (!keybinding) return undefined;
  return Array.isArray(keybinding) ? keybinding.join(" / ") : keybinding;
}
