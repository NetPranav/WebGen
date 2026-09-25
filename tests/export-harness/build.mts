#!/usr/bin/env npx tsx
/**
 * ROADMAP Phase 4.2 — Export Build Harness.
 *
 * Takes the real `CrossFrameworkExporter` output for a fixed set of
 * reference elements (`reference-elements.ts`, one per emitter family) and
 * drops it into a minimal, pinned fixture app per target
 * (`fixtures/nextjs-app`, `fixtures/vite-react`, `fixtures/vue`), then runs
 * that target's own `typecheck` and `build` scripts. `fixtures/vanilla`
 * needs no build step (it is the framework); it gets a syntax check instead.
 *
 * This proves AUD-15 ("exported code is never compiled, built, or run") no
 * longer holds for compilation: the emitted files are consumed by a real
 * TypeScript compiler and a real bundler, not string-matched.
 *
 * Usage:
 *   npx tsx tests/export-harness/build.mts [--self-test]
 *
 * --self-test additionally corrupts one emitted file with a syntax error
 * and asserts the Next.js target's build *fails*, proving this harness is
 * not a no-op before trusting its passes. It runs after (and restores)
 * the normal pass, so it never leaves the fixture mutated.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { CrossFrameworkExporter } from "../../src/compiler/export/CrossFrameworkExporter";
import { VanillaHtmlEmitter } from "../../src/compiler/emitters/vanilla/VanillaHtmlEmitter";
import { referenceElements } from "./reference-elements";
import type { Layer } from "../../src/core/document/schema";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "fixtures");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

function npmScript(cwd: string, script: string) {
  const res = spawnSync("npm", ["run", "--silent", script], { cwd, encoding: "utf8" });
  return { ok: res.status === 0, output: `${res.stdout ?? ""}\n${res.stderr ?? ""}`.trim() };
}

function pascalCase(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, " ").split(" ").filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1)).join("");
}

/**
 * Writes exported files under a fixture's `components/` (or `src/components/`)
 * directory; `cleanup()` removes that whole directory afterward. Entry files
 * (`app/page.tsx`, `src/main.tsx`, `src/main.ts`) are restored separately by
 * the caller — they're the committed placeholder, not something to delete.
 */
