// Headless smoke test of the LazyLayout editor. Usage:
//   PW_DIR=<dir with playwright installed> node smoke.mjs <baseUrl> <outDir> [tag]
// Prints one line per step (result + console errors) and writes screenshots to outDir.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const pwDir = process.env.PW_DIR;
if (!pwDir) throw new Error("Set PW_DIR to the directory where `npm i playwright` was run");
const { chromium } = createRequire(`${pwDir.replace(/\/$/, "")}/`)("playwright");

const [base = "http://localhost:3000", out = "/tmp/lazylayout-smoke", tag = "run"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
let errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 240)));
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message.slice(0, 240)}`));

let failed = 0;
async function step(name, fn) {
  errors = [];
  let result;
  try {
    result = (await fn()) ?? "ok";
  } catch (e) {
    result = `STEP FAILED: ${e.message.split("\n")[0]}`;
    failed++;
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${tag}-${name}.png` });
  if (errors.length) failed++;
  console.log(`${name}: ${result}${errors.length ? `\n   errors: ${errors.join(" || ")}` : ""}`);
}

const search = () => page.locator('input[placeholder^="Find across"]').first();

await step("01-load", async () => {
  await page.goto(`${base}/editor`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  return page.url();
});
await step("02-mount-demo", async () => {
  await page.getByRole("button", { name: /Mount Showcase Demo/ }).first().click();
  await page.waitForTimeout(1200);
});
await step("03-command-palette", async () => {
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(400);
  await page.keyboard.type("undo");
  const ok = (await page.locator("body").innerText()).includes("Undo");
  await page.keyboard.press("Escape");
  return ok ? "filters" : "no 'Undo' command listed";
});
await step("04-global-search", async () => {
  await page.keyboard.press("Control+Shift+F");
  // The canvas "Prompt AI" input steals focus on open (pre-existing); fill the search input directly.
  await search().fill("button");
  await page.waitForTimeout(500);
  const hit = await page.locator("text=BuyButton").count();
  await search().press("Enter");
  return hit ? "BuyButton found and selected" : "BuyButton not found";
});
await step("05-copilot-selection", async () => {
  await page.locator("text=LazyLayout").first().click(); // focus back out of the sandbox iframe
  await page.keyboard.press("Control+Shift+I");
  await page.waitForTimeout(700);
  return (await page.locator("text=BuyButton (button)").count()) ? "co-pilot sees selection" : "co-pilot has no selection";
});
await step("06-sequencer", async () => {
  await page.keyboard.press("Control+Shift+M");
  await page.waitForTimeout(600);
  await page.mouse.click(800, 850);
  await page.keyboard.press("Space");
  await page.waitForTimeout(800);
  await page.keyboard.press("Space");
});
await step("07-live-code", async () => {
  await page.keyboard.press("Control+Shift+G");
  await page.waitForTimeout(1200);
  return (await page.locator("body").innerText()).match(/Compiled in \d+ms/)?.[0] ?? "no compile label";
});
await step("08-blueprint", async () => {
  // The Blueprint canvas is easiest to reach on its detach page.
  await page.goto(`${base}/editor/detach/blueprint`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const nodes = await page.locator("[data-node-id]").count();
  // Wires are painted on <canvas> (the SVG paths are transparent hit areas); sample the
  // Query Collection -> Branch exec wire, which sits at roughly (860, 231) at 100% zoom.
  const alpha = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    if (!c) return -1;
    const r = c.getBoundingClientRect();
    return c.getContext("2d").getImageData(Math.round(860 - r.left), Math.round(231 - r.top), 1, 1).data[3];
  });
  return `nodes=${nodes}, exec wire painted=${alpha > 0}`;
});

await browser.close();
console.log(failed ? `\n${failed} step(s) failed or logged errors` : "\nall steps passed");
process.exit(failed ? 1 : 0);
