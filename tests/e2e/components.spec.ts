/**
 * ROADMAP Phase 46 gate, in Chromium, Firefox and WebKit: a frame becomes a main component; instances put on the
 * canvas from the Assets panel follow it; an instance's own changes are overrides that survive edits of the main and
 * can be reset; Go to main, swap and detach work from the inspector; and editing a main component keeps every override
 * in 40 instances (colour, size and a hidden layer) while the edit and the update of all 40 are one undo step.
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

type L = { id: string; parentId: string | null; children: string[]; properties: Record<string, unknown>; visible?: boolean; componentMain?: string; instance?: { component: string; source: string; root?: boolean; overridden?: string[] } };
type Doc = { commands: { addLayer: (input: unknown, label?: string) => string; updateProps: (id: string, patch: Record<string, unknown>) => void; setLayerFlags: (id: string, flags: Record<string, unknown>) => void }; get: () => { layers: Record<string, L>; designComponents?: Record<string, { id: string; name: string; mainId: string }> } };
type Reg = { all: () => { id: string; run: (a?: unknown) => unknown }[] };
const run = (page: Page, id: string, args?: unknown) => page.evaluate(({ id, args }) => (window as unknown as { __LL_COMMANDS__: Reg }).__LL_COMMANDS__.all().find((c) => c.id === id)!.run(args), { id, args });
const select = (page: Page, ids: string[]) => run(page, "selection.set", { ids });
const doc = <T,>(page: Page, fn: (d: ReturnType<Doc["get"]>) => T) => page.evaluate((src) => new Function("d", `return (${src})(d)`)((window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get()) as T, fn.toString());

const css = (page: Page, id: string, prop: string) =>
  page.evaluate(
    ({ id, prop }) => {
      const d = Array.from(document.querySelectorAll("iframe")).map((f) => f.contentDocument).find((c) => c?.querySelector(`[data-element-id="${id}"]`));
      const el = d?.querySelector<HTMLElement>(`[data-element-id="${id}"]`);
      return el ? (d!.defaultView!.getComputedStyle(el) as unknown as Record<string, string>)[prop] : null;
    },
    { id, prop },
  );

/** The layer of an instance that mirrors a main layer (searching the whole instance). */
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

/** A page frame holding a main "button": a frame with a label and an icon. */
async function build(page: Page) {
  return page.evaluate(() => {
    const d = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__;
    const frame = d.commands.addLayer({ archetype: "container", parentId: null, name: "Page", properties: { positioning: "absolute", "frame.x": 3000, "frame.y": 0, "frame.width": 900, "frame.height": 700, "layout.padding": 0, "appearance.background.color": "#ffffff" } });
    const mk = (name: string, parentId: string, props: Record<string, unknown>) => d.commands.addLayer({ archetype: "container", parentId, name, properties: { positioning: "absolute", "layout.padding": 0, ...props } });
    const main = mk("Button", frame, { "frame.x": 20, "frame.y": 20, "frame.width": 160, "frame.height": 48, "appearance.background.color": "#336699", "appearance.radius": 8 });
    const label = mk("label", main, { "frame.x": 12, "frame.y": 12, "frame.width": 80, "frame.height": 24, "appearance.background.color": "#ffffff" });
    const icon = mk("icon", main, { "frame.x": 120, "frame.y": 12, "frame.width": 24, "frame.height": 24, "appearance.background.color": "#ffcc00" });
    return { frame, main, label, icon };
  });
}

