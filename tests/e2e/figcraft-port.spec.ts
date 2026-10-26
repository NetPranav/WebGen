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

test("FigCraft port: push an instance's change to its main, combine two components as variants, duplicate a main as an instance", async ({ page }) => {
  await ready(page);
  type D = { commands: { addLayer: (input: unknown) => string; updateProps: (id: string, patch: Record<string, unknown>) => void }; get: () => { layers: Record<string, { children: string[]; properties: Record<string, unknown>; componentMain?: string; instance?: { component: string; source: string; root?: boolean; variant?: Record<string, string> } }>; designComponents?: Record<string, { variantProps?: { name: string; values: string[] }[] }> } };
  const { a, b } = await page.evaluate(() => {
    const d = (window as unknown as { __LL_DOC__: D }).__LL_DOC__;
    const frame = d.commands.addLayer({ archetype: "container", parentId: null, name: "Page", properties: { positioning: "absolute", "frame.x": 3000, "frame.y": 0, "frame.width": 900, "frame.height": 700, "appearance.background.color": "#ffffff" } });
    const mk = (name: string, x: number) => d.commands.addLayer({ archetype: "container", parentId: frame, name, properties: { positioning: "absolute", "frame.x": x, "frame.y": 20, "frame.width": 160, "frame.height": 48, "appearance.background.color": "#336699" } });
    return { a: mk("Primary", 20), b: mk("Secondary", 300) };
  });
  const D = <T,>(fn: (d: ReturnType<D["get"]>, arg: string) => T, arg = "") => page.evaluate(({ src, arg }) => new Function("d", "arg", `return (${src})(d, arg)`)((window as unknown as { __LL_DOC__: D }).__LL_DOC__.get(), arg) as T, { src: fn.toString(), arg });
  await run(page, "component.createFrom", { ids: [a] });
  await run(page, "component.createFrom", { ids: [b] });
  // an instance of Primary, recoloured, pushes its colour to the main
  await run(page, "selection.set", { ids: [a] });
  await run(page, "edit.duplicate");
  const inst = await D((d, a) => Object.entries(d.layers).find(([, l]) => l.instance?.root && l.instance.source === a)?.[0] ?? "", a);
  expect(inst).not.toBe("");
  await page.evaluate((id) => (window as unknown as { __LL_DOC__: D }).__LL_DOC__.commands.updateProps(id, { "appearance.background.color": "#ff0000" }), inst);
  await run(page, "selection.set", { ids: [inst] });
  await page.getByRole("region", { name: "Instance" }).getByRole("button", { name: "Push changes to main component" }).click();
  await expect.poll(() => D((d, a) => d.layers[a].properties["appearance.background.color"], a)).toBe("#ff0000");
  // both mains selected: combine them into one set
  await run(page, "selection.set", { ids: [a, b] });
  await page.getByRole("button", { name: "Combine as variants" }).click();
  await expect.poll(() => D((d) => Object.values(d.designComponents ?? {}).map((c) => c.variantProps?.[0]?.values.join(",")).join("|"))).toBe("Default,Variant2");
  expect(await D((d, id) => d.layers[id].instance!.variant, inst)).toEqual({ "Property 1": "Default" });
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(() => D((d) => Object.keys(d.designComponents ?? {}).length)).toBe(2);
});

