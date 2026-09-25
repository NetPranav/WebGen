/**
 * ROADMAP Sub-Phase 5.3 — runs the Wasm-vs-TypeScript benchmark in a real
 * Chromium instance (not jsdom/node) and prints the result as JSON. This is
 * the exact script that produced the numbers in ../../0001-wasm.md.
 *
 * The C++ kernel here never actually compiled before this decision (see
 * 0001-wasm.md's "What was fixed to even get a benchmark" section) — it
 * needs the fixes already applied in ../src/ and ../include/ in this
 * archive to build at all.
 *
 * To reproduce from a repo checkout, from this `benchmark/` directory:
 *   1. Install Emscripten (emsdk) and activate it (`source emsdk_env.sh`).
 *   2. `cd .. && make release` (writes `../dist/engine.js` + `.wasm`).
 *   3. `cp ../dist/engine.js ../dist/engine.wasm .`
 *   4. Bundle the TS solver for the browser (from the repo root):
 *      `npx esbuild src/core/wasm/SplineSolver.ts --bundle --format=iife \
 *         --global-name=TSEngine --platform=browser \
 *         --outfile=DOCS/Initial/decisions/0001-wasm-archive/benchmark/spline-solver.bundle.js`
 *   5. `npx tsx run-bench.mts` (needs `@playwright/test` installed at the repo root)
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".wasm": "application/wasm",
};

async function main() {
  const server = createServer(async (req, res) => {
    const path = req.url === "/" ? "/bench.html" : req.url!;
    try {
      const body = await readFile(join(ROOT, path));
      res.writeHead(200, { "Content-Type": MIME[extname(path)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as { port: number }).port;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors: string[] = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  await page.goto(`http://localhost:${port}/bench.html`);
  const result = await page.evaluate(() => (window as unknown as { runBenchmark: () => Promise<unknown> }).runBenchmark());

  await browser.close();
  server.close();

  if (consoleErrors.length) {
    console.error("Page errors:", consoleErrors);
    process.exit(1);
  }
  console.log(JSON.stringify(result, null, 2));
}

main();
