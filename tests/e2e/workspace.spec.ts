/**
 * ROADMAP Phase 14 gate: the panel layout you arrange survives a reload; the
 * stage node is the same object across resizes; panels that aren't in the
 * layout are never loaded.
 */
import { test, expect, type Page } from "@playwright/test";
import { openEditor } from "./support/editor";

const rightZone = (page: Page) => page.locator(".dock-zone--right");
const loadedPanels = async (page: Page) => ((await page.locator(".dock-layout").getAttribute("data-loaded-panels")) ?? "").split(" ").filter(Boolean);

/** Drags the splitter in front of the right dock to the left by `dx` px (wider dock). */
async function dragRightSplitter(page: Page, dx: number) {
  const splitter = page.locator(".dock-splitter--vertical").last();
  const box = await splitter.boundingBox();
  if (!box) throw new Error("right splitter not found");
  const x = box.x + box.width / 2;
  const y = box.y + 40; // near the top, clear of the bottom drawer that overlaps the lower part
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x - (dx * i) / 8, y);
  await page.mouse.up();
}

test("Phase 14: an arranged layout (preset, tab, dock width) survives a reload", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("tab", { name: /Animate/ }).click();
  await expect(page.getByRole("tab", { name: /Animate/ })).toHaveAttribute("aria-selected", "true");

  const before = (await rightZone(page).boundingBox())!.width;
  await dragRightSplitter(page, 60);
  const resized = (await rightZone(page).boundingBox())!.width;
  expect(resized, "dragging the splitter widened the right dock").toBeGreaterThan(before + 30);

  await page.waitForTimeout(600); // the layout is saved 300 ms after the last change
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => new URL(location.href).searchParams.has("projectId"));

  await expect(page.getByRole("tab", { name: /Animate/ })).toHaveAttribute("aria-selected", "true");
  await expect.poll(async () => (await rightZone(page).boundingBox())!.width).toBeGreaterThan(resized - 4);
  expect((await rightZone(page).boundingBox())!.width).toBeLessThan(resized + 4);
});

test("Phase 14: the stage node is the same object across resizes and preset switches", async ({ page }) => {
  await openEditor(page);
  const stage = page.locator(".dock-zone--center").first();
  await stage.evaluate((el) => ((el as unknown as { __stageMarker: string }).__stageMarker = "same-node"));

  await dragRightSplitter(page, 40);
  await page.getByRole("tab", { name: /Design/ }).click();
  await page.getByRole("tab", { name: /Animate/ }).click();
  await page.getByRole("tab", { name: /Full Studio/ }).click();
  await page.setViewportSize({ width: 1100, height: 700 });
  await page.setViewportSize({ width: 1400, height: 900 });

  const survived = await page.evaluate(() => {
    const el = document.querySelector(".dock-zone--center") as (HTMLElement & { __stageMarker?: string }) | null;
    return { connected: !!el?.isConnected, marker: el?.__stageMarker };
  });
  expect(survived, "the stage element was never replaced").toEqual({ connected: true, marker: "same-node" });
});

test("Phase 14: panels outside the layout are not loaded until they are shown", async ({ page }) => {
  await openEditor(page);
  const initial = await loadedPanels(page);
  expect(initial, "the stage, Details and the Content Browser are in the default layout").toEqual(
    expect.arrayContaining(["center:viewport", "right:details", "bottom:content-browser"]),
  );
  for (const absent of ["bottom:sequencer", "bottom:curves", "bottom:export-code", "fullpage:history", "fullpage:code", "right:console"]) {
    expect(initial, `${absent} must not be loaded on first paint`).not.toContain(absent);
  }

  await page.getByRole("button", { name: "Motion Sequencer" }).click();
  await expect.poll(() => loadedPanels(page)).toContain("bottom:sequencer");
});
