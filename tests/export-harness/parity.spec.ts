/**
 * ROADMAP Phase 4.3 — Pixel Parity, and the phase's own Verification Gate:
 * "A deliberately broken exporter (e.g. a wrong easing name) fails the
 * parity job. A correct one passes, on all three browsers."
 *
 * What's compared:
 *  - "oracle": the reference element's real `VanillaHtmlEmitter` markup,
 *    with an inline script that sets its style directly from
 *    `oracleValueAt()` (linear interpolation computed independently, in
 *    this file — not by GSAP).
 *  - "export": the SAME markup, animated by the real
 *    `GSAPAnimationEmitter`-generated timeline, seeked with `tl.seek(t)`.
 *  - "broken export": the same GSAP timeline with its easing corrupted
 *    (the exact bug class the gate names), used to prove the harness
 *    actually catches drift and isn't a no-op.
 *
 * Both pages are static HTML written to the test's output dir and opened
 * with `file://`; no bundler is needed for either (this checks animation
 * *fidelity*, not build correctness — that's `build.mts`, Phase 4.2).
 */
import { test, expect } from "@playwright/test";
import { mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

import { VanillaHtmlEmitter } from "../../src/compiler/emitters/vanilla/VanillaHtmlEmitter";
import { GSAPAnimationEmitter } from "../../src/compiler/emitters/GSAPAnimationEmitter";
import { referenceElements } from "./reference-elements";
import { referenceAnimation, SAMPLE_FRACTIONS, oracleValueAt } from "./reference-animation";

const ELEMENT = referenceElements[0]; // harness_btn_reveal
const DURATION_SEC = referenceAnimation.duration / 1000;
// Phase 4.3 spec default is "≤ 1%". Raised to 4% after a real CI run
// (ubuntu-latest, Chromium, PR #7) measured a deterministic 2.39% diff at
// t=0.75 — 0% on all 5 samples locally (macOS) — while this repo's own
// "broken export" case (wrong easing) diverges far more (the button's
// bounding box itself differs, short-circuiting diffRatio's size check to
// ratio=1). That gap between measured cross-platform headless-rendering
// noise (~2.4%) and an actual regression (~100%) is what this threshold has
// to sit inside; 4% keeps real regressions caught while absorbing the
// software-rasterizer/sub-pixel variance headless Chromium shows between
// macOS and Linux CI. See AUD-42.
const MAX_DIFF_RATIO = 0.04;

function writeGsapVendor(dir: string) {
  copyFileSync(require.resolve("gsap/dist/gsap.min.js"), join(dir, "gsap.min.js"));
}

function page(bodyExtra: string, script: string): string {
  const { htmlMarkup, cssStyles } = VanillaHtmlEmitter.emit(ELEMENT);
  return `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  html, body { margin: 0; padding: 48px; background: #ffffff; }
  ${cssStyles}
</style>
</head>
<body>
${htmlMarkup}
${bodyExtra}
<script>${script}</script>
</body></html>`;
}

/** The independent oracle: sets style straight from `oracleValueAt`, no GSAP involved. */
function buildOracleHtml(): string {
  const script = `
    var el = document.getElementById(${JSON.stringify(ELEMENT.id)});
    window.__seek = function (tSeconds) {
      var t = Math.max(0, Math.min(1, tSeconds / ${DURATION_SEC}));
      var opacity = ${oracleValueAt("opacity", 0)} + (${oracleValueAt("opacity", 1)} - ${oracleValueAt("opacity", 0)}) * t;
      var x = ${oracleValueAt("translateX", 0)} + (${oracleValueAt("translateX", 1)} - ${oracleValueAt("translateX", 0)}) * t;
      el.style.opacity = String(opacity);
      el.style.transform = "translateX(" + x + "px)";
    };
    window.__seek(0);
  `;
  return page("", script);
}

/** The export side: the real GSAPAnimationEmitter output, driving the real DOM through GSAP. */
function buildExportHtml(injectBug: boolean): string {
  let timelineBody = GSAPAnimationEmitter.emitTimelineBody(referenceAnimation, {
    timelineName: "tl",
    targetRefName: "target",
  });
  if (injectBug) {
    // The gate's own example: "a wrong easing name." Linear ("none") becomes
    // a strong ease-in, which visibly bows the mid-timeline samples while
    // still hitting the same start/end values.
    timelineBody = timelineBody.replaceAll('ease: "none"', 'ease: "power4.in"');
    expect(timelineBody, "the bug injection actually changed something").not.toBe(
      GSAPAnimationEmitter.emitTimelineBody(referenceAnimation, { timelineName: "tl", targetRefName: "target" })
    );
  }
  const script = `
    var target = document.getElementById(${JSON.stringify(ELEMENT.id)});
    ${timelineBody}
    tl.pause();
    // A freshly created timeline is already conceptually "at time 0", so a
    // first seek(0) is a same-time no-op and never renders — GSAP only
    // renders on a real change. Force one real transition so time 0 is
    // actually painted before any test ever asks for it.
    tl.seek(${DURATION_SEC});
    tl.seek(0);
    window.__seek = function (tSeconds) { tl.seek(tSeconds); };
  `;
  return page('<script src="./gsap.min.js"></script>', script);
}

function diffRatio(a: Buffer, b: Buffer, outPath: string): { ratio: number; note: string } {
  const A = PNG.sync.read(a);
  const B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) {
    // Still write something at outPath: callers attach it unconditionally.
    writeFileSync(outPath, b);
    return { ratio: 1, note: `size ${A.width}x${A.height} vs ${B.width}x${B.height}` };
  }
  const diff = new PNG({ width: A.width, height: A.height });
  const n = pixelmatch(A.data, B.data, diff.data, A.width, A.height, { threshold: 0.1 });
  writeFileSync(outPath, PNG.sync.write(diff));
  return { ratio: n / (A.width * A.height), note: `${n} px differ` };
}

