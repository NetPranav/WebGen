/**
 * ROADMAP Phase 7 Verification Gate: the reference effects, each expressed as a
 * Motion Document with no escape hatches (no `generic` layers, no code or
 * free-form blobs, every binding and rule in the typed model).
 *
 * The 12 effects of the v2 gate, the 4 interactive effects of the v3.0
 * amendment, and the reference build of the v3.2 amendment (engine spec §12.7)
 * in both of the forms the spec gives: the effector form and the Blueprint /
 * physics form. The review checklist that maps each one to its primitives is
 * DOCS/Initial/audit/phase7-gate-checklist.md.
 */

import type { MotionDocument } from "../../schema";
import type { EffectDefinition } from "../../effect-definition";
import { DocBuilder, actionNode, eventNode, layerIn, layerOut, numberIn, numberOut, rule, wire } from "./builder";

const gentle = { bounce: 0.2, time: 0.5 };

/** A top-level 1440×900 frame, the usual host. */
function hero(b: DocBuilder, name = "Hero"): string {
  return b.layer("container", name, null, { "frame.width": 1440, "frame.height": 900, "appearance.background.color": "#0b1020" });
}

// ---------------------------------------------------------------------------
// The 12 (v2 gate)
// ---------------------------------------------------------------------------

/** 1. Split-text reveal: letters rise and unblur one after another. */
export function splitTextReveal(): MotionDocument {
  const b = new DocBuilder();
  const frame = hero(b);
  const text = b.layer("text", "Headline", frame, { "content.text": "Make it move", "typography.fontSize": 72 });
  const { groupId } = b.splitLetters(text, "Headline letters");
  b.clip(groupId, {
    name: "Reveal",
    type: "entrance",
    trigger: "mount",
    duration: 0.8,
    easing: "power3.out",
    stagger: { each: 0.035, from: "start", targets: "children" },
    tracks: [
      { id: "trk_y", property: "transform.y", keyframes: [{ id: "k1", time: 0, value: 32 }, { id: "k2", time: 0.8, value: 0, ease: "power3.out" }] },
      { id: "trk_o", property: "appearance.opacity", keyframes: [{ id: "k3", time: 0, value: 0 }, { id: "k4", time: 0.5, value: 1 }] },
      { id: "trk_b", property: "filter.blur", keyframes: [{ id: "k5", time: 0, value: 8 }, { id: "k6", time: 0.6, value: 0 }] },
    ],
  });
  return b.build();
}

/** 2. Magnet button: pulled toward the cursor while hovered, capped at 12 px. */
export function magnetButton(): MotionDocument {
  const b = new DocBuilder();
  const frame = hero(b);
  const button = b.layer("button", "CTA", frame, { "content.label": "Get started" });
  b.behaviour(button, {
    type: "magnet",
    enabled: true,
    params: { radius: 140, maxOffset: 12, spring: { bounce: 0.3, time: 0.4 }, whileHovered: true, touch: "static" },
  });
  return b.build();
}

/** 3. 3D tilt card with glare. */
export function tiltCard(): MotionDocument {
  const b = new DocBuilder();
  const frame = hero(b);
  const card = b.layer("container", "Card", frame, { "frame.width": 320, "frame.height": 420, "appearance.radius": 20, "appearance.background.color": "#1e293b" });
  b.behaviour(card, { type: "tilt", enabled: true, params: { maxAngle: 12, perspective: 900, spring: gentle, glare: true, touch: "static" } });
  return b.build();
}

