/**
 * ROADMAP Phase 21 gate: several frames side by side, each its own stage host; the header's Desktop / Tablet /
 * Mobile switch creates or focuses frames of those sizes; add, duplicate, rename, reorder and delete; three
 * frames survive a reload; the backdrop can be light, dark or a checkerboard.
 */
import { test, expect, type Page } from "@playwright/test";
import { openEditor, waitSaved } from "./support/editor";

const FRAME = ".canvas-frame";

/** The header's Desktop / Tablet / Mobile switch (the frames' own titles carry the same words). */
const device = (page: Page, name: string) => page.getByRole("radiogroup", { name: "Device Preview Target" }).getByRole("button", { name, exact: true });

async function mountDemo(page: Page) {
  await page.getByRole("button", { name: "Mount Showcase Demo" }).click();
  await page.waitForFunction(() => !!document.querySelector<HTMLIFrameElement>('.canvas-frame iframe')?.contentDocument?.querySelector("[data-element-id]"));
  await waitSaved(page);
}

/** Each frame's id, title and on-canvas size, left to right. */
const frames = (page: Page) =>
  page.evaluate((sel) =>
    Array.from(document.querySelectorAll<HTMLElement>(sel)).map((el) => ({
      id: el.dataset.frameId!,
      name: el.querySelector(".canvas-frame__name")?.textContent ?? "",
      width: parseFloat(el.style.width),
      height: parseFloat(el.style.height),
      left: parseFloat(el.style.left),
    })), FRAME);

test("Phase 21: Desktop, Tablet and Mobile are three frames, each its own stage, and they survive a reload", async ({ page }) => {
  await openEditor(page);
  await mountDemo(page);
  expect(await frames(page)).toHaveLength(1);

  await device(page, "Tablet").click();
  await device(page, "Mobile").click();
  await expect(page.locator(FRAME)).toHaveCount(3);
  // switching back to a size that exists focuses its frame instead of adding another
  await device(page, "Tablet").click();
  await device(page, "Desktop").click();
  await expect(page.locator(FRAME)).toHaveCount(3);
  await waitSaved(page);

  const before = await frames(page);
  expect(before.map((f) => [f.width, f.height])).toEqual([[1440, 900], [768, 1024], [375, 812]]);
  expect(before[1].left).toBeGreaterThan(before[0].left + 1440);

  // each frame is its own browsing context with its own stage host
  const docs = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLIFrameElement>(".canvas-frame iframe")).map((f) => ({ frameId: f.dataset.frameId, href: f.contentDocument?.location.pathname, width: f.contentWindow?.innerWidth })));
  expect(new Set(docs.map((d) => d.frameId)).size).toBe(3);
  expect(docs.every((d) => d.href === "/stage-frame.html")).toBe(true);
  expect(docs.map((d) => d.width), "media queries inside a frame see the frame's own width").toEqual([1440, 768, 375]);

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator(FRAME)).toHaveCount(3);
  const after = await frames(page);
  expect(after.map(({ id, name, width, height }) => ({ id, name, width, height }))).toEqual(before.map(({ id, name, width, height }) => ({ id, name, width, height })));
});

test("Phase 21: add a custom frame, rename, resize, duplicate, reorder and delete", async ({ page }) => {
  await openEditor(page);
  await mountDemo(page);

  await page.getByRole("button", { name: "Frame", exact: true }).click();
  await page.getByLabel("Custom frame width").fill("500");
  await page.getByLabel("Custom frame height").fill("400");
  await page.getByRole("menuitem", { name: "Add", exact: true }).click();
  await expect(page.locator(FRAME)).toHaveCount(2);
  expect((await frames(page))[1]).toMatchObject({ name: "Custom", width: 500, height: 400 });

  // rename by double-click
  await page.locator(`${FRAME} .canvas-frame__name`).nth(1).dblclick();
  await page.getByLabel("Rename Custom").fill("Promo");
  await page.keyboard.press("Enter");
  await expect(page.locator(`${FRAME} .canvas-frame__name`).nth(1)).toHaveText("Promo");

  // resize from the title's size field
  await page.getByLabel("Promo width").fill("620");
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await frames(page))[1].width).toBe(620);

  // duplicate
  await page.getByRole("button", { name: "Duplicate Promo" }).click({ force: true });
  await expect(page.locator(FRAME)).toHaveCount(3);
  expect((await frames(page))[2].name).toBe("Promo copy");

  // reorder: move the copy left of Promo
  await page.getByRole("button", { name: "Move Promo copy left" }).click({ force: true });
  await expect.poll(async () => (await frames(page)).map((f) => f.name)).toEqual([expect.any(String), "Promo copy", "Promo"]);
  const row = await frames(page);
  expect(row[2].left, "no overlap after a reorder").toBeGreaterThanOrEqual(row[1].left + row[1].width);

  // delete
  await page.getByRole("button", { name: "Delete Promo copy" }).click({ force: true });
  await expect(page.locator(FRAME)).toHaveCount(2);
});

test("Phase 21: the backdrop can be light, dark or a checkerboard", async ({ page }) => {
  await openEditor(page);
  await mountDemo(page);
  const stage = page.locator(".whiteboard-stage");
  for (const [label, value] of [["Dark", "dark"], ["Checkerboard", "checker"], ["Light", "light"]] as const) {
    await page.getByRole("group", { name: "Canvas backdrop" }).getByRole("button", { name: label }).click();
    await expect(stage).toHaveAttribute("data-backdrop", value);
  }
});

test("Phase 21: the header switch and the frames own the active frame", async ({ page }) => {
  await openEditor(page);
  await mountDemo(page);
  await device(page, "Mobile").click();
  await expect(page.locator(FRAME)).toHaveCount(2);
  const ids = (await frames(page)).map((f) => f.id);
  await device(page, "Desktop").click();
  await expect(page.locator(`${FRAME}[data-frame-id="${ids[0]}"]`)).toHaveClass(/canvas-frame--active/);
  await device(page, "Mobile").click();
  await expect(page.locator(`${FRAME}[data-frame-id="${ids[1]}"]`)).toHaveClass(/canvas-frame--active/);
  await expect(page.locator(`${FRAME}[data-frame-id="${ids[0]}"]`)).not.toHaveClass(/canvas-frame--active/);
});
