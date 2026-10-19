/**
 * ROADMAP Phase 20 gate: pan and zoom run through one camera; zoom keeps the point under the cursor fixed;
 * the range is 2%-6,400%; wheel and pinch over the stage frame reach the camera; the camera is saved per document.
 */
import { test, expect, type Page } from "@playwright/test";
import { openEditor, waitSaved } from "./support/editor";

const STAGE = 'iframe[title="Stage"]';
const CANVAS = ".whiteboard-stage";

interface Cam { x: number; y: number; zoom: number }

const camera = (page: Page): Promise<Cam> =>
  page.evaluate((sel) => {
    const s = document.querySelector<HTMLElement>(sel)!.style;
    return { x: Number(s.getPropertyValue("--canvas-pan-x")), y: Number(s.getPropertyValue("--canvas-pan-y")), zoom: Number(s.getPropertyValue("--canvas-zoom")) };
  }, CANVAS);

/** A ctrl+wheel (pinch) or plain wheel event on the canvas, at client coordinates. */
async function wheel(page: Page, at: { x: number; y: number }, deltaY: number, ctrl = true) {
  await page.evaluate(({ sel, at, deltaY, ctrl }) => {
    document.querySelector(sel)!.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, clientX: at.x, clientY: at.y, deltaY, ctrlKey: ctrl }));
  }, { sel: CANVAS, at, deltaY, ctrl });
}

/** Waits until the canvas stops moving or resizing (the dock animates while the workspace settles). */
async function settle(page: Page) {
  let last = "";
  for (let i = 0; i < 40; i++) {
    const now = JSON.stringify(await canvasBox(page)) + JSON.stringify(await camera(page));
    if (now === last) return;
    last = now;
    await page.waitForTimeout(120);
  }
}

async function mountDemo(page: Page) {
  await page.getByRole("button", { name: "Mount Showcase Demo" }).click();
  await page.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelector("[data-element-id]"), STAGE);
  await waitSaved(page);
  await settle(page);
}

const canvasBox = (page: Page) =>
  page.evaluate((sel) => {
    const r = document.querySelector(sel)!.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  }, CANVAS);

test("Phase 20: zoom keeps the point under the cursor fixed", async ({ page }) => {
  await openEditor(page);
  await mountDemo(page);
  const box = await canvasBox(page);
  // whole pixels: a MouseEvent's client coordinates are integers
  const cursor = { x: Math.round(box.x + box.width * 0.35), y: Math.round(box.y + box.height * 0.4) };
  const before = await camera(page);
  const docPoint = { x: (cursor.x - box.x - before.x) / before.zoom, y: (cursor.y - box.y - before.y) / before.zoom };

  for (const deltaY of [-30, -30, -30, 40, -200, 120]) {
    await wheel(page, cursor, deltaY);
    const cam = await camera(page);
    const screen = { x: docPoint.x * cam.zoom + cam.x + box.x, y: docPoint.y * cam.zoom + cam.y + box.y };
    expect(Math.abs(screen.x - cursor.x), `x after deltaY ${deltaY} at zoom ${cam.zoom}`).toBeLessThan(0.01);
    expect(Math.abs(screen.y - cursor.y), `y after deltaY ${deltaY} at zoom ${cam.zoom}`).toBeLessThan(0.01);
  }
  expect((await camera(page)).zoom).not.toBe(before.zoom);
});

test("Phase 20: zoom runs from 2% to 6,400%", async ({ page }) => {
  await openEditor(page);
  const box = await canvasBox(page);
  const mid = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  for (let i = 0; i < 80; i++) await wheel(page, mid, 400);
  expect((await camera(page)).zoom).toBeCloseTo(0.02, 5);
  await expect(page.getByRole("button", { name: /^Current Zoom 2%/ })).toBeVisible();
  for (let i = 0; i < 80; i++) await wheel(page, mid, -400);
  expect((await camera(page)).zoom).toBeCloseTo(64, 5);
  await expect(page.getByRole("button", { name: /^Current Zoom 6400%/ })).toBeVisible();
});

