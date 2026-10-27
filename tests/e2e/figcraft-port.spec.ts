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

test("FigCraft port: a numbered list nested from the inspector, and text put on a shape's path", async ({ page }) => {
  await ready(page);
  type D = { commands: { addLayer: (input: unknown) => string }; get: () => { layers: Record<string, { parentId: string | null; archetype: string }> } };
  const { t, arc } = await page.evaluate(() => {
    const d = (window as unknown as { __LL_DOC__: D }).__LL_DOC__;
    const top = Object.entries(d.get().layers).find(([, l]) => l.parentId === null && l.archetype === "container")![0];
    const t = d.commands.addLayer({ archetype: "text", parentId: top, name: "Steps", properties: { positioning: "absolute", "frame.x": 40, "frame.y": 300, "frame.width": 240, "frame.height": 120, "text.sizing": "fixed", "content.text": "Plan\nDraw\nShip", "typography.fontSize": 16 } });
    const arc = d.commands.addLayer({ archetype: "ellipse", parentId: top, name: "Arc", properties: { positioning: "absolute", "frame.x": 320, "frame.y": 300, "frame.width": 200, "frame.height": 120 } });
    return { t, arc };
  });
  await run(page, "selection.set", { ids: [t] });
  await page.getByRole("tab", { name: "Pro" }).click();
  await page.getByRole("radio", { name: "Numbers" }).click();
  const markers = () => inStage(page, (doc, id) => Array.from(doc.querySelectorAll(`[data-element-id="${id}"] [data-list-marker]`)).map((m) => m.textContent).join(" "), t);
  await expect.poll(markers).toBe("1. 2. 3.");
  await run(page, "text.indentList", { by: 1, paragraphs: [1], ids: [t] });
  await expect.poll(markers).toBe("1. a. 2.");
  // the text and the ellipse selected: put the text on the ellipse's outline
  await run(page, "selection.set", { ids: [t, arc] });
  await page.getByRole("button", { name: "Put text on the selected shape's path" }).click();
  await expect.poll(() => inStage(page, (doc, id) => doc.querySelector(`[data-element-id="${id}"] textPath`)?.textContent ?? "", t)).toBe("Plan Draw Ship");
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(() => inStage(page, (doc, id) => !!doc.querySelector(`[data-element-id="${id}"] textPath`), t)).toBe(false);
});

