/**
 * ROADMAP Phase 17 gate: "the gallery renders every archetype identically in 3 browsers".
 * Pixel baselines differ by operating system and font rasteriser, so what is compared across
 * Chromium, Firefox and WebKit is what must not differ: every case's drawn size where its geometry
 * fixes it, how the cases are tagged, that nothing overflows, and that nothing from a hostile
 * case ran or loaded.
 */
import { test, expect } from "@playwright/test";

test("Phase 17: every archetype is drawn, at the size its geometry says, in every browser", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/editor/render-gallery", { waitUntil: "networkidle" });
  await expect(page.getByRole("main", { name: "Render gallery" })).toBeVisible();

  const report = await page.evaluate(() => {
    const out: { id: string; archetype: string; drawn: boolean; width: number; height: number; expectW: number | null; expectH: number | null }[] = [];
    for (const cell of Array.from(document.querySelectorAll<HTMLElement>("[data-gallery-case]"))) {
      const id = cell.dataset.galleryCase!;
      const el = cell.querySelector<HTMLElement | SVGElement>(`[data-element-id="gallery_${id}"]`);
      const box = el?.getBoundingClientRect();
      out.push({
        id,
        archetype: cell.dataset.archetype!,
        drawn: !!el,
        width: box?.width ?? 0,
        height: box?.height ?? 0,
        expectW: cell.dataset.expectWidth ? Number(cell.dataset.expectWidth) : null,
        expectH: cell.dataset.expectHeight ? Number(cell.dataset.expectHeight) : null,
      });
    }
    return out;
  });

  expect(report.length, "the gallery has its cases").toBeGreaterThanOrEqual(45);
  for (const r of report) expect(r.drawn, `${r.id} (${r.archetype}) is drawn`).toBe(true);
  for (const r of report) {
    if (r.expectW !== null) expect(Math.abs(r.width - r.expectW), `${r.id} width ${r.width} vs ${r.expectW}`).toBeLessThanOrEqual(1);
    if (r.expectH !== null && r.expectH > 0) expect(Math.abs(r.height - r.expectH), `${r.id} height ${r.height} vs ${r.expectH}`).toBeLessThanOrEqual(1);
  }
  expect(errors, "no page errors").toEqual([]);
});

test("Phase 17: nothing from a hostile case runs, loads or overflows its cell", async ({ page }) => {
  await page.goto("/editor/render-gallery", { waitUntil: "networkidle" });
  expect(await page.title(), "the onerror payload did not run").toBe("Render gallery | LazyLayout");

  const hostile = page.locator('[data-gallery-case="text-hostile"]');
  await expect(hostile).toContainText('<img src=x onerror=');
  expect(await hostile.locator("img").count(), "hostile text made no <img>").toBe(0);

  const blocked = page.locator('[data-gallery-case="image-blocked"]');
  expect(await blocked.locator("img").count(), "a javascript: source loaded nothing").toBe(0);
  await expect(blocked).toContainText("Blocked source");

  const overflowing = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("[data-gallery-case]"))
      .filter((cell) => cell.scrollWidth > cell.clientWidth + 1)
      .map((cell) => cell.dataset.galleryCase),
  );
  expect(overflowing, "no case spills out of its cell").toEqual([]);
});

test("Phase 17: layout cases lay out the same way in every browser", async ({ page }) => {
  await page.goto("/editor/render-gallery", { waitUntil: "networkidle" });
  const rect = (id: string) => page.locator(`[data-element-id="gallery_${id}"]`).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });

  // A row container: the fixed badge keeps its size and the fill child takes the rest of the row.
  const row = await rect("container-row");
  const fixed = await rect("container-row-fixed");
  const fill = await rect("container-row-fill");
  expect(row.w).toBeCloseTo(320, 0);
  expect(fill.x, "the fill child starts after the fixed one").toBeGreaterThan(fixed.x + fixed.w - 1);
  expect(fill.x + fill.w, "and reaches the container's padded right edge").toBeCloseTo(row.x + row.w - 8, 0);

  // A column container stacks its children top to bottom.
  const a = await rect("container-a");
  const b = await rect("container-b");
  const c = await rect("container-c");
  expect(b.y).toBeGreaterThan(a.y);
  expect(c.y).toBeGreaterThan(b.y);

  // An absolute child sits at its frame.x/y inside the container (rotation moves only its corners).
  const holder = await rect("container-absolute");
  const child = await rect("container-absolute-child");
  expect(child.x + child.w / 2, "child centre x = frame.x + width / 2").toBeCloseTo(holder.x + 40 + 40, 0);
  expect(child.y + child.h / 2, "child centre y = frame.y + height / 2").toBeCloseTo(holder.y + 30 + 20, 0);
});
