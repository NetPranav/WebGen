/**
 * ROADMAP Phase 26 gate: a 15-step selection journey that asserts the exact selection after every step (click,
 * Shift-click, deep select, select all / none / inverse, children and parent, marquee, across frames), and the
 * selection staying in sync in the inspector and the status bar. The journey runs on the canvas lab: five frames,
 * each with 10 groups of 20 text layers.
 */
import { test, expect, type Page } from "@playwright/test";
import { openEditor, waitSaved } from "./support/editor";

const DEEP = process.platform === "darwin" ? "Meta" : "Control";

async function openLab(page: Page) {
  await page.goto("/editor/canvas-lab", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Load 5 frames × 200 layers" }).click();
  await page.waitForFunction(() => {
    const frames = Array.from(document.querySelectorAll<HTMLIFrameElement>(".canvas-frame iframe"));
    return frames.length === 5 && frames.every((f) => (f.contentDocument?.querySelectorAll("[data-element-id]").length ?? 0) >= 200);
  }, null, { timeout: 60_000 });
  for (let i = 0; i < 6; i++) await page.getByRole("button", { name: "Zoom Out" }).click(); // 26%: two frames fit
  await page.waitForTimeout(500);
}

const selection = (page: Page) => page.getByTestId("selected");
const expectSelection = (page: Page, ids: string[], step: string) => expect(selection(page), step).toHaveText(ids.length ? ids.join(",") : "none");

/** Page coordinates of a layer's centre. */
const centre = (page: Page, id: string) =>
  page.evaluate((id) => {
    for (const iframe of Array.from(document.querySelectorAll<HTMLIFrameElement>(".canvas-frame iframe"))) {
      const el = iframe.contentDocument?.querySelector<HTMLElement>(`[data-element-id="${id}"]`);
      if (!el) continue;
      const f = iframe.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      return { x: Math.round(f.left + (b.left + b.width / 2) * (f.width / iframe.clientWidth)), y: Math.round(f.top + (b.top + b.height / 2) * (f.height / iframe.clientHeight)) };
    }
    return null;
  }, id);

/** Page coordinates of a point given in a frame's own px (frame index 0..4). */
const inFrame = (page: Page, frame: number, x: number, y: number) =>
  page.evaluate(({ frame, x, y }) => {
    const iframe = document.querySelectorAll<HTMLIFrameElement>(".canvas-frame iframe")[frame];
    const f = iframe.getBoundingClientRect();
    const s = f.width / iframe.clientWidth;
    return { x: Math.round(f.left + x * s), y: Math.round(f.top + y * s) };
  }, { frame, x, y });

const group = (f: number, g: number) => `f${f}_g${g}`;
const text = (f: number, g: number, t: number) => `f${f}_g${g}_t${t}`;
const allGroups = (f: number) => Array.from({ length: 10 }, (_, g) => group(f, g));

async function click(page: Page, id: string, mods: string[] = []) {
  const p = (await centre(page, id))!;
  for (const m of mods) await page.keyboard.down(m);
  await page.mouse.click(p.x, p.y);
  for (const m of [...mods].reverse()) await page.keyboard.up(m);
}

test("Phase 26: a 15-step selection journey asserts the exact selection after each step", async ({ page }) => {
  await openLab(page);

  // 1. a click picks the frame's direct child
  await click(page, text(0, 0, 2));
  await expectSelection(page, [group(0, 0)], "1. click a text: its group");

  // 2. Shift-click another group adds it
  await click(page, text(0, 1, 0), ["Shift"]);
  await expectSelection(page, [group(0, 0), group(0, 1)], "2. Shift-click adds a second group");

  // 3. Shift-click a layer of the first group takes that group out
  await click(page, text(0, 0, 5), ["Shift"]);
  await expectSelection(page, [group(0, 1)], "3. Shift-click toggles it off");

  // 4. select all: the selection's siblings
  await page.keyboard.press("Control+a");
  await expectSelection(page, allGroups(0), "4. Ctrl+A selects the 10 groups of the frame");

  // 5. Escape clears
  await page.keyboard.press("Escape");
  await expectSelection(page, [], "5. Escape selects none");

  // 6. deep select goes to the layer itself
  await click(page, text(0, 1, 7), [DEEP]);
  await expectSelection(page, [text(0, 1, 7)], "6. Cmd/Ctrl-click deep-selects the text");

  // 7. parent
  await page.keyboard.press("Shift+Enter");
  await expectSelection(page, [group(0, 1)], "7. Shift+Enter selects the parent");

  // 8. children
  await page.keyboard.press("Enter");
  await expectSelection(page, Array.from({ length: 20 }, (_, t) => text(0, 1, t)), "8. Enter selects the 20 children");

  // 9. a parent of many children is their one group
  await page.keyboard.press("Shift+Enter");
  await expectSelection(page, [group(0, 1)], "9. Shift+Enter again: the group");

  // 10. inverse: the other nine groups
  await page.keyboard.press("Control+Shift+a");
  await expectSelection(page, allGroups(0).filter((g) => g !== group(0, 1)), "10. Ctrl+Shift+A inverts within the frame");

  // 11. a plain click replaces everything
  await click(page, text(0, 2, 1));
  await expectSelection(page, [group(0, 2)], "11. a click replaces the selection");

  // 12. a marquee from the frame's blank right side touches the groups it crosses (not the frame, not their texts)
  const from = await inFrame(page, 0, 700, 300);
  const to = await inFrame(page, 0, 300, 700);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps: 3 });
  await page.mouse.up();
  await expectSelection(page, [group(0, 0), group(0, 1), group(0, 2)], "12. marquee selects the three groups it touches");

  // 13. a click in another frame selects there
  await click(page, text(1, 0, 1));
  await expectSelection(page, [group(1, 0)], "13. a click in the second frame");

  // 14. select all follows the selection's frame
  await page.keyboard.press("Control+a");
  await expectSelection(page, allGroups(1), "14. Ctrl+A selects the second frame's groups");

  // 15. a click on a frame's own background selects the frame; children of a frame are its groups
  const bg = await inFrame(page, 1, 700, 450);
  await page.mouse.click(bg.x, bg.y);
  await expectSelection(page, ["frame_1"], "15. the frame's background selects the frame");
  await page.keyboard.press("Enter");
  await expectSelection(page, allGroups(1), "16. Enter selects the frame's children");
  await page.keyboard.press("Escape");
  await expectSelection(page, [], "17. Escape clears");
});