/** The library definition behind effect 4 (engine spec §11's example). */
export const AURORA_VEIL: EffectDefinition = {
  schema: "lazylayout.effect/1",
  id: "fx_aurora_veil",
  version: "1.0.0",
  name: "Aurora Veil",
  category: "backgrounds",
  behaviourKinds: ["shader", "reactive"],
  provenance: { inspiration: "generic aurora gradient flows", original: true },
  props: {
    colors: { type: "colorList", default: ["#5b8cff", "#7cf5d4", "#0b1020"], description: "Band colours, back to front", simple: true },
    speed: { type: "number", default: 0.4, min: 0, max: 2, description: "How fast the bands drift", simple: true },
    intensity: { type: "number", default: 0.7, min: 0, max: 1, description: "Brightness of the bands", simple: true },
    scale: { type: "number", default: 1.2, min: 0.3, max: 4, description: "Size of the bands" },
    grain: { type: "number", default: 0.06, min: 0, max: 0.3, description: "Film grain amount" },
  },
  template: {
    rootLayerId: "veil_host",
    layers: {
      veil_host: { id: "veil_host", name: "Aurora", archetype: "container", parentId: null, children: ["veil"], properties: {} },
      veil: { id: "veil", name: "veil", archetype: "effectSurface", parentId: "veil_host", children: [], properties: { "appearance.pointerEvents": "none" } },
    },
  },
  surfaces: [
    {
      id: "veil_surface",
      layerId: "veil",
      role: "background",
      program: { kind: "shaderGraph", ref: "graphs/aurora-veil.graph.json" },
      passes: ["program", "post:grain"],
      fallback: ["webgl2", "css:linear-gradient", "poster"],
      cost: { tier: "T2", estimateMsAt1080p: 1.1 },
      uniforms: [
        { name: "uFocus", type: "vec2", default: [0.5, 0.5] },
        { name: "uGlow", type: "float", default: 0, min: 0, max: 1 },
      ],
      policies: { touch: "autopilot", reducedMotion: { mode: "freeze", at: 2 } },
      poster: { at: 2 },
    },
  ],
  affordances: ["follow", "bend", "glow", "speed-up", "calm-down"],
  defaultBindings: {
    focus: "pointer.uv(local) |> smooth(0.18) -> veil.uniform.uFocus",
    glow: "pointer.inside(parent) |> smooth(0.3) -> veil.uniform.uGlow blend max",
  },
  states: { Calm: { speed: 0.2, intensity: 0.5 }, Excited: { speed: 1.2, intensity: 1 } },
  routing: { engine: "webgl2", fallbacks: ["css"] },
  performance: { class: "gpu", budgetMsPerFrame: 2, at: "1080p" },
  policies: { touch: "autopilot", reducedMotion: { mode: "freeze", at: 2, propOverrides: { speed: 0 } }, pauseControl: "auto" },
  poster: { at: 2 },
  export: { runtime: ["ticker", "signals", "gl"], sizeBudgetKb: 12 },
};

/** 4. Aurora shader background: an instance of the library effect on the hero frame. */
export function auroraBackground(): MotionDocument {
  const b = new DocBuilder();
  const frame = hero(b);
  b.effect(frame, { effectId: "fx_aurora_veil", version: "1.0.0", propOverrides: { speed: 0.6, colors: ["#8b5cf6", "#22d3ee", "#020617"] }, bindingOverrides: { glow: { strength: 0.8 } }, seed: 7 });
  return b.build();
}

/** 5. Stroke-draw logo: the outline draws itself on mount. */
export function strokeDrawLogo(): MotionDocument {
  const b = new DocBuilder();
  const frame = hero(b);
  const logo = b.layer("svgPath", "Logo mark", frame, { "svg.path": "M10 80 C 40 10, 65 10, 95 80 S 150 150, 180 80", "svg.strokeDasharray": "320", "svg.strokeDashoffset": 320, "svg.strokeLinecap": "round" });
  b.clip(logo, {
    name: "Draw",
    type: "entrance",
    trigger: "mount",
    duration: 1.6,
    easing: "power2.inOut",
    tracks: [{ id: "trk_draw", property: "svg.strokeDashoffset", keyframes: [{ id: "k1", time: 0, value: 320 }, { id: "k2", time: 1.6, value: 0 }] }],
  });
  return b.build();
}

