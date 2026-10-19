import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DocumentVersionError, loadDocument, upgradeSnapshot } from "../migrations";
import { validateMotionDocument } from "../schema";
import { createDocumentFromLayers, createLayer, getLayerClips } from "../factories";
import {
  ARCHETYPE_IDS,
  ARCHETYPE_REGISTRY,
  INITIAL_ARCHETYPE_IDS,
  RESERVED_GRAMMAR_TYPES,
  getDefaultProps,
  getLegalStates,
  archetypesOfFamily,
} from "../registry";

/** A v1 project as the pre-MDM editor stored it. */
const V1_ELEMENTS = {
  root: {
    id: "root",
    name: "Root",
    archetype: "container",
    parentId: null,
    properties: { gap: 16 },
    children: ["btn", "missing_child"],
  },
  btn: {
    id: "btn",
    name: "Buy",
    archetype: "button",
    parentId: "root",
    children: [],
    properties: {
      label: "Buy",
      // Where the v1 Sequencer wrote animations:
      animationStack: [
        {
          id: "anim_hover",
          name: "Lift",
          type: "hover",
          trigger: "onHover",
          duration: 0.3,
          easing: "power2.out",
          enabled: true,
          tracks: [{ property: "transform.y", keyframes: [{ time: 0, value: 0 }, { time: 0.3, value: -4, ease: "back.out" }] }],
        },
        { name: "Pulse", type: "loop", trigger: "ambient", duration: 2, easing: "sine.inOut", enabled: true, repeat: -1 },
      ],
    },
  },
  // BaseElementNode shape: top-level stack and style blocks, orphaned parent, unknown archetype.
  node: {
    id: "node",
    name: "Legacy Node",
    archetype: "navbar",
    family: "structural",
    parentId: "gone",
    children: [],
    layout: { width: 100 },
    properties: {},
    animationStack: [{ id: "anim_scroll", name: "Scroll", type: "scroll", trigger: "onScroll", duration: 1, easing: "none", enabled: false }],
  },
};

describe("MDM v1 → v2 migration", () => {
  const doc = loadDocument({ elements: V1_ELEMENTS, target: { framework: "react-vite", styling: 42 } });

  it("produces a valid v2 document", () => {
    const result = validateMotionDocument(doc);
    assert.ok(result.ok, result.ok ? "" : JSON.stringify(result.issues));
  });

  it("moves properties.animationStack into clips with PRD triggers and generated ids", () => {
    const clips = getLayerClips(doc, "btn");
    assert.deepEqual(clips.map((c) => [c.name, c.trigger]), [["Lift", "hover"], ["Pulse", "time"]]);
    assert.equal(clips[1].repeat, -1);
    assert.match(clips[1].id, /^clip_[0-9a-f]{8}$/);
    const track = clips[0].tracks[0];
    assert.match(track.id, /^trk_[0-9a-f]{8}$/);
    assert.deepEqual(track.keyframes.map((k) => [k.time, k.value, k.ease]), [[0, 0, undefined], [0.3, -4, "back.out"]]);
    assert.equal(doc.layers.btn.properties.animationStack, undefined, "stack no longer lives in props");
  });

  it("moves the stack and style blocks of a legacy node-shaped element", () => {
    const [clip] = getLayerClips(doc, "node");
    assert.equal(clip.trigger, "scrollProgress");
    assert.equal(clip.enabled, false);
    // v3: the v1 `layout: { width }` style block is unpacked onto its canonical path.
    assert.equal(doc.layers.node.properties["frame.width"], 100);
    assert.equal(doc.layers.node.properties.layout, undefined);
  });

  it("repairs broken tree links and unknown archetypes", () => {
    assert.deepEqual(doc.layers.root.children, ["btn"], "missing child dropped");
    assert.equal(doc.layers.node.parentId, null, "orphan becomes a root");
    assert.equal(doc.layers.node.archetype, "generic");
  });

  it("moves `target` into exportSettings, ignoring non-string values", () => {
    assert.equal(doc.exportSettings.framework, "react-vite");
    assert.equal(doc.exportSettings.styling, "tailwind");
  });

  it("returns valid v2 documents unchanged and repairs broken v2 links", () => {
    const v2 = createDocumentFromLayers([createLayer({ id: "a", archetype: "text" })]);
    assert.deepEqual(loadDocument({ document: v2 }), v2);

    const broken = createDocumentFromLayers([
      createLayer({ id: "p", archetype: "container", children: ["c", "zzz"] }),
      createLayer({ id: "c", archetype: "text", parentId: "p" }),
    ]);
    broken.clips.orphan = { id: "orphan", layerId: "nope", name: "x", type: "entrance", trigger: "mount", duration: 1, easing: "linear", enabled: true, tracks: [] };
    const repaired = loadDocument({ document: broken });
    assert.deepEqual(repaired.layers.p.children, ["c"]);
    assert.equal(repaired.clips.orphan, undefined);
  });

  it("refuses documents from a newer schema version", () => {
    assert.throws(() => loadDocument({ document: { schemaVersion: 99 } }), DocumentVersionError);
  });

  it("upgradeSnapshot strips v1 fields and keeps the rest", () => {
    const snap = upgradeSnapshot({ projectName: "P", elements: V1_ELEMENTS, target: {} });
    assert.equal(snap.projectName, "P");
    assert.ok(!("elements" in snap) && !("target" in snap));
    assert.ok(snap.document.layers.btn);
  });
});

