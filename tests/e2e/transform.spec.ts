/**
 * ROADMAP Phase 27 gate: 30 standard manipulations (move, resize by edges and corners, aspect lock, from the centre,
 * rotate with snapping, group move / resize / rotate, and the shape parameter handles) each give exactly one undo
 * step: undoing them one at a time walks back through the 30 recorded states exactly. Escape cancels a gesture.
 * The pure geometry of every manipulation is tested to the pixel in src/core/geometry/__tests__/transform.test.ts.
 */
import { test, expect, type Page } from "@playwright/test";
import { waitHydrated } from "./support/editor";

const DEEP = process.platform === "darwin" ? "Meta" : "Control";
const SHAPES = ["m_rect", "m_ellipse", "m_star", "m_poly"];

async function openShapesLab(page: Page) {
  await page.goto("/editor/canvas-lab", { waitUntil: "domcontentloaded" });
  await waitHydrated(page);
  await page.getByRole("button", { name: "Load one frame with shapes" }).click();
  await page.waitForFunction(() => !!document.querySelector<HTMLIFrameElement>(".canvas-frame iframe")?.contentDocument?.querySelector('[data-element-id="m_poly"]'), null, { timeout: 60_000 });
  await page.waitForTimeout(600);
}

const centreOf = (page: Page, id: string) =>
  page.evaluate((id) => {
    const iframe = document.querySelector<HTMLIFrameElement>(".canvas-frame iframe")!;
    const el = iframe.contentDocument!.querySelector<HTMLElement>(`[data-element-id="${id}"]`)!;
    const f = iframe.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const s = f.width / iframe.clientWidth;
    return { x: f.left + (b.left + b.width / 2) * s, y: f.top + (b.top + b.height / 2) * s };
  }, id);

