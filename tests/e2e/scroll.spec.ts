/**
 * ROADMAP Phase 81 gate (Chromium here, all three browsers in CI): in Preview the page's scroll plays scroll-driven
 * clips. A parallax follows the scroll exactly (5 positions compared with the value the kernel gives for that view
 * progress), a reveal waits at its first frame and plays once when it comes into view, and Design mode leaves both
 * as drawn. This is the scheduler-driven path; native CSS scroll-driven animation is not built yet.
 */
import { test, expect, type Page } from "@playwright/test";
import { openEditor } from "./support/editor";

const STAGE = 'iframe[title="Stage"]';
const HERO = "el_hero_heading";
const BUTTON = "el_buy_button";

const run = (page: Page, id: string, args: unknown) =>
  page.evaluate(([cid, a]) => (window as unknown as { __LL_COMMANDS__: { all: () => Array<{ id: string; run: (a: unknown) => unknown }> } }).__LL_COMMANDS__.all().find((c) => c.id === cid)!.run(a), [id, args] as const);

/** The frame's computed style of a layer, and its layout (offsetTop ignores transforms, as the driver's does). */
const read = (page: Page, id: string) =>
  page.evaluate(([sel, layer]) => {
    const frame = document.querySelector<HTMLIFrameElement>(sel)!;
    const el = frame.contentDocument!.querySelector<HTMLElement>(`[data-element-id="${layer}"]`)!;
    const cs = frame.contentWindow!.getComputedStyle(el);
    const m = /matrix\(([^)]+)\)/.exec(cs.transform);
    return { ty: m ? Number(m[1].split(",")[5]) : 0, opacity: Number(cs.opacity), top: el.offsetTop, height: el.offsetHeight, translate: cs.translate };
  }, [STAGE, id] as const);
const scrollTo = (page: Page, y: number) => page.evaluate(([sel, to]) => document.querySelector<HTMLIFrameElement>(sel)!.contentWindow!.scrollTo(0, to), [STAGE, y] as const);

async function setUp(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __LL_TEST__: boolean }).__LL_TEST__ = true;
  });
  await openEditor(page);
  await page.getByRole("button", { name: "Mount Showcase Demo" }).click();
  await page.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelector('[data-element-id="el_buy_button"]'), STAGE);
  // a page taller than the frame: the button sits far below the heading, so the frame scrolls
  await run(page, "layer.setProps", { ids: [BUTTON], props: { "frame.y": 2500, positioning: "absolute" }, label: "Move the button down" });
  await expect.poll(() => page.evaluate((sel) => document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.documentElement.scrollHeight, STAGE)).toBeGreaterThan(2000);
}

test("Phase 81: a parallax follows the scroll exactly in Preview, and Design leaves it as drawn", async ({ page }) => {
  await setUp(page);
  const { top } = await read(page, HERO);
  // the range: from the heading's top meeting the viewport's top to 1000 px further down
  await run(page, "motion.addScrollClip", { layerId: HERO, property: "transform.y", from: 0, to: -200, mode: "scrub", start: "top top", end: "top -1000px" });

  // Design: the page isn't scrolled and nothing is applied
  await scrollTo(page, top + 500);
  await page.waitForTimeout(300);
  expect((await read(page, HERO)).ty, "Design mode: drawn as it is").toBe(0);

  await page.getByRole("button", { name: "Preview", exact: true }).click();
  for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
    await scrollTo(page, top + 1000 * fraction);
    await expect.poll(async () => (await read(page, HERO)).ty, { message: `at ${fraction * 100}% of the range` }).toBeCloseTo(-200 * fraction, 0);
  }
  // before and after the range it holds the first and last frame
  await scrollTo(page, 0);
  await expect.poll(async () => (await read(page, HERO)).ty).toBeCloseTo(0, 0);
  await scrollTo(page, top + 1600);
  await expect.poll(async () => (await read(page, HERO)).ty).toBeCloseTo(-200, 0);

  // back to Design: the layer is given back
  await page.locator(".frame-bar__btn", { hasText: "Design" }).click();
  await expect.poll(async () => (await read(page, HERO)).ty).toBe(0);
});

test("Phase 81: a reveal waits at its first frame, plays once when it comes into view, and plays again after scrolling back above it", async ({ page }) => {
  await setUp(page);
  await run(page, "motion.addScrollClip", { layerId: BUTTON, property: "appearance.opacity", from: 0, to: 1, mode: "reveal", duration: 0.4 });
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await scrollTo(page, 0);
  await expect.poll(async () => (await read(page, BUTTON)).opacity, { message: "below the fold: its first frame" }).toBe(0);
  await scrollTo(page, 1638); // the bottom of the page: the button (top 2500) is in the 900 px viewport, past the 1600 where its range starts
  await expect.poll(async () => (await read(page, BUTTON)).opacity, { timeout: 5000 }).toBe(1);
  await scrollTo(page, 0);
  await expect.poll(async () => (await read(page, BUTTON)).opacity, { message: "scrolled back above the range: rewound" }).toBe(0);
  await scrollTo(page, 1638);
  await expect.poll(async () => (await read(page, BUTTON)).opacity, { timeout: 5000 }).toBe(1);
});

test("Phase 81: a pinned layer is held for the length of its range", async ({ page }) => {
  await setUp(page);
  const { top } = await read(page, HERO);
  await run(page, "motion.addScrollClip", { layerId: HERO, property: "transform.y", from: 0, to: 0, mode: "scrub", start: "top top", end: "top -400px", pin: true });
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await scrollTo(page, top + 200);
  await expect.poll(async () => (await read(page, HERO)).translate).toBe("0px 200px");
  await scrollTo(page, top + 1000);
  await expect.poll(async () => (await read(page, HERO)).translate, { message: "after the range it scrolls away: held at the range's length" }).toBe("0px 400px");
  await scrollTo(page, 0);
  await expect.poll(async () => (await read(page, HERO)).translate).toMatch(/^(0px|none)( 0px)?$/);
});
