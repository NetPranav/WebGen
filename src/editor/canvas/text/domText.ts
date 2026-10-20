/**
 * The in-place text editor's DOM <-> model bridge (ROADMAP Phase 31). The editor is a `contenteditable` element
 * whose children are plain text nodes and styled spans (`data-b`, `data-i`, `data-u`, `data-s`, `data-c`), with a
 * trailing sentinel `<br>` so a final newline shows. This module builds that DOM from runs, reads the runs back
 * from whatever the browser made of the user's typing, and converts between DOM selection points and character
 * offsets. Browsers disagree about Enter and about wrapping, so only the `data-*` attributes and the text are
 * trusted; no HTML strings are ever parsed.
 */

import { normalizeRuns, safeRunColor, type TextRun } from "@/core/text/runs";
import { runStyle } from "@/core/render/archetypes/Text";

const isSentinel = (n: Node): boolean => n.nodeName === "BR" && (n as HTMLElement).dataset?.sentinel === "1";
const isBlock = (n: Node): boolean => n.nodeName === "DIV" || n.nodeName === "P";

/** Fills `root` with the runs (replacing what is there). */
export function renderRuns(root: HTMLElement, runs: readonly TextRun[]): void {
  root.replaceChildren();
  for (const run of runs) {
    const style = runStyle(run);
    if (!style) {
      root.appendChild(document.createTextNode(run.text));
      continue;
    }
    const span = document.createElement("span");
    if (run.bold) span.dataset.b = "1";
    if (run.italic) span.dataset.i = "1";
    if (run.underline) span.dataset.u = "1";
    if (run.strike) span.dataset.s = "1";
    if (run.color) span.dataset.c = run.color;
    Object.assign(span.style, style);
    span.textContent = run.text;
    root.appendChild(span);
  }
  ensureSentinel(root);
}

/** Keeps exactly one sentinel `<br>` as the last child. */
export function ensureSentinel(root: HTMLElement): void {
  const last = root.lastChild;
  if (last && isSentinel(last)) {
    for (const extra of Array.from(root.querySelectorAll('br[data-sentinel="1"]'))) if (extra !== last) extra.remove();
    return;
  }
  for (const extra of Array.from(root.querySelectorAll('br[data-sentinel="1"]'))) extra.remove();
  const br = document.createElement("br");
  br.dataset.sentinel = "1";
  root.appendChild(br);
}

function styleOf(el: HTMLElement): Partial<TextRun> {
  const out: Partial<TextRun> = {};
  if (el.dataset.b === "1") out.bold = true;
  if (el.dataset.i === "1") out.italic = true;
  if (el.dataset.u === "1") out.underline = true;
  if (el.dataset.s === "1") out.strike = true;
  const color = safeRunColor(el.dataset.c);
  if (color) out.color = color;
  return out;
}

/** The runs the DOM currently spells. */
export function readRuns(root: HTMLElement): TextRun[] {
  const out: TextRun[] = [];
  const text = () => out.map((r) => r.text).join("");
  const walk = (node: Node, style: Partial<TextRun>) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const data = (node as Text).data.replace(/​/g, "").replace(/ /g, " ");
      if (data) out.push({ text: data, ...style });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (isSentinel(node)) return;
    if (node.nodeName === "BR") {
      out.push({ text: "\n", ...style });
      return;
    }
    const el = node as HTMLElement;
    const next = { ...style, ...styleOf(el) };
    if (isBlock(el) && el !== root && out.length > 0 && !text().endsWith("\n")) out.push({ text: "\n", ...style });
    for (const child of Array.from(el.childNodes)) walk(child, next);
  };
  walk(root, {});
  return normalizeRuns(out);
}

/** The length of the content before and inside a node, as the editor counts it (a `<br>` is one newline, the sentinel none). */
function lengthOf(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) return (node as Text).data.replace(/​/g, "").length;
  if (isSentinel(node)) return 0;
  if (node.nodeName === "BR") return 1;
  let n = 0;
  for (const c of Array.from(node.childNodes)) n += lengthOf(c);
  return n;
}

/** The character offset of a DOM point (`node`, `offset`) from the start of `root`. */
export function offsetOf(root: HTMLElement, node: Node, offset: number): number {
  let total = 0;
  const visit = (n: Node): boolean => {
    if (n === node) {
      if (n.nodeType === Node.TEXT_NODE) total += Math.min(offset, (n as Text).data.length);
      else for (let i = 0; i < offset && i < n.childNodes.length; i++) total += lengthOf(n.childNodes[i]);
      return true;
    }
    if (n.nodeType === Node.TEXT_NODE || n.nodeName === "BR") {
      total += lengthOf(n);
      return false;
    }
    for (const c of Array.from(n.childNodes)) if (visit(c)) return true;
    return false;
  };
  visit(root);
  return total;
}

/** The DOM point for a character offset. */
export function pointAt(root: HTMLElement, offset: number): { node: Node; offset: number } {
  let left = Math.max(0, offset);
  let found: { node: Node; offset: number } | null = null;
  const visit = (n: Node): boolean => {
    if (n.nodeType === Node.TEXT_NODE) {
      const len = (n as Text).data.length;
      if (left <= len) {
        found = { node: n, offset: left };
        return true;
      }
      left -= len;
      return false;
    }
    if (isSentinel(n)) return false;
    if (n.nodeName === "BR") {
      if (left === 0) {
        found = { node: n.parentNode!, offset: Array.prototype.indexOf.call(n.parentNode!.childNodes, n) };
        return true;
      }
      left -= 1;
      return false;
    }
    for (const c of Array.from(n.childNodes)) if (visit(c)) return true;
    return false;
  };
  visit(root);
  return found ?? { node: root, offset: Math.max(0, root.childNodes.length - 1) };
}

/** The selection inside `root` as character offsets, or null when the selection is elsewhere. */
export function selectionOffsets(root: HTMLElement): { start: number; end: number } | null {
  const sel = root.ownerDocument.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.anchorNode || !sel.focusNode) return null;
  if (!root.contains(sel.anchorNode) || !root.contains(sel.focusNode)) return null;
  const a = offsetOf(root, sel.anchorNode, sel.anchorOffset);
  const b = offsetOf(root, sel.focusNode, sel.focusOffset);
  return { start: Math.min(a, b), end: Math.max(a, b) };
}

export function setSelectionOffsets(root: HTMLElement, start: number, end: number): void {
  const sel = root.ownerDocument.getSelection();
  if (!sel) return;
  const a = pointAt(root, start);
  const b = pointAt(root, end);
  const range = root.ownerDocument.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset);
  sel.removeAllRanges();
  sel.addRange(range);
}

/**
 * Types `text` at the selection (replacing it) without `execCommand`, which browsers disagree about for newlines.
 * The new text joins the span the caret is in, so it takes that style. Returns false when the selection isn't in `root`.
 */
export function insertAtSelection(root: HTMLElement, text: string): boolean {
  const sel = root.ownerDocument.getSelection();
  if (!sel || sel.rangeCount === 0 || !root.contains(sel.anchorNode)) return false;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const node = root.ownerDocument.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  root.normalize();
  ensureSentinel(root);
  return true;
}
