/**
 * ROADMAP Phase 36 gate, in Chromium, Firefox and WebKit: a file dropped on the canvas becomes an asset and an
 * image layer; the SVG is cleaned; what isn't a picture is refused with a reason; 200 MB of assets survive a
 * reload; a project file carries its pictures into a fresh browser; the browser is asked to keep the storage; and a
 * second tab of the same project opens read-only.
 */
import { test, expect, type Page } from "@playwright/test";
import { exportProject, openEditor, waitSaved } from "./support/editor";

const STAGE = 'iframe[title="Stage"]';
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

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

const layerIds = (page: Page) =>
  page.evaluate((sel) => Array.from(document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!.querySelectorAll("[data-element-id]")).map((e) => (e as HTMLElement).dataset.elementId!), STAGE);

/** What the stage shows for the image layers: their picture's source and whether it decoded. */
const images = (page: Page) =>
  page.evaluate((sel) => {
    const d = document.querySelector<HTMLIFrameElement>(sel)!.contentDocument!;
    return Array.from(d.querySelectorAll<HTMLElement>('[data-archetype="image"]')).map((el) => {
      const img = el.querySelector("img");
      return { id: el.dataset.elementId!, src: img?.getAttribute("src") ?? null, loaded: !!img && img.complete && img.naturalWidth > 0, alt: el.textContent };
    });
  }, STAGE);

/** Drops a file on the canvas, the way the desktop does: a `drop` event with a DataTransfer holding the file. */
async function dropFile(page: Page, name: string, type: string, bytes: number[], at = { x: 0.5, y: 0.5 }) {
  await page.evaluate(
    ({ name, type, bytes, at }) => {
      const stage = document.querySelector(".whiteboard-stage")!;
      const r = stage.getBoundingClientRect();
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(bytes)], name, { type }));
      stage.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, clientX: r.left + r.width * at.x, clientY: r.top + r.height * at.y, bubbles: true, cancelable: true }));
    },
    { name, type, bytes, at },
  );
}

const png = () => Array.from(Buffer.from(PNG_B64, "base64"));
const seam = <T,>(page: Page, fn: string, ...args: unknown[]): Promise<T> =>
  page.evaluate(({ fn, args }) => (window as unknown as { __LL_ASSETS__: Record<string, (...a: unknown[]) => unknown> }).__LL_ASSETS__[fn](...args) as Promise<unknown>, { fn, args }) as Promise<T>;

test("Phase 36: a dropped picture becomes an asset and an image layer, and is still there after a reload", async ({ page }, testInfo) => {
  await ready(page);
  const before = await layerIds(page);
  await dropFile(page, "dot.png", "image/png", png());

  await expect.poll(async () => (await layerIds(page)).length).toBeGreaterThan(before.length);
  await expect.poll(async () => (await images(page)).some((i) => i.src?.startsWith("blob:") && i.loaded), "the picture is drawn from the asset store").toBe(true);
  const [asset] = await seam<{ id: string; kind: string; bytes: number }[]>(page, "list");
  expect(asset.kind).toBe("image");

  // the Assets panel lists it
  await page.locator(".dock-zone--left .dock-tabbar__tab", { hasText: "Assets" }).click();
  await expect(page.getByRole("list", { name: "Imported files" }).getByText("dot.png")).toBeVisible();

  // the document holds the manifest and a layer pointing at the hash
  await waitSaved(page);
  const { file } = await exportProject(page, testInfo.outputPath(), "dropped");
  expect(Object.keys(file.snapshot.document.assets)).toEqual([asset.id]);
  expect(Object.values(file.snapshot.document.layers as Record<string, { properties: Record<string, unknown> }>).some((l) => l.properties["media.src"] === `asset:${asset.id}`)).toBe(true);

  // after a reload the picture still draws
  await page.reload();
  await page.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelector('[data-archetype="image"] img'), STAGE, { timeout: 30_000 });
  await expect.poll(async () => (await images(page)).some((i) => i.src?.startsWith("blob:") && i.loaded)).toBe(true);
});

test("Phase 36: a picture pasted from the clipboard becomes an image layer", async ({ page }) => {
  await ready(page);
  const before = (await images(page)).length;
  await page.mouse.move(700, 400); // the canvas focus scope follows the pointer
  await page.evaluate((bytes) => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(bytes)], "pasted.png", { type: "image/png" }));
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: dt });
    document.dispatchEvent(event);
  }, png());
  await expect.poll(async () => (await images(page)).length).toBeGreaterThan(before);
});

