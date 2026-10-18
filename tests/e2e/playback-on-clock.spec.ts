/**
 * ROADMAP Phase 56 gate: "during playback the timeline panel makes <= 10 React
 * commits per second; canvas and timeline agree within 1 frame (Playwright)."
 *
 * The Sequencer no longer has a clock of its own: its play button, ruler, lane
 * clicks and playhead all act on the one transport, and its needle is painted
 * by a frame-scheduler task rather than React state.
 */
import { test, expect } from "@playwright/test";
import { openEditor, openSequencer, seekRuler } from "./support/editor";

const FPS = 60;

const sequencerTime = async (page: import("@playwright/test").Page) => {
  const title = await page.locator(".sequencer-playhead-head").getAttribute("title");
  return parseFloat(title?.match(/Playhead:\s*([\d.]+)s/)?.[1] ?? "NaN");
};

const barTime = async (page: import("@playwright/test").Page) => {
  const text = (await page.getByRole("group", { name: "Transport" }).getByLabel("Timecode").textContent()) ?? "";
  const [, mm, ss, ff] = text.match(/^(\d\d):(\d\d):(\d\d)/) ?? [];
  return Number(mm) * 60 + Number(ss) + Number(ff) / FPS;
};

test("Phase 56: the Sequencer's play button drives the transport bar, and they agree within a frame", async ({ page }) => {
  await openEditor(page);
  await openSequencer(page);
  const sequencer = page.getByRole("region", { name: "Motion Sequencer Timeline" });

  await seekRuler(page, 0.5);
  expect(await sequencerTime(page)).toBeCloseTo(0.5, 2);
  await expect.poll(() => barTime(page)).toBeCloseTo(0.5, 1);

  await sequencer.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("group", { name: "Transport" }).getByRole("button", { name: "Pause" })).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(700);
  await sequencer.getByRole("button", { name: "Pause", exact: true }).click();
  await page.waitForTimeout(250); // the 10 Hz readouts catch up to the paused head

  const fromSequencer = await sequencerTime(page);
  expect(fromSequencer, "the head moved while playing").toBeGreaterThan(0.9);
  expect(Math.abs((await barTime(page)) - fromSequencer), "timeline and transport bar differ by under a frame").toBeLessThanOrEqual(1 / FPS + 1e-9);
});

test("Phase 56: playing re-renders the timeline at most 10 times a second", async ({ page }) => {
  await openEditor(page);
  await openSequencer(page);
  const sequencer = page.getByRole("region", { name: "Motion Sequencer Timeline" });

  // React commits show up as child-list / text changes; the needle and its title are written directly and do not count.
  await page.evaluate(() => {
    const region = document.querySelector('[aria-label="Motion Sequencer Timeline"]')!;
    const w = window as unknown as { __commits: number };
    w.__commits = 0;
    new MutationObserver((records) => {
      if (records.some((r) => r.type === "childList" || r.type === "characterData")) w.__commits++;
    }).observe(region, { subtree: true, childList: true, characterData: true });
  });

  await sequencer.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForTimeout(300); // the Play -> Pause button swap is a one-off commit, not per-frame cost
  await page.evaluate(() => ((window as unknown as { __commits: number }).__commits = 0));
  const started = Date.now();
  await page.waitForTimeout(2000);
  const seconds = (Date.now() - started) / 1000;
  const commits = await page.evaluate(() => (window as unknown as { __commits: number }).__commits);
  await sequencer.getByRole("button", { name: "Pause", exact: true }).click();

  // 10 Hz readout: one commit per 100 ms, plus at most one on the window edge.
  expect(commits, `${commits} DOM-changing commits in ${seconds.toFixed(1)} s`).toBeLessThanOrEqual(Math.ceil(10 * seconds) + 1);
});
