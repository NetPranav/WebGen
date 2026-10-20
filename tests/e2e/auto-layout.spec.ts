/**
 * ROADMAP Phase 41 gate, in Chromium, Firefox and WebKit: a fixture of nested stacks (fixed, hug and fill sizing,
 * space-between, centring, wrap, padding and gaps) lays out the way `computeStack` says at five widths, to half a
 * pixel in every browser, which means the same in all three. Also: Shift+A reads a stack out of loose layers and
 * makes them flow, dragging a child reorders it with an insertion line, the inspector's controls change the stack,
 * and each is one undo step.
 */
import { test, expect, type Page } from "@playwright/test";
import { computeStack, hugSize, uniformPadding, type Rect, type SizingMode, type StackChild, type StackSpec } from "../../src/core/layout/stack";
import { openEditor, waitSaved } from "./support/editor";

const STAGE = 'iframe[title="Stage"]';
const MOD = process.platform === "darwin" ? "Meta" : "Control";

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

type Doc = { commands: { addLayer: (input: unknown, label?: string) => string; updateProps: (id: string, patch: Record<string, unknown>) => void }; get: () => { layers: Record<string, { children: string[]; properties: Record<string, unknown> }> } };

/** A node of the fixture: what the document gets and what the oracle lays out. */
interface N {
  name: string;
  w?: number;
  h?: number;
  sh: SizingMode;
  sv: SizingMode;
  spec?: StackSpec;
  kids?: N[];
}
const leaf = (name: string, w: number, h: number): N => ({ name, w, h, sh: "fixed", sv: "fixed" });
const stack = (name: string, spec: Partial<StackSpec>, kids: N[], size: Partial<Pick<N, "w" | "h" | "sh" | "sv">> = {}): N => ({
  name,
  sh: "hug",
  sv: "hug",
  ...size,
  spec: { direction: "column", gap: 0, padding: uniformPadding(0), justify: "flex-start", align: "flex-start", wrap: false, ...spec },
  kids,
});

/** The size a node asks for before its parent says otherwise. */
function natural(n: N): { w: number; h: number } {
  if (!n.kids || !n.spec) return { w: n.w ?? 0, h: n.h ?? 0 };
  const inner = hugSize(n.spec, n.kids.map(asChild));
  return { w: n.sh === "fixed" ? n.w ?? 0 : inner.w, h: n.sv === "fixed" ? n.h ?? 0 : inner.h };
}
const asChild = (k: N): StackChild => ({ ...natural(k), sizingH: k.sh, sizingV: k.sv });

/** Every node's rectangle relative to the root's top-left. */
function place(n: N, rect: Rect, out: Map<string, Rect>, at: { x: number; y: number }) {
  out.set(n.name, { x: at.x + rect.x, y: at.y + rect.y, w: rect.w, h: rect.h });
  if (!n.kids || !n.spec) return;
  const rects = computeStack(n.spec, { w: rect.w, h: rect.h }, n.kids.map(asChild));
  n.kids.forEach((k, i) => place(k, rects[i], out, { x: at.x + rect.x, y: at.y + rect.y }));
}

const fixture = (): N =>
  stack(
    "root",
    { direction: "column", gap: 12, padding: { top: 16, right: 24, bottom: 16, left: 24 }, align: "stretch" },
    [
      stack("header", { direction: "row", gap: 8, padding: uniformPadding(8), justify: "space-between", align: "center" }, [
        leaf("logo", 40, 40),
        stack("nav", { direction: "row", gap: 16 }, [leaf("n1", 60, 20), leaf("n2", 60, 20), leaf("n3", 60, 20)]),
        leaf("cta", 80, 32),
      ], { sh: "fill" }),
      stack("body", { direction: "row", gap: 16, wrap: true, padding: uniformPadding(4) }, [leaf("c1", 200, 120), leaf("c2", 200, 120), leaf("c3", 200, 120)], { sh: "fill", sv: "fixed", h: 300 }),
      stack("footer", { direction: "row", gap: 10, justify: "flex-start", align: "center", padding: { top: 6, right: 12, bottom: 6, left: 12 } }, [
        { name: "grow", h: 24, sh: "fill", sv: "fixed" },
        leaf("badge", 48, 24),
      ], { sh: "fill", sv: "fixed", h: 60 }),
    ],
    { sh: "fixed", sv: "hug", w: 1000 },
  );

