/**
 * ROADMAP Phase 42 gate, in Chromium, Firefox and WebKit: constraints and grids hold when frames are resized.
 * A frame with a child for each constraint is resized (through the document and through the inspector's W and H) and
 * every child lands where `constrainBox` says, in one undo step; a grid with column spans, row starts and gaps is
 * within half a pixel of the tracks `trackSpans` computes at five widths; Add grid reads a grid from loose layers and
 * draws its layout grid on the canvas; a layer dragged inside a grid takes a new place in the order.
 */
import { test, expect, type Page } from "@playwright/test";
import { constrainBox, type Constraint } from "../../src/core/layout/constraints";
import { parseTracks, trackSpans } from "../../src/core/layout/grid";
import { openEditor, waitSaved } from "./support/editor";

const MOD = process.platform === "darwin" ? "Meta" : "Control";
const STAGE = 'iframe[title="Stage"]';

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

type Doc = { commands: { addLayer: (input: unknown, label?: string) => string; updateProps: (id: string, patch: Record<string, unknown>) => void }; get: () => { layers: Record<string, { children: string[]; properties: Record<string, unknown> }> } };
type Reg = { all: () => { id: string; run: (a?: unknown) => unknown }[] };

const run = (page: Page, id: string, args?: unknown) =>
  page.evaluate(({ id, args }) => (window as unknown as { __LL_COMMANDS__: Reg }).__LL_COMMANDS__.all().find((c) => c.id === id)!.run(args), { id, args });
const select = (page: Page, ids: string[]) => run(page, "selection.set", { ids });
const props = (page: Page, id: string) => page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().layers[id].properties, id);
const children = (page: Page, id: string) => page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().layers[id].children, id);
const setProps = (page: Page, id: string, patch: Record<string, unknown>) => page.evaluate(({ id, patch }) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.commands.updateProps(id, patch), { id, patch });

/** The rectangles of layers relative to a root layer's top-left, in the frame's own pixels. */
const measure = (page: Page, root: string, ids: Record<string, string>) =>
  page.evaluate(
    ({ root, ids }) => {
      const d = Array.from(document.querySelectorAll("iframe")).map((f) => f.contentDocument).find((c) => c?.querySelector(`[data-element-id="${root}"]`))!;
      const base = d.querySelector<HTMLElement>(`[data-element-id="${root}"]`)!.getBoundingClientRect();
      return Object.fromEntries(
        Object.entries(ids).map(([n, id]) => {
          const r = d.querySelector<HTMLElement>(`[data-element-id="${id}"]`)!.getBoundingClientRect();
          return [n, { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }];
        }),
      );
    },
    { root, ids },
  );

const box = (name: string, parentId: string | null, p: Record<string, unknown>) => ({ archetype: "container", parentId, name, properties: { "layout.padding": 0, "appearance.background.color": "#64748b", ...p } });

