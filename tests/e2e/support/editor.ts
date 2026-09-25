/**
 * Shared helpers for driving the real editor UI in Playwright, factored out
 * of `phase3-persistence.mjs` (ROADMAP Phase 4.1: "Phase 4 moves this into
 * the Playwright test harness").
 */
import type { Download, Page } from "@playwright/test";
import { readFileSync } from "node:fs";

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
  await page.locator(".studio-header").first().click({ position: { x: 700, y: 10 } });
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
