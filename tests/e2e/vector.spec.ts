/**
 * ROADMAP Phase 40 gate, in Chromium, Firefox and WebKit: a path can be reshaped point by point (move a node, pull a
 * handle, add a node, delete one, close the path), each change one undo step; boolean union, subtract, intersect and
 * exclude of shapes make one path layer and undo restores the shapes (the exact areas are the golden unit tests in
 * `src/core/paths/__tests__/booleans.test.ts`); and an imported SVG becomes editable vector layers: a 500-node one
 * stays editable while a node is dragged.
 */
import { test, expect, type Page } from "@playwright/test";
import { openEditor, waitSaved } from "./support/editor";

const STAGE = 'iframe[title="Stage"]';
const MOD = process.platform === "darwin" ? "Meta" : "Control";

async function ready(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __LL_TEST__: boolean }).__LL_TEST__ = true;
  });
  await openEditor(page);
  await page.getByRole("button", { name: "Mount Showcase Demo" }).click();
  await page.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelector("[data-element-id]"), STAGE);
  await waitSaved(page);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForTimeout(400);
}
const frameGeom = (page: Page) =>
  page.evaluate((sel) => {
    const iframe = document.querySelector<HTMLIFrameElement>(sel)!;
    const r = iframe.getBoundingClientRect();
    return { left: r.left, top: r.top, zoom: r.width / iframe.clientWidth };
  }, STAGE);
const layerIds = (page: Page) =>
  page.evaluate((sel) => Array.from(document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelectorAll("[data-element-id]")).map((e) => (e as HTMLElement).dataset.elementId!), STAGE);
const pathD = (page: Page, id: string) =>
  page.evaluate(({ sel, id }) => document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelector(`[data-element-id="${id}"] path`)?.getAttribute("d") ?? "", { sel: STAGE, id });
async function newLayer(page: Page, before: string[]) {
  await expect.poll(async () => (await layerIds(page)).length).toBeGreaterThan(before.length);
  return (await layerIds(page)).find((id) => !before.includes(id))!;
}
const run = (page: Page, id: string, args?: unknown) =>
  page.evaluate(({ id, args }) => {
    const reg = (window as unknown as { __LL_COMMANDS__: { all: () => { id: string; run: (a?: unknown) => unknown }[] } }).__LL_COMMANDS__;
    return reg.all().find((c) => c.id === id)!.run(args);
  }, { id, args });

