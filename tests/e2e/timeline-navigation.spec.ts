/**
 * ROADMAP Phase 63 gate: a keyboard-only navigation journey lands on exact times. With the pointer over the Layer
 * Timeline: Page Down / Page Up step frames (Shift: ten), I and O go to the selected layer's in and out points, B and N
 * set the work area from the playhead, = and - zoom, \ fits the work area, End goes to the end. Every stop is checked
 * against the transport's time and the document.
 */
import { test, expect, type Page } from "@playwright/test";
import { openEditor } from "./support/editor";

const STAGE = 'iframe[title="Stage"]';
const FPS = 60;

type Doc = { compositions: Record<string, { workArea: { start: number; end: number } }> };
const workArea = async (page: Page) => (await page.evaluate(() => JSON.parse(JSON.stringify(window.__LL_ENGINE__!.document())) as Doc)).compositions.comp_main.workArea;
const time = (page: Page) => page.evaluate(() => window.__LL_ENGINE__!.time());
const rulerWidth = async (page: Page) => (await page.locator("[data-timeline-ruler]").boundingBox())!.width;
// The needle's place along the ruler, so the panel scrolling the view (it follows the playhead) can't change it.
const needleOffset = async (page: Page) => (await page.locator("[data-timeline-needle]").boundingBox())!.x - (await page.locator("[data-timeline-ruler]").boundingBox())!.x;
const expectTime = async (page: Page, seconds: number) => expect.poll(() => time(page), { message: `the playhead should be at exactly ${seconds} s` }).toBeCloseTo(seconds, 9);

async function setup(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __LL_TEST__: boolean }).__LL_TEST__ = true;
  });
  await openEditor(page);
  await page.getByRole("tab", { name: /Animate/ }).click();
  await page.locator(".timeline").waitFor({ state: "visible", timeout: 15_000 });
  await page.getByRole("button", { name: "Mount Showcase Demo" }).click();
  await page.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelector('[data-element-id="el_buy_button"]'), STAGE);
  await page.getByRole("button", { name: /Show children of/ }).first().click();
  // The heading's bar runs from 1 s to 3 s (set through the command, so the journey below is keyboard only).
  await page.evaluate(() => {
    const trim = window.__LL_COMMANDS__!.all().find((c) => c.id === "timeline.setLayerBar")!;
    (trim.run as (a: unknown) => unknown)({ layerId: "el_hero_heading", in: 1, out: 3 });
  });
  await page.locator('[data-timeline-row="el_hero_heading"] .timeline__name').click();
  await expect.poll(() => page.evaluate(() => window.__LL_COMMANDS__!.context()["selection.count"])).toBe(1);
  // Into the timeline's focus scope: from the canvas first, so the pointer enters it.
  await page.locator(".dock-zone--center").first().hover();
  await page.getByRole("region", { name: "Timeline", exact: true }).hover();
}

test("Phase 63: a keyboard-only journey lands on exact times", async ({ page }) => {
  await setup(page);
  const key = (k: string) => page.keyboard.press(k);

  // Frames: Page Down / Page Up, Shift for ten.
  await key("Home");
  await expectTime(page, 0);
  for (let i = 0; i < 3; i++) await key("PageDown");
  await expectTime(page, 3 / FPS);
  await key("Shift+PageDown");
  await expectTime(page, 13 / FPS);
  await key("PageUp");
  await expectTime(page, 12 / FPS);
  await key("Shift+PageUp");
  await expectTime(page, 2 / FPS);
  await key("Shift+PageUp");
  await expectTime(page, 0); // never before the start

  // I and O: the selected heading's in and out points.
  await key("i");
  await expectTime(page, 1);
  await key("o");
  await expectTime(page, 3);

  // B and N: the work area from the playhead (one undo step each).
  await key("i");
  await expectTime(page, 1);
  await key("b");
  await expect.poll(async () => (await workArea(page)).start).toBeCloseTo(1, 9);
  await key("o");
  await expectTime(page, 3);
  await key("n");
  await expect.poll(async () => (await workArea(page)).end).toBeCloseTo(3, 9);
  expect(await workArea(page)).toEqual({ start: 1, end: 3 });

  // No layer selected: I and O go to the work area's ends.
  // (Escape deselects on the canvas, not over the timeline, so the command is run directly.)
  await page.evaluate(() => (window.__LL_COMMANDS__!.all().find((c) => c.id === "selection.none")!.run as () => unknown)());
  await expect.poll(() => page.evaluate(() => window.__LL_COMMANDS__!.context()["selection.count"])).toBe(0);
  await key("Home");
  await key("i");
  await expectTime(page, 1);
  await key("o");
  await expectTime(page, 3);

  // Zoom: = and - step by 1.25; \ fits the work area into the view.
  const full = await rulerWidth(page);
  expect(full).toBeCloseTo(5 * 120, 0);
  await key("=");
  await expect.poll(() => rulerWidth(page)).toBeCloseTo(full * 1.25, 0);
  await key("-");
  await expect.poll(() => rulerWidth(page)).toBeCloseTo(full, 0);
  await key("\\");
  await expect.poll(() => rulerWidth(page), { message: "zoom to work area is much wider than the default" }).toBeGreaterThan(full * 1.5);
  const fitted = await rulerWidth(page);
  const pps = fitted / 5;
  // The needle at 3 s sits 2 s × pps further along the ruler than the one at 1 s.
  await key("i");
  const needle1 = await needleOffset(page);
  await key("o");
  await expect.poll(async () => (await needleOffset(page)) - needle1).toBeCloseTo(2 * pps, 0);

  // End: the end of the composition.
  await key("End");
  await expectTime(page, 5);
});

test("Phase 63: the keys belong to the timeline: nothing happens over the canvas", async ({ page }) => {
  await setup(page);
  await page.keyboard.press("Home");
  await expectTime(page, 0);

  // Over the canvas: Page Down and I are not timeline keys there.
  await page.locator(".dock-zone--center").first().hover();
  await page.keyboard.press("PageDown");
  await page.keyboard.press("i");
  await expectTime(page, 0);

  // Back over the timeline the same key works.
  await page.getByRole("region", { name: "Timeline", exact: true }).hover();
  await page.keyboard.press("PageDown");
  await expectTime(page, 1 / FPS);
});

test("Phase 63: Ctrl and the wheel zoom the timeline around the pointer", async ({ page }) => {
  await setup(page);
  const before = await rulerWidth(page);
  const box = (await page.locator("[data-timeline-ruler]").boundingBox())!;
  await page.mouse.move(box.x + 200, box.y + 20);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -100);
  await page.keyboard.up("Control");
  await expect.poll(() => rulerWidth(page)).toBeGreaterThan(before);
});
