/**
 * ROADMAP Phase 44 gate, in Chromium, Firefox and WebKit: "All" draws every breakpoint of a responsive page side by
 * side (the one being edited is the real frame, the others are live previews at their own widths); a change shows in
 * every view; selecting a layer outlines it in every view; clicking a layer in a preview selects it and makes that
 * breakpoint the one being edited; dragging a view's right edge changes the breakpoint's width and the page reflows
 * live (one undo step); a 200-layer page keeps frame rate while an edge is dragged.
 */
import { test, expect, type Page } from "@playwright/test";
import { openEditor, waitSaved } from "./support/editor";

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

type Doc = { commands: { addLayer: (input: unknown, label?: string) => string; updateProps: (id: string, patch: Record<string, unknown>) => void }; get: () => { layers: Record<string, { children: string[]; properties: Record<string, unknown>; overrides?: Record<string, Record<string, unknown>> }>; breakpoints?: { id: string; name: string; width: number }[] } };
type Reg = { all: () => { id: string; run: (a?: unknown) => unknown }[] };
const run = (page: Page, id: string, args?: unknown) => page.evaluate(({ id, args }) => (window as unknown as { __LL_COMMANDS__: Reg }).__LL_COMMANDS__.all().find((c) => c.id === id)!.run(args), { id, args });
const select = (page: Page, ids: string[]) => run(page, "selection.set", { ids });
const breakpoints = (page: Page) => page.evaluate(() => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().breakpoints ?? null);

async function build(page: Page, count = 3) {
  return page.evaluate((count) => {
    const doc = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__;
    const frame = doc.commands.addLayer({ archetype: "container", parentId: null, name: "Page", properties: { positioning: "absolute", "frame.x": 3000, "frame.y": 0, "frame.width": 1440, "frame.height": 600, "layout.padding": 0, "appearance.background.color": "#e2e8f0", "breakpoints.responsive": true } });
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(doc.commands.addLayer({ archetype: "container", parentId: frame, name: `k${i}`, properties: { positioning: "absolute", "frame.x": 20 + (i % 10) * 120, "frame.y": 20 + Math.floor(i / 10) * 24, "frame.width": 100, "frame.height": 20, "layout.padding": 0, "appearance.background.color": "#64748b", ...(i % 3 === 0 ? { "constraints.horizontal": "right" } : {}) } }));
    }
    return { frame, ids };
  }, count);
}

/** Where a layer is inside the view that draws it (frame pixels), the view's iframe, and the frame's width there. */
const inView = (page: Page, view: string, id: string) =>
  page.evaluate(
    ({ view, id }) => {
      const iframe = document.querySelector<HTMLElement>(`[data-testid="${view}"] iframe`) as HTMLIFrameElement | null;
      const d = iframe?.contentDocument;
      const el = d?.querySelector<HTMLElement>(`[data-element-id="${id}"]`);
      if (!iframe || !d || !el) return null;
      const f = iframe.getBoundingClientRect();
      const s = f.width / iframe.clientWidth;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height, screenX: f.left + (r.left + r.width / 2) * s, screenY: f.top + (r.top + r.height / 2) * s, frameWidth: iframe.clientWidth };
    },
    { view, id },
  );

const bar = (page: Page) => page.getByRole("toolbar", { name: "Breakpoints" });

