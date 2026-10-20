/**
 * ROADMAP Phase 38 gate, in Chromium, Firefox and WebKit: any Google font or your own font on the canvas. The test
 * fonts (`fixtures/make-fonts.py`) make which font drew a piece of text readable from its width: at 40 px "AAAA"
 * is 160 px in Probe.ttf (an uploaded file) and 320 px in Remote.ttf (served in place of Google's file), and no
 * ordinary fallback font is either.
 */
import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { openEditor, waitSaved } from "./support/editor";

const STAGE = 'iframe[title="Stage"]';
const PROBE = join(__dirname, "fixtures", "Probe.ttf");
const REMOTE = readFileSync(join(__dirname, "fixtures", "Remote.ttf"));

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

const frameGeom = (page: Page) =>
  page.evaluate((sel) => {
    const iframe = document.querySelector<HTMLIFrameElement>(sel)!;
    const r = iframe.getBoundingClientRect();
    return { left: r.left, top: r.top, zoom: r.width / iframe.clientWidth };
  }, STAGE);

/** Draws a text box, types "AAAA", sets 40 px and auto width; leaves it selected with the Pro face open. */
async function textLayer(page: Page): Promise<string> {
  const g = await frameGeom(page);
  const from = { x: g.left + 150 * g.zoom, y: g.top + 600 * g.zoom };
  await page.mouse.move(from.x, from.y);
  await page.keyboard.press("t");
  await page.mouse.down();
  await page.mouse.move(from.x + 100 * g.zoom, from.y + 30 * g.zoom, { steps: 3 });
  await page.mouse.move(from.x + 400 * g.zoom, from.y + 60 * g.zoom, { steps: 3 });
  await page.mouse.up();
  const editor = page.locator(".canvas-text-editor");
  await expect(editor).toBeFocused();
  const id = (await editor.getAttribute("data-layer-id"))!;
  await page.keyboard.type("AAAA");
  await page.keyboard.press("Escape");
  await expect(editor).toHaveCount(0);
  await page.getByRole("tab", { name: "Pro" }).click();
  const text = page.getByRole("group", { name: "Text", exact: true });
  await text.getByLabel("Size", { exact: true }).fill("40");
  await text.getByLabel("Size", { exact: true }).press("Enter");
  await page.getByRole("group", { name: "Text box sizing" }).getByRole("button", { name: "Auto width" }).click();
  return id;
}

/** The text layer as the stage draws it: its width and the font it was asked for. */
const view = (page: Page, id: string) =>
  page.evaluate(({ sel, id }) => {
    const el = document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelector<HTMLElement>(`[data-element-id="${id}"]`);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { width: Math.round(el.getBoundingClientRect().width), family: cs.fontFamily, variation: cs.fontVariationSettings, weight: cs.fontWeight };
  }, { sel: STAGE, id });

/** The selection outline on the canvas, in canvas px: it must follow the text when a font arrives. */
const outlineWidth = (page: Page) => page.locator(".canvas-overlay__selection:not([hidden])").first().evaluate((el) => Math.round(parseFloat((el as HTMLElement).style.width)));

const text = (page: Page) => page.getByRole("group", { name: "Text", exact: true });
async function chooseFont(page: Page, family: string) {
  await text(page).getByRole("button", { name: "Font family" }).click();
  await page.getByRole("searchbox", { name: "Search fonts" }).fill(family);
  await page.getByRole("option", { name: family, exact: true }).click();
}

test("Phase 38: an uploaded font renders on the canvas, and after a reload", async ({ page }) => {
  await ready(page);
  const id = await textLayer(page);
  const fallback = (await view(page, id))!.width;
  expect([160, 320], "an ordinary font isn't one of the test fonts").not.toContain(fallback);

  // upload a font from the picker: it becomes the layer's font
  await text(page).getByRole("button", { name: "Font family" }).click();
  await page.getByLabel("Upload a font file").setInputFiles(PROBE);
  await expect.poll(async () => (await view(page, id))?.width, "AAAA at 40 px in Probe, whose A is one em").toBe(160);
  expect((await view(page, id))!.family).toContain("Probe");
  // and it is listed under "In this project" the next time
  await text(page).getByRole("button", { name: "Font family" }).click();
  await expect(page.getByRole("group", { name: "In this project" }).getByRole("option", { name: "Probe" })).toBeVisible();
  await page.keyboard.press("Escape");
  await waitSaved(page);

  // after a reload the font is still there: the file comes from the asset store, the layer names the family
  await page.reload();
  await page.waitForFunction((args) => !!document.querySelector<HTMLIFrameElement>(args.sel)?.contentDocument?.querySelector(`[data-element-id="${args.id}"]`), { sel: STAGE, id }, { timeout: 30_000 });
  await expect.poll(async () => (await view(page, id))?.width).toBe(160);
});

