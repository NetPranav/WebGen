/**
 * ROADMAP Phase 33 gate, in Chromium, Firefox and WebKit: every control of the Simple face round-trips to the
 * document. Editing position, size, fill, stroke, radius, opacity or text in the inspector changes the layer on the
 * canvas, lands in the saved document, and is one undo step; several layers show "Mixed" where they differ.
 */
import { test, expect, type Page } from "@playwright/test";
import { exportProject, openEditor, waitSaved } from "./support/editor";

const STAGE = 'iframe[title="Stage"]';
const MOD = process.platform === "darwin" ? "Meta" : "Control";

async function ready(page: Page) {
  await openEditor(page);
  await page.getByRole("button", { name: "Mount Showcase Demo" }).click();
  await page.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelector("[data-element-id]"), STAGE);
  await waitSaved(page);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForTimeout(400);
}

const frameGeom = (page: Page) =>
  page.evaluate((sel) => {
    const iframe = document.querySelector<HTMLIFrameElement>(sel)!;
    const r = iframe.getBoundingClientRect();
    return { left: r.left, top: r.top, zoom: r.width / iframe.clientWidth };
  }, STAGE);

const layerIds = (page: Page) =>
  page.evaluate((sel) => Array.from(document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelectorAll("[data-element-id]")).map((e) => (e as HTMLElement).dataset.elementId!), STAGE);

async function draw(page: Page, key: string, box: { x: number; y: number; w: number; h: number }) {
  const g = await frameGeom(page);
  const before = await layerIds(page);
  const a = { x: g.left + box.x * g.zoom, y: g.top + box.y * g.zoom };
  await page.mouse.move(a.x, a.y);
  await page.keyboard.press(key);
  await page.mouse.down();
  await page.mouse.move(a.x + (box.w * g.zoom) / 2, a.y + (box.h * g.zoom) / 2);
  await page.mouse.move(a.x + box.w * g.zoom, a.y + box.h * g.zoom, { steps: 3 });
  await page.mouse.up();
  await expect.poll(async () => (await layerIds(page)).length).toBeGreaterThan(before.length);
  return (await layerIds(page)).find((id) => !before.includes(id))!;
}

/** What a layer looks like in the stage. */
const view = (page: Page, id: string) =>
  page.evaluate(({ sel, id }) => {
    const el = document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelector<HTMLElement>(`[data-element-id="${id}"]`);
    if (!el) return null;
    const inner = el.querySelector("rect, ellipse, polygon, line, path");
    const cs = getComputedStyle(el);
    return {
      left: parseFloat(el.style.left), top: parseFloat(el.style.top),
      width: Number(el.getAttribute("width")) || parseFloat(el.style.width) || el.getBoundingClientRect().width,
      height: Number(el.getAttribute("height")) || parseFloat(el.style.height) || el.getBoundingClientRect().height,
      opacity: cs.opacity, text: el.textContent, color: cs.color, background: cs.backgroundColor, radius: cs.borderTopLeftRadius,
      borderWidth: cs.borderTopWidth, borderStyle: cs.borderTopStyle, borderColor: cs.borderTopColor,
      bx: Math.round(el.getBoundingClientRect().left), by: Math.round(el.getBoundingClientRect().top),
      fill: inner?.getAttribute("fill") ?? null, stroke: inner?.getAttribute("stroke") ?? null, strokeWidth: inner?.getAttribute("stroke-width") ?? null, rx: inner?.getAttribute("rx") ?? null,
    };
  }, { sel: STAGE, id });

const face = (page: Page) => page.getByRole("form", { name: "Design" });
const field = (page: Page, label: string) => face(page).locator(`input[aria-label="${label}"], textarea[aria-label="${label}"]`);
async function setNumber(page: Page, label: string, value: string) {
  await field(page, label).fill(value);
  await field(page, label).press("Enter");
}
async function setText(page: Page, label: string, value: string) {
  await field(page, label).fill(value);
  await field(page, label).press("Enter");
}
async function undo(page: Page) {
  await page.mouse.move(700, 300);
  await page.keyboard.press(`${MOD}+z`);
}

test("Phase 33: every Simple control of a rectangle writes to the layer, the document and one undo step", async ({ page }, testInfo) => {
  await ready(page);
  const id = await draw(page, "r", { x: 200, y: 300, w: 160, h: 100 });
  await expect(face(page)).toBeVisible();
  // exactly the seven controls
  await expect(face(page).getByRole("group")).toHaveCount(6); // text has no place on a rectangle
  await expect(face(page).getByRole("group").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).resolves.toEqual(["Position", "Size", "Fill", "Stroke", "Corner radius", "Opacity"]);
  expect(Math.abs(Number(await field(page, "Width").inputValue()) - 160), "the width you drew").toBeLessThanOrEqual(3); // pointer positions are whole screen pixels

  // position and size
  await setNumber(page, "X", "260");
  await expect.poll(async () => (await view(page, id))?.left).toBe(260);
  await setNumber(page, "Y", "310");
  await setNumber(page, "Width", "220");
  await setNumber(page, "Height", "90");
  await expect.poll(async () => (await view(page, id))?.height).toBe(90);
  const sized = (await view(page, id))!;
  expect([sized.left, sized.top, sized.width, sized.height]).toEqual([260, 310, 220, 90]);

  // fill, stroke, radius, opacity
  await setText(page, "Fill", "#ff0000");
  await expect.poll(async () => (await view(page, id))?.fill).toBe("#ff0000");
  await setText(page, "Stroke", "#0000ff");
  await setNumber(page, "Stroke width", "4");
  await expect.poll(async () => (await view(page, id))?.strokeWidth).toBe("4");
  expect((await view(page, id))!.stroke).toBe("#0000ff");
  await setNumber(page, "Radius", "16");
  await expect.poll(async () => (await view(page, id))?.rx).toBe("16");
  await setNumber(page, "Opacity", "50");
  await expect.poll(async () => (await view(page, id))?.opacity).toBe("0.5");
  expect(await field(page, "Opacity").inputValue()).toBe("50");

  // all of it is in the saved document
  await waitSaved(page);
  const { file } = await exportProject(page, testInfo.outputPath(), "simple");
  const props = (file.snapshot.document.layers as Record<string, { properties: Record<string, unknown> }>)[id].properties;
  expect(props).toMatchObject({ "frame.x": 260, "frame.y": 310, "frame.width": 220, "frame.height": 90, "svg.fill": "#ff0000", "svg.stroke": "#0000ff", "svg.strokeWidth": 4, "shape.cornerRadius": 16, "appearance.opacity": 0.5 });

  // each control was one undo step: opacity, radius, then the stroke (width then colour)
  await undo(page);
  await expect.poll(async () => (await view(page, id))?.opacity).toBe("1");
  await undo(page);
  await expect.poll(async () => (await view(page, id))?.rx).not.toBe("16");
  await undo(page);
  await expect.poll(async () => (await view(page, id))?.strokeWidth).not.toBe("4");
  expect((await view(page, id))!.fill).toBe("#ff0000");
});

