/**
 * ROADMAP Phase 3 Verification Gate, moved into the Playwright harness per
 * Phase 4.1 (was `tests/e2e/phase3-persistence.mjs`, run by hand with a
 * `PW_DIR` environment variable). Same checks, same real UI, now runs as
 * part of `npm run test:e2e` on Chromium, Firefox and WebKit via
 * `playwright.config.ts`.
 *
 * Checks, per browser:
 *   A. New project → 20 edits (Sequencer "+ Keyframe") → reload → the live
 *      state is identical (compared through File → Export Project File,
 *      which serialises the in-memory project) → Cmd/Ctrl+Z ×20 → the
 *      blank start.
 *   B. The exported .lazy.json, imported in a fresh browser profile (File →
 *      Import), renders pixel-identically to the original (canvas +
 *      timeline). Playwright gives every test its own context, so "fresh
 *      profile" is just "a different test".
 *   C. Dropping the file on the window also opens it.
 *   D. (Chromium) Crash recovery: an edit, then the renderer is killed
 *      before autosave → the next load offers "Restore unsaved changes?" →
 *      Restore brings the edit back.
 *   E. A drag is one undo step.
 */
import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { canonical, comparable, exportProject, focusApp, openEditor, openSequencer, waitSaved } from "./support/editor";

const EDITS = 20;

function shot(page: import("@playwright/test").Page, outDir: string, label: string) {
  return (async () => {
    await page.mouse.move(5, 995); // no hover states
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.waitForTimeout(600);
    const center = await page.locator(".dock-zone--center").first().screenshot();
    const bottom = await page.locator(".dock-zone--bottom").first().screenshot();
    writeFileSync(`${outDir}/${label}-center.png`, center);
    writeFileSync(`${outDir}/${label}-bottom.png`, bottom);
    return { center, bottom };
  })();
}

function diffRatio(a: Buffer, b: Buffer, outPath: string) {
  const A = PNG.sync.read(a);
  const B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) {
    return { ratio: 1, note: `size ${A.width}x${A.height} vs ${B.width}x${B.height}` };
  }
  const diff = new PNG({ width: A.width, height: A.height });
  const n = pixelmatch(A.data, B.data, diff.data, A.width, A.height, { threshold: 0 });
  writeFileSync(outPath, PNG.sync.write(diff));
  return { ratio: n / (A.width * A.height), note: `${n} px differ` };
}

/** Shared across A → B → C so B/C can consume A's export; must not run out of order or in parallel. */
let editedPath: string;
let editedFile: { snapshot: { document: unknown } };
let referenceShot: { center: Buffer; bottom: Buffer };

test.describe.serial("Phase 3: store, history & persistence", () => {
  test("A. 20 edits persist across reload; 20 undos return to blank", async ({ page }, testInfo) => {
    const outDir = testInfo.outputPath();
    await openEditor(page);
    const url = page.url();
    const blank = await exportProject(page, outDir, "blank");

    await openSequencer(page);
    const addKeyframe = page.getByTitle("Add keyframe at current playhead position");
    for (let i = 0; i < EDITS; i++) await addKeyframe.click();
    await waitSaved(page);
    const edited = await exportProject(page, outDir, "edited");
    const clips = Object.values(edited.file.snapshot.document.clips) as { tracks: { keyframes: unknown[] }[] }[];
    const keyframeCount = clips.flatMap((c) => c.tracks).reduce((n, t) => n + t.keyframes.length, 0);
    expect(clips.length, "edits land in exactly one clip").toBe(1);
    expect(keyframeCount, "at least EDITS keyframes recorded").toBeGreaterThanOrEqual(EDITS);

    await page.reload({ waitUntil: "networkidle" });
    await waitSaved(page);
    expect(page.url(), "reload keeps the same project").toBe(url);
    const reloaded = await exportProject(page, outDir, "reloaded");
    expect(comparable(reloaded.file), "state after reload is identical").toBe(comparable(edited.file));

    // Reference render for Case B: the original project with fresh UI state (no leftover selection).
    await openSequencer(page);
    referenceShot = await shot(page, outDir, "A-reloaded");

    await focusApp(page);
    const undoKey = testInfo.project.name === "webkit" ? "Meta+z" : "Control+z";
    for (let i = 0; i < EDITS; i++) await page.keyboard.press(undoKey);
    await waitSaved(page);
    const undone = await exportProject(page, outDir, "undone");
    expect(canonical(undone.file.snapshot.document), `${EDITS} undos return to the blank start`).toBe(
      canonical(blank.file.snapshot.document)
    );

    editedPath = edited.path;
    editedFile = edited.file;
  });

  test("B. import in a fresh profile restores the document and renders identically", async ({ page }, testInfo) => {
    test.skip(!editedPath, "depends on Case A's export");
    const outDir = testInfo.outputPath();
    await openEditor(page); // fresh context: empty IndexedDB and localStorage
    await page.getByRole("button", { name: "File", exact: true }).click();
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByText("Import Project File...").click(),
    ]);
    await chooser.setFiles(editedPath);
    await page.waitForFunction((oldUrl) => location.href !== oldUrl, page.url());
    await waitSaved(page);
    await openSequencer(page);
    const imported = await exportProject(page, outDir, "imported");
    expect(canonical(imported.file.snapshot.document), "import restores the document").toBe(
      canonical(editedFile.snapshot.document)
    );

    const after = await shot(page, outDir, "B-imported");
    for (const region of ["center", "bottom"] as const) {
      const { ratio, note } = diffRatio(referenceShot[region], after[region], `${outDir}/B-${region}-diff.png`);
      expect(ratio, `imported project renders pixel-identically (${region}): ${note}`).toBeLessThanOrEqual(0);
    }
  });

  test("C. dropping a .lazy.json onto the window opens it", async ({ page }, testInfo) => {
    test.skip(!editedPath, "depends on Case A's export");
    const outDir = testInfo.outputPath();
    await openEditor(page);
    const startUrl = page.url();
    await page.evaluate(async (text) => {
      const dt = new DataTransfer();
      dt.items.add(new File([text], "dropped.lazy.json", { type: "application/json" }));
      window.dispatchEvent(new DragEvent("dragover", { dataTransfer: dt, bubbles: true, cancelable: true }));
      window.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
    }, readFileSync(editedPath, "utf8"));
    await page.waitForFunction((oldUrl) => location.href !== oldUrl, startUrl);
    await waitSaved(page);
    const dropped = await exportProject(page, outDir, "dropped-scratch");
    expect(canonical(dropped.file.snapshot.document)).toBe(canonical(editedFile.snapshot.document));
  });
});

