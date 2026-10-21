/**
 * ROADMAP Phase 45 gate, in Chromium, Firefox and WebKit: a fixture restyles completely when the mode changes
 * (every layer bound to a variable shows the other mode's value) and detached values stay put; changing one colour
 * variable in the Tokens tab updates every layer bound to it; editing a bound value by hand detaches it, the
 * inspector says so and can bind it again; a text style restyles every layer that follows it; deleting a variable
 * keeps the look and undoes in one step.
 */
import { test, expect, type Page } from "@playwright/test";
import { openEditor, waitSaved } from "./support/editor";

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

type Doc = { commands: { addLayer: (input: unknown, label?: string) => string; updateProps: (id: string, patch: Record<string, unknown>) => void }; get: () => { layers: Record<string, { children: string[]; properties: Record<string, unknown>; tokens?: Record<string, { variable: string; detached?: boolean }>; styleRefs?: Record<string, string> }>; variables?: Record<string, { id: string; name: string; values: Record<string, unknown> }>; styles?: Record<string, { id: string; name: string }> } };
type Reg = { all: () => { id: string; run: (a?: unknown) => unknown }[] };
const run = (page: Page, id: string, args?: unknown) => page.evaluate(({ id, args }) => (window as unknown as { __LL_COMMANDS__: Reg }).__LL_COMMANDS__.all().find((c) => c.id === id)!.run(args), { id, args });
const select = (page: Page, ids: string[]) => run(page, "selection.set", { ids });
const layer = (page: Page, id: string) => page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().layers[id], id);
const variables = (page: Page) => page.evaluate(() => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().variables ?? {});

/** The computed value of a CSS property of a layer, as the stage draws it. */
const css = (page: Page, id: string, prop: string) =>
  page.evaluate(
    ({ id, prop }) => {
      const d = Array.from(document.querySelectorAll("iframe")).map((f) => f.contentDocument).find((c) => c?.querySelector(`[data-element-id="${id}"]`));
      const el = d?.querySelector<HTMLElement>(`[data-element-id="${id}"]`);
      return el ? (d!.defaultView!.getComputedStyle(el) as unknown as Record<string, string>)[prop] : null;
    },
    { id, prop },
  );

async function build(page: Page) {
  return page.evaluate(() => {
    const doc = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__;
    const reg = (window as unknown as { __LL_COMMANDS__: Reg }).__LL_COMMANDS__;
    const call = (id: string, args: unknown) => reg.all().find((c) => c.id === id)!.run(args) as { id?: string };
    const frame = doc.commands.addLayer({ archetype: "container", parentId: null, name: "Page", properties: { positioning: "absolute", "frame.x": 3000, "frame.y": 0, "frame.width": 800, "frame.height": 500, "layout.padding": 0, "appearance.background.color": "#ffffff" } });
    const card = (name: string, x: number, extra: Record<string, unknown> = {}) =>
      doc.commands.addLayer({ archetype: "container", parentId: frame, name, properties: { positioning: "absolute", "frame.x": x, "frame.y": 20, "frame.width": 100, "frame.height": 80, "layout.padding": 0, "appearance.background.color": "#ffffff", "appearance.radius": 2, ...extra } });
    const cards = [card("c1", 10), card("c2", 130), card("c3", 250), card("c4", 370)];
    const text = (name: string, x: number, size: number) =>
      doc.commands.addLayer({ archetype: "text", parentId: frame, name, properties: { positioning: "absolute", "frame.x": x, "frame.y": 200, "frame.width": 120, "frame.height": 30, "content.text": "Hello", "typography.fontSize": size, "typography.fontWeight": "400", "typography.color": "#111111" } });
    const texts = [text("t1", 10, 14), text("t2", 150, 12)];
    const surface = call("token.createVariable", { name: "surface/bg", type: "color", values: { light: "#ffffff", dark: "#101010" } }).id!;
    const ink = call("token.createVariable", { name: "ink/text", type: "color", values: { light: "#111111", dark: "#eeeeee" } }).id!;
    const radius = call("token.createVariable", { name: "radius/card", type: "number", values: { light: 4 } }).id!;
    for (const [i, c] of cards.entries()) {
      if (i < 3) call("token.bind", { path: "appearance.background.color", variable: surface, ids: [c] });
      call("token.bind", { path: "appearance.radius", variable: radius, ids: [c] });
    }
    // c4 is detached: it was bound and let go, and has its own colour
    call("token.bind", { path: "appearance.background.color", variable: surface, ids: [cards[3]] });
    call("token.detach", { path: "appearance.background.color", ids: [cards[3]] });
    doc.commands.updateProps(cards[3], { "appearance.background.color": "#ff8800" });
    for (const t of texts) call("token.bind", { path: "typography.color", variable: ink, ids: [t] });
    return { frame, cards, texts, surface, ink, radius };
  });
}

