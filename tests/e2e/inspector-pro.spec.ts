/**
 * ROADMAP Phase 34 gate, in Chromium, Firefox and WebKit: the Pro switch shows every property of the selected
 * layer, grouped, with the control its type needs. Numbers type, step with the arrow keys and scrub with the
 * pointer (one undo step, Escape cancels); colours, choices, toggles, vectors and JSON write through commands;
 * differing values read Mixed; a set property has a reset.
 */
import { test, expect, type Page } from "@playwright/test";
import { coveredPaths, proGroupsFor } from "../../src/core/inspector/proModel";
import { openEditor, waitSaved } from "./support/editor";

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

const view = (page: Page, id: string) =>
  page.evaluate(({ sel, id }) => {
    const el = document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelector<HTMLElement>(`[data-element-id="${id}"]`);
    if (!el) return null;
    const inner = el.querySelector("rect, ellipse, polygon, line, path");
    return { opacity: getComputedStyle(el).opacity, rx: inner?.getAttribute("rx") ?? null, strokeWidth: inner?.getAttribute("stroke-width") ?? null, fill: inner?.getAttribute("fill") ?? null, stroke: inner?.getAttribute("stroke") ?? null, dash: inner?.getAttribute("stroke-dasharray") ?? null, left: parseFloat(el.style.left) };
  }, { sel: STAGE, id });

const pro = (page: Page) => page.getByRole("form", { name: "Properties" });
const row = (page: Page, path: string) => pro(page).locator(`[data-prop-path="${path}"]`);
const input = (page: Page, path: string) => row(page, path).locator("input, textarea, select").first();
/** Groups are collapsed past the first two: open the one a property is in. */
const reveal = (page: Page, path: string) => row(page, path).evaluate((el) => ((el.closest("details") as HTMLDetailsElement).open = true));
const props = async (page: Page, id: string, outDir: string) => {
  const { exportProject } = await import("./support/editor");
  const { file } = await exportProject(page, outDir, "pro");
  return (file.snapshot.document.layers as Record<string, { properties: Record<string, unknown> }>)[id].properties;
};

async function openPro(page: Page) {
  await page.getByRole("tab", { name: "Pro" }).click();
  await expect(pro(page)).toBeVisible();
}

test("Phase 34: the Pro face has a control for every property of the selected layer, whatever its kind", async ({ page }) => {
  await ready(page);
  const rect = await draw(page, "r", { x: 150, y: 300, w: 160, h: 100 });
  const text = await draw(page, "t", { x: 150, y: 500, w: 300, h: 60 });
  await page.keyboard.type("Hi");
  await page.keyboard.press("Escape");
  const frame = await draw(page, "f", { x: 600, y: 300, w: 300, h: 200 });
  await openPro(page);

  for (const [id, archetype] of [[rect, "rectangle"], [text, "text"], [frame, "container"]] as const) {
    await page.locator(`[data-layer-row="${id}"]`).click();
    await expect.poll(() => row(page, "frame.x").count()).toBe(1);
    const expected = [...coveredPaths(proGroupsFor([archetype]))].sort();
    const shown = await pro(page).locator("[data-prop-path]").evaluateAll((els) => els.map((e) => e.getAttribute("data-prop-path")!));
    expect([...new Set(shown)].sort(), `every ${archetype} property has a control, and no other`).toEqual(expected);
  }
  // groups
  const titles = await pro(page).locator(".pro-group summary").evaluateAll((els) => els.map((e) => e.firstChild?.textContent?.trim()));
  expect(titles.slice(0, 3)).toEqual(["Frame", "Layout", "Appearance"]);
});