test("FigCraft port: Alt-drag copies, the Scale tool scales strokes with the layer, Alt-hover measures to another layer, batch rename", async ({ page }) => {
  await ready(page);
  // a plain frame to work in (the demo's root is an auto-layout stack, where a drag reorders instead of moving)
  await page.evaluate(() => {
    const d = (window as unknown as { __LL_DOC__: { get: () => { layers: Record<string, { parentId: string | null; archetype: string }> }; commands: { addLayer: (input: unknown) => string } } }).__LL_DOC__;
    const top = Object.entries(d.get().layers).find(([, l]) => l.parentId === null && l.archetype === "container")![0];
    d.commands.addLayer({ archetype: "container", parentId: top, name: "Board", properties: { positioning: "absolute", "frame.x": 0, "frame.y": 0, "frame.width": 700, "frame.height": 500, "appearance.background.color": "#ffffff" } });
  });
  await page.waitForTimeout(300);
  // big enough on screen that a press in the middle misses the corner-radius handle
  const a = await drawRect(page, { x: 40, y: 60, w: 300, h: 200 });
  const g = await frameGeom(page);
  const at = (x: number, y: number) => ({ x: g.left + x * g.zoom, y: g.top + y * g.zoom });
  type D = { get: () => { layers: Record<string, { name: string; properties: Record<string, unknown> }> } };
  const props = (id: string) => page.evaluate((id) => (window as unknown as { __LL_DOC__: D }).__LL_DOC__.get().layers[id].properties, id);
  const x0 = Number((await props(a))["frame.x"]);
  const y0 = Number((await props(a))["frame.y"]);
  // Alt-drag: a copy moves, the original stays
  const before = await layerIds(page);
  let p = at(x0 + 150, y0 + 100);
  await page.mouse.move(p.x, p.y);
  await page.keyboard.down("Alt");
  await page.mouse.down();
  await page.mouse.move(p.x + 100 * g.zoom, p.y, { steps: 4 });
  await page.mouse.move(p.x + 360 * g.zoom, p.y, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.up("Alt");
  const copy = await newLayer(page, before);
  expect(Number((await props(a))["frame.x"])).toBe(x0);
  expect(Math.abs(Number((await props(copy))["frame.x"]) - x0 - 360)).toBeLessThan(12);
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(async () => (await layerIds(page)).includes(copy)).toBe(false);
  // the Scale tool: dragging the bottom-right handle to twice the size doubles the stroke too
  await run(page, "selection.set", { ids: [a] });
  await page.evaluate((id) => (window as unknown as { __LL_DOC__: { commands: { updateProps: (id: string, p: Record<string, unknown>) => void } } }).__LL_DOC__.commands.updateProps(id, { "svg.strokeWidth": 3, "svg.stroke": "#000000" }), a);
  await page.keyboard.press("k");
  p = at(x0 + 300, y0 + 200);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 150 * g.zoom, p.y + 100 * g.zoom, { steps: 3 });
  await page.mouse.move(p.x + 300 * g.zoom, p.y + 200 * g.zoom, { steps: 3 });
  await page.mouse.up();
  await expect.poll(async () => Math.round(Number((await props(a))["frame.width"]) / 10) * 10).toBe(600);
  expect(Math.round(Number((await props(a))["svg.strokeWidth"]))).toBe(6);
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(async () => (await props(a))["svg.strokeWidth"]).toBe(3);
  await page.keyboard.press("v");
  // Alt held over another layer: the HUD measures from the selection to it (Cmd too: the layer nested in the frame under the pointer)
  const b = await drawRect(page, { x: 400, y: 60, w: 120, h: 200 });
  await run(page, "selection.set", { ids: [a] });
  const bx = Number((await props(b))["frame.x"]);
  p = at(bx + 60, y0 + 100);
  await page.mouse.move(p.x, p.y);
  await page.keyboard.down(MOD);
  await page.keyboard.down("Alt");
  // (a layer just drawn is measured a moment later: the pointer nudges until the hover finds it)
  const gap = bx - (x0 + Number((await props(a))["frame.width"]));
  let nudge = 0;
  await expect.poll(async () => {
    await page.mouse.move(p.x + (nudge++ % 2) * 2, p.y + 2);
    const labels = await page.locator(".canvas-overlay__spacing:not([hidden]) span").allTextContents();
    return labels.some((t) => Math.abs(Number(t) - gap) < 0.5);
  }).toBe(true);
  await page.keyboard.up("Alt");
  await page.keyboard.up(MOD);
  // batch rename from the Pro inspector, numbered in stacking order
  await run(page, "selection.set", { ids: [a, b] });
  await page.getByRole("tab", { name: "Pro" }).click();
  await page.getByLabel("Rename: whole name").fill("Card $n");
  await page.getByRole("button", { name: "Rename selected layers" }).click();
  await expect.poll(() => page.evaluate(({ a, b }) => { const l = (window as unknown as { __LL_DOC__: D }).__LL_DOC__.get().layers; return [l[a].name, l[b].name]; }, { a, b })).toEqual(["Card 1", "Card 2"]);
});

test("FigCraft port: the rotation origin moved to a corner turns the layer about it", async ({ page }) => {
  await ready(page);
  const a = await drawRect(page, { x: 100, y: 100, w: 100, h: 50 });
  await run(page, "selection.set", { ids: [a] });
  type D = { get: () => { layers: Record<string, { properties: Record<string, unknown> }> } };
  const props = () => page.evaluate((id) => (window as unknown as { __LL_DOC__: D }).__LL_DOC__.get().layers[id].properties, a);
  const { x, y } = { x: Number((await props())["frame.x"]), y: Number((await props())["frame.y"]) };
  await run(page, "transform.setRotationOrigin", { editing: true });
  await expect(page.locator(".canvas-overlay__origin")).toBeVisible();
  // the top-left corner, on the page: the frame's own origin plus the layer's place
  const origin = (await run(page, "transform.setRotationOrigin", {})) as { origin: { x: number; y: number } };
  await run(page, "transform.setRotationOrigin", { x: origin.origin.x - 50, y: origin.origin.y - 25 });
  await run(page, "transform.rotate", { degrees: 90 });
  await expect.poll(async () => Math.round(Number((await props())["frame.rotation"]))).toBe(90);
  // a quarter turn about the top-left corner: the centre swings from (50, 25) to (−25, 50) relative to that corner
  const after = await props();
  expect(Math.round(Number(after["frame.x"]) + 50 - x)).toBe(-25);
  expect(Math.round(Number(after["frame.y"]) + 25 - y)).toBe(50);
});

