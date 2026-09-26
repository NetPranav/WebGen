/**
 * ROADMAP Phase 8 Verification Gate: "The Playwright test 'try to add an
 * illegal animation' shows the disabled item with a reason."
 *
 * The showcase demo's root Container has Hover, Press and StateTransition
 * animations that are ⚠️ conditional (grammar §9.1, decision 0005): legal
 * only once the layer is explicitly promoted (`interactive: true`, §7.3.1).
 * Nothing in the demo promotes it, so the Content Browser's "Add Animation"
 * picker must show those as disabled with a reason, and refuse the add.
 */
import { test, expect } from "@playwright/test";
import { openEditor } from "./support/editor";

test("Phase 8: an illegal animation shows as disabled, with a reason, and can't be added", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: /Mount Showcase Demo/ }).click();
  await page.waitForTimeout(500);

  // Select the root Container by clicking empty canvas space (not the button/text layers on it).
  await page.mouse.click(650, 145);
  await page.waitForTimeout(300);

  await page.getByText("Content Browser", { exact: true }).first().click();
  await page.waitForTimeout(300);

  await page.locator(".eas-add-btn").first().click();
  await page.waitForTimeout(300);
  await page.getByText("Curated Presets", { exact: false }).first().click();
  await page.waitForTimeout(300);

  const blockedPreset = page.locator(".eas-preset-item--disabled").first();
  await expect(blockedPreset, "the picker must show at least one disabled (illegal) preset for this element").toHaveCount(1);
  await expect(blockedPreset.getByText("Blocked", { exact: true })).toBeVisible();

  const libraryCountBefore = await page.locator(".eas-preset-item").count();
  await blockedPreset.click();
  await page.waitForTimeout(300);

  // Refused: no new track was added, and a reason was surfaced somewhere in the panel/toast.
  const libraryCountAfter = await page.locator(".eas-preset-item").count();
  expect(libraryCountAfter, "clicking a blocked preset must not add a track").toBe(libraryCountBefore);

  const panelText = await page.locator("body").innerText();
  expect(panelText, "the refusal must state a reason, not fail silently").toMatch(/aren't allowed on|Grammar Block|Blocked by Grammar/);
});
