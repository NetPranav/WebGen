/**
 * ROADMAP Phase 42 Verification Gate (unit half).
 *
 *  1. Every preset, factory, fixture and template generator produces only
 *     canonical, archetype-legal property paths; emitters and the stage
 *     renderer don't read props by legacy name.
 *  2. 500 random v2 documents migrate to valid v3 with every value kept at
 *     its canonical path, idempotently, and round-trip through JSON unchanged.
 *  3. Scrubbing a preset authored with `transform.translateY` moves the layer
 *     once migrated (ROADMAP §4.1 row 4).
 *
 * The browser half (migrated demo screenshot matches) is in
 * tests/e2e/property-migration.spec.ts.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import fc from "fast-check";
import {
  ANIMATION_TRACK_ID_PATHS,
  LEGACY_ALIASES,
  PROPERTY_REGISTRY,
  isCanonicalPath,
  isPropertyLegalFor,
  DEFAULT_ROOT_FRAME,
  normalizeGeometryProps,
  rescaleValue,
  resolvePropertyPath,
} from "../properties";
import { ARCHETYPE_IDS, ARCHETYPE_REGISTRY, getDefaultProps, type ArchetypeId, type PropValue } from "../registry";
import { SCHEMA_VERSION, validateMotionDocument, type Layer } from "../schema";
import { loadDocument, migrateV2ToV3, migrateV3ToV4 } from "../migrations";
import { ALL_PRESETS } from "../../motion/presets";
import { createBlankCanvasSnapshot, createShowcaseSnapshot } from "../../storage/DemoProjectSnapshot";
import { createDefaultBlankSnapshot } from "../../storage/ProjectDatabase";
import { ComponentGenerator } from "../../../ai/component/ComponentGenerator";
import { ProjectScaffolder } from "../../../ai/scaffold/ProjectScaffolder";
import { PREBUILT_BLOCKS } from "../../../editor/panels/content-browser/ContentBlockShelf";
import { interpolateTrackValue, scrubStylesForTracks } from "../../../editor/panels/sequencer/scrubPatch";

function assertCanonicalLayers(source: string, layers: Iterable<Layer>) {
  for (const layer of layers) {
    for (const key of Object.keys(layer.properties)) {
      assert.ok(isCanonicalPath(key), `${source}: ${layer.id} (${layer.archetype}) uses non-canonical "${key}"`);
      assert.ok(isPropertyLegalFor(key, layer.archetype), `${source}: "${key}" is not a property of ${layer.archetype}`);
    }
  }
}

describe("Phase 42 gate: no property path outside the registry", () => {
  it("presets: every track path is canonical and legal for every archetype it targets", () => {
    for (const preset of ALL_PRESETS) {
      for (const track of preset.animation.tracks ?? []) {
        assert.ok(isCanonicalPath(track.property), `${preset.id}: "${track.property}"`);
        for (const archetype of preset.compatibleArchetypes) {
          assert.ok(isPropertyLegalFor(track.property, archetype), `${preset.id}: "${track.property}" on ${archetype}`);
        }
      }
    }
  });

  it("factories: every archetype's default props are canonical", () => {
    for (const archetype of ARCHETYPE_IDS) {
      assertCanonicalLayers(`defaults:${archetype}`, [
        { id: archetype, name: archetype, archetype, parentId: null, children: [], properties: getDefaultProps(archetype) },
      ]);
    }
  });

  it("fixtures: demo, blank and new-project snapshots are canonical and valid", () => {
    for (const [name, snapshot] of [
      ["showcase", createShowcaseSnapshot()],
      ["blank canvas", createBlankCanvasSnapshot()],
      ["new project", createDefaultBlankSnapshot("prj_gate", "Gate")],
    ] as const) {
      assertCanonicalLayers(name, Object.values(snapshot.document.layers));
      const check = validateMotionDocument(snapshot.document);
      assert.ok(check.ok, `${name}: ${check.ok ? "" : JSON.stringify(check.issues.slice(0, 3))}`);
    }
  });

  it("templates: component generator, content blocks and project scaffolder emit canonical layers", () => {
    for (const prompt of ["pricing plan", "testimonial quote", "dark mode toggle", "hero banner", "image gallery", "status badge", "profile card"]) {
      assertCanonicalLayers(`ComponentGenerator("${prompt}")`, ComponentGenerator.generateComponent(prompt).elements);
    }
    for (const block of PREBUILT_BLOCKS) {
      assertCanonicalLayers(`ContentBlockShelf:${block.id}`, block.createElements("root"));
    }
    const scaffold = ProjectScaffolder.scaffoldProject("SaaS with auth, a pricing page, and a dashboard");
    assertCanonicalLayers("ProjectScaffolder", Object.values(scaffold.snapshot.document.layers));
  });

  it("the legacy animation-sample vocabulary maps onto canonical paths", () => {
    for (const [trackId, path] of Object.entries(ANIMATION_TRACK_ID_PATHS)) {
      assert.ok(isCanonicalPath(path), `${trackId} → ${path}`);
    }
  });

  it("emitters and the stage renderer never read a prop by its legacy name", () => {
    const legacy = Object.keys(LEGACY_ALIASES).filter((k) => !k.includes("."));
    // Raw bag access by legacy name. `props.<name>` only counts where `props` is bound to a raw
    // `.properties` bag; typed views (`readProps`) and `propReader` are checked by the compiler.
    // (`msg.properties` in SandboxHost is the stage hot-patch message, not a layer.)
    const rawAccess = new RegExp(`(?<!\\bmsg)\\.properties\\??\\.(${legacy.join("|")})\\b`);
    const propsAccess = new RegExp(`\\bprops\\??\\.(${legacy.join("|")})\\b`);
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
          if (entry !== "__tests__") walk(path);
        } else if (/\.tsx?$/.test(entry)) files.push(path);
      }
    };
    walk(join(process.cwd(), "src/compiler/emitters"));
    files.push(join(process.cwd(), "src/editor/runtime/SandboxHost.tsx"));
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const propsIsRawBag = /\bprops\s*=\s*[^;\n]*\.properties\b/.test(source);
      source.split("\n").forEach((line, i) => {
        assert.doesNotMatch(line, rawAccess, `${file}:${i + 1}`);
        if (propsIsRawBag) assert.doesNotMatch(line, propsAccess, `${file}:${i + 1}`);
      });
    }
  });
});

// ---------------------------------------------------------------------------
// 500 random v2 documents → v3
// ---------------------------------------------------------------------------

/** Legacy flat keys that mean something on `archetype`, one per canonical target. */
function legacyKeysFor(archetype: ArchetypeId): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const [key, alias] of Object.entries(LEGACY_ALIASES)) {
    if (alias.split || key.includes(".")) continue;
    const res = resolvePropertyPath(key, archetype);
    if (!res.ok || !res.definition.archetypes.includes(archetype) || seen.has(res.path)) continue;
    seen.add(res.path);
    keys.push(key);
  }
  return keys;
}
const LEGACY_KEYS = Object.fromEntries(ARCHETYPE_IDS.map((a) => [a, legacyKeysFor(a)])) as Record<ArchetypeId, string[]>;
const LEGACY_TRACKS = ["transform.translateX", "transform.translateY", "transform.rotateZ", "transform.scale", "appearance.opacity"];

