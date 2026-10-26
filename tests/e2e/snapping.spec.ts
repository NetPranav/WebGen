/**
 * ROADMAP Phase 28 gate: snapping (to other layers' edges, to ruler guides, to the pixel grid), smart-guide lines,
 * the Alt distance HUD, rulers with draggable guides, snap toggles, and guides persisting per frame. The golden
 * numbers for every case are in src/core/geometry/__tests__/snap.test.ts; this drives the real canvas.
 */
import { test, expect, type Page } from "@playwright/test";
import { openEditor, waitSaved, waitHydrated } from "./support/editor";

async function openShapesLab(page: Page) {
  await page.goto("/editor/canvas-lab", { waitUntil: "domcontentloaded" });
  await waitHydrated(page);
  await page.getByRole("button", { name: "Load one frame with shapes" }).click();
  await page.waitForFunction(() => !!document.querySelector<HTMLIFrameElement>(".canvas-frame iframe")?.contentDocument?.querySelector('[data-element-id="m_poly"]'), null, { timeout: 60_000 });
  await page.waitForTimeout(600);
}

type P = { x: number; y: number };

const centreOf = (page: Page, id: string) =>
  page.evaluate((id) => {
    const iframe = document.querySelector<HTMLIFrameElement>(".canvas-frame iframe")!;
    const el = iframe.contentDocument!.querySelector<HTMLElement>(`[data-element-id="${id}"]`)!;
    const f = iframe.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const s = f.width / iframe.clientWidth;
    return { x: f.left + (b.left + b.width / 2) * s, y: f.top + (b.top + b.height / 2) * s };
  }, id);

/** The camera's zoom: screen px per canvas px. */
const zoomOf = (page: Page) => page.evaluate(() => Number(document.querySelector<HTMLElement>(".whiteboard-stage")!.style.getPropertyValue("--canvas-zoom")));

const styleNumber = (page: Page, id: string, prop: "left" | "top") =>
  page.evaluate(({ id, prop }) => parseFloat(document.querySelector<HTMLIFrameElement>(".canvas-frame iframe")!.contentDocument!.querySelector<HTMLElement>(`[data-element-id="${id}"]`)!.style[prop]), { id, prop });
const attr = (page: Page, id: string, name: string) =>
  page.evaluate(({ id, name }) => Number(document.querySelector<HTMLIFrameElement>(".canvas-frame iframe")!.contentDocument!.querySelector(`[data-element-id="${id}"]`)!.getAttribute(name)), { id, name });

async function select(page: Page, id: string) {
  const c = await centreOf(page, id);
  await page.mouse.click(c.x, c.y);
  await expect(page.locator(".canvas-overlay__transform:not([hidden])")).toBeVisible();
}

async function dragTo(page: Page, from: P, to: P, hold = false) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2);
  await page.mouse.move(to.x, to.y, { steps: 3 });
  if (!hold) await page.mouse.up();
}