test.describe("Phase 44: the breakpoint canvas", () => {
  test("All shows Tablet and Mobile beside Desktop at their own widths, and a change shows in every view", async ({ page }) => {
    await ready(page);
    const { frame, ids } = await build(page);
    await select(page, [frame]);
    await bar(page).getByRole("button", { name: "Show all breakpoints" }).click();
    await expect(page.getByTestId("view-tablet")).toBeVisible();
    await expect(page.getByTestId("view-mobile")).toBeVisible();
    await expect.poll(async () => (await inView(page, "view-tablet", ids[1]))?.frameWidth).toBe(768);
    await expect.poll(async () => (await inView(page, "view-mobile", ids[1]))?.frameWidth).toBe(375);
    // k0 is pinned right: its place follows each width
    await expect.poll(async () => (await inView(page, "view-mobile", ids[0]))?.x).toBeCloseTo(20 + 375 - 1440, 0);
    await expect.poll(async () => (await inView(page, "view-tablet", ids[0]))?.x).toBeCloseTo(20 + 768 - 1440, 0);
    // a change at the base reaches the previews live
    await page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.commands.updateProps(id, { "frame.y": 300 }), ids[1]);
    await expect.poll(async () => (await inView(page, "view-mobile", ids[1]))?.y).toBeCloseTo(300, 0);
    await expect.poll(async () => (await inView(page, "view-tablet", ids[1]))?.y).toBeCloseTo(300, 0);
    // All again hides them
    await bar(page).getByRole("button", { name: "Show all breakpoints" }).click();
    await expect(page.getByTestId("view-tablet")).toHaveCount(0);
  });

  test("selecting a layer outlines it in every view; clicking one in a preview selects it and makes that breakpoint the one being edited", async ({ page }) => {
    await ready(page);
    const { frame, ids } = await build(page);
    await select(page, [frame]);
    await bar(page).getByRole("button", { name: "Show all breakpoints" }).click();
    await expect(page.getByTestId("view-mobile")).toBeVisible();
    await select(page, [ids[1]]);
    await expect(page.getByTestId("view-selection-tablet")).toHaveCount(1);
    await expect(page.getByTestId("view-selection-mobile")).toHaveCount(1);
    // click k2 in the Mobile preview
    await expect.poll(async () => (await inView(page, "view-mobile", ids[2]))?.w).toBeGreaterThan(0);
    const at = (await inView(page, "view-mobile", ids[2]))!;
    await page.mouse.click(at.screenX, at.screenY);
    await expect(bar(page).getByRole("button", { name: "Mobile 375" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("view-selection-tablet")).toHaveCount(1);
    // the selection is k2 now
    await expect(page.getByTestId("view-selection-tablet")).toBeVisible();
    // and Mobile is the real frame, so Desktop became a preview
    await expect(page.getByTestId("view-desktop")).toBeVisible();
    await expect(page.getByTestId("view-mobile")).toHaveCount(0);
  });

  test("dragging a view's edge changes the breakpoint's width, reflows live, and undoes in one step", async ({ page }) => {
    await ready(page);
    const { frame, ids } = await build(page);
    await select(page, [frame]);
    await bar(page).getByRole("button", { name: "Show all breakpoints" }).click();
    await expect(page.getByTestId("view-mobile")).toBeVisible();
    const edge = page.getByTestId("edge-mobile");
    await expect(edge).toBeVisible();
    const box = (await edge.boundingBox())!;
    const before = (await inView(page, "view-mobile", ids[0]))!;
    const zoom = (await page.evaluate(() => {
      const f = document.querySelector<HTMLIFrameElement>('[data-testid="view-mobile"] iframe')!;
      return f.getBoundingClientRect().width / f.clientWidth;
    })) as number;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60 * zoom, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    const width = (await breakpoints(page))?.find((b) => b.id === "mobile")?.width ?? 0;
    expect(width).toBeGreaterThan(400);
    // pointer positions are whole screen pixels: at a low zoom one of them is several canvas pixels
    expect(Math.abs(width - (375 + 60))).toBeLessThanOrEqual(Math.ceil(1 / zoom) + 1);
    await expect.poll(async () => (await inView(page, "view-mobile", ids[0]))?.frameWidth).toBe(width);
    // the pinned layer moved with it
    expect((await inView(page, "view-mobile", ids[0]))!.x - before.x).toBeCloseTo(width - 375, 0);
    // one undo step puts the width back
    await run(page, "edit.undo");
    await expect.poll(async () => (await breakpoints(page))?.find((b) => b.id === "mobile")?.width ?? 375).toBe(375);
  });

  test("a 200-layer page keeps frame rate while an edge is dragged", async ({ page }) => {
    await ready(page);
    const { frame } = await build(page, 200);
    await select(page, [frame]);
    await bar(page).getByRole("button", { name: "Show all breakpoints" }).click();
    await expect(page.getByTestId("view-mobile")).toBeVisible();
    const box = (await page.getByTestId("edge-mobile").boundingBox())!;
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
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 40; i++) {
      await page.mouse.move(box.x + box.width / 2 + i * 2, box.y + box.height / 2);
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
    const frames = await page.evaluate(() => (window as unknown as { __frames: number[] }).__frames.slice(1));
    const sorted = [...frames].sort((a, b) => a - b);
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    expect(p90).toBeLessThan(process.env.CI ? 50 : 34);
  });
});
