/**
 * ROADMAP Phase 31 gate, in Chromium, Firefox and WebKit: type directly on the canvas. A text box drawn with the
 * Text tool is typed into at once; Cmd/Ctrl+B styles a selection; Enter makes a new line; paste is plain text;
 * leaving the editor is one undo step; styled runs survive save and reload; sizing modes, the inspector's text
 * properties and an IME composition (Chromium) behave.
 */
import { test, expect, type Page } from "@playwright/test";
import { exportProject, openEditor, waitSaved } from "./support/editor";

const CANVAS = ".whiteboard-stage";
const STAGE = 'iframe[title="Stage"]';
const MOD = process.platform === "darwin" ? "Meta" : "Control";
const EDITOR = ".canvas-text-editor";

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

/** What a layer looks like in the stage: its text, its styled spans and its box. */
const view = (page: Page, id: string) =>
  page.evaluate(({ sel, id }) => {
    const el = document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelector<HTMLElement>(`[data-element-id="${id}"]`);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const b = el.getBoundingClientRect();
    return {
      text: el.textContent,
      spans: Array.from(el.querySelectorAll("span")).map((s) => ({ text: s.textContent, weight: getComputedStyle(s).fontWeight, style: getComputedStyle(s).fontStyle, deco: getComputedStyle(s).textDecorationLine })),
      fontSize: cs.fontSize, textAlign: cs.textAlign, transform: cs.textTransform, letterSpacing: cs.letterSpacing, lineHeight: cs.lineHeight, family: cs.fontFamily, deco: cs.textDecorationLine,
      width: Math.round(b.width), height: Math.round(b.height), visibility: cs.visibility, whiteSpace: cs.whiteSpace,
    };
  }, { sel: STAGE, id });

async function drawText(page: Page, kind: "drag" | "click") {
  const g = await frameGeom(page);
  const before = await layerIds(page);
  const from = { x: g.left + 150 * g.zoom, y: g.top + 700 * g.zoom };
  await page.mouse.move(from.x, from.y);
  await page.keyboard.press("t");
  if (kind === "drag") {
    await page.mouse.down();
    await page.mouse.move(from.x + 150 * g.zoom, from.y + 20 * g.zoom, { steps: 3 });
    await page.mouse.move(from.x + 300 * g.zoom, from.y + 60 * g.zoom, { steps: 3 });
    await page.mouse.up();
  } else {
    await page.mouse.click(from.x, from.y);
  }
  await expect(page.locator(EDITOR)).toBeFocused();
  const id = (await page.locator(EDITOR).getAttribute("data-layer-id"))!;
  expect(before).not.toContain(id);
  return id;
}

/** The caret at the very end of the text: the End key means "end of line" on one platform and "scroll" on another. */
const caretToEnd = (page: Page) =>
  page.locator(EDITOR).evaluate((el) => {
    const sel = el.ownerDocument.getSelection()!;
    const sentinel = el.querySelector('br[data-sentinel="1"]');
    const range = el.ownerDocument.createRange();
    if (sentinel) range.setStartBefore(sentinel);
    else range.selectNodeContents(el);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  });

const editorRuns = (page: Page) =>
  page.locator(EDITOR).evaluate((el) => ({
    text: Array.from(el.childNodes).map((n) => (n.nodeName === "BR" ? ((n as HTMLElement).dataset.sentinel ? "" : "\n") : n.textContent)).join(""),
    bold: Array.from(el.querySelectorAll('span[data-b="1"]')).map((s) => s.textContent),
    italic: Array.from(el.querySelectorAll('span[data-i="1"]')).map((s) => s.textContent),
  }));