/** 6. Path-morph icon: a menu glyph morphs into a close glyph on hover and back. */
export function pathMorphIcon(): MotionDocument {
  const b = new DocBuilder();
  const frame = hero(b);
  const icon = b.layer("icon", "Menu icon", frame, { "svg.path": "M4 6h16M4 12h16M4 18h16" });
  b.clip(icon, {
    name: "Menu → Close",
    type: "morph",
    trigger: "hover",
    duration: 0.35,
    easing: "back.out(1.7)",
    direction: "alternate",
    tracks: [
      {
        id: "trk_morph",
        property: "svg.path",
        keyframes: [{ id: "k1", time: 0, value: "M4 6h16M4 12h16M4 18h16" }, { id: "k2", time: 0.35, value: "M6 6l12 12M12 12h0M6 18L18 6" }],
      },
    ],
  });
  return b.build();
}

/** 7. Scroll-parallax image: drifts against the scroll while it crosses the viewport. */
export function scrollParallaxImage(): MotionDocument {
  const b = new DocBuilder();
  const frame = hero(b);
  const image = b.layer("image", "Parallax photo", frame, { "media.alt": "Mountains at dawn" });
  b.clip(image, {
    name: "Parallax",
    type: "scroll",
    trigger: "scrollProgress",
    duration: 1,
    easing: "linear",
    scrollTrigger: { start: "top bottom", end: "bottom top", scrub: true },
    tracks: [{ id: "trk_y", property: "transform.y", keyframes: [{ id: "k1", time: 0, value: 80 }, { id: "k2", time: 1, value: -80 }] }],
  });
  return b.build();
}

/** 8. Dock magnification: every dock item grows by the cursor's distance to it. */
export function dockMagnification(): MotionDocument {
  const b = new DocBuilder();
  const frame = hero(b);
  const dock = b.layer("container", "Dock", frame, { "layout.display": "flex", "layout.gap": 8 });
  for (const glyph of ["House", "Search", "Mail", "Music", "Settings"]) b.layer("icon", `Dock ${glyph}`, dock, { "content.iconName": glyph }, { tags: ["dockItem"] });
  // `self` on a tag target is each tagged item, so each measures its own distance.
  b.binding(dock, "proximity(self, center) |> falloff(gaussian, 120) |> remap(0, 1, 1, 1.6) |> spring(bounce: 0.15, time: 0.3) -> tag:dockItem.transform.scale blend multiply");
  return b.build();
}

/** 9. Count-up: 0 → 12,840+ when the number scrolls into view. */
export function countUp(): MotionDocument {
  const b = new DocBuilder();
  const frame = hero(b);
  const stat = b.layer("text", "Stat", frame, { "content.text": "12,840+", "content.counter.value": 0, "content.counter.separator": "comma", "content.counter.suffix": "+" });
  b.clip(stat, {
    name: "Count up",
    type: "entrance",
    trigger: "inView",
    duration: 2,
    easing: "power2.out",
    tracks: [{ id: "trk_count", property: "content.counter.value", keyframes: [{ id: "k1", time: 0, value: 0 }, { id: "k2", time: 2, value: 12840 }] }],
  });
  return b.build();
}

/** A particle overlay that bursts sparks (used by 10 and 16). */
function sparks(b: DocBuilder, parent: string, name: string): string {
  const layer = b.layer("effectSurface", name, parent);
  b.surface(layer, {
    role: "overlay",
    program: { kind: "particles", ref: "particles/click-spark.json" },
    fallback: ["canvas2d", "poster"],
    cost: { tier: "T1" },
    params: [{ name: "count", type: "int", default: 8, min: 1, max: 200 }],
    policies: { touch: "tap", reducedMotion: { mode: "off" } },
    poster: { at: 0 },
  });
  return layer;
}

