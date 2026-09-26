/**
 * ROADMAP Phase 42 Verification Gate (browser half): "A Playwright screenshot
 * of the migrated demo project matches the pre-migration one."
 *
 * `fixtures/showcase-v2.lazy.json` is the showcase demo exactly as the
 * pre-migration editor (schema v2, legacy prop names) exported it — generated
 * from `main` at fc89e4f with that commit's own `createShowcaseSnapshot` +
 * `serializeLazyFile`, not reconstructed. Importing it runs the v2 → v3
 * migration in the browser; the result must render pixel-identically to the
 * demo created natively in v3, and be the same document.
 */
import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { canonical, exportProject, openEditor, waitSaved } from "./support/editor";

const FIXTURE = "tests/e2e/fixtures/showcase-v2.lazy.json";

async function stageShot(page: import("@playwright/test").Page, outDir: string, label: string) {
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

function diffPixels(a: Buffer, b: Buffer, outPath: string) {
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

test("Phase 42: a v2 project migrates to v3 and renders identically to the native v3 demo", async ({ page }, testInfo) => {
  const outDir = testInfo.outputPath();

  // Native v3: mount the showcase demo in a fresh project.
  await openEditor(page);
  await page.getByRole("button", { name: /Mount Showcase Demo/ }).click();
  await waitSaved(page);
  const native = await exportProject(page, outDir, "native-v3");
  const nativeShot = await stageShot(page, outDir, "native-v3");

  // Pre-migration file: import it (migration runs in the browser).
  await page.getByRole("button", { name: "File", exact: true }).click();
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByText("Import Project File...").click()]);
  const before = page.url();
  await chooser.setFiles(FIXTURE);
  await page.waitForFunction((oldUrl) => location.href !== oldUrl, before);
  await waitSaved(page);
  const migrated = await exportProject(page, outDir, "migrated-from-v2");
  const migratedShot = await stageShot(page, outDir, "migrated-from-v2");

  const doc = migrated.file.snapshot.document as { schemaVersion: number; layers: Record<string, { properties: Record<string, unknown> }> };
  expect(doc.schemaVersion).toBe(4); // v2 → v3 (Phase 42) → v4 (Phase 7): imports migrate to the current schema
  for (const layer of Object.values(doc.layers)) {
    for (const key of Object.keys(layer.properties)) expect(key, "every prop key is a canonical dot-path").toContain(".");
  }
  expect(canonical(doc), "the migrated v2 demo is the same document as the native v3 demo").toBe(
    canonical(native.file.snapshot.document)
  );

  const { n, note } = diffPixels(nativeShot, migratedShot, `${outDir}/stage-diff.png`);
  for (const name of ["native-v3", "migrated-from-v2", "stage-diff"]) {
    await testInfo.attach(name, { path: `${outDir}/${name}.png`, contentType: "image/png" });
  }
  expect(n, `migrated demo renders pixel-identically to the native one: ${note}`).toBe(0);
});
