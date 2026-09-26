/**
 * Phase 7 model tests: the easing grammar, the binding text form, and — by
 * planting one mistake at a time into the gate's reference documents — that
 * validation really refuses what the model says is invalid (so the gate's
 * "valid" means something).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { getMotionDocumentJsonSchema, validateMotionDocument, type MotionDocument } from "../schema";
import { isEasing, parseEasing } from "../motion";
import { BindingSyntaxError, formatBinding, parseBinding } from "../signals";
import { PROPERTY_REGISTRY } from "../properties";
import { ARCHETYPE_REGISTRY, getDefaultProps } from "../registry";
import { EffectDefinitionSchema } from "../effect-definition";
import { loadDocument, migrateV3ToV4, migrateV4ToV5, removeLayerDependents } from "../migrations";
import { behaviourToBindings } from "../behaviour-presets";
import {
  AURORA_VEIL,
  clickSpark,
  ctaIntensifiesBackground,
  cursorReactiveBackground,
  dockMagnification,
  magnetButton,
  referenceBuildBlueprint,
  referenceBuildEffectors,
  splitTextReveal,
  stateMachineToggle,
  strokeDrawLogo,
} from "./fixtures/reference-effects";

// ---------------------------------------------------------------------------
// Easing grammar (7.2)
// ---------------------------------------------------------------------------

describe("Phase 7.2: easing grammar", () => {
  it("accepts every easing the codebase already uses", () => {
    const found = new Set<string>();
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
          if (entry !== "node_modules" && entry !== "__tests__") walk(path);
        } else if (/\.tsx?$/.test(entry)) {
          for (const m of readFileSync(path, "utf8").matchAll(/\b(?:easing|ease):\s*"([^"$\\]+)"/g)) found.add(m[1]);
        }
      }
    };
    walk(join(process.cwd(), "src"));
    assert.ok(found.size > 20, `found ${found.size} easings`);
    for (const e of found) assert.ok(isEasing(e), `"${e}" should parse`);
  });

  it("parses the families into structure", () => {
    assert.deepEqual(parseEasing("back.out(1.7)"), { kind: "named", family: "back", direction: "out", params: [1.7] });
    assert.deepEqual(parseEasing("power2"), { kind: "named", family: "power2", direction: "out", params: [] });
    assert.deepEqual(parseEasing("cubic-bezier(0.16, 1, 0.3, 1)"), { kind: "cubicBezier", x1: 0.16, y1: 1, x2: 0.3, y2: 1 });
    assert.deepEqual(parseEasing("steps(4, jump-start)"), { kind: "steps", count: 4, position: "start" });
    assert.deepEqual(parseEasing("spring(bounce: 0.3, time: 0.6)"), { kind: "spring", spring: { bounce: 0.3, time: 0.6 } });
    assert.deepEqual(parseEasing("spring(stiffness: 300, damping: 20)"), { kind: "spring", spring: { stiffness: 300, damping: 20 } });
  });

  it("rejects what isn't an easing", () => {
    for (const bad of ["", "bouncy", "power9.out", "power2.sideways", "sine.inOut(2)", "cubic-bezier(1.5, 0, 0, 1)", "steps(0)", "steps(1, jump-none)", "spring(bounce: 2, time: 1)", "spring(stiffness: 1, colour: 2)", "back.out(1, 2)"]) {
      assert.equal(isEasing(bad), false, `"${bad}"`);
    }
  });
});

// ---------------------------------------------------------------------------
// Binding text form (7.5)
// ---------------------------------------------------------------------------

describe("Phase 7.5: binding text form", () => {
  const SPEC_EXAMPLES = [
    // engine spec §3.3, §9, §12
    "pointer.uv(local) |> smooth(0.12) -> bg.uniform.uFocus",
    "proximity(cta) |> falloff(smoothstep, 260) |> spring(120, 16) -> bg.uniform.uIntensity blend add",
    "pointer.ndc(local) |> spring(200, 20) |> remap(-1, 1, -10, 10) -> cta.transform.x blend add when state(Hover)",
    "scroll.progress |> remap(0, 0.4, 1, 0, clamp) -> bg.appearance.opacity blend multiply",
    "pointer.speed |> threshold(1200, 600) |> edge(rise) -> event(Shockwave)",
    "pointer.inside(parent) |> smooth(0.3) |> mul(0.6) -> veil.uniform.uWarp",
    "hover(card) |> spring(170, 22) -> img.uniform.uAmount",
    "pointer.velocity |> clamp(-4000, 4000) -> cursor.param.splatForce",
    "scroll.velocity |> abs |> smooth(0.2) -> S.param.scatter",
    "pointer.uv(page) |> trail(24) -> S.param.trail",
    "pointer.px(frame) |> spring(300, 28) -> CursorCircle.position(bottomCentre)",
    // additions (decision 0004)
    "0 |> spring(bounce: 0.3, time: 0.6) -> tag:letter.transform.x",
    'hover(self) |> curve(back.out(1.7)) -> "Split letters"[*].transform.scale blend multiply when pointer.coarse = false and view(self).progress > 0.2 or breakpoint != mobile @ 2',
    "time |> sampleHold(pointer.down) |> mix(scroll.progress, 0.5) |> select(time, seed) -> self.cssvar.glow-amount",
    "pointer.px(frame) |> distance(proximity(cta, center)) |> falloff(inverse-square, 80) -> self.position(center, x)",
  ];

  it("parses every spec example and round-trips it", () => {
    for (const text of SPEC_EXAMPLES) {
      const parsed = parseBinding(text);
      assert.deepEqual(parseBinding(formatBinding(parsed)), parsed, text);
    }
  });

  it("formats to the canonical text", () => {
    assert.equal(formatBinding(parseBinding("pointer.uv( local )|>smooth(0.12)->bg.uniform.uFocus")), "pointer.uv(local) |> smooth(0.12) -> bg.uniform.uFocus");
  });

  it("reports readable syntax errors", () => {
    const cases: [string, RegExp][] = [
      ["pointer.wobble -> a.transform.x", /Unknown pointer channel "wobble"/],
      ["pointer.x |> smoosh(1) -> a.transform.x", /Unknown operator "smoosh"/],
      ["pointer.x |> smooth(1, 2) -> a.transform.x", /smooth takes 1 argument/],
      ["pointer.x -> a.transform.x blend sideways", /Unknown blend "sideways"/],
      ["pointer.x |> clamp(5, 1) -> a.transform.x", /clamp needs min ≤ max/],
      ["pointer.x |> threshold(1, 5) -> a.transform.x", /hysteresis/],
      ["pointer.x a.transform.x", /Expected "->"/],
      ["pointer.uv(everywhere) -> a.uniform.u", /Unknown space "everywhere"/],
      ["pointer.x -> a.transform.x extra", /Unexpected "extra"/],
    ];
    for (const [text, message] of cases) assert.throws(() => parseBinding(text), (e: unknown) => e instanceof BindingSyntaxError && message.test(e.message), text);
  });
});

// ---------------------------------------------------------------------------
// Validation refuses planted mistakes
// ---------------------------------------------------------------------------

function refuses(build: () => MotionDocument, plant: (doc: MotionDocument) => void, message: RegExp) {
  const doc = build();
  assert.ok(validateMotionDocument(doc).ok, "the unmodified document is valid");
  plant(doc);
  const check = validateMotionDocument(doc);
  assert.equal(check.ok, false, `expected a refusal matching ${message}`);
  if (!check.ok) assert.ok(check.issues.some((i) => message.test(i.message)), `${message} not in ${JSON.stringify(check.issues.map((i) => i.message))}`);
}

const byName = (doc: MotionDocument, name: string) => Object.values(doc.layers).find((l) => l.name === name)!;
const first = <T>(record: Record<string, T>, pick: (v: T) => boolean = () => true) => Object.values(record).find(pick)!;

describe("Phase 7: validation refuses planted mistakes", () => {
  it("time primitives (7.2)", () => {
    refuses(strokeDrawLogo, (d) => first(d.clips).tracks[0].keyframes.reverse(), /sorted by time/);
    refuses(strokeDrawLogo, (d) => (first(d.clips).tracks[0].keyframes[1].time = 9), /after the clip's 1.6s duration/);
    refuses(strokeDrawLogo, (d) => (first(d.clips).tracks[0].keyframes[1].value = "zero"), /not a valid number/);
    refuses(strokeDrawLogo, (d) => (first(d.clips).easing = "wobbly"), /Not an easing/);
    refuses(strokeDrawLogo, (d) => (first(d.clips).tracks[0].property = "content.label"), /not a property of svgPath/);
    refuses(splitTextReveal, (d) => (first(d.clips).stagger = { each: 0.1, amount: 1, from: "start" }), /exactly one of `each` or `amount`/);
    refuses(splitTextReveal, (d) => (first(d.clips).stagger = { each: 0.1, from: [0, 1, 1] }), /lists a target twice/);
    refuses(splitTextReveal, (d) => (first(d.clips).stagger = { each: 0.1, from: "start", targets: { tag: "nothing" } }), /No layer has the tag "nothing"/);
    refuses(strokeDrawLogo, (d) => (d.sequences.seq_1 = { id: "seq_1", name: "Intro", items: [{ id: "i1", clipId: "clip_missing", offset: 0 }] }), /Clip "clip_missing" does not exist/);
    // v2-era entities (clips, layers, states) drop unknown keys instead of keeping them.
    const withExtra = strokeDrawLogo();
    (first(withExtra.clips) as Record<string, unknown>).bogus = 1;
    const parsed = validateMotionDocument(withExtra);
    assert.ok(parsed.ok && !("bogus" in first(parsed.document.clips)), "unknown clip keys are not kept");
    // Phase 7 entities are strict: an unknown key is an error.
    refuses(stateMachineToggle, (d) => ((first(d.transitions) as Record<string, unknown>).bogus = 1), /bogus|Unrecognized/);
  });

  it("states, transitions and behaviours (7.3)", () => {
    refuses(stateMachineToggle, (d) => (first(d.transitions).to = "state_missing"), /State "state_missing" does not exist/);
    refuses(stateMachineToggle, (d) => (first(d.states).props["toggle.checked"] = "yes"), /not a valid boolean/);
    refuses(stateMachineToggle, (d) => (first(d.transitions).motion = { type: "spring", spring: { bounce: 3, time: 1 } }), /Too big|less than or equal/);
    refuses(magnetButton, (d) => ((first(d.behaviours).params as Record<string, unknown>).maxOffset = 400), /Too big|less than or equal/);
    refuses(magnetButton, (d) => ((first(d.behaviours).params as Record<string, unknown>).gravity = 1), /gravity|Unrecognized/);
    refuses(
      magnetButton,
      (d) => {
        const button = byName(d, "CTA");
        d.behaviours.beh_u = { id: "beh_u", layerId: button.id, type: "shader-uniform", enabled: true, params: { uniform: "uTime", source: "time", scale: 1, offset: 0 } };
      },
      /has no surface to drive a uniform on/
    );
  });

  it("bindings (7.5)", () => {
    refuses(cursorReactiveBackground, (d) => (first(d.bindings).target = { kind: "property", on: { kind: "layer", ref: "self" }, path: "frame.width" }), /\[SIG_LAYOUT\]/);
    refuses(cursorReactiveBackground, (d) => (first(d.bindings).target = { kind: "uniform", on: { kind: "layer", ref: "self" }, name: "uNothing" }), /declares no uniform "uNothing"/);
    refuses(cursorReactiveBackground, (d) => (first(d.bindings).expr.signal = { kind: "proximity", layer: "lay_missing" }), /Layer "lay_missing" does not exist/);
    refuses(dockMagnification, (d) => (first(d.bindings).target = { kind: "property", on: { kind: "tag", tag: "nope" }, path: "transform.scale" }), /No layer has the tag "nope"/);
    refuses(dockMagnification, (d) => (first(d.bindings).target = { kind: "property", on: { kind: "group", ref: "self" }, path: "transform.scale" }), /not a Split or Clone group/);
    refuses(ctaIntensifiesBackground, (d) => (first(d.bindings, (b) => b.guard !== undefined).guard = { conditions: [{ kind: "state", name: "Dizzy" }], joins: [] }), /has no state "Dizzy"/);
    refuses(ctaIntensifiesBackground, (d) => (first(d.bindings).expr.signal = { kind: "var", name: "hits" }), /No graph declares the variable "hits"/);
    refuses(cursorReactiveBackground, (d) => (first(d.bindings).target = { kind: "position", on: { kind: "layer", ref: "self" }, pin: "elbow" }), /has no pin "elbow"/);
    refuses(
      cursorReactiveBackground,
      (d) => (first(d.bindings).target = { kind: "property", on: { kind: "layer", ref: "self" }, path: "appearance.pointerEvents" }),
      /can't be animated|\[SIG_LAYOUT\]/
    );
  });

  it("surfaces, tapes and effect instances (7.4, 7.5)", () => {
    refuses(cursorReactiveBackground, (d) => (first(d.surfaces).fallback = ["webgl2", "canvas2d"]), /must end in `poster`/);
    refuses(cursorReactiveBackground, (d) => (first(d.surfaces).fallback = ["poster", "webgl2", "poster"]), /can only be the last step/);
    refuses(cursorReactiveBackground, (d) => (first(d.surfaces).layerId = byName(d, "Hero").id), /drawn by effectSurface layers|already has a surface|can't be a top-level layer/);
    refuses(cursorReactiveBackground, (d) => ((first(d.surfaces).policies as Record<string, unknown>).touch = undefined), /touch|Invalid/);
    refuses(cursorReactiveBackground, (d) => (first(d.inputTapes).seed = undefined), /autopilot tape needs a seed/);
    refuses(
      referenceBuildBlueprint,
      (d) => {
        const ch = first(d.inputTapes).channels[0];
        ch.samples[2].t = 0.2;
      },
      /strictly increase/
    );
  });

  it("interaction graphs (7.5)", () => {
    refuses(clickSpark, (d) => (first(d.graphs).nodes[0].type = "Clack"), /Invalid option/);
    refuses(clickSpark, (d) => (first(d.graphs).nodes[0].type = "Burst"), /Invalid option/); // an action type on an event node
    refuses(clickSpark, (d) => (first(d.graphs).nodes[1].params.layer = "fx_missing"), /Layer "fx_missing" does not exist/);
    refuses(ctaIntensifiesBackground, (d) => first(d.graphs).wires.push({ id: "w_dup", from: { node: "n_click", pin: "then" }, to: { node: "n_wait", pin: "exec" } }), /more than one wire; use a Sequence/);
    refuses(referenceBuildBlueprint, (d) => first(d.graphs).wires.push({ id: "w_bad", from: { node: "n_stay", pin: "then" }, to: { node: "n_spin", pin: "degrees" } }), /connects an exec pin to a data pin/);
    refuses(referenceBuildBlueprint, (d) => first(d.graphs).wires.push({ id: "w_type", from: { node: "n_stay", pin: "other" }, to: { node: "n_times", pin: "b" } }), /connects layer to number/);
    refuses(referenceBuildBlueprint, (d) => first(d.graphs).wires.push({ id: "w_cyc", from: { node: "n_times", pin: "result" }, to: { node: "n_random", pin: "of" } }), /connects number to layer|cycle/);
    refuses(clickSpark, (d) => (first(d.graphs).nodes[0] = { ...first(d.graphs).nodes[0], type: "Custom", params: { name: "Boom" } }), /Custom event "Boom" is not declared/);
  });

  it("kinetic composition (7.5 v3.2)", () => {
    refuses(referenceBuildEffectors, (d) => (first(d.components, (c) => c.type === "follow") as { pin: string }).pin = "nose", /has no pin "nose"/);
    refuses(referenceBuildEffectors, (d) => (d.components = Object.fromEntries(Object.entries(d.components).filter(([, c]) => c.type !== "field"))), /needs a field on the same layer/);
    refuses(referenceBuildEffectors, (d) => (byName(d, "LAZYLAYOUT").properties["content.text"] = "LAZY"), /don't spell the source text/);
    refuses(referenceBuildEffectors, (d) => first(d.generators).pieces.reverse(), /exactly its pieces, in order|indices run/);
    refuses(referenceBuildEffectors, (d) => (byName(d, "Cursor Circle").properties["render.role"] = "ghost"), /render.role must be one of content, helper/);
    refuses(
      referenceBuildEffectors,
      (d) => {
        const circle = byName(d, "Cursor Circle");
        d.components.cmp_dup = { ...(first(d.components, (c) => c.type === "field") as object), id: "cmp_dup", layerId: circle.id } as never;
      },
      /already has a field/
    );
    refuses(referenceBuildEffectors, (d) => (byName(d, "Cursor Circle").pins = { center: { x: 0, y: 0, unit: "px" } }), /can't reuse a preset pin name/);
    refuses(
      magnetButton,
      (d) => {
        const hero = byName(d, "Hero");
        const input = "inp_00000099";
        d.layers[input] = { id: input, name: "Email", archetype: "input", parentId: hero.id, children: [], properties: getDefaultProps("input") };
        hero.children.push(input);
        d.components.cmp_b = { id: "cmp_b", layerId: input, type: "body", enabled: true, body: "dynamic", mass: 1, damping: 0, bounciness: 0, friction: 0, gravityScale: 1, rotation: false, sleep: true };
      },
      /can't be dynamic bodies/
    );
  });

  it("shapes and ranges (7.1, 7.6)", () => {
    refuses(referenceBuildEffectors, (d) => (byName(d, "Cursor Circle").properties["shape.sides"] = 6), /not a property of ellipse/);
    refuses(
      strokeDrawLogo,
      (d) => {
        const hero = byName(d, "Hero");
        d.layers.star_1 = { id: "star_1", name: "Star", archetype: "star", parentId: hero.id, children: [], properties: { ...getDefaultProps("star"), "shape.points": 2.5 } };
        hero.children.push("star_1");
      },
      /must be a whole number/
    );
  });
});

// ---------------------------------------------------------------------------
// Registry metadata (7.1) and shapes (7.6)
// ---------------------------------------------------------------------------

describe("Phase 7.1 / 7.6: registry", () => {
  it("every path declares an interpolation that fits its value type, and discrete keyframeable paths hold", () => {
    for (const def of Object.values(PROPERTY_REGISTRY)) {
      assert.ok(def.interpolation, def.path);
      if (["string", "enum", "boolean", "object"].includes(def.valueType)) assert.equal(def.interpolation, "discrete", def.path);
    }
    for (const path of ["media.src", "media.objectFit", "background.blendMode"]) {
      assert.equal(PROPERTY_REGISTRY[path].animatable, true, `${path} is keyframeable (CONVENTIONS §4)`);
      assert.equal(PROPERTY_REGISTRY[path].interpolation, "discrete");
    }
    assert.equal(PROPERTY_REGISTRY["scene3d.rotation"].interpolation, "slerp");
    assert.equal(PROPERTY_REGISTRY["svg.path"].interpolation, "path");
  });

  it("the six shapes are SVG-grammar vector archetypes with fill, stroke, dash and their own parameters", () => {
    const own = { rectangle: "shape.cornerRadius", ellipse: null, line: "shape.endCap", polygon: "shape.sides", star: "shape.innerRadius", arrow: "shape.headLength" } as const;
    for (const [shape, param] of Object.entries(own)) {
      const entry = ARCHETYPE_REGISTRY[shape as keyof typeof own];
      assert.equal(entry.kind, "vector");
      assert.equal(entry.grammarType, "SVG", "grammar 3.E.2");
      for (const path of ["svg.fill", "svg.stroke", "svg.strokeWidth", "svg.strokeDasharray", "svg.strokeDashoffset"]) assert.ok(PROPERTY_REGISTRY[path].archetypes.includes(entry.id), `${path} on ${shape}`);
      if (param) assert.ok(PROPERTY_REGISTRY[param].archetypes.includes(entry.id), `${param} on ${shape}`);
    }
  });
});

// ---------------------------------------------------------------------------
// Behaviours as binding presets (7.5)
// ---------------------------------------------------------------------------

describe("Phase 7.5: behaviours are binding presets", () => {
  it("every behaviour type expands to something in the one reactive model", () => {
    const expansions = {
      "follow-pointer": behaviourToBindings({ id: "b", layerId: "l", type: "follow-pointer", enabled: true, params: { space: "parent", lag: { type: "smooth", time: 0.2 }, axis: "x", touch: "while-pressed", reducedMotion: "snap" } }),
      noise: behaviourToBindings({ id: "b", layerId: "l", type: "noise", enabled: true, params: { targets: [{ property: "transform.y", amplitude: 4 }, { property: "transform.rotate", amplitude: 2 }], frequency: 1, seed: 3 } }),
      loop: behaviourToBindings({ id: "b", layerId: "l", type: "loop", enabled: true, params: { property: "transform.y", from: 0, to: -8, duration: 2, easing: "sine.inOut", yoyo: true } }),
      inertia: behaviourToBindings({ id: "b", layerId: "l", type: "inertia", enabled: true, params: { axis: "both", decay: 0.8, bounds: "parent" } }),
    };
    assert.equal(formatBinding(expansions["follow-pointer"].bindings[0]), "pointer.px(parent) |> smooth(0.2) -> self.position(center, x)");
    assert.equal(expansions.noise.bindings.length, 2);
    assert.equal(expansions.loop.clips[0].direction, "alternate");
    assert.equal(expansions.inertia.components[0].type, "body");
  });
});

// ---------------------------------------------------------------------------
// v3 → v4 migration and cascades
// ---------------------------------------------------------------------------

describe("Phase 7: schema v4 migration", () => {
  const v3 = () => {
    const doc = strokeDrawLogo() as unknown as Record<string, unknown>;
    for (const key of ["sequences", "transitions", "bindings", "surfaces", "inputTapes", "graphs", "effects", "components", "generators", "compositions"]) delete doc[key];
    doc.schemaVersion = 3;
    const clip = Object.values(doc.clips as Record<string, { easing: string; tracks: { keyframes: { id: string; time: number; value: number; ease?: string }[] }[] }>)[0];
    clip.easing = "springy";
    clip.tracks[0].keyframes = [
      { id: "b", time: 1.6, value: "0px" as unknown as number, ease: "custom-thing" },
      { id: "a", time: 0, value: 320 },
      { id: "c", time: 2.4, value: "default" as unknown as number },
    ];
    const layerId = Object.keys(doc.layers as object)[1];
    doc.behaviours = { beh_1: { id: "beh_1", layerId, type: "magnet", enabled: true, params: { strength: 10, colour: "red" } } };
    return doc;
  };

  it("adds the Phase 7 collections, types behaviour params and repairs clip timing, reporting each change", () => {
    const { document: v4, report } = migrateV3ToV4(v3());
    assert.equal(v4.schemaVersion, 4);
    const document = migrateV4ToV5(v4).document; // v5 only adds compositions (Phase 46)
    assert.deepEqual(document.bindings, {});
    const check = validateMotionDocument(document);
    assert.ok(check.ok, check.ok ? "" : JSON.stringify(check.issues));
    const behaviour = document.behaviours.beh_1;
    assert.ok(behaviour.type === "magnet");
    assert.equal(behaviour.params.maxOffset, 10, "v3 `strength` is v4 `maxOffset`");
    const clip = Object.values(document.clips)[0];
    assert.equal(clip.easing, "power1.out");
    assert.deepEqual(clip.tracks[0].keyframes.map((k) => k.id), ["a", "b", "c"]);
    assert.equal(clip.tracks[0].keyframes[1].ease, undefined);
    assert.deepEqual(clip.tracks[0].keyframes.map((k) => k.value), [320, 0, 0], `"0px" → 0; "default" → the property default`);
    assert.equal(clip.duration, 2.4, "extended to cover the last keyframe");
    for (const expected of [/"colour" is not a magnet parameter/, /Unknown easing "springy"/, /Unknown easing "custom-thing"/, /"0px" is not a number; stored as 0/, /Extended from 1.6s to 2.4s/]) {
      assert.ok(report.some((r) => expected.test(r.message)), String(expected));
    }
  });

  it("loadDocument reads v3 data", () => {
    const loaded = loadDocument({ document: v3() });
    assert.equal(loaded.schemaVersion, 5);
  });

  it("removing a layer removes what depends on it, and a Split group that loses a piece is detached", () => {
    const doc = referenceBuildBlueprint();
    const piece = byName(doc, "LAZYLAYOUT letters L 0");
    const group = doc.layers[piece.parentId!];
    group.children = group.children.filter((c) => c !== piece.id);
    delete doc.layers[piece.id];
    removeLayerDependents(doc, new Set([piece.id]));
    const split = first(doc.generators);
    assert.equal(split.kind === "split" && split.detached, true);
    assert.deepEqual(split.pieces.map((p) => p.index), [...Array(9).keys()]);
    assert.ok(!Object.values(doc.components).some((c) => c.layerId === piece.id));
    const check = validateMotionDocument(doc);
    assert.ok(check.ok, check.ok ? "" : JSON.stringify(check.issues.slice(0, 3)));

    const circle = byName(doc, "Cursor Circle");
    removeLayerDependents(doc, new Set([circle.id]));
    assert.equal(Object.values(doc.components).filter((c) => c.layerId === circle.id).length, 0);
    assert.equal(first(doc.graphs).ownerLayerId, null);
  });
});

// ---------------------------------------------------------------------------
// Effect definitions (7.4) and JSON Schema
// ---------------------------------------------------------------------------

describe("Phase 7.4: effect definition format", () => {
  const refusesDef = (plant: (d: Record<string, unknown>) => void, message: RegExp) => {
    const def = structuredClone(AURORA_VEIL) as unknown as Record<string, unknown>;
    plant(def);
    const r = EffectDefinitionSchema.safeParse(def);
    assert.equal(r.success, false);
    if (!r.success) assert.ok(r.error.issues.some((i) => message.test(i.message)), `${message} not in ${JSON.stringify(r.error.issues.map((i) => i.message))}`);
  };
  it("refuses definitions that break the contract", () => {
    refusesDef((d) => ((d.props as Record<string, Record<string, unknown>>).speed.description = ""), /Too small|at least/);
    refusesDef((d) => ((d.props as Record<string, Record<string, unknown>>).speed.default = 9), /at most 2/);
    refusesDef((d) => ((d.states as Record<string, Record<string, unknown>>).Calm.wobble = 1), /"wobble" is not a prop/);
    refusesDef((d) => ((d.defaultBindings as Record<string, string>).focus = "pointer.uv(local) -> "), /Expected a name/);
    refusesDef((d) => ((d.surfaces as { fallback: string[] }[])[0].fallback = ["webgl2"]), /must end in `poster`/);
    refusesDef((d) => (d.version = "1.0"), /semver/);
    refusesDef((d) => {
      const props = d.props as Record<string, Record<string, unknown>>;
      for (let i = 0; i < 6; i++) props[`extra${i}`] = { type: "number", default: 0, description: "An extra knob", simple: true };
    }, /At most 7 props can be Simple/);
    refusesDef((d) => ((d.template as { rootLayerId: string }).rootLayerId = "nowhere"), /not in the template/);
  });
});

describe("Phase 7: JSON Schema", () => {
  it("describes the Phase 7 collections", () => {
    const schema = getMotionDocumentJsonSchema();
    const required = schema.required as string[];
    for (const key of ["sequences", "transitions", "bindings", "surfaces", "inputTapes", "graphs", "effects", "components", "generators"]) assert.ok(required.includes(key), key);
    const text = JSON.stringify(schema);
    for (const word of ["pointerIn", "keepOut", "OverlapStay", "springLattice", "effectSurface", "bottomCentre"]) assert.ok(text.includes(word), word);
  });
});