/** 10. Click spark: clicking the button bursts sparks from it. */
export function clickSpark(): MotionDocument {
  const b = new DocBuilder();
  const frame = hero(b);
  const button = b.layer("button", "Buy", frame, { "content.label": "Buy now" });
  const fx = sparks(b, frame, "Sparks");
  const r = rule(eventNode("n_click", "Click", { layer: button }), [actionNode("n_burst", "Burst", { layer: fx, count: 8 })]);
  b.graph({ name: "Click spark", ownerLayerId: button, variables: [], customEvents: [], ...r });
  return b.build();
}

/** 11. Orbiting 3D object: a planet circles a hidden pivot forever. */
export function orbiting3D(): MotionDocument {
  const b = new DocBuilder();
  const pivot = b.layer("object3D", "Pivot", null, { "scene3d.visible": false });
  b.layer("object3D", "Planet", pivot, { "scene3d.position": [2, 0, 0], "scene3d.geometry": { type: "sphere", dimensions: [0.5, 32, 32] } });
  b.layer("camera3D", "Camera", null, { "scene3d.position": [0, 2, 6] });
  b.layer("light3D", "Sun", null);
  b.clip(pivot, {
    name: "Orbit",
    type: "loop",
    trigger: "mount",
    duration: 6,
    easing: "linear",
    repeat: -1,
    tracks: [
      {
        id: "trk_orbit",
        property: "scene3d.rotation",
        // A full turn about y as quaternions (slerp): 0°, 180°, 360°.
        keyframes: [{ id: "k1", time: 0, value: [0, 0, 0, 1] }, { id: "k2", time: 3, value: [0, 1, 0, 0] }, { id: "k3", time: 6, value: [0, 0, 0, -1] }],
      },
    ],
  });
  return b.build();
}

/** 12. State-machine toggle: Off ⇄ On on press, each way a spring. */
export function stateMachineToggle(): MotionDocument {
  const b = new DocBuilder();
  const frame = hero(b);
  const toggle = b.layer("toggle", "Dark mode", frame);
  const off = b.state(toggle, "Off", { "toggle.checked": false, "appearance.background.color": "#e2e8f0" });
  const on = b.state(toggle, "On", { "toggle.checked": true, "appearance.background.color": "#206859" });
  b.transition(toggle, { from: off, to: on, trigger: "press", motion: { type: "spring", spring: { bounce: 0.35, time: 0.35 } } });
  b.transition(toggle, {
    from: on,
    to: off,
    trigger: "press",
    motion: { type: "spring", spring: { bounce: 0.2, time: 0.3 } },
    overrides: [{ property: "appearance.background.color", motion: { type: "tween", duration: 0.2, easing: "ease-out" } }],
  });
  return b.build();
}

// ---------------------------------------------------------------------------
// The 4 interactive effects (v3.0 amendment)
// ---------------------------------------------------------------------------

/** A background surface filling `parent` (grammar 3.F.1). */
function backgroundSurface(b: DocBuilder, parent: string, name: string, program: Parameters<DocBuilder["surface"]>[1]["program"], decls: { uniforms?: Parameters<DocBuilder["surface"]>[1]["uniforms"]; params?: Parameters<DocBuilder["surface"]>[1]["params"] }): string {
  const layer = b.layer("effectSurface", name, parent);
  b.surface(layer, {
    role: "background",
    program,
    fallback: ["webgl2", "canvas2d", "poster"],
    cost: { tier: "T2", estimateMsAt1080p: 1.4 },
    ...decls,
    policies: { touch: "autopilot", reducedMotion: { mode: "freeze", at: 1.5 } },
    poster: { at: 1.5 },
  });
  return layer;
}