/** A path made with the pen: a corner, a second corner, and a third; finished with Enter. Returns its id (selected). */
async function drawTriangle(page: Page) {
  const g = await frameGeom(page);
  const before = await layerIds(page);
  const at = (x: number, y: number) => ({ x: g.left + x * g.zoom, y: g.top + y * g.zoom });
  await page.mouse.move(at(40, 60).x, at(40, 60).y);
  await page.keyboard.press("p");
  for (const [x, y] of [[40, 60], [160, 60], [100, 170]]) await page.mouse.click(at(x, y).x, at(x, y).y);
  await page.keyboard.press("Enter");
  const id = await newLayer(page, before);
  await expect.poll(() => pathD(page, id)).not.toBe("");
  return { id, g, at };
}
const centreOf = async (page: Page, testId: string) => {
  const b = (await page.getByTestId(testId).boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const nodeCount = (page: Page) => page.locator('[data-testid^="node-"]').count();

test.describe("Phase 40: vector editing", () => {
  test("Enter edits a path: move a node, add one, delete one, one undo step each", async ({ page }) => {
    await ready(page);
    const { id } = await drawTriangle(page);
    const original = await pathD(page, id);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("vector-edit")).toBeVisible();
    expect(await nodeCount(page)).toBe(3);

    // move node 1
    const n1 = await centreOf(page, "node-1");
    await page.mouse.move(n1.x, n1.y);
    await page.mouse.down();
    await page.mouse.move(n1.x + 40, n1.y + 30, { steps: 5 });
    await page.mouse.up();
    await expect.poll(() => pathD(page, id)).not.toBe(original);
    const moved = await pathD(page, id);

    // add a node by pressing on a segment: between node 0 and node 1, at the middle
    const a = await centreOf(page, "node-0");
    const b = await centreOf(page, "node-1");
    await page.mouse.click((a.x + b.x) / 2, (a.y + b.y) / 2);
    await expect.poll(() => nodeCount(page)).toBe(4);

    // delete the selected (new) node
    await page.keyboard.press("Delete");
    await expect.poll(() => nodeCount(page)).toBe(3);

    // leave; the layer holds the moved shape; undo steps back through the edits
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("vector-edit")).toHaveCount(0);
    await expect.poll(() => pathD(page, id)).toBe(moved);
    await page.keyboard.press(`${MOD}+z`); // delete
    await page.keyboard.press(`${MOD}+z`); // add
    await page.keyboard.press(`${MOD}+z`); // move
    await expect.poll(() => pathD(page, id)).toBe(original);
  });

  test("a handle pulled from a smooth node, and a corner made smooth by a double click", async ({ page }) => {
    await ready(page);
    const { id } = await drawTriangle(page);
    const original = await pathD(page, id);
    await page.keyboard.press("Enter");
    const n1 = await centreOf(page, "node-1");
    await page.mouse.dblclick(n1.x, n1.y); // corner to smooth
    await expect(page.getByTestId("handle-1-out")).toBeVisible();
    await expect.poll(() => pathD(page, id)).toMatch(/C/);
    const h = await centreOf(page, "handle-1-out");
    await page.mouse.move(h.x, h.y);
    await page.mouse.down();
    await page.mouse.move(h.x + 10, h.y + 40, { steps: 4 });
    await page.mouse.up();
    // the opposite handle turned with it
    const hin = await centreOf(page, "handle-1-in");
    const node = await centreOf(page, "node-1");
    const out = await centreOf(page, "handle-1-out");
    const cross = (out.x - node.x) * (hin.y - node.y) - (out.y - node.y) * (hin.x - node.x);
    expect(Math.abs(cross)).toBeLessThan(40);
    await page.keyboard.press("Escape");
    await page.keyboard.press(`${MOD}+z`);
    await page.keyboard.press(`${MOD}+z`);
    await expect.poll(() => pathD(page, id)).toBe(original);
  });

  test("clicking one end then the other closes an open path", async ({ page }) => {
    await ready(page);
    const { id } = await drawTriangle(page);
    await page.keyboard.press("Enter");
    const first = await centreOf(page, "node-0");
    const last = await centreOf(page, "node-2");
    await page.mouse.click(last.x, last.y);
    await page.mouse.click(first.x, first.y);
    await expect.poll(() => pathD(page, id)).toMatch(/Z\s*$/i);
  });
});

test.describe("Phase 40: boolean operations", () => {
  async function drawRect(page: Page, box: { x: number; y: number; w: number; h: number }) {
    const g = await frameGeom(page);
    const before = await layerIds(page);
    const a = { x: g.left + box.x * g.zoom, y: g.top + box.y * g.zoom };
    await page.mouse.move(a.x, a.y);
    await page.keyboard.press("r");
    await page.mouse.down();
    await page.mouse.move(a.x + (box.w * g.zoom) / 2, a.y + (box.h * g.zoom) / 2);
    await page.mouse.move(a.x + box.w * g.zoom, a.y + box.h * g.zoom, { steps: 3 });
    await page.mouse.up();
    return newLayer(page, before);
  }

  for (const op of ["union", "subtract", "intersect", "exclude"] as const) {
    test(`${op} of two overlapping rectangles is one path layer, and undo gives the rectangles back`, async ({ page }) => {
      await ready(page);
      const a = await drawRect(page, { x: 40, y: 60, w: 100, h: 80 });
      const b = await drawRect(page, { x: 90, y: 100, w: 100, h: 80 });
      await run(page, "selection.set", { ids: [a, b] });
      const before = await layerIds(page);
      await page.getByRole("button", { name: `${op[0].toUpperCase()}${op.slice(1)} selection` }).click();
      await expect.poll(async () => (await layerIds(page)).includes(a)).toBe(false);
      const made = (await layerIds(page)).find((i) => !before.includes(i))!;
      await expect.poll(() => pathD(page, made)).toMatch(/^M/);
      expect(await layerIds(page)).not.toContain(b);
      await page.keyboard.press(`${MOD}+z`);
      await expect.poll(async () => (await layerIds(page)).includes(a) && (await layerIds(page)).includes(b)).toBe(true);
      expect(await layerIds(page)).not.toContain(made);
    });
  }

  test("flatten turns a rectangle into a path that can be edited", async ({ page }) => {
    await ready(page);
    const a = await drawRect(page, { x: 60, y: 80, w: 100, h: 80 });
    await run(page, "selection.set", { ids: [a] });
    await page.getByRole("button", { name: "Flatten to path" }).click();
    await expect.poll(async () => (await layerIds(page)).includes(a)).toBe(false);
    await run(page, "path.edit"); // the focus is on the inspector's button: the command, not the key
    await expect(page.getByTestId("vector-edit")).toBeVisible();
    expect(await nodeCount(page)).toBe(4);
  });
});