test.describe("Phase 46: components and instances", () => {
  test("create a component, insert instances from the Assets panel, and edits of the main reach them", async ({ page }) => {
    await ready(page);
    const { main, label } = await build(page);
    await select(page, [main]);
    await page.getByRole("region", { name: "Component" }).getByRole("button", { name: "Create component" }).click();
    await expect.poll(() => doc(page, (d) => Object.keys(d.designComponents ?? {}).length)).toBe(1);
    // the Assets panel lists it
    await page.locator(".dock-zone--left").getByText("Assets", { exact: true }).first().click();
    const list = page.getByRole("region", { name: "Components" }).first();
    await expect(list.locator('[data-component="Button"]')).toBeVisible();
    await select(page, [await doc(page, (d) => d.layers[Object.values(d.designComponents!)[0].mainId].parentId!)]);
    await list.getByRole("button", { name: "Insert Button" }).click();
    await list.getByRole("button", { name: "Insert Button" }).click();
    await expect.poll(() => doc(page, (d) => Object.values(d.layers).filter((l) => l.instance?.root).length)).toBe(2);
    const instances = await doc(page, (d) => Object.values(d.layers).filter((l) => l.instance?.root).map((l) => l.id));
    const labelOf = (root: string) => kidOf(page, root, label);
    const l0 = await labelOf(instances[0]);
    await expect.poll(() => css(page, l0, "backgroundColor")).toBe("rgb(255, 255, 255)");
    // edit the main's label: every instance follows
    await page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.commands.updateProps(id, { "appearance.background.color": "#00ff00" }), label);
    for (const r of instances) await expect.poll(async () => css(page, await labelOf(r), "backgroundColor")).toBe("rgb(0, 255, 0)");
    // a main edit and the instances' update are one undo step
    await run(page, "edit.undo");
    await expect.poll(async () => css(page, await labelOf(instances[1]), "backgroundColor")).toBe("rgb(255, 255, 255)");
  });

  test("an override in an instance survives edits of the main, is listed in the inspector, and Reset gives the main's value back", async ({ page }) => {
    await ready(page);
    const { main, label } = await build(page);
    const c = await run(page, "component.createFrom", { ids: [main] }) as { id: string };
    const root = ((await run(page, "component.insert", { component: c.id, parentId: await doc(page, (d) => Object.values(d.layers).find((l) => l.parentId === null && l.properties["frame.x"] === 3000)!.id), x: 300, y: 200 })) as { id: string }).id;
    const instLabel = await kidOf(page, root, label);
    await select(page, [instLabel]);
    const face = page.getByRole("form", { name: "Design" });
    await face.locator('input[aria-label="Fill"]').fill("#ff00ff");
    await face.locator('input[aria-label="Fill"]').press("Enter");
    await expect.poll(() => css(page, instLabel, "backgroundColor")).toBe("rgb(255, 0, 255)");
    const panel = page.getByRole("region", { name: "Instance" });
    await expect(panel.locator('[data-overridden="appearance.background.color"]')).toBeVisible();
    // the main changes colour: the override stays, an untouched property follows
    await page.evaluate((id) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.commands.updateProps(id, { "appearance.background.color": "#00ff00", "appearance.radius": 9 }), label);
    await expect.poll(() => css(page, instLabel, "borderRadius")).toBe("9px");
    expect(await css(page, instLabel, "backgroundColor")).toBe("rgb(255, 0, 255)");
    await panel.getByRole("button", { name: "Reset appearance.background.color" }).click();
    await expect.poll(() => css(page, instLabel, "backgroundColor")).toBe("rgb(0, 255, 0)");
    await expect(panel.locator('[data-overridden="appearance.background.color"]')).toHaveCount(0);
  });

  test("Go to main, swap and detach from the inspector", async ({ page }) => {
    await ready(page);
    const { main, frame } = await build(page);
    const c = (await run(page, "component.createFrom", { ids: [main] })) as { id: string };
    const other = await page.evaluate((frame) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.commands.addLayer({ archetype: "container", parentId: frame, name: "Card", properties: { positioning: "absolute", "frame.x": 400, "frame.y": 20, "frame.width": 120, "frame.height": 90, "layout.padding": 0, "appearance.background.color": "#cc3333" } }), frame);
    const c2 = (await run(page, "component.createFrom", { ids: [other] })) as { id: string };
    const root = ((await run(page, "component.insert", { component: c.id, parentId: frame, x: 100, y: 300 })) as { id: string }).id;
    await select(page, [root]);
    const panel = page.getByRole("region", { name: "Instance" });
    await expect(panel).toContainText("Instance of Button");
    await panel.getByRole("button", { name: "Go to main component" }).click();
    await expect(page.getByRole("region", { name: "Component" })).toContainText("Main component");
    // swap the instance for a Card
    await select(page, [root]);
    await page.getByRole("region", { name: "Instance" }).getByLabel("Swap instance").selectOption(c2.id);
    await expect.poll(() => doc(page, (d) => Object.values(d.layers).filter((l) => l.instance?.root).map((l) => l.instance!.component))).toEqual([c2.id]);
    // detach: plain layers, the look stays
    const swapped = await doc(page, (d) => Object.values(d.layers).find((l) => l.instance?.root)!.id);
    await select(page, [swapped]);
    await page.getByRole("region", { name: "Instance" }).getByRole("button", { name: "Detach instance" }).click();
    await expect.poll(() => doc(page, (d) => Object.values(d.layers).filter((l) => l.instance).length)).toBe(0);
    await expect.poll(() => css(page, swapped, "backgroundColor")).toBe("rgb(204, 51, 51)");
  });

  test("editing the main keeps every override in 40 instances, and the edit with the update of all 40 is one undo step", async ({ page }) => {
    await ready(page);
    const { main, frame, label, icon } = await build(page);
    const c = (await run(page, "component.createFrom", { ids: [main] })) as { id: string };
    const result = await page.evaluate(
      ({ c, frame, label, icon, main }) => {
        const d = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__;
        const reg = (window as unknown as { __LL_COMMANDS__: Reg }).__LL_COMMANDS__;
        const insert = reg.all().find((x) => x.id === "component.insert")!;
        const roots: string[] = [];
        for (let i = 0; i < 40; i++) roots.push((insert.run({ component: c.id, parentId: frame, x: 10 + (i % 8) * 105, y: 100 + Math.floor(i / 8) * 60 }) as { id: string }).id);
        const kid = (root: string, source: string) => d.get().layers[root].children.map((k) => d.get().layers[k]).find((l) => l.instance?.source === source)!.id;
        roots.forEach((r, i) => {
          d.commands.updateProps(kid(r, label), { "appearance.background.color": `#${(0x100000 + i * 997).toString(16).padStart(6, "0").slice(0, 6)}` });
          d.commands.updateProps(r, { "frame.width": 150 + i });
          if (i % 4 === 0) d.commands.setLayerFlags(kid(r, icon), { visible: false });
        });
        const t0 = performance.now();
        d.commands.updateProps(main, { "appearance.radius": 14, "frame.height": 56 });
        d.commands.updateProps(label, { "frame.x": 20 });
        const ms = performance.now() - t0;
        return { roots, ms, ids: roots.map((r) => ({ r, label: kid(r, label), icon: kid(r, icon) })) };
      },
      { c, frame, label, icon, main },
    );
    expect(result.ms).toBeLessThan(500); // two edits, 40 instances updated each time
    for (const [i, x] of result.ids.entries()) {
      const props = await page.evaluate(({ r, l, ic }) => {
        const dd = (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().layers;
        return { width: dd[r].properties["frame.width"], height: dd[r].properties["frame.height"], radius: dd[r].properties["appearance.radius"], color: dd[l].properties["appearance.background.color"], x: dd[l].properties["frame.x"], iconVisible: dd[ic].visible };
      }, { r: x.r, l: x.label, ic: x.icon });
      expect(props.width, `width ${i}`).toBe(150 + i);
      expect(props.height).toBe(56);
      expect(props.radius).toBe(14);
      expect(props.color, `colour ${i}`).toBe(`#${(0x100000 + i * 997).toString(16).padStart(6, "0").slice(0, 6)}`);
      expect(props.x).toBe(20);
      expect(props.iconVisible, `icon ${i}`).toBe(i % 4 === 0 ? false : undefined);
    }
    // the stage draws them: spot check the last one
    const last = result.ids[39];
    await expect.poll(() => css(page, last.label, "borderRadius")).not.toBeNull();
    await expect.poll(() => css(page, result.roots[39], "borderRadius")).toBe("14px");
    // undo the last main edit: all 40 instances go back together
    await run(page, "edit.undo");
    await expect.poll(() => page.evaluate((r) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().layers[r].properties["frame.x"], result.ids[5].label)).toBe(12);
    await expect.poll(() => page.evaluate((r) => (window as unknown as { __LL_DOC__: Doc }).__LL_DOC__.get().layers[r].properties["frame.x"], result.ids[39].label)).toBe(12);
  });
});
