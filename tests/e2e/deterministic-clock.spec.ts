/**
 * ROADMAP Phase 4.1 — "Deterministic time: a test clock that controls
 * requestAnimationFrame, performance.now, and the MDM playhead, so
 * animations can be screenshotted at an exact t."
 *
 * Two mechanisms, proven separately:
 *
 *  1. `installDeterministicClock` (`support/clock.ts`) wraps Playwright's
 *     native Clock API, which fakes `requestAnimationFrame` and
 *     `performance.now` for the page. In isolation this is deterministic to
 *     within a couple of frames under normal load (worse under heavy
 *     parallel CPU contention) — good enough to drive time-dependent code,
 *     not bit-exact (browsers don't guarantee that of rAF either).
 *
 *  2. `seekRuler` (`support/editor.ts`) is what actually gets used to
 *     "screenshot at an exact t": a direct click on the Sequencer ruler at
 *     a computed pixel offset, which sets `currentTime` synchronously with
 *     no timer involved. It is exact and reproducible.
 *
 * Why not drive playback (Play → advance the clock → Pause) for exact-time
 * sampling: the Sequencer's rAF loop starts unconditionally at mount, not
 * gated on `isPlaying`, and captures a *real* `performance.now()` before
 * the fake clock can be installed cleanly. Measured: the same 400ms
 * `runFor` produced playhead deltas from 400ms to 1300ms run to run. This
 * is recorded as AUD-41, closed by Phase 45 (Transport & Frame Scheduler),
 * which is what replaces this loop with the shared clock. Case 3 below
 * demonstrates the instability so the finding stays falsifiable, not just
 * asserted in prose.
 */
import { test, expect } from "@playwright/test";
import { installDeterministicClock } from "./support/clock";
import { openEditor, openSequencer, seekRuler } from "./support/editor";

test("1. the clock deterministically controls rAF/performance.now in isolation", async ({ page }) => {
  await openEditor(page); // no Sequencer mounted: nothing else is driving rAF
  await installDeterministicClock(page, 0);

  // Two identical measurements, back to back. `runFor` isn't bit-exact
  // (it lands on the next due frame at/after the target), so this checks
  // determinism directly — reproducibility, not an absolute-ms budget that
  // real test-runner load could jitter — rather than asserting a fixed
  // wall-clock tolerance.
  async function elapsedFor(ms: number) {
    const before = await page.evaluate(() => performance.now());
    await page.clock.runFor(ms);
    const after = await page.evaluate(() => performance.now());
    return after - before;
  }

  const first = await elapsedFor(1000);
  const second = await elapsedFor(1000);

  expect(first, "runFor never returns before the requested time").toBeGreaterThanOrEqual(1000);
  expect(second, "runFor never returns before the requested time").toBeGreaterThanOrEqual(1000);
  // Under heavy parallel load (many browsers contending for CPU) the fake
  // clock's own stepping picks up real jitter too — not bit-exact — but
  // nowhere near the up-to-3x, several-hundred-ms swings the entangled
  // Sequencer loop produces for the same 400ms request (Case 3).
  expect(Math.abs(first - second), `two identical 1000ms runFor calls: ${first}ms vs ${second}ms`).toBeLessThan(200);
});

test("2. seekRuler reaches an exact playhead time, repeatably", async ({ page }) => {
  await openEditor(page);
  await openSequencer(page);

  for (const seconds of [0, 0.5, 1] as const) {
    await seekRuler(page, seconds);
    const title = await page.locator(".sequencer-playhead-head").getAttribute("title");
    const readback = parseFloat(title?.match(/Playhead:\s*([\d.]+)s/)?.[1] ?? "NaN");
    expect(readback, `seek to ${seconds}s`).toBeCloseTo(seconds, 2);
  }
});

test("3. AUD-41: clock-driven playback is NOT yet deterministic (documents the gap Phase 45 closes)", async ({
  page,
}) => {
  await openEditor(page);
  await openSequencer(page); // mounts the always-on rAF loop before the clock can be installed cleanly
  await installDeterministicClock(page, 0);

  const samples: number[] = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => (document.querySelector('[aria-label="Play"]') as HTMLElement)?.click());
    await page.clock.runFor(400);
    const title = await page.locator(".sequencer-playhead-head").getAttribute("title");
    samples.push(parseFloat(title?.match(/Playhead:\s*([\d.]+)s/)?.[1] ?? "NaN"));
    await page.evaluate(() => (document.querySelector('[aria-label="Pause"]') as HTMLElement)?.click());
  }

  // If this ever starts holding, the entangled loop has been fixed (Phase
  // 45) and AUD-41 should be closed — this assertion is the falsifier.
  const spread = Math.max(...samples) - Math.min(...samples);
  expect(spread, `playhead deltas for identical 400ms runs: ${samples.join(", ")}`).toBeGreaterThan(0.05);
});
