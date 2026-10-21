/**
 * ROADMAP Phase 49 gate, in Chromium, Firefox and WebKit: the exported site looks like the canvas. A page holding every
 * archetype of the render gallery, with overrides at five breakpoints (1440, 1024, 768, 480, 375), is exported as plain
 * HTML and CSS, served, and drawn at each of the five widths; each picture is compared with the stage's own drawing
 * of the page at that breakpoint, as a whole and for every gallery case on its own: at most 0.5% of the pixels may
 * differ. The Export dialog downloads a ZIP; the build of the React targets is the export harness
 * (`tests/export-harness`).
 */
import { test, expect, type Page } from "@playwright/test";
import { PNG } from "pngjs";
import { buildGalleryLayers, GALLERY_CASES } from "../../src/core/render/gallery";
import { openEditor, waitSaved } from "./support/editor";

const STAGE = 'iframe[title="Stage"]';
const WIDTHS = [1440, 1024, 768, 480, 375];

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

type Reg = { all: () => { id: string; run: (a?: unknown) => unknown }[] };
type Doc = { commands: { addLayer: (input: unknown, label?: string) => string; updateProps: (id: string, patch: Record<string, unknown>) => void; insertLayers: (layers: unknown[], clips?: unknown[], label?: string) => void; setLayerFlags: (id: string, flags: Record<string, unknown>) => void }; get: () => { breakpoints?: { id: string; width: number }[] } };
const run = (page: Page, id: string, args?: unknown): Promise<unknown> => page.evaluate(({ id, args }) => (window as unknown as { __LL_COMMANDS__: Reg }).__LL_COMMANDS__.all().find((c) => c.id === id)!.run(args), { id, args });

/** One page with every gallery case in it, five breakpoints, and a few changes at the narrower ones. Returns the page's id. */
async function build(page: Page): Promise<string> {
  const layers = Object.values(buildGalleryLayers()) as unknown[];
  return page.evaluate(
    ({ layers }) => {
      const d = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__;
      const reg = (window as unknown as { __LL_COMMANDS__: Reg }).__LL_COMMANDS__;
      const call = <T,>(id: string, args: unknown) => reg.all().find((c) => c.id === id)!.run(args) as T;
      const pageId = d.commands.addLayer({
        archetype: "container",
        parentId: null,
        name: "Gallery",
        properties: { positioning: "absolute", "frame.x": 3000, "frame.y": 0, "frame.width": 1440, "frame.height": 900, "layout.display": "flex", "layout.flexDirection": "row", "layout.flexWrap": "wrap", "layout.gap": 16, "layout.padding": 24, "layout.alignItems": "flex-start", "appearance.background.color": "#ffffff" },
      });
      const placed = (layers as { id: string; parentId: string | null }[]).map((l) => (l.parentId === null ? { ...l, parentId: pageId } : l));
      d.commands.insertLayers(placed, [], "Insert gallery");
      call("page.make", { frame: pageId, route: "/" });
      call("breakpoint.setResponsive", { on: true, frameId: pageId });
      for (const [name, width] of [["Laptop", 1024], ["Small phone", 480]] as const) call("breakpoint.add", { name, width });
      const bps = d.get().breakpoints ?? [];
      const id = (w: number) => bps.find((b: { width: number }) => b.width === w)!.id;
      const edit = (bp: number, layer: string, patch: Record<string, unknown>) => {
        call("breakpoint.set", { id: id(bp) });
        d.commands.updateProps(layer, patch);
      };
      call("breakpoint.set", { id: id(768) });
      d.commands.setLayerFlags("gallery_button", { visible: false });
      edit(768, "gallery_fab", { "appearance.opacity": 0.5 });
      edit(480, "gallery_badge", { "appearance.background.color": "#cc3333" });
      edit(480, "gallery_image", { "frame.width": 120, "frame.height": 60 });
      call("breakpoint.set", { id: id(375) });
      d.commands.setLayerFlags("gallery_input", { visible: false });
      edit(375, "gallery_icon-large", { "svg.strokeWidth": 3 });
      call("breakpoint.set", { id: null });
      return pageId;
    },
    { layers },
  );
}

/** The files of the plain HTML export, by path. */
async function exportHtml(page: Page) {
  return page.evaluate(() => (window as unknown as { __LL_EXPORT__: { build: (o: unknown) => Promise<{ files: { path: string; text?: string }[]; warnings: string[] }> } }).__LL_EXPORT__.build({ target: "html", styling: "css" }));
}