class Fixture {
  constructor(public dir: string) {}
  write(relPath: string, content: string) {
    const abs = join(this.dir, relPath);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  cleanup() {
    for (const dir of ["components", "src/components"]) {
      const abs = join(this.dir, dir);
      if (existsSync(abs)) rmSync(abs, { recursive: true, force: true });
    }
  }
}

// ---------------------------------------------------------------- Next.js
function buildNextjs(elements: Layer[], injectSyntaxBug: boolean): { ok: boolean; output: string } {
  const fixture = new Fixture(join(FIXTURES, "nextjs-app"));
  const originalPage = readFileSync(join(fixture.dir, "app/page.tsx"), "utf8");
  try {
    const imports: string[] = [];
    const tags: string[] = [];
    for (const el of elements) {
      const res = CrossFrameworkExporter.exportElement(el, "nextjs-app", "css-modules");
      const name = pascalCase(el.name);
      for (const f of res.files) {
        let content = f.content;
        if (injectSyntaxBug && f.filename.endsWith(".tsx")) content += "\nCONST THIS IS NOT VALID TYPESCRIPT =";
        fixture.write(`components/${f.filename}`, content);
      }
      imports.push(`import ${name} from "../components/${name}";`);
      tags.push(`      <${name} />`);
    }
    fixture.write(
      "app/page.tsx",
      `${imports.join("\n")}\n\nexport default function Page() {\n  return (\n    <main>\n${tags.join("\n")}\n    </main>\n  );\n}\n`
    );
    const tc = npmScript(fixture.dir, "typecheck");
    if (!tc.ok) return { ok: false, output: tc.output };
    const build = npmScript(fixture.dir, "build");
    return { ok: build.ok, output: build.output };
  } finally {
    writeFileSync(join(fixture.dir, "app/page.tsx"), originalPage);
    fixture.cleanup();
    for (const dir of ["out", ".next"]) rmSync(join(fixture.dir, dir), { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- Vite React
function buildViteReact(elements: Layer[]): { ok: boolean; output: string } {
  const fixture = new Fixture(join(FIXTURES, "vite-react"));
  const originalMain = readFileSync(join(fixture.dir, "src/main.tsx"), "utf8");
  try {
    const imports: string[] = [`import { createRoot } from "react-dom/client";`];
    const tags: string[] = [];
    for (const el of elements) {
      const res = CrossFrameworkExporter.exportElement(el, "react-vite", "css-modules");
      const name = pascalCase(el.name);
      for (const f of res.files) fixture.write(`src/components/${f.filename}`, f.content);
      imports.push(`import ${name} from "./components/${name}";`);
      tags.push(`      <${name} />`);
    }
    fixture.write(
      "src/main.tsx",
      `${imports.join("\n")}\n\nfunction App() {\n  return (\n    <main>\n${tags.join("\n")}\n    </main>\n  );\n}\n\ncreateRoot(document.getElementById("root")!).render(<App />);\n`
    );
    const tc = npmScript(fixture.dir, "typecheck");
    if (!tc.ok) return { ok: false, output: tc.output };
    const build = npmScript(fixture.dir, "build");
    return { ok: build.ok, output: build.output };
  } finally {
    writeFileSync(join(fixture.dir, "src/main.tsx"), originalMain);
    fixture.cleanup();
    rmSync(join(fixture.dir, "dist"), { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- Vue
function buildVue(elements: Layer[]): { ok: boolean; output: string } {
  const fixture = new Fixture(join(FIXTURES, "vue"));
  const originalMain = readFileSync(join(fixture.dir, "src/main.ts"), "utf8");
  try {
    const imports: string[] = [`import { createApp, h } from "vue";`];
    const names: string[] = [];
    for (const el of elements) {
      const res = CrossFrameworkExporter.exportElement(el, "vue", "css-modules");
      const name = pascalCase(el.name);
      for (const f of res.files) fixture.write(`src/components/${f.filename}`, f.content);
      imports.push(`import ${name} from "./components/${name}.vue";`);
      names.push(name);
    }
    fixture.write(
      "src/main.ts",
      `${imports.join("\n")}\n\ncreateApp({\n  render: () => h("main", [${names.map((n) => `h(${n})`).join(", ")}]),\n}).mount("#app");\n`
    );
    const tc = npmScript(fixture.dir, "typecheck");
    if (!tc.ok) return { ok: false, output: tc.output };
    const build = npmScript(fixture.dir, "build");
    return { ok: build.ok, output: build.output };
  } finally {
    writeFileSync(join(fixture.dir, "src/main.ts"), originalMain);
    fixture.cleanup();
    rmSync(join(fixture.dir, "dist"), { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- Vanilla
// No bundler for this target (it IS the target): a syntax check stands in
// for "build", and a minimal DOM presence check stands in for "renders".
function buildVanilla(elements: Layer[]): { ok: boolean; output: string } {
  const notes: string[] = [];
  let ok = true;
  for (const el of elements) {
    const res = VanillaHtmlEmitter.emit(el);
    const script = spawnSync("node", ["--check", "--input-type=module"], { input: res.jsScript, encoding: "utf8" });
    if (script.status !== 0) {
      ok = false;
      notes.push(`${el.name}: main.js syntax error: ${script.stderr}`);
    }
    if (!res.htmlMarkup.includes(`id="${el.id}"`)) {
      ok = false;
      notes.push(`${el.name}: emitted markup is missing its id`);
    }
  }
  return { ok, output: notes.join("\n") };
}

// ---------------------------------------------------------------- Runner
async function main() {
  const selfTest = process.argv.includes("--self-test");

  console.log("== nextjs-app (Next 16 App Router, output: export)");
  check("compiles and builds", buildNextjs(referenceElements, false).ok);

  console.log("\n== react-vite (Vite + React 19)");
  check("compiles and builds", buildViteReact(referenceElements).ok);

  console.log("\n== vue (Vite + Vue 3)");
  check("compiles and builds", buildVue(referenceElements).ok);

  console.log("\n== vanilla (no build step; syntax + markup check)");
  check("emits valid, id-addressable markup and script", buildVanilla(referenceElements).ok);

  if (selfTest) {
    console.log("\n== self-test: a syntactically broken emit must fail the harness");
    const broken = buildNextjs(referenceElements, true);
    check("harness catches a broken export (nextjs-app)", !broken.ok);
  }

  console.log(failures ? `\n${failures} check(s) failed` : "\nExport build harness: all checks passed");
  process.exit(failures ? 1 : 0);
}

main();
