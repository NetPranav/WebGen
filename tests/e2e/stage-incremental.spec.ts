/**
 * ROADMAP Phase 19 gate, measured in the real stage with 500 layers (the dev page /editor/stage-lab):
 * 500 layers mount inside 500 ms; editing one layer re-renders no other layer; renderer.measure()
 * agrees with the DOM within 0.5 px, in document space, and follows layout changes.
 */
import { test, expect, type Page } from "@playwright/test";

const STAGE = 'iframe[title="Stage"]';

/** Opens the lab with render counting and the renderer's test seam on, and the 500 layers loaded. */
async function openLab(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __LL_TEST__: boolean }).__LL_TEST__ = true;
    (window as unknown as { __LL_RENDER_STATS__: Record<string, number> }).__LL_RENDER_STATS__ = {};
  });
  await page.goto("/editor/stage-lab", { waitUntil: "domcontentloaded" });
  await page.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.getElementById("stage-root"), STAGE, { timeout: 45_000 });
  await page.getByRole("button", { name: "Load 500 layers" }).click();
  await page.waitForFunction((sel) => (document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelectorAll('[data-element-id^="lab_"]').length ?? 0) >= 500, STAGE, { timeout: 45_000 });
}

const stats = (page: Page) => page.evaluate(() => ({ ...(window as unknown as { __LL_RENDER_STATS__: Record<string, number> }).__LL_RENDER_STATS__ }));
const resetStats = (page: Page) => page.getByRole("button", { name: "Reset render counts" }).click();
const frameText = (page: Page, id: string) => page.evaluate(({ sel, id }) => document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelector(`[data-element-id="${id}"]`)?.textContent ?? null, { sel: STAGE, id });

test("Phase 19: 500 layers mount in under 500 ms", async ({ page }) => {
  await openLab(page);
  const text = (await page.getByTestId("mount-ms").textContent()) ?? "";
  const ms = Number(/([\d.]+) ms/.exec(text)?.[1]);
  test.info().annotations.push({ type: "500-layer mount ms", description: String(ms) });
  expect(ms, text).toBeLessThan(500);
});

test("Phase 19: editing one layer re-renders no other layer", async ({ page }) => {
  await openLab(page);
  await resetStats(page);
  await page.getByRole("button", { name: "Edit one layer" }).click();
  await expect.poll(() => frameText(page, "lab_250")).toMatch(/^Edited /);
  await page.waitForTimeout(100); // let any stray re-render land before counting

  const counts = await stats(page);
  expect(Object.keys(counts), "only the edited layer rendered").toEqual(["lab_250"]);
  expect(counts.lab_250).toBe(1);
});

test("Phase 19: adding or removing a layer re-renders its parent and nobody else", async ({ page }) => {
  await openLab(page);
  await resetStats(page);
  await page.getByRole("button", { name: "Add one layer" }).click();
  await expect.poll(() => frameText(page, "lab_new")).toBe("New layer");
  await page.waitForTimeout(100);
  const added = await stats(page);
  expect(Object.keys(added).sort(), "the new layer and its parent").toEqual(["el_root_container", "lab_new"]);

  await resetStats(page);
  await page.getByRole("button", { name: "Remove one layer" }).click();
  await expect.poll(() => frameText(page, "lab_100")).toBeNull();
  await page.waitForTimeout(100);
  expect(Object.keys(await stats(page)), "only the parent re-rendered").toEqual(["el_root_container"]);
});

test("Phase 19: the registry holds an element for every layer drawn", async ({ page }) => {
  await openLab(page);
  const registered = await page.evaluate(() => {
    const renderer = (window as unknown as { __LL_STAGE__: { registry: { size: number; has: (id: string) => boolean; get: (id: string) => Element | undefined } } }).__LL_STAGE__;
    const el = renderer.registry.get("lab_007");
    return { size: renderer.registry.size, has: renderer.registry.has("lab_499"), isInFrame: !!el && el.getAttribute("data-element-id") === "lab_007" && el.ownerDocument !== document };
  });
  expect(registered.size, "500 layers and the root").toBeGreaterThanOrEqual(501);
  expect(registered.has).toBe(true);
  expect(registered.isInFrame, "the registered element is the one in the stage frame").toBe(true);

  await page.getByRole("button", { name: "Remove one layer" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __LL_STAGE__: { registry: { has: (id: string) => boolean } } }).__LL_STAGE__.registry.has("lab_100"))).toBe(false);
});

