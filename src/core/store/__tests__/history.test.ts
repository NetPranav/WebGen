/**
 * ROADMAP Phase 3.1: patch-based undo/redo, gesture transactions, merging,
 * project-state entries, jumps, and the AUD-05 regression.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { useProjectStore } from "../useProjectStore";
import { useHistoryStore, inferActionCategory } from "../useHistoryStore";
import {
  documentCommands,
  gestureCoalescing,
  getDocument,
  historyCommands,
  isTransactionOpen,
  subscribeToDocumentChanges,
  MERGE_WINDOW_MS,
  type DocumentChange,
} from "../useDocumentStore";
import { createDocumentFromLayers, createLayer, getLayerClips } from "../../document/factories";
import type { ClipTemplate, MotionDocument } from "../../document/schema";
import { DiagnosticBus } from "../../engine/DiagnosticBus";
import type { DiagnosticEvent } from "../../types/diagnostics";

const blank = (): MotionDocument =>
  createDocumentFromLayers([
    createLayer({ id: "root", archetype: "container", children: ["title"] }),
    createLayer({ id: "title", archetype: "text", parentId: "root", properties: { "content.text": "Hello" } }),
  ]);

function reset() {
  gestureCoalescing.release();
  useHistoryStore.getState().clearHistory();
  useProjectStore.setState({ document: blank(), pages: {}, redirectRules: {} });
}

const clip = (name: string): ClipTemplate => ({
  id: "",
  name,
  type: "entrance",
  trigger: "mount",
  duration: 1,
  easing: "linear",
  enabled: true,
  tracks: [],
});

/** Makes the most recent entry look old, so the next edit can't merge into it. */
function ageLastEntry() {
  const history = useHistoryStore.getState();
  const last = history.past.at(-1);
  if (last) history.replaceLast({ ...last, timestamp: last.timestamp - MERGE_WINDOW_MS - 1 });
}

describe("Phase 3.1: patch-based history", () => {
  beforeEach(reset);

  it("20 distinct edits undo back to the starting document and redo forward again", () => {
    const start = getDocument();
    for (let i = 0; i < 20; i++) {
      documentCommands.updateProps("title", { "typography.fontSize": i }, `Set p${i}`);
    }
    const end = getDocument();
    assert.equal(useHistoryStore.getState().past.length, 20);

    for (let i = 0; i < 20; i++) assert.ok(historyCommands.undo());
    assert.deepEqual(getDocument(), start);
    assert.equal(historyCommands.undo(), false);

    for (let i = 0; i < 20; i++) assert.ok(historyCommands.redo());
    assert.deepEqual(getDocument(), end);
  });

  it("stores patches, not snapshots: an entry's size doesn't grow with the document", () => {
    for (let i = 0; i < 300; i++) documentCommands.addLayer({ archetype: "text", parentId: "root" }, `Add ${i}`);
    ageLastEntry();
    documentCommands.updateProps("title", { "content.text": "Hi" }, "Rename");
    const entry = useHistoryStore.getState().past.at(-1)!;
    const entrySize = JSON.stringify(entry.change).length;
    const docSize = JSON.stringify(getDocument()).length;
    assert.equal(entry.change.kind, "document");
    assert.ok(entrySize < 400, `entry is ${entrySize} bytes`);
    assert.ok(entrySize * 100 < docSize, `entry ${entrySize} B vs document ${docSize} B`);
  });

  it("caps the stack at maxStackSize", () => {
    const cap = useHistoryStore.getState().maxStackSize;
    for (let i = 0; i < cap + 25; i++) documentCommands.updateProps("title", { "typography.fontSize": i }, `Edit ${i}`);
    assert.equal(useHistoryStore.getState().past.length, cap);
  });

  it("a new edit clears the redo stack", () => {
    documentCommands.updateProps("title", { "typography.letterSpacing": 1 }, "A");
    historyCommands.undo();
    assert.equal(useHistoryStore.getState().future.length, 1);
    documentCommands.updateProps("title", { "typography.lineHeight": 2 }, "B");
    assert.equal(useHistoryStore.getState().future.length, 0);
  });

  it("undo and redo emit durable document changes (autosave and the crash journal rely on them)", () => {
    documentCommands.updateProps("title", { "typography.letterSpacing": 1 }, "A");
    const seen: DocumentChange[] = [];
    const off = subscribeToDocumentChanges((c) => seen.push(c));
    historyCommands.undo();
    historyCommands.redo();
    off();
    assert.deepEqual(
      seen.map((c) => [c.source, !!c.transient]),
      [
        ["undo", false],
        ["redo", false],
      ]
    );
  });

  it("jumpTo moves across several entries in either direction", () => {
    documentCommands.updateProps("title", { "typography.letterSpacing": 1 }, "Step 1");
    documentCommands.updateProps("title", { "typography.letterSpacing": 2 }, "Step 2");
    documentCommands.updateProps("title", { "typography.letterSpacing": 3 }, "Step 3");
    ageLastEntry();
    const [first, , third] = useHistoryStore.getState().past;

    historyCommands.jumpTo(first.id);
    assert.equal(getDocument().layers.title.properties["typography.letterSpacing"], undefined);
    assert.equal(useHistoryStore.getState().future.length, 3);

    historyCommands.jumpTo(third.id);
    assert.equal(getDocument().layers.title.properties["typography.letterSpacing"], 3);
    assert.equal(useHistoryStore.getState().past.length, 3);
  });

  it("an entry that no longer applies is dropped and reported as [UNDO_STACK_CORRUPT]", () => {
    const events: DiagnosticEvent[] = [];
    const off = DiagnosticBus.subscribe((e) => events.push(e));
    useHistoryStore.getState().record({
      actionLabel: "Broken",
      change: { kind: "document", patches: [], inversePatches: [{ op: "replace", path: ["layers", "gone", "name"], value: "x" }] },
    });
    const before = getDocument();
    assert.equal(historyCommands.undo(), false);
    off();
    assert.equal(getDocument(), before);
    assert.equal(useHistoryStore.getState().past.length, 0);
    assert.equal(events.at(-1)?.channel, "UNDO_STACK_CORRUPT");
  });

  it("infers categories from labels", () => {
    assert.deepEqual(
      ["Add Page", "Wire nodes", "Add field", "Change color", "Toggle label", "Set state", "Move layer", "Misc"].map(inferActionCategory),
      ["page", "blueprint", "database", "style", "property", "variable", "canvas", "general"]
    );
  });
});

