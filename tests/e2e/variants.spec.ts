/**
 * ROADMAP Phase 47 gate, in Chromium, Firefox and WebKit: a component with variants (Size S, M, L) shows a Size
 * dropdown on every instance, and choosing a value shows that variant's layers, keeping the instance's overrides;
 * exposed properties (a text, a layer's visibility) are fields on the instance; a slot keeps an instance's own layers;
 * and a design-system fixture of 3 components × 3 variants with 40 instances carrying overrides stays correct after
 * every main component is edited.
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

type L = { id: string; name: string; archetype: string; parentId: string | null; children: string[]; properties: Record<string, unknown>; visible?: boolean; componentSlot?: boolean; componentMain?: string; instance?: { component: string; source: string; root?: boolean; overridden?: string[]; variant?: Record<string, string> } };
type Comp = { id: string; name: string; mainId: string; variants?: { mainId: string; values: Record<string, string> }[]; properties?: { id: string; name: string; type: string }[] };
type Doc = { commands: { addLayer: (input: unknown, label?: string) => string; updateProps: (id: string, patch: Record<string, unknown>) => void }; get: () => { layers: Record<string, L>; designComponents?: Record<string, Comp> } };
type Reg = { all: () => { id: string; run: (a?: unknown) => unknown }[] };
const run = (page: Page, id: string, args?: unknown) => page.evaluate(({ id, args }) => (window as unknown as { __LL_COMMANDS__: Reg }).__LL_COMMANDS__.all().find((c) => c.id === id)!.run(args), { id, args });
const select = (page: Page, ids: string[]) => run(page, "selection.set", { ids });
const comp = (page: Page, id: string) => page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().designComponents![id], id);
const layer = (page: Page, id: string) => page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().layers[id], id);

const css = (page: Page, id: string, prop: string) =>
  page.evaluate(
    ({ id, prop }) => {
      const d = Array.from(document.querySelectorAll("iframe")).map((f) => f.contentDocument).find((c) => c?.querySelector(`[data-element-id="${id}"]`));
      const el = d?.querySelector<HTMLElement>(`[data-element-id="${id}"]`);
      return el ? (d!.defaultView!.getComputedStyle(el) as unknown as Record<string, string>)[prop] : null;
    },
    { id, prop },
  );
const text = (page: Page, id: string) =>
  page.evaluate((id) => {
    const d = Array.from(document.querySelectorAll("iframe")).map((f) => f.contentDocument).find((c) => c?.querySelector(`[data-element-id="${id}"]`));
    return d?.querySelector(`[data-element-id="${id}"]`)?.textContent ?? null;
  }, id);
/** The layer of an instance that mirrors a main layer. */
const kidOf = (page: Page, root: string, source: string) =>
  page.evaluate(
    ({ root, source }) => {
      const dd = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get();
      const walk = (id: string): string | null => {
        const l = dd.layers[id];
        if (l.instance?.source === source) return id;
        for (const k of l.children) {
          const r = walk(k);
          if (r) return r;
        }
        return null;
      };
      return walk(root)!;
    },
    { root, source },
  );

async function build(page: Page) {
  return page.evaluate(() => {
    const d = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__;
    const frame = d.commands.addLayer({ archetype: "container", parentId: null, name: "Page", properties: { positioning: "absolute", "frame.x": 3000, "frame.y": 0, "frame.width": 1600, "frame.height": 1200, "layout.padding": 0, "appearance.background.color": "#ffffff" } });
    const box = (name: string, parentId: string, props: Record<string, unknown>) => d.commands.addLayer({ archetype: "container", parentId, name, properties: { positioning: "absolute", "layout.padding": 0, ...props } });
    const main = box("Button", frame, { "frame.x": 20, "frame.y": 20, "frame.width": 160, "frame.height": 48, "appearance.background.color": "#336699" });
    const label = d.commands.addLayer({ archetype: "text", parentId: main, name: "label", properties: { positioning: "absolute", "frame.x": 12, "frame.y": 12, "frame.width": 100, "frame.height": 24, "content.text": "Button" } });
    const icon = box("icon", main, { "frame.x": 130, "frame.y": 12, "frame.width": 24, "frame.height": 24, "appearance.background.color": "#ffcc00" });
    const slot = box("slot", main, { "frame.x": 0, "frame.y": 40, "frame.width": 160, "frame.height": 8, "appearance.background.color": "#cccccc" });
    const loose = box("Loose", frame, { "frame.x": 400, "frame.y": 20, "frame.width": 40, "frame.height": 20, "appearance.background.color": "#cc3333" });
    return { frame, main, label, icon, slot, loose };
  });
}

