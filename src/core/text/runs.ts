/**
 * ============================================================================
 * STYLED TEXT RUNS (ROADMAP Phase 31)
 * ============================================================================
 * A text layer is `content.text` (the plain text, which search, export and every other reader use) plus an
 * optional `content.runs`: the same text cut into runs that each carry bold, italic, underline, strike-through
 * and a colour. Runs are stored as JSON text. They are only trusted while they spell exactly `content.text`:
 * if the plain text is changed by anything else (the inspector, an agent, an import), the runs are ignored and
 * the layer shows plain text, never stale styling.
 *
 * Everything here is pure: no DOM, no store.
 * ============================================================================
 */

export interface TextRun {
  text: string;
  bold?: true;
  italic?: true;
  underline?: true;
  strike?: true;
  /** A CSS colour (hex, rgb, hsl, or a name), or absent for the layer's own colour. */
  color?: string;
}

export type RunFlag = "bold" | "italic" | "underline" | "strike";
export const RUN_FLAGS: readonly RunFlag[] = ["bold", "italic", "underline", "strike"];

/** The most runs and the most JSON a layer may hold: more is dropped on read, so a hostile file can't make the renderer slow. */
export const MAX_RUNS = 2_000;
export const MAX_RUNS_JSON = 200_000;

const COLOR = /^(#[0-9a-fA-F]{3,8}|rgba?\([0-9.,%\s/-]+\)|hsla?\([0-9.,%\sdeg/-]+\)|[a-zA-Z]{3,20})$/;

/** A colour that is safe to put into a style attribute, or undefined. */
export function safeRunColor(value: unknown): string | undefined {
  return typeof value === "string" && COLOR.test(value.trim()) ? value.trim() : undefined;
}

const sameStyle = (a: TextRun, b: TextRun): boolean =>
  RUN_FLAGS.every((f) => (a[f] === true) === (b[f] === true)) && (a.color ?? "") === (b.color ?? "");

/** Joins neighbours with the same style and drops empty runs. */
export function normalizeRuns(runs: readonly TextRun[]): TextRun[] {
  const out: TextRun[] = [];
  for (const run of runs) {
    if (run.text === "") continue;
    const last = out[out.length - 1];
    if (last && sameStyle(last, run)) last.text += run.text;
    else out.push({ ...run });
  }
  return out;
}

export const runsText = (runs: readonly TextRun[]): string => runs.map((r) => r.text).join("");

/** True when no run carries any style (plain text needs no `content.runs`). */
export const isPlain = (runs: readonly TextRun[]): boolean => runs.every((r) => RUN_FLAGS.every((f) => r[f] !== true) && r.color === undefined);

/** Reads `content.runs`. Returns null when it is empty, malformed, over the limits, or doesn't spell `plainText`. */
export function parseRuns(json: unknown, plainText: string): TextRun[] | null {
  if (typeof json !== "string" || json === "" || json.length > MAX_RUNS_JSON) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_RUNS) return null;
  const runs: TextRun[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) return null;
    const r = item as Record<string, unknown>;
    if (typeof r.t !== "string") return null;
    const run: TextRun = { text: r.t };
    if (r.b === 1) run.bold = true;
    if (r.i === 1) run.italic = true;
    if (r.u === 1) run.underline = true;
    if (r.s === 1) run.strike = true;
    const color = safeRunColor(r.c);
    if (color) run.color = color;
    runs.push(run);
  }
  return runsText(runs) === plainText ? runs : null;
}

/** The JSON for `content.runs`: the empty string when the text is entirely plain. */
export function serializeRuns(runs: readonly TextRun[]): string {
  const merged = normalizeRuns(runs);
  if (merged.length === 0 || isPlain(merged)) return "";
  return JSON.stringify(
    merged.map((r) => ({ t: r.text, ...(r.bold ? { b: 1 } : {}), ...(r.italic ? { i: 1 } : {}), ...(r.underline ? { u: 1 } : {}), ...(r.strike ? { s: 1 } : {}), ...(r.color ? { c: r.color } : {}) })),
  );
}

