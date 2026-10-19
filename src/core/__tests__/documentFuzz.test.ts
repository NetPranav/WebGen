import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../document/factories";
import { validateMotionDocument, type Layer } from "../document/schema";
import { documentCommands, getDocument, historyCommands } from "../store/useDocumentStore";
import { setDocument } from "../store/documentState";
import { useHistoryStore } from "../store/useHistoryStore";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function invariants(): string[] {
  const doc = getDocument();
  const issues: string[] = [];
  const v = validateMotionDocument(doc);
  if (!v.ok) issues.push("schema: " + v.issues.slice(0, 2).map((i) => `${i.path} ${i.message}`).join("; "));
  for (const l of Object.values(doc.layers)) {
    for (const c of l.children) {
      if (!doc.layers[c]) issues.push(`${l.id} lists missing child ${c}`);
      else if (doc.layers[c].parentId !== l.id) issues.push(`${c} is listed by ${l.id} but its parentId is ${doc.layers[c].parentId}`);
    }
    if (l.parentId !== null) {
      const p = doc.layers[l.parentId];
      if (!p) issues.push(`${l.id} has missing parent ${l.parentId}`);
      else if (!p.children.includes(l.id)) issues.push(`${l.id} not in its parent's children`);
    }
  }
  for (const c of Object.values(doc.clips)) if (!doc.layers[c.layerId]) issues.push(`clip ${c.id} on missing layer ${c.layerId}`);
  return issues;
}

describe("fuzz document commands", () => {
  it("random command / undo / redo sequences keep the document valid", () => {
    const failures = new Map<string, string>();
    for (let seed = 1; seed <= 150; seed++) {
      const r = rng(seed);
      useHistoryStore.getState().clearHistory();
      setDocument(createDocumentFromLayers([
        createLayer({ id: "root", archetype: "container", parentId: null, children: ["a", "b"], name: "root" }) as Layer,
        createLayer({ id: "a", archetype: "rectangle", parentId: "root", name: "a" }) as Layer,
        createLayer({ id: "b", archetype: "container", parentId: "root", children: ["c"], name: "b" }) as Layer,
        createLayer({ id: "c", archetype: "text", parentId: "b", name: "c" }) as Layer,
      ]));
      const log: string[] = [];
      for (let step = 0; step < 60; step++) {
        const ids = Object.keys(getDocument().layers);
        const pick = () => ids[Math.floor(r() * ids.length)];
        const op = Math.floor(r() * 10);
        try {
          switch (op) {
            case 0: { const id = documentCommands.addLayer({ archetype: "rectangle", parentId: pick() }, "add"); log.push(`add ${id}`); break; }
            case 1: { const id = pick(); log.push(`remove ${id}`); documentCommands.removeLayer(id); break; }
            case 2: { const id = pick(); const p = pick(); log.push(`move ${id}->${p}`); documentCommands.moveLayer(id, r() < 0.15 ? null : p, Math.floor(r() * 4)); break; }
            case 3: { const id = pick(); documentCommands.updateProps(id, { "frame.x": Math.floor(r() * 100) }); log.push(`props ${id}`); break; }
            case 4: { const id = pick(); documentCommands.addClip(id, { id: "", name: "c", type: "entrance", trigger: "mount", duration: 1, easing: "linear", enabled: true, tracks: [] }, "clip"); log.push(`clip ${id}`); break; }
            case 5: { const id = pick(); documentCommands.renameLayer(id, `n${step}`); log.push(`rename ${id}`); break; }
            case 6: { const id = pick(); documentCommands.setLayerFlags(id, { locked: r() < 0.5 }); log.push(`flags ${id}`); break; }
            case 7: log.push("undo"); historyCommands.undo(); break;
            case 8: log.push("redo"); historyCommands.redo(); break;
            case 9: { const clips = Object.keys(getDocument().clips); if (clips.length) { const c = clips[Math.floor(r() * clips.length)]; documentCommands.removeClip(c); log.push(`rmclip ${c}`); } break; }
          }
        } catch (e) {
          // a refused command (a cycle, a missing layer) must leave the document valid
          log.push(`threw: ${(e as Error).message.slice(0, 60)}`);
        }
        const issues = invariants();
        if (issues.length) {
          const key = issues[0].replace(/[a-z]+_[0-9a-f]{6,}/g, "ID");
          if (!failures.has(key)) failures.set(key, `seed ${seed} step ${step}: ${log.slice(-4).join(" | ")}`);
          break;
        }
      }
    }
    assert.deepEqual([...failures].map(([k, v]) => `${k} => ${v}`), [], "document invariants broke");
  });
});
