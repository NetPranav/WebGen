/**
 * ROADMAP Phase 24 gate: tool switching and spring-loaded tools. The dock lists only tools that exist; a shortcut or a
 * dock button switches the tool through the command bus; holding Space gives the Hand and Cmd/Ctrl gives deep
 * select, and releasing returns to the previous tool; a drawing tool draws, and the middle button and Space pan
 * whatever tool is active.
 */
import { test, expect, type Page } from "@playwright/test";
import { openEditor, waitSaved } from "./support/editor";

const CANVAS = ".whiteboard-stage";
const DEEP = process.platform === "darwin" ? "Meta" : "Control";
const STAGE = 'iframe[title="Stage"]';

/** Waits for the canvas to be using `id` (the tool state reaches the DOM a render after the key). */
const expectTool = (page: Page, id: string, message?: string) => expect(page.locator(CANVAS), message).toHaveAttribute("data-tool", id);
const camera = (page: Page) =>
  page.evaluate((sel) => {
    const s = document.querySelector<HTMLElement>(sel)!.style;
    return { x: Number(s.getPropertyValue("--canvas-pan-x")), y: Number(s.getPropertyValue("--canvas-pan-y")), zoom: Number(s.getPropertyValue("--canvas-zoom")) };
  }, CANVAS);
const count = (page: Page, archetype: string) =>
  page.evaluate(({ sel, a }) => document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelectorAll(`[data-archetype="${a}"]`).length ?? 0, { sel: STAGE, a: archetype });

async function ready(page: Page) {
  await openEditor(page);
  await page.getByRole("button", { name: "Mount Showcase Demo" }).click();
  await page.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelector("[data-element-id]"), STAGE);
  await waitSaved(page);
  await page.waitForTimeout(400);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()); // a focused button would take Space as a click
  const box = (await page.locator(CANVAS).boundingBox())!;
  const mid = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
  await page.mouse.move(mid.x, mid.y); // the canvas focus scope follows the pointer
  return mid;
}

test("Phase 24: the dock shows only the tools that exist, and a button switches the tool", async ({ page }) => {
  await ready(page);
  const dock = page.getByRole("toolbar", { name: "Confluence Whiteboard Tools" });
  const names = await dock.getByRole("button").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
  expect(names).toEqual(["Select Tool", "Hand Tool (Pan)", "Frame Tool", "Rectangle Tool", "Ellipse Tool", "Line Tool", "Text Tool"]);
  for (const hidden of ["Pen Tool", "Pencil Tool", "Comment", "Add Node / Asset"]) {
    await expect(dock.getByRole("button", { name: hidden }), `${hidden} isn't built yet, so it has no button`).toHaveCount(0);
  }

  for (const [label, id] of [["Hand Tool (Pan)", "pan"], ["Ellipse Tool", "ellipse"], ["Text Tool", "text"], ["Select Tool", "select"]] as const) {
    await dock.getByRole("button", { name: label }).click();
    await expectTool(page, id);
    await expect(dock.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");
  }
});

test("Phase 24: a shortcut switches the tool", async ({ page }) => {
  await ready(page);
  for (const [key, id] of [["h", "pan"], ["r", "rectangle"], ["o", "ellipse"], ["l", "line"], ["f", "frame"], ["t", "text"], ["v", "select"]] as const) {
    await page.keyboard.press(key);
    await expectTool(page, id, `key ${key}`);
  }
  // a tool that isn't built has no shortcut: P (Pen) does nothing
  await page.keyboard.press("p");
  await expectTool(page, "select");
});

test("Phase 24: holding Space gives the Hand and releasing returns to the previous tool", async ({ page }) => {
  await ready(page);
  await page.keyboard.press("r");
  await expectTool(page, "rectangle");
  await page.keyboard.down("Space");
  await expectTool(page, "pan", "Space held: the Hand");
  await page.keyboard.down("Space"); // key repeat
  await expectTool(page, "pan");
  await page.keyboard.up("Space");
  await expectTool(page, "rectangle", "Space released: back to the Rectangle");

  // choosing a tool while Space is held changes what the release returns to
  await page.keyboard.down("Space");
  await expectTool(page, "pan");
  await page.keyboard.press("o");
  await expectTool(page, "pan", "still the Hand while held");
  await page.keyboard.up("Space");
  await expectTool(page, "ellipse");
});

test("Phase 24: holding Cmd/Ctrl gives deep select and releasing returns", async ({ page }) => {
  await ready(page);
  await page.keyboard.press("l");
  await page.keyboard.down(DEEP);
  await expectTool(page, "deepSelect");
  await page.keyboard.up(DEEP);
  await expectTool(page, "line");
});

test("Phase 24: losing the window's focus can't leave a spring stuck on", async ({ page }) => {
  await ready(page);
  await page.keyboard.down("Space");
  await expectTool(page, "pan");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expectTool(page, "select");
  await page.keyboard.up("Space");
});

test("Phase 24: the Rectangle tool draws, returns to Select, and undo takes the shape back", async ({ page }) => {
  const mid = await ready(page);
  const before = await count(page, "rectangle");
  await page.keyboard.press("r");
  await page.mouse.move(mid.x - 60, mid.y - 40);
  await page.mouse.down();
  await page.mouse.move(mid.x + 60, mid.y + 40, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => count(page, "rectangle")).toBe(before + 1);
  await expectTool(page, "select", "back to Select after drawing");
  await waitSaved(page);
  await page.keyboard.press("Control+z");
  await expect.poll(() => count(page, "rectangle")).toBe(before);
});

test("Phase 24: Space-drag and the middle button pan whatever tool is active, and draw nothing", async ({ page }) => {
  const mid = await ready(page);
  await page.keyboard.press("r");
  const before = await count(page, "rectangle");
  const a = await camera(page);

  await page.keyboard.down("Space");
  await page.mouse.down();
  await page.mouse.move(mid.x + 80, mid.y + 30, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.up("Space");
  const b = await camera(page);
  expect(b.x - a.x).toBeCloseTo(80, 0);
  expect(b.y - a.y).toBeCloseTo(30, 0);

  await page.mouse.down({ button: "middle" });
  await page.mouse.move(mid.x - 40, mid.y - 20, { steps: 4 });
  await page.mouse.up({ button: "middle" });
  const c = await camera(page);
  expect(c.x - b.x).toBeCloseTo(-120, 0);
  expect(c.y - b.y).toBeCloseTo(-50, 0);

  expect(await count(page, "rectangle"), "neither drag drew a shape").toBe(before);
  await expectTool(page, "rectangle", "the Rectangle tool is still the active tool");
});