const bar = (page: Page) => page.getByRole("toolbar", { name: "Breakpoints" });

test.describe("Phase 45: design tokens", () => {
  test("switching to Dark restyles every bound layer; the detached one stays put; Light brings it back", async ({ page }) => {
    await ready(page);
    const { cards, texts } = await build(page);
    await expect.poll(() => css(page, cards[0], "backgroundColor")).toBe("rgb(255, 255, 255)");
    await expect.poll(() => css(page, cards[0], "borderRadius")).toBe("4px");
    await bar(page).getByRole("button", { name: "Mode: Dark" }).click();
    for (const c of cards.slice(0, 3)) await expect.poll(() => css(page, c, "backgroundColor")).toBe("rgb(16, 16, 16)");
    await expect.poll(() => css(page, texts[0], "color")).toBe("rgb(238, 238, 238)");
    expect(await css(page, cards[3], "backgroundColor")).toBe("rgb(255, 136, 0)"); // detached: its own colour in every mode
    // the saved document still has its own values: tokens are applied for display
    expect((await layer(page, cards[0])).properties["appearance.background.color"]).toBe("#ffffff");
    await bar(page).getByRole("button", { name: "Mode: Light" }).click();
    await expect.poll(() => css(page, cards[0], "backgroundColor")).toBe("rgb(255, 255, 255)");
    expect(await css(page, cards[3], "backgroundColor")).toBe("rgb(255, 136, 0)");
    await waitSaved(page); // a document with variables and bindings is accepted by the saver
  });

  test("changing a colour in the Tokens tab updates every layer bound to it, in the mode being viewed", async ({ page }) => {
    await ready(page);
    const { cards } = await build(page);
    await page.locator(".dock-zone--right").getByText("Tokens", { exact: true }).first().click();
    const manager = page.getByRole("region", { name: "Tokens" });
    await expect(manager.locator('[data-variable="surface/bg"]')).toBeVisible();
    await manager.getByLabel("surface/bg in Light", { exact: true }).fill("#336699");
    for (const c of cards.slice(0, 3)) await expect.poll(() => css(page, c, "backgroundColor")).toBe("rgb(51, 102, 153)");
    expect(await css(page, cards[3], "backgroundColor")).toBe("rgb(255, 136, 0)");
    // the Dark value is its own
    await bar(page).getByRole("button", { name: "Mode: Dark" }).click();
    await expect.poll(() => css(page, cards[0], "backgroundColor")).toBe("rgb(16, 16, 16)");
    await manager.getByLabel("surface/bg in Dark", { exact: true }).fill("#223344");
    await expect.poll(() => css(page, cards[0], "backgroundColor")).toBe("rgb(34, 51, 68)");
  });

  test("editing a bound value by hand detaches it, the inspector says so, Re-link binds it again", async ({ page }) => {
    await ready(page);
    const { cards, surface } = await build(page);
    await select(page, [cards[0]]);
    const panel = page.getByRole("region", { name: "Tokens on the selection" });
    await expect(panel.locator('[data-binding="appearance.background.color"]')).toContainText("surface/bg");
    // type a colour into the Fill box of the Simple face
    const fill = page.getByRole("form", { name: "Design" }).locator('input[aria-label="Fill"]');
    await fill.fill("#00aa00");
    await fill.press("Enter");
    await expect.poll(async () => (await layer(page, cards[0])).tokens?.["appearance.background.color"]?.detached).toBe(true);
    await expect(panel.locator('[data-binding="appearance.background.color"]')).toContainText("detached from surface/bg");
    await bar(page).getByRole("button", { name: "Mode: Dark" }).click();
    await expect.poll(() => css(page, cards[0], "backgroundColor")).toBe("rgb(0, 170, 0)");
    await panel.getByRole("button", { name: "Re-link appearance.background.color" }).click();
    await expect.poll(() => css(page, cards[0], "backgroundColor")).toBe("rgb(16, 16, 16)");
    expect((await layer(page, cards[0])).tokens?.["appearance.background.color"]).toEqual({ variable: surface });
  });

  test("Bind from the inspector, and Detach keeps what is shown in the mode being viewed", async ({ page }) => {
    await ready(page);
    const { cards, surface } = await build(page);
    await select(page, [cards[3]]);
    await bar(page).getByRole("button", { name: "Mode: Dark" }).click();
    const panel = page.getByRole("region", { name: "Tokens on the selection" });
    await panel.getByLabel("Variable", { exact: true }).selectOption(surface);
    await panel.getByLabel("Bind to property", { exact: true }).selectOption("appearance.background.color");
    await panel.getByRole("button", { name: "Bind", exact: true }).click();
    await expect.poll(() => css(page, cards[3], "backgroundColor")).toBe("rgb(16, 16, 16)");
    await panel.getByRole("button", { name: "Detach appearance.background.color" }).click();
    expect((await layer(page, cards[3])).properties["appearance.background.color"]).toBe("#101010");
    await bar(page).getByRole("button", { name: "Mode: Light" }).click();
    await expect.poll(() => css(page, cards[3], "backgroundColor")).toBe("rgb(16, 16, 16)"); // it stayed put
  });

  test("a text style: made from one text, applied to another, a change restyles both", async ({ page }) => {
    await ready(page);
    const { texts } = await build(page);
    await select(page, [texts[0]]);
    await page.locator(".dock-zone--right").getByText("Tokens", { exact: true }).first().click();
    const manager = page.getByRole("region", { name: "Tokens" });
    await manager.getByLabel("Token name", { exact: true }).fill("Body");
    await manager.getByRole("button", { name: "New text style from selection" }).click();
    await expect(manager.locator('[data-style="Body"]')).toBeVisible();
    await select(page, [texts[1]]);
    await manager.getByRole("button", { name: "Apply Body" }).click();
    await expect.poll(() => css(page, texts[1], "fontSize")).toBe("14px");
    const id = await page.evaluate(() => Object.values((window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().styles ?? {})[0].id);
    await run(page, "style.update", { id, props: { "typography.fontSize": 22 } });
    await expect.poll(() => css(page, texts[0], "fontSize")).toBe("22px");
    await expect.poll(() => css(page, texts[1], "fontSize")).toBe("22px");
  });

  test("deleting a variable keeps the look, and one undo brings the variable and its bindings back", async ({ page }) => {
    await ready(page);
    const { cards, surface } = await build(page);
    await run(page, "token.deleteVariable", { id: surface });
    expect(Object.keys(await variables(page))).not.toContain(surface);
    await expect.poll(() => css(page, cards[0], "backgroundColor")).toBe("rgb(255, 255, 255)");
    expect((await layer(page, cards[0])).tokens?.["appearance.background.color"]).toBeUndefined();
    await run(page, "edit.undo");
    await expect.poll(async () => Object.keys(await variables(page))).toContain(surface);
    expect((await layer(page, cards[0])).tokens?.["appearance.background.color"]?.variable).toBe(surface);
  });
});
