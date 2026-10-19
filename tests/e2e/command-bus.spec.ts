/**
 * ROADMAP Phase 13 gate: "Edit and File menus and the toolbar's undo, redo and
 * save behave exactly like their shortcuts", plus the manual checks of v3 43
 * committed as a spec: Space plays over the timeline but not over the canvas,
 * Delete in the timeline removes one keyframe, and undo works from the palette.
 */
import { test, expect, type Page } from "@playwright/test";
import { exportProject, openEditor, openSequencer, seekRuler, waitSaved, focusApp } from "./support/editor";

const keyframeCount = async (page: Page, outDir: string, label: string) => {
  const { file } = await exportProject(page, outDir, label);
  const clips = Object.values(file.snapshot.document.clips) as { tracks: { keyframes: unknown[] }[] }[];
  return clips.flatMap((c) => c.tracks).reduce((n, t) => n + t.keyframes.length, 0);
};

const addKeyframe = (page: Page) => page.getByTitle("Add keyframe at current playhead position").click();

test("Phase 13: Edit > Undo and Redo run the same commands as their shortcuts", async ({ page }, testInfo) => {
  const outDir = testInfo.outputPath();
  await openEditor(page);
  await openSequencer(page);
  const before = await keyframeCount(page, outDir, "before");
  await addKeyframe(page);
  await waitSaved(page);
  const added = await keyframeCount(page, outDir, "added");
  expect(added, "adding a keyframe at the playhead changed the document").toBeGreaterThan(before);

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("menuitem", { name: /^Undo/ }).click();
  await waitSaved(page);
  expect(await keyframeCount(page, outDir, "undone"), "the Edit menu's Undo took the keyframe back").toBe(before);

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("menuitem", { name: /^Redo/ }).click();
  await waitSaved(page);
  expect(await keyframeCount(page, outDir, "redone"), "the Edit menu's Redo brought it back").toBe(added);
});

test("Phase 13: a menu item that isn't built yet is disabled and names its phase", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const cut = page.getByRole("menuitem", { name: /^Cut/ });
  await expect(cut).toBeDisabled();
  await expect(cut).toHaveAttribute("title", "Coming in Phase 29");
});

test("Phase 13: File > Save flushes the project through the command bus", async ({ page }) => {
  await openEditor(page);
  await openSequencer(page);
  await addKeyframe(page);
  await page.getByRole("button", { name: "File", exact: true }).click();
  await page.getByRole("menuitem", { name: /^Save Project/ }).click();
  await waitSaved(page); // the dirty dot clears once the save command has run
});

test("Phase 13: undo works from the command palette", async ({ page }, testInfo) => {
  const outDir = testInfo.outputPath();
  await openEditor(page);
  await openSequencer(page);
  const before = await keyframeCount(page, outDir, "before");
  await addKeyframe(page);
  await waitSaved(page);

  await focusApp(page);
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder(/Type a command/).fill("Undo");
  await page.keyboard.press("Enter");
  await waitSaved(page);
  expect(await keyframeCount(page, outDir, "undone")).toBe(before);
});

test("Phase 13: Space plays over the timeline and does not over the canvas", async ({ page }) => {
  await openEditor(page);
  await openSequencer(page);
  const bar = page.getByRole("group", { name: "Transport" });

  await page.locator(".dock-zone--center").first().hover();
  await page.keyboard.press("Space");
  await expect(bar.getByRole("button", { name: "Play" }), "Space over the canvas must not play").toBeVisible();

  await page.getByRole("region", { name: "Motion Sequencer Timeline" }).hover();
  await page.keyboard.press("Space");
  await expect(bar.getByRole("button", { name: "Pause" }), "Space over the timeline plays").toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Space");
  await expect(bar.getByRole("button", { name: "Play" })).toBeVisible();
});

test("Phase 13: Delete in the timeline removes exactly one keyframe", async ({ page }, testInfo) => {
  const outDir = testInfo.outputPath();
  await openEditor(page);
  await openSequencer(page);
  await addKeyframe(page);
  await seekRuler(page, 1);
  await addKeyframe(page);
  await waitSaved(page);
  const two = await keyframeCount(page, outDir, "two");

  await page.locator(".dock-zone--bottom [title*='@ 1.000s']").last().click();
  await page.getByRole("region", { name: "Motion Sequencer Timeline" }).hover();
  await page.keyboard.press("Delete");
  await waitSaved(page);
  expect(await keyframeCount(page, outDir, "one"), "Delete removed exactly one keyframe").toBe(two - 1);
});
