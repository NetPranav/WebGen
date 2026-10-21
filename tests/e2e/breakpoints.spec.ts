/**
 * ROADMAP Phase 43 gate, in Chromium, Firefox and WebKit: a breakpoint bar; an edit at Mobile is an override that
 * applies only at Mobile (Desktop and the saved base are untouched), cascades from Tablet down, can be reset one
 * property at a time or all at once, and undoes in one step; a layer can be hidden at one breakpoint; a responsive
 * frame is as wide as the breakpoint, with its pinned layers following; a breakpoint of your own width can be added.
 */
import { test, expect, type Page } from "@playwright/test";
import { openEditor, waitSaved } from "./support/editor";

const MOD = process.platform === "darwin" ? "Meta" : "Control";
const STAGE = 'iframe[title="Stage"]';

async function ready(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __LL_TEST__: boolean }).__LL_TEST__ = true;
  });
  await openEditor(page);
  await page.getByRole("button", { name: "Mount Showcase Demo" }).click();
  await page.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelector("[data-element-id]"), STAGE);
  await waitSaved(page);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForTimeout(400);
}

type Doc = { commands: { addLayer: (input: unknown, label?: string) => string; updateProps: (id: string, patch: Record<string, unknown>) => void }; get: () => { layers: Record<string, { children: string[]; properties: Record<string, unknown>; overrides?: Record<string, Record<string, unknown>>; visible?: boolean }> } };
type Reg = { all: () => { id: string; run: (a?: unknown) => unknown }[] };

const run = (page: Page, id: string, args?: unknown) =>
  page.evaluate(({ id, args }) => (window as unknown as { __LL_COMMANDS__: Reg }).__LL_COMMANDS__.all().find((c) => c.id === id)!.run(args), { id, args });
const select = (page: Page, ids: string[]) => run(page, "selection.set", { ids });
const layer = (page: Page, id: string) => page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().layers[id], id);

async function build(page: Page) {
  return page.evaluate(() => {
    const doc = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__;
    const frame = doc.commands.addLayer({ archetype: "container", parentId: null, name: "Page", properties: { positioning: "absolute", "frame.x": 3000, "frame.y": 0, "frame.width": 1440, "frame.height": 600, "layout.padding": 0, "appearance.background.color": "#e2e8f0", "breakpoints.responsive": true } });
    const kid = (name: string, x: number, y: number, extra: Record<string, unknown> = {}) =>
      doc.commands.addLayer({ archetype: "container", parentId: frame, name, properties: { positioning: "absolute", "frame.x": x, "frame.y": y, "frame.width": 200, "frame.height": 100, "layout.padding": 0, "appearance.background.color": "#64748b", ...extra } });
    return { frame, a: kid("a", 100, 100), b: kid("b", 500, 100), pinned: kid("pinned", 1200, 20, { "constraints.horizontal": "right" }) };
  });
}

/** A layer's rectangle in its frame's own pixels, or null when it isn't drawn. */
const rectOf = (page: Page, id: string, root: string) =>
  page.evaluate(
    ({ id, root }) => {
      const d = Array.from(document.querySelectorAll("iframe")).map((f) => f.contentDocument).find((c) => c?.querySelector(`[data-element-id="${root}"]`));
      const el = d?.querySelector<HTMLElement>(`[data-element-id="${id}"]`);
      const base = d?.querySelector<HTMLElement>(`[data-element-id="${root}"]`)?.getBoundingClientRect();
      if (!el || !base) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
    },
    { id, root },
  );

const bar = (page: Page) => page.getByRole("toolbar", { name: "Breakpoints" });