test("Phase 36: a hostile SVG is cleaned before it is stored, and what isn't a picture is refused with a reason", async ({ page }) => {
  await ready(page);
  const evil = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" onload="window.top.__pwned=1"><script>window.top.__pwned=2</script><a href="javascript:window.top.__pwned=3"><circle r="4"/></a><rect width="40" height="40" fill="#336699" onclick="window.top.__pwned=4"/><foreignObject><iframe src="javascript:window.top.__pwned=5"></iframe></foreignObject></svg>';
  await dropFile(page, "evil.svg", "image/svg+xml", Array.from(Buffer.from(evil)));
  await expect.poll(async () => (await seam<unknown[]>(page, "list")).length).toBe(1);
  const [asset] = await seam<{ id: string }[]>(page, "list");
  const stored = (await seam<string>(page, "text", asset.id))!;
  expect(stored).not.toMatch(/script|onload|onclick|javascript|foreignObject|iframe/i);
  expect(stored).toContain("<rect");
  await expect.poll(async () => (await images(page)).some((i) => i.src?.startsWith("blob:") && i.loaded)).toBe(true);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned), "nothing in the SVG ran").toBeUndefined();

  // a text file called .png is refused, with its name and why
  await dropFile(page, "notes.png", "image/png", Array.from(Buffer.from("just some words, not a picture")));
  await expect(page.locator(".asset-notice")).toContainText("notes.png isn't an image, an SVG or a font");
  expect((await seam<unknown[]>(page, "list")).length, "nothing was added").toBe(1);
});

test("Phase 36: 200 MB of assets survive a reload, byte for byte", async ({ page }) => {
  test.setTimeout(240_000);
  await ready(page);
  await seam<void>(page, "fill", 20, 10 * 1024 * 1024);
  const total = await seam<number>(page, "totalBytes");
  expect(total).toBeGreaterThanOrEqual(200 * 1024 * 1024);
  const before = await seam<{ id: string }[]>(page, "list");
  expect(before).toHaveLength(20);
  await waitSaved(page);

  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as { __LL_ASSETS__?: unknown }).__LL_ASSETS__);
  expect(await seam<number>(page, "totalBytes"), "all of it is still there").toBe(total);
  const after = await seam<{ id: string }[]>(page, "list");
  expect(after.map((a) => a.id).sort()).toEqual(before.map((a) => a.id).sort());
  // the bytes are the bytes: the hash of a stored file is its id
  for (const a of [after[0], after[10], after[19]]) expect(await seam<string>(page, "rehash", a.id)).toBe(a.id);
});

test("Phase 36: a project file carries its pictures into a fresh browser", async ({ page, browser }, testInfo) => {
  await ready(page);
  await dropFile(page, "dot.png", "image/png", png());
  await expect.poll(async () => (await images(page)).some((i) => i.loaded)).toBe(true);
  await waitSaved(page);
  const { path, file } = await exportProject(page, testInfo.outputPath(), "carried");
  expect(Object.keys(file.assets.embedded ?? {})).toHaveLength(1);

  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await other.addInitScript(() => {
    (window as unknown as { __LL_TEST__: boolean }).__LL_TEST__ = true;
  });
  await openEditor(other);
  expect((await other.evaluate(() => (window as unknown as { __LL_ASSETS__: { list: () => Promise<unknown[]> } }).__LL_ASSETS__.list())).length, "a fresh browser has no assets").toBe(0);
  await other.getByRole("button", { name: "File", exact: true }).click();
  const [chooser] = await Promise.all([other.waitForEvent("filechooser"), other.getByText("Import Project File...").click()]);
  await chooser.setFiles(path);
  await other.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelector('[data-archetype="image"] img'), STAGE, { timeout: 30_000 });
  await expect.poll(async () => (await images(other)).some((i) => i.src?.startsWith("blob:") && i.loaded), "the picture came with the file").toBe(true);
  await fresh.close();
});

test("Phase 36: the browser is asked once to keep this storage", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __persistCalls: number };
    w.__persistCalls = 0;
    // replace the whole object: WebKit doesn't let a page overwrite the methods of its own StorageManager
    Object.defineProperty(navigator, "storage", { configurable: true, value: { persist: async () => (w.__persistCalls++, true), persisted: async () => false, estimate: async () => ({ usage: 0, quota: 1e12 }) } });
  });
  await ready(page);
  await dropFile(page, "dot.png", "image/png", png()); // an edit, so a save happens
  await waitSaved(page);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __persistCalls: number }).__persistCalls)).toBe(1);
  await dropFile(page, "dot2.png", "image/png", png().map((b, i) => (i === 40 ? b ^ 1 : b)));
  await waitSaved(page);
  expect(await page.evaluate(() => (window as unknown as { __persistCalls: number }).__persistCalls), "not asked again").toBe(1);
});

test("Phase 36: a second tab of the same project opens read-only, and can take over", async ({ page, context }) => {
  await ready(page);
  const url = page.url();
  const second = await context.newPage();
  await second.addInitScript(() => {
    (window as unknown as { __LL_TEST__: boolean }).__LL_TEST__ = true;
  });
  await second.goto(url, { waitUntil: "networkidle" });
  await expect(second.getByRole("status").filter({ hasText: "read-only" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("This project is open in another tab")).toHaveCount(0);

  // the read-only tab can't change the document
  await second.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelector("[data-element-id]"), STAGE, { timeout: 30_000 });
  const count = (await layerIds(second)).length;
  await dropFile(second, "dot.png", "image/png", png());
  await second.waitForTimeout(800);
  expect((await layerIds(second)).length, "nothing was added in the read-only tab").toBe(count);

  // "Edit here instead" swaps the roles
  await second.getByRole("button", { name: "Edit here instead" }).click();
  await expect(second.getByText("This project is open in another tab")).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "read-only" })).toBeVisible();
  await dropFile(second, "dot.png", "image/png", png());
  await expect.poll(async () => (await layerIds(second)).length).toBeGreaterThan(count);
});