/** Values a v2 editor could have stored for geometry keys (numbers, CSS lengths, units). */
const GEOMETRY_VALUE_ARB: Partial<Record<string, fc.Arbitrary<PropValue>>> = {
  "frame.width": fc.oneof(fc.integer({ min: 0, max: 4000 }), fc.constantFrom("100%", "320px", "50vw", "auto", "12.5rem")),
  "frame.height": fc.oneof(fc.integer({ min: 0, max: 4000 }), fc.constantFrom("100%", "240px", "auto")),
  "frame.widthUnit": fc.constantFrom("px", "%", "rem", "vw"),
  "frame.heightUnit": fc.constantFrom("px", "%", "vh"),
};

const scalarArb: fc.Arbitrary<PropValue> = fc.oneof(
  fc.string({ maxLength: 12 }),
  fc.double({ min: -1e4, max: 1e4, noNaN: true, noDefaultInfinity: true }).map((n) => (Object.is(n, -0) ? 0 : n)),
  fc.boolean()
);

const v2DocumentArb = fc
  .record({
    archetypes: fc.array(fc.constantFrom(...ARCHETYPE_IDS), { minLength: 1, maxLength: 8 }),
    picks: fc.array(fc.array(fc.nat(), { maxLength: 5 }), { maxLength: 8 }),
    values: fc.array(fc.array(scalarArb, { maxLength: 5 }), { maxLength: 8 }),
    geometry: fc.array(fc.record(Object.fromEntries(Object.entries(GEOMETRY_VALUE_ARB).map(([k, v]) => [k, fc.option(v!, { nil: undefined })]))), {
      maxLength: 8,
    }),
    board: fc.record({ width: fc.constantFrom(1440, 1280, 390), height: fc.constantFrom(900, 800, 844) }),
    tracks: fc.array(fc.record({ owner: fc.nat(), path: fc.constantFrom(...LEGACY_TRACKS), value: fc.integer({ min: -200, max: 200 }) }), {
      maxLength: 6,
    }),
  })
  .map(({ archetypes, picks, values, geometry, board, tracks }) => {
    const layers: Record<string, unknown> = {};
    const ids = archetypes.map((_, i) => `lyr_${i.toString(16).padStart(8, "0")}`);
    archetypes.forEach((archetype, i) => {
      const keys = LEGACY_KEYS[archetype].filter((k) => !["width", "height", "widthUnit", "heightUnit"].includes(k));
      const properties: Record<string, PropValue> = {};
      (picks[i] ?? []).forEach((pick, j) => {
        if (keys.length) properties[keys[pick % keys.length]] = (values[i] ?? [])[j] ?? j;
      });
      // Legacy geometry keys, with values of the kind a v2 editor stored.
      if (ARCHETYPE_REGISTRY[archetype].kind !== "scene3d") {
        const g = geometry[i] ?? {};
        if (g["frame.width"] !== undefined) properties.width = g["frame.width"];
        if (g["frame.height"] !== undefined) properties.height = g["frame.height"];
        if (g["frame.widthUnit"] !== undefined) properties.widthUnit = g["frame.widthUnit"];
        if (g["frame.heightUnit"] !== undefined) properties.heightUnit = g["frame.heightUnit"];
      }
      layers[ids[i]] = { id: ids[i], name: `L${i}`, archetype, parentId: null, children: [], properties };
    });
    const clips: Record<string, unknown> = {};
    tracks.forEach((t, i) => {
      const layerId = ids[t.owner % ids.length];
      if (ARCHETYPE_REGISTRY[(layers[layerId] as Layer).archetype].kind === "scene3d") return; // no 2D transforms on 3D layers
      const id = `clip_${i.toString(16).padStart(8, "0")}`;
      clips[id] = {
        id,
        layerId,
        name: "c",
        type: "entrance",
        trigger: "mount",
        duration: 1,
        easing: "linear",
        enabled: true,
        tracks: [{ id: `trk_${i.toString(16).padStart(8, "0")}`, property: t.path, keyframes: [{ id: "kf_00000000", time: 0, value: t.value }] }],
      };
    });
    return {
      schemaVersion: 2,
      artboard: { width: board.width, height: board.height, background: "#ffffff" },
      layers,
      clips,
      states: {},
      behaviours: {},
      tokens: { colors: {}, spacing: {}, radii: {} },
      exportSettings: { framework: "nextjs-app", styling: "tailwind", animation: "gsap", language: "typescript" },
    };
  });