test.describe("Phase 43: breakpoints and overrides", () => {
  test("Mobile shows the page at 375 and an edit there leaves Desktop alone; reset and undo", async ({ page }) => {
    await ready(page);
    const { frame, a } = await build(page);
    await select(page, [a]);
    await bar(page).getByRole("button", { name: "Mobile 375" }).click();
    await expect.poll(async () => (await rectOf(page, frame, frame))?.w).toBeCloseTo(375, 0);

    // edit X at Mobile through the inspector
    const face = page.getByRole("form", { name: "Design" });
    await face.getByLabel("X", { exact: true }).fill("20");
    await face.getByLabel("X", { exact: true }).blur();
    await expect.poll(async () => (await rectOf(page, a, frame))?.x).toBeCloseTo(20, 0);
    await expect.poll(async () => (await layer(page, a)).overrides?.mobile?.["frame.x"]).toBe(20);
    expect((await layer(page, a)).properties["frame.x"]).toBe(100);
    await waitSaved(page); // the document with overrides is accepted by the saver

    // Desktop is as it was
    await bar(page).getByRole("button", { name: "Desktop 1440" }).click();
    await expect.poll(async () => (await rectOf(page, frame, frame))?.w).toBeCloseTo(1440, 0);
    await expect.poll(async () => (await rectOf(page, a, frame))?.x).toBeCloseTo(100, 0);

    // back at Mobile: the panel lists the override, and Reset puts it back
    await bar(page).getByRole("button", { name: "Mobile 375" }).click();
    const panel = page.getByRole("region", { name: "Overrides at Mobile" });
    await expect(panel.locator('[data-override="frame.x"]')).toBeVisible();
    await panel.getByRole("button", { name: "Reset frame.x" }).click();
    await expect.poll(async () => (await rectOf(page, a, frame))?.x).toBeCloseTo(100, 0);
    expect((await layer(page, a)).overrides).toBeUndefined();

    // the reset is one undo step: undo brings the override back
    await page.keyboard.press(`${MOD}+z`);
    await expect.poll(async () => (await layer(page, a)).overrides?.mobile?.["frame.x"]).toBe(20);
  });

  test("Tablet changes reach Mobile, Mobile's own win, and Reset all clears Mobile only", async ({ page }) => {
    await ready(page);
    const { frame, a } = await build(page);
    await select(page, [a]);
    await run(page, "breakpoint.set", { id: "tablet" });
    await expect.poll(async () => (await rectOf(page, frame, frame))?.w).toBeCloseTo(768, 0);
    await page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.commands.updateProps(id, { "frame.x": 60, "frame.y": 61 }), a);
    await run(page, "breakpoint.set", { id: "mobile" });
    await expect.poll(async () => (await rectOf(page, a, frame))?.x).toBeCloseTo(60, 0);
    await page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.commands.updateProps(id, { "frame.x": 5 }), a);
    await expect.poll(async () => (await rectOf(page, a, frame))?.x).toBeCloseTo(5, 0);
    expect((await rectOf(page, a, frame))?.y).toBeCloseTo(61, 0);
    await page.getByRole("region", { name: "Overrides at Mobile" }).getByRole("button", { name: "Reset all overrides" }).click();
    await expect.poll(async () => (await rectOf(page, a, frame))?.x).toBeCloseTo(60, 0);
    expect((await layer(page, a)).overrides?.tablet).toBeTruthy();
  });

  test("a layer hidden at Mobile is drawn at Desktop and not at Mobile", async ({ page }) => {
    await ready(page);
    const { frame, b } = await build(page);
    await select(page, [b]);
    await run(page, "breakpoint.set", { id: "mobile" });
    await page.getByRole("region", { name: "Overrides at Mobile" }).getByLabel("Hide at Mobile").check();
    await expect.poll(() => rectOf(page, b, frame)).toBeNull();
    expect((await layer(page, b)).visible).toBeUndefined();
    await run(page, "breakpoint.set", { id: null });
    await expect.poll(async () => (await rectOf(page, b, frame))?.x).toBeCloseTo(500, 0);
  });

  test("a layer pinned to the right follows the narrower page, and an override beats the pin", async ({ page }) => {
    await ready(page);
    const { frame, pinned } = await build(page);
    await run(page, "breakpoint.set", { id: "mobile" });
    await expect.poll(async () => (await rectOf(page, pinned, frame))?.x).toBeCloseTo(1200 + (375 - 1440), 0);
    await select(page, [pinned]);
    await page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.commands.updateProps(id, { "frame.x": 90 }), pinned);
    await expect.poll(async () => (await rectOf(page, pinned, frame))?.x).toBeCloseTo(90, 0);
  });

  test("a breakpoint of your own: add 1024, edit at it, remove it with its overrides", async ({ page }) => {
    await ready(page);
    const { a } = await build(page);
    await bar(page).getByRole("button", { name: "Add breakpoint" }).click();
    await bar(page).getByLabel("New breakpoint width").fill("1024");
    await bar(page).getByLabel("New breakpoint width").press("Enter");
    await expect(bar(page).getByRole("button", { name: "1024 1024" })).toBeVisible();
    await select(page, [a]);
    await bar(page).getByRole("button", { name: "1024 1024" }).click();
    await page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.commands.updateProps(id, { "frame.x": 3 }), a);
    await expect.poll(async () => Object.keys((await layer(page, a)).overrides ?? {})).toEqual(["1024"]);
    await bar(page).getByRole("button", { name: "Remove 1024" }).click();
    await expect.poll(async () => (await layer(page, a)).overrides).toBeUndefined();
    await expect(bar(page).getByRole("button", { name: "1024 1024" })).toHaveCount(0);
  });
});
