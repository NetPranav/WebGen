/**
 * ROADMAP Phase 48 gate, in Chromium, Firefox and WebKit: a 5-page site (Home, About, Pricing, Blog, Contact) with a
 * shared header navigates in Preview, including back and forward, links to a section scroll to it, a link to a web
 * address opens it, a change to the shared header reaches every page, and the Pages panel and the Link section of the
 * inspector set it all up.
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

type L = { id: string; name: string; parentId: string | null; children: string[]; properties: Record<string, unknown>; page?: { route: string }; section?: { anchor?: string }; link?: { kind: string; target: string }; instance?: { component: string; root?: boolean } };
type Doc = { commands: { addLayer: (input: unknown, label?: string) => string; updateProps: (id: string, patch: Record<string, unknown>) => void }; get: () => { layers: Record<string, L>; designComponents?: Record<string, { id: string; shared?: string }> } };
type Reg = { all: () => { id: string; run: (a?: unknown) => unknown }[] };
const run = <T = unknown,>(page: Page, id: string, args?: unknown) => page.evaluate(({ id, args }) => (window as unknown as { __LL_COMMANDS__: Reg }).__LL_COMMANDS__.all().find((c) => c.id === id)!.run(args), { id, args }) as Promise<T>;
const select = (page: Page, ids: string[]) => run(page, "selection.set", { ids });
const layer = (page: Page, id: string) => page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().layers[id], id);

const NAMES = ["Home", "About", "Pricing", "Blog", "Contact"];

/** Five pages, each with a heading and a long section, and a shared header with a link to every other page. Returns ids. */
async function build(page: Page) {
  return page.evaluate((names) => {
    const d = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__;
    const reg = (window as unknown as { __LL_COMMANDS__: Reg }).__LL_COMMANDS__;
    const call = <T,>(id: string, args: unknown) => reg.all().find((c) => c.id === id)!.run(args) as T;
    const pages: Record<string, string> = {};
    const bodies: Record<string, string> = {};
    const features: Record<string, string> = {};
    for (const name of names) {
      pages[name] = call<{ id: string }>("page.create", { name }).id;
      // the header's slot: the first section of the home page becomes the nav
    }
    // the home page gets the nav first, then the others get instances of it
    const nav = call<{ id: string }>("section.add", { page: pages.Home, name: "Nav", height: 64 }).id;
    const links: Record<string, string> = {};
    names.forEach((name, i) => {
      links[name] = d.commands.addLayer({ archetype: "button", parentId: nav, name: `to ${name}`, properties: { positioning: "absolute", "frame.x": 20 + i * 140, "frame.y": 12, "frame.width": 120, "frame.height": 40, "content.text": name, "appearance.background.color": "#e2e8f0" } });
    });
    call("section.share", { section: nav, kind: "header" });
    for (const name of names) {
      call("link.set", { kind: "page", target: pages[name], ids: [links[name]] });
      bodies[name] = call<{ id: string }>("section.add", { page: pages[name], name: `Body ${name}`, height: 500 }).id;
      d.commands.addLayer({ archetype: "text", parentId: bodies[name], name: "heading", properties: { positioning: "absolute", "frame.x": 40, "frame.y": 40, "frame.width": 600, "frame.height": 40, "content.text": `${name} page` } });
    }
    // a second, far-down section on Home with an anchor
    features.Home = call<{ id: string }>("section.add", { page: pages.Home, name: "Features", height: 600 }).id;
    call("section.setAnchor", { section: features.Home, name: "features" });
    d.commands.addLayer({ archetype: "text", parentId: features.Home, name: "features heading", properties: { positioning: "absolute", "frame.x": 40, "frame.y": 40, "frame.width": 600, "frame.height": 40, "content.text": "Features" } });
    return { pages, links, bodies, features, nav };
  }, NAMES);
}