/** 13. Cursor-reactive shader background (engine spec §12.1), with an autopilot tape for scrubbing. */
export function cursorReactiveBackground(): MotionDocument {
  const b = new DocBuilder();
  const frame = hero(b);
  const field = backgroundSurface(b, frame, "Field", { kind: "glsl", ref: "shaders/warp-field.frag" }, {
    uniforms: [
      { name: "uWarpCenter", type: "vec2", default: [0.5, 0.5] },
      { name: "uWarp", type: "float", default: 0, min: 0, max: 1 },
    ],
  });
  b.binding(field, "pointer.uv(local) |> smooth(0.18) -> Field.uniform.uWarpCenter");
  b.binding(field, "pointer.inside(parent) |> smooth(0.3) |> mul(0.6) -> Field.uniform.uWarp");
  b.tape({ name: "Autopilot", origin: "autopilot", duration: 8, seed: 42, channels: [{ signal: { kind: "pointerIn", channel: "uv", space: "local" }, samples: [] }] });
  return b.build();
}

/** 14. Dot field with a click shockwave (engine spec §12.2). */
export function dotFieldShockwave(): MotionDocument {
  const b = new DocBuilder();
  const frame = hero(b);
  const dots = backgroundSurface(b, frame, "Dots", { kind: "sim", sim: "springLattice", ref: "sims/dot-field.json" }, {
    params: [
      { name: "fieldCenter", type: "vec2", default: [0.5, 0.5] },
      { name: "fieldStrength", type: "float", default: 0, min: 0, max: 1 },
    ],
  });
  b.binding(dots, "pointer.uv(local) -> Dots.param.fieldCenter");
  b.binding(dots, "pointer.inside(parent) |> smooth(0.15) -> Dots.param.fieldStrength");
  b.binding(dots, "pointer.down |> edge(rise) -> event(Shockwave)");
  const r = rule(eventNode("n_shock", "Custom", { name: "Shockwave" }), [actionNode("n_impulse", "Impulse", { layer: dots, kind: "radial", strength: 5 })]);
  b.graph({ name: "Shockwave", ownerLayerId: dots, variables: [], customEvents: [{ name: "Shockwave" }], ...r });
  return b.build();
}

/** 15. Fluid splash cursor (engine spec §12.3). */
export function splashCursor(): MotionDocument {
  const b = new DocBuilder();
  const frame = hero(b);
  const cursor = b.layer("effectSurface", "Cursor", frame);
  b.surface(cursor, {
    role: "cursor",
    program: { kind: "sim", sim: "fluid", ref: "sims/splash.json" },
    fallback: ["webgl2", "poster"],
    cost: { tier: "T2", estimateMsAt1080p: 1.8 },
    params: [
      { name: "splatPosition", type: "vec2", default: [0.5, 0.5] },
      { name: "splatForce", type: "vec2", default: [0, 0] },
    ],
    policies: { touch: "drag", reducedMotion: { mode: "off" } },
    poster: { at: 0 },
  });
  b.binding(cursor, "pointer.uv(page) -> Cursor.param.splatPosition");
  b.binding(cursor, "pointer.velocity |> clamp(-4000, 4000) -> Cursor.param.splatForce");
  return b.build();
}

/** 16. Hovering the CTA intensifies the background; clicking it bursts particles (engine spec §12.5). */
export function ctaIntensifiesBackground(): MotionDocument {
  const b = new DocBuilder();
  const frame = hero(b);
  const bg = backgroundSurface(b, frame, "bg", { kind: "shaderGraph", ref: "graphs/nebula.graph.json" }, {
    uniforms: [{ name: "uIntensity", type: "float", default: 0.4, min: 0, max: 2 }],
  });
  b.state(bg, "Excited", { "appearance.opacity": 1 });
  const cta = b.layer("button", "cta", frame, { "content.label": "Launch" });
  const fx = sparks(b, frame, "sparks");
  // Cross-layer: the background reads the CTA's proximity (grammar 6.10).
  b.binding(bg, "proximity(cta) |> falloff(smoothstep, 260) |> spring(120, 16) -> bg.uniform.uIntensity blend add");
  b.binding(cta, "pointer.px(local) |> component(x) |> spring(200, 20) |> clamp(-10, 10) -> cta.transform.x blend add when state(Hover)");
  const r = rule(eventNode("n_click", "Click", { layer: cta }), [
    actionNode("n_burst", "Burst", { layer: fx, count: 60 }),
    actionNode("n_excite", "SetState", { layer: bg, state: "Excited" }),
    actionNode("n_wait", "Wait", { seconds: 1.2 }),
    actionNode("n_calm", "SetState", { layer: bg, state: "Default" }),
  ]);
  b.graph({ name: "Launch", ownerLayerId: cta, variables: [], customEvents: [], ...r });
  return b.build();
}