test.describe("Phase 42: constraints when a frame is resized", () => {
  const CASES: { name: string; h: Constraint; v: Constraint; x: number; y: number; w: number; hh: number }[] = [
    { name: "tl", h: "start", v: "start", x: 10, y: 10, w: 50, hh: 40 },
    { name: "br", h: "end", v: "end", x: 340, y: 250, w: 50, hh: 40 },
    { name: "stretch", h: "both", v: "both", x: 10, y: 100, w: 380, hh: 40 },
    { name: "mid", h: "center", v: "center", x: 175, y: 130, w: 50, hh: 40 },
    { name: "scale", h: "scale", v: "scale", x: 100, y: 60, w: 200, hh: 80 },
  ];
  const H = { start: "left", end: "right", both: "leftRight", center: "center", scale: "scale" } as const;
  const V = { start: "top", end: "bottom", both: "topBottom", center: "center", scale: "scale" } as const;

  async function build(page: Page) {
    return page.evaluate(
      ({ cases, H, V }) => {
        const doc = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__;
        const frame = doc.commands.addLayer({ archetype: "container", parentId: null, name: "Frame", properties: { positioning: "absolute", "frame.x": 3000, "frame.y": 0, "frame.width": 400, "frame.height": 300, "layout.padding": 0, "appearance.background.color": "#e2e8f0" } });
        const ids: Record<string, string> = {};
        for (const c of cases) {
          ids[c.name] = doc.commands.addLayer({
            archetype: "container",
            parentId: frame,
            name: c.name,
            properties: { positioning: "absolute", "frame.x": c.x, "frame.y": c.y, "frame.width": c.w, "frame.height": c.hh, "layout.padding": 0, "appearance.background.color": "#64748b", ...(c.h !== "start" ? { "constraints.horizontal": (H as Record<string, string>)[c.h] } : {}), ...(c.v !== "start" ? { "constraints.vertical": (V as Record<string, string>)[c.v] } : {}) },
          });
        }
        return { frame, ids };
      },
      { cases: CASES, H, V },
    );
  }

  test("each constraint puts its layer where constrainBox says at four sizes, and undo restores", async ({ page }) => {
    await ready(page);
    const { frame, ids } = await build(page);
    for (const [w, h] of [[600, 450], [250, 180], [400, 500], [1000, 300]]) {
      await setProps(page, frame, { "frame.width": w, "frame.height": h });
      await expect.poll(async () => (await measure(page, frame, { f: frame })).f.w).toBeCloseTo(w, 0);
      const got = await measure(page, frame, ids);
      for (const c of CASES) {
        const e = constrainBox({ x: c.x, y: c.y, width: c.w, height: c.hh, horizontal: c.h, vertical: c.v }, { width: 400, height: 300 }, { width: w, height: h });
        expect(Math.abs(got[c.name].x - e.x), `${c.name}.x at ${w}x${h}`).toBeLessThanOrEqual(0.5);
        expect(Math.abs(got[c.name].y - e.y), `${c.name}.y at ${w}x${h}`).toBeLessThanOrEqual(0.5);
        expect(Math.abs(got[c.name].w - e.width), `${c.name}.w at ${w}x${h}`).toBeLessThanOrEqual(0.5);
        expect(Math.abs(got[c.name].h - e.height), `${c.name}.h at ${w}x${h}`).toBeLessThanOrEqual(0.5);
      }
      // reset to the original frame so every step starts from the same design
      await setProps(page, frame, { "frame.width": 400, "frame.height": 300 });
      for (const c of CASES) await setProps(page, ids[c.name], { "frame.x": c.x, "frame.y": c.y, "frame.width": c.w, "frame.height": c.hh });
    }
  });

  test("a resize through the inspector moves them, is one undo step, and matches the pure function exactly", async ({ page }) => {
    await ready(page);
    const { frame, ids } = await build(page);
    await select(page, [frame]);
    const face = page.getByRole("form", { name: "Design" });
    await face.getByLabel("Width", { exact: true }).fill("640");
    await face.getByLabel("Width", { exact: true }).blur();
    await face.getByLabel("Height", { exact: true }).fill("420");
    await face.getByLabel("Height", { exact: true }).blur();
    await expect.poll(async () => (await props(page, frame))["frame.height"]).toBe(420);
    // the layers were moved in two steps (width, then height): the same as one step to the final size for every constraint
    const got = await measure(page, frame, ids);
    for (const c of CASES) {
      const e = constrainBox({ x: c.x, y: c.y, width: c.w, height: c.hh, horizontal: c.h, vertical: c.v }, { width: 400, height: 300 }, { width: 640, height: 420 });
      expect(Math.abs(got[c.name].x - e.x), `${c.name}.x`).toBeLessThanOrEqual(0.5);
      expect(Math.abs(got[c.name].y - e.y), `${c.name}.y`).toBeLessThanOrEqual(0.5);
      expect(Math.abs(got[c.name].w - e.width), `${c.name}.w`).toBeLessThanOrEqual(0.5);
      expect(Math.abs(got[c.name].h - e.height), `${c.name}.h`).toBeLessThanOrEqual(0.5);
    }
    // one undo each for the height and the width
    await page.keyboard.press(`${MOD}+z`);
    await page.keyboard.press(`${MOD}+z`);
    await expect.poll(async () => (await props(page, ids.br))["frame.x"]).toBe(340);
    expect((await props(page, frame))["frame.width"]).toBe(400);
  });

  test("the constraints controls set them on the selected layer", async ({ page }) => {
    await ready(page);
    const { ids } = await build(page);
    await select(page, [ids.tl]);
    const panel = page.getByRole("region", { name: "Constraints" });
    await panel.getByRole("button", { name: "Horizontal: Right" }).click();
    await panel.getByRole("button", { name: "Vertical: Top & bottom" }).click();
    expect((await props(page, ids.tl))["constraints.horizontal"]).toBe("right");
    expect((await props(page, ids.tl))["constraints.vertical"]).toBe("topBottom");
    await panel.getByRole("button", { name: "Horizontal: Left", exact: true }).click();
    expect((await props(page, ids.tl))["constraints.horizontal"]).toBeUndefined();
  });
});

