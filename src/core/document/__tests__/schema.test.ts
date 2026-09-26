import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import {
  SCHEMA_VERSION,
  TRIGGERS,
  CLIP_TYPES,
  createEmptyDocument,
  getMotionDocumentJsonSchema,
  validateMotionDocument,
  parseMotionDocument,
  type MotionDocument,
} from "../schema";
import { createDocumentFromLayers, createLayer } from "../factories";
import { ARCHETYPE_IDS, type ArchetypeId, type PropValue } from "../registry";
import { PROPERTY_PATHS, PROPERTY_REGISTRY, isPropertyLegalFor } from "../properties";
import { syncCompositions } from "../compositions";

function sampleDocument(): MotionDocument {
  const doc = createDocumentFromLayers([
    createLayer({ id: "root", archetype: "container", children: ["btn"] }),
    createLayer({ id: "btn", archetype: "button", parentId: "root" }),
  ]);
  doc.clips.clip_1 = {
    id: "clip_1",
    layerId: "btn",
    name: "Hover lift",
    type: "hover",
    trigger: "hover",
    duration: 0.3,
    easing: "power2.out",
    enabled: true,
    tracks: [{ id: "trk_1", property: "transform.y", keyframes: [{ id: "kf_1", time: 0, value: 0 }] }],
  };
  syncCompositions(doc); // v5: every clip is placed in a composition (the store does this on every write)
  return doc;
}

describe("MDM v2 schema: validation", () => {
  it("accepts an empty document and a sample document", () => {
    assert.ok(validateMotionDocument(createEmptyDocument()).ok);
    assert.ok(validateMotionDocument(sampleDocument()).ok);
  });

  it("rejects a layer stored under the wrong key", () => {
    const doc = sampleDocument();
    doc.layers.other = doc.layers.btn;
    const result = validateMotionDocument(doc);
    assert.equal(result.ok, false);
  });

  it("rejects parent/children links that disagree", () => {
    const doc = sampleDocument();
    doc.layers.root.children = [];
    const result = validateMotionDocument(doc);
    assert.ok(!result.ok && result.issues.some((i) => i.path === "layers.btn.parentId"));
  });

  it("rejects cycles in the layer tree", () => {
    const doc = sampleDocument();
    doc.layers.root.parentId = "btn";
    doc.layers.btn.children = ["root"];
    const result = validateMotionDocument(doc);
    assert.ok(!result.ok && result.issues.some((i) => i.message.includes("cycle")));
  });

  it("rejects clips, states and behaviours whose layer does not exist", () => {
    const doc = sampleDocument();
    doc.clips.clip_1.layerId = "ghost";
    doc.states.s1 = { id: "s1", layerId: "ghost", name: "hover", props: {} };
    const result = validateMotionDocument(doc);
    assert.ok(!result.ok);
    assert.ok(result.issues.some((i) => i.path === "clips.clip_1.layerId"));
    assert.ok(result.issues.some((i) => i.path === "states.s1.layerId"));
  });

  it("rejects non-JSON prop values and unknown archetypes", () => {
    const badValue = sampleDocument() as unknown as { layers: { btn: { properties: Record<string, unknown> } } };
    badValue.layers.btn.properties.fn = () => 1;
    assert.equal(validateMotionDocument(badValue).ok, false);

    const badArchetype = sampleDocument() as unknown as { layers: { btn: { archetype: string } } };
    badArchetype.layers.btn.archetype = "navbar";
    assert.equal(validateMotionDocument(badArchetype).ok, false);
  });

  it("rejects a prop key named __proto__ instead of silently dropping it", () => {
    const raw = JSON.parse(
      JSON.stringify(sampleDocument()).replace('"properties":{', '"properties":{"__proto__":{"polluted":true},')
    );
    assert.ok(Object.prototype.hasOwnProperty.call(raw.layers.root.properties, "__proto__"));
    const result = validateMotionDocument(raw);
    assert.ok(!result.ok && result.issues.some((i) => i.message.includes("__proto__")));
    assert.equal(({} as Record<string, unknown>).polluted, undefined, "no prototype pollution");
  });

  it("parseMotionDocument throws a readable error", () => {
    assert.throws(() => parseMotionDocument({ schemaVersion: 2 }), /Invalid Motion Document/);
  });
});

describe("MDM v2 schema: JSON Schema output", () => {
  it("is generated from the same source and describes every top-level field", () => {
    const schema = getMotionDocumentJsonSchema();
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    const required = schema.required as string[];
    for (const key of ["schemaVersion", "layers", "clips", "states", "behaviours", "tokens", "exportSettings"]) {
      assert.ok(required.includes(key), `${key} is required`);
    }
    const text = JSON.stringify(schema);
    assert.ok(!required.includes("artboard"), "v3 has no document-level artboard (top-level layers are frames)");
    for (const archetype of ARCHETYPE_IDS) assert.ok(text.includes(`"${archetype}"`), `${archetype} is listed`);
    for (const trigger of TRIGGERS) assert.ok(text.includes(`"${trigger}"`), `${trigger} is listed`);
  });
});

// ---------------------------------------------------------------------------
// Property-based round trip (ROADMAP Phase 2 gate): 500 random documents
// ---------------------------------------------------------------------------