test("FigCraft port: a frame converted to a group and a section from the inspector, and a layer exported as PNG and SVG", async ({ page }) => {
  await ready(page);
  type D = { commands: { addLayer: (input: unknown) => string }; get: () => { layers: Record<string, { parentId: string | null; archetype: string; properties: Record<string, unknown> }> } };
  const ids = await page.evaluate(() => {
    const d = (window as unknown as { __LL_DOC__: D }).__LL_DOC__;
    const top = Object.entries(d.get().layers).find(([, l]) => l.parentId === null && l.archetype === "container")![0];
    const card = d.commands.addLayer({ archetype: "container", parentId: top, name: "Card", properties: { positioning: "absolute", "frame.x": 40, "frame.y": 40, "frame.width": 300, "frame.height": 200, "appearance.background.color": "#ff0000" } });
    const dot = d.commands.addLayer({ archetype: "rectangle", parentId: card, name: "Dot", properties: { positioning: "absolute", "frame.x": 20, "frame.y": 30, "frame.width": 40, "frame.height": 20, "svg.fill": "#0000ff" } });
    return { top, card, dot };
  });
  const kind = (id: string) => page.evaluate((id) => String((window as unknown as { __LL_DOC__: D }).__LL_DOC__.get().layers[id].properties["frame.kind"] ?? "frame"), id);
  await run(page, "selection.set", { ids: [ids.card] });
  await page.getByRole("tab", { name: "Pro" }).click();
  await page.getByRole("button", { name: "Convert to group" }).click();
  await expect.poll(() => kind(ids.card)).toBe("group");
  expect(await page.evaluate((id) => (window as unknown as { __LL_DOC__: D }).__LL_DOC__.get().layers[id].properties["frame.width"], ids.card)).toBe(40);
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(() => kind(ids.card)).toBe("frame");
  // the layer as a file: PNG through the browser's canvas, and the SVG it is drawn from
  await page.getByRole("button", { name: "Add export setting" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export layer Card" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("Card.png");
  const svg = (await run(page, "export.layerSvg", { id: ids.card })) as { svg: string };
  expect(svg.svg).toContain('data-element-id="' + ids.card + '"');
  // a top-level frame becomes a section, which shows its name
  await run(page, "selection.set", { ids: [ids.top] });
  await page.getByRole("button", { name: "Convert to section" }).click();
  await expect.poll(() => kind(ids.top)).toBe("section");
  await expect.poll(() => inStage(page, (doc) => doc.querySelector("[data-section-label]")?.textContent ?? "", "")).not.toBe("");
});

test("FigCraft port: Dev Mode in the Code tab: inspect a layer, annotate it, keep a measurement, mark it ready and compare changes", async ({ page }) => {
  await ready(page);
  type D = { commands: { addLayer: (input: unknown) => string; updateProps: (id: string, p: Record<string, unknown>) => void }; get: () => { layers: Record<string, { parentId: string | null; archetype: string; annotations?: unknown[]; measurements?: unknown[]; devStatus?: { status: string } }> } };
  const ids = await page.evaluate(() => {
    const d = (window as unknown as { __LL_DOC__: D }).__LL_DOC__;
    const top = Object.entries(d.get().layers).find(([, l]) => l.parentId === null && l.archetype === "container")![0];
    const card = d.commands.addLayer({ archetype: "container", parentId: top, name: "Card", properties: { positioning: "absolute", "frame.x": 40, "frame.y": 40, "frame.width": 120, "frame.height": 80, "appearance.background.color": "#ff0000" } });
    const other = d.commands.addLayer({ archetype: "rectangle", parentId: top, name: "Other", properties: { positioning: "absolute", "frame.x": 200, "frame.y": 40, "frame.width": 50, "frame.height": 80 } });
    return { card, other };
  });
  const layer = (id: string) => page.evaluate((id) => (window as unknown as { __LL_DOC__: D }).__LL_DOC__.get().layers[id], id);
  await run(page, "selection.set", { ids: [ids.card, ids.other] });
  await page.locator(".dock-zone--right").getByText("Code", { exact: true }).first().click();
  await page.getByRole("tab", { name: "Inspect" }).click();
  const inspect = page.getByRole("region", { name: "Inspect" });
  await expect(inspect.locator('[data-inspect-row="Width"]').first()).toContainText("120");
  await expect(inspect.locator('[data-inspect-row="Solid"]').first()).toContainText("#FF0000");
  await inspect.getByLabel("Colour format").selectOption("rgb");
  await expect(inspect.locator('[data-inspect-row="Solid"]').first()).toContainText("255, 0, 0");
  await expect(inspect.getByLabel("Inspect CSS")).toContainText("background-color");
  // an annotation in a category, with a pinned property
  await inspect.getByLabel("New annotation").fill("Use the card component");
  await inspect.getByLabel("Annotation category").selectOption("accessibility");
  await inspect.getByLabel("Pin Width").check();
  await inspect.getByRole("button", { name: "Add annotation" }).click();
  await expect.poll(async () => (await layer(ids.card)).annotations?.length ?? 0).toBe(1);
  // a measurement to the other selected layer, drawn on the canvas while Dev Mode shows
  await inspect.getByRole("button", { name: "Keep measurement to the other selected layer" }).click();
  await expect.poll(async () => (await layer(ids.card)).measurements?.length ?? 0).toBe(1);
  await expect.poll(() => page.locator(".canvas-overlay__spacing:not([hidden]) span").allTextContents()).toContain("40");
  // ready for development, then a change shows in Compare changes
  await inspect.getByRole("button", { name: "Mark ready for development" }).click();
  await expect.poll(async () => (await layer(ids.card)).devStatus?.status).toBe("ready");
  await page.evaluate((id) => (window as unknown as { __LL_DOC__: D }).__LL_DOC__.commands.updateProps(id, { "frame.width": 136 }), ids.card);
  await inspect.getByRole("button", { name: "Compare changes" }).click();
  await expect(inspect.getByRole("list", { name: "Changes" })).toContainText("width 120 → 136");
});

test("FigCraft port: an SVG file placed as an editable design keeps its groups, gradient and text as layers", async ({ page }) => {
  await ready(page);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100"><defs><linearGradient id="g"><stop offset="0" stop-color="#ff0000"/><stop offset="1" stop-color="#0000ff"/></linearGradient></defs><g id="badge"><rect id="pill" x="10" y="10" width="120" height="40" rx="20" fill="url(#g)"/><text id="label" x="30" y="36" font-size="16" fill="#ffffff">Hello</text></g><circle id="dot" cx="170" cy="50" r="20" fill="#00aa00" opacity="0.5"/><script>alert(1)</script></svg>`;
  await page.evaluate(async (svg) => {
    const dt = new DataTransfer();
    dt.items.add(new File([svg], "badge.svg", { type: "image/svg+xml" }));
    const stage = document.querySelector(".whiteboard-stage")!;
    const r = stage.getBoundingClientRect();
    stage.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, clientX: r.left + 40, clientY: r.top + 40, bubbles: true, cancelable: true }));
  }, svg);
  type Assets = { list: () => Promise<{ id: string; name: string }[]>; placeAsDesign: (id: string) => Promise<{ frame: string; notes: string[] } | null> };
  await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __LL_ASSETS__: Assets }).__LL_ASSETS__.list())).some((x) => x.name === "badge.svg")).toBe(true);
  const assetId = (await page.evaluate(() => (window as unknown as { __LL_ASSETS__: Assets }).__LL_ASSETS__.list())).find((x) => x.name === "badge.svg")!.id;
  const placed = await page.evaluate((id) => (window as unknown as { __LL_ASSETS__: Assets }).__LL_ASSETS__.placeAsDesign(id), assetId);
  expect(placed).not.toBeNull();
  type D = { get: () => { layers: Record<string, { name: string; archetype: string; children: string[]; properties: Record<string, unknown> }> } };
  const names = await page.evaluate((frame) => {
    const L = (window as unknown as { __LL_DOC__: D }).__LL_DOC__.get().layers;
    const walk = (id: string): string[] => [`${L[id].archetype}:${L[id].name}`, ...L[id].children.flatMap(walk)];
    return walk(frame);
  }, placed!.frame);
  expect(names).toEqual(["container:badge", "container:badge", "rectangle:pill", "text:label", "ellipse:dot"]);
  // the gradient and the text reach the stage
  const pill = await page.evaluate((frame) => {
    const L = (window as unknown as { __LL_DOC__: D }).__LL_DOC__.get().layers;
    return Object.values(L).find((l) => l.name === "pill" && JSON.stringify(L[frame]).length > 0)!;
  }, placed!.frame);
  expect(String(pill.properties["paint.fills"])).toContain("linear");
  await expect.poll(() => inStage(page, (doc) => Array.from(doc.querySelectorAll('[data-archetype="text"]')).some((e) => e.textContent === "Hello"), "")).toBe(true);
  expect(await inStage(page, (doc) => doc.documentElement.outerHTML.includes("alert(1)"), "")).toBe(false);
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(() => page.evaluate((id) => !!(window as unknown as { __LL_DOC__: D }).__LL_DOC__.get().layers[id], placed!.frame)).toBe(false);
});

