/**
 * ROADMAP Phase 23 gate: one overlay layer above the frames draws the hover outline and the selection; the outline
 * appears within a frame of the pointer event with 1,000+ layers; Design mode picks layers, Preview mode lets a
 * click reach the page (a button in a frame).
 */
import { test, expect, type Page } from "@playwright/test";
import { waitHydrated } from "./support/editor";

const CANVAS = ".whiteboard-stage";

async function openLab(page: Page) {
  await page.goto("/editor/canvas-lab", { waitUntil: "domcontentloaded" });
  await waitHydrated(page);
  await page.getByRole("button", { name: "Load 5 frames × 200 layers" }).click();
  await page.waitForFunction(() => {
    const frames = Array.from(document.querySelectorAll<HTMLIFrameElement>(".canvas-frame iframe"));
    return frames.length === 5 && frames.every((f) => (f.contentDocument?.querySelectorAll("[data-element-id]").length ?? 0) >= 200);
  }, null, { timeout: 60_000 });
  await page.getByRole("button", { name: "Zoom Out" }).click();
  await page.waitForTimeout(500);
}

/** Centre, in page coordinates, of a layer's element in its frame. */
const centreOf = (page: Page, id: string) =>
  page.evaluate(({ id }) => {
    for (const iframe of Array.from(document.querySelectorAll<HTMLIFrameElement>(".canvas-frame iframe"))) {
      const el = iframe.contentDocument?.querySelector<HTMLElement>(`[data-element-id="${id}"]`);
      if (!el) continue;
      const f = iframe.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      return { x: Math.round(f.left + (b.left + b.width / 2) * (f.width / iframe.clientWidth)), y: Math.round(f.top + (b.top + b.height / 2) * (f.height / iframe.clientHeight)) };
    }
    return null;
  }, { id });

test("Phase 23: the overlay is one layer above the frames and never takes the pointer", async ({ page }) => {
  await openLab(page);
  const info = await page.evaluate(() => {
    const overlay = document.querySelector<HTMLElement>(".canvas-overlay")!;
    const frame = document.querySelector<HTMLElement>(".canvas-frame")!;
    return {
      count: document.querySelectorAll(".canvas-overlay").length,
      pointerEvents: getComputedStyle(overlay).pointerEvents,
      sameWorld: overlay.parentElement === frame.parentElement,
      after: !!(frame.compareDocumentPosition(overlay) & Node.DOCUMENT_POSITION_FOLLOWING),
      z: Number(getComputedStyle(overlay).zIndex),
    };
  });
  expect(info).toMatchObject({ count: 1, pointerEvents: "none", sameWorld: true, after: true });
  expect(info.z).toBeGreaterThan(0);
});

test("Phase 23: the hover outline appears within one frame of the pointer, with 1,000+ layers", async ({ page }) => {
  await openLab(page);
  const target = await centreOf(page, "f1_g0_t3");
  expect(target).not.toBeNull();
  await page.mouse.move(target!.x - 60, target!.y - 40); // somewhere else on the canvas first
  await page.waitForTimeout(100);

  // Dispatch one mousemove and count animation frames until the outline names the layer.
  const frames = await page.evaluate(
    ({ sel, at }) =>
      new Promise<number>((resolve) => {
        const canvas = document.querySelector(sel)!;
        canvas.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: at.x, clientY: at.y }));
        let n = 0;
        const tick = () => {
          n++;
          const hover = document.querySelector<HTMLElement>(".canvas-overlay__hover");
          if (hover && !hover.hidden && hover.dataset.hoverId === "f1_g0") resolve(n);
          else if (n > 10) resolve(-1);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { sel: CANVAS, at: target! },
  );
  test.info().annotations.push({ type: "frames until the outline", description: String(frames) });
  expect(frames, "the outline is there by the second animation frame (within one frame of the event)").toBeGreaterThan(0);
  expect(frames).toBeLessThanOrEqual(2);
});

test("Phase 23: a selected layer gets a selection outline with its name and size", async ({ page }) => {
  await openLab(page);
  const t = await centreOf(page, "f0_g0_t2");
  await page.mouse.click(t!.x, t!.y);
  const sel = page.locator(".canvas-overlay__selection:not([hidden])");
  await expect(sel).toHaveCount(1);
  await expect(sel).toHaveAttribute("data-layer-id", "f0_g0");
  await expect(sel.locator(".canvas-overlay__label")).toHaveText(/^Group 0 · \d+ × \d+$/);
});

test("Phase 23: Design mode picks layers; in Preview a click reaches the page", async ({ page }) => {
  await openLab(page);
  // a click handler on a text layer inside the frame, standing in for a button's own handler
  await page.evaluate(() => {
    const w = window as unknown as { __clicks: string[] };
    w.__clicks = [];
    for (const iframe of Array.from(document.querySelectorAll<HTMLIFrameElement>(".canvas-frame iframe"))) {
      iframe.contentDocument?.querySelector('[data-element-id="f0_g0_t1"]')?.addEventListener("click", () => w.__clicks.push("f0_g0_t1"));
    }
  });
  const t = await centreOf(page, "f0_g0_t1");
  const clicks = () => page.evaluate(() => (window as unknown as { __clicks: string[] }).__clicks.length);

  await page.mouse.click(t!.x, t!.y);
  await expect(page.getByTestId("selected")).toHaveText("f0_g0");
  expect(await clicks(), "Design mode: the click is the canvas' and never reaches the frame").toBe(0);

  await page.getByRole("group", { name: "Canvas mode" }).getByRole("button", { name: "Preview" }).click();
  await expect(page.locator(".canvas-overlay__selection:not([hidden])"), "the overlay shows no selection in Preview").toHaveCount(0);
  await page.mouse.click(t!.x, t!.y);
  await expect.poll(clicks, "Preview mode: the click reaches the page").toBe(1);
  await expect(page.getByTestId("selected"), "a Preview click doesn't change the selection").toHaveText("f0_g0");

  await page.getByRole("group", { name: "Canvas mode" }).getByRole("button", { name: "Design" }).click();
  await page.mouse.click(t!.x, t!.y);
  expect(await clicks()).toBe(1);
});
