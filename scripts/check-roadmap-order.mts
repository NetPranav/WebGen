/**
 * ROADMAP v4, Law 18 (Sequential): the phase number is the execution order.
 *
 * Checks `DOCS/INITIAL/ROADMAP.md`:
 *   1. Phase entries (`### Phase N · Title`) are numbered 1..max with no gaps
 *      or duplicates, in ascending order in the file.
 *   2. Every phase's `**Needs:**` line names only lower-numbered phases
 *      (single numbers like `27` or ranges like `13–51`).
 *   3. Every phase appears exactly once in the §5 index table, with the same
 *      status emoji as its own entry.
 *
 * Run: `npm run check:roadmap-order` (exit code 1 on any violation).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const file = join(process.cwd(), "DOCS", "INITIAL", "ROADMAP.md");
const text = readFileSync(file, "utf8");
const lines = text.split("\n");

const errors: string[] = [];
const entries = new Map<number, { needs: number[]; status: string; line: number }>();
const order: number[] = [];

for (let i = 0; i < lines.length; i++) {
  const head = /^### Phase (\d+) · /.exec(lines[i]);
  if (!head) continue;
  const n = Number(head[1]);
  if (entries.has(n)) errors.push(`Phase ${n} is defined twice (line ${i + 1}).`);
  order.push(n);

  const meta = lines.slice(i + 1, i + 4).find((l) => l.startsWith("**Needs:**"));
  if (!meta) {
    errors.push(`Phase ${n} (line ${i + 1}) has no **Needs:** line.`);
    continue;
  }
  const needsText = /\*\*Needs:\*\*\s*([^·]*)/.exec(meta)?.[1] ?? "";
  const needs: number[] = [];
  for (const m of needsText.matchAll(/(\d+)\s*[–-]\s*(\d+)|(\d+)/g)) {
    if (m[3]) needs.push(Number(m[3]));
    else for (let k = Number(m[1]); k <= Number(m[2]); k++) needs.push(k);
  }
  const status = /\*\*Status:\*\*\s*(✅|🚧|📋)/.exec(meta)?.[1] ?? "";
  if (!status) errors.push(`Phase ${n} has no status (✅, 🚧 or 📋).`);
  entries.set(n, { needs, status, line: i + 1 });
}

const max = Math.max(...order);
for (let n = 1; n <= max; n++) if (!entries.has(n)) errors.push(`Phase ${n} is missing.`);
for (let k = 1; k < order.length; k++) {
  if (order[k] <= order[k - 1]) errors.push(`Phase ${order[k]} appears after Phase ${order[k - 1]}.`);
}
for (const [n, e] of entries) {
  for (const d of e.needs) {
    if (d >= n) errors.push(`Phase ${n} (line ${e.line}) needs Phase ${d}, which is not earlier (Law 18).`);
    if (!entries.has(d)) errors.push(`Phase ${n} needs Phase ${d}, which doesn't exist.`);
  }
  if (e.status === "✅") {
    for (const d of e.needs) {
      if (entries.get(d)?.status !== "✅") errors.push(`Phase ${n} is ✅ but needs Phase ${d}, which isn't.`);
    }
  }
}

const indexRows = new Map<number, string>();
for (const l of lines) {
  const row = /^\|\s*(\d+)\s*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|\s*(✅|🚧|📋)\s*\|\s*$/.exec(l);
  if (!row) continue;
  const n = Number(row[1]);
  if (indexRows.has(n)) errors.push(`Phase ${n} appears twice in the §5 index.`);
  indexRows.set(n, row[2]);
}
for (const [n, e] of entries) {
  const s = indexRows.get(n);
  if (!s) errors.push(`Phase ${n} is missing from the §5 index.`);
  else if (s !== e.status) errors.push(`Phase ${n}: index says ${s}, entry says ${e.status}.`);
}

if (errors.length) {
  for (const e of errors) console.error(`[check-roadmap-order] ${e}`);
  console.error(`[check-roadmap-order] FAIL: ${errors.length} problem(s).`);
  process.exit(1);
}
const done = [...entries.values()].filter((e) => e.status === "✅").length;
const next = [...entries.keys()].sort((a, b) => a - b).find((n) => entries.get(n)!.status !== "✅");
console.log(
  `[check-roadmap-order] PASS: ${entries.size} phases, every need points backwards. ` +
    `${done} done; next is Phase ${next}.`,
);
