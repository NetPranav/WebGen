/**
 * ROADMAP Phase 30 gate, in the real canvas in Chromium, Firefox and WebKit: align, distribute and tidy move real
 * layers to exact positions (read back from the frame's DOM), each is one undo step, the spacing handles on the
 * canvas set equal gaps, and the inspector's buttons run the same commands.
 */
import { test, expect, type Page } from "@playwright/test";
import { openEditor, waitSaved, waitHydrated } from "./support/editor";

const MOD = process.platform === "darwin" ? "Meta" : "Control";

async function openShapesLab(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __LL_TEST__: boolean }).__LL_TEST__ = true;
  });
  await page.goto("/editor/canvas-lab", { waitUntil: "domcontentloaded" });
  await waitHydrated(page);
  // a click before hydration does nothing: click again until the shapes are there
  await expect(async () => {
    await page.getByRole("button", { name: "Load one frame with shapes" }).click();
    await page.waitForFunction(() => !!document.querySelector<HTMLIFrameElement>(".canvas-frame iframe")?.contentDocument?.querySelector('[data-element-id="m_poly"]'), null, { timeout: 8_000 });
  }).toPass({ timeout: 55_000 });
  await page.waitForTimeout(600);
}

const pos = (page: Page, id: string) =>
  page.evaluate((id) => {
    const el = document.querySelector<HTMLIFrameElement>(".canvas-frame iframe")!.contentDocument!.querySelector<HTMLElement>(`[data-element-id="${id}"]`);
    return el ? { x: parseFloat(el.style.left), y: parseFloat(el.style.top) } : null;
  }, id);

const centre = (page: Page, id: string) =>
  page.evaluate((id) => {
    const iframe = document.querySelector<HTMLIFrameElement>(".canvas-frame iframe")!;
    const el = iframe.contentDocument!.querySelector<HTMLElement>(`[data-element-id="${id}"]`)!;
    const f = iframe.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const s = f.width / iframe.clientWidth;
    return { x: Math.round(f.left + (b.left + b.width / 2) * s), y: Math.round(f.top + (b.top + b.height / 2) * s) };
  }, id);

/** Selects the layers with a click and Shift-clicks. */
async function select(page: Page, ids: string[]) {
  for (const [i, id] of ids.entries()) {
    const c = await centre(page, id);
    if (i > 0) await page.keyboard.down("Shift");
    await page.mouse.click(c.x, c.y);
    if (i > 0) await page.keyboard.up("Shift");
  }
  await expect(page.getByTestId("selected")).toHaveText(ids.join(","));
}

/** Runs a command through the registry's test seam (typed commands take arguments). */
const run = (page: Page, id: string, args?: unknown) =>
  page.evaluate(({ id, args }) => {
    const reg = (window as unknown as { __LL_COMMANDS__: { all: () => { id: string; run: (a?: unknown) => unknown }[] } }).__LL_COMMANDS__;
    return reg.all().find((c) => c.id === id)!.run(args);
  }, { id, args });

/** Selects layers that may be off screen: the typed command an agent would use. */
async function selectIds(page: Page, ids: string[]) {
  await run(page, "selection.set", { ids });
  await expect(page.getByTestId("selected")).toHaveText(ids.join(","));
}

const press = async (page: Page, key: string) => {
  await page.keyboard.press(key);
  await page.waitForTimeout(80);
};