/** The stage's own markup for the page at the breakpoint being edited (its base styles live in the markup's inline styles). */
const stageMarkup = (page: Page, pageId: string) =>
  page.evaluate((id) => {
    const iframe = Array.from(document.querySelectorAll("iframe")).find((f) => f.contentDocument?.querySelector(`[data-element-id="${id}"]`));
    return iframe!.contentDocument!.querySelector(`[data-element-id="${id}"]`)!.outerHTML;
  }, pageId);

const stageRects = (page: Page, pageId: string) =>
  page.evaluate((id) => {
    const iframe = Array.from(document.querySelectorAll("iframe")).find((f) => f.contentDocument?.querySelector(`[data-element-id="${id}"]`))!;
    const d = iframe.contentDocument!;
    const out: Record<string, { x: number; y: number; w: number; h: number }> = {};
    for (const el of Array.from(d.querySelectorAll<HTMLElement>('[data-element-id^="gallery_"]'))) {
      const r = el.getBoundingClientRect();
      out[el.getAttribute("data-element-id")!] = { x: Math.floor(r.left), y: Math.floor(r.top), w: Math.ceil(r.width), h: Math.ceil(r.height) };
    }
    return out;
  }, pageId);

/** Pixels that differ between two screenshots inside a rectangle. */
function differing(a: PNG, b: PNG, rect: { x: number; y: number; w: number; h: number }): { n: number; area: number } {
  let n = 0;
  const x1 = Math.min(a.width, rect.x + rect.w);
  const y1 = Math.min(a.height, rect.y + rect.h);
  for (let y = Math.max(0, rect.y); y < y1; y++) {
    for (let x = Math.max(0, rect.x); x < x1; x++) {
      const i = (y * a.width + x) * 4;
      if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) n++;
    }
  }
  return { n, area: Math.max(1, (x1 - Math.max(0, rect.x)) * (y1 - Math.max(0, rect.y))) };
}