test("Phase 33: a text layer's words and colour, and a frame's fill, stroke and radius", async ({ page }) => {
  await ready(page);
  const t = await draw(page, "t", { x: 150, y: 700, w: 300, h: 60 });
  await page.keyboard.type("Hello");
  await page.keyboard.press("Escape");
  await expect(face(page).getByRole("group").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).resolves.toEqual(["Position", "Size", "Fill", "Opacity", "Text"]);
  await field(page, "Text").fill("Goodbye");
  await field(page, "Text").press(`${MOD}+Enter`); // Enter is a new line in the text box; Cmd/Ctrl+Enter applies
  await expect.poll(async () => (await view(page, t))?.text).toBe("Goodbye");
  await setText(page, "Fill", "#336699");
  await expect.poll(async () => (await view(page, t))?.color).toBe("rgb(51, 102, 153)");
  await undo(page);
  await expect.poll(async () => (await view(page, t))?.color).not.toBe("rgb(51, 102, 153)");

  const f = await draw(page, "f", { x: 700, y: 500, w: 300, h: 200 });
  await expect(face(page).getByRole("group").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).resolves.toEqual(["Position", "Size", "Fill", "Stroke", "Corner radius", "Opacity"]);
  await setText(page, "Fill", "#00ff00");
  await expect.poll(async () => (await view(page, f))?.background).toBe("rgb(0, 255, 0)");
  await setNumber(page, "Stroke width", "3");
  await expect.poll(async () => (await view(page, f))?.borderWidth).toBe("3px");
  expect((await view(page, f))!.borderStyle).toBe("solid");
  await setNumber(page, "Radius", "20");
  await expect.poll(async () => (await view(page, f))?.radius).toBe("20px");
});

test("Phase 33: several layers show Mixed where they differ, and one change sets them all", async ({ page }) => {
  await ready(page);
  const a = await draw(page, "r", { x: 100, y: 300, w: 120, h: 80 });
  const b = await draw(page, "r", { x: 300, y: 300, w: 120, h: 80 });
  await page.mouse.move(700, 300);
  await page.keyboard.press("Control+a"); // all siblings: the two rectangles and whatever else the frame holds
  const g = await frameGeom(page);
  // select just the two: click one, Shift-click the other
  await page.mouse.click(g.left + 160 * g.zoom, g.top + 340 * g.zoom);
  await page.keyboard.down("Shift");
  await page.mouse.click(g.left + 360 * g.zoom, g.top + 340 * g.zoom);
  await page.keyboard.up("Shift");
  await expect.poll(() => page.locator(".canvas-overlay__selection:not([hidden])").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.layerId).sort())).toEqual([a, b].sort());

  expect(await field(page, "X").inputValue(), "X differs").toBe("");
  await expect(field(page, "X")).toHaveAttribute("placeholder", "Mixed");
  expect(Math.abs(Number(await field(page, "Y").inputValue()) - 300), "Y is the same, so it shows").toBeLessThanOrEqual(3);

  const leftA = (await view(page, a))!.left;
  await setNumber(page, "Y", "420");
  await expect.poll(async () => (await view(page, a))?.top).toBe(420);
  expect((await view(page, b))!.top).toBe(420);
  expect((await view(page, a))!.left, "X was not touched").toBe(leftA);
  await setText(page, "Fill", "#123456");
  await expect.poll(async () => (await view(page, b))?.fill).toBe("#123456");
  expect((await view(page, a))!.fill).toBe("#123456");
  await undo(page);
  await expect.poll(async () => (await view(page, b))?.fill).not.toBe("#123456");
  expect((await view(page, a))!.fill, "one undo step for both layers").not.toBe("#123456");
});

test("Phase 33: a layer placed by its parent's layout can be moved, and the Pro face is one click away", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Expand RootContainer" }).click();
  await page.locator('[data-layer-row="el_buy_button"]').click();
  await expect(field(page, "X")).toBeVisible();
  const before = (await view(page, "el_buy_button"))!;
  await setNumber(page, "X", "120");
  await expect.poll(async () => (await view(page, "el_buy_button"))?.left).toBe(120);
  expect(Math.abs((await view(page, "el_buy_button"))!.by - before.by), "only X moved").toBeLessThanOrEqual(1);

  await page.getByRole("tab", { name: "Pro" }).click();
  await expect(face(page)).toHaveCount(0);
  await page.getByRole("tab", { name: "Simple" }).click();
  await expect(face(page)).toBeVisible();
});