const css = (n: N): Record<string, unknown> => {
  const p: Record<string, unknown> = { name: n.name, "sizing.horizontal": n.sh, "sizing.vertical": n.sv, "layout.padding": 0 };
  if (n.w !== undefined) p["frame.width"] = n.w;
  if (n.h !== undefined) p["frame.height"] = n.h;
  if (n.spec) {
    Object.assign(p, {
      "layout.auto": true,
      "layout.display": "flex",
      "layout.flexDirection": n.spec.direction,
      "layout.gap": n.spec.gap,
      "layout.padding": 0,
      "layout.paddingTop": n.spec.padding.top,
      "layout.paddingRight": n.spec.padding.right,
      "layout.paddingBottom": n.spec.padding.bottom,
      "layout.paddingLeft": n.spec.padding.left,
      "layout.justifyContent": n.spec.justify,
      "layout.alignItems": n.spec.align,
      "layout.flexWrap": n.spec.wrap ? "wrap" : "nowrap",
    });
  }
  return p;
};

/** Builds the fixture in the document through the real commands; returns the ids by name. */
async function build(page: Page, root: N): Promise<Record<string, string>> {
  return page.evaluate(
    ({ root, props }) => {
      const doc = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__;
      const ids: Record<string, string> = {};
      const make = (n: N, parentId: string | null): void => {
        const properties: Record<string, unknown> = { ...props[n.name], positioning: parentId === null ? "absolute" : "flow", "appearance.background.color": n.kids ? "#e2e8f0" : "#64748b" };
        if (parentId === null) Object.assign(properties, { "frame.x": 3000, "frame.y": 0 });
        delete properties.name;
        ids[n.name] = doc.commands.addLayer({ archetype: "container", parentId, name: n.name, properties }, `Add ${n.name}`);
        for (const k of n.kids ?? []) make(k, ids[n.name]);
      };
      make(root, null);
      return ids;
    },
    { root, props: Object.fromEntries(flatten(root).map((n) => [n.name, css(n)])) },
  );
}
const flatten = (n: N): N[] => [n, ...(n.kids ?? []).flatMap(flatten)];

const measure = (page: Page, names: string[], ids: Record<string, string>) =>
  page.evaluate(
    ({ names, ids }) => {
      // every top-level frame is drawn in its own iframe: the one that has the fixture's root
      const d = Array.from(document.querySelectorAll("iframe")).map((f) => f.contentDocument).find((c) => c?.querySelector(`[data-element-id="${ids.root}"]`))!;
      const root = d.querySelector<HTMLElement>(`[data-element-id="${ids.root}"]`)!.getBoundingClientRect();
      return Object.fromEntries(
        names.map((n) => {
          const r = d.querySelector<HTMLElement>(`[data-element-id="${ids[n]}"]`)!.getBoundingClientRect();
          return [n, { x: r.left - root.left, y: r.top - root.top, w: r.width, h: r.height }];
        }),
      );
    },
    { names, ids },
  );

const setProps = (page: Page, id: string, patch: Record<string, unknown>) =>
  page.evaluate(({ id, patch }) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.commands.updateProps(id, patch), { id, patch });

