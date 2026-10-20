/**
 * ROADMAP Phase 62 gate: a stopwatch turned on and off round-trips through undo and save. Driven through the real
 * Layer Timeline in the Animate workspace: twirl a layer open, open a group, click a stopwatch.
 */
import { test, expect, type Page } from "@playwright/test";
import { focusApp, openEditor, waitSaved } from "./support/editor";

const STAGE = 'iframe[title="Stage"]';
const PPS = 120;
const COMP = "comp_main";

type Doc = { clips: Record<string, { layerId: string; name: string; tracks: Array<{ property: string; keyframes: Array<{ time: number; value: unknown }> }> }> };
const doc = (page: Page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__LL_ENGINE__!.document())) as Doc);
const tracksOf = async (page: Page, layerId: string) =>
  Object.values((await doc(page)).clips).filter((c) => c.layerId === layerId).flatMap((c) => c.tracks.map((t) => ({ clip: c.name, ...t })));

async function openTimeline(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __LL_TEST__: boolean }).__LL_TEST__ = true;
  });
  await openEditor(page);
  await prepare(page, true);
}

/** Animate workspace, demo mounted (first time only), the root's children and the heading's Transform group open. */
async function prepare(page: Page, mount: boolean) {
  await page.getByRole("tab", { name: /Animate/ }).click();
  await page.locator(".timeline").waitFor({ state: "visible", timeout: 15_000 });
  if (mount) {
    await page.getByRole("button", { name: "Mount Showcase Demo" }).click();
    await page.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelector('[data-element-id="el_buy_button"]'), STAGE);
  }
  await page.getByRole("button", { name: /Show children of/ }).first().click();
  await page.locator('[data-timeline-row="el_hero_heading"]').getByRole("button", { name: /Show properties of/ }).click();
  await page.locator('[data-timeline-group="el_hero_heading|transform"]').getByRole("button", { name: /^Show Transform/ }).click();
}

const seekTo = async (page: Page, seconds: number) => {
  const box = (await page.locator("[data-timeline-ruler]").boundingBox())!;
  await page.mouse.click(box.x + seconds * PPS, box.y + 20);
  await expect.poll(() => page.evaluate(() => window.__LL_ENGINE__!.time())).toBeCloseTo(seconds, 1);
};
const stopwatch = (page: Page, label: string) => page.getByRole("button", { name: `Animate ${label} of Hero Heading` }).or(page.locator('[data-timeline-property^="el_hero_heading|"]').getByRole("button", { name: new RegExp(`^Animate ${label} of`) }));
const undo = async (page: Page) => {
  await focusApp(page);
  await page.keyboard.press("Control+z");
};

test("Phase 62: twirl a layer open, open a group, and its properties have stopwatches that are off", async ({ page }) => {
  await openTimeline(page);
  for (const group of ["Transform", "Appearance", "Effects", "States", "Behaviours", "Links"]) {
    await expect(page.locator('[data-timeline-row="el_hero_heading"]').locator("xpath=following::*[@data-timeline-group][1]")).toBeVisible();
    await expect(page.locator(`[data-timeline-group^="el_hero_heading|"]`).filter({ hasText: group }).first()).toBeVisible();
  }
  const x = page.locator('[data-timeline-property="el_hero_heading|transform.x"]');
  await expect(x).toBeVisible();
  await expect(x.getByRole("button", { name: /^Animate Position X of/ })).toHaveAttribute("aria-pressed", "false");
  expect(await tracksOf(page, "el_hero_heading")).toEqual([]);
});

