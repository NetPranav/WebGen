/**
 * Shared helpers for driving the real editor UI in Playwright, factored out
 * of `phase3-persistence.mjs` (ROADMAP Phase 4.1: "Phase 4 moves this into
 * the Playwright test harness").
 */
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import type { Download, Page } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

export async function openEditor(page: Page, url = "/editor") {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForFunction(() => new URL(location.href).searchParams.has("projectId"));
  await waitSaved(page);
}

/** The Save button shows a dot while changes are unsaved. */
export async function waitSaved(page: Page) {
  await page.waitForTimeout(150);
  await page.waitForFunction(() => !document.querySelector(".viewport-action-btn__dirty-dot"), null, {
    timeout: 15_000,
  });
}

/** Focus the app (not an input or the stage iframe) so shortcuts reach the window. */
export async function focusApp(page: Page) {
  await page.locator(".studio-header__brand").first().click();
}

export async function openFileMenu(page: Page) {
  await page.getByRole("button", { name: "File", exact: true }).click();
}

export async function openSequencer(page: Page) {
  await page.getByRole("button", { name: "Motion Sequencer" }).click();
  await page.waitForTimeout(300);
}

/** File → Export Project File; returns the parsed .lazy.json, saved under `outDir`. */
export async function exportProject(page: Page, outDir: string, label: string) {
  await openFileMenu(page);
  const [download]: [Download, unknown] = (await Promise.all([
    page.waitForEvent("download"),
    page.getByText("Export Project File (.lazy.json)").click(),
  ])) as [Download, unknown];
  const path = `${outDir}/${label}.lazy.json`;
  await download.saveAs(path);
  return { path, file: JSON.parse(readFileSync(path, "utf8")) };
}

/** JSON with sorted keys: key order carries no meaning (loading re-parses through the schema). */
export function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v
  );
}

/** The parts of an export that must match: the project data, without identity or timestamps. */
export function comparable(file: { snapshot: Record<string, unknown> }): string {
  const { projectId: _id, ...snapshot } = file.snapshot;
  void _id;
  return canonical(snapshot);
}

/** pixelsPerSecond in `MotionSequencer.tsx` — a fixed constant, not derived from the DOM. */
export const SEQUENCER_PIXELS_PER_SECOND = 280;

/** Click the ruler at an exact time, using the fixed px/s scale (an exact seek, no drag jitter). */
export async function seekRuler(page: Page, seconds: number) {
  const ruler = page.locator(".sequencer-ruler-wrap");
  const box = await ruler.boundingBox();
  if (!box) throw new Error("sequencer ruler not found — open the Motion Sequencer first");
  await ruler.click({ position: { x: Math.max(1, seconds * SEQUENCER_PIXELS_PER_SECOND), y: box.height / 2 } });
}

/** Screenshot of the stage (center dock) with editor-chrome animations removed. */
export async function stageShot(page: import("@playwright/test").Page, outDir: string, label: string) {
  await page.mouse.move(5, 995); // no hover states
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  // Editor chrome animates (the stage toolbar's pulsing "HOT RELOAD" / "SIMULATION ACTIVE" dots).
  // `animations: "disabled"` did not pin them on Linux Chromium in CI (9 px at the HOT RELOAD dot),
  // so remove animations and transitions outright: the comparison is about rendering the document.
  await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; transition: none !important; }" });
  await page.waitForTimeout(800);
  const png = await page.locator(".dock-zone--center").first().screenshot({ animations: "disabled" });
  writeFileSync(`${outDir}/${label}.png`, png);
  return png;
}

/** Pixel difference of two PNGs (threshold 0), with the bounding box of the differing pixels. */
export function diffPixels(a: Buffer, b: Buffer, outPath: string) {
  const A = PNG.sync.read(a);
  const B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return { n: Infinity, note: `size ${A.width}x${A.height} vs ${B.width}x${B.height}` };
  const diff = new PNG({ width: A.width, height: A.height });
  const n = pixelmatch(A.data, B.data, diff.data, A.width, A.height, { threshold: 0 });
  writeFileSync(outPath, PNG.sync.write(diff));
  // Bounding box of the differing pixels, so a CI failure says *where* without the images.
  let box = "";
  if (n > 0) {
    let [x0, y0, x1, y1] = [Infinity, Infinity, -1, -1];
    for (let y = 0; y < A.height; y++) {
      for (let x = 0; x < A.width; x++) {
        const i = (y * A.width + x) * 4;
        if (A.data[i] !== B.data[i] || A.data[i + 1] !== B.data[i + 1] || A.data[i + 2] !== B.data[i + 2] || A.data[i + 3] !== B.data[i + 3]) {
          x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        }
      }
    }
    box = ` within x ${x0}–${x1}, y ${y0}–${y1} of ${A.width}x${A.height}`;
  }
  return { n, note: `${n} px differ${box}` };
}