test.describe("Phase 47: variants, properties and slots", () => {
  test("add variants from the inspector, choose one on an instance: its layers show, overrides stay; undo is one step", async ({ page }) => {
    await ready(page);
    const { frame, main, icon } = await build(page);
    const c = (await run(page, "component.createFrom", { ids: [main] })) as { id: string };
    await select(page, [main]);
    const panel = page.getByRole("region", { name: "Component" });
    await panel.getByLabel("Variant property name").fill("Size");
    await panel.getByLabel("Variant values").fill("S, M, L");
    await panel.getByRole("button", { name: "Add variant property" }).click();
    await expect(panel.getByTestId("variant-summary")).toContainText("Size (S, M, L)");
    const comp0 = await comp(page, c.id);
    expect(comp0.variants!.length).toBe(3);
    const [, m, l] = comp0.variants!.map((v) => v.mainId);
    // the M and L variants are wider
    await page.evaluate(({ m, l }) => {
      const d = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__;
      d.commands.updateProps(m, { "frame.width": 220 });
      d.commands.updateProps(l, { "frame.width": 300 });
    }, { m, l });
    const root = ((await run(page, "component.insert", { component: c.id, parentId: frame, x: 100, y: 300 })) as { id: string }).id;
    const instIcon = await kidOf(page, root, icon);
    await select(page, [instIcon]);
    // an override on the icon
    const face = page.getByRole("form", { name: "Design" });
    await face.locator('input[aria-label="Fill"]').fill("#00ff00");
    await face.locator('input[aria-label="Fill"]').press("Enter");
    await expect.poll(() => css(page, instIcon, "backgroundColor")).toBe("rgb(0, 255, 0)");
    // choose Size L on the instance
    await select(page, [root]);
    await page.getByRole("region", { name: "Instance" }).getByLabel("Size", { exact: true }).selectOption("L");
    await expect.poll(() => css(page, root, "width")).toBe("300px");
    expect((await layer(page, root)).instance!.variant).toEqual({ Size: "L" });
    expect(await css(page, instIcon, "backgroundColor")).toBe("rgb(0, 255, 0)"); // the override went with the layer
    await run(page, "edit.undo");
    await expect.poll(() => css(page, root, "width")).toBe("160px");
  });

  test("exposed properties are fields on the instance: a text and a visibility switch", async ({ page }) => {
    await ready(page);
    const { frame, main, label, icon } = await build(page);
    const c = (await run(page, "component.createFrom", { ids: [main] })) as { id: string };
    await select(page, [label]);
    await page.getByRole("region", { name: "Component layer" }).getByRole("button", { name: "Expose text" }).click();
    await select(page, [icon]);
    await page.getByRole("region", { name: "Component layer" }).getByRole("button", { name: "Expose visibility" }).click();
    await expect.poll(async () => (await comp(page, c.id)).properties?.length).toBe(2);
    const a = ((await run(page, "component.insert", { component: c.id, parentId: frame, x: 100, y: 300 })) as { id: string }).id;
    const b = ((await run(page, "component.insert", { component: c.id, parentId: frame, x: 100, y: 400 })) as { id: string }).id;
    await select(page, [a]);
    const panel = page.getByRole("region", { name: "Instance" });
    await panel.getByLabel("label", { exact: true }).fill("Save");
    await panel.getByLabel("label", { exact: true }).press("Enter");
    const aLabel = await kidOf(page, a, label);
    const bLabel = await kidOf(page, b, label);
    await expect.poll(() => text(page, aLabel)).toBe("Save");
    expect(await text(page, bLabel)).toBe("Button");
    await panel.getByLabel("icon", { exact: true }).uncheck();
    const aIcon = await kidOf(page, a, icon);
    await expect.poll(() => css(page, aIcon, "display")).toBeNull(); // hidden: not drawn at all
    expect(await css(page, await kidOf(page, b, icon), "display")).not.toBeNull();
    // the main's text changes: b follows, a keeps what was typed
    await page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.commands.updateProps(id, { "content.text": "Go" }), label);
    await expect.poll(() => text(page, bLabel)).toBe("Go");
    expect(await text(page, aLabel)).toBe("Save");
  });

  test("a slot keeps an instance's own layer through edits of the main", async ({ page }) => {
    await ready(page);
    const { frame, main, slot, loose } = await build(page);
    const c = (await run(page, "component.createFrom", { ids: [main] })) as { id: string };
    await select(page, [slot]);
    await page.getByRole("region", { name: "Component layer" }).getByRole("button", { name: "Make slot" }).click();
    const a = ((await run(page, "component.insert", { component: c.id, parentId: frame, x: 100, y: 300 })) as { id: string }).id;
    const aSlot = await kidOf(page, a, slot);
    await select(page, [aSlot, loose]);
    await page.getByRole("region", { name: "Instance" }).getByRole("button", { name: "Put the other selected layers in this slot" }).click();
    await expect.poll(async () => (await layer(page, loose)).parentId).toBe(aSlot);
    await page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.commands.updateProps(id, { "appearance.background.color": "#112233", "frame.height": 12 }), slot);
    await expect.poll(() => css(page, aSlot, "backgroundColor")).toBe("rgb(17, 34, 51)");
    expect((await layer(page, loose)).parentId).toBe(aSlot);
    expect(await css(page, loose, "backgroundColor")).toBe("rgb(204, 51, 51)");
  });

  test("a design system of 3 components × 3 variants with 40 instances keeps every override when every main is edited", async ({ page }) => {
    await ready(page);
    const result = await page.evaluate(() => {
      const d = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__;
      const reg = (window as unknown as { __LL_COMMANDS__: Reg }).__LL_COMMANDS__;
      const call = <T,>(id: string, args: unknown) => reg.all().find((c) => c.id === id)!.run(args) as T;
      const frame = d.commands.addLayer({ archetype: "container", parentId: null, name: "System", properties: { positioning: "absolute", "frame.x": 3000, "frame.y": 0, "frame.width": 1800, "frame.height": 1400, "layout.padding": 0, "appearance.background.color": "#ffffff" } });
      const comps: string[] = [];
      const labels: string[] = [];
      const props: string[] = [];
      for (let k = 0; k < 3; k++) {
        const main = d.commands.addLayer({ archetype: "container", parentId: frame, name: `Comp${k}`, properties: { positioning: "absolute", "frame.x": 20, "frame.y": 20 + k * 80, "frame.width": 120, "frame.height": 40, "layout.padding": 0, "appearance.background.color": ["#111111", "#222222", "#333333"][k] } });
        const label = d.commands.addLayer({ archetype: "text", parentId: main, name: "label", properties: { positioning: "absolute", "frame.x": 8, "frame.y": 8, "frame.width": 80, "frame.height": 20, "content.text": `Label ${k}` } });
        d.commands.addLayer({ archetype: "container", parentId: main, name: "icon", properties: { positioning: "absolute", "frame.x": 100, "frame.y": 8, "frame.width": 16, "frame.height": 16, "layout.padding": 0, "appearance.background.color": "#ffcc00" } });
        const c = call<{ id: string }>("component.createFrom", { ids: [main], name: `Comp${k}` }).id;
        props.push(call<{ id: string }>("component.exposeProperty", { kind: "text", name: "Label", layer: label }).id);
        call("component.addVariantProperty", { component: c, name: "Size", values: ["S", "M", "L"] });
        comps.push(c);
        labels.push(label);
      }
      const roots: { id: string; c: number; v: string }[] = [];
      for (let i = 0; i < 40; i++) {
        const k = i % 3;
        const v = ["S", "M", "L"][Math.floor(i / 3) % 3];
        const id = call<{ id: string }>("component.insert", { component: comps[k], parentId: frame, variant: { Size: v }, x: 10 + (i % 10) * 170, y: 400 + Math.floor(i / 10) * 70 }).id;
        roots.push({ id, c: k, v });
        call("component.setProperty", { property: props[k], value: `Item ${i}`, id });
        d.commands.updateProps(id, { "frame.width": 130 + i });
        const icon = d.get().layers[id].children.map((x) => d.get().layers[x]).find((x) => x.name === "icon")!.id;
        d.commands.updateProps(icon, { "appearance.background.color": `#0000${(i + 16).toString(16).padStart(2, "0")}` });
      }
      // edit every one of the nine mains
      const t0 = performance.now();
      for (const [k, c] of comps.entries()) {
        for (const [vi, v] of d.get().designComponents![c].variants!.entries()) {
          d.commands.updateProps(v.mainId, { "appearance.radius": 4 + vi + k, "frame.height": 40 + 4 * vi });
          const label = d.get().layers[v.mainId].children.find((x) => d.get().layers[x].archetype === "text")!;
          d.commands.updateProps(label, { "typography.color": `#00${k}${vi}00` });
          const id = d.commands.addLayer({ archetype: "container", parentId: v.mainId, name: "chip", properties: { positioning: "absolute", "frame.x": 60, "layout.padding": 0, "frame.width": 10, "frame.height": 10 } });
          void id;
        }
      }
      return { roots, ms: performance.now() - t0 };
    });
    expect(result.ms).toBeLessThan(3000);
    for (const [i, r] of result.roots.entries()) {
      const vi = ["S", "M", "L"].indexOf(r.v);
      const got = await page.evaluate(({ id }) => {
        const dd = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().layers;
        const kids = dd[id].children.map((x) => dd[x]);
        const label = kids.find((x) => x.archetype === "text")!;
        const icon = kids.find((x) => x.name === "icon")!;
        return { width: dd[id].properties["frame.width"], height: dd[id].properties["frame.height"], radius: dd[id].properties["appearance.radius"], text: label.properties["content.text"], color: label.properties["typography.color"], icon: icon.properties["appearance.background.color"], count: kids.length };
      }, { id: r.id });
      expect(got.width, `width ${i}`).toBe(130 + i);
      expect(got.height, `height ${i}`).toBe(40 + 4 * vi);
      expect(got.radius).toBe(4 + vi + r.c);
      expect(got.text, `text ${i}`).toBe(`Item ${i}`);
      expect(got.color).toBe(`#00${r.c}${vi}00`);
      expect(got.icon, `icon ${i}`).toBe(`#0000${(i + 16).toString(16).padStart(2, "0")}`);
      expect(got.count).toBe(3);
    }
    // the stage draws it
    const last = result.roots[39];
    await expect.poll(() => css(page, last.id, "width")).toBe(`${130 + 39}px`);
  });
});
