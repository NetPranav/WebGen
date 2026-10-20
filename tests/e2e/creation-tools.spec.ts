/**
 * ROADMAP Phase 25 gate: draw with each creation tool and check the geometry, the parent and the undo. A layer drawn
 * inside a frame is parented to it; Shift constrains and Alt draws from the centre; each creation is one undo step
 * and leaves the new layer selected; over bare canvas only the Frame tool does anything.
 */
import { test, expect, type Page } from "@playwright/test";
import { openEditor, waitSaved } from "./support/editor";

const CANVAS = ".whiteboard-stage";
const STAGE = 'iframe[title="Stage"]';

async function ready(page: Page) {
  await openEditor(page);
  await page.getByRole("button", { name: "Mount Showcase Demo" }).click();
  await page.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelector("[data-element-id]"), STAGE);
  await waitSaved(page);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForTimeout(400);
}

interface FrameGeom { left: number; top: number; zoom: number; rootId: string }

/** Where the stage frame is on screen, and the camera's zoom. */
const frameGeom = (page: Page): Promise<FrameGeom> =>
  page.evaluate((sel) => {
    const iframe = document.querySelector<HTMLIFrameElement>(sel)!;
    const r = iframe.getBoundingClientRect();
    const root = iframe.contentDocument!.querySelector("[data-stage-content] > [data-element-id]") as HTMLElement;
    return { left: r.left, top: r.top, zoom: r.width / iframe.clientWidth, rootId: root.dataset.elementId! };
  }, STAGE);

const layerIds = (page: Page) =>
  page.evaluate((sel) => Array.from(document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelectorAll("[data-element-id]")).map((e) => (e as HTMLElement).dataset.elementId!), STAGE);

/** A layer's box inside its frame document (document px), its parent's id, and its rotation style. */
const layerInfo = (page: Page, id: string) =>
  page.evaluate(({ sel, id }) => {
    const d = document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!;
    const el = d.querySelector<HTMLElement>(`[data-element-id="${id}"]`)!;
    const parent = el.parentElement?.closest("[data-element-id]") as HTMLElement | null;
    const b = el.getBoundingClientRect();
    return { x: b.left, y: b.top, width: b.width, height: b.height, parentId: parent?.dataset.elementId ?? null, archetype: el.dataset.archetype, transform: el.style.transform, attrWidth: Number(el.getAttribute("width")) };
  }, { sel: STAGE, id });

async function drawWith(page: Page, key: string, from: { x: number; y: number }, to: { x: number; y: number }, mods: string[] = []) {
  await page.mouse.move(from.x, from.y); // the canvas focus scope follows the pointer: shortcuts need it over the canvas
  await page.keyboard.press(key);
  for (const m of mods) await page.keyboard.down(m);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2);
  await page.mouse.move(to.x, to.y, { steps: 3 });
  await page.mouse.up();
  for (const m of mods.reverse()) await page.keyboard.up(m);
}

/** The id that appeared since `before`. */
async function created(page: Page, before: string[]): Promise<string> {
  await expect.poll(async () => (await layerIds(page)).length).toBeGreaterThan(before.length);
  const now = await layerIds(page);
  return now.find((id) => !before.includes(id))!;
}

/** Pointer positions are whole screen pixels, so at a zoom below 100% a document px is worth less than one: allow two of them. */
const near = (a: number, b: number, tol = 3) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol);

test("Phase 25: every box tool draws inside the frame with the dragged geometry, parented to it, selected, one undo step", async ({ page }) => {
  await ready(page);
  const g = await frameGeom(page);
  const sx = (docX: number) => g.left + docX * g.zoom;
  const sy = (docY: number) => g.top + docY * g.zoom;

  const cases: { key: string; archetype: string }[] = [
    { key: "r", archetype: "rectangle" },
    { key: "o", archetype: "ellipse" },
    { key: "y", archetype: "polygon" },
    { key: "Shift+y", archetype: "star" },
    { key: "t", archetype: "text" },
    { key: "f", archetype: "container" },
  ];
  let row = 0;
  for (const c of cases) {
    row++;
    const before = await layerIds(page);
    const docBox = { x: 100 + row * 20, y: 160 + row * 70, w: 220, h: 50 };
    await drawWith(page, c.key, { x: sx(docBox.x), y: sy(docBox.y) }, { x: sx(docBox.x + docBox.w), y: sy(docBox.y + docBox.h) });
    const id = await created(page, before);
    const info = await layerInfo(page, id);
    expect(info.archetype, `${c.key} makes a ${c.archetype}`).toBe(c.archetype);
    expect(info.parentId, `${c.archetype} is parented to the frame it was drawn in`).toBe(g.rootId);
    near(info.x, docBox.x);
    near(info.y, docBox.y);
    near(info.width, docBox.w);
    near(info.height, docBox.h);

    // selected, and back to the Select tool
    await expect(page.locator(".canvas-overlay__selection:not([hidden])")).toHaveAttribute("data-layer-id", id);
    await expect(page.locator(CANVAS)).toHaveAttribute("data-tool", "select");

    // A text box is typed into straight away (Phase 31); leaving it empty throws it away.
    if (c.archetype === "text") {
      await expect(page.locator(".canvas-text-editor")).toBeFocused();
      await page.keyboard.press("Escape");
      await expect.poll(async () => (await layerIds(page)).includes(id), "an empty text box is discarded on Escape").toBe(false);
      continue;
    }

    // one undo step takes exactly this layer away, and redo brings it back
    await waitSaved(page);
    await page.keyboard.press("Control+z");
    await expect.poll(async () => (await layerIds(page)).includes(id), `undo removes the ${c.archetype}`).toBe(false);
    expect(await layerIds(page)).toEqual(before);
    await page.keyboard.press("Control+Shift+z");
    await expect.poll(async () => (await layerIds(page)).includes(id), `redo restores the ${c.archetype}`).toBe(true);
  }
});