test.describe("Phase 40: SVG import", () => {
  test("an imported 500-node SVG becomes editable vectors and stays editable at frame rate", async ({ page }) => {
    await ready(page);
    // one closed shape of 500 nodes on a circle, as a file dropped on the canvas and placed as vectors
    const pts = Array.from({ length: 500 }, (_, i) => {
      const a = (i / 500) * Math.PI * 2;
      return `${(100 + 80 * Math.cos(a) + 6 * Math.sin(a * 17)).toFixed(2)} ${(100 + 80 * Math.sin(a)).toFixed(2)}`;
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><path d="M${pts.join("L")}Z" fill="#336699"/><script>alert(1)</script></svg>`;
    await page.evaluate(async (svg) => {
      const dt = new DataTransfer();
      dt.items.add(new File([svg], "circle500.svg", { type: "image/svg+xml" }));
      const stage = document.querySelector(".whiteboard-stage")!;
      const r = stage.getBoundingClientRect();
      stage.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, clientX: r.left + 40, clientY: r.top + 40, bubbles: true, cancelable: true }));
    }, svg);
    type Assets = { list: () => Promise<{ id: string; name: string }[]>; placeAsVectors: (id: string) => Promise<string[]> };
    await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __LL_ASSETS__: Assets }).__LL_ASSETS__.list())).some((x) => x.name === "circle500.svg")).toBe(true);
    const assetId = (await page.evaluate(() => (window as unknown as { __LL_ASSETS__: Assets }).__LL_ASSETS__.list())).find((x) => x.name === "circle500.svg")!.id;
    const ids = await page.evaluate((id) => (window as unknown as { __LL_ASSETS__: Assets }).__LL_ASSETS__.placeAsVectors(id), assetId);
    expect(ids.length).toBe(1);
    await expect.poll(async () => (await layerIds(page)).includes(ids[0])).toBe(true);
    const d = await (async () => {
      await expect.poll(() => pathD(page, ids[0])).toMatch(/^M/);
      return pathD(page, ids[0]);
    })();
    expect(d).not.toMatch(/script/i);
    expect((d.match(/L/g) ?? []).length).toBeGreaterThanOrEqual(499);

    await run(page, "path.edit");
    await expect(page.getByTestId("vector-edit")).toBeVisible();
    expect(await nodeCount(page)).toBe(500);
    // drag a node for 40 moves while counting frames
    const n = await centreOf(page, "node-10");
    await page.evaluate(() => {
      const w = window as unknown as { __frames: number[] };
      w.__frames = [];
      let last = performance.now();
      const tick = (t: number) => {
        w.__frames.push(t - last);
        last = t;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.mouse.move(n.x, n.y);
    await page.mouse.down();
    for (let i = 1; i <= 40; i++) {
      await page.mouse.move(n.x + i * 2, n.y + i, { steps: 1 });
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
    const frames = await page.evaluate(() => (window as unknown as { __frames: number[] }).__frames.slice(1));
    const sorted = [...frames].sort((a, b) => a - b);
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    // 60 fps is 16.7 ms a frame; the gate allows a shared CI machine some slack
    expect(p90).toBeLessThan(process.env.CI ? 50 : 34);
    await page.keyboard.press("Escape");
  });
});
