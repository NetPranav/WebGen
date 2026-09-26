import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { applyPatches } from "immer";
import { useProjectStore } from "../useProjectStore";
import { useHistoryStore } from "../useHistoryStore";
import { documentCommands, getDocument, historyCommands, subscribeToDocumentChanges, type DocumentChange } from "../useDocumentStore";
import { createDocumentFromLayers, createLayer, getLayerClips } from "../../document/factories";
import { validateMotionDocument, type ClipTemplate } from "../../document/schema";

const clip = (name: string, trigger: ClipTemplate["trigger"] = "mount"): ClipTemplate => ({
  id: "",
  name,
  type: "entrance",
  trigger,
  duration: 1,
  easing: "linear",
  enabled: true,
  tracks: [],
});

function reset() {
  useHistoryStore.getState().clearHistory();
  useProjectStore.setState({
    document: createDocumentFromLayers([
      createLayer({ id: "root", archetype: "container", children: ["card"] }),
      createLayer({ id: "card", archetype: "container", parentId: "root", children: ["label"] }),
      createLayer({ id: "label", archetype: "text", parentId: "card" }),
    ]),
  });
}

describe("documentCommands", () => {
  beforeEach(reset);

  it("addLayer uses registry defaults, the CONVENTIONS id format, and links the parent", () => {
    const id = documentCommands.addLayer({ archetype: "button", parentId: "card", index: 0 });
    const doc = getDocument();
    assert.match(id, /^elem_btn_[0-9a-f]{8}$/);
    assert.equal(doc.layers[id].properties["appearance.variant"], "primary");
    assert.deepEqual(doc.layers.card.children, [id, "label"]);
    assert.ok(validateMotionDocument(doc).ok);
  });

  it("removeLayer removes the subtree and everything it owns", () => {
    const clipId = documentCommands.addClip("label", clip("Fade"));
    documentCommands.addState("label", "hover");
    documentCommands.removeLayer("card");
    const doc = getDocument();
    assert.deepEqual(Object.keys(doc.layers), ["root"]);
    assert.deepEqual(doc.layers.root.children, []);
    assert.equal(doc.clips[clipId], undefined);
    assert.deepEqual(doc.states, {});
  });

  it("moveLayer re-parents and refuses to create a cycle", () => {
    documentCommands.moveLayer("label", "root", 0);
    assert.deepEqual(getDocument().layers.root.children, ["label", "card"]);
    assert.throws(() => documentCommands.moveLayer("root", "card"), /inside itself/);
    assert.ok(validateMotionDocument(getDocument()).ok);
  });

  it("updateProps merges, and an undefined value deletes the prop", () => {
    documentCommands.updateProps("label", { "content.text": "Hi", "typography.fontSize": undefined });
    const props = getDocument().layers.label.properties;
    assert.equal(props["content.text"], "Hi");
    assert.ok(!("typography.fontSize" in props));
  });

  it("updateProps stores only canonical paths: legacy names are renamed, unknown keys dropped (Phase 42)", () => {
    const warn = console.warn;
    const warnings: string[] = [];
    console.warn = (msg: string) => warnings.push(msg);
    try {
      documentCommands.updateProps("label", { fontSize: 30, notAProperty: 1, "media.src": "x.png" });
    } finally {
      console.warn = warn;
    }
    const props = getDocument().layers.label.properties;
    assert.equal(props["typography.fontSize"], 30);
    assert.ok(!("fontSize" in props) && !("notAProperty" in props) && !("media.src" in props));
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /notAProperty/);
    assert.match(warnings[0], /media\.src.*not a property of text/);
  });

  it("setLayerClips replaces the stack in order; setKeyframe keeps tracks sorted", () => {
    documentCommands.setLayerClips("label", [clip("A"), clip("B", "hover")]);
    const [a] = getLayerClips(getDocument(), "label");
    assert.deepEqual(getLayerClips(getDocument(), "label").map((c) => c.name), ["A", "B"]);

    const trackId = documentCommands.addTrack(a.id, { property: "transform.x", keyframes: [] });
    documentCommands.setKeyframe(a.id, trackId, { id: "k2", time: 0.5, value: 10 });
    documentCommands.setKeyframe(a.id, trackId, { id: "k1", time: 0, value: 0 });
    documentCommands.setKeyframe(a.id, trackId, { id: "k2", time: 0.8, value: 12 });
    const keyframes = getDocument().clips[a.id].tracks[0].keyframes;
    assert.deepEqual(keyframes.map((k) => [k.id, k.time]), [["k1", 0], ["k2", 0.8]]);
  });

  it("every change is a patch; inverse patches restore the previous document", () => {
    const changes: DocumentChange[] = [];
    const unsubscribe = subscribeToDocumentChanges((c) => changes.push(c));
    const before = getDocument();
    documentCommands.addLayer({ archetype: "badge", parentId: "root" });
    unsubscribe();
    assert.equal(changes.length, 1);
    assert.ok(changes[0].patches.length > 0);
    assert.deepEqual(applyPatches(getDocument(), changes[0].inversePatches), before);
  });

  it("applyDiff replays patches, and refuses ones that break the document", () => {
    const layer = createLayer({ id: "extra", archetype: "text", parentId: "root" });
    documentCommands.applyDiff([
      { op: "add", path: ["layers", "extra"], value: layer },
      { op: "add", path: ["layers", "root", "children", 1], value: "extra" },
    ]);
    assert.ok(getDocument().layers.extra);

    assert.throws(
      () => documentCommands.applyDiff([{ op: "add", path: ["layers", "bad"], value: { ...layer, id: "bad", parentId: "nowhere" } }]),
      /invalid document/
    );
    assert.equal(getDocument().layers.bad, undefined);
  });

  it("every command records one undo step (unlabelled ones as \"Edit\")", () => {
    documentCommands.updateProps("label", { "content.text": "draft" });
    assert.equal(useHistoryStore.getState().getLastActionLabel(), "Edit");
    documentCommands.updateProps("label", { "content.text": "final" }, "Edit text");
    assert.equal(useHistoryStore.getState().past.length, 2);
    historyCommands.undo();
    assert.equal(getDocument().layers.label.properties["content.text"], "draft");
  });
});

// ---------------------------------------------------------------------------
// ROADMAP Phase 2 gate: the retired element models are gone from the source.
// ---------------------------------------------------------------------------

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

/** Migration code and docs may name the v1 types in comments; only code counts. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

describe("Phase 2 gate: retired models", () => {
  it("no source code references ProjectElement, BaseElementNode, AttachedAnimation or ElementType", () => {
    const root = join(__dirname, "../../..");
    const self = join(__dirname, "documentStore.test.ts");
    const offenders = sourceFiles(root)
      .filter((file) => file !== self)
      .filter((file) => /\b(ProjectElement|BaseElementNode|AttachedAnimation|ElementType)\b/.test(stripComments(readFileSync(file, "utf8"))));
    assert.deepEqual(offenders, []);
  });
});
