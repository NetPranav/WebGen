/**
 * Audit guard: no two commands may answer the same key in the same situation.
 * (The `L` clash between the Line tool and the timeline shuttle went unnoticed for two phases.)
 * It reads the live command registry through the `window.__LL_COMMANDS__` test seam and tries
 * every combination of focus region, text editing, playback and selection size.
 */
import { test, expect } from "@playwright/test";
import { openEditor, openSequencer } from "./support/editor";

test("no two commands share a key in the same context", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __LL_TEST__: boolean }).__LL_TEST__ = true;
  });
  await openEditor(page);
  await openSequencer(page); // mounts the timeline's panel-scoped commands too
  await page.waitForFunction(() => !!(window as unknown as { __LL_COMMANDS__?: unknown }).__LL_COMMANDS__);

  const conflicts = await page.evaluate(() => {
    const reg = (window as unknown as { __LL_COMMANDS__: { all: () => { id: string; keybinding?: string | string[]; when?: (c: Record<string, unknown>) => boolean }[] } }).__LL_COMMANDS__;
    const bound = new Map<string, { id: string; when?: (c: Record<string, unknown>) => boolean }[]>();
    for (const c of reg.all()) {
      for (const k of c.keybinding === undefined ? [] : Array.isArray(c.keybinding) ? c.keybinding : [c.keybinding]) {
        const key = k.toLowerCase();
        bound.set(key, [...(bound.get(key) ?? []), c]);
      }
    }
    const scopes = [
      { canvasFocus: false, timelineFocus: false, blueprintFocus: false },
      { canvasFocus: true, timelineFocus: false, blueprintFocus: false },
      { canvasFocus: false, timelineFocus: true, blueprintFocus: false },
      { canvasFocus: false, timelineFocus: false, blueprintFocus: true },
    ];
    const found: string[] = [];
    for (const [key, list] of bound) {
      if (list.length < 2) continue;
      for (const scope of scopes) for (const textEditing of [false, true]) for (const playing of [false, true]) for (const count of [0, 1, 2]) {
        const ctx = { ...scope, textEditing, "selection.count": count, "transport.playing": playing };
        const live = list.filter((c) => (c.when ? c.when(ctx) : true)).map((c) => c.id);
        if (live.length > 1) found.push(`${key}: ${live.join(" + ")} (${JSON.stringify(ctx)})`);
      }
    }
    return [...new Set(found.map((f) => f.split(" (")[0]))];
  });
  expect(conflicts, "commands that answer the same key at once").toEqual([]);
});