/** The runs of a layer: its stored runs when they match the text, else the whole text as one plain run. */
export function runsOf(plainText: string, json: unknown): TextRun[] {
  return parseRuns(json, plainText) ?? (plainText === "" ? [] : [{ text: plainText }]);
}

/** Cuts the runs at a character offset so a run boundary falls there. */
function splitAt(runs: readonly TextRun[], offset: number): TextRun[] {
  const out: TextRun[] = [];
  let pos = 0;
  for (const run of runs) {
    const end = pos + run.text.length;
    if (offset > pos && offset < end) {
      out.push({ ...run, text: run.text.slice(0, offset - pos) }, { ...run, text: run.text.slice(offset - pos) });
    } else out.push({ ...run });
    pos = end;
  }
  return out;
}

/** Applies `change` to every run inside [start, end). */
function mapRange(runs: readonly TextRun[], start: number, end: number, change: (run: TextRun) => void): TextRun[] {
  const total = runsText(runs).length;
  const a = Math.max(0, Math.min(start, end));
  const b = Math.min(total, Math.max(start, end));
  if (!(b > a)) return runs.map((r) => ({ ...r }));
  const cut = splitAt(splitAt(runs, a), b);
  let pos = 0;
  for (const run of cut) {
    const runEnd = pos + run.text.length;
    if (pos >= a && runEnd <= b) change(run);
    pos = runEnd;
  }
  return normalizeRuns(cut);
}

/** The flags that every character in [start, end) has. */
export function flagsInRange(runs: readonly TextRun[], start: number, end: number): Record<RunFlag, boolean> {
  const result: Record<RunFlag, boolean> = { bold: true, italic: true, underline: true, strike: true };
  let pos = 0;
  let any = false;
  for (const run of runs) {
    const runEnd = pos + run.text.length;
    if (runEnd > start && pos < end) {
      any = true;
      for (const f of RUN_FLAGS) if (run[f] !== true) result[f] = false;
    }
    pos = runEnd;
  }
  return any ? result : { bold: false, italic: false, underline: false, strike: false };
}

/** Turns a flag on for the range, or off when every character in it already has it (Figma / Word behaviour). */
export function toggleFlag(runs: readonly TextRun[], start: number, end: number, flag: RunFlag): TextRun[] {
  const on = !flagsInRange(runs, Math.min(start, end), Math.max(start, end))[flag];
  return mapRange(runs, start, end, (run) => {
    if (on) run[flag] = true;
    else delete run[flag];
  });
}

/** Sets the colour of the range; `null` clears it back to the layer's colour. An unsafe colour is ignored. */
export function setRunColor(runs: readonly TextRun[], start: number, end: number, color: string | null): TextRun[] {
  const safe = color === null ? null : safeRunColor(color);
  if (safe === undefined) return runs.map((r) => ({ ...r }));
  return mapRange(runs, start, end, (run) => {
    if (safe === null) delete run.color;
    else run.color = safe;
  });
}

/** Replaces [start, end) with `text`, which takes the style of the character before the range (or after it, at the start). */
export function replaceRange(runs: readonly TextRun[], start: number, end: number, text: string): TextRun[] {
  const total = runsText(runs).length;
  const a = Math.max(0, Math.min(start, end, total));
  const b = Math.min(total, Math.max(start, end));
  const cut = splitAt(splitAt(runs, a), b);
  const before: TextRun[] = [];
  const after: TextRun[] = [];
  let pos = 0;
  for (const run of cut) {
    const runEnd = pos + run.text.length;
    if (runEnd <= a) before.push(run);
    else if (pos >= b) after.push(run);
    pos = runEnd;
  }
  const donor = before[before.length - 1] ?? after[0];
  const inserted: TextRun[] = text === "" ? [] : [{ ...(donor ?? {}), text }];
  return normalizeRuns([...before, ...inserted, ...after]);
}