test("Phase 38: a Google font loads only when used, and the layout follows it without a jump", async ({ page }) => {
  const requested: string[] = [];
  await page.route("https://fonts.googleapis.com/**", async (route) => {
    requested.push(route.request().url());
    await new Promise((r) => setTimeout(r, 3000)); // the font arrives late, as on a slow network
    await route.fulfill({ contentType: "text/css", headers: { "access-control-allow-origin": "*" }, body: "@font-face{font-family:'Lobster';font-style:normal;font-weight:400;src:url(https://fonts.gstatic.com/s/lobster/remote.ttf) format('truetype')}" });
  });
  await page.route("https://fonts.gstatic.com/**", (route) => route.fulfill({ contentType: "font/ttf", headers: { "access-control-allow-origin": "*" }, body: REMOTE }));

  await ready(page);
  const id = await textLayer(page);
  expect(requested.filter((u) => u.includes("Lobster")), "nothing is requested for a font no layer uses").toEqual([]);
  const before = (await view(page, id))!.width;

  await text(page).getByLabel("Weight", { exact: true }).selectOption("400"); // Lobster has only a regular: a bolder weight would be drawn smeared wider by Firefox and Safari
  await chooseFont(page, "Lobster");
  // the request names the family and its axes, and asks for the project's display setting
  await expect.poll(() => requested.some((u) => u.includes("Lobster"))).toBe(true);
  const url = requested.find((u) => u.includes("Lobster"))!;
  expect(url).toContain("family=Lobster:wght@400");
  expect(url).toContain("display=swap");
  expect(requested.find((u) => u.includes("Inter"))!, "a variable family asks for its whole range and axes").toContain("family=Inter:opsz,wght@14..32,100..900");
  // meanwhile the text is drawn in the fallback, and the selection outline matches it
  const waiting = (await view(page, id))!.width;
  expect(waiting).not.toBe(320);
  expect(Math.abs((await outlineWidth(page)) - waiting)).toBeLessThanOrEqual(2);

  // the font arrives: the text is 320 px wide and the outline follows it (no stale box)
  await expect.poll(async () => (await view(page, id))?.width, { timeout: 15_000 }).toBe(320);
  await expect.poll(async () => await outlineWidth(page)).toBe(320);
  expect(before).not.toBe(320);
});

test("Phase 38: weights come from the family, variable axes are sliders, and font loading is a project setting", async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ contentType: "text/css", body: "/* mocked */" }));
  await ready(page);
  const id = await textLayer(page);

  // a static family offers the weights it has
  await chooseFont(page, "Roboto");
  const weights = await text(page).getByLabel("Weight", { exact: true }).locator("option").allTextContents();
  expect(weights, "its own weights (and the layer's current one)").toEqual(expect.arrayContaining(["100", "300", "400", "500", "700", "900"]));
  expect(weights.filter((w) => !["100", "300", "400", "500", "700", "900"].includes(w)).length).toBeLessThanOrEqual(1);
  await text(page).getByLabel("Weight", { exact: true }).selectOption("300");
  await expect.poll(async () => (await view(page, id))?.weight).toBe("300");
  await expect(text(page).getByRole("group", { name: /axis$/ })).toHaveCount(0);

  // a variable family offers its axes
  await chooseFont(page, "Roboto Flex");
  await expect(text(page).getByRole("group", { name: /axis$/ })).toHaveCount(3);
  await text(page).getByLabel("Width value").fill("80");
  await text(page).getByLabel("Width value").press("Enter");
  await expect.poll(async () => (await view(page, id))?.variation ?? "").toContain('"wdth" 80');
  // choosing another family clears the axes
  await chooseFont(page, "Roboto");
  await expect.poll(async () => (await view(page, id))?.variation ?? "").toBe("normal");

  // font loading is the project's: the stylesheet asks for what was chosen
  await text(page).getByLabel("Font loading").selectOption("block");
  await expect.poll(() => page.evaluate((sel) => document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelector<HTMLLinkElement>("link[data-ll-fonts-google]")?.href ?? "", STAGE)).toContain("display=block");
  await text(page).getByLabel("Font loading").selectOption("swap");
  await expect.poll(() => page.evaluate((sel) => document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelector<HTMLLinkElement>("link[data-ll-fonts-google]")?.href ?? "", STAGE)).toContain("display=swap");

  // the search narrows the list
  await text(page).getByRole("button", { name: "Font family" }).click();
  await page.getByRole("searchbox", { name: "Search fonts" }).fill("mono");
  expect(await page.getByRole("option").allTextContents()).toEqual(expect.arrayContaining(["Roboto Mono", "JetBrains Mono"]));
  await page.getByRole("searchbox", { name: "Search fonts" }).fill("no such font");
  await expect(page.getByText("No font matches.")).toBeVisible();
});