/** The screen position of a layer's middle, once it has stopped moving. */
async function centreOf(page: Page, id: string) {
  let last = "";
  for (let i = 0; i < 40; i++) {
    const r = await page.evaluate((id) => {
      const iframe = Array.from(document.querySelectorAll("iframe")).find((f) => f.contentDocument?.querySelector(`[data-element-id="${id}"]`));
      const el = iframe?.contentDocument?.querySelector<HTMLElement>(`[data-element-id="${id}"]`);
      if (!iframe || !el) return null;
      const f = iframe.getBoundingClientRect();
      const s = f.width / iframe.clientWidth;
      const b = el.getBoundingClientRect();
      return { x: Math.round(f.left + (b.left + b.width / 2) * s), y: Math.round(f.top + (b.top + b.height / 2) * s) };
    }, id);
    const key = JSON.stringify(r);
    if (r && key === last) return r;
    last = key;
    await page.waitForTimeout(120);
  }
  throw new Error(`layer ${id} did not settle`);
}
const clickLayer = async (page: Page, id: string) => {
  const c = await centreOf(page, id);
  await page.mouse.click(c.x, c.y);
};
const nav = (page: Page) => page.getByRole("toolbar", { name: "Preview navigation" });
const address = (page: Page) => page.getByTestId("preview-address");
/** The text of the heading shown in the one frame Preview draws. */
const shown = (page: Page) =>
  page.evaluate(() => {
    const iframes = Array.from(document.querySelectorAll<HTMLIFrameElement>(".canvas-frame iframe"));
    return iframes.flatMap((f) => Array.from(f.contentDocument?.querySelectorAll('[data-archetype="text"]') ?? []).map((e) => e.textContent ?? "")).filter((t) => /page$/.test(t));
  });