describe("Phase 3.1: gesture coalescing", () => {
  beforeEach(reset);

  it("a transaction is one history entry; its intermediate changes are transient", () => {
    const seen: DocumentChange[] = [];
    const off = subscribeToDocumentChanges((c) => seen.push(c));
    const tx = documentCommands.begin("Drag");
    for (let x = 1; x <= 60; x++) documentCommands.updateProps("title", { "transform.x": x }, "Move");
    assert.equal(getDocument().layers.title.properties["transform.x"], 60, "the stage sees every step");
    assert.equal(useHistoryStore.getState().past.length, 0, "nothing reaches history mid-gesture");
    tx.commit();
    off();

    const { past } = useHistoryStore.getState();
    assert.equal(past.length, 1);
    assert.equal(past[0].actionLabel, "Drag");
    assert.equal(seen.filter((c) => c.transient).length, 60);
    assert.equal(seen.filter((c) => !c.transient).length, 1);
    assert.ok(seen.at(-1)!.summary);

    historyCommands.undo();
    assert.equal(getDocument().layers.title.properties["transform.x"], undefined);
  });

  it("cancel restores the document from before the transaction and records nothing", () => {
    const before = getDocument();
    const tx = documentCommands.begin("Drag");
    documentCommands.updateProps("title", { "transform.x": 10 });
    documentCommands.addLayer({ archetype: "badge", parentId: "root" });
    tx.cancel();
    assert.equal(getDocument(), before);
    assert.equal(useHistoryStore.getState().past.length, 0);
    assert.equal(isTransactionOpen(), false);
  });

  it("nested begin joins the outer transaction", () => {
    const outer = documentCommands.begin("Outer");
    const inner = documentCommands.begin("Inner");
    documentCommands.updateProps("title", { "typography.letterSpacing": 1 });
    assert.equal(inner.commit(), null);
    assert.equal(isTransactionOpen(), true);
    outer.commit();
    assert.deepEqual(
      useHistoryStore.getState().past.map((e) => e.actionLabel),
      ["Outer"]
    );
  });

  it("a pointer press coalesces every command until release (scrub, slider, drag)", () => {
    gestureCoalescing.press();
    for (let v = 0; v < 30; v++) documentCommands.updateProps("title", { "appearance.opacity": v / 30 }, "Update opacity");
    documentCommands.updateProps("title", { "filter.blur": 2 }, "Update blur");
    assert.equal(useHistoryStore.getState().past.length, 0);
    gestureCoalescing.release();

    const { past } = useHistoryStore.getState();
    assert.equal(past.length, 1);
    assert.equal(past[0].actionLabel, "Update opacity", "the first command names the gesture");
    historyCommands.undo();
    assert.equal(getDocument().layers.title.properties["appearance.opacity"], undefined);
    assert.equal(getDocument().layers.title.properties["filter.blur"], undefined);
  });

  it("a gesture that ends where it started records nothing", () => {
    gestureCoalescing.press();
    documentCommands.updateProps("title", { "transform.x": 5 }, "Move");
    documentCommands.updateProps("title", { "transform.x": undefined }, "Move");
    gestureCoalescing.release();
    assert.equal(useHistoryStore.getState().past.length, 0);
  });

  it("undo during a gesture commits the gesture first, then undoes it", () => {
    gestureCoalescing.press();
    documentCommands.updateProps("title", { "transform.x": 5 }, "Move");
    historyCommands.undo();
    assert.equal(getDocument().layers.title.properties["transform.x"], undefined);
    assert.equal(useHistoryStore.getState().future.length, 1);
    gestureCoalescing.release();
  });

  it("repeated edits to the same target merge (typing); different targets don't", () => {
    for (const text of ["H", "He", "Hel", "Hell", "Hello!"]) documentCommands.updateProps("title", { "content.text": text }, "Edit text");
    let past = useHistoryStore.getState().past;
    assert.equal(past.length, 1);
    assert.equal(past[0].groupCount, 5);

    documentCommands.updateProps("title", { "typography.fontSize": 20 }, "Edit size");
    past = useHistoryStore.getState().past;
    assert.equal(past.length, 2);

    historyCommands.undo();
    historyCommands.undo();
    assert.equal(getDocument().layers.title.properties["content.text"], "Hello");
  });

  it("structural edits never merge, however fast (e.g. clicking + Keyframe 5 times)", () => {
    const clipId = documentCommands.addClip("title", clip("Fade"), "Add animation");
    const trackId = documentCommands.addTrack(clipId, { property: "appearance.opacity", keyframes: [] }, "Add track");
    for (let i = 0; i < 5; i++) {
      documentCommands.setKeyframe(clipId, trackId, { id: `kf_${i}`, time: i / 10, value: i }, "Add keyframe");
    }
    assert.equal(useHistoryStore.getState().past.length, 7);
  });

  it("edits outside the merge window stay separate", () => {
    documentCommands.updateProps("title", { "content.text": "A" }, "Edit text");
    ageLastEntry();
    documentCommands.updateProps("title", { "content.text": "B" }, "Edit text");
    assert.equal(useHistoryStore.getState().past.length, 2);
  });
});

