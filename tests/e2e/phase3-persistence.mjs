// ROADMAP Phase 3 Verification Gate, driven in real browsers through the real UI.
//
//   PW_DIR=<dir with playwright, pixelmatch, pngjs installed> \
//     node tests/e2e/phase3-persistence.mjs [baseUrl] [outDir] [browsers]
//
// Run against a production build (`npm run build && npx next start`).
// browsers: comma list of chromium,firefox,webkit (default: all three).
//
// Checks, per browser:
//   A. New project → 20 edits (Sequencer "+ Keyframe") → reload → the live state
//      is identical (compared through File → Export Project File, which
//      serialises the in-memory project) → Cmd/Ctrl+Z ×20 → the blank start.
//   B. The exported .lazy.json, imported in a fresh browser profile (File →
//      Import), renders pixel-identically to the original (canvas + timeline).
//   C. Dropping the file on the window also opens it.
//   D. (Chromium) Crash recovery: an edit, then the renderer is killed before
//      autosave → the next load offers "Restore unsaved changes?" → Restore
//      brings the edit back.
// Phase 4 moves this into the Playwright test harness.
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const pwDir = process.env.PW_DIR;
if (!pwDir) throw new Error("Set PW_DIR to a directory with playwright, pixelmatch and pngjs installed");
const req = createRequire(`${pwDir.replace(/\/$/, "")}/`);
const playwright = req("playwright");
const { PNG } = req("pngjs");
const pixelmatch = (await import(req.resolve("pixelmatch"))).default;

const [base = "http://localhost:3000", out = "/tmp/lazylayout-phase3", browserList = "chromium,firefox,webkit"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const EDITS = 20;
const MAX_DIFF_RATIO = 0.0; // "pixel-identical"
let failures = 0;

function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

async function newPage(browser) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message.slice(0, 200)));
  return { context, page };
}

async function openEditor(page, url = `${base}/editor`) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForFunction(() => new URL(location.href).searchParams.has("projectId"));
  await waitSaved(page);
}

/** The Save button shows a dot while changes are unsaved. */
async function waitSaved(page) {
  await page.waitForTimeout(150);
  await page.waitForFunction(() => !document.querySelector(".viewport-action-btn__dirty-dot"), null, { timeout: 15000 });
}

/** Focus the app (not an input or the stage iframe) so shortcuts reach the window. */
async function focusApp(page) {
  await page.locator(".studio-header").first().click({ position: { x: 700, y: 10 } });
}

async function openFileMenu(page) {
  await page.getByRole("button", { name: "File", exact: true }).click();
}

/** File → Export Project File; returns the parsed .lazy.json. */
async function exportProject(page, label) {
  await openFileMenu(page);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByText("Export Project File (.lazy.json)").click()]);
  const path = `${out}/${label}.lazy.json`;
  await download.saveAs(path);
  return { path, file: JSON.parse(readFileSync(path, "utf8")) };
}

/** JSON with sorted keys: key order carries no meaning (loading re-parses through the schema). */
function canonical(value) {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v
  );
}

/** The parts of an export that must match: the project data, without identity or timestamps. */
function comparable(file) {
  const { projectId: _id, ...snapshot } = file.snapshot;
  void _id;
  return canonical(snapshot);
}

async function shot(page, label) {
  // The stage and the timeline; the header and status bar carry the project id and live FPS/memory counters.
  await page.mouse.move(5, 995); // no hover states
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.waitForTimeout(600);
  const center = await page.locator(".dock-zone--center").first().screenshot();
  const bottom = await page.locator(".dock-zone--bottom").first().screenshot();
  writeFileSync(`${out}/${label}-center.png`, center);
  writeFileSync(`${out}/${label}-bottom.png`, bottom);
  return { center, bottom };
}