describe("Phase 42 gate: v2 → v3 migration", () => {
  it("500 random v2 documents migrate to valid v3, keep every value, and round-trip unchanged", () => {
    fc.assert(
      fc.property(v2DocumentArb, (v2) => {
        // v2 → v3 is this gate's subject; v3 → v4 (Phase 7) only adds collections, so the result is checked as current data.
        const { document: v3Only, report } = migrateV2ToV3(v2);
        const v3 = migrateV3ToV4(v3Only).document;
        assert.deepEqual(report, [], "nothing legal is dropped");
        const check = validateMotionDocument(v3);
        assert.ok(check.ok, check.ok ? "" : JSON.stringify(check.issues.slice(0, 3)));
        assert.equal(v3.schemaVersion, SCHEMA_VERSION);

        // No data loss: every legacy value sits at its canonical path (rescaled where the unit
        // changed, CSS lengths split into number + unit), and the artboard size is on the root frames.
        for (const [id, raw] of Object.entries(v2.layers) as [string, Layer][]) {
          const expected: Record<string, PropValue> = {};
          for (const [key, value] of Object.entries(raw.properties)) {
            const res = resolvePropertyPath(key, raw.archetype);
            assert.ok(res.ok);
            expected[res.path] = rescaleValue(value, res.scale);
          }
          assert.deepEqual(normalizeGeometryProps(expected), [], "every generated length parses");
          if (raw.parentId === null && ARCHETYPE_REGISTRY[raw.archetype].kind !== "scene3d") {
            if (v2.artboard.width !== DEFAULT_ROOT_FRAME.width && expected["frame.width"] === undefined) {
              expected["frame.width"] = v2.artboard.width;
              expected["sizing.horizontal"] ??= "fill";
            }
            if (v2.artboard.height !== DEFAULT_ROOT_FRAME.height && expected["frame.height"] === undefined) {
              expected["frame.height"] = v2.artboard.height;
              expected["sizing.vertical"] ??= "hug";
            }
          }
          assert.deepEqual(v3.layers[id].properties, expected, id);
        }
        assert.equal("artboard" in v3, false, "the artboard moved onto the root frames");
        for (const clip of Object.values(v3.clips)) {
          for (const track of clip.tracks) assert.ok(isCanonicalPath(track.property), track.property);
        }

        // Idempotent and stable: loading the migrated document again changes nothing, and JSON round-trips it.
        assert.deepEqual(loadDocument({ document: v3 }), v3);
        assert.deepEqual(loadDocument({ document: JSON.parse(JSON.stringify(v3)) }), v3);
        assert.deepEqual(loadDocument({ document: v2 }), v3, "loadDocument runs the same migration");
      }),
      { numRuns: 500 }
    );
  });
});