test("Phase 31: draw a text box, type, style a word, new line, leave: one undo step; paste is plain text", async ({ page }) => {
  await ready(page);
  const id = await drawText(page, "drag");
  expect((await view(page, id))?.visibility, "the stage's own copy is hidden while the editor is open").toBe("hidden");

  // letters that are tool shortcuts type as letters
  await page.keyboard.type("Hello world rectangle");
  expect(await editorRuns(page)).toMatchObject({ text: "Hello world rectangle" });
  await expect(page.locator(CANVAS)).toHaveAttribute("data-tool", "select");

  // select "world" (a word in the middle) and make it bold
  for (let i = 0; i < "rectangle".length + 1; i++) await page.keyboard.press("ArrowLeft");
  for (let i = 0; i < "world".length; i++) await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press(`${MOD}+b`);
  expect((await editorRuns(page)).bold, "bold applies to the selection").toEqual(["world"]);

  // a new line at the end, then plain-text paste: HTML is dropped, only its text is kept
  await caretToEnd(page);
  await page.keyboard.press("Enter");
  await page.keyboard.type("two");
  await page.locator(EDITOR).evaluate((el) => {
    const dt = new DataTransfer();
    dt.setData("text/plain", " pasted");
    dt.setData("text/html", "<b style='color:red'>HTML</b>");
    // Firefox ignores `clipboardData` in the ClipboardEvent constructor, so the data is attached to a plain event
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: dt });
    el.dispatchEvent(event);
  });
  const typed = await editorRuns(page);
  expect(typed.text).toBe("Hello world rectangle\ntwo pasted");
  expect(typed.bold, "pasting added no styling").toEqual(["world"]);

  // Escape leaves the editor and writes the text and the run in one step
  await page.keyboard.press("Escape");
  await expect(page.locator(EDITOR)).toHaveCount(0);
  const done = (await view(page, id))!;
  expect(done.text).toBe("Hello world rectangle\ntwo pasted");
  expect(done.visibility).toBe("visible");
  expect(done.spans).toHaveLength(1);
  expect(done.spans[0].text).toBe("world");
  expect(Number(done.spans[0].weight)).toBeGreaterThanOrEqual(700);
  await waitSaved(page);

  // one undo takes the whole editing session back; redo brings it back
  await page.mouse.move(400, 300);
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(async () => (await view(page, id))?.text).toBe("");
  await page.keyboard.press(`${MOD}+Shift+z`);
  await expect.poll(async () => (await view(page, id))?.spans.length).toBe(1);
});

test("Phase 31: styled runs survive save and reload; double-click and Enter edit in place", async ({ page }, testInfo) => {
  await ready(page);
  const id = await drawText(page, "drag");
  await page.keyboard.type("Make it bold and italic");
  for (let i = 0; i < "bold and italic".length; i++) await page.keyboard.press("Shift+ArrowLeft");
  // Shift+Left from the end selects backwards from the caret: the selection is "bold and italic"
  await page.keyboard.press(`${MOD}+b`);
  await page.keyboard.press("ArrowRight");
  for (let i = 0; i < "italic".length; i++) await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press(`${MOD}+i`);
  expect(await editorRuns(page)).toMatchObject({ bold: ["bold and ", "italic"], italic: ["italic"] });
  await page.keyboard.press("Escape");
  await waitSaved(page);

  // the document holds the plain text and the runs
  const { file } = await exportProject(page, testInfo.outputPath(), "styled");
  const layer = (file.snapshot.document.layers as Record<string, { properties: Record<string, unknown> }>)[id];
  expect(layer.properties["content.text"]).toBe("Make it bold and italic");
  expect(JSON.parse(layer.properties["content.runs"] as string)).toEqual([{ t: "Make it " }, { t: "bold and ", b: 1 }, { t: "italic", b: 1, i: 1 }]);

  // reload: the same runs come back
  await page.reload();
  await page.waitForFunction((args) => !!document.querySelector<HTMLIFrameElement>(args.sel)?.contentDocument?.querySelector(`[data-element-id="${args.id}"] span`), { sel: STAGE, id }, { timeout: 30_000 });
  const back = (await view(page, id))!;
  expect(back.text).toBe("Make it bold and italic");
  expect(back.spans.map((s) => s.text)).toEqual(["bold and ", "italic"]);
  expect(back.spans[1].style).toBe("italic");

  // double-click opens the editor on the same words, selected; Escape leaves it unchanged
  const box = await page.evaluate(({ sel, id }) => {
    const iframe = document.querySelector<HTMLIFrameElement>(sel)!;
    const r = iframe.getBoundingClientRect();
    const b = iframe.contentDocument!.querySelector<HTMLElement>(`[data-element-id="${id}"]`)!.getBoundingClientRect();
    const s = r.width / iframe.clientWidth;
    return { x: r.left + (b.left + b.width / 2) * s, y: r.top + (b.top + b.height / 2) * s };
  }, { sel: STAGE, id });
  await page.mouse.dblclick(box.x, box.y);
  await expect(page.locator(EDITOR)).toBeFocused();
  expect((await editorRuns(page)).text).toBe("Make it bold and italic");
  await page.keyboard.press("Escape");
  await expect(page.locator(EDITOR)).toHaveCount(0);

  // Enter on the selected layer edits too (the layer is still selected)
  await page.mouse.move(400, 300);
  await page.keyboard.press("Enter");
  await expect(page.locator(EDITOR)).toBeFocused();
  await caretToEnd(page);
  await page.keyboard.type("!");
  await page.keyboard.press(`${MOD}+Enter`);
  await expect(page.locator(EDITOR)).toHaveCount(0);
  expect((await view(page, id))!.text).toBe("Make it bold and italic!");
});

