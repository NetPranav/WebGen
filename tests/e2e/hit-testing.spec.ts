/**
 * ROADMAP Phase 22 gate: the canvas captures every pointer event in Design mode (the frames get none), and a
 * click picks the layer the hit index says: clicks at 20 known points select the expected layers at 3 zoom
 * levels, Cmd/Ctrl deep-selects, locked and hidden layers are skipped, and hovering shows what a click would select.
 * The index's speed (p95 < 1 ms with 1,000 layers) is a unit test: src/core/hit/__tests__/hitTest.test.ts.
 */
import { test, expect, type Page } from "@playwright/test";

const CANVAS = ".whiteboard-stage";

/** The deep-select modifier: Cmd on a Mac (Ctrl+click is a right-click there), Ctrl elsewhere. */
const DEEP = process.platform === "darwin" ? "Meta" : "Control";

async function openLab(page: Page) {
  await page.goto("/editor/canvas-lab", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Load 5 frames × 200 layers" }).click();
  await page.waitForFunction(() => {
    const frames = Array.from(document.querySelectorAll<HTMLIFrameElement>(".canvas-frame iframe"));
    return frames.length === 5 && frames.every((f) => (f.contentDocument?.querySelectorAll("[data-element-id]").length ?? 0) >= 200);
  }, null, { timeout: 60_000 });
  await page.waitForTimeout(600);
}

const selected = (page: Page) => page.getByTestId("selected");

interface Point { id: string; x: number; y: number }

/** Text layers whose centre is on the canvas (clear of the floating chrome), with that centre in page coordinates. */
async function visibleTexts(page: Page): Promise<Point[]> {
  return page.evaluate((sel) => {
    const canvas = document.querySelector(sel)!.getBoundingClientRect();
    const out: { id: string; x: number; y: number }[] = [];
    for (const iframe of Array.from(document.querySelectorAll<HTMLIFrameElement>(".canvas-frame iframe"))) {
      const f = iframe.getBoundingClientRect();
      const sx = f.width / iframe.clientWidth;
      const sy = f.height / iframe.clientHeight;
      for (const el of Array.from(iframe.contentDocument!.querySelectorAll<HTMLElement>('[data-archetype="text"]'))) {
        const b = el.getBoundingClientRect();
        const x = Math.round(f.left + (b.left + b.width / 2) * sx);
        const y = Math.round(f.top + (b.top + b.height / 2) * sy);
        const insideFrame = b.top >= 0 && b.bottom <= iframe.clientHeight && b.left >= 0 && b.right <= iframe.clientWidth;
        // clear of the frame bar (top-left), the dock (bottom) and the zoom controls (bottom-right)
        if (insideFrame && x > canvas.left + 40 && x < canvas.right - 220 && y > canvas.top + 70 && y < canvas.bottom - 110) out.push({ id: el.dataset.elementId!, x, y });
      }
    }
    return out;
  }, CANVAS);
}

/** `count` points spread across the visible texts. */
const spread = (points: Point[], count: number) => Array.from({ length: count }, (_, i) => points[Math.floor((i * points.length) / count)]);

const groupOf = (textId: string) => textId.replace(/_t\d+$/, "");

test("Phase 22: the frames get no pointer events in Design mode", async ({ page }) => {
  await openLab(page);
  const states = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLIFrameElement>(".canvas-frame iframe")).map((f) => getComputedStyle(f).pointerEvents));
  expect(states).toEqual(["none", "none", "none", "none", "none"]);
});

test("Phase 22: clicks at 20 known points select the expected layers at 3 zoom levels", async ({ page }) => {
  await openLab(page);
  const readout = page.getByRole("button", { name: /^Current Zoom/ });
  const levels: number[] = [];

  await readout.click(); // 100%
  for (const stepsOut of [0, 3, 6]) {
    if (stepsOut > 0) for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Zoom Out" }).click();
    await page.waitForTimeout(250);
    levels.push(Number((/Current Zoom (\d+)%/.exec((await readout.getAttribute("aria-label")) ?? "") ?? [])[1]));

    const points = spread(await visibleTexts(page), 20);
    expect(points.filter(Boolean).length, `20 points at ${levels.at(-1)}%`).toBe(20);
    for (const p of points) {
      await page.mouse.click(p.x, p.y);
      await expect(selected(page), `plain click on ${p.id}`).toHaveText(groupOf(p.id)); // the frame's direct child
      await page.keyboard.down(DEEP);
      await page.mouse.click(p.x, p.y);
      await page.keyboard.up(DEEP);
      await expect(selected(page), `deep click on ${p.id}`).toHaveText(p.id); // deep select
    }
  }
  expect(new Set(levels).size, `three different zoom levels: ${levels}`).toBe(3);
});

test("Phase 22: a locked layer is skipped and a hidden one is not there to hit", async ({ page }) => {
  await openLab(page);
  await page.getByRole("button", { name: "Zoom Out" }).click();
  await page.waitForTimeout(250);
  const texts = await visibleTexts(page);
  const inGroup = (g: string) => texts.find((t) => groupOf(t.id) === g);

  const open = inGroup("f0_g0");
  expect(open, "a text of the open group is on screen").toBeTruthy();
  await page.mouse.click(open!.x, open!.y);
  await expect(selected(page)).toHaveText("f0_g0");

  await page.getByRole("button", { name: "Lock f0_g1" }).click();
  await page.getByRole("button", { name: "Hide f0_g2" }).click();
  await page.waitForTimeout(300);
  const after = await visibleTexts(page);
  const locked = after.find((t) => groupOf(t.id) === "f0_g1");
  expect(locked, "the locked group is still drawn").toBeTruthy();
  await page.mouse.click(locked!.x, locked!.y);
  await expect(selected(page), "the click falls through a locked group to its frame").toHaveText("frame_0");
  await page.keyboard.down(DEEP);
  await page.mouse.click(locked!.x, locked!.y);
  await page.keyboard.up(DEEP);
  await expect(selected(page), "deep select doesn't enter a locked group either").toHaveText("frame_0");
  expect(after.some((t) => groupOf(t.id) === "f0_g2"), "a hidden group isn't drawn").toBe(false);
});

test("Phase 22: hovering shows the layer a click would select", async ({ page }) => {
  await openLab(page);
  await page.getByRole("button", { name: "Zoom Out" }).click();
  await page.waitForTimeout(250);
  const p = (await visibleTexts(page))[40];
  await page.mouse.move(p.x, p.y);
  await expect(page.locator(".canvas-overlay__hover")).toHaveAttribute("data-hover-id", groupOf(p.id));
  await page.keyboard.down(DEEP);
  await page.mouse.move(p.x + 1, p.y);
  await expect(page.locator(".canvas-overlay__hover")).toHaveAttribute("data-hover-id", p.id);
  await page.keyboard.up(DEEP);
  await page.mouse.move(2, 2); // off the canvas
  await expect(page.locator(".canvas-overlay__hover:not([hidden])")).toHaveCount(0);
});