test("Phase 30: align, distribute and tidy land layers on exact positions, one undo step each", async ({ page }) => {
  await openShapesLab(page);
  await page.mouse.move(700, 400); // the canvas focus scope follows the pointer

  // The lab's shapes: rect (450,150) 200x120, ellipse (900,150) 200x120, star (450,700) 200x200, polygon (900,700) 200x200.
  expect(await pos(page, "m_ellipse")).toEqual({ x: 900, y: 150 });

  // 1. align left (Alt+A): the ellipse and the star join the rectangle's left edge
  await select(page, ["m_rect", "m_ellipse", "m_star"]);
  await press(page, "Alt+a");
  expect(await pos(page, "m_ellipse"), "1. ellipse left").toEqual({ x: 450, y: 150 });
  expect(await pos(page, "m_star"), "1. star unchanged").toEqual({ x: 450, y: 700 });
  // 2. one undo takes the whole alignment back
  await press(page, `${MOD}+z`);
  expect(await pos(page, "m_ellipse"), "2. undo").toEqual({ x: 900, y: 150 });

  // 3. align right (Alt+D): everything to the rightmost edge (1100)
  await press(page, "Alt+d");
  expect(await pos(page, "m_rect"), "3. rect").toEqual({ x: 900, y: 150 });
  expect(await pos(page, "m_star"), "3. star").toEqual({ x: 900, y: 700 });
  await press(page, `${MOD}+z`);

  // 4. align horizontal centres (Alt+H): the union spans 450..1100, so the centre is 775
  await press(page, "Alt+h");
  expect(await pos(page, "m_rect"), "4. rect").toEqual({ x: 675, y: 150 });
  expect(await pos(page, "m_ellipse"), "4. ellipse").toEqual({ x: 675, y: 150 });
  await press(page, `${MOD}+z`);

  // 5. align top (Alt+W) and bottom (Alt+S) and vertical centres (Alt+V) of the three: they span y 150..900
  await press(page, "Alt+w");
  expect(await pos(page, "m_star"), "5. top").toEqual({ x: 450, y: 150 });
  await press(page, `${MOD}+z`);
  await press(page, "Alt+s");
  expect(await pos(page, "m_rect"), "5. bottom").toEqual({ x: 450, y: 780 });
  await press(page, `${MOD}+z`);
  await press(page, "Alt+v");
  expect(await pos(page, "m_rect"), "5. centre").toEqual({ x: 450, y: 465 });
  await press(page, `${MOD}+z`);
  expect(await pos(page, "m_rect"), "5. undone").toEqual({ x: 450, y: 150 });

  // 6. distribute: a rectangle copy moved far right makes a row of three with unequal gaps (250 and 66)
  await select(page, ["m_rect"]);
  await press(page, `${MOD}+d`);
  const copy = (await page.getByTestId("selected").textContent())!;
  await run(page, "edit.nudgeBy", { dx: 700, dy: 0 });
  expect(await pos(page, copy), "6. copy placed").toEqual({ x: 1166, y: 166 });
  await selectIds(page, ["m_rect", "m_ellipse", copy]);
  await run(page, "canvas.zoomToFit"); // the whole frame in view
  await page.waitForTimeout(300);
  await page.mouse.move(700, 400);
  await press(page, `${MOD}+Alt+h`);
  // gaps: (1366 - 450 - 3 * 200) / 2 = 158
  expect(await pos(page, "m_ellipse"), "6. distributed").toEqual({ x: 808, y: 150 });
  expect(await pos(page, "m_rect"), "6. end stays").toEqual({ x: 450, y: 150 });
  expect(await pos(page, copy), "6. end stays").toEqual({ x: 1166, y: 166 });

  // 7. the spacing handles: two pills, one per gap, each labelled with its gap; dragging one sets both gaps
  const handles = page.locator(".canvas-overlay__gap:not([hidden])");
  await expect(handles).toHaveCount(2);
  await expect(handles.locator("span")).toHaveText(["158", "158"]);
  const zoom = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".whiteboard-stage")!).getPropertyValue("--canvas-zoom")) || 1);
  const box = (await handles.first().boundingBox())!;
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 20 * zoom, from.y, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => Number((await handles.locator("span").allTextContents())[0]), "7. the gap grew by the drag").toBeGreaterThanOrEqual(176); // the overlay repaints next frame
  const labels = await handles.locator("span").allTextContents();
  expect(labels[0], "7. both gaps are equal").toBe(labels[1]);
  expect(Number(labels[0])).toBeLessThanOrEqual(180);
  expect(await pos(page, "m_rect"), "7. the first layer stayed").toEqual({ x: 450, y: 150 });
  await press(page, `${MOD}+z`);
  expect(await pos(page, "m_ellipse"), "7. one undo step").toEqual({ x: 808, y: 150 });
});

test("Phase 30: tidy turns a ragged 2 x 2 into a grid, in one undo step", async ({ page }) => {
  await openShapesLab(page);
  await page.mouse.move(700, 400);
  await selectIds(page, ["m_star"]);
  await run(page, "edit.nudgeBy", { dx: 10, dy: -10 });
  await selectIds(page, ["m_rect", "m_ellipse", "m_star", "m_poly"]);
  await press(page, `${MOD}+Alt+t`);
  // rows 150..270 and 690..890; column gaps 250 (top) and 240 (bottom) -> median 245; row gap 420
  expect(await pos(page, "m_rect"), "rect").toEqual({ x: 450, y: 150 });
  expect(await pos(page, "m_ellipse"), "ellipse").toEqual({ x: 895, y: 150 });
  expect(await pos(page, "m_star"), "star").toEqual({ x: 450, y: 690 });
  expect(await pos(page, "m_poly"), "polygon").toEqual({ x: 895, y: 690 });
  await press(page, `${MOD}+z`);
  expect(await pos(page, "m_star"), "undone").toEqual({ x: 460, y: 690 });
  expect(await pos(page, "m_poly"), "undone").toEqual({ x: 900, y: 700 });
});

test("Phase 30: the inspector's align and distribute buttons run the commands", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Mount Showcase Demo" }).click();
  await page.waitForFunction(() => !!document.querySelector<HTMLIFrameElement>('iframe[title="Stage"]')?.contentDocument?.querySelector("[data-element-id]"));
  await waitSaved(page);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForTimeout(400);

  const target = await page.evaluate(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('iframe[title="Stage"]')!;
    const el = iframe.contentDocument!.querySelector<HTMLElement>('[data-element-id="el_buy_button"]')!;
    const f = iframe.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const s = f.width / iframe.clientWidth;
    return { x: Math.round(f.left + (b.left + b.width / 2) * s), y: Math.round(f.top + (b.top + b.height / 2) * s) };
  });
  const meta = process.platform === "darwin" ? "Meta" : "Control";
  await page.keyboard.down(meta);
  await page.mouse.click(target.x, target.y);
  await page.keyboard.up(meta);
  await page.keyboard.press("Control+a"); // the siblings
  const bar = page.getByRole("toolbar", { name: "Align and distribute" });
  await expect(bar).toBeVisible();
  await expect.poll(() => page.locator(".canvas-overlay__selection:not([hidden])").count()).toBeGreaterThan(1); // the overlay paints on the next frame
  const count = await page.locator(".canvas-overlay__selection:not([hidden])").count();
  await expect(bar.getByRole("button", { name: "Tidy up" })).toBeEnabled();
  await expect(bar.getByRole("button", { name: "Distribute horizontal spacing" })).toBeEnabled({ enabled: count >= 3 });

  await bar.getByRole("button", { name: "Align left" }).click();
  await expect.poll(async () => {
    const lefts = await page.locator(".canvas-overlay__selection:not([hidden])").evaluateAll((els) => els.map((e) => Math.round(parseFloat((e as HTMLElement).style.left))));
    return new Set(lefts).size;
  }).toBe(1);
});