test("Phase 31: the inspector's text properties change the layer, one undo step each", async ({ page }) => {
  await ready(page);
  const id = await drawText(page, "drag");
  await page.keyboard.type("Style me");
  await page.keyboard.press("Escape");
  await expect(page.locator(EDITOR)).toHaveCount(0);
  await page.getByRole("tab", { name: "Pro" }).click(); // the text properties are on the Pro face
  const text = page.getByRole("group", { name: "Text", exact: true });
  await expect(text).toBeVisible();
  const before = (await view(page, id))!;

  await text.getByLabel("Size").fill("40");
  await text.getByLabel("Size").press("Enter");
  await expect.poll(async () => (await view(page, id))?.fontSize).toBe("40px");
  await text.getByLabel("Weight").selectOption("700");
  await text.getByRole("button", { name: "Align text centre" }).click();
  await text.getByLabel("Case").selectOption("uppercase");
  await text.getByLabel("Decoration").selectOption("underline");
  await text.getByLabel("Letter spacing").fill("2");
  await text.getByLabel("Letter spacing").press("Enter");
  await text.getByLabel("Line height").fill("2");
  await text.getByLabel("Line height").press("Enter");
  await text.getByLabel("Font family").selectOption("Georgia");
  await expect.poll(async () => (await view(page, id))?.letterSpacing).toBe("2px");
  const after = (await view(page, id))!;
  expect(after.textAlign).toBe("center");
  expect(after.transform).toBe("uppercase");
  expect(after.deco).toContain("underline");
  expect(after.lineHeight).toBe("80px"); // 2 x 40
  expect(after.family).toContain("Georgia");
  expect(await text.getByRole("button", { name: "Align text centre" }).getAttribute("aria-pressed")).toBe("true");

  // each control was one undo step: undo the family, then everything back to where it started
  await page.mouse.move(400, 300);
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(async () => (await view(page, id))?.family).not.toContain("Georgia");
  for (let i = 0; i < 7; i++) await page.keyboard.press(`${MOD}+z`);
  await expect.poll(async () => (await view(page, id))?.fontSize).toBe(before.fontSize);
  expect((await view(page, id))!.textAlign).toBe(before.textAlign);
});