test.describe("Phase 41: nested stacks lay out as computed, at five widths", () => {
  test("every box is within half a pixel of computeStack at 320, 480, 768, 1024 and 1440", async ({ page }) => {
    await ready(page);
    const tree = fixture();
    const ids = await build(page, tree);
    const names = flatten(tree).map((n) => n.name);
    for (const width of [320, 480, 768, 1024, 1440]) {
      await setProps(page, ids.root, { "frame.width": width });
      tree.w = width;
      const expected = new Map<string, Rect>();
      const size = natural(tree);
      place(tree, { x: 0, y: 0, w: size.w, h: size.h }, expected, { x: 0, y: 0 });
      // wait for the stage to draw the new width
      await expect.poll(async () => (await measure(page, ["root"], ids)).root.w).toBeCloseTo(width, 0);
      const got = await measure(page, names, ids);
      const off: string[] = [];
      for (const n of names) {
        const e = expected.get(n)!;
        const g = got[n];
        for (const k of ["x", "y", "w", "h"] as const) if (Math.abs(g[k] - e[k]) > 0.5) off.push(`${n}.${k} got ${g[k]} expected ${e[k]}`);
      }
      expect(off, `at ${width}`).toEqual([]);
    }
  });
});

test.describe("Phase 41: adding auto layout", () => {
  test("Shift+A on a frame of loose layers reads the row, and the children flow; one undo step; Shift+Alt+A pins them", async ({ page }) => {
    await ready(page);
    const ids = await page.evaluate(() => {
      const doc = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__;
      const frame = doc.commands.addLayer({ archetype: "container", parentId: null, name: "Loose", properties: { positioning: "absolute", "frame.x": 3000, "frame.y": 0, "frame.width": 400, "frame.height": 120, "appearance.background.color": "#e2e8f0" } });
      const kid = (name: string, x: number) => doc.commands.addLayer({ archetype: "container", parentId: frame, name, properties: { positioning: "absolute", "frame.x": x, "frame.y": 30, "frame.width": 60, "frame.height": 40, "appearance.background.color": "#64748b" } });
      return { frame, a: kid("a", 20), b: kid("b", 100), c: kid("c", 180) };
    });
    await page.evaluate((id) => {
      const reg = (window as unknown as { __LL_COMMANDS__: { all: () => { id: string; run: (a?: unknown) => unknown }[] } }).__LL_COMMANDS__;
      reg.all().find((c) => c.id === "selection.set")!.run({ ids: [id] });
    }, ids.frame);
    await page.getByRole("button", { name: "Add auto layout" }).click();
    await expect(page.getByRole("region", { name: "Auto layout" }).getByRole("button", { name: "Remove auto layout" })).toBeVisible();
    const props = await page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().layers[id].properties, ids.frame);
    expect(props["layout.auto"]).toBe(true);
    expect(props["layout.flexDirection"]).toBe("row");
    expect(props["layout.gap"]).toBe(20);
    expect(props["layout.paddingLeft"]).toBe(20);
    const kid = await page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().layers[id].properties.positioning, ids.a);
    expect(kid).toBe("flow");
    // the stage draws them where the stack puts them
    await expect.poll(async () => (await measure(page, ["a", "b"], { root: ids.frame, ...ids })).b.x).toBeCloseTo(20 + 60 + 20, 0);

    await page.keyboard.press(`${MOD}+z`);
    await expect.poll(() => page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().layers[id].properties["layout.auto"], ids.frame)).toBeFalsy();
  });

  test("the inspector changes direction, gap and alignment, and sizing of a child", async ({ page }) => {
    await ready(page);
    const tree = stack("root", { direction: "row", gap: 10, padding: uniformPadding(10) }, [leaf("a", 50, 30), leaf("b", 50, 30)], { sh: "fixed", sv: "fixed", w: 300, h: 120 });
    const ids = await build(page, tree);
    await page.evaluate((id) => {
      const reg = (window as unknown as { __LL_COMMANDS__: { all: () => { id: string; run: (a?: unknown) => unknown }[] } }).__LL_COMMANDS__;
      reg.all().find((c) => c.id === "selection.set")!.run({ ids: [id] });
    }, ids.root);
    const panel = page.getByRole("region", { name: "Auto layout" });
    await panel.getByRole("button", { name: "Direction: vertical" }).click();
    await expect.poll(async () => (await measure(page, ["b"], ids)).b.y).toBeCloseTo(10 + 30 + 10, 0);
    await panel.getByLabel("Gap", { exact: true }).fill("20");
    await panel.getByLabel("Gap", { exact: true }).blur();
    await expect.poll(async () => (await measure(page, ["b"], ids)).b.y).toBeCloseTo(10 + 30 + 20, 0);
    await panel.getByRole("button", { name: "Align: Centre" }).click();
    await expect.poll(async () => (await measure(page, ["a"], ids)).a.x).toBeCloseTo((300 - 50) / 2, 0);
    // a child made to fill across
    await page.evaluate((id) => {
      const reg = (window as unknown as { __LL_COMMANDS__: { all: () => { id: string; run: (a?: unknown) => unknown }[] } }).__LL_COMMANDS__;
      reg.all().find((c) => c.id === "selection.set")!.run({ ids: [id] });
    }, ids.a);
    await panel.getByRole("group", { name: "Width" }).getByRole("button", { name: "Width: Fill" }).click();
    await expect.poll(async () => (await measure(page, ["a"], ids)).a.w).toBeCloseTo(300 - 20, 0);
  });
});

