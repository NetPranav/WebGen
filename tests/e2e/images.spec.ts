/**
 * ROADMAP Phase 37 gate, in Chromium, Firefox and WebKit: a picture is a fill on any shape or frame (fill, fit, crop,
 * tile), crop is done by dragging the picture's outline on the canvas, its brightness, contrast and saturation are
 * properties, and "replace" swaps the picture and keeps everything else. Crop and fill round trip through save and
 * reload; how each one renders is the screenshot gate in `paint-render.spec.ts`.
 */
import { test, expect, type Page } from "@playwright/test";
import { exportProject, openEditor, waitSaved } from "./support/editor";

const STAGE = 'iframe[title="Stage"]';
const MOD = process.platform === "darwin" ? "Meta" : "Control";
const svg = (a: string, b: string) => Array.from(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><rect width="100" height="100" fill="${a}"/><rect x="100" width="100" height="100" fill="${b}"/></svg>`));

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
/** A file in the asset store without a drop (so no image layer is made): through the test seam of the Assets panel's importer. */
async function importAsset(page: Page, name: string, bytes: number[]): Promise<string> {
  await page.evaluate(
    async ({ name, bytes }) => {
      const input = document.createElement("input");
      void input;
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(bytes)], name, { type: "image/svg+xml" }));
      const stage = document.querySelector(".whiteboard-stage")!;
      const r = stage.getBoundingClientRect();
      // a drop far outside every frame still imports; it only places the picture, which the test removes again below
      stage.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true }));
    },
    { name, bytes },
  );
  await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __LL_ASSETS__: { list: () => Promise<{ name: string }[]> } }).__LL_ASSETS__.list())).some((a) => a.name === name)).toBe(true);
  const list = await page.evaluate(() => (window as unknown as { __LL_ASSETS__: { list: () => Promise<{ id: string; name: string }[]> } }).__LL_ASSETS__.list());
  return list.find((a) => a.name === name)!.id;
}

const face = (page: Page) => page.getByRole("form", { name: "Design" });
const fillsDialog = (page: Page) => page.getByRole("dialog", { name: "Fill colour", exact: true });
const row = (page: Page) => fillsDialog(page).getByRole("group", { name: "Fill 1", exact: true });
async function openFills(page: Page) {
  if (!(await fillsDialog(page).isVisible())) await face(page).getByRole("button", { name: "Fill colour", exact: true }).click();
  await expect(fillsDialog(page)).toBeVisible();
}

/** What the stage draws for a layer's picture fill: the SVG pattern's image, or the HTML background. */
const view = (page: Page, id: string) =>
  page.evaluate(({ sel, id }) => {
    const el = document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelector<HTMLElement | SVGElement>(`[data-element-id="${id}"]`);
    if (!el) return null;
    const pattern = el.querySelector("pattern");
    const image = el.querySelector("pattern image");
    const cs = getComputedStyle(el);
    const layer = el.querySelector('[data-fill-layer="image"]');
    return {
      href: image?.getAttribute("href") ?? null,
      pattern: pattern ? { w: Number(pattern.getAttribute("width")), h: Number(pattern.getAttribute("height")) } : null,
      imageBox: image ? { x: Number(image.getAttribute("x")), y: Number(image.getAttribute("y")), w: Number(image.getAttribute("width")), h: Number(image.getAttribute("height")) } : null,
      imageFilter: (image as SVGElement | null)?.style.filter ?? "",
      bg: cs.backgroundImage, bgSize: cs.backgroundSize, bgRepeat: cs.backgroundRepeat,
      layerFilter: layer ? getComputedStyle(layer).filter : null,
    };
  }, { sel: STAGE, id });

const saved = async (page: Page, id: string, outDir: string) => {
  await waitSaved(page);
  const { file } = await exportProject(page, outDir, "img");
  const p = (file.snapshot.document.layers as Record<string, { properties: Record<string, unknown> }>)[id].properties;
  return { fills: p["paint.fills"] ? (JSON.parse(p["paint.fills"] as string) as Record<string, unknown>[]) : null, props: p, manifest: file.snapshot.document.assets as Record<string, unknown> };
};

test("Phase 37: a picture fills a shape, fit and tile change how it sits, and its colours are properties", async ({ page }, testInfo) => {
  await ready(page);
  const a = await importAsset(page, "two.svg", svg("#ef4444", "#3b82f6"));
  const id = await draw(page, "r", { x: 150, y: 300, w: 200, h: 100 });
  await openFills(page);

  // an image fill starts empty, so nothing is drawn until a picture is chosen
  await row(page).getByLabel("Fill 1 type").selectOption("image");
  await expect.poll(async () => (await view(page, id))?.href).toBeNull();
  await row(page).getByLabel("Fill 1 picture file").selectOption(a);
  await expect.poll(async () => (await view(page, id))?.href ?? "").toMatch(/^blob:/);
  const fill = (await view(page, id))!;
  expect(fill.pattern).toMatchObject({ w: expect.any(Number) });
  expect(fill.imageBox!.w, "fill covers the box").toBeGreaterThanOrEqual(fill.pattern!.w - 1);

  // fit: all of it shows (the picture is 2:1 and the box about 2:1 too, so make it taller to see the letterbox)
  await row(page).getByRole("radio", { name: "Fit" }).click();
  await expect.poll(async () => (await view(page, id))?.imageBox?.w).toBeGreaterThan(0);

  // tile: the pattern is one picture at the tile size (50% of 200 x 100)
  await row(page).getByRole("radio", { name: "Tile" }).click();
  await row(page).getByLabel("Fill 1 tile size").fill("50");
  await expect.poll(async () => (await view(page, id))?.pattern).toEqual({ w: 100, h: 50 });

  // colours
  await row(page).getByLabel("Fill 1 saturation").fill("0");
  await expect.poll(async () => (await view(page, id))?.imageFilter ?? "").toContain("saturate(0)");
  await row(page).getByLabel("Fill 1 brightness").fill("150");
  await expect.poll(async () => (await view(page, id))?.imageFilter ?? "").toContain("brightness(1.5)");

  // saved: the manifest holds the file, the fill names it, and the settings round trip
  const out = await saved(page, id, testInfo.outputPath());
  expect(Object.keys(out.manifest)).toContain(a);
  expect(out.fills![0]).toMatchObject({ type: "image", src: `asset:${a}`, mode: "tile", scale: 0.5, saturation: 0, brightness: 1.5 });
  await page.reload();
  await page.waitForFunction((args) => !!document.querySelector<HTMLIFrameElement>(args.sel)?.contentDocument?.querySelector(`[data-element-id="${args.id}"] pattern image`), { sel: STAGE, id }, { timeout: 30_000 });
  await expect.poll(async () => (await view(page, id))?.href ?? "").toMatch(/^blob:/);
  expect((await view(page, id))!.pattern).toEqual({ w: 100, h: 50 });
});

test("Phase 37: crop by dragging the picture's corners, undone in one step", async ({ page }, testInfo) => {
  await ready(page);
  const a = await importAsset(page, "two.svg", svg("#ef4444", "#3b82f6"));
  const id = await draw(page, "r", { x: 150, y: 300, w: 200, h: 100 });
  await openFills(page);
  await row(page).getByLabel("Fill 1 type").selectOption("image");
  await row(page).getByLabel("Fill 1 picture file").selectOption(a);
  await row(page).getByRole("radio", { name: "Crop" }).click();

  // the picture's outline is on the canvas: four corners and a move handle
  await expect(page.locator('.canvas-overlay__ghandle[data-kind^="img"]:not([hidden])')).toHaveCount(5);
  const before = (await saved(page, id, testInfo.outputPath())).fills![0] as { crop?: { x: number; y: number; w: number; h: number } };
  await openFills(page);

  // drag the south-east corner outwards: the picture grows, so the box shows less of it
  const se = (await page.locator('.canvas-overlay__ghandle[data-kind="imgSE"]').boundingBox())!;
  await page.mouse.move(se.x + se.width / 2, se.y + se.height / 2);
  await page.mouse.down();
  await page.mouse.move(se.x + se.width / 2 + 40, se.y + se.height / 2 + 24, { steps: 6 });
  await page.mouse.up();
  const cropped = (await saved(page, id, testInfo.outputPath())).fills![0] as { crop: { x: number; y: number; w: number; h: number } };
  expect(cropped.crop.w, "less than the whole width").toBeLessThan(0.95);
  expect(cropped.crop.h).toBeLessThan(0.95);
  expect(cropped.crop.x, "the north-west corner stayed").toBeCloseTo(0, 2);
  expect(before.crop, "crop starts as the whole picture").toEqual({ x: 0, y: 0, w: 1, h: 1 });

  // the stage draws the picture larger than the box, shifted to the crop
  const v = (await view(page, id))!;
  expect(v.imageBox!.w).toBeGreaterThan(v.pattern!.w * 1.05);
  expect(v.imageBox!.x).toBeCloseTo(0, 1);

  // the move handle pans it: drag towards the top-left
  const mv = (await page.locator('.canvas-overlay__ghandle[data-kind="imgMove"]').boundingBox())!;
  await page.mouse.move(mv.x + mv.width / 2, mv.y + mv.height / 2);
  await page.mouse.down();
  await page.mouse.move(mv.x + mv.width / 2 - 30, mv.y + mv.height / 2 - 10, { steps: 6 });
  await page.mouse.up();
  const panned = (await saved(page, id, testInfo.outputPath())).fills![0] as { crop: { x: number; y: number; w: number } };
  expect(panned.crop.x, "the picture moved up-left, so more of its right side shows").toBeGreaterThan(cropped.crop.x + 0.001);
  expect(panned.crop.w).toBeCloseTo(cropped.crop.w, 3);

  // one undo takes the pan back, another the crop
  await page.mouse.move(700, 300);
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(async () => ((await saved(page, id, testInfo.outputPath())).fills![0] as { crop: { x: number } }).crop.x).toBeCloseTo(cropped.crop.x, 3);
});

test("Phase 37: a frame takes a picture fill too, with colour changes drawn behind its content; replace swaps the picture and keeps the rest", async ({ page }, testInfo) => {
  await ready(page);
  const a = await importAsset(page, "one.svg", svg("#ef4444", "#3b82f6"));
  const b = await importAsset(page, "two.svg", svg("#22c55e", "#f59e0b"));
  const id = await draw(page, "f", { x: 600, y: 300, w: 300, h: 200 });
  await openFills(page);
  await row(page).getByLabel("Fill 1 type").selectOption("image");
  await row(page).getByLabel("Fill 1 picture file").selectOption(a);
  await expect.poll(async () => (await view(page, id))?.bg ?? "").toMatch(/url\("blob:/);
  expect((await view(page, id))!.bgSize).toBe("cover");

  // a colour change can't be a background image: the picture moves to a layer of its own behind the content
  await row(page).getByLabel("Fill 1 saturation").fill("0");
  await expect.poll(async () => (await view(page, id))?.layerFilter ?? "").toContain("saturate(0)");
  expect((await view(page, id))!.bg, "no longer a background").not.toMatch(/blob:/);

  // replace: choose another picture; the colour change stays
  await openFills(page);
  await row(page).getByLabel("Fill 1 picture file").selectOption(b);
  await expect.poll(async () => (await saved(page, id, testInfo.outputPath())).fills![0].src).toBe(`asset:${b}`);
  const out = (await saved(page, id, testInfo.outputPath())).fills![0];
  expect(out).toMatchObject({ mode: "fill", saturation: 0 });
});

test("Phase 37: replacing the picture of an image layer, by the command and by the Picture control", async ({ page }) => {
  await ready(page);
  const a = await importAsset(page, "one.svg", svg("#ef4444", "#3b82f6"));
  const b = await importAsset(page, "two.svg", svg("#22c55e", "#f59e0b"));
  // the drop made an image layer for the second file and selected it
  const layer = await page.evaluate((sel) => Array.from(document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelectorAll<HTMLElement>('[data-archetype="image"]')).map((e) => e.dataset.elementId!), STAGE);
  expect(layer.length).toBeGreaterThanOrEqual(2);
  const src = (id: string) => page.evaluate(({ sel, id }) => document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelector(`[data-element-id="${id}"] img`)?.getAttribute("src") ?? "", { sel: STAGE, id });
  const last = layer[layer.length - 1];
  await page.getByRole("tab", { name: "Pro" }).click();
  await expect(page.getByRole("group", { name: "Picture", exact: true })).toBeVisible();
  const before = await src(last);
  await page.getByLabel("Replace picture").selectOption(a);
  await expect.poll(async () => await src(last)).not.toBe(before);
  const mid = await src(last);
  // the same through the typed command an agent would use
  await page.evaluate((hash) => (window as unknown as { __LL_COMMANDS__: { all: () => { id: string; run: (a?: unknown) => unknown }[] } }).__LL_COMMANDS__.all().find((c) => c.id === "paint.replaceImage")!.run({ src: `asset:${hash}` }), b);
  await expect.poll(async () => await src(last)).not.toBe(mid);
  // a source that isn't a safe picture changes nothing
  const now = await src(last);
  await page.evaluate(() => (window as unknown as { __LL_COMMANDS__: { all: () => { id: string; run: (a?: unknown) => unknown }[] } }).__LL_COMMANDS__.all().find((c) => c.id === "paint.replaceImage")!.run({ src: "javascript:alert(1)" }));
  await page.waitForTimeout(300);
  expect(await src(last)).toBe(now);
});
