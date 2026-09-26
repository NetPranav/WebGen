/**
 * ROADMAP Phase 46 Verification Gate (browser half): "The migration leaves
 * the demo project visually identical (Playwright)."
 *
 * `fixtures/showcase-v4.lazy.json` is the showcase demo exactly as the
 * pre-composition editor (schema v4) exported it — generated from `main` at
 * 965ba29 with that commit's own `createShowcaseSnapshot` + `serializeLazyFile`,
 * not reconstructed. Importing it runs the v4 → v5 migration in the browser;
 * the result must be the same document as the demo created natively in v5
 * (which has its main composition) and render pixel-identically to it.
 */
import { test, expect } from "@playwright/test";
import { canonical, diffPixels, exportProject, openEditor, stageShot, waitSaved } from "./support/editor";

const FIXTURE = "tests/e2e/fixtures/showcase-v4.lazy.json";

test("Phase 46: a v4 project migrates to v5 and renders identically to the native v5 demo", async ({ page }, testInfo) => {
  const outDir = testInfo.outputPath();

  await openEditor(page);
  await page.getByRole("button", { name: /Mount Showcase Demo/ }).click();
  await waitSaved(page);
  const native = await exportProject(page, outDir, "native-v5");
  const nativeShot = await stageShot(page, outDir, "native-v5");

  await page.getByRole("button", { name: "File", exact: true }).click();
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByText("Import Project File...").click()]);
  const before = page.url();
  await chooser.setFiles(FIXTURE);
  await page.waitForFunction((oldUrl) => location.href !== oldUrl, before);
  await waitSaved(page);
  const migrated = await exportProject(page, outDir, "migrated-from-v4");
  const migratedShot = await stageShot(page, outDir, "migrated-from-v4");

  const doc = migrated.file.snapshot.document as { schemaVersion: number; compositions: Record<string, { kind: string }> };
  expect(doc.schemaVersion).toBe(5);
  expect(doc.compositions.comp_main?.kind, "the migration adds the main composition").toBe("main");
  expect(canonical(doc), "the migrated v4 demo is the same document as the native v5 demo").toBe(canonical(native.file.snapshot.document));

  const { n, note } = diffPixels(nativeShot, migratedShot, `${outDir}/stage-diff.png`);
  for (const name of ["native-v5", "migrated-from-v4", "stage-diff"]) {
    await testInfo.attach(name, { path: `${outDir}/${name}.png`, contentType: "image/png" });
  }
  expect(n, `migrated demo renders pixel-identically to the native one: ${note}`).toBe(0);
});
