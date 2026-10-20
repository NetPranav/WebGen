/**
 * ROADMAP Phase 61 gate: a 10-step journey (trim, set the work area, add a marker, solo, lock) that asserts the
 * document after every step, through the real timeline panel in the Animate workspace.
 */
import { test, expect, type Page } from "@playwright/test";
import { focusApp, openEditor } from "./support/editor";

const STAGE = 'iframe[title="Stage"]';
const PPS = 120; // pixels per second in the timeline panel
const COMP = "comp_main";

type Doc = {
  layers: Record<string, { solo?: boolean; locked?: boolean; shy?: boolean; motionBlur?: boolean; visible?: boolean; parentId: string | null; properties: Record<string, unknown> }>;
  compositions: Record<string, { workArea: { start: number; end: number }; markers: Array<{ id: string; time: number; label: string }>; layers: Record<string, { start: number; in: number; out: number; stretch: number }> }>;
};
const doc = (page: Page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__LL_ENGINE__!.document())) as Doc);
const comp = async (page: Page) => (await doc(page)).compositions[COMP];

async function openTimeline(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __LL_TEST__: boolean }).__LL_TEST__ = true;
  });
  await openEditor(page);
  await page.getByRole("tab", { name: /Animate/ }).click();
  await page.locator(".timeline").waitFor({ state: "visible", timeout: 15_000 });
  await page.getByRole("button", { name: "Mount Showcase Demo" }).click();
  await page.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelector('[data-element-id="el_buy_button"]'), STAGE);
}

/** Drags from (x, y) by dx pixels with the real mouse. */
async function drag(page: Page, from: { x: number; y: number }, dx: number) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(from.x + (dx * i) / 6, from.y);
  await page.mouse.up();
}
const centre = async (locator: ReturnType<Page["locator"]>) => {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};
const stageHas = (page: Page, id: string) => page.evaluate(({ sel, id }) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelector(`[data-element-id="${id}"]`), { sel: STAGE, id });

test("Phase 61: a ten-step journey through the timeline, asserting the document after each step", async ({ page }) => {
  await openTimeline(page);

  // 1. The timeline lists the layers (the root; its children are folded) in the Layers panel's order.
  await expect(page.locator("[data-timeline-row]")).toHaveCount(1);
  expect(Object.keys((await doc(page)).layers)).toEqual(expect.arrayContaining(["el_root_container", "el_hero_heading", "el_buy_button"]));

  // 2. Unfold the root: its two children get rows.
  await page.getByRole("button", { name: /Show children of/ }).first().click();
  await expect(page.locator('[data-timeline-row="el_hero_heading"]')).toBeVisible();
  await expect(page.locator('[data-timeline-row="el_buy_button"]')).toBeVisible();
  expect((await comp(page)).layers.el_hero_heading, "an untrimmed layer has no bar of its own").toBeUndefined();

  // 3. Trim the heading's out point from 5 s to about 2 s (drag its right end 360 px left).
  const heading = page.locator('[data-timeline-row="el_hero_heading"]');
  await drag(page, await centre(heading.getByRole("slider", { name: /Trim out point/ })), -3 * PPS);
  await expect.poll(async () => (await comp(page)).layers.el_hero_heading?.out).toBeCloseTo(2, 1);
  expect((await comp(page)).layers.el_hero_heading.in).toBe(0);

  // 4. Trim its in point to about 0.5 s.
  await drag(page, await centre(heading.getByRole("slider", { name: /Trim in point/ })), 0.5 * PPS);
  await expect.poll(async () => (await comp(page)).layers.el_hero_heading?.in).toBeCloseTo(0.5, 1);
  expect((await comp(page)).layers.el_hero_heading.out).toBeCloseTo(2, 1);

  // 5. Move the button's whole bar (it needs a trim first, to have room to slide): trim its out to 3 s, then drag its body 1 s right.
  const button = page.locator('[data-timeline-row="el_buy_button"]');
  await drag(page, await centre(button.getByRole("slider", { name: /Trim out point/ })), -2 * PPS);
  await expect.poll(async () => (await comp(page)).layers.el_buy_button?.out).toBeCloseTo(3, 1);
  const body = button.locator("[data-layer-bar]");
  const box = (await body.boundingBox())!;
  await drag(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, PPS);
  await expect.poll(async () => (await comp(page)).layers.el_buy_button?.in).toBeCloseTo(1, 1);
  const slid = (await comp(page)).layers.el_buy_button;
  expect(slid.out).toBeCloseTo(4, 1);
  expect(slid.start).toBeCloseTo(1, 1);

  // 6. Set the work area from the playhead: seek to 1 s, mark its start; seek to 3 s, mark its end.
  const ruler = page.locator("[data-timeline-ruler]");
  const rulerBox = (await ruler.boundingBox())!;
  await page.mouse.click(rulerBox.x + 1 * PPS, rulerBox.y + 20);
  await expect.poll(() => page.evaluate(() => window.__LL_ENGINE__!.time())).toBeCloseTo(1, 1);
  await page.getByRole("button", { name: "Work area start" }).click();
  await expect.poll(async () => (await comp(page)).workArea.start).toBeCloseTo(1, 1);
  await page.mouse.click(rulerBox.x + 3 * PPS, rulerBox.y + 20);
  await expect.poll(() => page.evaluate(() => window.__LL_ENGINE__!.time())).toBeCloseTo(3, 1);
  await page.getByRole("button", { name: "Work area end" }).click();
  await expect.poll(async () => (await comp(page)).workArea.end).toBeCloseTo(3, 1);
  expect((await comp(page)).workArea.start).toBeCloseTo(1, 1);

  // 7. Add a marker at the playhead (3 s).
  await page.getByRole("button", { name: "Add marker" }).click();
  await expect.poll(async () => (await comp(page)).markers.length).toBe(1);
  const marker = (await comp(page)).markers[0];
  expect(marker.time).toBeCloseTo(3, 1);
  expect(marker.label).toBe("Marker 1");

  // 8. Solo the heading: the document says so, and the stage draws only it (the button disappears).
  expect(await stageHas(page, "el_buy_button")).toBe(true);
  await heading.getByRole("button", { name: /^Solo / }).click();
  await expect.poll(async () => (await doc(page)).layers.el_hero_heading.solo).toBe(true);
  await expect.poll(() => stageHas(page, "el_buy_button")).toBe(false);
  expect(await stageHas(page, "el_hero_heading")).toBe(true);

  // 9. Lock the heading.
  await heading.getByRole("button", { name: /^Lock / }).click();
  await expect.poll(async () => (await doc(page)).layers.el_hero_heading.locked).toBe(true);

  // 10. Undo: the lock goes, then the solo goes and the button is drawn again; the earlier steps are untouched.
  await focusApp(page);
  await page.keyboard.press("Control+z");
  await expect.poll(async () => (await doc(page)).layers.el_hero_heading.locked).toBeFalsy();
  expect((await doc(page)).layers.el_hero_heading.solo).toBe(true);
  await page.keyboard.press("Control+z");
  await expect.poll(async () => (await doc(page)).layers.el_hero_heading.solo).toBeFalsy();
  await expect.poll(() => stageHas(page, "el_buy_button")).toBe(true);
  expect((await comp(page)).markers).toHaveLength(1);
  expect((await comp(page)).workArea.end).toBeCloseTo(3, 1);
});