describe("Archetype registry", () => {
  it("covers every archetype with a kind, sections, a prefix and JSON-safe defaults", () => {
    for (const id of ARCHETYPE_IDS) {
      const entry = ARCHETYPE_REGISTRY[id];
      assert.equal(entry.id, id);
      assert.ok(entry.sections.length > 0 && entry.sections.includes("identity"), `${id} sections`);
      assert.match(entry.idPrefix, /^[a-z0-9_]+$/);
      assert.deepEqual(JSON.parse(JSON.stringify(entry.defaultProps)), entry.defaultProps, `${id} defaults are JSON`);
    }
  });

  it("returns fresh default props each call", () => {
    const a = getDefaultProps("image");
    a["media.filter.blur"] = 99;
    assert.equal(getDefaultProps("image")["media.filter.blur"], 0);
  });

  it("maps the 10 starting archetypes onto the 4 PRD families", () => {
    assert.equal(INITIAL_ARCHETYPE_IDS.length, 10);
    for (const id of INITIAL_ARCHETYPE_IDS) assert.notEqual(ARCHETYPE_REGISTRY[id].family, null);
    assert.deepEqual(archetypesOfFamily("media"), ["image", "icon"]);
  });

  it("derives legal states from the grammar and lists unused grammar types as reserved", () => {
    assert.deepEqual([...getLegalStates("toggle")], ["Off", "On", "Disabled"]);
    assert.ok(RESERVED_GRAMMAR_TYPES.includes("Navbar"));
    assert.ok(!RESERVED_GRAMMAR_TYPES.includes("Button"));
  });
});

describe("Phase 53: migration v5 → v6", () => {
  const v5 = () => {
    const doc = structuredClone(createDocumentFromLayers([createLayer({ id: "box", archetype: "container" })])) as unknown as Record<string, unknown>;
    doc.schemaVersion = 5;
    return doc;
  };

  it("only moves schemaVersion; every v5 entity is kept exactly", () => {
    const before = v5();
    const loaded = loadDocument({ document: structuredClone(before) });
    assert.equal(loaded.schemaVersion, 6);
    const { schemaVersion: _a, ...rest } = loaded as unknown as Record<string, unknown>;
    const { schemaVersion: _b, ...restBefore } = before;
    void _a;
    void _b;
    assert.deepEqual(rest, restBefore);
  });

  it("accepts the new clip types and triggers, and a `stagger` clip needs its stagger", () => {
    const layer = createLayer({ id: "box", archetype: "container" });
    const doc = (type: string, trigger: string, extra: Record<string, unknown> = {}) =>
      createDocumentFromLayers([layer], [
        { id: "c", layerId: "box", name: "c", type, trigger, duration: 1, easing: "linear", enabled: true, tracks: [], ...extra } as never,
      ]);
    for (const [type, trigger] of [["exit", "unmount"], ["focus", "focus"], ["layout", "layoutChange"]]) {
      const check = validateMotionDocument(doc(type, trigger));
      assert.ok(check.ok, check.ok ? "" : JSON.stringify(check.issues.slice(0, 3)));
    }
    assert.ok(!validateMotionDocument(doc("stagger", "mount")).ok, "a stagger clip without `stagger` is rejected");
    const staggered = validateMotionDocument(doc("stagger", "mount", { stagger: { each: 0.1, from: "start" } }));
    assert.ok(staggered.ok, staggered.ok ? "" : JSON.stringify(staggered.issues.slice(0, 3)));
  });
});