test("Phase 26: the selection stays in sync across the canvas, the inspector and the status bar", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Mount Showcase Demo" }).click();
  await page.waitForFunction(() => !!document.querySelector<HTMLIFrameElement>('iframe[title="Stage"]')?.contentDocument?.querySelector("[data-element-id]"));
  await waitSaved(page);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForTimeout(400);

  const status = page.locator(".statusbar, .dock-layout__statusbar").first();
  const target = (await centre(page, "el_buy_button"))!;
  await page.keyboard.down(DEEP);
  await page.mouse.click(target.x, target.y);
  await page.keyboard.up(DEEP);
  await expect(page.locator(".canvas-overlay__selection:not([hidden])")).toHaveAttribute("data-layer-id", "el_buy_button");
  await expect(page.locator(".panel-header__badge", { hasText: "el_buy_button" }), "the inspector shows it").toBeVisible();
  await expect(status).toContainText(/Buy/i);

  // select all siblings: the status bar counts them, the canvas outlines each
  await page.keyboard.press("Control+a");
  await expect(status).toContainText(/\d+ layers selected/);
  await expect.poll(() => page.locator(".canvas-overlay__selection:not([hidden])").count()).toBeGreaterThan(1); // the overlay paints on the next frame

  // Escape: nothing selected anywhere, the inspector is back on the World Environment
  await page.keyboard.press("Escape");
  await expect(page.locator(".canvas-overlay__selection:not([hidden])")).toHaveCount(0);
  await expect(status).toContainText("World Environment");
});
