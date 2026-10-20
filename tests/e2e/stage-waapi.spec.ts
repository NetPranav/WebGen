/**
 * ROADMAP Phase 58 gate: routed animations run as Web Animations where they can, and match the kernel at five
 * times (≤ 0.5% of pixels). The same ten reference animations as Phase 57, drawn once by Web Animations and once
 * by the kernel adapter alone (`__LL_KERNEL_ONLY__`), compared screenshot to screenshot.
 */
import { test, expect, type Page } from "@playwright/test";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const STAGE = 'iframe[title="Stage"]';
const TIMES = [0, 0.2, 0.5, 0.8, 1];

async function openLab(page: Page, kernelOnly: boolean) {
  await page.addInitScript((kernelOnly) => {
    const w = window as unknown as { __LL_TEST__: boolean; __LL_KERNEL_ONLY__: boolean };
    w.__LL_TEST__ = true;
    w.__LL_KERNEL_ONLY__ = kernelOnly;
  }, kernelOnly);
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

const animations = (page: Page) =>
  page.evaluate((sel) => {
    const doc = document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!;
    return doc.getAnimations().map((a) => ({ id: a.id, state: a.playState, rate: a.playbackRate }));
  }, STAGE);

/** The stage at `time`, after the engine has drawn it. */
async function shotAt(page: Page, time: number): Promise<PNG> {
  await page.evaluate((t) => window.__LL_ENGINE__!.seek(t), time);
  await page.waitForTimeout(250); // the engine writes in the next frame's apply phase; let it settle
  await page.mouse.move(2, 2);
  return PNG.sync.read(await page.locator(STAGE).screenshot({ animations: "allow" }));
}

test("Phase 58: the reference animations run as Web Animations", async ({ page }) => {
  await openLab(page, false);
  await page.evaluate(() => window.__LL_ENGINE__!.seek(0.5));
  await expect.poll(async () => (await animations(page)).filter((a) => a.id.startsWith("ll:anim_")).length).toBe(10);
});

test("Phase 58: playing starts them at the transport's rate and pausing stops them", async ({ page }) => {
  await openLab(page, false);
  await page.evaluate(() => window.__LL_ENGINE__!.play());
  await expect.poll(async () => (await animations(page)).filter((a) => a.id.startsWith("ll:anim_") && a.state === "running").length).toBe(10);
  await page.evaluate(() => window.__LL_ENGINE__!.pause());
  await expect.poll(async () => (await animations(page)).filter((a) => a.id.startsWith("ll:anim_") && a.state === "running").length).toBe(0);
});

test("Phase 58: a busy main thread doesn't stop a running animation's clock", async ({ page }) => {
  await openLab(page, false);
  await page.evaluate(() => window.__LL_ENGINE__!.play());
  await expect.poll(async () => (await animations(page)).length).toBeGreaterThan(0);
  const before = await page.evaluate((sel) => Number(document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.getAnimations()[0].currentTime), STAGE);
  await page.evaluate(() => {
    const end = performance.now() + 400;
    while (performance.now() < end); // block the main thread
  });
  const after = await page.evaluate((sel) => Number(document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.getAnimations()[0].currentTime), STAGE);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null)))); // let the page take a frame after the block
  const settled = await page.evaluate((sel) => Number(document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.getAnimations()[0].currentTime), STAGE);
  expect(Math.max(after, settled) - before, "the animation's own clock kept running through the 400 ms block").toBeGreaterThan(250);
});

test("Phase 58: Web Animations and the kernel draw the same pixels (≤ 0.5%) at five times", async ({ page, browser }) => {
  await openLab(page, false);
  const kernelPage = await browser.newPage();
  await openLab(kernelPage, true);
  expect((await animations(kernelPage)).filter((a) => a.id.startsWith("ll:")), "the kernel-only page has no Web Animations").toHaveLength(0);
  const worst: string[] = [];
  for (const time of TIMES) {
    const a = await shotAt(page, time);
    const b = await shotAt(kernelPage, time);
    expect([a.width, a.height]).toEqual([b.width, b.height]);
    const diff = pixelmatch(a.data, b.data, undefined, a.width, a.height, { threshold: 0.1 });
    const ratio = diff / (a.width * a.height);
    worst.push(`${time}s: ${(ratio * 100).toFixed(3)}%`);
    expect(ratio, `pixel difference at ${time}s (${worst.join(", ")})`).toBeLessThanOrEqual(0.005);
  }
  await kernelPage.close();
});