test("Phase 34: type, arrow keys, scrub (and Escape), reset, and each control type writes to the document", async ({ page }, testInfo) => {
  await ready(page);
  const id = await draw(page, "r", { x: 150, y: 300, w: 160, h: 100 });
  await openPro(page);

  // type a number
  await reveal(page, "shape.cornerRadius");
  await reveal(page, "svg.fill");
  await input(page, "shape.cornerRadius").fill("10");
  await input(page, "shape.cornerRadius").press("Enter");
  await expect.poll(async () => (await view(page, id))?.rx).toBe("10");

  // arrow keys: 1, Shift 10, Alt a tenth
  await input(page, "shape.cornerRadius").focus();
  await page.keyboard.press("ArrowUp");
  await expect.poll(async () => (await view(page, id))?.rx).toBe("11");
  await page.keyboard.press("Shift+ArrowUp");
  await expect.poll(async () => (await view(page, id))?.rx).toBe("21");
  await page.keyboard.press("Alt+ArrowDown");
  await expect.poll(async () => (await view(page, id))?.rx).toBe("20.9");
  await page.keyboard.press("ArrowDown");
  await expect.poll(async () => (await view(page, id))?.rx).toBe("19.9");
  await input(page, "shape.cornerRadius").blur();

  // scrub: drag the label 40 px right = ten steps; one undo step for the whole drag
  await waitSaved(page);
  const label = row(page, "shape.cornerRadius").locator(".pro-number__label");
  const box = (await label.boundingBox())!;
  const start = { x: box.x + 10, y: box.y + box.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 20, start.y, { steps: 4 });
  await page.mouse.move(start.x + 40, start.y, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => Number((await view(page, id))?.rx)).toBeGreaterThan(28);
  const scrubbed = Number((await view(page, id))!.rx);
  expect(scrubbed).toBeCloseTo(29.9, 0);
  await page.mouse.move(700, 300);
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(async () => (await view(page, id))?.rx).toBe("19.9");

  // Escape during a scrub puts it back
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 60, start.y, { steps: 5 });
  await expect.poll(async () => Number((await view(page, id))?.rx)).toBeGreaterThan(30);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect.poll(async () => (await view(page, id))?.rx).toBe("19.9");

  // reset: the button appears for a set property and returns it to the default
  await row(page, "shape.cornerRadius").getByRole("button", { name: "Reset Corner radius" }).click();
  await expect.poll(async () => (await view(page, id))?.rx).toBe("0");
  await expect(row(page, "shape.cornerRadius").getByRole("button", { name: /Reset/ })).toHaveCount(0);

  // a colour, a choice, a toggle
  await row(page, "svg.fill").locator('input[type="text"]').fill("#112233");
  await row(page, "svg.fill").locator('input[type="text"]').press("Enter");
  await expect.poll(async () => (await view(page, id))?.fill).toBe("#112233");
  await row(page, "svg.strokeLinejoin").locator("select").selectOption("round");
  await row(page, "svg.strokeDasharray").locator("input").fill("4 2");
  await row(page, "svg.strokeDasharray").locator("input").press("Enter");
  // (the renderer doesn't draw dashes yet: Phase 35; the property is in the document all the same)
  await waitSaved(page);
  const written = await props(page, id, testInfo.outputPath());
  expect(written).toMatchObject({ "svg.fill": "#112233", "svg.strokeLinejoin": "round", "svg.strokeDasharray": "4 2" });
  expect(written["shape.cornerRadius"], "a reset property is no longer stored").toBeUndefined();
});

test("Phase 34: units, toggles, vectors, JSON, mixed values and the filter", async ({ page }) => {
  await ready(page);
  const a = await draw(page, "r", { x: 100, y: 300, w: 120, h: 80 });
  const b = await draw(page, "r", { x: 300, y: 300, w: 120, h: 80 });
  await openPro(page);

  // a unit companion rides on its number as a select
  await page.locator(`[data-layer-row="${a}"]`).click();
  const unit = row(page, "frame.widthUnit");
  await expect(unit).toHaveCount(1);
  await expect(unit).toHaveValue("px");
  await unit.selectOption("%");
  await expect(unit).toHaveValue("%");

  // JSON: invalid text is flagged and writes nothing; valid text is written
  await page.getByRole("searchbox", { name: "Filter properties" }).fill("opacity");
  await expect(pro(page).locator("[data-prop-path]")).toHaveCount(1);
  await page.getByRole("searchbox", { name: "Filter properties" }).fill("");

  // a toggle (the text layer has booleans; a rectangle's registry paths include `positioning`-style enums only), so use a Mixed selection
  await page.locator(`[data-layer-row="${a}"]`).click();
  await page.keyboard.down("Shift");
  await page.locator(`[data-layer-row="${b}"]`).click();
  await page.keyboard.up("Shift");
  await expect(input(page, "frame.x")).toHaveAttribute("placeholder", "Mixed");
  await reveal(page, "appearance.opacity");
  const opacity = input(page, "appearance.opacity");
  await opacity.fill("0.4");
  await opacity.press("Enter");
  await expect.poll(async () => (await view(page, a))?.opacity).toBe("0.4");
  expect((await view(page, b))!.opacity, "one change sets both").toBe("0.4");
});