test.describe("Phase 49: static export looks like the canvas", () => {
  test("the plain HTML export matches the stage at 1440, 1024, 768, 480 and 375, for the whole page and for every archetype", async ({ page, context }) => {
    test.setTimeout(240_000);
    await ready(page);
    const pageId = await build(page);
    const site = await exportHtml(page);
    expect(site.files.map((f) => f.path).sort()).toEqual(["README.md", "index.html", "styles.css"]);
    const byPath = new Map(site.files.map((f) => [f.path, f.text ?? ""]));
    await context.route("http://export.test/**", (route) => {
      const path = new URL(route.request().url()).pathname.replace(/^\//, "") || "index.html";
      const body = byPath.get(path);
      return body === undefined ? route.fulfill({ status: 404, body: "not found" }) : route.fulfill({ status: 200, contentType: path.endsWith(".css") ? "text/css" : "text/html", body });
    });
    // The exported site asks Google for the fonts it uses; the stage's reference page has none of them. Both draw with the browser's
    // default so the comparison is about layout and paint, not about which font file arrived (the link itself is a unit test).
    await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
    const ref = await context.newPage();
    const out = await context.newPage();
    const bps = await page.evaluate(() => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().breakpoints ?? []);
    expect(bps.map((b) => b.width).sort((a, b) => b - a)).toEqual(WIDTHS);
    const H = 1500;
    const cases = GALLERY_CASES.map((c) => `gallery_${c.id}`);
    const failures: string[] = [];
    for (const w of WIDTHS) {
      const bp = bps.find((b) => b.width === w)!;
      await run(page, "breakpoint.set", { id: w === 1440 ? null : bp.id });
      await expect.poll(() => page.evaluate((id) => {
        const iframe = Array.from(document.querySelectorAll("iframe")).find((f) => f.contentDocument?.querySelector(`[data-element-id="${id}"]`));
        return iframe?.contentDocument?.querySelector<HTMLElement>(`[data-element-id="${id}"]`)?.getBoundingClientRect().width;
      }, pageId)).toBe(w);
      await page.waitForTimeout(250); // the layout of the narrower page settles
      const markup = await stageMarkup(page, pageId);
      const rects = await stageRects(page, pageId);
      await ref.setViewportSize({ width: w, height: H });
      await ref.setContent(`<!doctype html><html><head><style>html,body{margin:0;padding:0;background:#fff}</style></head><body>${markup}</body></html>`);
      await out.setViewportSize({ width: w, height: H });
      await out.goto("http://export.test/index.html");
      await out.waitForLoadState("load");
      const a = PNG.sync.read(await ref.screenshot({ clip: { x: 0, y: 0, width: w, height: H } }));
      const b = PNG.sync.read(await out.screenshot({ clip: { x: 0, y: 0, width: w, height: H } }));
      const whole = differing(a, b, { x: 0, y: 0, w, h: H });
      if (whole.n / whole.area > 0.005) failures.push(`${w}px: the page differs in ${((100 * whole.n) / whole.area).toFixed(2)}% of its pixels`);
      let checked = 0;
      for (const id of cases) {
        const r = rects[id];
        if (!r || r.w === 0 || r.h === 0) continue; // hidden at this width (or drawn as nothing)
        checked++;
        const d = differing(a, b, r);
        if (d.n / d.area > 0.005) failures.push(`${w}px: ${id} differs in ${((100 * d.n) / d.area).toFixed(2)}% of its pixels`);
      }
      expect(checked, `cases checked at ${w}`).toBeGreaterThan(40);
    }
    expect(failures).toEqual([]);
  });
});

test.describe("Phase 49: the Export dialog", () => {
  test("File, Export Site: pick a target and styling, see the files, download a ZIP with them", async ({ page }) => {
    await ready(page);
    await build(page);
    await page.getByRole("button", { name: "File", exact: true }).click();
    await page.getByRole("menuitem", { name: /Export Site/ }).click();
    const dialog = page.getByRole("dialog", { name: "Export site" });
    await expect(dialog).toBeVisible();
    // Next.js is the first choice; its files are listed
    await expect(dialog.getByRole("button", { name: "Show app/page.tsx" })).toBeVisible();
    await dialog.getByRole("radio", { name: "Vite + React" }).check();
    await expect(dialog.getByRole("button", { name: "Show src/App.tsx" })).toBeVisible();
    await dialog.getByLabel("Styling", { exact: true }).selectOption("tailwind");
    await expect(dialog.getByRole("button", { name: "Show tailwind.config.js" })).toBeVisible();
    await dialog.getByRole("button", { name: "Show src/pages/Gallery.tsx" }).click();
    await expect(dialog.getByLabel("File", { exact: true })).toContainText("export default function Gallery");
    // plain HTML always uses one stylesheet
    await dialog.getByRole("radio", { name: "HTML & CSS" }).check();
    await expect(dialog.getByLabel("Styling", { exact: true })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Show index.html" })).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent("download"), dialog.getByRole("button", { name: "Download ZIP" }).click()]);
    expect(download.suggestedFilename()).toMatch(/-html\.zip$/);
    const path = await download.path();
    const { unzipSync } = await import("fflate");
    const { readFileSync } = await import("node:fs");
    const entries = unzipSync(new Uint8Array(readFileSync(path)));
    expect(Object.keys(entries).sort()).toEqual(["README.md", "index.html", "styles.css"]);
    expect(new TextDecoder().decode(entries["index.html"])).toContain("<title>Gallery</title>");
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("the command is Export Site on Ctrl+E, and the typed command downloads too", async ({ page }) => {
    await ready(page);
    await build(page);
    const ids = await page.evaluate(() => (window as unknown as { __LL_COMMANDS__: Reg }).__LL_COMMANDS__.all().filter((c) => c.id === "file.exportSite" || c.id === "export.site").map((c) => c.id));
    expect(ids.sort()).toEqual(["export.site", "file.exportSite"]);
    const [download] = await Promise.all([page.waitForEvent("download"), run(page, "export.site", { target: "next", styling: "modules" })]);
    expect(download.suggestedFilename()).toMatch(/-next\.zip$/);
  });
});

test.describe("Phase 49: the Code tab shows the real export of the selection", () => {
  test("select a layer: HTML, JSX, CSS and Tailwind of that layer, the same code Export Site writes", async ({ page }) => {
    await ready(page);
    await build(page);
    await run(page, "selection.set", { ids: ["gallery_button"] });
    await page.locator(".dock-zone--right").getByText("Code", { exact: true }).first().click();
    const code = page.getByTestId("export-code");
    await expect(code).toContainText("<button");
    await expect(code).toContainText("Primary Action");
    await page.getByRole("tab", { name: "JSX" }).click();
    await expect(code).toContainText("className=");
    await page.getByRole("tab", { name: "CSS" }).click();
    await expect(code).toContainText("display: inline-flex");
    await page.getByRole("tab", { name: "Tailwind" }).click();
    await expect(code).toContainText("[display:inline-flex]");
    // the layer's narrower-breakpoint change (hidden at Tablet) is in its CSS
    await page.getByRole("tab", { name: "CSS" }).click();
    await expect(code).toContainText("@media (max-width: 768px)");
    await expect(code).toContainText("display: none");
    // another selection, another code
    await run(page, "selection.set", { ids: ["gallery_badge"] });
    await expect(code).toContainText("background-color: #cc3333"); // its change at 480
    await page.getByRole("tab", { name: "HTML" }).click();
    await expect(code).toContainText("Status Badge");
  });
});