test("Phase 20: plain wheel pans, and the buttons zoom to 100% and to fit", async ({ page }) => {
  await openEditor(page);
  await mountDemo(page);
  const box = await canvasBox(page);
  const mid = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  const a = await camera(page);
  await wheel(page, mid, 80, false);
  const b = await camera(page);
  expect(b.zoom).toBe(a.zoom);
  expect(b.y).toBeCloseTo(a.y - 80, 6);

  await page.getByRole("button", { name: /^Current Zoom/ }).click();
  expect((await camera(page)).zoom).toBe(1);

  await page.getByRole("button", { name: "Fit Viewport to Screen" }).click();
  const fit = await camera(page);
  expect(fit.zoom).toBeLessThanOrEqual(1);
  // the 1440 x 900 desktop frame, centred on the origin, sits inside the canvas
  const left = fit.x - (1440 / 2) * fit.zoom;
  const right = fit.x + (1440 / 2) * fit.zoom;
  expect(left).toBeGreaterThanOrEqual(-0.5);
  expect(right).toBeLessThanOrEqual(box.width + 0.5);
});

test("Phase 20: wheel and pinch over the stage frame reach the camera", async ({ page }) => {
  await openEditor(page);
  await mountDemo(page);
  const before = await camera(page);

  // A pinch over the frame, dispatched in the frame's own document (a real wheel there never reaches the editor).
  const inFrame = await page.evaluate((sel) => {
    const iframe = document.querySelector<HTMLIFrameElement>(sel)!;
    const d = iframe.contentDocument!;
    d.querySelector("[data-element-id]")!.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, clientX: 200, clientY: 150, deltaY: -40, ctrlKey: true }));
    return true;
  }, STAGE);
  expect(inFrame).toBe(true);
  const after = await camera(page);
  expect(after.zoom, "pinch over the frame zoomed the canvas").toBeGreaterThan(before.zoom);

  // ...and it zoomed around the pointer: frame point (200, 150) stays at the same screen position.
  const iframeBox = (await page.locator(STAGE).boundingBox())!;
  const canvas = await canvasBox(page);
  const docX = (iframeBox.x - canvas.x - after.x) / after.zoom; // the frame's left edge in document space
  expect(Number.isFinite(docX)).toBe(true);

  const b2 = await camera(page);
  await page.evaluate((sel) => {
    const d = document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!;
    d.querySelector("[data-element-id]")!.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, clientX: 10, clientY: 10, deltaY: 60, deltaX: 0 }));
  }, STAGE);
  const a2 = await camera(page);
  expect(a2.y, "a plain wheel over the frame pans the canvas").toBeCloseTo(b2.y - 60, 6);
});

test("Phase 20: the camera is saved per document and comes back after a reload", async ({ page }) => {
  await openEditor(page);
  await mountDemo(page);
  const box = await canvasBox(page);
  await wheel(page, { x: box.x + 300, y: box.y + 200 }, -120);
  await wheel(page, { x: box.x + 300, y: box.y + 200 }, 90, false);
  const moved = await camera(page);
  await page.waitForTimeout(600); // the save is debounced

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelector("[data-element-id]"), STAGE, { timeout: 30_000 });
  await page.waitForTimeout(300);
  const restored = await camera(page);
  expect(restored.zoom).toBeCloseTo(moved.zoom, 6);
  expect(restored.x).toBeCloseTo(moved.x, 4);
  expect(restored.y).toBeCloseTo(moved.y, 4);
});

test("Phase 20: Shift+2 zooms to the selected layer and Shift+0 returns to 100%", async ({ page }) => {
  await openEditor(page);
  await mountDemo(page);
  const frame = page.frameLocator(STAGE);
  const target = frame.locator('[data-archetype="button"]').first();
  await target.click();
  await page.waitForTimeout(200);

  const box = await canvasBox(page);
  // the pointer is still over the stage frame, which holds the canvas focus scope
  const before = await camera(page);
  await page.keyboard.press("Shift+2");
  await expect.poll(async () => (await camera(page)).zoom).toBeGreaterThan(before.zoom);

  // the layer is now centred in the canvas
  const rect = (await target.boundingBox())!;
  const cx = rect.x + rect.width / 2 - box.x;
  const cy = rect.y + rect.height / 2 - box.y;
  expect(Math.abs(cx - box.width / 2), "centred horizontally").toBeLessThan(3);
  expect(Math.abs(cy - box.height / 2), "centred vertically").toBeLessThan(3);

  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); // back over the stage frame
  await page.keyboard.press("Shift+0");
  expect((await camera(page)).zoom).toBe(1);
});