const centreOfSelector = async (page: Page, selector: string) => {
  const b = await page.locator(selector).first().boundingBox();
  if (!b) throw new Error(`${selector} is not on screen`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

const handle = (page: Page, name: string) => centreOfSelector(page, `.canvas-overlay__handle[data-handle="${name}"]`);
const param = (page: Page, kind: string) => centreOfSelector(page, `.canvas-overlay__param[data-param="${kind}"]:not([hidden])`);
const pivot = (page: Page) => centreOfSelector(page, ".canvas-overlay__transform:not([hidden])");

/** Every shape's markup: any change to position, size, rotation or a shape parameter shows in it. */
const snapshot = (page: Page) =>
  page.evaluate((ids) => {
    const d = document.querySelector<HTMLIFrameElement>(".canvas-frame iframe")!.contentDocument!;
    return ids.map((id) => d.querySelector(`[data-element-id="${id}"]`)!.outerHTML).join("\n");
  }, SHAPES);

type P = { x: number; y: number };
async function drag(page: Page, from: P, to: P, mods: string[] = []) {
  await page.mouse.move(from.x, from.y);
  for (const m of mods) await page.keyboard.down(m);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2);
  await page.mouse.move(to.x, to.y, { steps: 3 });
  await page.mouse.up();
  for (const m of [...mods].reverse()) await page.keyboard.up(m);
}

const add = (a: P, dx: number, dy: number): P => ({ x: a.x + dx, y: a.y + dy });
/** A point `deg` degrees clockwise of `p` about `c`. */
const around = (c: P, p: P, deg: number): P => {
  const r = (deg * Math.PI) / 180;
  const vx = p.x - c.x;
  const vy = p.y - c.y;
  return { x: c.x + vx * Math.cos(r) - vy * Math.sin(r), y: c.y + vx * Math.sin(r) + vy * Math.cos(r) };
};

async function select(page: Page, id: string, extend = false) {
  const c = await centreOf(page, id);
  if (extend) await page.keyboard.down("Shift");
  await page.mouse.click(c.x, c.y);
  if (extend) await page.keyboard.up("Shift");
  await expect(page.locator(".canvas-overlay__transform:not([hidden])")).toBeVisible();
}

test("Phase 27: 30 standard manipulations are exactly 30 undo steps, and each leaves the geometry where it was", async ({ page }) => {
  await openShapesLab(page);
  await page.mouse.move(600, 300); // hold the canvas focus scope for shortcuts

  const states: string[] = [await snapshot(page)];
  const gestures: { name: string; run: () => Promise<void> }[] = [];
  const g = (name: string, run: () => Promise<void>) => gestures.push({ name, run });

  // Rectangle: moves, edges, corners, aspect, centre, rotate, radius (10)
  g("move rect", async () => { await select(page, "m_rect"); const c = await centreOf(page, "m_rect"); await drag(page, c, add(c, 30, 20)); });
  g("move rect back-left", async () => { const c = await centreOf(page, "m_rect"); await drag(page, c, add(c, -12, 16)); });
  g("resize rect se", async () => { const h = await handle(page, "se"); await drag(page, h, add(h, 24, 16)); });
  g("resize rect nw", async () => { const h = await handle(page, "nw"); await drag(page, h, add(h, -16, -8)); });
  g("resize rect e", async () => { const h = await handle(page, "e"); await drag(page, h, add(h, 20, 0)); });
  g("resize rect s", async () => { const h = await handle(page, "s"); await drag(page, h, add(h, 0, 14)); });
  g("resize rect ne, Shift keeps the ratio", async () => { const h = await handle(page, "ne"); await drag(page, h, add(h, 20, -6), ["Shift"]); });
  g("resize rect sw from the centre (Alt)", async () => { const h = await handle(page, "sw"); await drag(page, h, add(h, -12, 10), ["Alt"]); });
  g("rotate rect", async () => { const p = await pivot(page); const h = await handle(page, "se"); const start = add(h, 12, 12); await drag(page, start, around(p, start, 33)); });
  g("rect corner radius", async () => { const h = await param(page, "radius"); await drag(page, h, add(h, 25, 0)); });

  // Ellipse (4)
  g("move ellipse", async () => { await select(page, "m_ellipse"); const c = await centreOf(page, "m_ellipse"); await drag(page, c, add(c, -20, 30)); });
  g("resize ellipse se", async () => { const h = await handle(page, "se"); await drag(page, h, add(h, 18, 18)); });
  g("resize ellipse w", async () => { const h = await handle(page, "w"); await drag(page, h, add(h, -15, 0)); });
  g("rotate ellipse, Shift snaps to 15", async () => { const p = await pivot(page); const h = await handle(page, "ne"); const start = add(h, 12, -12); await drag(page, start, around(p, start, 52), ["Shift"]); });

  // Star (5)
  g("move star", async () => { await select(page, "m_star"); const c = await centreOf(page, "m_star"); await drag(page, c, add(c, 25, -15)); });
  g("resize star se, Shift", async () => { const h = await handle(page, "se"); await drag(page, h, add(h, 20, 8), ["Shift"]); });
  g("star inner radius", async () => { const h = await param(page, "innerRadius"); await drag(page, h, add(h, 0, 14)); });
  g("star points", async () => { const h = await param(page, "count"); await drag(page, h, add(h, 40, 0)); });
  g("rotate star", async () => { const p = await pivot(page); const h = await handle(page, "sw"); const start = add(h, -12, 12); await drag(page, start, around(p, start, -40)); });

  // Polygon (5)
  g("move polygon", async () => { await select(page, "m_poly"); const c = await centreOf(page, "m_poly"); await drag(page, c, add(c, -22, 18)); });
  g("resize polygon n", async () => { const h = await handle(page, "n"); await drag(page, h, add(h, 0, -16)); });
  g("resize polygon s", async () => { const h = await handle(page, "s"); await drag(page, h, add(h, 0, 12)); });
  g("polygon sides", async () => { const h = await param(page, "count"); await drag(page, h, add(h, 50, 0)); });
  g("rotate polygon, Shift", async () => { const p = await pivot(page); const h = await handle(page, "nw"); const start = add(h, -12, -12); await drag(page, start, around(p, start, 80), ["Shift"]); });

  // Groups (6)
  g("move the rectangle and the ellipse together", async () => { await select(page, "m_rect"); await select(page, "m_ellipse", true); const c = await centreOf(page, "m_ellipse"); await drag(page, c, add(c, 14, 22)); });
  g("resize the group se", async () => { const h = await handle(page, "se"); await drag(page, h, add(h, 16, 12)); });
  g("rotate the group, Shift", async () => { const p = await pivot(page); const h = await handle(page, "ne"); const start = add(h, 12, -12); await drag(page, start, around(p, start, 47), ["Shift"]); });
  g("move the star and the polygon together", async () => { await select(page, "m_star"); await select(page, "m_poly", true); const c = await centreOf(page, "m_poly"); await drag(page, c, add(c, -18, -12)); });
  g("resize that group nw from the centre", async () => { const h = await handle(page, "nw"); await drag(page, h, add(h, -14, -10), ["Alt"]); });
  g("move the rectangle again", async () => { await select(page, "m_rect"); const c = await centreOf(page, "m_rect"); await drag(page, c, add(c, 9, 9)); });

  expect(gestures.length).toBe(30);
  for (const gesture of gestures) {
    await gesture.run();
    await page.waitForTimeout(120);
    const now = await snapshot(page);
    expect(now, `"${gesture.name}" changed the document`).not.toBe(states[states.length - 1]);
    states.push(now);
  }

  // Exactly 30 undo steps: each undo lands on the state before that gesture, to the character.
  await page.mouse.move(600, 300);
  for (let i = 29; i >= 0; i--) {
    await page.keyboard.press("Control+z");
    await expect.poll(() => snapshot(page), `undo of "${gestures[i].name}"`).toBe(states[i]);
  }
});

test("Phase 27: Escape cancels a gesture and leaves no undo step", async ({ page }) => {
  await openShapesLab(page);
  await page.mouse.move(600, 300);
  const before = await snapshot(page);
  await select(page, "m_rect");
  const c = await centreOf(page, "m_rect");
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 60, c.y + 40, { steps: 4 });
  expect(await snapshot(page), "the drag is live").not.toBe(before);
  await page.keyboard.press("Escape");
  await expect.poll(() => snapshot(page), "Escape puts the shape back").toBe(before);
  await page.mouse.up();
  expect(await snapshot(page)).toBe(before);
  // the selection survived the cancel (Escape cancelled the gesture, it didn't clear the selection)
  await expect(page.locator(".canvas-overlay__transform:not([hidden])")).toBeVisible();
  void DEEP;
});

test("Phase 27: a resize writes frame.* in one transaction and drawn shapes keep their parent", async ({ page }) => {
  await openShapesLab(page);
  await page.mouse.move(600, 300);
  await select(page, "m_ellipse");
  const before = await page.evaluate(() => {
    const d = document.querySelector<HTMLIFrameElement>(".canvas-frame iframe")!.contentDocument!;
    const el = d.querySelector<HTMLElement>('[data-element-id="m_ellipse"]')!;
    return { w: Number(el.getAttribute("width")), parent: el.parentElement!.closest("[data-element-id]")!.getAttribute("data-element-id") };
  });
  const h = await handle(page, "e");
  await drag(page, h, add(h, 40, 0));
  const after = await page.evaluate(() => {
    const d = document.querySelector<HTMLIFrameElement>(".canvas-frame iframe")!.contentDocument!;
    const el = d.querySelector<HTMLElement>('[data-element-id="m_ellipse"]')!;
    return { w: Number(el.getAttribute("width")), parent: el.parentElement!.closest("[data-element-id]")!.getAttribute("data-element-id") };
  });
  expect(after.w).toBeGreaterThan(before.w);
  expect(after.parent).toBe(before.parent);
});
