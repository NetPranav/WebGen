/**
 * Two-lane workflow (DOCS/TEAM/COLLABORATION.md §6): phase PRs never edit
 * CHANGELOG.md; each adds a fragment to DOCS/INITIAL/changelog.d/ instead.
 * This folds every fragment, oldest first by file name, into one new
 * `## [version] — date` entry at the top of CHANGELOG.md and deletes them.
 *
 * Run: `npm run changelog:fold -- 4.1.0`
 */
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("[changelog:fold] usage: npm run changelog:fold -- <major.minor.patch>");
  process.exit(1);
}

const docs = join(process.cwd(), "DOCS", "INITIAL");
const fragmentDir = join(docs, "changelog.d");
const changelogFile = join(docs, "CHANGELOG.md");

const fragments = readdirSync(fragmentDir)
  .filter((f) => f.endsWith(".md") && f !== "README.md")
  .sort();
if (fragments.length === 0) {
  console.log("[changelog:fold] no fragments to fold.");
  process.exit(0);
}

const changelog = readFileSync(changelogFile, "utf8");
if (changelog.includes(`## [${version}]`)) {
  console.error(`[changelog:fold] CHANGELOG.md already has a [${version}] entry.`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const body = fragments.map((f) => readFileSync(join(fragmentDir, f), "utf8").trim()).join("\n\n");
const entry = `## [${version}] — ${today}\n\n${body}\n\n`;

// New entries go above the newest existing one, below the file's header.
const firstEntry = changelog.search(/^## \[/m);
const next =
  firstEntry === -1
    ? `${changelog.trimEnd()}\n\n${entry}`
    : changelog.slice(0, firstEntry) + entry + changelog.slice(firstEntry);

writeFileSync(changelogFile, next);
for (const f of fragments) unlinkSync(join(fragmentDir, f));
console.log(`[changelog:fold] folded ${fragments.length} fragment(s) into [${version}].`);