test("Phase 25: Shift draws a square and Alt draws from the centre", async ({ page }) => {
  await ready(page);
  const g = await frameGeom(page);
  const sx = (x: number) => g.left + x * g.zoom;
  const sy = (y: number) => g.top + y * g.zoom;

  let before = await layerIds(page);
  await drawWith(page, "r", { x: sx(300), y: sy(300) }, { x: sx(420), y: sy(340) }, ["Shift"]);
  let info = await layerInfo(page, await created(page, before));
  near(info.width, 120);
  near(info.height, 120);
  near(info.x, 300);

  before = await layerIds(page);
  await drawWith(page, "o", { x: sx(700), y: sy(400) }, { x: sx(760), y: sy(430) }, ["Alt"]);
  info = await layerInfo(page, await created(page, before));
  near(info.width, 120);
  near(info.height, 60);
  near(info.x, 640); // the press is the centre
  near(info.y, 370);

  before = await layerIds(page);
  await drawWith(page, "o", { x: sx(900), y: sy(500) }, { x: sx(950), y: sy(520) }, ["Shift", "Alt"]);
  info = await layerInfo(page, await created(page, before));
  near(info.width, 100);
  near(info.height, 100);
  near(info.x, 850);
  near(info.y, 450);
});

test("Phase 25: a click places the tool's default size at the press", async ({ page }) => {
  await ready(page);
  const g = await frameGeom(page);
  const before = await layerIds(page);
  await page.mouse.move(g.left + 200 * g.zoom, g.top + 200 * g.zoom);
  await page.keyboard.press("r");
  await page.mouse.click(g.left + 200 * g.zoom, g.top + 200 * g.zoom);
  const info = await layerInfo(page, await created(page, before));
  near(info.width, 160);
  near(info.height, 120);
  near(info.x, 200);
  near(info.y, 200);
});

test("Phase 25: line and arrow draw segments, rotated about their centre; Shift snaps to 45 degrees", async ({ page }) => {
  await ready(page);
  const g = await frameGeom(page);
  const sx = (x: number) => g.left + x * g.zoom;
  const sy = (y: number) => g.top + y * g.zoom;

  let before = await layerIds(page);
  await drawWith(page, "l", { x: sx(200), y: sy(600) }, { x: sx(500), y: sy(600) });
  let info = await layerInfo(page, await created(page, before));
  expect(info.archetype).toBe("line");
  near(info.attrWidth, 300);
  expect(info.transform, "a horizontal line isn't rotated").not.toContain("rotate");

  before = await layerIds(page);
  await drawWith(page, "Shift+l", { x: sx(200), y: sy(700) }, { x: sx(300), y: sy(790) }, ["Shift"]);
  const id = await created(page, before);
  info = await layerInfo(page, id);
  expect(info.archetype).toBe("arrow");
  expect(info.transform, "Shift snaps 42 degrees to 45").toContain("rotate(45deg)");
  expect(info.parentId).toBe(g.rootId);
});

test("Phase 25: over bare canvas only the Frame tool does anything, and it makes a top-level frame", async ({ page }) => {
  await ready(page);
  const stage = await page.locator(CANVAS).boundingBox();
  const frames = () => page.locator(".canvas-frame").count();
  const before = await frames();
  const frameBox = (await page.locator(".canvas-frame").first().boundingBox())!;
  // a point right of the frame, clear of the chrome (the Layers panel narrows the stage, so the room is on the right)
  const blank = { x: frameBox.x + frameBox.width + 8, y: stage!.y + stage!.height / 2 };
  expect(blank.x + 32).toBeLessThan(stage!.x + stage!.width - 4);

  await drawWith(page, "r", blank, { x: blank.x + 24, y: blank.y + 24 });
  expect(await frames(), "a rectangle can't be drawn on bare canvas").toBe(before);

  await drawWith(page, "f", blank, { x: blank.x + 30, y: blank.y + 30 });
  await expect(page.locator(".canvas-frame")).toHaveCount(before + 1);
  await expect(page.locator(CANVAS)).toHaveAttribute("data-tool", "select");
});

test("Phase 25: drawing inside a nested frame parents the layer to it", async ({ page }) => {
  await ready(page);
  const g = await frameGeom(page);
  const sx = (x: number) => g.left + x * g.zoom;
  const sy = (y: number) => g.top + y * g.zoom;

  let before = await layerIds(page);
  await drawWith(page, "f", { x: sx(100), y: sy(500) }, { x: sx(500), y: sy(800) });
  const nested = await created(page, before);
  expect((await layerInfo(page, nested)).parentId).toBe(g.rootId);

  before = await layerIds(page);
  await drawWith(page, "r", { x: sx(150), y: sy(550) }, { x: sx(250), y: sy(620) });
  const inner = await created(page, before);
  const info = await layerInfo(page, inner);
  expect(info.parentId, "the rectangle went into the nested frame, not the page").toBe(nested);
  near(info.x, 150);
  near(info.y, 550);
  near(info.width, 100);
});