test("Phase 31: auto width, auto height and fixed size", async ({ page }) => {
  await ready(page);
  const id = await drawText(page, "drag");
  await page.keyboard.type("Short");
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Pro" }).click();
  const sizing = page.getByRole("group", { name: "Text box sizing" });
  const dragged = (await view(page, id))!;
  expect(dragged.width, "a dragged text box keeps the dragged width").toBeGreaterThan(200);

  await sizing.getByRole("button", { name: "Auto width" }).click();
  await expect.poll(async () => (await view(page, id))?.whiteSpace).toBe("pre");
  const narrow = (await view(page, id))!;
  expect(narrow.width, "auto width hugs one short word").toBeLessThan(dragged.width - 50);

  // typing more makes an auto-width box grow along one line
  await page.mouse.move(400, 300);
  await page.keyboard.press("Enter"); // edit the selected layer
  await expect(page.locator(EDITOR)).toBeFocused();
  await caretToEnd(page);
  await page.keyboard.type(" and a much longer line of words");
  await page.keyboard.press("Escape");
  const grown = (await view(page, id))!;
  expect(grown.width).toBeGreaterThan(narrow.width + 100);
  expect(grown.height, "one line, however long").toBe(narrow.height);

  // auto height keeps the width and lets the text wrap
  await sizing.getByRole("button", { name: "Auto height" }).click();
  await expect.poll(async () => (await view(page, id))?.whiteSpace).toBe("pre-wrap");
  const wrapped = (await view(page, id))!;
  expect(Math.abs(wrapped.width - grown.width)).toBeLessThanOrEqual(2);
  await page.getByRole("group", { name: "Text", exact: true }).getByLabel("Size").fill("80");
  await page.getByRole("group", { name: "Text", exact: true }).getByLabel("Size").press("Enter");
  await expect.poll(async () => (await view(page, id))?.height).toBeGreaterThan(wrapped.height * 1.5);

  // fixed size freezes both
  await sizing.getByRole("button", { name: "Fixed size" }).click();
  await expect(sizing.getByRole("button", { name: "Fixed size" })).toHaveAttribute("aria-pressed", "true");
  const fixed = (await view(page, id))!;
  await page.getByRole("group", { name: "Text", exact: true }).getByLabel("Size").fill("20");
  await page.getByRole("group", { name: "Text", exact: true }).getByLabel("Size").press("Enter");
  await expect.poll(async () => (await view(page, id))?.fontSize).toBe("20px");
  expect((await view(page, id))!.height, "a fixed box doesn't follow its text").toBe(fixed.height);
});

test("Phase 31: an IME composition is not interrupted, and commits as typed", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Only Chromium can drive an IME composition from a test (CDP Input.imeSetComposition)");
  await ready(page);
  const id = await drawText(page, "drag");
  const client = await page.context().newCDPSession(page);

  await page.keyboard.type("ab ");
  await client.send("Input.imeSetComposition", { text: "に", selectionStart: 1, selectionEnd: 1 });
  await client.send("Input.imeSetComposition", { text: "にほ", selectionStart: 2, selectionEnd: 2 });
  await expect(page.locator(EDITOR)).toBeFocused();
  expect((await editorRuns(page)).text, "the composition shows while it is being made").toBe("ab にほ");
  // keys that normally leave the editor do nothing mid-composition
  await page.keyboard.press("Escape");
  await expect(page.locator(EDITOR)).toHaveCount(1);
  await client.send("Input.insertText", { text: "日本" });
  expect((await editorRuns(page)).text).toBe("ab 日本");
  await page.keyboard.press(`${MOD}+Enter`);
  await expect(page.locator(EDITOR)).toHaveCount(0);
  expect((await view(page, id))!.text).toBe("ab 日本");
});

test("Phase 31: nothing leaves the editor while a composition is in progress (all browsers, with synthetic composition events)", async ({ page }) => {
  await ready(page);
  const id = await drawText(page, "drag");
  await page.keyboard.type("x");
  const editor = page.locator(EDITOR);
  await editor.evaluate((el) => el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true })));
  // Escape pressed to cancel the candidate window arrives flagged as composing; a blur happens when the candidate window takes focus
  await editor.evaluate((el) => el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", isComposing: true, bubbles: true, cancelable: true })));
  await editor.evaluate((el) => el.dispatchEvent(new FocusEvent("blur")));
  await expect(editor).toHaveCount(1);
  await editor.evaluate((el) => el.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "" })));
  await editor.focus();
  await page.keyboard.press("Escape");
  await expect(editor).toHaveCount(0);
  expect((await view(page, id))!.text).toBe("x");
});