// ---------------------------------------------------------------------------
// The reference build (v3.2, engine spec §12.7)
// ---------------------------------------------------------------------------

function referenceScene(b: DocBuilder) {
  const frame = hero(b);
  const card = b.layer("container", "Card", frame, { "frame.width": 520, "frame.height": 240, "appearance.radius": 24, "appearance.background.color": "#111827" });
  const text = b.layer("text", "LAZYLAYOUT", card, { "content.text": "LAZYLAYOUT", "typography.fontSize": 48 });
  const split = b.splitLetters(text, "LAZYLAYOUT letters", { tags: ["letter"], advance: 29 });
  // Step 1–3: a 120 px circle, made a helper, following the mouse by its bottom-centre pin.
  const circle = b.layer("ellipse", "Cursor Circle", frame, { "frame.width": 120, "frame.height": 120, "render.role": "helper", positioning: "absolute" });
  b.component(circle, {
    type: "follow",
    enabled: true,
    target: { kind: "pointer", space: "frame" },
    pin: "bottomCentre",
    offset: [0, 0],
    lag: { type: "spring", spring: { stiffness: 300, damping: 28 } },
    axis: "both",
    bounds: { kind: "none" },
    onLeave: "home",
    rotation: { kind: "none" },
    scale: { kind: "constant" },
    touch: "while-pressed",
    reducedMotion: "off",
  });
  b.component(circle, { type: "field", enabled: true, shape: "circle", inner: 60, outer: 60, falloff: "hard" });
  return { frame, card, text, circle, ...split };
}

/** 17a. The reference build, effector form (what the Simple rule compiles to: nothing needs momentum). */
export function referenceBuildEffectors(): MotionDocument {
  const b = new DocBuilder();
  const { circle, groupId } = referenceScene(b);
  b.component(circle, {
    type: "effector",
    enabled: true,
    targets: { kind: "group", ref: groupId },
    effect: { kind: "keepOut", margin: 6 },
    strength: 1,
    smoothing: { stiffness: 220, damping: 18 },
    blend: "add",
    order: 0,
    stayInside: "parent",
  });
  b.component(circle, {
    type: "effector",
    enabled: true,
    targets: { kind: "group", ref: groupId },
    effect: { kind: "jitter", rotate: 12, x: 0, y: 0 },
    strength: 1,
    smoothing: { bounce: 0.6, time: 0.6 },
    blend: "add",
    order: 1,
    stayInside: "none",
  });
  return b.build();
}

