/**
 * ROADMAP Phase 39 gate, in Chromium, Firefox and WebKit: the pencil turns a drawn stroke into a vector layer with a
 * few bezier nodes, the pen places nodes by click, pulls handles by drag, closes on its first node and finishes with
 * Enter or Escape, Backspace takes the last node back, and a finished path is one undo step. The fitting itself
 * (the 3-second, 360-sample stroke under 60 nodes and 1.5 px) is the unit gate in `src/core/paths/pathFit.test.ts`.
 */
import { test, expect, type Page } from "@playwright/test";
import { openEditor, waitSaved } from "./support/editor";

const STAGE = 'iframe[title="Stage"]';
const MOD = process.platform === "darwin" ? "Meta" : "Control";

async function ready(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __LL_TEST__: boolean }).__LL_TEST__ = true;
  });
  await openEditor(page);
  await page.getByRole("button", { name: "Mount Showcase Demo" }).click();
  await page.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelector("[data-element-id]"), STAGE);
  await waitSaved(page);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForTimeout(400);
}
const frameGeom = (page: Page) =>
  page.evaluate((sel) => {
    const iframe = document.querySelector<HTMLIFrameElement>(sel)!;
    const r = iframe.getBoundingClientRect();
    return { left: r.left, top: r.top, zoom: r.width / iframe.clientWidth };
  }, STAGE);
const layerIds = (page: Page) =>
  page.evaluate((sel) => Array.from(document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelectorAll("[data-element-id]")).map((e) => (e as HTMLElement).dataset.elementId!), STAGE);
/** The number of nodes in a path layer: its drawn path data has one M and one command per further node. */
const nodeCount = (page: Page, id: string) =>
  page.evaluate(
    ({ sel, id }) => {
      const d = document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelector(`[data-element-id="${id}"] path`)?.getAttribute("d") ?? "";
      return (d.match(/[MLCQ]/gi) ?? []).length;
    },
    { sel: STAGE, id },
  );
async function newLayer(page: Page, before: string[]) {
  await expect.poll(async () => (await layerIds(page)).length).toBeGreaterThan(before.length);
  return (await layerIds(page)).find((id) => !before.includes(id))!;
}

test.describe("Phase 39: pencil and pen", () => {
  test("the pencil fits a stroke to a few nodes and a drag is one undo step", async ({ page }) => {
    await ready(page);
    const g = await frameGeom(page);
    const before = await layerIds(page);
    const at = (x: number, y: number) => ({ x: g.left + x * g.zoom, y: g.top + y * g.zoom });
    await page.mouse.move(at(40, 80).x, at(40, 80).y);
    await page.keyboard.press("Shift+P");
    await page.mouse.down();
    // a quarter circle of 60 pointer moves
    for (let i = 1; i <= 60; i++) {
      const a = (i / 60) * (Math.PI / 2);
      const p = at(40 + 120 * Math.sin(a), 80 + 120 * (1 - Math.cos(a)));
      await page.mouse.move(p.x, p.y);
    }
    await expect(page.getByTestId("draft-path")).toBeVisible();
    await page.mouse.up();
    const id = await newLayer(page, before);
    await expect(page.getByTestId("draft-path")).toHaveCount(0);
    await expect.poll(() => nodeCount(page, id)).toBeGreaterThan(1);
    expect(await nodeCount(page, id)).toBeLessThanOrEqual(12);
    await page.keyboard.press(`${MOD}+z`);
    await expect.poll(async () => (await layerIds(page)).includes(id)).toBe(false);
  });

  test("the pen: clicks, a dragged handle, Backspace, Enter, and Escape", async ({ page }) => {
    await ready(page);
    const g = await frameGeom(page);
    const before = await layerIds(page);
    const at = (x: number, y: number) => ({ x: g.left + x * g.zoom, y: g.top + y * g.zoom });
    const click = async (x: number, y: number) => {
      const p = at(x, y);
      await page.mouse.move(p.x, p.y);
      await page.mouse.down();
      await page.mouse.up();
    };
    const first = at(40, 60);
    await page.mouse.move(first.x, first.y);
    await page.keyboard.press("p");
    await click(40, 60);
    await click(140, 60);
    // a third node, dragged out: a handle
    const third = at(140, 160);
    await page.mouse.move(third.x, third.y);
    await page.mouse.down();
    await page.mouse.move(third.x - 30 * g.zoom, third.y + 30 * g.zoom, { steps: 4 });
    await page.mouse.up();
    // a fourth, then Backspace takes it back
    await click(40, 160);
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Enter");
    const id = await newLayer(page, before);
    await expect.poll(() => nodeCount(page, id)).toBe(3);
    const settled = await layerIds(page);
    // a finished path returns to Select; P picks the pen again
    await page.keyboard.press("p");
    // Escape finishes too, and doesn't clear the selection of the layer it just made first
    await click(60, 110);
    await click(160, 110);
    await expect(page.getByTestId("draft-path")).toBeVisible();
    await page.keyboard.press("Escape");
    const second = await newLayer(page, settled);
    await expect.poll(() => nodeCount(page, second)).toBe(2);
    // one undo step each
    await page.keyboard.press(`${MOD}+z`);
    await expect.poll(async () => (await layerIds(page)).includes(second)).toBe(false);
    expect(await layerIds(page)).toContain(id);
  });

  test("clicking the first node closes the path", async ({ page }) => {
    await ready(page);
    const g = await frameGeom(page);
    const before = await layerIds(page);
    const at = (x: number, y: number) => ({ x: g.left + x * g.zoom, y: g.top + y * g.zoom });
    await page.mouse.move(at(50, 60).x, at(50, 60).y);
    await page.keyboard.press("p");
    for (const [x, y] of [[50, 60], [150, 60], [100, 150], [50, 60]]) {
      await page.mouse.click(at(x, y).x, at(x, y).y);
    }
    const id = await newLayer(page, before);
    const d = await page.evaluate(({ sel, id }) => document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelector(`[data-element-id="${id}"] path`)?.getAttribute("d") ?? "", { sel: STAGE, id });
    expect(d).toMatch(/Z\s*$/i);
  });
});