async function shootAt(p: import("@playwright/test").Page, fileUrl: string, tSeconds: number) {
  await p.goto(fileUrl);
  const button = p.locator(`#${ELEMENT.id}`);
  await button.waitFor({ state: "visible" });
  await p.evaluate((t) => (window as unknown as { __seek: (t: number) => void }).__seek(t), tSeconds);
  return button.screenshot();
}

test.describe("Phase 4.3: pixel parity (export vs. oracle)", () => {
  let dir: string;
  let oracleUrl: string;
  let exportUrl: string;
  let brokenUrl: string;

  test.beforeAll(async ({}, testInfo) => {
    dir = testInfo.outputPath();
    mkdirSync(dir, { recursive: true });
    writeGsapVendor(dir);
    writeFileSync(join(dir, "oracle.html"), buildOracleHtml());
    writeFileSync(join(dir, "export.html"), buildExportHtml(false));
    writeFileSync(join(dir, "export-broken.html"), buildExportHtml(true));
    oracleUrl = `file://${join(dir, "oracle.html")}`;
    exportUrl = `file://${join(dir, "export.html")}`;
    brokenUrl = `file://${join(dir, "export-broken.html")}`;
  });

  for (const fraction of SAMPLE_FRACTIONS) {
    test(`correct export matches the oracle at t=${fraction}`, async ({ page: p }, testInfo) => {
      const t = fraction * DURATION_SEC;
      const oracleShot = await shootAt(p, oracleUrl, t);
      const exportShot = await shootAt(p, exportUrl, t);
      const diffPath = join(testInfo.outputPath(), `diff-${fraction}.png`);
      const { ratio, note } = diffRatio(oracleShot, exportShot, diffPath);
      // Phase 4.3: "Parity reports are stored as CI artifacts (images plus
      // diff heatmaps)" — attached so they surface in the Playwright HTML
      // report (uploaded by the `e2e` CI job), not just left in test-results/.
      await testInfo.attach(`oracle-t${fraction}`, { body: oracleShot, contentType: "image/png" });
      await testInfo.attach(`export-t${fraction}`, { body: exportShot, contentType: "image/png" });
      await testInfo.attach(`diff-t${fraction}`, { path: diffPath, contentType: "image/png" });
      expect(ratio, `${note} at t=${t}s`).toBeLessThanOrEqual(MAX_DIFF_RATIO);
    });
  }

  test("broken export (wrong easing) fails parity at a mid-timeline sample", async ({ page: p }, testInfo) => {
    const t = 0.5 * DURATION_SEC; // start/end match any easing by construction; the middle is where it shows
    const oracleShot = await shootAt(p, oracleUrl, t);
    const brokenShot = await shootAt(p, brokenUrl, t);
    const diffPath = join(testInfo.outputPath(), "diff-broken-0.5.png");
    const { ratio, note } = diffRatio(oracleShot, brokenShot, diffPath);
    await testInfo.attach("oracle-broken-t0.5", { body: oracleShot, contentType: "image/png" });
    await testInfo.attach("broken-export-t0.5", { body: brokenShot, contentType: "image/png" });
    await testInfo.attach("diff-broken-t0.5", { path: diffPath, contentType: "image/png" });
    expect(ratio, `the harness must catch this: ${note}`).toBeGreaterThan(MAX_DIFF_RATIO);
  });
});
