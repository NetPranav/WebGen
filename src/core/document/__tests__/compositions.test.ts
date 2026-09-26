/**
 * ROADMAP Phase 46: compositions, layer time bars, nesting and markers.
 *
 * Gate: "The 12 Phase 7 reference effects, plus a 3-scene intro sequence with
 * one nested composition, are expressible and valid. Golden tests: evaluate()
 * matches hand-computed values at in/out edges and under stretch and time
 * remap. The migration leaves the demo project visually identical
 * (Playwright)." The golden tests cover the time mapping `evaluate()`
 * (Phase 9) is built on: composition → layer → clip time, and nesting. The
 * visual half is tests/e2e/composition-migration.spec.ts.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { enablePatches, produceWithPatches } from "immer";

enablePatches();
import { validateMotionDocument, type Clip, type MotionDocument } from "../schema";
import {
  MAIN_COMPOSITION_ID,
  childTime,
  clipTime,
  clipTimeInComposition,
  compositionTimes,
  layerTime,
  remapTime,
  syncCompositions,
  type NestedComposition,
} from "../compositions";
import { loadDocument, migrateV4ToV5 } from "../migrations";
import { attachClip, hydrateClip } from "../factories";
import { ALL_PRESETS } from "../../motion/presets";
import { introSequence } from "./fixtures/intro-sequence";
import { REFERENCE_EFFECTS } from "./fixtures/reference-effects";

const near = (actual: number | null | undefined, expected: number, msg?: string) => {
  assert.ok(actual !== null && actual !== undefined, `${msg ?? ""}: expected ${expected}, got ${actual}`);
  assert.ok(Math.abs(actual - expected) < 1e-9, `${msg ?? ""}: expected ${expected}, got ${actual}`);
};
const clip = (over: Partial<Clip>): Clip => ({
  id: "c",
  layerId: "l",
  name: "c",
  type: "entrance",
  trigger: "mount",
  duration: 2,
  easing: "linear",
  enabled: true,
  tracks: [],
  ...over,
});

// ---------------------------------------------------------------------------
// Golden time maths
// ---------------------------------------------------------------------------

describe("Phase 46 golden: layer time bars (in/out edges, stretch)", () => {
  const bar = { start: 1, in: 1.5, out: 3, stretch: 2 };
  it("is inactive before `in` and at/after `out` (out is exclusive)", () => {
    assert.equal(layerTime(bar, 1.49), null);
    assert.equal(layerTime(bar, 3), null);
    assert.equal(layerTime(bar, 3.5), null);
  });
  it("maps composition time to layer time through start and stretch", () => {
    near(layerTime(bar, 1.5), 0.25, "at in: (1.5 − 1) / 2");
    near(layerTime(bar, 2.9), 0.95, "just before out: (2.9 − 1) / 2");
    near(layerTime({ start: -1, in: 0, out: 4, stretch: 0.5 }, 1), 4, "negative start, 50% stretch");
  });
});

describe("Phase 46 golden: clip timing (delay, repeat, repeat delay, direction)", () => {
  const c = clip({ duration: 2, delay: 0.5, repeat: 1, repeatDelay: 0.5, direction: "alternate" });
  const cases: [number, string, number, number][] = [
    // t, phase, iteration, tracks time (hand-computed)
    [0.4, "before", 0, 0],
    [0.5, "active", 0, 0],
    [1.5, "active", 0, 1],
    [2.5, "active", 0, 2], // end of the first pass
    [2.75, "active", 0, 2], // in the repeat delay: holds the end
    [3, "active", 1, 2], // second pass starts, reversed (alternate)
    [4, "active", 1, 1],
    [4.99, "active", 1, 0.01],
    [5, "after", 1, 0], // done: holds the last frame of the reversed pass
    [9, "after", 1, 0],
  ];
  for (const [t, phase, iteration, time] of cases) {
    it(`t = ${t}s → ${phase}, iteration ${iteration}, time ${time}`, () => {
      const r = clipTime(c, t);
      assert.equal(r.phase, phase);
      assert.equal(r.iteration, iteration);
      near(r.time, time, `t=${t}`);
    });
  }
  it("reverse and alternate-reverse start from the end; infinite repeats never finish; zero-length clips sit at 0", () => {
    near(clipTime(clip({ direction: "reverse" }), 0.5).time, 1.5);
    near(clipTime(clip({ direction: "alternate-reverse", repeat: 1 }), 0.5).time, 1.5);
    near(clipTime(clip({ direction: "alternate-reverse", repeat: 1 }), 2.5).time, 0.5);
    const forever = clipTime(clip({ repeat: -1 }), 1001);
    assert.equal(forever.phase, "active");
    assert.equal(forever.iteration, 500);
    near(forever.time, 1);
    assert.deepEqual(clipTime(clip({ duration: 0 }), 3), { phase: "after", iteration: 0, time: 0 });
  });
});

describe("Phase 46 golden: nesting (offset, stretch, time remap)", () => {
  const child = { duration: 1.5 };
  const placement: NestedComposition = { id: "n", compositionId: "p", start: 2, in: 2, out: 6, stretch: 2 };
  it("maps parent time to child time through start and stretch, and stops at the child's end", () => {
    near(childTime(placement, child, 2), 0);
    near(childTime(placement, child, 4.9), 1.45);
    assert.equal(childTime(placement, child, 5), null, "(5 − 2) / 2 = 1.5 = the child's end");
    assert.equal(childTime(placement, child, 1.99), null, "before in");
    near(childTime(placement, { duration: 1.5, loop: true }, 5.5), 0.25, "a looping child wraps: 1.75 mod 1.5");
  });
  it("time remap: linear between keys, held keys step, clamped outside", () => {
    const remap = { keys: [{ time: 0, value: 0 }, { time: 1, value: 1.5, hold: true }, { time: 2, value: 0.2 }, { time: 3, value: 1.2 }] };
    near(remapTime(remap, -1), 0);
    near(remapTime(remap, 0.5), 0.75);
    near(remapTime(remap, 1.7), 1.5, "held");
    near(remapTime(remap, 2.5), 0.7);
    near(remapTime(remap, 9), 1.2);
    // The remap reads the placement's local (stretched) time.
    near(childTime({ ...placement, timeRemap: remap }, child, 3), 0.75, "local (3 − 2) / 2 = 0.5 → remapped 0.75");
  });
});

describe("Phase 46 golden: the 3-scene intro, end to end", () => {
  const doc = introSequence();
  const main = doc.compositions[MAIN_COMPOSITION_ID];
  const byName = (name: string) => Object.values(doc.clips).find((c) => c.name === name)!;

  it("each title plays at the start of its scene and is inactive outside its bar", () => {
    const t2 = byName("Title 2 in");
    assert.equal(clipTimeInComposition(main, t2, 1.99), null, "scene 2's bar starts at 2");
    near(clipTimeInComposition(main, t2, 2)!.time, 0);
    near(clipTimeInComposition(main, t2, 2.3)!.time, 0.3);
    assert.equal(clipTimeInComposition(main, t2, 2.9)!.phase, "after", "0.6 s in, then held");
    assert.equal(clipTimeInComposition(main, t2, 4), null, "scene 2's bar ends at 4 (exclusive)");
  });

  it("the nested logo reveal runs at 150% length inside scene 2", () => {
    const draw = byName("Draw logo");
    const at = (t: number) => {
      const [ct] = compositionTimes(doc.compositions, MAIN_COMPOSITION_ID, "comp_logo_reveal", t);
      return ct === undefined ? null : clipTimeInComposition(doc.compositions.comp_logo_reveal, draw, ct);
    };
    assert.deepEqual(compositionTimes(doc.compositions, MAIN_COMPOSITION_ID, "comp_logo_reveal", 2.1), [], "placed at 2.2");
    near(at(2.2)!.time, 0);
    near(at(2.95)!.time, 0.5, "(2.95 − 2.2) / 1.5");
    near(at(3.97)!.time, 1.18, "(3.97 − 2.2) / 1.5");
    assert.equal(at(4), null, "the placement's out is 4");
    assert.equal(draw.id in Object.fromEntries(main.clips.map((p) => [p.clipId, p])), false, "the draw clip lives in the precomp, not main");
  });
});

// ---------------------------------------------------------------------------
// Gate: expressible and valid
// ---------------------------------------------------------------------------

describe("Phase 46 gate: documents are expressible with compositions", () => {
  it("the 3-scene intro with a nested composition is valid", () => {
    const check = validateMotionDocument(introSequence());
    assert.ok(check.ok, check.ok ? "" : JSON.stringify(check.issues.slice(0, 5)));
  });

  for (const [name, build] of Object.entries(REFERENCE_EFFECTS)) {
    it(`${name}: valid, with every clip in a composition that fits its trigger`, () => {
      const doc = build();
      const check = validateMotionDocument(doc);
      assert.ok(check.ok, check.ok ? "" : JSON.stringify(check.issues.slice(0, 5)));
      for (const c of Object.values(doc.clips)) {
        const home = Object.values(doc.compositions).filter((comp) => comp.clips.some((p) => p.clipId === c.id));
        assert.equal(home.length, 1);
        if (c.trigger === "mount" || c.trigger === "time") assert.equal(home[0].id, MAIN_COMPOSITION_ID);
        else assert.equal(home[0].trigger?.on, c.trigger);
      }
    });
  }

  it("the triggered reference clips became interaction compositions with the web playback", () => {
    const hover = REFERENCE_EFFECTS["path morph icon"]().compositions;
    const morph = Object.values(hover).find((c) => c.kind === "interaction")!;
    assert.deepEqual(morph.trigger && { on: morph.trigger.on, playback: morph.trigger.playback }, { on: "hover", playback: "play-reverse" });
    const scroll = Object.values(REFERENCE_EFFECTS["scroll-parallax image"]().compositions).find((c) => c.kind === "interaction")!;
    assert.equal(scroll.trigger?.playback, "scrub", "scrollTrigger.scrub → scrub");
  });
});

// ---------------------------------------------------------------------------
// Validation refuses planted mistakes
// ---------------------------------------------------------------------------

function refuses(plant: (doc: MotionDocument) => void, message: RegExp) {
  const doc = introSequence();
  assert.ok(validateMotionDocument(doc).ok);
  plant(doc);
  const check = validateMotionDocument(doc);
  assert.equal(check.ok, false, `expected a refusal matching ${message}`);
  if (!check.ok) assert.ok(check.issues.some((i) => message.test(i.message)), `${message} not in ${JSON.stringify(check.issues.map((i) => i.message))}`);
}

describe("Phase 46: validation refuses planted mistakes", () => {
  const main = (d: MotionDocument) => d.compositions[MAIN_COMPOSITION_ID];
  it("placements", () => {
    refuses((d) => (main(d).clips = []), /isn't placed in any composition/);
    refuses((d) => d.compositions.comp_logo_reveal.clips.push({ ...main(d).clips[0] }), /is placed in 2 compositions/);
    refuses((d) => main(d).clips.push({ clipId: "clip_missing", offset: 0 }), /Clip "clip_missing" does not exist/);
    refuses((d) => {
      const custom = Object.values(d.clips).find((c) => c.trigger === "custom")!;
      const home = Object.values(d.compositions).find((c) => c.clips.some((p) => p.clipId === custom.id))!;
      home.clips = [];
      main(d).clips.push({ clipId: custom.id, offset: 0 });
    }, /doesn't belong in the main composition/);
  });
  it("compositions", () => {
    refuses((d) => delete d.compositions[MAIN_COMPOSITION_ID], /Every document has a main composition/);
    refuses((d) => (main(d).workArea = { start: 1, end: 9 }), /can't go past the composition's end/);
    refuses((d) => (main(d).workArea = { start: 3, end: 3 }), /must end after it starts/);
    refuses((d) => main(d).markers.push({ id: "mk_late", time: 7, label: "Late" }), /after the composition's end/);
    refuses((d) => (Object.values(main(d).layers)[0].out = 0), /out point must be after its in point/);
    refuses((d) => (main(d).layers.lay_missing = { start: 0, in: 0, out: 1, stretch: 1 }), /Layer "lay_missing" does not exist/);
    refuses((d) => (main(d).fps = 0), /Too small|greater than or equal/);
    refuses((d) => ((main(d) as Record<string, unknown>).speed = 2), /speed|Unrecognized/);
  });
  it("nesting", () => {
    refuses((d) => (main(d).nested[0].compositionId = "comp_nowhere"), /Composition "comp_nowhere" does not exist/);
    refuses((d) => d.compositions.comp_logo_reveal.nested.push({ id: "n_self", compositionId: "comp_logo_reveal", start: 0, in: 0, out: 1, stretch: 1 }), /form a loop/);
    refuses((d) => d.compositions.comp_logo_reveal.nested.push({ id: "n_main", compositionId: MAIN_COMPOSITION_ID, start: 0, in: 0, out: 1, stretch: 1 }), /Only precomps can be nested/);
    refuses((d) => (main(d).nested[0].timeRemap = { keys: [{ time: 1, value: 0 }, { time: 1, value: 1 }] }), /strictly increase/);
  });
});

// ---------------------------------------------------------------------------
// Keeping compositions in step (store boundary) and migration
// ---------------------------------------------------------------------------

describe("Phase 46: syncCompositions", () => {
  it("is idempotent: a second run on a synced document writes nothing (no empty undo steps)", () => {
    const doc = introSequence();
    const [, patches] = produceWithPatches(doc, (d) => syncCompositions(d));
    assert.deepEqual(patches, []);
  });

  it("places a clip the legacy editor adds, follows a trigger change, and cleans up after deletes", () => {
    const doc = introSequence();
    const badge = Object.values(doc.layers).find((l) => l.name === "New badge")!;
    doc.clips.clip_hover = clip({ id: "clip_hover", layerId: badge.id, trigger: "hover", type: "hover" });
    syncCompositions(doc);
    assert.equal(doc.compositions.comp_clip_hover.trigger?.on, "hover");
    assert.equal(validateMotionDocument(doc).ok, true);

    doc.clips.clip_hover.trigger = "press";
    syncCompositions(doc);
    assert.deepEqual(doc.compositions.comp_clip_hover.trigger, { on: "press", layerId: badge.id, playback: "restart" });
    assert.equal(validateMotionDocument(doc).ok, true);

    doc.clips.clip_hover.trigger = "mount";
    syncCompositions(doc);
    assert.equal(doc.compositions.comp_clip_hover, undefined, "the emptied interaction composition is removed");
    assert.ok(doc.compositions[MAIN_COMPOSITION_ID].clips.some((p) => p.clipId === "clip_hover"));

    delete doc.clips.clip_hover;
    syncCompositions(doc);
    assert.ok(!doc.compositions[MAIN_COMPOSITION_ID].clips.some((p) => p.clipId === "clip_hover"));
    assert.equal(validateMotionDocument(doc).ok, true);
  });

  it("grows a composition to fit a longer clip, and the work area follows when it spanned to the end", () => {
    const doc = introSequence();
    const title = Object.values(doc.clips).find((c) => c.name === "Title 3 in")!;
    title.duration = 3; // scene 3 starts at 4 → needs 7 s
    title.tracks = title.tracks.map((t) => ({ ...t, keyframes: t.keyframes.map((k) => ({ ...k, time: Math.min(k.time, 3) })) }));
    syncCompositions(doc);
    assert.equal(doc.compositions[MAIN_COMPOSITION_ID].duration, 7);
    assert.deepEqual(doc.compositions[MAIN_COMPOSITION_ID].workArea, { start: 0, end: 7 });
  });
});

describe("Phase 46: migration v4 → v5", () => {
  it("the real v4 demo export migrates with nothing else changed", () => {
    const file = JSON.parse(readFileSync("tests/e2e/fixtures/showcase-v4.lazy.json", "utf8"));
    const v4 = file.snapshot.document;
    const v5 = loadDocument({ document: structuredClone(v4) });
    assert.equal(v5.schemaVersion, 5);
    assert.ok(v5.compositions[MAIN_COMPOSITION_ID]);
    const { compositions: _c, schemaVersion: _s, ...rest } = v5;
    const { schemaVersion: _s4, ...restV4 } = v4;
    void _c;
    void _s;
    void _s4;
    assert.deepEqual(rest, restV4, "every v4 entity is kept exactly");
  });

  it("every preset clip lands in the composition its trigger implies, and each placement is reported", () => {
    const doc = introSequence() as unknown as Record<string, unknown> & MotionDocument;
    const layer = Object.values(doc.layers).find((l) => l.name === "Logo mark")!;
    const clips = ALL_PRESETS.filter((p) => p.compatibleArchetypes.includes(layer.archetype)).map((p, i) => attachClip({ ...hydrateClip(p.animation), id: `clip_p${i}` }, layer.id));
    const v4: Record<string, unknown> = { ...structuredClone(doc), schemaVersion: 4, clips: Object.fromEntries(clips.map((c) => [c.id, c])) };
    delete v4.compositions;
    const { document, report } = migrateV4ToV5(v4);
    const check = validateMotionDocument(document);
    assert.ok(check.ok, check.ok ? "" : JSON.stringify(check.issues.slice(0, 3)));
    assert.equal(report.length, clips.length);
    for (const c of clips) {
      const home = Object.values(document.compositions).find((comp) => comp.clips.some((p) => p.clipId === c.id))!;
      assert.ok(c.trigger === "mount" || c.trigger === "time" ? home.kind === "main" : home.trigger?.on === c.trigger, `${c.id} (${c.trigger}) in ${home.id}`);
    }
  });
});