describe("Phase 3.1: project-state entries", () => {
  beforeEach(reset);

  it("page actions undo and redo without touching unrelated document edits", () => {
    const store = useProjectStore.getState();
    const pageId = store.addPage({ name: "About", slug: "/about" }, undefined, "Add page");
    assert.ok(useProjectStore.getState().pages[pageId]);
    const pageRoot = useProjectStore.getState().pages[pageId].rootElementId;
    assert.ok(getDocument().layers[pageRoot], "addPage also creates the page's root layer");

    documentCommands.updateProps("title", { "content.text": "After" }, "Edit text");

    historyCommands.undo();
    assert.equal(getDocument().layers.title.properties["content.text"], "Hello");
    historyCommands.undo();
    assert.equal(useProjectStore.getState().pages[pageId], undefined);
    assert.equal(getDocument().layers[pageRoot], undefined, "the page root layer goes with the page");

    historyCommands.redo();
    assert.ok(useProjectStore.getState().pages[pageId]);
    assert.ok(getDocument().layers[pageRoot]);
    historyCommands.redo();
    assert.equal(getDocument().layers.title.properties["content.text"], "After");
  });

  it("mounting the demo project can be undone (it used to record the demo itself as the 'before' state)", () => {
    const before = getDocument();
    useProjectStore.getState().mountDemoProject();
    assert.notDeepEqual(getDocument(), before);
    historyCommands.undo();
    assert.deepEqual(getDocument(), before);
  });
});

describe("AUD-05 regression: a Sequencer keyframe is one document fact", () => {
  beforeEach(reset);

  it("add keyframe → visible to every document reader → undo removes it everywhere", () => {
    // The Sequencer's first keyframe creates the clip ("Update motion tracks"), as MotionSequencer.commitTracks does.
    documentCommands.addClip(
      "title",
      {
        ...clip("Default Motion"),
        tracks: [{ id: "trk_opacity", property: "appearance.opacity", keyframes: [{ id: "kf_a", time: 0.5, value: 1 }] }],
      },
      "Update motion tracks"
    );

    // Sequencer & Outliner read clips from the document (useLayerClips / getLayerClips).
    const clips = getLayerClips(getDocument(), "title");
    assert.equal(clips.length, 1);
    assert.equal(clips[0].tracks[0].keyframes[0].id, "kf_a");
    // What autosave writes is the project snapshot, which carries the same document.
    const saved = useProjectStore.getState().getSnapshot();
    assert.equal(getLayerClips(saved.document, "title")[0].tracks[0].keyframes.length, 1);

    historyCommands.undo();
    assert.equal(getLayerClips(getDocument(), "title").length, 0);
    assert.equal(getLayerClips(useProjectStore.getState().getSnapshot().document, "title").length, 0);
  });
});
