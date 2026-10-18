/**
 * ROADMAP Phase 54 — "a transport bar (play, pause, timecode, loop) that
 * controls the whole studio". The bar drives the one transport store; the
 * Sequencer joins it in Phase 56.
 */
import { test, expect } from "@playwright/test";
import { openEditor } from "./support/editor";

test("Phase 54: the transport bar plays, steps frames and cycles the loop mode", async ({ page }) => {
  await openEditor(page);
  const bar = page.getByRole("group", { name: "Transport" });
  const timecode = bar.getByLabel("Timecode");
  await expect(bar).toBeVisible();
  await expect(timecode).toContainText("00:00:00");

  await bar.getByRole("button", { name: "Step forward one frame" }).click();
  await expect(timecode).toContainText("00:00:01");

  await bar.getByRole("button", { name: "Play" }).click();
  await expect(bar.getByRole("button", { name: "Pause" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await timecode.textContent()) ?? "", { timeout: 3000 }).not.toMatch(/^00:00:0[01] /);
  await bar.getByRole("button", { name: "Pause" }).click();
  await expect(bar.getByRole("button", { name: "Play" })).toBeVisible();

  await bar.getByRole("button", { name: "Stop and return to start" }).click();
  await expect(timecode).toContainText("00:00:00");

  await bar.getByRole("button", { name: "Loop: off" }).click();
  await expect(bar.getByRole("button", { name: "Loop: on" })).toBeVisible();
  await bar.getByRole("button", { name: "Loop: on" }).click();
  await expect(bar.getByRole("button", { name: "Loop: ping-pong" })).toBeVisible();
});