test("D. crash recovery restores the last unsaved edit (Chromium only)", async ({ page, browserName }, testInfo) => {
  test.skip(browserName !== "chromium", "Page.crash is a Chromium CDP feature");
  const outDir = testInfo.outputPath();
  await openEditor(page);
  const projectUrl = page.url();
  await openSequencer(page);
  await page.getByTitle("Add keyframe at current playhead position").click();

  const cdp = await page.context().newCDPSession(page);
  // The renderer dies before the 400ms autosave. The command never answers once the page is gone.
  const crashed = page.waitForEvent("crash");
  void cdp.send("Page.crash").catch(() => {});
  await crashed;

  const again = await page.context().newPage();
  await again.goto(projectUrl, { waitUntil: "networkidle" });
  const prompt = again.getByRole("alertdialog");
  await prompt.waitFor({ timeout: 10_000 });
  await expect(prompt).toContainText("1 change");
  await again.getByRole("button", { name: "Restore" }).click();
  await waitSaved(again);

  const recovered = await exportProject(again, outDir, "chromium-recovered");
  const keyframes = Object.values(recovered.file.snapshot.document.clips as Record<string, { tracks: { keyframes: unknown[] }[] }>)
    .flatMap((c) => c.tracks)
    .reduce((n, t) => n + t.keyframes.length, 0);
  expect(keyframes, "Restore brings the lost edit back").toBeGreaterThanOrEqual(1);

  await again.reload({ waitUntil: "networkidle" });
  expect(await again.getByRole("alertdialog").count(), "no prompt after restoring").toBe(0);
});

test("E. dragging a keyframe is exactly one undo step", async ({ page }, testInfo) => {
  const outDir = testInfo.outputPath();
  await openEditor(page);
  await openSequencer(page);
  await page.getByTitle("Add keyframe at current playhead position").click();
  await waitSaved(page);
  const placed = await exportProject(page, outDir, "E-placed");

  const diamond = page.locator(".dock-zone--bottom [title*='@ 0.000s']").last();
  const box = await diamond.boundingBox();
  expect(box, "the new keyframe is visible in the DOM").not.toBeNull();
  if (!box) return;

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + box.width / 2 + i * 10, box.y + box.height / 2);
  await page.mouse.up();
  await waitSaved(page);

  const dragged = await exportProject(page, outDir, "E-dragged");
  const times = (f: { snapshot: { document: { clips: Record<string, { tracks: { keyframes: { time: number }[] }[] }> } } }) =>
    Object.values(f.snapshot.document.clips)
      .flatMap((c) => c.tracks)
      .flatMap((t) => t.keyframes.map((k) => k.time))
      .sort()
      .join(",");
  expect(times(dragged.file), "the drag moved a keyframe").not.toBe(times(placed.file));

  await focusApp(page);
  await page.keyboard.press(testInfo.project.name === "webkit" ? "Meta+z" : "Control+z");
  await waitSaved(page);
  const undone = await exportProject(page, outDir, "E-undone");
  expect(canonical(undone.file.snapshot.document), "one undo reverts the whole drag (and only the drag)").toBe(
    canonical(placed.file.snapshot.document)
  );
});
