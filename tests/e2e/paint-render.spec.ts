/**
 * ROADMAP Phase 35 gate: "each paint type renders identically in 3 browsers (screenshot tests)". Every paint case
 * of the render gallery (solid, linear, radial, conic, stacked fills, dashed and dotted strokes, drop and inner
 * shadows, layer and background blur) is drawn in Chromium, Firefox and WebKit and compared, pixel by pixel with
 * a small tolerance for each engine's anti-aliasing, against one golden image per case (made in Chromium).
 *
 * To change a golden on purpose: `UPDATE_PAINT_GOLDENS=1 npx playwright test paint-render --project=chromium`.
 */
import { test, expect, type Page } from "@playwright/test";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GALLERY_CASES } from "../../src/core/render/gallery";

const GOLDEN_DIR = join(__dirname, "__golden__", "paint");
const CASES = GALLERY_CASES.filter((c) => c.id.startsWith("paint-"));

/** The share of pixels that may differ before the browsers are called different. Blur and dashes anti-alias more. */
const TOLERANCE: Record<string, number> = { default: 0.02, "paint-blur-layer": 0.05, "paint-blur-background": 0.05, "paint-shadow-drop": 0.04, "paint-shadow-inner": 0.04, "paint-shadow-box": 0.04, "paint-dashed": 0.05, "paint-dotted": 0.06 };

async function galleryFrame(page: Page) {
  await page.goto("/editor/render-gallery", { waitUntil: "domcontentloaded" });
  await page.getByRole("main", { name: "Render gallery" }).waitFor();
  await page.waitForFunction(() => !!document.querySelector<HTMLIFrameElement>('iframe[title="Render gallery frame"]')?.contentDocument?.querySelector('[data-gallery-case^="paint-"]'), undefined, { timeout: 45_000 });
  const frame = page.frames().find((f) => f.url().endsWith("/stage-frame.html"));
  if (!frame) throw new Error("the gallery frame did not load");
  await page.waitForTimeout(400);
  return frame;
}

async function shot(page: Page, frame: Awaited<ReturnType<typeof galleryFrame>>, id: string): Promise<Buffer> {
  const el = frame.locator(`[data-element-id="gallery_${id}"]`);
  await el.scrollIntoViewIfNeeded();
  const b = (await el.boundingBox())!;
  // whole pixels, and the same size in every browser (a fractional box would give each engine a different crop)
  const clip = { x: Math.max(0, Math.round(b.x) - 10), y: Math.max(0, Math.round(b.y) - 8), width: Math.round(b.width) + 28, height: Math.round(b.height) + 30 };
  return page.screenshot({ clip, animations: "disabled", scale: "css" }); // CSS pixels: Safari's profile renders at 2x
}

for (const c of CASES) {
  test(`Phase 35: ${c.label.replace("Paint: ", "")} renders the same in every browser`, async ({ page, browserName }, testInfo) => {
    const frame = await galleryFrame(page);
    const png = await shot(page, frame, c.id);
    const goldenPath = join(GOLDEN_DIR, `${c.id}.png`);

    if (process.env.UPDATE_PAINT_GOLDENS === "1") {
      expect(browserName, "goldens are made in Chromium").toBe("chromium");
      mkdirSync(GOLDEN_DIR, { recursive: true });
      writeFileSync(goldenPath, png);
      return;
    }
    expect(existsSync(goldenPath), `no golden for ${c.id}: run with UPDATE_PAINT_GOLDENS=1 in Chromium`).toBe(true);
    const golden = PNG.sync.read(readFileSync(goldenPath));
    const actual = PNG.sync.read(png);
    expect([actual.width, actual.height], "the same size as the golden").toEqual([golden.width, golden.height]);

    // the picture isn't blank
    const colours = new Set<number>();
    for (let i = 0; i < actual.data.length; i += 4 * 7) colours.add((actual.data[i] << 16) | (actual.data[i + 1] << 8) | actual.data[i + 2]);
    expect(colours.size, "something is drawn (more than the white page)").toBeGreaterThanOrEqual(2);

    const diff = new PNG({ width: golden.width, height: golden.height });
    const differing = pixelmatch(golden.data, actual.data, diff.data, golden.width, golden.height, { threshold: 0.25, includeAA: false });
    const ratio = differing / (golden.width * golden.height);
    testInfo.annotations.push({ type: "differing pixels", description: `${(ratio * 100).toFixed(2)}% (${browserName})` });
    if (ratio > (TOLERANCE[c.id] ?? TOLERANCE.default)) {
      writeFileSync(testInfo.outputPath(`${c.id}-${browserName}-actual.png`), png);
      writeFileSync(testInfo.outputPath(`${c.id}-${browserName}-diff.png`), PNG.sync.write(diff));
    }
    expect(ratio, `${c.id} in ${browserName} differs from the golden in ${(ratio * 100).toFixed(2)}% of its pixels`).toBeLessThanOrEqual(TOLERANCE[c.id] ?? TOLERANCE.default);
  });
}
