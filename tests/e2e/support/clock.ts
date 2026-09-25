/**
 * ROADMAP Phase 4.1 — deterministic time for browser tests.
 *
 * `page.clock` (Playwright's native Clock API) fakes `Date`, `setTimeout`,
 * `requestAnimationFrame` and `performance.now` for the whole context, so an
 * animation loop that reads `performance.now()` between rAF ticks — which is
 * exactly what the Sequencer's playback loop does today, pre-Phase-45 — runs
 * on virtual time instead of wall-clock time. Given the same script, that
 * makes it deterministic: the same sequence of `runFor` calls always
 * produces the same playhead position, in every browser, on every run.
 *
 * `runFor` (not `fastForward`) is used throughout: `fastForward` is allowed
 * to skip intermediate timer/rAF ticks (it models "closing the laptop lid"),
 * so it would step over frames the playback loop needs. `runFor` fires
 * every due callback as it advances.
 */
import type { Page } from "@playwright/test";

export async function installDeterministicClock(page: Page, startTime = 0) {
  await page.clock.install({ time: startTime });
}

/** Reads the Sequencer's playhead from `.sequencer-playhead-head`'s title (`"Playhead: 0.123s"`). */
export async function readPlayheadSeconds(page: Page): Promise<number> {
  const title = await page.locator(".sequencer-playhead-head").getAttribute("title");
  const match = title?.match(/Playhead:\s*([\d.]+)s/);
  if (!match) throw new Error(`could not read playhead from title "${title}"`);
  return parseFloat(match[1]);
}

/** Presses Play, advances the virtual clock by `ms` (firing every rAF tick), then presses Pause. */
export async function playFor(page: Page, ms: number) {
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.clock.runFor(ms);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
}
