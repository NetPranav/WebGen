import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../document/factories";
import { validateMotionDocument, type Layer } from "../document/schema";
import { getDocument, historyCommands } from "../store/useDocumentStore";
import { setDocument } from "../store/documentState";
import { useHistoryStore } from "../store/useHistoryStore";
import { useSelectionStore } from "../store/useSelectionStore";
import { copyText, deleteLayers, duplicateLayers, groupLayers, nudgeLayers, pasteText, reorderLayers, toggleHidden, toggleLock, ungroupLayers, unlockAll, showAll } from "../editing/editOps";
import { addFrame, deleteFrame, duplicateFrame, moveFrame, resizeFrame } from "../frames/frameCommands";

function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

function invariants(): string[] {
  const doc = getDocument();
  const issues: string[] = [];
  const v = validateMotionDocument(doc);
  if (!v.ok) issues.push("schema: " + v.issues.slice(0, 2).map((i) => `${i.path} ${i.message}`).join("; "));
  for (const l of Object.values(doc.layers)) {
    for (const c of l.children) if (!doc.layers[c] || doc.layers[c].parentId !== l.id) issues.push(`child link broken ${l.id} -> ${c}`);
    if (l.parentId !== null && (!doc.layers[l.parentId] || !doc.layers[l.parentId].children.includes(l.id))) issues.push(`parent link broken ${l.id}`);
    for (const k of ["frame.x", "frame.y", "frame.width", "frame.height"]) { const val = l.properties[k]; if (typeof val === "number" && !Number.isFinite(val)) issues.push(`non-finite ${k}`); }
  }
  for (const c of Object.values(doc.clips)) if (!doc.layers[c.layerId]) issues.push(`orphan clip ${c.id}`);
  if (Object.values(doc.layers).filter((l) => l.parentId === null).length === 0) issues.push("no frame left");
  const sel = useSelectionStore.getState().selectedIds.filter((id) => !doc.layers[id]);
  if (sel.length) issues.push(`selection holds missing layers ${sel.length}`);
  return issues;
}

describe("fuzz editing operations", () => {
  it("random editing sequences keep the document valid", () => {
    const failures = new Map<string, string>();
    for (let seed = 1; seed <= 150; seed++) {
      const r = rng(seed * 7);
      useHistoryStore.getState().clearHistory();
      useSelectionStore.getState().clearSelection();
      const mk = (id: string, parent: string, x: number, y: number) => ({ ...(createLayer({ id, archetype: "rectangle", parentId: parent, name: id, properties: { positioning: "absolute", "frame.x": x, "frame.y": y, "frame.width": 50, "frame.height": 40 } as never }) as Layer) });
      setDocument(createDocumentFromLayers([
        createLayer({ id: "pg", archetype: "container", parentId: null, children: ["a", "b", "c", "box"], name: "pg", properties: { "frame.x": 0, "frame.y": 0, "frame.width": 800, "frame.height": 600 } as never }) as Layer,
        mk("a", "pg", 10, 10), mk("b", "pg", 100, 10), mk("c", "pg", 200, 10),
        createLayer({ id: "box", archetype: "container", parentId: "pg", children: ["d"], name: "box", properties: { positioning: "absolute", "frame.x": 300, "frame.y": 300, "frame.width": 200, "frame.height": 200 } as never }) as Layer,
        mk("d", "box", 20, 20),
      ]));
      const log: string[] = [];
      let clip: string | null = null;
      for (let step = 0; step < 50; step++) {
        const ids = Object.keys(getDocument().layers);
        const some = () => { const n = 1 + Math.floor(r() * 3); return Array.from({ length: n }, () => ids[Math.floor(r() * ids.length)]); };
        const op = Math.floor(r() * 18);
        const sel = some();
        useSelectionStore.getState().selectMultiple(sel, "element");
        try {
          switch (op) {
            case 0: log.push(`dup ${sel}`); duplicateLayers(sel); break;
            case 1: log.push(`del ${sel}`); deleteLayers(sel); break;
            case 2: log.push(`group ${sel}`); groupLayers(sel, r() < 0.5 ? "group" : "frame"); break;
            case 3: log.push(`ungroup ${sel}`); ungroupLayers(sel); break;
            case 4: log.push(`order ${sel}`); reorderLayers(sel, (["forward", "backward", "front", "back"] as const)[Math.floor(r() * 4)]); break;
            case 5: log.push(`nudge ${sel}`); nudgeLayers(sel, Math.floor(r() * 20) - 10, Math.floor(r() * 20) - 10); break;
            case 6: log.push(`copy ${sel}`); clip = copyText(sel); break;
            case 7: log.push("paste"); pasteText(clip, { inPlace: r() < 0.5, into: r() < 0.3 ? ids[Math.floor(r() * ids.length)] : null }); break;
            case 8: log.push(`lock ${sel}`); toggleLock(sel); break;
            case 9: log.push(`hide ${sel}`); toggleHidden(sel); break;
            case 10: log.push("unlock/show"); unlockAll(); showAll(); break;
            case 11: log.push("undo"); historyCommands.undo(); break;
            case 12: log.push("redo"); historyCommands.redo(); break;
            case 13: log.push("addFrame"); addFrame({ preset: "mobile" }); break;
            case 14: { const roots = ids.filter((i) => getDocument().layers[i].parentId === null); log.push(`delFrame`); deleteFrame(roots[Math.floor(r() * roots.length)]); break; }
            case 15: { const roots = ids.filter((i) => getDocument().layers[i].parentId === null); log.push(`dupFrame`); duplicateFrame(roots[0]); break; }
            case 16: { const roots = ids.filter((i) => getDocument().layers[i].parentId === null); log.push(`moveFrame`); moveFrame(roots[Math.floor(r() * roots.length)], r() < 0.5 ? -1 : 1); break; }
            case 17: { const roots = ids.filter((i) => getDocument().layers[i].parentId === null); log.push(`resizeFrame`); resizeFrame(roots[0], { width: Math.floor(r() * 500) - 50 }); break; }
          }
        } catch (e) { log.push(`threw: ${(e as Error).message.slice(0, 60)}`); }
        const issues = invariants();
        if (issues.length) {
          const key = issues[0].replace(/[a-z_]+_[0-9a-f]{6,}/g, "ID");
          if (!failures.has(key)) failures.set(key, `seed ${seed} step ${step}: ${log.slice(-5).join(" | ")}`);
          break;
        }
      }
    }
    assert.deepEqual([...failures].map(([k, v]) => `${k} => ${v}`), [], "document invariants broke");
  });
});
