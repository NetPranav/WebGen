/**
 * ROADMAP Phase 6 verification gate: "A link checker over DOCS/Initial reports
 * 0 broken links."
 *
 * Checks two link shapes found in DOCS/Initial/*.md:
 *   1. Markdown links `[text](path)` — relative paths and `file://` URLs are
 *      resolved and must point at a file that exists. `http(s)://` links are
 *      skipped (no network access here).
 *   2. Backtick-quoted bare filenames that look like a doc reference, e.g.
 *      `` `AUDIT.md` `` or `` `DOCS/Initial/ROADMAP.md` `` — resolved against
 *      the referencing file's own directory, DOCS/Initial/, and the repo
 *      root, in that order.
 *
 * The backtick check skips markdown table rows (`| ... |`) and checklist
 * lines (`- [ ]` / `- [x]` / `- [~]`, any state), because in this roadmap's
 * own style both contexts routinely name a file *without* asserting it
 * exists (or still exists) right now: table rows quote stale-path examples
 * inside audit-finding descriptions (e.g. AUD-26's own text), and checklist
 * items name a decision doc a future sub-phase will create (e.g. "record
 * the decision in `decisions/0002-time-model.md`" under a `- [ ]` Phase 46
 * item) or describe a rename by quoting the *old* name alongside the new
 * one, even once checked off (e.g. a completed Phase 6 item that reads
 * "Rename `Roadmap_after.md` -> `X.md`" — the old name never resolves, and
 * never should). Checking either context would produce false failures for
 * work not done yet, or for accurate descriptions of work already done.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const ROOT = process.cwd();
const DOCS_INITIAL = join(ROOT, "DOCS", "Initial");

function listMarkdownFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...listMarkdownFiles(full));
    else if (entry.endsWith(".md")) out.push(full);
  }
  return out;
}

function fileUrlToPath(url: string): string {
  return decodeURIComponent(url.replace(/^file:\/\//, ""));
}

let broken = 0;
let checked = 0;

const files = listMarkdownFiles(DOCS_INITIAL);

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const dir = dirname(file);

  for (const m of text.matchAll(/\]\(([^)]+)\)/g)) {
    const target = m[1].trim();
    if (/^https?:\/\//.test(target)) continue;
    if (target.startsWith("#")) continue; // in-page anchor, not checked here
    checked++;
    const resolved = target.startsWith("file://")
      ? fileUrlToPath(target)
      : resolve(dir, target.split("#")[0]);
    if (!existsSync(resolved)) {
      console.error(`[check-doc-links] BROKEN: ${file} -> ${target} (resolved: ${resolved})`);
      broken++;
    }
  }

  for (const line of text.split("\n")) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("|")) continue; // table row: often quotes an example path, not a link
    if (/^-\s*\[[ x~]\]/i.test(trimmed)) continue; // checklist item, any state: may name a future or renamed-away artifact

    for (const m of line.matchAll(/`([A-Za-z0-9_./-]+\.md)`/g)) {
      const target = m[1].trim();
      checked++;
      const candidates = [
        resolve(dir, target),
        resolve(DOCS_INITIAL, target),
        resolve(ROOT, target),
      ];
      if (!candidates.some((c) => existsSync(c))) {
        console.error(`[check-doc-links] BROKEN: ${file} -> \`${target}\` (tried: ${candidates.join(", ")})`);
        broken++;
      }
    }
  }
}

console.log(`[check-doc-links] ${checked} link(s) checked across ${files.length} file(s) under DOCS/Initial/.`);
if (broken > 0) {
  console.error(`[check-doc-links] ${broken} broken link(s).`);
  process.exit(1);
}
console.log("[check-doc-links] 0 broken links.");