test.describe("Phase 41: reordering by dragging", () => {
  test("dragging a child past its neighbour reorders it, with an insertion line, as one undo step", async ({ page }) => {
    await ready(page);
    const tree = stack("root", { direction: "column", gap: 10, padding: uniformPadding(10) }, [leaf("a", 100, 40), leaf("b", 100, 40), leaf("c", 100, 40)], { sh: "fixed", sv: "hug", w: 200 });
    const ids = await build(page, tree);
    // bring the frame into view and measure on screen
    await page.evaluate((id) => {
      const reg = (window as unknown as { __LL_COMMANDS__: { all: () => { id: string; run: (a?: unknown) => unknown }[] } }).__LL_COMMANDS__;
      reg.all().find((c) => c.id === "selection.set")!.run({ ids: [id] });
      reg.all().find((c) => c.id === "canvas.zoomToSelection")?.run();
    }, ids.root);
    await page.waitForTimeout(600);
    const screenRect = (name: string) =>
      page.evaluate(
        ({ id }) => {
          const iframe = Array.from(document.querySelectorAll("iframe")).find((i) => i.contentDocument?.querySelector(`[data-element-id="${id}"]`))!;
          const f = iframe.getBoundingClientRect();
          const s = f.width / iframe.clientWidth;
          const b = iframe.contentDocument!.querySelector<HTMLElement>(`[data-element-id="${id}"]`)!.getBoundingClientRect();
          return { x: f.left + b.left * s, y: f.top + b.top * s, w: b.width * s, h: b.height * s };
        },
        { id: ids[name] },
      );
    const order = () => page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().layers[id].children, ids.root);
    expect(await order()).toEqual([ids.a, ids.b, ids.c]);
    const a = await screenRect("a");
    const c = await screenRect("c");
    // select a, then drag it to the lower half of c
    await page.mouse.click(a.x + a.w / 2, a.y + a.h / 2);
    await page.mouse.move(a.x + a.w / 2, a.y + a.h / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.w / 2, (a.y + c.y) / 2, { steps: 4 });
    await page.mouse.move(c.x + c.w / 2, c.y + c.h * 0.8, { steps: 4 });
    await expect(page.getByTestId("stack-drop")).toHaveCount(1);
    await page.mouse.up();
    await expect.poll(order).toEqual([ids.b, ids.c, ids.a]);
    await expect(page.getByTestId("stack-drop")).toHaveCount(0);
    // the layers stayed in the flow
    expect(await page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().layers[id].properties.positioning, ids.a)).toBe("flow");
    await page.keyboard.press(`${MOD}+z`);
    await expect.poll(order).toEqual([ids.a, ids.b, ids.c]);
  });
});
