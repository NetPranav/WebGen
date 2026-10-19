import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ROADMAP Phase 14 gates that a source check can support: the shell stays small,
 * and only the panel registry (`panels/builtins.tsx`) and the panels themselves
 * import panel modules, so nothing outside the layout is bundled by accident.
 * The browser test (`tests/e2e/workspace.spec.ts`) proves it on a real build.
 */
const shellDir = join(process.cwd(), "src", "editor", "shell");

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? (e.name === "__tests__" ? [] : files(join(dir, e.name))) : /\.(ts|tsx)$/.test(e.name) ? [join(dir, e.name)] : [],
  );
}

describe("Phase 14: shell structure", () => {
  it("EditorShell.tsx is under 500 lines", () => {
    const lines = readFileSync(join(shellDir, "EditorShell.tsx"), "utf8").split("\n").length;
    assert.ok(lines < 500, `EditorShell.tsx is ${lines} lines`);
  });

  it("no shell file but the panel registry imports a panel module statically", () => {
    const allowed = new Set(["panels/builtins.tsx"]);
    const offenders: string[] = [];
    for (const file of files(shellDir)) {
      const rel = file.slice(shellDir.length + 1);
      if (allowed.has(rel)) continue;
      for (const line of readFileSync(file, "utf8").split("\n")) {
        // A static import: `import ... from "@/editor/panels/..."` (a dynamic `import(...)` has no `from`).
        if (/^\s*import type /.test(line) || line.includes("launcher/LazyLayoutLogo")) continue; // types are erased; the logo is header chrome
        if (/^\s*(import|\}).*from\s+["']@\/editor\/panels\//.test(line)) offenders.push(`${rel}: ${line.trim().slice(0, 90)}`);
      }
    }
    assert.deepEqual(offenders, [], "import panels through registerPanel, or lazily with import()");
  });
});