const idArb = fc.stringMatching(/^[a-z]{1,6}_[0-9a-f]{8}$/);
// Stored documents come from JSON, so generate JSON-shaped data: plain prototypes, no -0.
const propValueArb: fc.Arbitrary<PropValue> = fc
  .jsonValue({ noUnicodeString: false })
  .map((v) => JSON.parse(JSON.stringify(v)) as PropValue)
  .filter((v) => !JSON.stringify(v).includes('"__proto__"')); // rejected by design; tested separately
// v3: prop keys are canonical paths. Draw candidate keys from the registry; each
// layer keeps only the ones legal for its archetype (see the `.map` below).
// Geometry values are type-checked (numbers / closed sets); arbitrary JSON would be
// rejected by design, so geometry round-trips are covered in property-gate.test.ts.
// v4: `typed` paths (render.role, shape parameters, counters) are value-checked the same way.
const NON_GEOMETRY_PATHS = PROPERTY_PATHS.filter((p) => !/^(frame\.|sizing\.|positioning$)/.test(p) && !PROPERTY_REGISTRY[p].typed);
const propsArb = fc.dictionary(fc.constantFrom(...NON_GEOMETRY_PATHS), propValueArb, {
  maxKeys: 6,
  noNullPrototype: true,
});

/** First animatable numeric path legal for the archetype (every archetype has one); v4 type-checks keyframe values. */
const trackPathFor = (archetype: ArchetypeId) =>
  PROPERTY_PATHS.find(
    (p) => PROPERTY_REGISTRY[p].animatable && PROPERTY_REGISTRY[p].interpolation === "numeric" && PROPERTY_REGISTRY[p].archetypes.includes(archetype)
  )!;

/** A random valid document: a forest where each layer's parent comes earlier in the list. */
const documentArb: fc.Arbitrary<MotionDocument> = fc
  .record({
    layerIds: fc.uniqueArray(idArb, { minLength: 0, maxLength: 12 }),
    parentPicks: fc.array(fc.nat(), { maxLength: 12 }),
    archetypes: fc.array(fc.constantFrom(...ARCHETYPE_IDS), { maxLength: 12 }),
    props: fc.array(propsArb, { maxLength: 12 }),
    clips: fc.array(
      fc.record({
        owner: fc.nat(),
        name: fc.string({ maxLength: 12 }),
        type: fc.constantFrom(...CLIP_TYPES),
        trigger: fc.constantFrom(...TRIGGERS),
        duration: fc.double({ min: 0, max: 10, noNaN: true, noDefaultInfinity: true }),
        repeat: fc.option(fc.integer({ min: -1, max: 5 }), { nil: undefined }),
        // Fractions of the duration: v4 keyframes strictly increase and sit inside the clip.
        keyframes: fc.uniqueArray(
          fc.record({ at: fc.integer({ min: 0, max: 1000 }), value: fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }).map((v) => v || 0) }),
          { maxLength: 4, selector: (k) => k.at }
        ),
      }),
      { maxLength: 6 }
    ),
  })
  .map(({ layerIds, parentPicks, archetypes, props, clips }) => {
    const doc = createEmptyDocument();
    layerIds.forEach((id, i) => {
      const pick = parentPicks[i] ?? 0;
      const parentId = i > 0 && pick % 3 !== 0 ? layerIds[pick % i] : null;
      const archetype = archetypes[i] ?? "generic";
      doc.layers[id] = {
        id,
        name: `Layer ${i}`,
        archetype,
        parentId,
        children: [],
        properties: Object.fromEntries(Object.entries(props[i] ?? {}).filter(([path]) => isPropertyLegalFor(path, archetype))),
      };
      if (parentId) doc.layers[parentId].children.push(id);
    });
    if (layerIds.length > 0) {
      clips.forEach((clip, i) => {
        const id = `clip_${i.toString(16).padStart(8, "0")}`;
        const layerId = layerIds[clip.owner % layerIds.length];
        doc.clips[id] = {
          id,
          layerId,
          name: clip.name,
          type: clip.type,
          trigger: clip.trigger,
          duration: clip.duration,
          easing: "linear",
          enabled: true,
          ...(clip.repeat !== undefined ? { repeat: clip.repeat } : {}),
          tracks: [
            {
              id: `trk_${i.toString(16).padStart(8, "0")}`,
              property: trackPathFor(doc.layers[layerId].archetype),
              keyframes: [...clip.keyframes]
                .sort((a, b) => a.at - b.at)
                .map((k) => ({ time: (k.at / 1000) * clip.duration, value: k.value }))
                .filter((k, j, all) => j === 0 || k.time > all[j - 1].time)
                .map((k, j) => ({ id: `kf_${j.toString(16).padStart(8, "0")}`, ...k })),
            },
          ],
        };
      });
    }
    syncCompositions(doc);
    return doc;
  });

describe("MDM v5 schema: property-based round trip", () => {
  it("500 random documents survive validate → serialise → parse → validate unchanged", () => {
    fc.assert(
      fc.property(documentArb, (doc) => {
        const first = validateMotionDocument(doc);
        assert.ok(first.ok, first.ok ? "" : JSON.stringify(first.issues.slice(0, 3)));
        const parsed = JSON.parse(JSON.stringify(first.document));
        const second = validateMotionDocument(parsed);
        assert.ok(second.ok);
        assert.deepStrictEqual(second.document, doc);
        assert.equal(second.document.schemaVersion, SCHEMA_VERSION);
      }),
      { numRuns: 500 }
    );
  });
});