test.describe("Phase 48: pages, sections and links", () => {
  test("a 5-page site navigates in Preview, with back and forward", async ({ page }) => {
    await ready(page);
    const { pages, links, features } = await build(page);
    const routes = await page.evaluate(() => Object.values((window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().layers).filter((l) => l.page).map((l) => l.page!.route));
    expect(routes.sort()).toEqual(["/", "/about", "/blog", "/contact", "/pricing"]);

    await page.getByRole("toolbar", { name: "Frames" }).getByRole("button", { name: "Preview" }).click();
    await expect(address(page)).toHaveText("/");
    expect(await shown(page)).toEqual(["Home page"]);
    // the header's links, each page's own copy of it
    const navLink = (pageId: string, name: string) =>
      page.evaluate(({ pageId, name }) => {
        const dd = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().layers;
        const walk = (id: string): string | null => {
          const l = dd[id];
          if (l.name === `to ${name}`) return id;
          for (const k of l.children) {
            const r = walk(k);
            if (r) return r;
          }
          return null;
        };
        return walk(pageId)!;
      }, { pageId, name });

    await clickLayer(page, links.About);
    await expect(address(page)).toHaveText("/about");
    await expect.poll(() => shown(page)).toEqual(["About page"]);
    // About's own header is an instance of the shared one, with the same links
    await clickLayer(page, await navLink(pages.About, "Pricing"));
    await expect(address(page)).toHaveText("/pricing");
    await clickLayer(page, await navLink(pages.Pricing, "Contact"));
    await expect(address(page)).toHaveText("/contact");
    await expect.poll(() => shown(page)).toEqual(["Contact page"]);

    // back, back, forward
    await nav(page).getByRole("button", { name: "Back" }).click();
    await expect(address(page)).toHaveText("/pricing");
    await nav(page).getByRole("button", { name: "Back" }).click();
    await expect(address(page)).toHaveText("/about");
    await expect.poll(() => shown(page)).toEqual(["About page"]);
    await nav(page).getByRole("button", { name: "Forward" }).click();
    await expect(address(page)).toHaveText("/pricing");
    // a new visit cuts off the forward part
    await clickLayer(page, await navLink(pages.Pricing, "Blog"));
    await expect(address(page)).toHaveText("/blog");
    await expect(nav(page).getByRole("button", { name: "Forward" })).toBeDisabled();
    // the keyboard goes back too
    await page.keyboard.press("Alt+ArrowLeft");
    await expect(address(page)).toHaveText("/pricing");
    void features;
  });

  test("a link to a section scrolls to it; a link to a web address opens it; an edit of the shared header reaches every page", async ({ page }) => {
    await ready(page);
    const { pages, features, nav } = await build(page);
    // a button on Contact that goes to Home's Features section, and one to the web
    const { toFeatures, toWeb } = await page.evaluate(
      ({ contact, features }) => {
        const d = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__;
        const reg = (window as unknown as { __LL_COMMANDS__: Reg }).__LL_COMMANDS__;
        const call = (id: string, args: unknown) => reg.all().find((c) => c.id === id)!.run(args);
        const body = d.get().layers[contact].children.map((k) => d.get().layers[k]).find((l) => l.name === "Body Contact")!.id;
        const mk = (name: string, x: number) => d.commands.addLayer({ archetype: "button", parentId: body, name, properties: { positioning: "absolute", "frame.x": x, "frame.y": 120, "frame.width": 200, "frame.height": 40, "content.text": name } });
        const toFeatures = mk("Go to features", 40);
        const toWeb = mk("Visit example", 300);
        call("link.set", { kind: "anchor", target: features, ids: [toFeatures] });
        call("link.set", { kind: "url", target: "https://example.com/hello", ids: [toWeb] });
        return { toFeatures, toWeb };
      },
      { contact: pages.Contact, features: features.Home },
    );
    await page.evaluate(() => {
      (window as unknown as { __opened: string[] }).__opened = [];
      window.open = ((u: string) => {
        (window as unknown as { __opened: string[] }).__opened.push(u);
        return null;
      }) as unknown as typeof window.open;
    });
    await run(page, "preview.go", { route: "/contact" });
    await page.getByRole("toolbar", { name: "Frames" }).getByRole("button", { name: "Preview" }).click();
    await run(page, "preview.go", { route: "/contact" });
    await expect(address(page)).toHaveText("/contact");
    await clickLayer(page, toWeb);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __opened: string[] }).__opened)).toEqual(["https://example.com/hello"]);
    await expect(address(page)).toHaveText("/contact"); // a web link leaves Preview where it is
    await clickLayer(page, toFeatures);
    await expect(address(page)).toHaveText("/#features");
    await expect.poll(() => shown(page)).toEqual(["Home page"]);
    await expect
      .poll(() => page.evaluate(() => Array.from(document.querySelectorAll<HTMLIFrameElement>(".canvas-frame iframe")).map((f) => f.contentWindow?.scrollY ?? 0)[0]), { timeout: 8000 })
      .toBeGreaterThan(200); // the page is 1164 tall in a 900 frame: scrolled as far as it goes

    // back in the design: the shared header is one component; changing it changes every page
    await page.getByRole("toolbar", { name: "Frames" }).getByRole("button", { name: "Design" }).click();
    await page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.commands.updateProps(id, { "appearance.background.color": "#112233" }), nav);
    for (const name of NAMES.slice(1)) {
      const inst = await page.evaluate((p) => {
        const dd = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().layers;
        return dd[p].children.map((k) => dd[k]).find((l) => l.instance?.root)!.properties["appearance.background.color"];
      }, pages[name]);
      expect(inst, name).toBe("#112233");
    }
  });

  test("the Pages panel lists the pages with their routes and edits them; the Link section sets a link and says when it leads nowhere", async ({ page }) => {
    await ready(page);
    const { pages, links, nav } = await build(page);
    await page.locator(".dock-zone--left").getByText("Pages", { exact: true }).first().click();
    const panel = page.getByRole("region", { name: "Pages" }).first();
    await expect(panel.locator('[data-page="Pricing"]')).toHaveAttribute("data-route", "/pricing");
    await panel.getByLabel("Route of Pricing", { exact: true }).fill("Our Plans");
    await panel.getByLabel("Route of Pricing", { exact: true }).press("Enter");
    await expect(panel.locator('[data-page="Pricing"]')).toHaveAttribute("data-route", "/our-plans");
    await panel.getByRole("button", { name: "Blog is not the home page" }).click();
    await expect(panel.locator('[data-page="Blog"]')).toHaveAttribute("data-route", "/");
    await expect(panel.locator('[data-page="Home"]')).toHaveAttribute("data-route", "/home");
    await panel.getByRole("button", { name: "Add page" }).click();
    await expect(panel.locator("[data-page]")).toHaveCount(6);

    // the Link section of the inspector
    await select(page, [links.About]);
    const link = page.getByRole("region", { name: "Link", exact: true });
    await expect(link.getByLabel("Page", { exact: true })).toHaveValue(pages.About);
    await link.getByLabel("Page", { exact: true }).selectOption(pages.Contact);
    expect((await layer(page, links.About)).link).toEqual({ kind: "page", target: pages.Contact });
    await panel.getByRole("button", { name: "Remove page Contact" }).click();
    await expect(link.getByRole("alert")).toContainText("leads nowhere");
    await link.getByRole("button", { name: "Remove link" }).click();
    expect((await layer(page, links.About)).link).toBeUndefined();
    void nav;
  });
});
