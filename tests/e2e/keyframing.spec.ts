/**
 * ROADMAP Phases 64–68, driven through the real Layer Timeline, Graph editor and Content Browser:
 *  64 keyframes are painted on one canvas and only the rows in view are built;
 *  65 precomps open as tabs with breadcrumbs, and the parent bar shows what is inside;
 *  66 auto-key makes keyframes (3 changes, 3 keyframes, undo removes them), and keyframes select, move, copy, paste, delete;
 *  67 the graph editor sets easing: presets, bezier handles, Bounce and Time, no stiffness or damping on the Simple face;
 *  68 the Animation panel's tracks live in the document.
 */
import { test, expect, type Page } from "@playwright/test";
import { focusApp, openEditor } from "./support/editor";

const STAGE = 'iframe[title="Stage"]';
const PPS = 120;
const HERO = "el_hero_heading";
const BUTTON = "el_buy_button";

type Kf = { id: string; time: number; value: unknown; ease?: string; hold?: boolean };
type Doc = {
  clips: Record<string, { id: string; layerId: string; name: string; tracks: Array<{ id: string; property: string; keyframes: Kf[] }> }>;
  compositions: Record<string, { id: string; name: string; kind: string; clips: Array<{ clipId: string }>; nested: Array<{ id: string; compositionId: string }> }>;
};
const doc = (page: Page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__LL_ENGINE__!.document())) as Doc);
const keys = async (page: Page, layerId: string, property: string): Promise<Kf[]> =>
  Object.values((await doc(page)).clips).filter((c) => c.layerId === layerId).flatMap((c) => c.tracks.filter((t) => t.property === property).flatMap((t) => t.keyframes));
const kernel = (page: Page, layerId: string, t: number) => page.evaluate(([l, time]) => window.__LL_ENGINE__!.kernel(l as string, time as number), [layerId, t] as const);

/** Runs a registered command with the arguments the UI would pass (the registry is reachable with `__LL_TEST__`). */
const run = (page: Page, id: string, args: unknown) =>
  page.evaluate(([cid, a]) => {
    const reg = (window as unknown as { __LL_COMMANDS__: { all: () => Array<{ id: string; run: (a: unknown) => unknown }> } }).__LL_COMMANDS__;
    return reg.all().find((c) => c.id === cid)!.run(a);
  }, [id, args] as const);

async function openTimeline(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __LL_TEST__: boolean }).__LL_TEST__ = true;
  });
  await openEditor(page);
  await page.getByRole("tab", { name: /Animate/ }).click();
  await page.locator(".timeline").waitFor({ state: "visible", timeout: 15_000 });
  await page.getByRole("button", { name: "Mount Showcase Demo" }).click();
  await page.waitForFunction((sel) => !!document.querySelector<HTMLIFrameElement>(sel)?.contentDocument?.querySelector('[data-element-id="el_buy_button"]'), STAGE);
  await page.getByRole("button", { name: /Show children of/ }).first().click();
}

/** Rows are built only for what is in view (Phase 64): scroll the list until `selector` exists, then bring it on screen. */
async function reveal(page: Page, selector: string) {
  const target = page.locator(selector).first();
  const scroller = page.locator(".timeline__scroll");
  await scroller.evaluate((el) => el.scrollTo(0, 0));
  for (let i = 0; i < 80 && (await target.count()) === 0; i++) {
    await scroller.evaluate((el) => el.scrollBy(0, 90));
    await page.waitForTimeout(50); // the window of built rows follows the scroll a frame later
  }
  await target.scrollIntoViewIfNeeded();
  return target;
}

async function openProps(page: Page, layerId: string, groups: string[] = ["transform"]) {
  await page.locator(`[data-timeline-row="${layerId}"]`).getByRole("button", { name: /Show properties of/ }).click();
  // open the lower groups first: opening one pushes the groups under it out of the window of built rows
  for (const g of groups) await page.locator(`[data-timeline-group="${layerId}|${g}"]`).getByRole("button", { name: /^Show/ }).click();
}

const seekTo = async (page: Page, seconds: number) => {
  const box = (await page.locator("[data-timeline-ruler]").boundingBox())!;
  await page.mouse.click(box.x + seconds * PPS, box.y + 20);
  await expect.poll(() => page.evaluate(() => window.__LL_ENGINE__!.time())).toBeCloseTo(seconds, 1);
};
const addKey = (page: Page, label: string, layer = "HeroHeading") => page.getByRole("button", { name: `Add keyframe for ${label} of ${layer} at the playhead` }).click();
const keyCountText = (page: Page) => page.locator(".timeline__keycount");
const undo = async (page: Page) => {
  await focusApp(page);
  await page.keyboard.press("Control+z");
};

