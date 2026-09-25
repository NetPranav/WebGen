/**
 * ROADMAP Phase 6 verification gate: "The edition=initial production bundle
 * contains none of the After-track panel modules."
 *
 * Requires `npm run build` to have already run with `NEXT_PUBLIC_EDITION`
 * unset (or "initial") — the default. Then, for each gated After-track panel
 * (src/editor/shell/afterTrackPanels.tsx), this:
 *
 *   1. Picks a marker string that only occurs inside that panel's own real
 *      implementation (its longest string literal, which in practice is
 *      always UI copy unique to that component — not a generic word that
 *      could show up elsewhere).
 *   2. Reads the actual set of static chunk files Next registered as
 *      referenced by the `/editor` and `/editor/detach/[panelId]` app
 *      routes (their `page_client-reference-manifest.js` + build-manifest
 *      chunk lists — the same data Next itself uses to decide which
 *      <script>/<link rel="modulepreload"> tags to emit for that route).
 *   3. Fails if the marker string appears in any of those referenced chunk
 *      files.
 *
 * Note: `.next/static/chunks/` on disk can still contain orphan chunk files
 * with the real panel code in them — Next/Turbopack's `next/dynamic`
 * source-transform statically discovers `dynamic(() => import(...))` call
 * sites and always emits their target as a splittable chunk, even though our
 * `edition === "full" ? dynamic(...) : notInThisEdition` guard means that
 * branch is never actually executed (and so the chunk is never requested)
 * when `edition === "initial"`. Grepping the whole `.next/static/chunks/`
 * directory therefore gives false positives; what matters, and what this
 * checks, is whether the route's own referenced-chunk graph — what a real
 * page load actually fetches — includes the panel.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const NEXT_DIR = join(ROOT, ".next");

interface GatedPanel {
  name: string;
  sourceFile: string;
}

const GATED_PANELS: GatedPanel[] = [
  { name: "BlueprintCanvas", sourceFile: "src/editor/panels/blueprint/BlueprintCanvas.tsx" },
  { name: "ExecutionTracePanel", sourceFile: "src/editor/panels/execution-trace/ExecutionTracePanel.tsx" },
  { name: "PagesManager", sourceFile: "src/editor/panels/pages-manager/PagesManager.tsx" },
  { name: "DeploymentDashboard", sourceFile: "src/editor/panels/deployment/DeploymentDashboard.tsx" },
  { name: "PluginManager", sourceFile: "src/editor/panels/plugins/PluginManager.tsx" },
  { name: "VersionControlPanel", sourceFile: "src/editor/panels/versioning/VersionControlPanel.tsx" },
];

const ROUTES = ["editor", join("editor", "detach", "[panelId]")];

function markerFor(sourceFile: string): string {
  const src = readFileSync(join(ROOT, sourceFile), "utf8");
  const literals = [...src.matchAll(/"([^"\\]{20,80})"/g)].map((m) => m[1]);
  if (literals.length === 0) {
    throw new Error(`No usable marker string literal (>=20 chars) found in ${sourceFile}`);
  }
  return literals.sort((a, b) => b.length - a.length)[0];
}

function referencedChunksForRoute(route: string): Set<string> {
  const chunks = new Set<string>();
  const pageDir = join(NEXT_DIR, "server", "app", route, "page");
  const clientRefManifest = join(NEXT_DIR, "server", "app", route, "page_client-reference-manifest.js");
  const buildManifest = join(pageDir, "build-manifest.json");

  for (const file of [clientRefManifest, buildManifest]) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/static\/chunks\/[a-zA-Z0-9_.\-[\]]+\.js/g)) {
      chunks.add(m[0]);
    }
  }
  return chunks;
}

function main() {
  if (!existsSync(NEXT_DIR)) {
    console.error("[check-bundle-scope] .next/ not found — run `npm run build` first.");
    process.exit(1);
  }

  let failures = 0;
  const allReferenced = new Set<string>();
  for (const route of ROUTES) {
    for (const c of referencedChunksForRoute(route)) allReferenced.add(c);
  }

  if (allReferenced.size === 0) {
    console.error("[check-bundle-scope] Found 0 referenced chunks for /editor — manifest layout may have changed; check the script.");
    process.exit(1);
  }

  console.log(`[check-bundle-scope] ${allReferenced.size} chunk(s) referenced by the /editor route tree.`);

  for (const panel of GATED_PANELS) {
    const marker = markerFor(panel.sourceFile);
    let hit: string | null = null;
    for (const chunk of allReferenced) {
      const chunkPath = join(NEXT_DIR, chunk);
      if (!existsSync(chunkPath)) continue;
      const content = readFileSync(chunkPath, "utf8");
      if (content.includes(marker)) {
        hit = chunk;
        break;
      }
    }
    if (hit) {
      console.error(`[check-bundle-scope] FAIL: ${panel.name} marker (${JSON.stringify(marker)}) found in referenced chunk ${hit}`);
      failures++;
    } else {
      console.log(`[check-bundle-scope] OK: ${panel.name} absent from the /editor route's referenced chunks.`);
    }
  }

  if (failures > 0) {
    console.error(`[check-bundle-scope] ${failures} After-track panel(s) leaked into the edition=initial bundle.`);
    process.exit(1);
  }
  console.log("[check-bundle-scope] edition=initial bundle is clean of all After-track panels.");
}

main();