test("FigCraft port: a component inside a component: the icon's edit reaches the button's instances, and the nested icon swaps from the inspector", async ({ page }) => {
  await ready(page);
  type D = { commands: { addLayer: (input: unknown) => string; updateProps: (id: string, p: Record<string, unknown>) => void }; get: () => { layers: Record<string, { parentId: string | null; archetype: string; children: string[]; properties: Record<string, unknown>; instance?: { source: string; swap?: string } }> } };
  const ids = await page.evaluate(() => {
    const d = (window as unknown as { __LL_DOC__: D }).__LL_DOC__;
    const top = Object.entries(d.get().layers).find(([, l]) => l.parentId === null && l.archetype === "container")![0];
    const mk = (name: string, parentId: string, x: number, w: number, color: string) => d.commands.addLayer({ archetype: "container", parentId, name, properties: { positioning: "absolute", "frame.x": x, "frame.y": 20, "frame.width": w, "frame.height": 40, "layout.padding": 0, "appearance.background.color": color } });
    const icon = mk("Icon", top, 20, 40, "#111111");
    const iconShape = mk("Shape", icon, 0, 20, "#222222");
    const star = mk("Star", top, 80, 40, "#ffcc00");
    mk("Shape", star, 0, 20, "#ff8800");
    const btn = mk("Button", top, 160, 200, "#ffffff");
    return { top, icon, iconShape, star, btn };
  });
  const iconC = ((await run(page, "component.createFrom", { ids: [ids.icon] })) as { id: string }).id;
  const starC = ((await run(page, "component.createFrom", { ids: [ids.star] })) as { id: string }).id;
  const nested = ((await run(page, "component.insert", { component: iconC, parentId: ids.btn, x: 8, y: 0 })) as { id: string }).id;
  const btnC = ((await run(page, "component.createFrom", { ids: [ids.btn] })) as { id: string }).id;
  expect(btnC).toBeTruthy();
  const inst = ((await run(page, "component.insert", { component: btnC, parentId: ids.top, x: 160, y: 300 })) as { id: string }).id;
  const layers = () => page.evaluate(() => (window as unknown as { __LL_DOC__: D }).__LL_DOC__.get().layers);
  const copyOf = async (root: string, source: string) => {
    const L = await layers();
    const walk = (id: string): string | null => (L[id].instance?.source === source ? id : L[id].children.map(walk).find(Boolean) ?? null);
    return walk(root)!;
  };
  const inested = await copyOf(inst, nested);
  // the icon's main changes: the copy in the button's main and in the button's instance follow
  await page.evaluate((id) => (window as unknown as { __LL_DOC__: D }).__LL_DOC__.commands.updateProps(id, { "appearance.background.color": "#00aa00" }), ids.iconShape);
  await expect.poll(async () => (await layers())[(await layers())[inested].children[0]].properties["appearance.background.color"]).toBe("#00aa00");
  // swap the nested icon to the star from the inspector
  await run(page, "selection.set", { ids: [inested] });
  await expect(page.getByRole("region", { name: "Instance" }).getByText("Nested: Icon")).toBeVisible();
  await page.getByRole("region", { name: "Instance" }).getByLabel("Swap instance").selectOption(starC);
  await expect.poll(async () => (await layers())[inested].instance?.swap).toBe(starC);
  await expect.poll(async () => (await layers())[(await layers())[inested].children[0]].properties["appearance.background.color"]).toBe("#ff8800");
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(async () => (await layers())[inested].instance?.swap ?? null).toBe(null);
});