/** Where a keyframe of a property row is on screen (the canvas has no DOM node for it). */
async function keyPoint(page: Page, layerId: string, property: string, time: number) {
  const lane = page.locator(`[data-timeline-property="${layerId}|${property}"] .timeline__lane`);
  const box = (await lane.boundingBox())!;
  return { x: box.x + time * PPS, y: box.y + box.height / 2 };
}

test("Phase 64: keyframes are painted on one canvas, not made of DOM nodes", async ({ page }) => {
  await openTimeline(page);
  await openProps(page, HERO);
  const canvas = page.locator("[data-timeline-canvas]");
  await expect(canvas).toBeAttached();
  const painted = () => canvas.evaluate((c: HTMLCanvasElement) => {
    const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return true;
    return false;
  });
  expect(await painted(), "no keyframes yet, nothing painted").toBe(false);

  await seekTo(page, 1);
  await addKey(page, "Position X");
  await seekTo(page, 2);
  await addKey(page, "Position X");
  const lane = page.locator('[data-timeline-property="el_hero_heading|transform.x"] .timeline__lane');
  await expect(lane).toHaveAttribute("data-key-count", "2");
  await expect.poll(painted).toBe(true);
  expect(await page.locator(".timeline__key, [data-keyframe]").count(), "no DOM node per keyframe").toBe(0);
  expect(await keys(page, HERO, "transform.x")).toHaveLength(2);
});

test("Phase 64: only the rows in view are built, and scrolling builds the rest", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 520 }); // a short drawer, so a few dozen rows are more than the window
  await openTimeline(page);
  await openProps(page, BUTTON, ["appearance", "transform"]);
  const items = page.locator(".timeline__items");
  const total = Number(await items.getAttribute("data-rows-total"));
  const built = Number(await items.getAttribute("data-rows-built"));
  expect(total).toBeGreaterThan(20);
  expect(built, `${built} of ${total} rows are in the page`).toBeLessThan(total);
  const builtIds = () => page.locator("[data-timeline-row], [data-timeline-group], [data-timeline-property]").evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.timelineRow ?? (el as HTMLElement).dataset.timelineGroup ?? (el as HTMLElement).dataset.timelineProperty ?? ""));
  expect((await builtIds()).length).toBeLessThanOrEqual(built);
  const atTop = await builtIds();
  await page.locator(".timeline__scroll").evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect.poll(async () => (await builtIds())[0]).not.toBe(atTop[0]);
  expect((await builtIds()).length).toBeLessThan(total);
  await page.locator(".timeline__scroll").evaluate((el) => el.scrollTo(0, 0));
  await expect.poll(async () => (await builtIds())[0]).toBe(atTop[0]);
});

