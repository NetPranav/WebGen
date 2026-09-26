/**
 * ROADMAP Phase 8 Verification Gate: "Zero compatibility logic remains in
 * editor components (lint rule or grep gate)."
 *
 * The "+" menus, drop targets and property enablement must render only
 * `rules.canAdd`-family results (`src/core/rules`), never a direct read of
 * `ElementGrammarEngine`/`AnimationValidator` or their raw
 * allowed/blockedCategories arrays (grammar §8, decision 0005 §5).
 *
 * This scans every `src/editor/**` source file for the two ways that ad-hoc
 * logic crept in before Phase 8 (grammar-metadata lookups like
 * `TYPE_REGISTRY[...]` for pure display are still allowed — only the
 * *decision* points are gated):
 *   1. Importing the `ElementGrammarEngine` or `AnimationValidator` engine
 *      instances directly (their `TYPE_REGISTRY` export is exempt).
 *   2. Reading `.allowedCategories`/`.blockedCategories` and calling
 *      `.includes(...)` on the result — the exact shape of the bug this gate
 *      was written to catch (`ContentBrowser.tsx`, Phase 8).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const ENGINE_IMPORT_PATTERN = /import\s*\{([^}]*)\}\s*from\s*["']@\/core\/engine\/(ElementGrammarEngine|AnimationValidator)["']/g;
const CATEGORY_ARRAY_PATTERN = /\.(allowedCategories|blockedCategories)\s*\.\s*includes\s*\(/g;

interface Violation {
  file: string;
  line: number;
  message: string;
}

function checkFile(relPath: string): Violation[] {
  const text = readFileSync(join(ROOT, relPath), "utf8");
  const lines = text.split("\n");
  const violations: Violation[] = [];

  for (const match of text.matchAll(ENGINE_IMPORT_PATTERN)) {
    const names = match[1].split(",").map((n) => n.trim().split(" as ")[0].trim());
    const engineName = match[2];
    // TYPE_REGISTRY is pure metadata (display only); the engine instance itself is the gated import.
    const gatedNames = names.filter((n) => n === engineName);
    if (gatedNames.length > 0) {
      const line = text.slice(0, match.index).split("\n").length;
      violations.push({ file: relPath, line, message: `imports "${engineName}" directly — use \`rules\`/\`canAddFromBindings\`/\`validateTrackCompatibility\` from "@/core/rules" instead.` });
    }
  }

  for (const match of text.matchAll(CATEGORY_ARRAY_PATTERN)) {
    const line = text.slice(0, match.index).split("\n").length;
    violations.push({ file: relPath, line, message: `reads "${match[1]}" directly for a compatibility decision — call \`rules.canAdd\`/\`canAddFromBindings\` from "@/core/rules" instead.` });
  }

  return violations.map((v) => ({ ...v, message: `${v.message} (line ${v.line}: ${lines[v.line - 1]?.trim().slice(0, 120)})` }));
}

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${entry}`;
    const st = statSync(join(ROOT, rel));
    if (st.isDirectory()) out.push(...listSourceFiles(rel));
    else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) out.push(rel);
  }
  return out;
}

const files = listSourceFiles("src/editor");
const allViolations = files.flatMap((f: string) => checkFile(f));

console.log(`[check-no-adhoc-compat] ${files.length} file(s) checked under src/editor/.`);

if (allViolations.length > 0) {
  console.error(`[check-no-adhoc-compat] ${allViolations.length} violation(s):\n`);
  for (const v of allViolations) {
    console.error(`  ${v.file}:${v.line} — ${v.message}`);
  }
  process.exit(1);
}

console.log("[check-no-adhoc-compat] 0 violations. The rules engine is the only compatibility decision point in the editor.");
