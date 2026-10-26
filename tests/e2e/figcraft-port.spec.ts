/**
 * FigCraft port (DOCS/INITIAL/FIGCRAFT_PORT_PLAN.md), in Chromium, Firefox and WebKit: the new drawing reaches the
 * stage (corner smoothing, arcs, diamond gradients, aligned and several strokes, arrowheads, vector networks, boolean
 * groups in the render gallery), and the new tools work end to end with real pointer input: a live boolean group whose
 * operation can be changed and that flattens to a path; the Shape Builder merging the overlap of two rectangles; the
 * paint bucket unfilling and refilling a closed path. Each change is one undo step.
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
/** The layers drawn on the stage, each once (a path layer's id is on its <svg> and on the shape inside). */
const layerIds = (page: Page) =>
  page.evaluate((sel) => [...new Set(Array.from(document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelectorAll("[data-element-id]")).map((e) => (e as HTMLElement).dataset.elementId!))], STAGE);
const run = (page: Page, id: string, args?: unknown) =>
  page.evaluate(({ id, args }) => {
    const reg = (window as unknown as { __LL_COMMANDS__: { all: () => { id: string; run: (a?: unknown) => unknown }[] } }).__LL_COMMANDS__;
    return reg.all().find((c) => c.id === id)!.run(args);
  }, { id, args });
/** A layer that wasn't on the stage before (a flatten replaces one, so the count alone doesn't say). */
async function newLayer(page: Page, before: string[]) {
  await expect.poll(async () => (await layerIds(page)).some((id) => !before.includes(id))).toBe(true);
  return (await layerIds(page)).find((id) => !before.includes(id))!;
}
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
const inStage = <T,>(page: Page, fn: (doc: Document, arg: string) => T, arg: string) =>
  page.evaluate(({ sel, src, arg }) => new Function("doc", "arg", `return (${src})(doc, arg)`)(document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!, arg), { sel: STAGE, src: fn.toString(), arg });

test("FigCraft port: the render gallery draws the new shapes, paints, strokes, networks and boolean groups", async ({ page }) => {
  await page.goto("/editor/render-gallery", { waitUntil: "domcontentloaded" });
  await page.getByRole("main", { name: "Render gallery" }).waitFor();
  await page.waitForFunction(() => !!document.querySelector<HTMLIFrameElement>('iframe[title="Render gallery frame"]')?.contentDocument?.querySelector('[data-gallery-case="boolean-subtract"]'));
  const report = await page.evaluate(() => {
    const doc = document.querySelector<HTMLIFrameElement>('iframe[title="Render gallery frame"]')!.contentDocument!;
    const cell = (id: string) => doc.querySelector(`[data-gallery-case="${id}"]`)!;
    return {
      smooth: !!cell("rectangle-smooth").querySelector("path"),
      ring: cell("ellipse-ring").querySelector("path")?.getAttribute("fill-rule"),
      diamondLayers: (getComputedStyle(cell("container-diamond").querySelector("[data-element-id]")!).backgroundImage.match(/linear-gradient/g) ?? []).length,
      strokeMask: !!cell("rectangle-stroke-inside").querySelector("mask"),
      arrowMask: !!cell("line-arrow").querySelector("mask path"),
      outline: getComputedStyle(cell("container-stroke-outside").querySelector("[data-element-id]")!).outlineStyle,
      network: !!cell("svg-network").querySelector("[data-network]"),
      boolean: cell("boolean-subtract").querySelector("[data-boolean]")?.getAttribute("data-boolean"),
      booleanPath: !!cell("boolean-subtract").querySelector("[data-boolean] > svg path"),
    };
  });
  expect(report).toEqual({ smooth: true, ring: "evenodd", diamondLayers: 4, strokeMask: true, arrowMask: true, outline: "solid", network: true, boolean: "subtract", booleanPath: true });
});

