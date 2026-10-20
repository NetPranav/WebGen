/**
 * ROADMAP Phase 57 gate: pressing play animates the real layers on the canvas, eased as the curves say.
 * Ten reference animations, each seeked to five times, match the evaluation kernel within 0.5 px in the
 * real stage (the dev page /editor/stage-lab), in every browser.
 */
import { test, expect, type Page } from "@playwright/test";

const STAGE = 'iframe[title="Stage"]';
const TIMES = [0, 0.2, 0.5, 0.8, 1];
const animId = (i: number) => `anim_${i}`;
/** The property each lab layer animates (src/editor/stage-lab/StageLab.tsx, ANIMATION_REFS). */
const PROPERTIES = ["transform.x", "transform.y", "transform.x", "transform.y", "frame.width", "frame.height", "frame.x", "frame.y", "appearance.radius", "appearance.opacity"];

async function openLab(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __LL_TEST__: boolean }).__LL_TEST__ = true;
  });
  await page.goto("/editor/stage-lab", { waitUntil: "domcontentloaded" });
  await page.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.getElementById("stage-root"), STAGE, { timeout: 45_000 });
  // Clicking before the page has hydrated does nothing, so click again until the layers are in the frame.
  await expect
    .poll(
      async () => {
        await page.getByRole("button", { name: "Load 10 animations" }).click();
        return page.evaluate((sel) => document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelectorAll('[data-element-id^="anim_"]').length ?? 0, STAGE);
      },
      { timeout: 45_000, intervals: [500, 1000, 2000] },
    )
    .toBeGreaterThanOrEqual(10);
  await page.waitForFunction(() => !!(window as unknown as { __LL_ENGINE__?: unknown }).__LL_ENGINE__);
}

/** What the stage shows for one property of one layer, as a number in the property's own unit. */
const shown = (page: Page, id: string, property: string) =>
  page.evaluate(
    ({ sel, id, property }) => {
      const doc = document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!;
      const el = doc.querySelector<HTMLElement>(`[data-element-id="${id}"]`)!;
      const style = doc.defaultView!.getComputedStyle(el);
      switch (property) {
        case "transform.x":
          return new DOMMatrix(style.transform === "none" ? undefined : style.transform).m41;
        case "transform.y":
          return new DOMMatrix(style.transform === "none" ? undefined : style.transform).m42;
        case "frame.width":
          return parseFloat(style.width);
        case "frame.height":
          return parseFloat(style.height);
        case "frame.x":
          return parseFloat(style.left);
        case "frame.y":
          return parseFloat(style.top);
        case "appearance.radius":
          return parseFloat(style.borderTopLeftRadius);
        default:
          return Number(style.opacity);
      }
    },
    { sel: STAGE, id, property },
  );

test("Phase 57: ten reference animations, seeked to five times, match the kernel within 0.5 px", async ({ page }) => {
  await openLab(page);
  const worst: string[] = [];
  for (const time of TIMES) {
    await page.evaluate((t) => window.__LL_ENGINE__!.seek(t), time);
    for (const [i, property] of PROPERTIES.entries()) {
      const id = animId(i);
      const expected = (await page.evaluate(({ id, time }) => window.__LL_ENGINE__!.kernel(id, time), { id, time }))[property] as number;
      // The engine writes in the next frame's apply phase.
      await expect
        .poll(async () => Math.abs((await shown(page, id, property)) - expected), { message: `${property} (${id}) at ${time}s should be ${expected}`, timeout: 5_000 })
        .toBeLessThanOrEqual(property === "appearance.opacity" ? 0.005 : 0.5);
      worst.push(`${property}@${time}`);
    }
  }
  expect(worst).toHaveLength(PROPERTIES.length * TIMES.length);
});

test("Phase 57: pressing play moves the layers, and pausing holds them", async ({ page }) => {
  await openLab(page);
  const x = () => shown(page, animId(0), "transform.x");
  expect(await x()).toBeCloseTo(0, 0);
  await page.evaluate(() => window.__LL_ENGINE__!.play());
  await expect.poll(x, { message: "the layer moves while the transport plays", timeout: 15_000 }).toBeGreaterThan(20);
  await page.evaluate(() => window.__LL_ENGINE__!.pause());
  const held = await x();
  await page.waitForTimeout(300);
  expect(await x(), "paused: the layer stays where it is").toBe(held);
});

test("Phase 57: scrubbing back to 0 puts the layers at their first keyframe", async ({ page }) => {
  await openLab(page);
  await page.evaluate(() => window.__LL_ENGINE__!.seek(1));
  await expect.poll(() => shown(page, animId(0), "transform.x")).toBeCloseTo(240, 0);
  await page.evaluate(() => window.__LL_ENGINE__!.seek(0));
  await expect.poll(() => shown(page, animId(0), "transform.x")).toBeCloseTo(0, 0);
});