test("Phase 62: a stopwatch on and off round-trips through undo and save", async ({ page }) => {
  await openTimeline(page);
  const x = page.locator('[data-timeline-property="el_hero_heading|transform.x"]');
  const button = x.getByRole("button", { name: /^Animate Position X of/ });

  // On: one keyframe at the playhead (1 s), holding the property's current value.
  await seekTo(page, 1);
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await tracksOf(page, "el_hero_heading")).length).toBe(1);
  const [track] = await tracksOf(page, "el_hero_heading");
  expect(track.property).toBe("transform.x");
  expect(track.clip).toBe("Keyframes");
  expect(track.keyframes).toHaveLength(1);
  expect(track.keyframes[0].time).toBeCloseTo(1, 1);
  await expect(x.locator("[data-keyframe]")).toHaveCount(1);

  // Undo turns it off in one step; redo turns it back on.
  await undo(page);
  await expect(button).toHaveAttribute("aria-pressed", "false");
  expect(await tracksOf(page, "el_hero_heading")).toEqual([]);
  await expect(x.locator("[data-keyframe]")).toHaveCount(0);
  await page.keyboard.press("Control+Shift+z");
  await expect(button).toHaveAttribute("aria-pressed", "true");
  expect(await tracksOf(page, "el_hero_heading")).toHaveLength(1);

  // Save, reload: the stopwatch is still on, with its keyframe.
  await waitSaved(page);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => !!(window as unknown as { __LL_ENGINE__?: unknown }).__LL_ENGINE__);
  await prepare(page, false);
  const again = page.locator('[data-timeline-property="el_hero_heading|transform.x"]');
  await expect(again.getByRole("button", { name: /^Animate Position X of/ })).toHaveAttribute("aria-pressed", "true");
  await expect(again.locator("[data-keyframe]")).toHaveCount(1);
  const [saved] = await tracksOf(page, "el_hero_heading");
  expect(saved.keyframes[0].time).toBeCloseTo(1, 1);

  // Off removes the keyframes (and the empty Keyframes clip); undo brings them back.
  await again.getByRole("button", { name: /^Animate Position X of/ }).click();
  await expect.poll(async () => (await tracksOf(page, "el_hero_heading")).length).toBe(0);
  expect(Object.values((await doc(page)).clips).filter((c) => c.layerId === "el_hero_heading")).toEqual([]);
  await undo(page);
  await expect.poll(async () => (await tracksOf(page, "el_hero_heading")).length).toBe(1);
});

test("Phase 62: the value at the playhead follows an animated property", async ({ page }) => {
  await openTimeline(page);
  const x = page.locator('[data-timeline-property="el_hero_heading|transform.x"]');
  await seekTo(page, 0.5);
  await x.getByRole("button", { name: /^Animate Position X of/ }).click();
  await expect(x.getByLabel("Position X value")).toHaveText("0");
  await expect(x.locator("[data-keyframe]")).toHaveCount(1);
});

test("Phase 62: U reveals the animated properties, and U twice the modified ones", async ({ page }) => {
  await openTimeline(page);
  await seekTo(page, 1);
  await page.locator('[data-timeline-property="el_hero_heading|transform.x"]').getByRole("button", { name: /^Animate Position X of/ }).click();
  await expect.poll(async () => (await tracksOf(page, "el_hero_heading")).length).toBe(1);

  // Select the heading, hold the pointer over the timeline (its focus scope), press U.
  await page.locator('[data-timeline-row="el_hero_heading"] .timeline__name').click();
  await expect.poll(() => page.evaluate(() => window.__LL_COMMANDS__!.context()["selection.count"])).toBe(1);
  await page.locator(".dock-zone--center").first().hover();
  await page.getByRole("region", { name: "Timeline", exact: true }).hover();
  await page.keyboard.press("u");
  await expect(page.locator('[data-timeline-property^="el_hero_heading|"]')).toHaveCount(1);
  await expect(page.locator('[data-timeline-property="el_hero_heading|transform.x"]')).toBeVisible();
  await expect(page.locator('[data-timeline-group^="el_hero_heading|"]')).toHaveCount(1);

  // A slow second press goes back to how the twirls were (the Transform group's eight properties).
  await page.waitForTimeout(700);
  await page.keyboard.press("u");
  await expect(page.locator('[data-timeline-property^="el_hero_heading|"]')).toHaveCount(8);

  // A quick double press reveals the modified ones (the animated one counts as modified; nothing else was changed).
  await page.keyboard.press("u");
  await page.keyboard.press("u");
  await expect(page.locator('[data-timeline-property^="el_hero_heading|"]')).toHaveCount(1);
  await expect(page.locator('[data-timeline-property="el_hero_heading|transform.x"]')).toBeVisible();
});
