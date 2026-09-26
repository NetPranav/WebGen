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
import { canonical, diffPixels, exportProject, openEditor, stageShot, waitSaved } from "./support/editor";

const FIXTURE = "tests/e2e/fixtures/showcase-v2.lazy.json";

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
  expect(doc.schemaVersion).toBe(5); // v2 → v3 (Phase 42) → v4 (Phase 7) → v5 (Phase 46): imports migrate to the current schema
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