test("FigCraft port: a live boolean group keeps its operands, changes operation and flattens, one undo step each", async ({ page }) => {
  await ready(page);
  const a = await drawRect(page, { x: 40, y: 60, w: 100, h: 80 });
  const b = await drawRect(page, { x: 90, y: 100, w: 100, h: 80 });
  await run(page, "selection.set", { ids: [a, b] });
  await page.getByRole("button", { name: "Live boolean group (union)" }).click();
  await expect.poll(() => inStage(page, (doc) => doc.querySelector("[data-boolean]")?.getAttribute("data-boolean") ?? "", "")).toBe("union");
  // the operands are still layers, inside the group
  expect(await layerIds(page)).toEqual(expect.arrayContaining([a, b]));
  const union = await inStage(page, (doc) => doc.querySelector("[data-boolean] > svg path")?.getAttribute("d") ?? "", "");
  expect(union).toMatch(/^M/);
  await page.getByRole("combobox", { name: "Boolean operation" }).selectOption("subtract");
  await expect.poll(() => inStage(page, (doc) => doc.querySelector("[data-boolean]")?.getAttribute("data-boolean") ?? "", "")).toBe("subtract");
  expect(await inStage(page, (doc) => doc.querySelector("[data-boolean] > svg path")?.getAttribute("d") ?? "", "")).not.toBe(union);
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(() => inStage(page, (doc) => doc.querySelector("[data-boolean]")?.getAttribute("data-boolean") ?? "", "")).toBe("union");
  // flatten: one path layer, the operands gone
  await page.getByRole("button", { name: "Flatten boolean group" }).click();
  await expect.poll(async () => (await layerIds(page)).includes(a)).toBe(false);
  expect(await inStage(page, (doc) => doc.querySelectorAll("[data-boolean]").length, "")).toBe(0);
});

test("FigCraft port: the Shape Builder merges the overlap of two rectangles into a new shape", async ({ page }) => {
  await ready(page);
  const a = await drawRect(page, { x: 40, y: 60, w: 100, h: 80 });
  const b = await drawRect(page, { x: 90, y: 100, w: 100, h: 80 });
  await run(page, "selection.set", { ids: [a, b] });
  const g = await frameGeom(page);
  const before = await layerIds(page);
  await page.mouse.move(g.left + 115 * g.zoom, g.top + 120 * g.zoom);
  await page.keyboard.press("Shift+M");
  await page.mouse.click(g.left + 115 * g.zoom, g.top + 120 * g.zoom);
  // the rectangles became path layers holding what is left, and the overlap is a new one: three paths
  await expect.poll(async () => (await layerIds(page)).filter((i) => !before.includes(i)).length).toBe(3);
  expect(await layerIds(page)).not.toContain(a);
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(async () => (await layerIds(page)).includes(a) && (await layerIds(page)).includes(b)).toBe(true);
});

test("FigCraft port: the paint bucket unfills and refills a closed path", async ({ page }) => {
  await ready(page);
  const r = await drawRect(page, { x: 60, y: 80, w: 100, h: 80 });
  await run(page, "selection.set", { ids: [r] });
  const before = await layerIds(page);
  await page.getByRole("button", { name: "Flatten to path" }).click();
  const path = await newLayer(page, before);
  const g = await frameGeom(page);
  const inside = { x: g.left + 110 * g.zoom, y: g.top + 120 * g.zoom };
  await page.mouse.move(inside.x, inside.y);
  await page.keyboard.press("b");
  await page.mouse.click(inside.x, inside.y);
  const fillD = (id: string) => inStage(page, (doc, id) => doc.querySelector(`[data-element-id="${id}"] [data-network] path, [data-element-id="${id}"][data-network] path`)?.getAttribute("d") ?? "missing", id);
  await expect.poll(() => fillD(path)).toBe("");
  await page.mouse.click(inside.x, inside.y);
  await expect.poll(() => fillD(path)).toMatch(/^M/);
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(() => fillD(path)).toBe("");
});

test("FigCraft port: a frame's layout grid draws on the canvas overlay", async ({ page }) => {
  await ready(page);
  const id = await page.evaluate(() => {
    const doc = (window as unknown as { __LL_DOC__: { get: () => { layers: Record<string, { parentId: string | null; archetype: string }> } } }).__LL_DOC__;
    return Object.entries(doc.get().layers).find(([, l]) => l.parentId === null && l.archetype === "container")![0];
  });
  await run(page, "layout.setLayoutGrids", { ids: [id], grids: [{ kind: "columns", size: 0, count: 12, gutter: 20, offset: 0, align: "stretch", color: "rgba(255, 0, 0, 0.1)", visible: true }] });
  await expect.poll(() => page.locator(`[data-layout-grids="${id}"] rect`).count()).toBe(12);
  await run(page, "layout.setLayoutGrids", { ids: [id], grids: [] });
  await expect(page.getByTestId("layout-grids-overlay")).toHaveCount(0);
});
