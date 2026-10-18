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
 * is recorded as AUD-41, closed by Phases 54-56 (transport, frame scheduler,
 * playback on the clock). Case 3 below is the former falsifier, now asserting
 * that playback on the new clock is deterministic.
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

test("3. AUD-41: transport playback on the frame scheduler is deterministic under the test clock", async ({ page }) => {
  await openEditor(page);
  await installDeterministicClock(page, 0);
  await page.clock.pauseAt(100); // virtual time now moves only through runFor, not while Playwright clicks
  const bar = page.getByRole("group", { name: "Transport" });
  const timecode = bar.getByLabel("Timecode");

  // Phase 55: the transport advances from the scheduler's own frame times (dt clamped, never negative),
  // so identical scripts give identical deltas. The old Sequencer loop, which this case used to show
  // wandering by hundreds of ms, is retired in Phase 56.
  const seconds = async () => {
    const [, mm, ss, ff] = ((await timecode.textContent()) ?? "").match(/^(\d\d):(\d\d):(\d\d)/) ?? [];
    return Number(mm) * 60 + Number(ss) + Number(ff) / 60;
  };

  // `runFor` lands on the next due frame, so each run covers a little more than 400 ms. What must hold is that
  // the transport covers exactly what the clock covered: frames advanced = elapsed virtual ms × fps, to a frame.
  const clockNow = () => page.evaluate(() => performance.now());
  let before = 0;
  const errors: number[] = [];
  for (let i = 0; i < 3; i++) {
    await bar.getByRole("button", { name: "Play", exact: true }).click();
    const started = await clockNow();
    await page.clock.runFor(400);
    const elapsed = (await clockNow()) - started;
    await bar.getByRole("button", { name: "Pause", exact: true }).click();
    await page.clock.runFor(150); // lets the 10 Hz timecode readout catch up to the final frame
    const position = await seconds();
    errors.push(Math.abs((position - before) * 60 - (elapsed / 1000) * 60));
    before = position;
  }
  expect(Math.max(...errors), `frames of error per run vs the virtual clock: ${errors.map((e) => e.toFixed(2)).join(", ")}`).toBeLessThanOrEqual(2);
});