test.describe("Phase 42: grids", () => {
  const TEMPLATE = "100px 1fr 2fr";
  const GAP = { col: 12, row: 10 };
  const PAD = { top: 16, right: 20, bottom: 16, left: 20 };
  const ROW_H = 60;
  const CELLS = [
    { name: "a", col: 1, span: 1, row: 1, rspan: 1, h: 40 },
    { name: "b", col: 2, span: 2, row: 1, rspan: 1, h: 50 },
    { name: "c", col: 1, span: 3, row: 2, rspan: 1, h: 30 },
    { name: "d", col: 3, span: 1, row: 3, rspan: 1, h: 60 },
  ];

  async function build(page: Page) {
    return page.evaluate(
      ({ template, gap, pad, rowH, cells }) => {
        const doc = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__;
        const grid = doc.commands.addLayer({
          archetype: "container",
          parentId: null,
          name: "Grid",
          properties: {
            positioning: "absolute", "frame.x": 3000, "frame.y": 0, "frame.width": 800, "frame.height": 400, "sizing.horizontal": "fixed", "sizing.vertical": "fixed",
            "layout.display": "grid", "layout.gridTemplateColumns": template, "layout.gridTemplateRows": `repeat(3, ${rowH}px)`,
            "layout.columnGap": gap.col, "layout.rowGap": gap.row, "layout.padding": 0,
            "layout.paddingTop": pad.top, "layout.paddingRight": pad.right, "layout.paddingBottom": pad.bottom, "layout.paddingLeft": pad.left,
            "appearance.background.color": "#e2e8f0",
          },
        });
        const ids: Record<string, string> = {};
        for (const c of cells) {
          ids[c.name] = doc.commands.addLayer({
            archetype: "container",
            parentId: grid,
            name: c.name,
            properties: { positioning: "flow", "sizing.horizontal": "fill", "sizing.vertical": "fixed", "frame.height": c.h, "layout.padding": 0, "layout.gridColumnStart": c.col, "layout.gridColumnSpan": c.span, "layout.gridRowStart": c.row, "layout.gridRowSpan": c.rspan, "appearance.background.color": "#64748b" },
          });
        }
        return { grid, ids };
      },
      { template: TEMPLATE, gap: GAP, pad: PAD, rowH: ROW_H, cells: CELLS },
    );
  }

  test("every cell is within half a pixel of trackSpans at 320, 480, 768, 1024 and 1440", async ({ page }) => {
    await ready(page);
    const { grid, ids } = await build(page);
    for (const width of [320, 480, 768, 1024, 1440]) {
      await setProps(page, grid, { "frame.width": width });
      await expect.poll(async () => (await measure(page, grid, { g: grid })).g.w).toBeCloseTo(width, 0);
      const cols = trackSpans(parseTracks(TEMPLATE)!, width, GAP.col, PAD.left, PAD.right);
      const rows = trackSpans(parseTracks(`repeat(3, ${ROW_H}px)`)!, 400, GAP.row, PAD.top, PAD.bottom);
      const got = await measure(page, grid, ids);
      const off: string[] = [];
      for (const c of CELLS) {
        const first = cols[c.col - 1];
        const last = cols[c.col - 1 + c.span - 1];
        const e = { x: first.pos, w: last.pos + last.len - first.pos, y: rows[c.row - 1].pos, h: c.h };
        for (const [k, want] of Object.entries(e) as [keyof typeof e, number][]) if (Math.abs(got[c.name][k] - want) > 0.5) off.push(`${c.name}.${k} got ${got[c.name][k]} expected ${want} at ${width}`);
      }
      expect(off).toEqual([]);
    }
  });

  test("Add grid on a frame of loose layers reads the grid, draws its layout grid, and spans are set in the inspector", async ({ page }) => {
    await ready(page);
    const ids = await page.evaluate(() => {
      const doc = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__;
      const frame = doc.commands.addLayer({ archetype: "container", parentId: null, name: "Loose", properties: { positioning: "absolute", "frame.x": 3000, "frame.y": 0, "frame.width": 400, "frame.height": 260, "layout.padding": 0, "appearance.background.color": "#e2e8f0" } });
      const cell = (name: string, x: number, y: number) => doc.commands.addLayer({ archetype: "container", parentId: frame, name, properties: { positioning: "absolute", "frame.x": x, "frame.y": y, "frame.width": 100, "frame.height": 50, "layout.padding": 0, "appearance.background.color": "#64748b" } });
      return { frame, a: cell("a", 20, 20), b: cell("b", 140, 20), c: cell("c", 20, 100), d: cell("d", 140, 100) };
    });
    await select(page, [ids.frame]);
    await page.getByRole("region", { name: "Grid" }).getByRole("button", { name: "Add grid" }).click();
    await expect.poll(async () => (await props(page, ids.frame))["layout.display"]).toBe("grid");
    expect((await props(page, ids.frame))["layout.gridColumns"]).toBe(2);
    expect((await props(page, ids.frame))["layout.columnGap"]).toBe(20);
    await expect(page.getByTestId("grid-overlay")).toHaveCount(1);
    await expect(page.locator('[data-testid^="grid-col-"]')).toHaveCount(2);
    // a spans two columns
    await select(page, [ids.a]);
    // one column is 100 wide (the frame's padding is where the layers were); two columns and the gap make 220
    await expect.poll(async () => (await measure(page, ids.frame, { a: ids.a })).a.w).toBeCloseTo(100, 0);
    const panel = page.getByRole("region", { name: "Grid" });
    await panel.getByLabel("Column span", { exact: true }).fill("2");
    await panel.getByLabel("Column span", { exact: true }).blur();
    await expect.poll(async () => (await measure(page, ids.frame, { a: ids.a })).a.w).toBeCloseTo(220, 0);
    await page.keyboard.press(`${MOD}+z`);
    await expect.poll(async () => (await props(page, ids.a))["layout.gridColumnSpan"]).toBeUndefined();
  });

  test("dragging a layer inside a grid moves it in the order, with an insertion line", async ({ page }) => {
    await ready(page);
    const { grid, ids } = await build(page);
    // simple auto placement: no explicit cells, equal columns, three in a row
    for (const n of ["a", "b", "c", "d"]) await setProps(page, ids[n], { "layout.gridColumnStart": undefined, "layout.gridColumnSpan": undefined, "layout.gridRowStart": undefined, "layout.gridRowSpan": undefined, "frame.height": 40 });
    await setProps(page, grid, { "layout.gridTemplateColumns": "repeat(2, minmax(0, 1fr))", "layout.gridTemplateRows": "" });
    await select(page, [grid]);
    await run(page, "canvas.zoomToSelection");
    await page.waitForTimeout(600);
    const screen = (id: string) =>
      page.evaluate((id) => {
        const iframe = Array.from(document.querySelectorAll("iframe")).find((i) => i.contentDocument?.querySelector(`[data-element-id="${id}"]`))!;
        const f = iframe.getBoundingClientRect();
        const s = f.width / iframe.clientWidth;
        const b = iframe.contentDocument!.querySelector<HTMLElement>(`[data-element-id="${id}"]`)!.getBoundingClientRect();
        return { x: f.left + b.left * s, y: f.top + b.top * s, w: b.width * s, h: b.height * s };
      }, id);
    expect(await children(page, grid)).toEqual([ids.a, ids.b, ids.c, ids.d]);
    const a = await screen(ids.a);
    const d = await screen(ids.d);
    await page.mouse.click(a.x + a.w / 2, a.y + a.h / 2);
    await page.mouse.move(a.x + a.w / 2, a.y + a.h / 2);
    await page.mouse.down();
    await page.mouse.move(d.x + d.w / 2, d.y + d.h / 2, { steps: 6 });
    await page.mouse.move(d.x + d.w * 0.8, d.y + d.h / 2, { steps: 3 });
    await expect(page.getByTestId("stack-drop")).toHaveCount(1);
    await page.mouse.up();
    await expect.poll(() => children(page, grid)).toEqual([ids.b, ids.c, ids.d, ids.a]);
    await page.keyboard.press(`${MOD}+z`);
    await expect.poll(() => children(page, grid)).toEqual([ids.a, ids.b, ids.c, ids.d]);
  });
});