/** 17b. The reference build, Blueprint form: the two interaction rules, with the colliders and home springs they auto-attach (73.5). */
export function referenceBuildBlueprint(): MotionDocument {
  const b = new DocBuilder();
  const { circle, groupId, pieceIds } = referenceScene(b);
  b.component(circle, { type: "collider", enabled: true, shape: "auto", padding: 0, mode: "trigger", layer: "Cursor", mask: ["Letters"] });
  b.component(circle, { type: "body", enabled: true, body: "kinematic", mass: 1, damping: 0, bounciness: 0, friction: 0, gravityScale: 0, rotation: false, sleep: false });
  for (const piece of pieceIds) {
    b.component(piece, { type: "collider", enabled: true, shape: "auto", padding: 0, mode: "trigger", layer: "Letters", mask: ["Cursor"] });
    b.component(piece, {
      type: "body",
      enabled: true,
      body: "dynamic",
      mass: 1,
      damping: 4,
      bounciness: 0.2,
      friction: 0.1,
      gravityScale: 0,
      homeSpring: { stiffness: 180, damping: 14 },
      rotation: true,
      sleep: true,
    });
  }
  const letters = `${groupId}[*]`;
  // When OverlapStay(Cursor Circle) on "LAZYLAYOUT"[*] -> KeepOut(other, 6), AddSpin(other, other.random × 12)
  const stay = rule(eventNode("n_stay", "OverlapStay", { collider: circle, target: letters }, [layerOut("other")]), [
    actionNode("n_keepout", "KeepOut", { margin: 6 }, [layerIn("target")]),
    actionNode("n_spin", "AddSpin", {}, [layerIn("target"), numberIn("degrees")]),
  ]);
  const random = { id: "n_random", kind: "pure" as const, type: "GetAttribute", params: { name: "random" }, pins: [layerIn("of"), numberOut("value")] };
  const times = { id: "n_times", kind: "pure" as const, type: "Multiply", params: {}, pins: [numberIn("a"), numberIn("b", 12), numberOut("result")] };
  // When OverlapEnd(Cursor Circle) on "LAZYLAYOUT"[*] -> SpringHome(other, 180, 14)
  const end = rule(eventNode("n_end", "OverlapEnd", { collider: circle, target: letters }, [layerOut("other")]), [
    actionNode("n_home", "SpringHome", { stiffness: 180, damping: 14 }, [layerIn("target")]),
  ]);
  b.graph({
    name: "Letters flee the circle",
    ownerLayerId: circle,
    variables: [],
    customEvents: [],
    nodes: [...stay.nodes, random, times, ...end.nodes],
    wires: [
      ...stay.wires,
      wire("n_stay", "other", "n_keepout", "target"),
      wire("n_stay", "other", "n_spin", "target"),
      wire("n_stay", "other", "n_random", "of"),
      wire("n_random", "value", "n_times", "a"),
      wire("n_times", "result", "n_spin", "degrees"),
      ...end.wires,
      wire("n_end", "other", "n_home", "target"),
    ],
  });
  // Step 7: a recorded pointer pass, so the build scrubs on the timeline.
  b.tape({
    name: "Pointer pass",
    origin: "recorded",
    duration: 1.5,
    fps: 60,
    channels: [
      {
        signal: { kind: "pointerIn", channel: "px", space: "frame" },
        samples: [
          { t: 0, v: [300, 520] },
          { t: 0.5, v: [520, 470] },
          { t: 1, v: [760, 470] },
          { t: 1.5, v: [980, 520] },
        ],
      },
    ],
  });
  return b.build();
}

export const REFERENCE_EFFECTS = {
  "split-text reveal": splitTextReveal,
  "magnet button": magnetButton,
  "3D tilt card": tiltCard,
  "aurora shader background": auroraBackground,
  "stroke-draw logo": strokeDrawLogo,
  "path morph icon": pathMorphIcon,
  "scroll-parallax image": scrollParallaxImage,
  "dock magnification": dockMagnification,
  "count-up": countUp,
  "click spark": clickSpark,
  "orbiting 3D object": orbiting3D,
  "state-machine toggle": stateMachineToggle,
} as const;

export const INTERACTIVE_REFERENCE_EFFECTS = {
  "cursor-reactive shader background": cursorReactiveBackground,
  "dot field with a click shockwave": dotFieldShockwave,
  "fluid splash cursor": splashCursor,
  "hovering the CTA intensifies the background, clicking it bursts particles": ctaIntensifiesBackground,
} as const;

export const REFERENCE_BUILD = {
  "reference build (effector form)": referenceBuildEffectors,
  "reference build (Blueprint form)": referenceBuildBlueprint,
} as const;
