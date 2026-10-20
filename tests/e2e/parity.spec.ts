/**
 * ROADMAP Phase 60 gate: an injected wrong easing raises `[PARITY_DRIFT]` and turns the status-bar badge red;
 * correct playback stays green. The ten reference animations of the stage lab run as Web Animations; the test
 * then changes one running animation's easing under the engine's feet.
 */
import { test, expect, type Page } from "@playwright/test";
import { openEditor, openSequencer, seekRuler } from "./support/editor";

const STAGE = 'iframe[title="Stage"]';

async function openLab(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __LL_TEST__: boolean }).__LL_TEST__ = true;
  });
  await page.goto("/editor/stage-lab", { waitUntil: "domcontentloaded" });
  await page.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.getElementById("stage-root"), STAGE, { timeout: 45_000 });
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

const parity = (page: Page) => page.evaluate(() => window.__LL_ENGINE__!.parity() as { status: string; samples: number; checked: number; drifts: Array<{ property: string }> });

test("Phase 60: correct playback stays green", async ({ page }) => {
  await openLab(page);
  const warnings: string[] = [];
  page.on("console", (m) => m.type() === "warning" && warnings.push(m.text()));
  await page.evaluate(() => {
    window.__LL_ENGINE__!.loop(true); // playback must not run out while the monitor samples (a slow browser takes a while)
    window.__LL_ENGINE__!.play();
  });
  await expect.poll(async () => (await parity(page)).samples, { timeout: 30_000 }).toBeGreaterThanOrEqual(4);
  const state = await parity(page);
  expect(state.status, JSON.stringify(state.drifts)).toBe("ok");
  expect(state.checked).toBeGreaterThan(0);
  expect(warnings.filter((w) => w.includes("PARITY_DRIFT"))).toHaveLength(0);
});

test("Phase 60: an injected wrong easing raises [PARITY_DRIFT]", async ({ page }) => {
  await openLab(page);
  const warnings: string[] = [];
  page.on("console", (m) => m.type() === "warning" && warnings.push(m.text()));
  await page.evaluate(() => {
    window.__LL_ENGINE__!.loop(true);
    window.__LL_ENGINE__!.play();
  });
  await expect.poll(async () => (await parity(page)).status, { timeout: 30_000 }).toBe("ok");

  // Change one running animation's easing: the engine now shows a different curve from the kernel's.
  await page.evaluate((sel) => {
    const doc = document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!;
    const target = doc.getAnimations().find((a) => a.id === "ll:anim_0")!;
    (target.effect as KeyframeEffect).updateTiming({ easing: "steps(3, end)" });
  }, STAGE);

  await expect.poll(async () => (await parity(page)).status, { timeout: 30_000 }).toBe("drift");
  const state = await parity(page);
  expect(state.drifts.length).toBeGreaterThan(0);
  await expect.poll(() => warnings.some((w) => w.includes("[PARITY_DRIFT]") && w.includes("anim_0"))).toBe(true);
});

test("Phase 60: the badge shows the state in the editor's status bar", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __LL_TEST__: boolean }).__LL_TEST__ = true;
  });
  await openEditor(page);
  const badge = page.getByRole("status", { name: "Engine parity" });
  await expect(badge).toHaveAttribute("data-parity", "idle");
  await page.getByRole("tab", { name: /Animate/ }).click();
  await openSequencer(page);
  await page.getByRole("button", { name: "Mount Showcase Demo" }).click();
  await seekRuler(page, 0.4);
  await page.getByRole("button", { name: "+ Keyframe" }).click();
  await page.getByRole("button", { name: "Stop and return to start" }).first().click();
  await page.getByRole("button", { name: "Play", exact: true }).first().click();
  await expect(badge, "the badge turns green while an engine runs the demo").toHaveAttribute("data-parity", "ok", { timeout: 15_000 });
  await page.getByRole("button", { name: "Pause", exact: true }).first().click();
  await expect(badge).toHaveAttribute("data-parity", "idle", { timeout: 10_000 });
});