/** Document-space rectangles measured by the renderer vs read straight from the DOM, for the same layers. */
async function compare(page: Page, ids: string[]) {
  return page.evaluate(
    async ({ ids, sel }) => {
      const renderer = (window as unknown as { __LL_STAGE__: { measure: (ids: string[]) => Promise<({ id: string; x: number; y: number; width: number; height: number } | null)[]> } }).__LL_STAGE__;
      const frame = document.querySelector<HTMLIFrameElement>(sel)!;
      const measured = await renderer.measure(ids);
      const win = frame.contentWindow!;
      return ids.map((id, i) => {
        const dom = frame.contentDocument!.querySelector(`[data-element-id="${id}"]`)!.getBoundingClientRect();
        const m = measured[i]!;
        return {
          id,
          dx: Math.abs(m.x - (dom.left + win.scrollX)),
          dy: Math.abs(m.y - (dom.top + win.scrollY)),
          dw: Math.abs(m.width - dom.width),
          dh: Math.abs(m.height - dom.height),
        };
      });
    },
    { ids, sel: STAGE },
  );
}

test("Phase 19: measure() matches the DOM within 0.5 px, in document space, and follows layout", async ({ page }) => {
  await openLab(page);
  const ids = ["el_root_container", "lab_000", "lab_007", "lab_250", "lab_499"];
  const worst = (rows: Awaited<ReturnType<typeof compare>>) => Math.max(...rows.flatMap((r) => [r.dx, r.dy, r.dw, r.dh]));

  expect(worst(await compare(page, ids)), "initial layout").toBeLessThanOrEqual(0.5);

  // Scrolling the frame moves every client rectangle but not a document-space one.
  const before = await page.evaluate(async (sel) => {
    const renderer = (window as unknown as { __LL_STAGE__: { measure: (ids: string[]) => Promise<({ y: number } | null)[]> } }).__LL_STAGE__;
    const r = await renderer.measure(["lab_400"]);
    document.querySelector<HTMLIFrameElement>(sel)!.contentWindow!.scrollTo(0, 700);
    const after = await renderer.measure(["lab_400"]);
    return { before: r[0]!.y, after: after[0]!.y, scrolled: document.querySelector<HTMLIFrameElement>(sel)!.contentWindow!.scrollY };
  }, STAGE);
  expect(before.scrolled, "the frame scrolled").toBeGreaterThan(0);
  expect(Math.abs(before.after - before.before), "document-space y is unchanged by scrolling").toBeLessThanOrEqual(0.5);
  expect(worst(await compare(page, ids)), "after scrolling").toBeLessThanOrEqual(0.5);

  // Adding a layer above pushes the rest down by one row without resizing them: the cache must notice.
  const y0 = (await page.evaluate(() => (window as unknown as { __LL_STAGE__: { measureNow: (ids: string[]) => ({ y: number } | null)[] } }).__LL_STAGE__.measureNow(["lab_499"])[0]!.y));
  await page.getByRole("button", { name: "Remove one layer" }).click(); // lab_100 leaves: everything below moves up
  await expect.poll(() => frameText(page, "lab_100")).toBeNull();
  const rows = await compare(page, ids);
  expect(worst(rows), "after a layout shift").toBeLessThanOrEqual(0.5);
  const y1 = (await page.evaluate(() => (window as unknown as { __LL_STAGE__: { measureNow: (ids: string[]) => ({ y: number } | null)[] } }).__LL_STAGE__.measureNow(["lab_499"])[0]!.y));
  expect(y1, "lab_499 moved up when a layer above it was removed").toBeLessThan(y0);
});

test("Phase 19: measure() batches many callers into one answer per frame", async ({ page }) => {
  await openLab(page);
  const result = await page.evaluate(async () => {
    const renderer = (window as unknown as { __LL_STAGE__: { passes: number; measure: (ids: string[]) => Promise<unknown[]> } }).__LL_STAGE__;
    const before = renderer.passes;
    await Promise.all(Array.from({ length: 100 }, (_, i) => renderer.measure([`lab_${String(i).padStart(3, "0")}`])));
    return renderer.passes - before;
  });
  expect(result, "100 calls in one frame cost one read pass").toBe(1);
});