function diffRatio(a, b, label) {
  const A = PNG.sync.read(a);
  const B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return { ratio: 1, note: `size ${A.width}x${A.height} vs ${B.width}x${B.height}` };
  const diff = new PNG({ width: A.width, height: A.height });
  const n = pixelmatch(A.data, B.data, diff.data, A.width, A.height, { threshold: 0 });
  writeFileSync(`${out}/${label}-diff.png`, PNG.sync.write(diff));
  return { ratio: n / (A.width * A.height), note: `${n} px differ` };
}

async function openSequencer(page) {
  await page.getByRole("button", { name: "Motion Sequencer" }).click();
  await page.waitForTimeout(300);
}

async function run(browserName) {
  console.log(`\n== ${browserName}`);
  const browser = await playwright[browserName].launch();

  // ---------------------------------------------------------------- A
  const a = await newPage(browser);
  await openEditor(a.page);
  const url = a.page.url();
  const blank = await exportProject(a.page, `${browserName}-blank`);

  await openSequencer(a.page);
  const addKeyframe = a.page.getByTitle("Add keyframe at current playhead position");
  for (let i = 0; i < EDITS; i++) await addKeyframe.click();
  await waitSaved(a.page);
  const edited = await exportProject(a.page, `${browserName}-edited`);
  const clips = Object.values(edited.file.snapshot.document.clips);
  const keyframes = clips.flatMap((c) => c.tracks).reduce((n, t) => n + t.keyframes.length, 0);
  check("20 edits land in the document", clips.length === 1 && keyframes >= EDITS, `${clips.length} clip, ${keyframes} keyframes`);

  await a.page.reload({ waitUntil: "networkidle" });
  await waitSaved(a.page);
  check("reload keeps the same project", a.page.url() === url);
  const reloaded = await exportProject(a.page, `${browserName}-reloaded`);
  check("state after reload is identical", comparable(reloaded.file) === comparable(edited.file));
  // Reference render: the original project with fresh UI state (no leftover selection), like the import below.
  await openSequencer(a.page);
  const before = await shot(a.page, `${browserName}-A-reloaded`);

  await focusApp(a.page);
  for (let i = 0; i < EDITS; i++) await a.page.keyboard.press(browserName === "webkit" ? "Meta+z" : "Control+z");
  await waitSaved(a.page);
  const undone = await exportProject(a.page, `${browserName}-undone`);
  check(`${EDITS} undos after reload return to the blank start`, canonical(undone.file.snapshot.document) === canonical(blank.file.snapshot.document));
  check("no page errors (A)", a.page.errors.length === 0, a.page.errors.join(" | "));

  // ---------------------------------------------------------------- B
  const b = await newPage(browser); // fresh profile: empty IndexedDB and localStorage
  await openEditor(b.page);
  await openFileMenu(b.page);
  const [chooser] = await Promise.all([b.page.waitForEvent("filechooser"), b.page.getByText("Import Project File...").click()]);
  await chooser.setFiles(edited.path);
  await b.page.waitForFunction((oldUrl) => location.href !== oldUrl, b.page.url());
  await waitSaved(b.page);
  await openSequencer(b.page);
  const imported = await exportProject(b.page, `${browserName}-imported`);
  check("import in a fresh profile restores the document", canonical(imported.file.snapshot.document) === canonical(edited.file.snapshot.document));
  const after = await shot(b.page, `${browserName}-B-imported`);
  for (const region of ["center", "bottom"]) {
    const { ratio, note } = diffRatio(before[region], after[region], `${browserName}-B-${region}`);
    check(`imported project renders pixel-identically (${region})`, ratio <= MAX_DIFF_RATIO, note);
  }
  check("no page errors (B)", b.page.errors.length === 0, b.page.errors.join(" | "));

  // ---------------------------------------------------------------- C
  const c = await newPage(browser);
  await openEditor(c.page);
  const startUrl = c.page.url();
  await c.page.evaluate(async (text) => {
    const dt = new DataTransfer();
    dt.items.add(new File([text], "dropped.lazy.json", { type: "application/json" }));
    window.dispatchEvent(new DragEvent("dragover", { dataTransfer: dt, bubbles: true, cancelable: true }));
    window.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, readFileSync(edited.path, "utf8"));
  await c.page.waitForFunction((oldUrl) => location.href !== oldUrl, startUrl);
  await waitSaved(c.page);
  const dropped = await exportProject(c.page, `${browserName}-dropped`);
  check("dropping a .lazy.json opens it", canonical(dropped.file.snapshot.document) === canonical(edited.file.snapshot.document));

  // ---------------------------------------------------------------- D
  if (browserName === "chromium") {
    const d = await newPage(browser);
    await openEditor(d.page);
    const projectUrl = d.page.url();
    await openSequencer(d.page);
    await d.page.getByTitle("Add keyframe at current playhead position").click();
    const cdp = await d.context.newCDPSession(d.page);
    // The renderer dies before the 400 ms autosave. The command never answers once the page is gone.
    const crashed = d.page.waitForEvent("crash");
    void cdp.send("Page.crash").catch(() => {});
    await crashed;
    const again = await d.context.newPage();
    await again.goto(projectUrl, { waitUntil: "networkidle" });
    const prompt = again.getByRole("alertdialog");
    await prompt.waitFor({ timeout: 10000 });
    await again.screenshot({ path: `${out}/chromium-D-recovery-prompt.png` });
    check("crash recovery prompt appears", (await prompt.innerText()).includes("1 change"));
    await again.getByRole("button", { name: "Restore" }).click();
    await waitSaved(again);
    const recovered = await exportProject(again, "chromium-recovered");
    const kfs = Object.values(recovered.file.snapshot.document.clips).flatMap((c) => c.tracks).reduce((n, t) => n + t.keyframes.length, 0);
    check("Restore brings the lost edit back", kfs >= 1, `${kfs} keyframes`);
    await again.reload({ waitUntil: "networkidle" });
    check("no prompt after restoring", (await again.getByRole("alertdialog").count()) === 0);
  }

  // ---------------------------------------------------------------- E
  // A drag is one undo step: drag a keyframe, undo once → it is back where it was, and still exists.
  const e = await newPage(browser);
  await openEditor(e.page);
  await openSequencer(e.page);
  await e.page.getByTitle("Add keyframe at current playhead position").click();
  await waitSaved(e.page);
  const placed = await exportProject(e.page, `${browserName}-E-placed`);
  const diamond = e.page.locator(".dock-zone--bottom [title*='@ 0.000s']").last();
  const box = await diamond.boundingBox();
  if (!box) {
    check("drag test found the new keyframe", false);
  } else {
    await e.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await e.page.mouse.down();
    for (let i = 1; i <= 12; i++) await e.page.mouse.move(box.x + box.width / 2 + i * 10, box.y + box.height / 2);
    await e.page.mouse.up();
    await waitSaved(e.page);
    const dragged = await exportProject(e.page, `${browserName}-E-dragged`);
    const times = (f) => Object.values(f.snapshot.document.clips).flatMap((c) => c.tracks).flatMap((t) => t.keyframes.map((k) => k.time)).sort().join(",");
    check("the drag moved a keyframe", times(dragged.file) !== times(placed.file), `${times(placed.file)} → ${times(dragged.file)}`);
    await focusApp(e.page);
    await e.page.keyboard.press(browserName === "webkit" ? "Meta+z" : "Control+z");
    await waitSaved(e.page);
    const undoneDrag = await exportProject(e.page, `${browserName}-E-undone`);
    check("one undo reverts the whole drag (and only the drag)", canonical(undoneDrag.file.snapshot.document) === canonical(placed.file.snapshot.document));
  }

  await browser.close();
}

for (const name of browserList.split(",")) await run(name.trim());
console.log(failures ? `\n${failures} check(s) failed` : "\nPhase 3 gate: all checks passed");
process.exit(failures ? 1 : 0);
