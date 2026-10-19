/**
 * ROADMAP Phase 18 gate: the stage is a same-origin frame with live DOM, not an HTML string; an edit
 * updates it in place without reloading the frame, inside a frame's budget; keys typed over the stage
 * still reach the command bus; the frame can't run script.
 */
import { test, expect, type Page } from "@playwright/test";
import { openEditor, waitSaved } from "./support/editor";

const STAGE = 'iframe[title="Stage"]';

/** The stage's frame, once it has mounted something (the document starts blank, so draw first). */
async function stageFrame(page: Page) {
  const frame = page.frames().find((f) => f.url().endsWith("/stage-frame.html"));
  if (!frame) throw new Error("the stage frame is not loaded");
  return frame;
}

/** Mount the showcase demo so the stage has layers (a blank project shows none). */
async function mountDemo(page: Page) {
  await page.getByRole("button", { name: "Mount Showcase Demo" }).click();
  await page.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelector("[data-element-id]"), STAGE);
  await waitSaved(page);
}

test("Phase 18: the stage is a script-free same-origin frame with live DOM, not srcdoc", async ({ page }) => {
  await openEditor(page);
  await mountDemo(page);

  const iframe = page.locator(STAGE);
  expect(await iframe.getAttribute("srcdoc"), "no srcdoc: the frame loads a static file").toBeNull();
  expect(await iframe.getAttribute("src")).toBe("/stage-frame.html");
  expect(await iframe.getAttribute("sandbox"), "no sandbox attribute: WebKit drops event delivery to a sandboxed script-less frame").toBeNull();

  const frame = await stageFrame(page);
  const facts = await frame.evaluate(() => ({
    compat: document.compatMode,
    origin: location.origin,
    scripts: document.querySelectorAll("script").length,
    archetypes: Array.from(document.querySelectorAll("[data-element-id]")).map((e) => e.getAttribute("data-archetype")),
    viewport: window.innerWidth,
  }));
  expect(facts.compat, "standards mode, not quirks").toBe("CSS1Compat");
  expect(facts.origin).toBe(new URL(page.url()).origin);
  expect(facts.scripts, "no script in the frame").toBe(0);
  expect(facts.archetypes, "the demo's layers are drawn by the render definitions").toEqual(expect.arrayContaining(["container", "text", "button"]));
  expect(facts.viewport, "the frame's width is a real viewport").toBeGreaterThan(300);

  // Nothing can execute in the frame, however it is injected: an inline handler, a script element, a javascript: URL.
  const pwned = await page.evaluate(async (sel) => {
    const w = window as unknown as { __pwned?: number };
    w.__pwned = 0;
    const d = document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!;
    const holder = d.createElement("div");
    d.body.appendChild(holder);
    holder.innerHTML = '<img src="x" onerror="window.parent.__pwned=1">';
    const script = d.createElement("script");
    script.textContent = "window.parent.__pwned = 2";
    d.body.appendChild(script);
    const link = d.createElement("a");
    link.href = "javascript:window.parent.__pwned=3";
    d.body.appendChild(link);
    link.click();
    await new Promise((r) => setTimeout(r, 500));
    holder.remove();
    script.remove();
    link.remove();
    return w.__pwned;
  }, STAGE);
  expect(pwned, "no inline handler, script element or javascript: URL ran in the frame").toBe(0);
});

test("Phase 18: a document edit updates the stage in place, without reloading the frame, in under a frame", async ({ page, browserName }) => {
  await openEditor(page);
  await mountDemo(page);
  const frame = await stageFrame(page);
  await frame.evaluate(() => ((document as unknown as { __marker: string }).__marker = "same-document"));

  // Draw a rectangle (a document edit), then undo and redo it. Undo and redo apply document patches to
  // the live DOM: the same path a property edit takes once the inspector writes to the document (Phase 33).
  const count = () => frame.locator("[data-element-id]").count();
  const before = await count();
  await page.getByRole("button", { name: "Rectangle Tool", exact: true }).click();
  const box = (await page.locator(".whiteboard-stage").boundingBox())!;
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 240, box.y + 190, { steps: 6 });
  await page.mouse.up();
  await expect.poll(count).toBe(before + 1);

  // Time each undo/redo from the key reaching the editor to the frame's DOM showing the change
  // (React commit plus layout; paint is excluded, it is not something an edit controls).
  const timings: number[] = [];
  for (const direction of ["undo", "redo", "undo", "redo", "undo", "redo"]) {
    const ms = await page.evaluate(
      ({ direction, sel }) =>
        new Promise<number>((resolve) => {
          const doc = document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!;
          const count = () => doc.querySelectorAll("[data-element-id]").length;
          const start = count();
          const observer = new MutationObserver(() => {
            if (count() !== start) {
              observer.disconnect();
              doc.body.getBoundingClientRect(); // force layout
              resolve(performance.now() - t0);
            }
          });
          observer.observe(doc.body, { childList: true, subtree: true });
          const t0 = performance.now();
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, shiftKey: direction === "redo", bubbles: true, cancelable: true }));
        }),
      { direction, sel: STAGE },
    );
    timings.push(ms);
  }
  timings.sort((a, b) => a - b);
  const median = timings[Math.floor(timings.length / 2)];
  test.info().annotations.push({ type: "edit-to-DOM ms", description: timings.map((t) => t.toFixed(1)).join(", ") });
  // The gate is "< 16 ms" (one frame at 60 fps). Chromium must meet it. Firefox and WebKit are held to 50 ms (three
  // frames) until their numbers on the CI runner are known; the measured timings are attached to every run.
  const budget = browserName === "chromium" ? 16 : 50;
  expect(median, `edit → frame DOM timings (ms): ${timings.map((t) => t.toFixed(1)).join(", ")} (budget ${budget})`).toBeLessThan(budget);

  expect(await frame.evaluate(() => (document as unknown as { __marker?: string }).__marker), "the frame's document was never reloaded").toBe("same-document");
  expect(page.frames().filter((f) => f.url().endsWith("/stage-frame.html")), "still one stage frame").toHaveLength(1);
});

test("Phase 18: keys typed with the pointer over the stage reach the command bus", async ({ page }) => {
  await openEditor(page);
  await mountDemo(page);
  const stage = page.locator(".whiteboard-stage");
  const box = (await stage.boundingBox())!;

  // Click into the frame so keyboard focus is inside it, then use a tool shortcut and undo.
  await page.mouse.click(box.x + 300, box.y + 200);
  await page.keyboard.press("r"); // Rectangle tool
  await expect(page.getByRole("button", { name: "Rectangle Tool", exact: true })).toHaveAttribute("aria-pressed", "true");

  const before = await (await stageFrame(page)).locator("[data-element-id]").count();
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 220, box.y + 180, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => (await stageFrame(page)).locator("[data-element-id]").count()).toBeGreaterThan(before);

  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(async () => (await stageFrame(page)).locator("[data-element-id]").count()).toBe(before);
});