test("FigCraft port: a collection's mode chosen on a frame, an alias, and a paint style reach the stage", async ({ page }) => {
  await ready(page);
  type D = { commands: { addLayer: (input: unknown) => string }; get: () => { layers: Record<string, { styleRefs?: Record<string, string> }> } };
  const ids = await page.evaluate(() => {
    const d = (window as unknown as { __LL_DOC__: D }).__LL_DOC__;
    const page = d.commands.addLayer({ archetype: "container", parentId: null, name: "Page", properties: { positioning: "absolute", "frame.x": 3000, "frame.y": 0, "frame.width": 800, "frame.height": 500, "appearance.background.color": "#ffffff" } });
    const box = (name: string, parentId: string, x: number) => d.commands.addLayer({ archetype: "container", parentId, name, properties: { positioning: "absolute", "frame.x": x, "frame.y": 20, "frame.width": 300, "frame.height": 200, "appearance.background.color": "#888888" } });
    const dark = box("Dark area", page, 10);
    const inside = box("Inside", dark, 10);
    const outside = box("Outside", page, 400);
    return { page, dark, inside, outside };
  });
  // a Theme collection, a colour in it, and an alias of that colour bound to two boxes
  const theme = (await run(page, "token.createCollection", { name: "Theme", modes: ["Light", "Dark"] })) as { id: string };
  const bg = (await run(page, "token.createVariable", { name: "bg", type: "color", values: { light: "#ffffff", dark: "#000000" }, collection: theme.id })) as { id: string };
  const surface = (await run(page, "token.createVariable", { name: "surface", type: "color", values: {}, collection: theme.id })) as { id: string };
  expect((await run(page, "token.setAlias", { id: surface.id, mode: "light", alias: bg.id })) as { ok: boolean }).toEqual({ ok: true });
  await run(page, "token.setAlias", { id: surface.id, mode: "dark", alias: bg.id });
  await run(page, "token.bind", { path: "appearance.background.color", variable: surface.id, ids: [ids.inside, ids.outside] });
  // each frame draws in its own iframe
  const bgOf = (id: string) =>
    page.evaluate((id) => {
      const d = Array.from(document.querySelectorAll("iframe")).map((f) => f.contentDocument).find((c) => c?.querySelector(`[data-element-id="${id}"]`));
      const el = d?.querySelector<HTMLElement>(`[data-element-id="${id}"]`);
      return el ? d!.defaultView!.getComputedStyle(el).backgroundColor : null;
    }, id);
  await expect.poll(() => bgOf(ids.inside)).toBe("rgb(255, 255, 255)");
  // the frame chooses Dark in the inspector: what is inside it follows, the box outside doesn't
  await run(page, "selection.set", { ids: [ids.dark] });
  await page.getByRole("combobox", { name: "Theme mode" }).selectOption("dark");
  await expect.poll(() => bgOf(ids.inside)).toBe("rgb(0, 0, 0)");
  expect(await bgOf(ids.outside)).toBe("rgb(255, 255, 255)");
  // a paint style from a box, applied to another from the inspector
  await run(page, "style.create", { kind: "paint", name: "Brand", from: ids.dark });
  await run(page, "selection.set", { ids: [ids.outside] });
  await run(page, "token.unbind", { path: "appearance.background.color", ids: [ids.outside] });
  await page.getByRole("combobox", { name: "Fill style" }).selectOption({ label: "Brand" });
  // (a fill list draws as background layers)
  const imageOf = (id: string) =>
    page.evaluate((id) => {
      const d = Array.from(document.querySelectorAll("iframe")).map((f) => f.contentDocument).find((c) => c?.querySelector(`[data-element-id="${id}"]`));
      const el = d?.querySelector<HTMLElement>(`[data-element-id="${id}"]`);
      return el ? `${d!.defaultView!.getComputedStyle(el).backgroundImage} ${d!.defaultView!.getComputedStyle(el).backgroundColor}` : "";
    }, id);
  await expect.poll(() => imageOf(ids.outside)).toContain("rgb(136, 136, 136)");
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(() => page.evaluate((id) => (window as unknown as { __LL_DOC__: D }).__LL_DOC__.get().layers[id].styleRefs?.fill ?? "", ids.outside)).toBe("");
});

test("FigCraft port: effects added in the Pro inspector reach the stage: noise as a filter, a progressive blur as backdrop layers", async ({ page }) => {
  await ready(page);
  const r = await drawRect(page, { x: 40, y: 60, w: 120, h: 80 });
  await run(page, "selection.set", { ids: [r] });
  await page.getByRole("tab", { name: "Pro" }).click();
  await page.getByRole("combobox", { name: "Add effect" }).selectOption("noise");
  await expect.poll(() => inStage(page, (doc, id) => getComputedStyle(doc.querySelector(`[data-element-id="${id}"]`)!).filter, r)).toContain("url(");
  expect(await inStage(page, (doc, id) => !!doc.querySelector(`[data-effect-defs] filter[id="fx-${id}"] feTurbulence`), r)).toBe(true);
  await page.getByRole("combobox", { name: "Effect 1 noise mode" }).selectOption("duo");
  await expect.poll(() => inStage(page, (doc, id) => doc.querySelectorAll(`filter[id="fx-${id}"] feFlood`).length, r)).toBe(2);
  // a frame with a progressive background blur draws its backdrop layers
  const frame = await page.evaluate(() => {
    const doc = (window as unknown as { __LL_DOC__: { get: () => { layers: Record<string, { parentId: string | null; archetype: string }> }; commands: { addLayer: (input: unknown) => string } } }).__LL_DOC__;
    const top = Object.entries(doc.get().layers).find(([, l]) => l.parentId === null && l.archetype === "container")![0];
    return doc.commands.addLayer({ archetype: "container", parentId: top, name: "Blurred", properties: { positioning: "absolute", "frame.x": 200, "frame.y": 60, "frame.width": 160, "frame.height": 100 } });
  });
  expect(frame).not.toBe("");
  await run(page, "paint.setEffects", { ids: [frame], effects: [{ type: "backgroundBlur", blurType: "progressive", radius: 12 }] });
  await expect.poll(() => inStage(page, (doc, id) => doc.querySelectorAll(`[data-element-id="${id}"] > [data-effect-band]`).length, frame)).toBe(5);
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(() => inStage(page, (doc, id) => doc.querySelectorAll(`[data-element-id="${id}"] > [data-effect-band]`).length, frame)).toBe(0);
});
