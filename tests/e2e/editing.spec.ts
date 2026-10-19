/**
 * ROADMAP Phase 29 gate: a 25-step editing journey (duplicate with a remembered offset, nudge, delete, copy and paste,
 * undo, arrange, group, ungroup, frame selection, lock, hide, rename, the context menu, cut and paste in place,
 * select all and nudge) asserting the exact result after each step; and a copy in one tab pastes into another.
 */
import { test, expect, type Page } from "@playwright/test";
import { openEditor, waitSaved } from "./support/editor";

const MOD = process.platform === "darwin" ? "Meta" : "Control";
const CANVAS = ".whiteboard-stage";

async function openShapesLab(page: Page) {
  await page.goto("/editor/canvas-lab", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Load one frame with shapes" }).click();
  await page.waitForFunction(() => !!document.querySelector<HTMLIFrameElement>(".canvas-frame iframe")?.contentDocument?.querySelector('[data-element-id="m_poly"]'), null, { timeout: 60_000 });
  await page.waitForTimeout(600);
}

interface Info { exists: boolean; left: number; top: number; width: number; height: number; parentId: string | null; index: number; archetype: string | null; bx: number; by: number }

const info = (page: Page, id: string): Promise<Info> =>
  page.evaluate((id) => {
    const iframe = document.querySelector<HTMLIFrameElement>(".canvas-frame iframe")!;
    const el = iframe.contentDocument!.querySelector<HTMLElement>(`[data-element-id="${id}"]`);
    if (!el) return { exists: false, left: 0, top: 0, width: 0, height: 0, parentId: null, index: -1, archetype: null, bx: 0, by: 0 };
    const parent = el.parentElement?.closest("[data-element-id]") as HTMLElement | null;
    const siblings = parent ? Array.from(parent.children).filter((c) => (c as HTMLElement).dataset.elementId) : [];
    const b = el.getBoundingClientRect();
    return { exists: true, left: parseFloat(el.style.left), top: parseFloat(el.style.top), width: Number(el.getAttribute("width")) || b.width, height: Number(el.getAttribute("height")) || b.height, parentId: parent?.dataset.elementId ?? null, index: siblings.indexOf(el), archetype: el.dataset.archetype ?? null, bx: b.left, by: b.top };
  }, id);

const ids = (page: Page, archetype: string) =>
  page.evaluate((a) => Array.from(document.querySelector<HTMLIFrameElement>(".canvas-frame iframe")!.contentDocument!.querySelectorAll(`[data-archetype="${a}"]`)).map((e) => (e as HTMLElement).dataset.elementId!), archetype);

const centre = (page: Page, id: string) =>
  page.evaluate((id) => {
    const iframe = document.querySelector<HTMLIFrameElement>(".canvas-frame iframe")!;
    const el = iframe.contentDocument!.querySelector<HTMLElement>(`[data-element-id="${id}"]`)!;
    const f = iframe.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const s = f.width / iframe.clientWidth;
    return { x: Math.round(f.left + (b.left + b.width / 2) * s), y: Math.round(f.top + (b.top + b.height / 2) * s) };
  }, id);

const selection = (page: Page) => page.getByTestId("selected");

/** A point just inside a layer's top-left corner: clear of copies that overlap its middle. */
const corner = (page: Page, id: string) =>
  page.evaluate((id) => {
    const iframe = document.querySelector<HTMLIFrameElement>(".canvas-frame iframe")!;
    const el = iframe.contentDocument!.querySelector<HTMLElement>(`[data-element-id="${id}"]`)!;
    const f = iframe.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const s = f.width / iframe.clientWidth;
    return { x: Math.round(f.left + b.left * s + 6), y: Math.round(f.top + b.top * s + 6) };
  }, id);

async function pick(page: Page, id: string) {
  const c = await centre(page, id);
  await page.mouse.click(c.x, c.y);
  await expect(selection(page), `picking ${id} at ${c.x},${c.y}`).toHaveText(id);
}

const press = async (page: Page, key: string) => {
  await page.keyboard.press(key);
  await page.waitForTimeout(80);
};

test("Phase 29: a 25-step editing journey with the exact result after each step", async ({ page }) => {
  await openShapesLab(page);
  await page.mouse.move(700, 400); // the canvas focus scope follows the pointer
  const rect0 = await info(page, "m_rect");

  // 1. pick the rectangle
  await page.mouse.click((await corner(page, "m_rect")).x, (await corner(page, "m_rect")).y);
  await expect(selection(page)).toHaveText("m_rect");

  // 2. Ctrl+D duplicates it right after the original, 16 px down and right, selected
  await press(page, `${MOD}+d`);
  await expect(selection(page)).not.toHaveText("m_rect");
  const c1 = (await selection(page).textContent())!;
  const i1 = await info(page, c1);
  expect([i1.left, i1.top], "2. offset 16").toEqual([rect0.left + 16, rect0.top + 16]);
  expect((await info(page, "m_rect")).index + 1, "2. right after the original").toBe(i1.index);
  expect((await info(page, "m_rect")).left, "2. the original didn't move").toBe(rect0.left);

  // 3. an arrow key nudges 1 px
  await press(page, "ArrowRight");
  expect((await info(page, c1)).left, "3. nudge right 1").toBe(rect0.left + 17);

  // 4. Shift+arrow nudges 10 px
  await press(page, "Shift+ArrowDown");
  expect((await info(page, c1)).top, "4. nudge down 10").toBe(rect0.top + 26);

  // 5. duplicating the moved copy repeats the move: (17, 26) from its source
  await press(page, `${MOD}+d`);
  const c2 = (await selection(page).textContent())!;
  const i2 = await info(page, c2);
  expect([i2.left, i2.top], "5. the remembered offset").toEqual([rect0.left + 34, rect0.top + 52]);

  // 6. Delete removes the selected copy and clears the selection
  await press(page, "Delete");
  expect((await info(page, c2)).exists, "6. gone").toBe(false);
  await expect(selection(page), "6. nothing selected").toHaveText("none");

  // 7. copy and paste: a new layer beside the source (16 px), selected
  await pick(page, c1);
  await press(page, `${MOD}+c`);
  await press(page, `${MOD}+v`);
  const c3 = (await selection(page).textContent())!;
  expect(c3, "7. a different layer").not.toBe(c1);
  const i3 = await info(page, c3);
  expect([i3.left, i3.top], "7. 16 px from the source").toEqual([rect0.left + 17 + 16, rect0.top + 26 + 16]);

  // 8. one undo takes the paste away
  await press(page, `${MOD}+z`);
  await expect.poll(async () => (await info(page, c3)).exists, "8. undone").toBe(false);

  // 9-11. arrange: to front, to back, forward one
  await page.mouse.click((await corner(page, "m_rect")).x, (await corner(page, "m_rect")).y);
  await expect(selection(page)).toHaveText("m_rect");
  await press(page, `${MOD}+Shift+]`);
  const frontIndex = (await info(page, "m_rect")).index;
  const total = await page.evaluate(() => Array.from(document.querySelector<HTMLIFrameElement>(".canvas-frame iframe")!.contentDocument!.querySelector('[data-element-id="frame_0"]')!.children).filter((c) => (c as HTMLElement).dataset.elementId).length);
  expect(frontIndex, "9. last").toBe(total - 1);
  await press(page, `${MOD}+Shift+[`);
  expect((await info(page, "m_rect")).index, "10. first").toBe(0);
  await press(page, `${MOD}+]`);
  expect((await info(page, "m_rect")).index, "11. one forward").toBe(1);

  // 12-13. group the ellipse and the polygon: same place on the canvas, one new parent
  const ellipse0 = await info(page, "m_ellipse");
  const poly0 = await info(page, "m_poly");
  await pick(page, "m_ellipse");
  const pc = await centre(page, "m_poly");
  await page.keyboard.down("Shift");
  await page.mouse.click(pc.x, pc.y);
  await page.keyboard.up("Shift");
  await press(page, `${MOD}+g`);
  const group = (await selection(page).textContent())!;
  expect(group, "12. the group is selected").not.toMatch(/,/);
  expect((await info(page, "m_ellipse")).parentId, "12. ellipse is in the group").toBe(group);
  expect((await info(page, "m_poly")).parentId, "12. polygon is in the group").toBe(group);
  const ellipse1 = await info(page, "m_ellipse");
  expect([Math.round(ellipse1.bx), Math.round(ellipse1.by)], "13. the ellipse didn't move on the canvas").toEqual([Math.round(ellipse0.bx), Math.round(ellipse0.by)]);
  const poly1 = await info(page, "m_poly");
  expect([Math.round(poly1.bx), Math.round(poly1.by)], "13. nor the polygon").toEqual([Math.round(poly0.bx), Math.round(poly0.by)]);

  // 14. ungroup: back under the frame, same place, both selected
  await press(page, `${MOD}+Shift+g`);
  await expect(selection(page), "14. both children selected").toHaveText("m_ellipse,m_poly");
  const ellipse2 = await info(page, "m_ellipse");
  expect(ellipse2.parentId, "14. back in the frame").toBe("frame_0");
  expect([Math.round(ellipse2.bx), Math.round(ellipse2.by)]).toEqual([Math.round(ellipse0.bx), Math.round(ellipse0.by)]);
  expect((await info(page, group)).exists, "14. the group is gone").toBe(false);

  // 15. frame selection
  await pick(page, "m_star");
  await press(page, `${MOD}+Alt+g`);
  const frame = (await selection(page).textContent())!;
  expect((await info(page, "m_star")).parentId, "15. the star is in a new container").toBe(frame);
  expect((await info(page, frame)).archetype).toBe("container");

  // 16-18. lock: a locked layer can't be picked; Unlock All gives it back (through the context menu)
  const rc = await corner(page, "m_rect");
  await page.mouse.click(rc.x, rc.y);
  await expect(selection(page)).toHaveText("m_rect");
  await press(page, `${MOD}+Shift+l`);
  await press(page, "Escape");
  await page.mouse.click(rc.x, rc.y);
  await expect(selection(page), "16. a locked layer isn't picked").not.toHaveText("m_rect");
  await page.mouse.click(rc.x + 400, rc.y + 100, { button: "right" });
  await page.getByRole("menuitem", { name: "Unlock All" }).click();
  await page.mouse.click(rc.x, rc.y);
  await expect(selection(page), "18. unlocked: picked again").toHaveText("m_rect");

  // 19-20. hide and show all
  await pick(page, "m_poly");
  await press(page, `${MOD}+Shift+h`);
  expect((await info(page, "m_poly")).exists, "19. a hidden layer isn't drawn").toBe(false);
  await expect(selection(page), "19. and isn't selected").toHaveText("none");
  await page.mouse.click(rc.x + 400, rc.y + 100, { button: "right" });
  await page.getByRole("menuitem", { name: "Show All" }).click();
  await expect.poll(async () => (await info(page, "m_poly")).exists, "20. shown").toBe(true);

  // 21. rename with F2
  await pick(page, "m_ellipse");
  await press(page, "F2");
  await page.getByLabel("Layer name").fill("Hero ellipse");
  await page.keyboard.press("Enter");
  await expect(page.locator(".canvas-overlay__selection:not([hidden]) .canvas-overlay__label"), "21. the label carries the new name").toContainText("Hero ellipse");

  // 22-23. the context menu: duplicate, then delete the copy
  const before = (await ids(page, "ellipse")).length;
  const ec = await centre(page, "m_ellipse");
  await page.mouse.click(ec.x, ec.y, { button: "right" });
  await expect(page.getByRole("menu", { name: "Layer actions" })).toBeVisible();
  await page.getByRole("menuitem", { name: /^Duplicate/ }).click();
  await expect.poll(async () => (await ids(page, "ellipse")).length, "22. duplicated from the menu").toBe(before + 1);
  const copy = (await selection(page).textContent())!;
  await page.mouse.click((await centre(page, copy)).x, (await centre(page, copy)).y, { button: "right" });
  await page.getByRole("menuitem", { name: /^Delete/ }).click();
  await expect.poll(async () => (await ids(page, "ellipse")).length, "23. deleted from the menu").toBe(before);

  // 24. cut, then paste in place from the menu: back at the exact position
  await pick(page, "m_ellipse");
  const e3 = await info(page, "m_ellipse");
  // Playwright's WebKit turns Cmd+X into a native editing command that never reaches the page as a key event; Ctrl+X is the same binding
  await press(page, "Control+x");
  await expect.poll(async () => (await info(page, "m_ellipse")).exists, "24. cut removes it").toBe(false);
  await page.mouse.click(rc.x + 400, rc.y + 100, { button: "right" });
  await page.getByRole("menuitem", { name: "Paste in Place" }).click();
  await expect.poll(async () => (await ids(page, "ellipse")).length, "24. pasted").toBe(before);
  const pasted = (await selection(page).textContent())!;
  const e4 = await info(page, pasted);
  expect([e4.left, e4.top, e4.width], "24. exactly where it was").toEqual([e3.left, e3.top, e3.width]);

  // 25. select all, then nudge: every sibling moves together
  await page.mouse.move(700, 400);
  await press(page, `${MOD}+a`);
  const r5 = await info(page, "m_rect");
  await press(page, "ArrowLeft");
  expect((await info(page, "m_rect")).left, "25. select all + nudge").toBe(r5.left - 1);
  expect((await info(page, pasted)).left).toBe(e4.left - 1);
});

test("Phase 29: a copy in one tab pastes into another", async ({ browser }) => {
  const context = await browser.newContext();
  const a = await context.newPage();
  const b = await context.newPage();
  await openEditor(a);
  await a.getByRole("button", { name: "Mount Showcase Demo" }).click();
  await a.waitForFunction(() => !!document.querySelector<HTMLIFrameElement>('iframe[title="Stage"]')?.contentDocument?.querySelector('[data-archetype="button"]'));
  await waitSaved(a);
  await a.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await a.waitForTimeout(400);

  // pick the demo's button (deep) in tab A and copy it
  const target = await a.evaluate(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('iframe[title="Stage"]')!;
    const el = iframe.contentDocument!.querySelector<HTMLElement>('[data-archetype="button"]')!;
    const f = iframe.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const s = f.width / iframe.clientWidth;
    return { x: Math.round(f.left + (r.left + r.width / 2) * s), y: Math.round(f.top + (r.top + r.height / 2) * s) };
  });
  await a.keyboard.down(MOD);
  await a.mouse.click(target.x, target.y);
  await a.keyboard.up(MOD);
  await expect(a.locator(".canvas-overlay__selection:not([hidden])")).toHaveCount(1);
  await a.keyboard.press(`${MOD}+c`);

  // tab B: a blank project; paste with the pointer over its canvas
  await openEditor(b);
  const box = (await b.locator(CANVAS).boundingBox())!;
  await b.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  expect(await b.evaluate(() => document.querySelector<HTMLIFrameElement>('iframe[title="Stage"]')?.contentDocument?.querySelectorAll('[data-archetype="button"]').length ?? 0)).toBe(0);
  await b.keyboard.press(`${MOD}+v`);
  await expect.poll(() => b.evaluate(() => document.querySelector<HTMLIFrameElement>('iframe[title="Stage"]')?.contentDocument?.querySelectorAll('[data-archetype="button"]').length ?? 0), "the button arrived in the other tab").toBe(1);
  await context.close();
});
