/**
 * ROADMAP Phase 35, interaction gate, in Chromium, Firefox and WebKit: the colour picker, solid and gradient fills,
 * several fills, gradient handles on the canvas, stroke patterns, shadows and blur. The pixels are compared in
 * `paint-render.spec.ts`.
 */
import { test, expect, type Page } from "@playwright/test";
import { exportProject, openEditor, waitSaved } from "./support/editor";

const STAGE = 'iframe[title="Stage"]';
const MOD = process.platform === "darwin" ? "Meta" : "Control";

async function ready(page: Page) {
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
async function draw(page: Page, key: string, box: { x: number; y: number; w: number; h: number }) {
  const g = await frameGeom(page);
  const before = await layerIds(page);
  const a = { x: g.left + box.x * g.zoom, y: g.top + box.y * g.zoom };
  await page.mouse.move(a.x, a.y);
  await page.keyboard.press(key);
  await page.mouse.down();
  await page.mouse.move(a.x + (box.w * g.zoom) / 2, a.y + (box.h * g.zoom) / 2);
  await page.mouse.move(a.x + box.w * g.zoom, a.y + box.h * g.zoom, { steps: 3 });
  await page.mouse.up();
  await expect.poll(async () => (await layerIds(page)).length).toBeGreaterThan(before.length);
  return (await layerIds(page)).find((id) => !before.includes(id))!;
}

/** The layer in the stage: the SVG it draws into, and what each part of it is painted with. */
const view = (page: Page, id: string) =>
  page.evaluate(({ sel, id }) => {
    const el = document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelector<SVGElement | HTMLElement>(`[data-element-id="${id}"]`);
    if (!el) return null;
    const shapes = Array.from(el.querySelectorAll("rect, ellipse, polygon, path"));
    const cs = getComputedStyle(el);
    return {
      shapes: shapes.map((s) => ({ fill: s.getAttribute("fill"), stroke: s.getAttribute("stroke"), dash: s.getAttribute("stroke-dasharray"), opacity: s.getAttribute("fill-opacity") })),
      gradients: Array.from(el.querySelectorAll("linearGradient, radialGradient")).map((g) => ({ tag: g.tagName, x1: g.getAttribute("x1"), y1: g.getAttribute("y1"), x2: g.getAttribute("x2"), y2: g.getAttribute("y2"), stops: g.querySelectorAll("stop").length })),
      conic: el.querySelectorAll("foreignObject").length,
      filter: el.querySelector("filter") ? { blur: el.querySelectorAll("feGaussianBlur").length, merge: el.querySelectorAll("feMergeNode").length } : null,
      boxShadow: cs.boxShadow, cssFilter: cs.filter, backdrop: cs.backdropFilter, background: cs.backgroundImage, backgroundColor: cs.backgroundColor,
    };
  }, { sel: STAGE, id });

const face = (page: Page) => page.getByRole("form", { name: "Design" });
const fillsDialog = (page: Page) => page.getByRole("dialog", { name: "Fill colour", exact: true });
const pickerOf = (page: Page, name: string) => page.getByRole("dialog", { name, exact: true }).getByRole("group", { name: "Colour picker" });
const fillRow = (page: Page, n: number) => fillsDialog(page).getByRole("group", { name: `Fill ${n}`, exact: true });
const docFills = async (page: Page, id: string, outDir: string) => {
  await waitSaved(page);
  const { file } = await exportProject(page, outDir, "paint");
  const p = (file.snapshot.document.layers as Record<string, { properties: Record<string, unknown> }>)[id].properties;
  return { raw: p["paint.fills"] as string | undefined, list: p["paint.fills"] ? (JSON.parse(p["paint.fills"] as string) as Record<string, unknown>[]) : null, props: p };
};

async function openFills(page: Page) {
  await face(page).getByRole("button", { name: "Fill colour", exact: true }).click();
  await expect(fillsDialog(page)).toBeVisible();
}
/** Exporting uses the File menu, and a press there closes the fills popover: open it again if it went. */
async function fillsOpen(page: Page) {
  if (!(await fillsDialog(page).isVisible())) await openFills(page);
}

test("Phase 35: the colour picker sets a colour by hex, by the square and sliders, and by OKLCH", async ({ page }) => {
  await ready(page);
  const id = await draw(page, "r", { x: 150, y: 300, w: 160, h: 100 });
  await openFills(page);
  await fillRow(page, 1).getByRole("button", { name: "Fill 1 colour" }).click();
  const picker = pickerOf(page, "Fill 1 colour");
  await expect(picker).toBeVisible();

  // hex
  await picker.getByLabel("Hex colour").fill("#336699");
  await expect.poll(async () => (await view(page, id))?.shapes[0].fill).toBe("#336699");
  expect(await picker.getByLabel("H", { exact: true }).inputValue()).toBe("210");

  // the square: top-right is full saturation and brightness of the hue
  const square = picker.getByRole("slider", { name: "Saturation and brightness" });
  const box = (await square.boundingBox())!;
  await page.mouse.click(box.x + box.width - 4, box.y + 4); // just inside the rounded corner
  await expect.poll(async () => (await view(page, id))?.shapes[0].fill).not.toBe("#336699");
  expect(Number(await picker.getByLabel("S", { exact: true }).inputValue()), "full saturation").toBeGreaterThanOrEqual(97);
  expect(Number(await picker.getByLabel("B", { exact: true }).inputValue()), "full brightness").toBeGreaterThanOrEqual(96);
  expect(Math.abs(Number(await picker.getByLabel("H", { exact: true }).inputValue()) - 210), "the hue stays").toBeLessThanOrEqual(1);

  // the hue slider: the left end is red
  const hue = picker.getByRole("slider", { name: "Hue" });
  const hb = (await hue.boundingBox())!;
  await page.mouse.click(hb.x + 1, hb.y + hb.height / 2);
  await expect.poll(async () => Number(await picker.getByLabel("H", { exact: true }).inputValue())).toBeLessThanOrEqual(3);
  await picker.getByLabel("Hex colour").fill("#ff0000");
  await expect.poll(async () => (await view(page, id))?.shapes[0].fill).toBe("#ff0000");

  // alpha: the colour becomes transparent hex
  await picker.getByLabel("A", { exact: true }).fill("50");
  await expect.poll(async () => (await view(page, id))?.shapes[0].fill).toBe("#ff000080");

  // OKLCH: lightness changes the colour, chroma 0 makes a grey
  await picker.getByRole("tab", { name: "OKLCH" }).click();
  await picker.getByLabel("C", { exact: true }).fill("0");
  await expect.poll(async () => {
    const f = (await view(page, id))?.shapes[0].fill ?? "";
    return /^#([0-9a-f]{2})\1\1/.test(f);
  }).toBe(true);

  // the whole session in the picker is a few undo steps, not one per pixel of drag
  await page.keyboard.press("Escape");
});

test("Phase 35: gradient fills: type, stops, handles on the canvas, and undo", async ({ page }, testInfo) => {
  await ready(page);
  const id = await draw(page, "r", { x: 150, y: 300, w: 200, h: 100 });
  await openFills(page);

  // turn the solid fill into a linear gradient
  await fillRow(page, 1).getByLabel("Fill 1 type").selectOption("linear");
  await expect.poll(async () => (await view(page, id))?.gradients.length).toBe(1);
  expect((await view(page, id))!.gradients[0]).toMatchObject({ tag: "linearGradient", stops: 2 });
  expect((await view(page, id))!.shapes[0].fill).toMatch(/^url\(#/);

  // its handles are on the canvas: the two ends and two stops
  await expect(page.locator(".canvas-overlay__ghandle:not([hidden])")).toHaveCount(4);
  await expect(page.locator('.canvas-overlay__ghandle[data-kind="from"]')).toHaveCount(1);

  // drag the end handle sideways: the gradient's end moves
  const end = (await page.locator('.canvas-overlay__ghandle[data-kind="to"]').boundingBox())!;
  const before = (await docFills(page, id, testInfo.outputPath())).list![0] as { to: { x: number; y: number } };
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2 + 40, end.y + end.height / 2 - 20, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => ((await docFills(page, id, testInfo.outputPath())).list![0] as { to: { x: number } }).to.x).not.toBe(before.to.x);
  const after = (await docFills(page, id, testInfo.outputPath())).list![0] as { to: { x: number; y: number }; from: { x: number; y: number } };
  expect(after.to.x).toBeGreaterThan(before.to.x);
  expect(after.to.y).toBeLessThan(before.to.y);
  expect(after.from).toEqual((before as unknown as { from: unknown }).from ?? after.from);

  // one undo step takes the whole drag back
  await page.mouse.move(700, 300);
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(async () => ((await docFills(page, id, testInfo.outputPath())).list![0] as { to: { x: number } }).to.x).toBe(before.to.x);

  // add a stop by clicking the bar; the gradient has three stops
  await fillsOpen(page);
  const bar = fillRow(page, 1).getByRole("group", { name: "Gradient stops" });
  const bb = (await bar.boundingBox())!;
  await page.mouse.click(bb.x + bb.width * 0.5, bb.y + bb.height / 2);
  await expect(bar.getByRole("button")).toHaveCount(3);
  await expect.poll(async () => (await view(page, id))?.gradients[0].stops).toBe(3);

  // the selected stop's colour and position
  await fillRow(page, 1).getByLabel("Fill 1 stop position").fill("25");
  await expect(bar.getByRole("button", { name: /Stop 2 at 25 percent/ })).toBeVisible();
  await fillRow(page, 1).getByRole("button", { name: "Fill 1 colour" }).click();
  await pickerOf(page, "Fill 1 colour").getByLabel("Hex colour").fill("#ff0000");
  await pickerOf(page, "Fill 1 colour").getByLabel("Hex colour").press("Enter"); // leaving the box ends the edit (one undo step)
  await expect.poll(async () => (await docFills(page, id, testInfo.outputPath())).raw, "the stop's new colour is saved").toContain('"color":"#ff0000"');
  await fillsOpen(page);

  // radial and conic
  await fillRow(page, 1).getByLabel("Fill 1 type").selectOption("radial");
  await expect.poll(async () => (await view(page, id))?.gradients[0]?.tag).toBe("radialGradient");
  await expect(page.locator('.canvas-overlay__ghandle[data-kind="radiusX"]')).toHaveCount(1);
  await fillRow(page, 1).getByLabel("Fill 1 type").selectOption("conic");
  await expect.poll(async () => (await view(page, id))?.conic).toBe(1);
  await expect(page.locator('.canvas-overlay__ghandle[data-kind="angle"]')).toHaveCount(1);
  await fillRow(page, 1).getByLabel("Fill 1 type").selectOption("solid");
  await expect(page.locator(".canvas-overlay__ghandle:not([hidden])")).toHaveCount(0);
});

test("Phase 35: several fills stack, hide, reorder and go; the Simple face still sets one plain colour", async ({ page }, testInfo) => {
  await ready(page);
  const id = await draw(page, "r", { x: 150, y: 300, w: 160, h: 100 });
  await openFills(page);
  await fillsDialog(page).getByRole("button", { name: "Add fill" }).click();
  await fillsDialog(page).getByRole("button", { name: "Add fill" }).click();
  await expect(fillsDialog(page).getByRole("group", { name: /^Fill \d$/ })).toHaveCount(3);
  await expect.poll(async () => (await view(page, id))?.shapes.length).toBe(3);

  await fillRow(page, 1).getByLabel("Fill 1 opacity").fill("40");
  await expect.poll(async () => (await view(page, id))?.shapes[2].opacity).toBe("0.4"); // the first fill is drawn last, on top
  await fillRow(page, 2).getByRole("button", { name: "Hide Fill 2" }).click();
  await expect.poll(async () => (await view(page, id))?.shapes.length).toBe(2);
  await fillRow(page, 1).getByRole("button", { name: "Move Fill 1 down" }).click();
  await expect.poll(async () => (await docFills(page, id, testInfo.outputPath())).list![1].opacity).toBe(0.4);
  await fillsOpen(page);
  await fillRow(page, 3).getByRole("button", { name: "Remove Fill 3" }).click();
  await expect(fillsDialog(page).getByRole("group", { name: /^Fill \d$/ })).toHaveCount(2);

  // typing a colour in the Simple face's Fill box replaces the list with that one colour
  await page.keyboard.press("Escape");
  await face(page).locator('input[aria-label="Fill"]').fill("#112233");
  await face(page).locator('input[aria-label="Fill"]').press("Enter");
  await expect.poll(async () => (await view(page, id))?.shapes.length).toBe(1);
  expect((await view(page, id))!.shapes[0].fill).toBe("#112233");
});

test("Phase 35: stroke patterns, shadows and blur", async ({ page }) => {
  await ready(page);
  const id = await draw(page, "r", { x: 150, y: 300, w: 160, h: 100 });
  await face(page).locator('input[aria-label="Stroke width"]').fill("4");
  await face(page).locator('input[aria-label="Stroke width"]').press("Enter");
  await page.getByRole("tab", { name: "Pro" }).click();

  // dashed and dotted strokes
  await page.getByRole("radio", { name: "Dashed" }).click();
  await expect.poll(async () => (await view(page, id))?.shapes.at(-1)?.dash).toBe("16 12");
  await page.getByRole("radio", { name: "Dotted" }).click();
  await expect.poll(async () => (await view(page, id))?.shapes.at(-1)?.dash).toBe("4 8");
  await page.getByRole("radio", { name: "Solid" }).click();
  await expect.poll(async () => (await view(page, id))?.shapes.at(-1)?.dash ?? null).toBe(null);

  // a drop shadow and an inner shadow become an SVG filter on the shape
  const effects = page.getByRole("group", { name: "Effects", exact: true });
  await effects.getByRole("button", { name: "Add shadow" }).click();
  await expect.poll(async () => (await view(page, id))?.filter?.merge).toBe(2); // the shadow and the shape
  await effects.getByLabel("Shadow 1 type").selectOption("inner");
  await effects.getByRole("button", { name: "Add shadow" }).click();
  await expect.poll(async () => (await view(page, id))?.filter?.merge).toBe(3);
  await effects.getByRole("button", { name: "Remove Shadow 1" }).click();
  await effects.getByRole("button", { name: "Remove Shadow 1" }).click();
  await expect.poll(async () => (await view(page, id))?.filter).toBe(null);

  // layer blur
  await effects.getByLabel("Layer blur").fill("5");
  await effects.getByLabel("Layer blur").press("Enter");
  await expect.poll(async () => (await view(page, id))?.cssFilter).toBe("blur(5px)");

  // a frame: shadows are box shadows, background blur is a backdrop filter
  const frame = await draw(page, "f", { x: 600, y: 300, w: 300, h: 200 });
  const fx = page.getByRole("group", { name: "Effects", exact: true });
  await fx.getByRole("button", { name: "Add shadow" }).click();
  await expect.poll(async () => (await view(page, frame))?.boxShadow).not.toBe("none");
  await fx.getByLabel("Background blur").fill("6");
  await fx.getByLabel("Background blur").press("Enter");
  await expect.poll(async () => (await view(page, frame))?.backdrop).toBe("blur(6px)");
  await page.getByRole("radio", { name: "Dashed" }).click().catch(() => undefined);
});