test("Phase 61: switches, blend mode and parent are saved in the document", async ({ page }) => {
  await openTimeline(page);
  await page.getByRole("button", { name: /Show children of/ }).first().click();
  const heading = page.locator('[data-timeline-row="el_hero_heading"]');

  await heading.getByRole("button", { name: /^Shy / }).click();
  await expect.poll(async () => (await doc(page)).layers.el_hero_heading.shy).toBe(true);
  await heading.getByRole("button", { name: /^Motion blur / }).click();
  await expect.poll(async () => (await doc(page)).layers.el_hero_heading.motionBlur).toBe(true);
  await heading.getByRole("button", { name: /^Hide / }).click();
  await expect.poll(async () => (await doc(page)).layers.el_hero_heading.visible).toBe(false);

  await heading.getByLabel(/^Blend mode of/).selectOption("multiply");
  await expect.poll(async () => (await doc(page)).layers.el_hero_heading.properties["appearance.blendMode"]).toBe("multiply");

  // The shy filter hides the shy layer's row without removing the layer.
  await page.getByRole("button", { name: "Hide shy layers" }).click();
  await expect(page.locator('[data-timeline-row="el_hero_heading"]')).toHaveCount(0);
  await expect(page.locator('[data-timeline-row="el_buy_button"]')).toBeVisible();
  expect((await doc(page)).layers.el_hero_heading).toBeTruthy();
});

test("Phase 61: the ruler can show frames, and dragging the ruler seeks", async ({ page }) => {
  await openTimeline(page);
  await expect(page.locator(".timeline__tick").nth(1)).toHaveText("00:01:00");
  await page.getByRole("button", { name: "Show frames" }).click();
  await expect(page.locator(".timeline__tick").nth(1)).toHaveText("60");
  const rulerBox = (await page.locator("[data-timeline-ruler]").boundingBox())!;
  await drag(page, { x: rulerBox.x + 0.5 * PPS, y: rulerBox.y + 20 }, 1.5 * PPS);
  await expect.poll(() => page.evaluate(() => window.__LL_ENGINE__!.time())).toBeCloseTo(2, 1);
});

test("Phase 61: a motion badge in the Layers panel opens the layer in the timeline", async ({ page }) => {
  await openTimeline(page);
  // Give the root an animation (Recipe A of the manual guide) in the old Sequencer, then use the badge.
  await page.getByRole("button", { name: "Timeline tool" }).click();
  await page.locator(".sequencer-ruler-wrap").waitFor({ state: "visible", timeout: 15_000 });
  await page.getByRole("button", { name: "+ Keyframe" }).click();
  await page.getByRole("tab", { name: /Design/ }).click();
  const badge = page.locator('[data-motion-badge="el_root_container"]');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveAttribute("aria-label", /animation/);
  await badge.click();
  await expect(page.locator(".timeline")).toBeVisible();
  await expect(page.locator('[data-timeline-row="el_root_container"]')).toBeVisible();
});