const handle = async (page: Page, name: string) => {
  const b = (await page.locator(`.canvas-overlay__handle[data-handle="${name}"]`).first().boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

const snapLines = (page: Page) => page.locator(".canvas-overlay__snapline:not([hidden])");

test("Phase 28: a moved layer snaps to another layer's edge, shows the guide line while it does, and clears it after", async ({ page }) => {
  await openShapesLab(page);
  await page.mouse.move(600, 300);
  await select(page, "m_rect"); // x 450..650, y 150..270; the ellipse starts at x 900
  const z = await zoomOf(page);
  const c = await centreOf(page, "m_rect");
  // 250 canvas px would put the right edge exactly on the ellipse's left edge (900); drag 4 px short of that
  await dragTo(page, c, { x: c.x + (250 - 4) * z, y: c.y }, true);
  await expect(snapLines(page).first()).toBeVisible();
  await page.mouse.up();
  await expect(snapLines(page)).toHaveCount(0);
  expect(await styleNumber(page, "m_rect", "left"), "snapped: the right edge is on x = 900").toBe(700);
});

test("Phase 28: turning snapping off lets the same drag land where the pointer put it", async ({ page }) => {
  await openShapesLab(page);
  await page.mouse.move(600, 300);
  await page.getByRole("group", { name: "Snapping" }).getByRole("button", { name: "Snap objects" }).click();
  await select(page, "m_rect");
  const z = await zoomOf(page);
  const c = await centreOf(page, "m_rect");
  await dragTo(page, c, { x: c.x + (250 - 4) * z, y: c.y });
  const left = await styleNumber(page, "m_rect", "left");
  expect(Math.abs(left - 700), `unsnapped at ${left}`).toBeGreaterThan(0.5);
});

test("Phase 28: a resize snaps the dragged edge", async ({ page }) => {
  await openShapesLab(page);
  await page.mouse.move(600, 300);
  await select(page, "m_rect");
  const z = await zoomOf(page);
  const e = await handle(page, "e");
  await dragTo(page, e, { x: e.x + (250 - 5) * z, y: e.y });
  expect(await attr(page, "m_rect", "width"), "the right edge landed on x = 900: 200 + 250").toBe(450);
});

test("Phase 28: the Alt key shows the distances to the nearest neighbours", async ({ page }) => {
  await openShapesLab(page);
  await page.mouse.move(600, 300);
  await select(page, "m_rect");
  await expect(page.locator(".canvas-overlay__spacing:not([hidden])")).toHaveCount(0);
  await page.keyboard.down("Alt");
  await expect.poll(() => page.locator(".canvas-overlay__spacing:not([hidden])").count()).toBeGreaterThan(0);
  const labels = await page.locator(".canvas-overlay__spacing:not([hidden]) span").allTextContents();
  expect(labels.every((t) => /^\d+$/.test(t)), `numeric distances: ${labels}`).toBe(true);
  // the gap to the ellipse (x 650 to 900) is 250
  expect(labels).toContain("250");
  await page.keyboard.up("Alt");
  await expect(page.locator(".canvas-overlay__spacing:not([hidden])")).toHaveCount(0);
});

test("Phase 28: a guide dragged out of the ruler is a snap target, and the rulers can be hidden", async ({ page }) => {
  await openShapesLab(page);
  await page.mouse.move(600, 300);
  await expect(page.locator('[data-ruler="top"]')).toBeVisible();
  await expect(page.locator('[data-ruler="left"]')).toBeVisible();

  const stage = (await page.locator(".whiteboard-stage").boundingBox())!;
  const z = await zoomOf(page);
  const frameLeft = await page.evaluate(() => document.querySelector<HTMLIFrameElement>(".canvas-frame iframe")!.getBoundingClientRect().left);
  const gx = Math.round(frameLeft + 300 * z); // a vertical guide at about x = 300 in the frame
  await dragTo(page, { x: stage.x + 8, y: stage.y + 300 }, { x: gx, y: stage.y + 300 });
  const guide = page.locator('.canvas-overlay__guide[data-axis="x"]:not([hidden])');
  await expect(guide).toHaveCount(1);

  // snap the rectangle's left edge (x 450) to the guide: drag it left by about 150 canvas px
  await select(page, "m_rect");
  const c = await centreOf(page, "m_rect");
  const guidePos = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('.canvas-overlay__guide[data-axis="x"]')!;
    return parseFloat(el.style.left);
  });
  await dragTo(page, c, { x: c.x - (450 - guidePos - 3) * z, y: c.y });
  expect(await styleNumber(page, "m_rect", "left"), "the left edge is on the guide").toBe(guidePos);

  // dragging the guide back onto the ruler deletes it
  const g = await page.locator('.canvas-overlay__guide[data-axis="x"]').boundingBox();
  const gs = { x: g!.x + g!.width / 2, y: stage.y + 400 };
  await dragTo(page, gs, { x: stage.x + 6, y: stage.y + 400 });
  await expect(page.locator('.canvas-overlay__guide[data-axis="x"]:not([hidden])')).toHaveCount(0);

  await page.getByRole("group", { name: "Snapping" }).getByRole("button", { name: "Rulers" }).click();
  await expect(page.locator('[data-ruler="top"]')).toHaveCount(0);
  await expect(page.locator('[data-ruler="left"]')).toHaveCount(0);
});

test("Phase 28: guides belong to their frame, are saved, undone and restored", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Mount Showcase Demo" }).click();
  await page.waitForFunction(() => !!document.querySelector<HTMLIFrameElement>('iframe[title="Stage"]')?.contentDocument?.querySelector("[data-element-id]"));
  await waitSaved(page);
  await page.waitForTimeout(400);
  const stage = (await page.locator(".whiteboard-stage").boundingBox())!;
  const fr = (await page.locator(".canvas-frame").first().boundingBox())!;

  await dragTo(page, { x: stage.x + stage.width / 2, y: stage.y + 8 }, { x: stage.x + stage.width / 2, y: fr.y + 40 }); // a horizontal guide, from the top ruler
  const guides = page.locator('.canvas-overlay__guide[data-axis="y"]:not([hidden])');
  await expect(guides).toHaveCount(1);
  await waitSaved(page);

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator('.canvas-overlay__guide[data-axis="y"]:not([hidden])'), "the guide comes back with the document").toHaveCount(1);

  await page.mouse.move(stage.x + 300, stage.y + 300);
  await page.keyboard.press("Control+z");
  await expect(page.locator('.canvas-overlay__guide[data-axis="y"]:not([hidden])'), "undo takes the guide away").toHaveCount(0);
});