// ---------------------------------------------------------------------------
// Scrub regression (§4.1 row 4)
// ---------------------------------------------------------------------------

describe("Phase 42 gate: scrubbing a translateY preset moves the layer", () => {
  const v2 = {
    schemaVersion: 2,
    artboard: { width: 1440, height: 900, background: "#ffffff" },
    layers: { btn: { id: "btn", name: "CTA", archetype: "button", parentId: null, children: [], properties: { label: "Go" } } },
    clips: {
      rise: {
        id: "rise",
        layerId: "btn",
        name: "Rise",
        type: "entrance",
        trigger: "mount",
        duration: 1,
        easing: "linear",
        enabled: true,
        tracks: [
          {
            id: "trk_rise",
            property: "transform.translateY",
            keyframes: [
              { id: "kf_a", time: 0, value: 40 },
              { id: "kf_b", time: 1, value: 0 },
            ],
          },
        ],
      },
    },
    states: {},
    behaviours: {},
    tokens: { colors: {}, spacing: {}, radii: {} },
    exportSettings: { framework: "nextjs-app", styling: "tailwind", animation: "gsap", language: "typescript" },
  };

  it("was invisible before: the scrub patch ignores the unmigrated dialect", () => {
    const styles = scrubStylesForTracks(v2.clips.rise.tracks as never, 0.5, interpolateTrackValue);
    assert.equal(styles.transform, undefined);
  });

  it("migrates to transform.y, and the scrub patch now emits a transform", () => {
    const doc = loadDocument({ document: v2 });
    const [track] = doc.clips.rise.tracks;
    assert.equal(track.property, "transform.y");
    const styles = scrubStylesForTracks(doc.clips.rise.tracks, 0.5, interpolateTrackValue);
    assert.ok(styles.transform && styles.transform !== "none", JSON.stringify(styles));
    assert.match(styles.transform, /20/, "halfway between 40 and 0");
  });
});

// Keep the registry import used even if every assertion above short-circuits.
void PROPERTY_REGISTRY;