test("Phase 65: a precomp opens in a tab with breadcrumbs, is edited, and the parent shows the change", async ({ page }) => {
  await openTimeline(page);
  await expect(page.getByRole("tab", { name: "Main" })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("button", { name: "+ Precomp" }).click();
  const nested = page.locator("[data-timeline-nested]");
  await expect(nested).toHaveCount(1);
  await expect(nested).toContainText("empty");
  const compId = Object.values((await doc(page)).compositions).find((c) => c.kind === "precomp")!.id;

  // double-click the bar: a new tab, and the breadcrumbs say Main › Precomp 1
  await nested.locator("[data-nested-bar]").dblclick();
  await expect(page.getByRole("tab", { name: "Precomp 1" })).toHaveAttribute("aria-selected", "true");
  const crumbs = page.getByRole("navigation", { name: "Breadcrumbs" });
  await expect(crumbs).toContainText("Main");
  await expect(crumbs).toContainText("Precomp 1");

  // edit inside it: the keyframe lands in the precomp, not in Main
  await openProps(page, HERO);
  await seekTo(page, 0.5);
  await addKey(page, "Position X");
  await expect.poll(async () => (await doc(page)).compositions[compId].clips.length).toBe(1);
  const inside = (await doc(page)).compositions[compId].clips[0].clipId;
  expect((await doc(page)).compositions.comp_main.clips.some((p) => p.clipId === inside), "not placed in Main").toBe(false);

  // back through the breadcrumb: the parent's bar says what is inside
  await crumbs.getByRole("button", { name: "Main" }).click();
  await expect(page.getByRole("tab", { name: "Main" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("[data-timeline-nested]")).toContainText("1 key time");
  await expect(page.locator("[data-nested-bar] .timeline__nested-key")).toHaveCount(1);

  // the precomp's tab stays until it is closed
  await expect(page.getByRole("tab", { name: "Precomp 1" })).toBeVisible();
  await page.getByRole("button", { name: "Close Precomp 1" }).click();
  await expect(page.getByRole("tab", { name: "Precomp 1" })).toHaveCount(0);
  expect(Object.keys((await doc(page)).compositions)).toContain(compId);
});

test("Phase 66: Auto-key: 3 changes make 3 keyframes, playback matches, and undo removes them", async ({ page }) => {
  await openTimeline(page);
  await page.getByRole("button", { name: "● Auto-key" }).click();
  await expect(page.getByRole("button", { name: "● Auto-key" })).toHaveAttribute("aria-pressed", "true");
  for (const [t, x] of [[0, 10], [1, 60], [2, 120]] as const) {
    await seekTo(page, t);
    await run(page, "layer.setProps", { ids: [HERO], props: { "transform.x": x }, label: "Set position" });
  }
  await expect.poll(async () => (await keys(page, HERO, "transform.x")).length).toBe(3);
  expect((await keys(page, HERO, "transform.x")).map((k) => k.value)).toEqual([10, 60, 120]);
  for (const [t, x] of [[0.5, 35], [1.5, 90], [3, 120]] as const) {
    const resolved = (await kernel(page, HERO, t)) as Record<string, number>;
    expect(resolved["transform.x"]).toBeCloseTo(x, 3);
  }
  await undo(page);
  await expect.poll(async () => (await keys(page, HERO, "transform.x")).length).toBe(2);
  await undo(page);
  await undo(page);
  await expect.poll(async () => (await keys(page, HERO, "transform.x")).length).toBe(0);
  // with Auto-key off an edit is just an edit
  await page.getByRole("button", { name: "● Auto-key" }).click();
  await run(page, "layer.setProps", { ids: [HERO], props: { "transform.x": 5 }, label: "Set position" });
  expect(await keys(page, HERO, "transform.x")).toHaveLength(0);
});

test("Phase 66: select, move, copy, paste and delete keyframes", async ({ page }) => {
  await openTimeline(page);
  await openProps(page, HERO);
  for (const t of [1, 2]) {
    await seekTo(page, t);
    await addKey(page, "Position X");
  }
  await expect(keyCountText(page)).toHaveText("No keyframes selected");

  // click selects one (and the playhead goes to it); Shift-click adds the other
  await page.mouse.click(...(Object.values(await keyPoint(page, HERO, "transform.x", 1)) as [number, number]));
  await expect(keyCountText(page)).toHaveText("1 keyframe selected");
  const second = await keyPoint(page, HERO, "transform.x", 2);
  await page.keyboard.down("Shift");
  await page.mouse.click(second.x, second.y);
  await page.keyboard.up("Shift");
  await expect(keyCountText(page)).toHaveText("2 keyframes selected");

  // drag them together by 0.5 s (60 px): one undo step
  await page.mouse.move(second.x, second.y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(second.x + 10 * i, second.y);
  await page.mouse.up();
  await expect.poll(async () => (await keys(page, HERO, "transform.x")).map((k) => Math.round(k.time * 100) / 100)).toEqual([1.5, 2.5]);
  await undo(page);
  await expect.poll(async () => (await keys(page, HERO, "transform.x")).map((k) => Math.round(k.time * 100) / 100)).toEqual([1, 2]);

  // copy, select the button layer and paste at the playhead (3 s)
  await page.getByRole("button", { name: "Copy keys" }).click();
  await seekTo(page, 3);
  await (await reveal(page, `[data-timeline-row="${BUTTON}"] .timeline__head`)).click({ position: { x: 300, y: 10 } });
  await page.getByRole("button", { name: "Paste keys" }).click();
  await expect.poll(async () => (await keys(page, BUTTON, "transform.x")).map((k) => Math.round(k.time * 100) / 100)).toEqual([3, 4]);
  await undo(page);
  await expect.poll(async () => (await keys(page, BUTTON, "transform.x")).length).toBe(0);

  // align both to the playhead (3 s), then delete with the keyboard while the pointer is over the timeline
  await run(page, "timeline.selectKeyframes", { ids: (await keys(page, HERO, "transform.x")).map((k) => k.id) });
  await expect(keyCountText(page)).toHaveText("2 keyframes selected");
  await page.getByRole("button", { name: "Align to playhead" }).click();
  await expect.poll(async () => new Set((await keys(page, HERO, "transform.x")).map((k) => Math.round(k.time * 100) / 100)).size).toBe(1);
  await page.mouse.move(second.x, second.y - 60);
  await page.keyboard.press("Delete");
  await expect.poll(async () => (await keys(page, HERO, "transform.x")).length).toBe(0);
  await expect(keyCountText(page)).toHaveText("No keyframes selected");
});

test("Phase 66: Shift-drag on empty lane box-selects keyframes", async ({ page }) => {
  await openTimeline(page);
  await openProps(page, HERO);
  for (const t of [1, 2, 3]) {
    await seekTo(page, t);
    await addKey(page, "Position X");
  }
  const lane = (await page.locator('[data-timeline-property="el_hero_heading|transform.x"] .timeline__lane').boundingBox())!;
  const y = lane.y + lane.height / 2;
  await page.keyboard.down("Shift");
  await page.mouse.move(lane.x + 0.7 * PPS, y - 8);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(lane.x + 0.7 * PPS + ((2.6 - 0.7) * PPS * i) / 6, y + 4);
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await expect(keyCountText(page)).toHaveText("2 keyframes selected");
});

test("Phase 67: the graph editor sets easing, by preset, by handles and by Bounce and Time", async ({ page }) => {
  await openTimeline(page);
  await page.getByRole("button", { name: "● Auto-key" }).click();
  for (const [t, x] of [[0, 10], [1, 110]] as const) {
    await seekTo(page, t);
    await run(page, "layer.setProps", { ids: [HERO], props: { "transform.x": x }, label: "Set position" });
  }
  await page.getByRole("button", { name: "● Auto-key" }).click();
  await run(page, "timeline.selectAllKeyframes", {});
  await focusApp(page);
  await page.keyboard.press("Control+Shift+K");
  const graph = page.getByRole("region", { name: "Graph editor" });
  await expect(graph).toBeVisible();
  await expect(graph.locator("[data-graph-key]")).toHaveCount(2);
  await expect(graph.locator("[data-graph-curve]")).toHaveCount(1);

  // pick the second keyframe: its easing is the segment into it
  await graph.locator("[data-graph-key]").nth(1).dispatchEvent("pointerdown", { shiftKey: false });
  await expect(graph.getByText("Easing into the selected keyframe")).toBeVisible();
  await graph.getByRole("button", { name: "Bouncy" }).click();
  await expect.poll(async () => (await keys(page, HERO, "transform.x"))[1].ease).toBe("spring(bounce: 0.45, time: 0.5)");
  const samples = await Promise.all([0.5, 0.6, 0.7, 0.8, 0.9].map((t) => kernel(page, HERO, t)));
  expect(Math.max(...samples.map((s) => (s as Record<string, number>)["transform.x"])), "a bouncy spring goes past the target").toBeGreaterThan(110);

  // Simple face: Bounce and Time, nothing physical
  await expect(graph.getByRole("slider", { name: "Bounce" })).toBeVisible();
  await expect(graph.getByRole("slider", { name: "Time" })).toBeVisible();
  const text = (await graph.innerText()).toLowerCase();
  expect(text).not.toContain("stiffness");
  expect(text).not.toContain("damping");
  await graph.getByRole("slider", { name: "Bounce" }).fill("0.2");
  await expect.poll(async () => (await keys(page, HERO, "transform.x"))[1].ease).toMatch(/^spring\(bounce: 0\.2, time: 0\.5\)$/);

  // a bezier curve has handles; dragging one changes the easing
  await graph.getByRole("button", { name: "Ease in and out" }).click();
  await expect.poll(async () => (await keys(page, HERO, "transform.x"))[1].ease).toBe("cubic-bezier(0.42, 0, 0.58, 1)");
  const handle = graph.locator('[data-graph-handle="out"]');
  await expect(handle).toBeVisible();
  const hb = (await handle.boundingBox())!;
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 5; i++) await page.mouse.move(hb.x + hb.width / 2 + 8 * i, hb.y + hb.height / 2 - 4 * i);
  await page.mouse.up();
  await expect.poll(async () => (await keys(page, HERO, "transform.x"))[1].ease).toMatch(/^cubic-bezier\(/);
  expect((await keys(page, HERO, "transform.x"))[1].ease).not.toBe("cubic-bezier(0.42, 0, 0.58, 1)");

  // the curve the graph shows is what the kernel plays: Hold makes a step
  await graph.getByRole("button", { name: "Hold" }).click();
  await expect.poll(async () => (await keys(page, HERO, "transform.x"))[0].hold).toBe(true);
  expect(((await kernel(page, HERO, 0.9)) as Record<string, number>)["transform.x"]).toBe(10);

  // speed graph
  await graph.getByRole("button", { name: "Speed graph" }).click();
  await expect(graph.locator("svg")).toHaveAttribute("data-graph-mode", "speed");
});
