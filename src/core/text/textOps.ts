/**
 * Text operations for FigCraft port F8, one undo step each: lists on paragraphs (a style, nesting with Tab and
 * Shift+Tab, where a numbered list starts counting), and attaching text to a path (the text takes the path's place
 * and follows its line) or letting it go.
 *
 * Behaviour translated from FigCraft (`crates/engine/src/textedit.rs`, `crates/text/src/list_tests.rs`), commit
 * 6ea44e9. MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 */

import type { Layer } from "../document/schema";
import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import { transaction } from "../editing/editOps";
import { worldBox, writeBoxes } from "../editing/layerBoxes";
import { layerSpine } from "../editing/layerOutline";
import { MAX_LIST_INDENT, paragraphLists, paragraphsOf, serializeParagraphLists, type ListStyle, type ParaList } from "./textFeatures";

const texts = (ids: readonly string[]) => ids.filter((id) => getDocument().layers[id]?.archetype === "text" && getDocument().layers[id].locked !== true);
const textOf = (l: Layer) => (typeof l.properties["content.text"] === "string" ? (l.properties["content.text"] as string) : "");

/** A text layer's list settings, one per paragraph. */
export function listsOf(id: string): ParaList[] {
  const l = getDocument().layers[id];
  if (!l) return [];
  return paragraphLists(l.properties["typography.listParagraphs"], paragraphsOf(textOf(l)).length, l.properties["typography.list"]);
}

/** Writes a text layer's per-paragraph lists (the text-wide style when every paragraph shares it). */
function writeLists(id: string, lists: ParaList[], label: string) {
  const styles = new Set(lists.map((l) => l.list));
  const base: ListStyle = styles.size === 1 ? lists[0].list : "none";
  documentCommands.updateProps(id, { "typography.list": base === "none" ? undefined : base, "typography.listParagraphs": serializeParagraphLists(lists, base) || undefined }, label);
}

/** Which paragraphs an operation touches: the ones named, or all of them. */
const pick = (n: number, paragraphs?: readonly number[]) => (paragraphs?.length ? paragraphs.filter((i) => Number.isInteger(i) && i >= 0 && i < n) : Array.from({ length: n }, (_, i) => i));

/** Makes paragraphs a bulleted or numbered list, or plain. Returns how many layers changed. */
export function setList(ids: readonly string[], list: ListStyle, paragraphs?: readonly number[]): number {
  const targets = texts(ids);
  if (targets.length === 0) return 0;
  transaction("List", () => {
    for (const id of targets) {
      const lists = listsOf(id);
      for (const i of pick(lists.length, paragraphs)) lists[i] = list === "none" ? { list: "none", indent: 0 } : { ...lists[i], list, indent: lists[i].list === "none" ? 0 : lists[i].indent };
      writeLists(id, lists, "List");
    }
  });
  return targets.length;
}

/** Nests list items one level deeper (`by` 1, Tab) or shallower (−1, Shift+Tab); plain paragraphs stay plain. */
export function indentList(ids: readonly string[], by: 1 | -1, paragraphs?: readonly number[]): number {
  const targets = texts(ids).filter((id) => listsOf(id).some((l) => l.list !== "none"));
  if (targets.length === 0) return 0;
  transaction("Indent list", () => {
    for (const id of targets) {
      const lists = listsOf(id);
      for (const i of pick(lists.length, paragraphs)) if (lists[i].list !== "none") lists[i] = { ...lists[i], indent: Math.min(MAX_LIST_INDENT, Math.max(0, lists[i].indent + by)) };
      writeLists(id, lists, "Indent list");
    }
  });
  return targets.length;
}

/** Where a numbered list starts counting at a paragraph (1 is the usual start). */
export function setListStart(id: string, paragraph: number, start: number): boolean {
  if (texts([id]).length === 0 || !Number.isFinite(start) || start < 1) return false;
  const lists = listsOf(id);
  if (!lists[paragraph] || lists[paragraph].list !== "numbered") return false;
  const offset = Math.min(4_294_967_295, Math.floor(start) - 1);
  lists[paragraph] = { ...lists[paragraph], ...(offset > 0 ? { startOffset: offset } : { startOffset: undefined }) };
  if (!lists[paragraph].startOffset) delete lists[paragraph].startOffset;
  writeLists(id, lists, "List start");
  return true;
}

/**
 * Puts text on a path: the text takes the path layer's place and size, and its baseline follows the path's line (a
 * line's centre, a path's path, any shape's outline). The path layer stays as it was. Returns whether it worked.
 */
export function attachToPath(textId: string, pathId: string, options: { start?: number; flip?: boolean } = {}): boolean {
  const layers = getDocument().layers;
  const text = layers[textId];
  const path = layers[pathId];
  if (!text || text.archetype !== "text" || text.locked === true || !path || textId === pathId) return false;
  const spine = layerSpine(path, layers);
  const box = worldBox(pathId);
  if (!spine || spine.isEmpty() || !box) return false;
  transaction("Text on path", () => {
    writeBoxes([textId], [box], undefined, { size: true });
    documentCommands.updateProps(textId, {
      "text.sizing": "fixed",
      "typography.textPath": JSON.stringify({ d: spine.toSvg(2), start: Math.min(1, Math.max(0, options.start ?? 0)), flip: options.flip === true }),
    });
  });
  return true;
}

/** Changes where text on a path starts (0..1 along it) or which side it runs on. */
export function setTextPath(ids: readonly string[], patch: { start?: number; flip?: boolean }): number {
  const targets = texts(ids).filter((id) => typeof getDocument().layers[id].properties["typography.textPath"] === "string" && getDocument().layers[id].properties["typography.textPath"]);
  if (targets.length === 0) return 0;
  transaction("Text path", () => {
    for (const id of targets) {
      const cur = JSON.parse(String(getDocument().layers[id].properties["typography.textPath"])) as { d: string; start?: number; flip?: boolean };
      const next = { ...cur, ...(patch.start !== undefined && Number.isFinite(patch.start) ? { start: Math.min(1, Math.max(0, patch.start)) } : {}), ...(patch.flip !== undefined ? { flip: patch.flip } : {}) };
      documentCommands.updateProps(id, { "typography.textPath": JSON.stringify(next) });
    }
  });
  return targets.length;
}

/** Lets text go of its path: it lays out in its box again. */
export function detachFromPath(ids: readonly string[]): number {
  const targets = texts(ids).filter((id) => getDocument().layers[id].properties["typography.textPath"]);
  if (targets.length === 0) return 0;
  transaction("Text off path", () => {
    for (const id of targets) documentCommands.updateProps(id, { "typography.textPath": undefined });
  });
  return targets.length;
}
