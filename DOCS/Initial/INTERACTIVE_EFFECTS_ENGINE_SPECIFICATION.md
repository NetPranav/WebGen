# LazyLayout Interactive Effects Engine Specification ("LazyLayout FX")

**Version:** 1.4.0 (Draft). v1.4 (ROADMAP Phase 7) adds to the §3 grammar what the model needed: `pointer.velocity`, a constant signal, `component(x|y)`, the perceptual `spring(bounce:, time:)` and the `position(pin[, axis])` target; bindings and effect instances are now typed in the document (decision 0004).
- v1.3 adds §7.8 (where WebGL is used: GPU only where needed; three.js only for real 3D), §7.9 (GPU memory budget and resource lifecycle) and rules FX-PERF-07 and FX-MEM-01 … 06.
- v1.1 adds GPU resilience (§7.7), kinetic composition (§8.6, §10.8) and the reference build (§12.7).
- v1.2 adds, after a step-by-step trace of the reference build:
  - the no-math controls vocabulary (§13.4);
  - the spawner, one evaluation space and "stay inside" (§8.6.4–§8.6.5);
  - draggable bodies (§8.6.6);
  - rules that set up their own colliders and fields (§8.6.7).
**Date:** 2026-09-26
**File Location:** `DOCS/Initial/INTERACTIVE_EFFECTS_ENGINE_SPECIFICATION.md`
**Status:** Design specification. Since ROADMAP Phase 7 the document model can *express* everything here (types and validation in `src/core/document/`), but **no runtime in this document runs in the code yet** (see `AUDIT.md` AUD-45 … AUD-49 and AUD-56). Each section names the roadmap phase that builds it.
**Owner phases:** `ROADMAP.md` v3.1:
- Track X (Phases 59–71);
- Track L (Phases 72–74);
- Track K (Phases 88–91);
- the amendments to Phases 7, 8, 9, 10, 12, 17, 18, 19 and 24–29.

**Companions:**
- `lazylayout_element_grammer.md` §13 and §14: the grammar-level rules. §13 covers the Reactive category, the effect-surface element types and conflict rules 6.9–6.16; §14 covers kinetic composition and rules 6.17–6.24.
- `ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md`: DOM engines and property costs. Its §11.4 maps every GSAP feature to our replacement.
- `PRD.md` §5.4.

---

## 0. Purpose

### 0.1 The pitch, in one paragraph
People go to effect libraries such as [React Bits](https://reactbits.dev) to get a background that bends toward the cursor, a cursor that splashes like liquid, a dot grid that ripples when clicked, or a card that tilts and glares. They copy the code, then do the production work themselves: wiring props, handling touch, pausing offscreen, respecting reduced motion, fixing SSR, keeping frame rates up on phones. **LazyLayout FX makes those effects as easy to add as a font, as easy to tune as a Figma property, as easy to wire as a Wix interaction, as deep as an Unreal Blueprint when needed, and exports them as production-hardened code the user owns.**

### 0.2 Design goals
1. **One step to "it reacts".** Every effect declares the reactions it supports (its *affordances*). Picking "Cursor → Bend" in the inspector is the whole job.
2. **One engine, many effects.** Effects are data (an `EffectDefinition`, §11) built from a small set of engine modules. The library grows with design time, not engineering time.
3. **Preview = Export.** The editor preview, the timeline scrub, the render queue and the exported component run the same programs driven by the same signals.
4. **Production by default.** Budgets, fallbacks, touch behaviour, reduced motion, poster-first loading and cleanup are part of the effect contract. None of it is a checklist left to the user.
5. **Honest and legal.** Original implementations only. Imported code keeps its licence. GSAP never runs in the editor (§10.6).

### 0.3 What production hardening means here
Copy-paste effect components are written to drop into one page, and they leave production concerns to the integrator. For example, two components sampled from React Bits on 2026-09-26 each ran their own `requestAnimationFrame` loop and listeners. One read the pointer unsmoothed with no device-pixel-ratio scaling. The other scaled for DPR, throttled pointer events and used GSAP's InertiaPlugin. Neither shared a frame loop or GPU context with other effects on the page. LazyLayout FX moves all of that into the engine:

| Concern | Left to the integrator in a copy-paste component | LazyLayout FX |
|---|---|---|
| Frame loop | One `requestAnimationFrame` loop per component | One scheduler for everything (One Clock Law, Phase 45) |
| Pointer and scroll input | Listeners per component | One passive Input Bus (Signal Law, Phase 59) |
| GPU contexts | One per component; past 8–16 live contexts the browser silently drops the oldest | A compositor with a per-page budget (Surface Budget Law, Phase 61) |
| Offscreen | Often keeps rendering | Paused offscreen and in hidden tabs; context released under budget pressure |
| Quality | Fixed resolution | DPR cap, dynamic resolution, device tiers T0–T3 |
| Touch | Often none | A declared touch behaviour, mandatory (rule FX-IN-01) |
| Reduced motion | Usually ignored | A declared policy per effect (rule FX-A11Y-01) |
| Loading | Canvas mounts eagerly | Poster first, init after LCP, no layout shift |
| Editing | Props in code | Inspector props, reactions, timeline scrub, Blueprints |
| Testing | None | Seeded, replayable from input tapes (Deterministic Replay Law) |

---

## 1. Mental Model

An **effect** is:

```
Effect = Props (a typed view-model)
       + Surfaces (where it draws) running Programs (shader graph, particle stack, simulation, canvas routine)
       + Bindings (signals → operators → targets)
       + States (named prop snapshots with transitions)
       + Policies (fallback chain, touch, reduced motion, budget tier, poster)
       + Export templates
```

Continuous reactions (the background follows the cursor) are **bindings**. Discrete logic (when the button is clicked, burst particles and flip the card) is an **Interaction Blueprint** (Phase 72). Both read the same signals and write the same targets.

### 1.1 Unreal Engine mapping
The product idea is "Figma/Wix for the canvas, Unreal for the logic". This is how the Unreal toolset maps onto LazyLayout:

| Unreal Engine | LazyLayout | Phase |
|---|---|---|
| Level Viewport | Infinite canvas with frames | 49 |
| Actor / Component | Layer (archetype), effect instance, code component | 2, 67, 68 |
| Details panel | Inspector (Design · Motion · Code) | 22, 44 |
| Blueprint Event Graph | Interaction Blueprint (Pro graph; Simple "When → Do" rules) | 72–74 |
| Blueprint variables ("Instance Editable") | Blueprint variables exposed as component props | 72.1, 75.3 |
| Event Dispatchers | Custom events | 72.1 |
| Timeline node | "Play composition" node over AE-style compositions | 46, 72.2 |
| Material Editor | Shader Graph ("Material Blueprint") | 62 |
| Material Instance parameters | Effect props (view-model) | 67 |
| Niagara | Particles & Force Fields (module stack) | 63 |
| Chaos physics | Simulation modules (fluid, lattices, ropes, rigid bodies) | 64 |
| Trigger volume / empty actor *(v3.1)* | **Helper layer**: an invisible, logic-only shape that still follows, collides and fires events | 88 |
| Actor tags *(v3.1)* | **Layer tags**, so rules can target "every layer tagged `letter`" | 89.3 |
| Collision components, channels, physics bodies *(v3.1)* | **Colliders**, collision layers/masks, **kinetic bodies** on any DOM layer | 91 |
| `OnComponentBeginOverlap` / `EndOverlap` / `Hit` *(v3.1)* | `OverlapBegin` / `OverlapStay` / `OverlapEnd` / `Hit` Blueprint events | 91.4 |
| (Cinema 4D MoGraph) Cloner & Effector *(v3.1)* | **Split & Clone groups** and **Fields & Effectors** | 89, 90 |
| Post Process Volume | Surface post stack | 61.2 |
| Sequencer | After Effects-style timeline | 52 |
| Animation Blueprint state machine | State machine with inputs (Rive-style) | 11.3 |
| Play In Editor | Preview mode and Playground | 49.5, 24 |
| Blueprint Debugger | Execution pulses, breakpoints, watches | 73.3 |
| Cook & Package | Export (code, embed script, site) | 27, 69, 79 |

---

## 2. Architecture

### 2.1 Per-frame pipeline
All of this runs inside the Phase 45 frame scheduler. Nothing below owns its own loop.

```
 Pointer · Scroll · View · Time (transport) · Audio · Device · Blueprint variables · Input tapes
                       │  one passive listener set per frame host (Signal Law)
                       ▼
 ┌─ INPUT phase ───────────────────────────────────────────────────────────────┐
 │ Input Bus (59): immutable per-frame signal snapshot  ──► event queue          │
 └──────────────┬───────────────────────────────────────────────┬──────────────┘
                ▼                                               ▼
 ┌─ EVALUATE phase ───────────────────────────────┐   Interaction Blueprint runtime (74):
 │ Signal graphs (60): operators, blends, guards  │   set state · play composition · set var ·
 │ Kernel evaluate() (9): clips, states, links    │   burst · impulse · emit event
 │ Stateful modules (63/64): fixed-step, seeded   │──────────────┘
 └──────────────┬─────────────────────────────────┘
                ▼  ResolvedProps · uniforms · simulation parameters
 ┌─ APPLY phase ───────────────────────────────────────────────────────────────┐
 │ DOM: LayerNodeRegistry writes (48)   │   GPU: Surface Compositor (61)          │
 │ (transforms, opacity, CSS variables) │   shader graphs (62) · particles (63) · │
 │                                      │   sims (64) · textures (65) · cursor (66)│
 └──────────────┬──────────────────────────────────────────────────────────────┘
                ▼
        OVERLAY (editor chrome, 49.4) → STATS (frame telemetry, 56.4 / 82.2)
```

### 2.2 Module map (proposed paths)
| Module | Path | Phase |
|---|---|---|
| Input Bus, signal catalogue, tapes | `src/core/signals/` | 59 |
| Operators, bindings, compiler | `src/core/signals/graph/` | 60 |
| Compositor, GL helper, tiers | `src/core/fx/compositor/`, `src/core/fx/gl/` | 61 |
| Shader graph and compiler | `src/core/fx/shader/` | 62 |
| Particles | `src/core/fx/particles/` | 63 |
| Simulations | `src/core/fx/sims/` | 64 |
| Texture sources | `src/core/fx/textures/` | 65 |
| Cursor layer | `src/core/fx/cursor/` | 66 |
| Effect definitions, registry, migrations | `src/core/effects/` | 67 |
| Code components (import, bundling, controls, bridge) | `src/core/code-components/` | 68 |
| FX export templates, runtime vendoring, embed builder | `src/compiler/fx/` | 69 |
| Interaction Blueprints (model, runtime, compiler) | `src/core/blueprint/` | 72–74 |
| Kinetic composition: helpers, pins, follow, split, clone, fields, effectors *(v3.1)* | `src/core/kinetics/` | 88–90 |
| 2D physics core: colliders, bodies, contacts (shared by DOM layers and 64.2) *(v3.1)* | `src/core/physics2d/` | 91 |

The Interaction Blueprint lives apart from the After-track logic Blueprint (`src/core/ast`, `src/editor/panels/blueprint/`) until Phase 87 decides how the two merge. Track L reuses its UI and the NodeScript parser (`src/core/nodescript/`) after auditing them.

---

## 3. Formal Grammar

The notation follows `lazylayout_element_grammer.md` §2 (loose EBNF). The **text form of bindings** (§3.3) is also the storage-independent format the AI writes and tests read, the way NodeScript is for Blueprints.

### 3.1 Signals
```ebnf
<Signal>        ::= <PointerSignal> | <LayerSignal> | <ScrollSignal> | <ViewSignal>
                  | "time" | "frame.dt" | <AudioSignal> | <DeviceSignal>
                  | "state(" <StateName> ")" | "sm(" <InputName> ")"
                  | "prop(" <PropName> ")" | "var(" <VarName> ")" | "seed"
                  | <number>                                    -- (v1.4) a constant, e.g. `0 |> spring(…)`

<PointerSignal> ::= "pointer." ( "x" | "y" | "dx" | "dy" | "speed" | "angle" | "velocity" | "down"
                               | "pressure" | "type" | "coarse" )  -- (v1.4) `velocity`: vec2 px/s, used by §12.3
                  | "pointer." ( "uv" | "ndc" | "px" ) "(" <Space> ")"
                  | "pointer.inside(" <LayerRef> ")"
<Space>         ::= "local" | "parent" | "frame" | "page"

<LayerSignal>   ::= ( "hover" | "press" | "focus" ) "(" <LayerRef> ")"
                  | "proximity(" <LayerRef> [ "," ( "edge" | "center" ) ] ")"

<ScrollSignal>  ::= "scroll." ( "y" | "progress" | "velocity" | "direction" )
<ViewSignal>    ::= "view(" <LayerRef> ")." ( "progress" | "visible" )
<AudioSignal>   ::= "audio(" <LayerRef> ")." ( "level" | "band(" <int> ")" | "beat" )
<DeviceSignal>  ::= "device." ( "tiltX" | "tiltY" | "orientation" )

<LayerRef>      ::= "self" | "parent" | <layerId> | <layerName>
```

### 3.2 Operators
```ebnf
<SignalExpr>    ::= <Signal> { "|>" <Operator> }
<Operator>      ::= "smooth(" <tau> ")"                         -- frame-rate independent exponential smoothing
                  | "spring(" <stiffness> "," <damping> [ "," <mass> ] ")"
                  | "spring(bounce:" <0..1> ", time:" <seconds> ")"      -- (v1.4) perceptual spring, Law 17
                  | "remap(" <inMin> "," <inMax> "," <outMin> "," <outMax> [ ",clamp" ] ")"
                  | "clamp(" <min> "," <max> ")" | "curve(" <CurveRef> ")"
                  | "deadzone(" <radius> ")"
                  | "falloff(" ( "linear" | "smoothstep" | "gaussian" | "inverse-square" ) "," <radius> ")"
                  | "noise(" <freq> "," <amp> "," <seed> ")"
                  | "delay(" <seconds> ")" | "trail(" <samples> ")" | "velocity"
                  | "accumulate(" <decay> ")" | "threshold(" <on> "," <off> ")"
                  | "edge(" ( "rise" | "fall" | "both" ) ")" | "toggle" | "sampleHold(" <SignalExpr> ")"
                  | "quantize(" <step> ")" | "mix(" <SignalExpr> "," <t> ")"
                  | "add(" <x> ")" | "mul(" <x> ")" | "min(" <x> ")" | "max(" <x> ")" | "abs"
                  | "length" | "normalize" | "rotate(" <deg> ")" | "distance(" <SignalExpr> ")"
                  | "angleTo(" <SignalExpr> ")" | "select(" <SignalExpr> "," <SignalExpr> ")"
                  | "component(" ( "x" | "y" ) ")"                       -- (v1.4) one axis of a vec2
```

### 3.3 Bindings
```ebnf
<Binding>       ::= <SignalExpr> "->" <Target> [ "blend" <Blend> ] [ "when" <Guard> ] [ "@" <Priority> ]
<Target>        ::= <LayerRef> "." <PropertyPath>                 -- a Phase 42 registry path
                  | <LayerRef> ".uniform." <identifier>          -- a shader-graph uniform (62)
                  | <LayerRef> ".param." <identifier>            -- a particle/simulation parameter (63/64)
                  | <LayerRef> ".input." <identifier>            -- a state-machine input (11.3)
                  | <LayerRef> ".cssvar." <identifier>           -- a CSS custom property (export-visible)
                  | <LayerRef> ".position(" <PinName> [ "," ( "x" | "y" ) ] ")"  -- a pin lands on the value (§6, §8.6.2)
                  | "event(" <EventName> ")"                     -- edge-triggered, for Blueprints (72)
<Blend>         ::= "replace" | "add" | "multiply" | "max"
<Guard>         ::= <Condition> { ( "and" | "or" ) <Condition> }
<Condition>     ::= "state(" <StateName> ")" | "pointer.coarse" ( "=" | "!=" ) <bool>
                  | "breakpoint" ( "=" | "!=" ) <BreakpointName> | "reducedMotion" ( "=" | "!=" ) <bool>
                  | <SignalExpr> ( ">" | "<" | ">=" | "<=" ) <number>
```

Examples:
```text
pointer.uv(local) |> smooth(0.12)                                   -> bg.uniform.uFocus
proximity(cta) |> falloff(smoothstep, 260) |> spring(120, 16)       -> bg.uniform.uIntensity blend add
pointer.ndc(local) |> spring(200, 20) |> remap(-1, 1, -10, 10)      -> cta.transform.x blend add when state(Hover)
scroll.progress |> remap(0, 0.4, 1, 0, clamp)                       -> bg.appearance.opacity blend multiply
pointer.speed |> threshold(1200, 600) |> edge(rise)                 -> event(Shockwave)
```

*(v1.4, ROADMAP Phase 7)* `<LayerRef>` in the text form may also be `tag:<name>` or `<GroupRef>[*]` on the target side (§6 group and tag targets). When a target is a set, `self` in the binding's signals means each target. Bindings are stored structured in the document and round-trip through this text form (`src/core/document/signals.ts`, decision 0004 §5).

### 3.4 Effect definition (shape)
```ebnf
<EffectDefinition> ::= <Header> <Props> <Surface>+ [ <Affordances> ] [ <Bindings> ]
                       [ <States> ] <Policies> <Poster> <ExportSpec> <Provenance>
<Surface>          ::= <SurfaceId> <Role> <Program> [ <PassStack> ] <FallbackChain> <Cost>
<Role>             ::= "background" | "inline" | "overlay" | "cursor" | "texture-source"
<Program>          ::= "shaderGraph(" <ref> ")" | "glsl(" <ref> ")" | "particles(" <ref> ")"
                     | "sim(" <SimKind> "," <ref> ")" | "canvas2d(" <ModuleRef> ")" | "css(" <ref> ")"
<FallbackChain>    ::= <Backend> { "→" <Backend> } "→" "poster"
<Backend>          ::= "webgpu" | "webgl2" | "canvas2d" | "svg" | "css"
```
The JSON shape and a full example are in §11.

### 3.5 Simple-mode sentence grammar
The Reactivity card (Phase 60.3) reads and writes bindings through this sentence form, which is what a first-time user sees:
```ebnf
<Sentence>   ::= "When" <Subject> <Verb> [ "over" <LayerRef> ] "," <EffectName> <Reaction> [ "," <Amount> ]
<Subject>    ::= "the cursor" | "a finger" | "the page" | "the sound" | "the device"
<Verb>       ::= "moves" | "comes close to" <LayerRef> | "presses" | "scrolls" | "is still" | "tilts"
<Reaction>   ::= <Affordance-phrase>        -- "follows it", "bends toward it", "pushes away", "ripples",
                                            -- "glows", "tilts", "speeds up", "calms down", "bursts"
<Amount>     ::= "gently" | "clearly" | "strongly"     -- maps to the Strength slider
```
Every sentence compiles to a fixed binding recipe from the effect's affordance table (§9). Every binding set that matches a recipe prints back as a sentence. Anything else shows "Custom (open in Signals)".

### 3.6 Interaction rules (discrete logic)
Discrete event → action logic belongs to the Interaction Blueprint. Its Simple rule grammar (`When <Event> on <Layer> -> <Action>, …`) is defined in `lazylayout_element_grammer.md` §13.7, and the node catalogue in `ROADMAP.md` Phase 72.2.

---

## 4. Signal Catalogue (Phase 59)

All signals are sampled **once per frame** in the scheduler's input phase. Values are immutable for the rest of the frame.

| Signal | Type | Range / unit | Notes | On coarse pointers (touch) |
|---|---|---|---|---|
| `pointer.px(space)` | vec2 | px | Resolved through `renderer.measure()`, so a `pointer-events: none` background still knows where the cursor is over it | Last touch point while touching; otherwise the touch behaviour (§10.2) |
| `pointer.uv(space)` | vec2 | 0–1 | y grows downward in DOM space; programs flip for GL | Same |
| `pointer.ndc(space)` | vec2 | −1…1 | For tilt and parallax | Same |
| `pointer.dx`, `pointer.dy` | number | px/frame | Raw per-frame delta | Drag delta |
| `pointer.speed` | number | px/s | Smoothed over 3 frames | Drag speed |
| `pointer.angle` | number | deg | Direction of motion | Drag direction |
| `pointer.down` | bool | — | Primary button or touch contact | Touch contact |
| `pointer.pressure` | number | 0–1 | Pen/touch where supported, else 0.5 while down | Supported |
| `pointer.type` | enum | mouse · pen · touch | — | touch |
| `pointer.coarse` | bool | — | From `(pointer: coarse)` and the last event | true |
| `pointer.inside(L)` | bool | — | Hit-tested against the layer's rect | Touch inside |
| `hover(L)`, `press(L)`, `focus(L)` | number | 0–1 | Edge-smoothed state (default 80 ms); `focus` makes keyboard parity easy | `hover` is 0; `press` follows touch |
| `proximity(L, edge\|center)` | number | px | Distance to the rect edge (0 inside) or centre | From the last touch point |
| `scroll.y`, `scroll.progress` | number | px, 0–1 | Nearest scroll container of the frame host | Same |
| `scroll.velocity`, `scroll.direction` | number | px/s, −1/0/1 | — | Same |
| `view(L).progress`, `view(L).visible` | number | 0–1 | Like CSS `view()` timelines; visible = intersection ratio | Same |
| `time` | number | s | **Transport time only** (Phase 45), never `Date.now()`; in exports the transport runs live | Same |
| `frame.dt` | number | s | Clamped to 1/15 s after stalls | Same |
| `audio(L).level`, `.band(n)`, `.beat` | number | 0–1 | From media layers (54), analysed in a worker; microphone input is out of scope in Release 1 | Same |
| `device.tiltX/Y` | number | deg | Needs a user gesture plus permission on iOS; never requested automatically | Primary source for the `gyro` touch behaviour |
| `state(S)`, `sm(I)` | number | 0–1 / typed | State blend weight; state-machine input value | Same |
| `prop(P)`, `var(V)`, `seed` | typed | — | Effect props, Blueprint variables, the instance's seed | Same |

**Input tapes** (59.3) record or author any signal over time. The transport plays tapes in deterministic mode for scrubbing (23.4), the Playground (24), the render queue (55) and tests (71). Synthetic tape sources: autopilot (a seeded wandering pointer), scripted paths, tap sequences and scroll curves.

---

## 5. Operator Catalogue (Phase 60)

Every operator is **frame-rate independent** (it uses `frame.dt`, never "per frame" constants) and **deterministic** given the same `dt` sequence. Stateful operators reset by replaying their tape from the nearest snapshot (Deterministic Replay Law).

| Operator | Stateful | Semantics | Typical use |
|---|---|---|---|
| `smooth(τ)` | yes | `y += (x − y) · (1 − e^(−dt/τ))` | Soften the cursor; the default for `follow` |
| `spring(k, c, m)` | yes | Damped spring step (analytic or semi-implicit); exposes velocity | Tilt, magnet, overshoot |
| `remap(a,b,c,d[,clamp])` | no | Linear map `[a,b] → [c,d]` | Degrees, strengths |
| `clamp`, `min`, `max`, `abs` | no | Standard | Limits |
| `curve(ref)` | no | Bezier or named easing from the Phase 9 library | Non-linear response |
| `deadzone(r)` | no | 0 inside radius `r`, rescaled outside | Ignore jitter near centre |
| `falloff(kind, r)` | no | Maps a distance to 0–1 influence | Proximity glow, repel radius |
| `noise(f, a, seed)` | no | Seeded simplex over time or input | Organic wobble (like `wiggle`, 47.2) |
| `delay(s)` | yes | Ring buffer | Echo, follow-the-leader |
| `trail(n)` | yes | Last `n` samples as an array | Ribbons, trails, image stamps |
| `velocity` | yes | Smoothed derivative | Stretch by speed |
| `accumulate(decay)` | yes | Leaky integrator | Energy that builds and fades |
| `threshold(on, off)` | yes | Schmitt trigger (hysteresis) → bool | Robust events from noisy signals |
| `edge(rise\|fall\|both)` | yes | Boolean edge → pulse | Fire `event(...)` once |
| `toggle` | yes | Flip-flop on rising edges | Alternate states |
| `sampleHold(trigger)` | yes | Holds the input while the trigger is low | Freeze a position on click |
| `quantize(step)` | no | Snap to steps | Pixel/stepped looks |
| `mix(expr, t)` | no | Lerp between two chains | Blend reactions |
| `length`, `normalize`, `rotate`, `distance`, `angleTo` | no | Vector maths | Direction-aware effects |
| `select(a, b)` | no | `a` when the guard holds, else `b` | Mouse vs touch variants |

Operator arithmetic reuses the Phase 47 expression evaluator (no `eval`, no `Function`).

---

## 6. Targets, Update Paths & Blending (Phase 60.2)

| Target | Written in | Allowed values | Notes |
|---|---|---|---|
| Layer property (`transform.*`, `appearance.opacity`, `filter.*`, gradient paths …) | APPLY, via the LayerNodeRegistry (48.3) | Registry paths whose compositing class is `gpu` or `paint`, and `animatable: true` | **Continuous bindings to `layout` paths are refused** (`[SIG_LAYOUT]`); use `transform.*` (decision 0003) |
| Shader uniform | APPLY, via the compositor (61) | Declared by the program's uniform block | Clamped to the declared range |
| Particle / simulation parameter | EVALUATE (before the step) | Declared by the module | Budget-checked (particle counts can't be bound above tier caps) |
| State-machine input | EVALUATE | `number` and `bool` inputs | Triggers use `event(...)` plus a Blueprint |
| CSS custom property | APPLY | Numbers and colours | Exported as `--name` on the layer; lets plain CSS react |
| `event(Name)` | INPUT of the next frame | Edge pulses | Consumed by Interaction Blueprints (74) |
| *(v3.1)* `L.position(pin)` | APPLY, via the LayerNodeRegistry | A `vec2` in frame space | Writes `transform.x/y` so that the chosen **pin** (a point on the layer) lands on the value, accounting for rotation and scale about the anchor (§8.6.2). This is how "which part of the circle follows the mouse" is expressed |
| *(v3.1)* Group and tag targets | — | — | `Group[*].target` or `tag:name.target` applies one binding to every piece, clone or tagged layer. Each target reads its own `index`, `count`, `home` and `random` (§8.6.4) |

**Channel blending.** Several reactions often target one channel: a float (Ambient), a magnet (Reactive) and a tilt (Reactive) all move a button's transform. v0.1 of the grammar resolved a shared property by priority (winner takes the property, grammar §6.2). v0.2 adds **blend modes** per binding (grammar rule 6.9):

| Blend | Composition | Default for |
|---|---|---|
| `replace` | Priority order decides (grammar §6.2 with Reactive inserted, §13.2) | Enums, colours, uniforms |
| `add` | Values sum after each chain | Transform offsets (`transform.x/y/z`, rotations) |
| `multiply` | Values multiply | Scales, opacity, speeds, intensities |
| `max` | Largest value wins | Glows, highlights |

Blended results are clamped to the property's registry range. The Single Transform Authority synthesis (9.3) consumes the blended channels, so there is still exactly one writer of `style.transform`.

---

## 7. Surfaces & the Compositor (Phase 61)

### 7.1 Roles
| Role | Layout | Pointer events | Typical effects |
|---|---|---|---|
| `background` | Fills its parent frame/section behind siblings (`position: absolute; inset: 0`, back of stack) | **None** (reads the Input Bus instead, so it never steals clicks) | Shader fields, grids, particle fields |
| `inline` | A normal layer in the flow | As its archetype allows | Card glare, button sheen, shader badges |
| `overlay` | Above content inside its frame | None | Grain, light leaks, sparkles |
| `cursor` | Page/frame singleton above everything | None | Followers, trails, splash |
| `texture-source` | Invisible; feeds another surface | — | Text, image or video used by a distortion |

### 7.2 Backends and fallback chain
`webgpu` (opt-in, three.js TSL) → `webgl2` (baseline) → `canvas2d` / `svg` / `css` (the effect's authored fallback) → `poster` (a static frame rendered at export). WebGL1 is not a target. Every effect declares its chain (Graceful Degradation Law); the rules refuse an effect without one.

### 7.3 Strategy and budget
Browsers cap live WebGL contexts (Chrome: 16 on desktop, 8 on Android) and silently lose the oldest when a page creates more. The compositor is therefore the only code that creates contexts (Surface Budget Law). Candidate strategies, chosen per role by benchmark in the Phase 61.1 decision record:

| Strategy | How | Good for | Cost |
|---|---|---|---|
| **A. Budgeted per-surface canvases** (default candidate) | Each surface owns a canvas while visible; over budget, the least-visible surface releases its context and shows its poster | Most pages; correct DOM stacking | Context churn when scrolling fast (mitigated by hysteresis) |
| **B. Shared backdrop canvas** | One fixed canvas behind the page; surfaces draw into their rect with viewport/scissor | Many backgrounds on one long page | Only works behind all DOM; needs per-frame rect sync |
| **C. One hidden context, bitmap blits** | Render offscreen, copy to 2D canvases | Many small previews in the editor | A copy per frame per surface |

Default budget: **≤ 8 live GL surfaces on desktop, ≤ 4 on mobile**. That is half the browser caps, which leaves room for the host page and third-party embeds.

### 7.4 Device tiers
| Tier | Rendering | Typical device |
|---|---|---|
| T0 | Poster only (no animation) | No WebGL2, save-data, or reduced motion with the `freeze` policy |
| T1 | Authored Canvas 2D/CSS fallback, or GL at 0.5 DPR and 30 fps | Low-end phones, old integrated GPUs |
| T2 | GL at DPR ≤ 1.25, full passes, 60 fps target | Mid-range phones, mainstream laptops |
| T3 | GL at DPR ≤ 2, all passes, 60–120 fps | Recent laptops/desktops, high-end phones |

The tier comes from a short startup probe plus a **frame-time controller with hysteresis**: it steps down after 30 frames over budget, and steps back up after 5 s under 60% of budget. Resolution scales before passes are dropped. Ambient effects with no input for 3 s may cap at 30 fps.

### 7.5 Lifecycle
`create → warm` (async compile; parallel shader compile where the browser offers it) `→ run → pause` (offscreen, hidden tab, reduced-motion freeze) `→ release` (budget pressure: the context is deliberately lost and the poster shown) `→ restore` (after release or `webglcontextlost`). A context loss never shows an empty box: the poster covers the gap.

### 7.6 Passes
Per surface: an ordered **pass stack** of program passes, **feedback passes** (ping-pong render targets for trails, afterimages and simulations), and a **post stack** (grain, dither, vignette, bloom-lite, pixelate, chromatic offset, CRT) with blend modes (normal, add, screen, multiply, overlay, soft light). Float or half-float targets are used when available, with an 8-bit fallback path declared per program.

### 7.7 GPU resilience: when the browser takes the GPU away *(v3.1)*
A browser can take a WebGL canvas away at any time; the canvas then goes blank ("context lost"). This section lists every way it happens, how we prevent it, and what the user sees if it happens anyway. **The user never sees an empty box, and the rest of the page keeps working.**

| Cause | What happens without mitigation | Prevention | If it happens anyway |
|---|---|---|---|
| **Too many live contexts** (Chrome: 16 desktop, 8 Android) | The browser silently kills the oldest canvas | Only the compositor creates contexts (Surface Budget Law). The budget is 8 on desktop and 4 on mobile. Offscreen surfaces release theirs. Many backgrounds on one page share one backdrop canvas (strategy B). Editor thumbnails are video loops, not contexts | The poster covers the surface. The context is re-acquired when the surface is visible again |
| **GPU driver reset or GPU-process crash** | Every canvas on the page goes blank | Shaders have bounded loops and texture-fetch budgets, so they never trip the GPU watchdog. Compiles are asynchronous. Programs that lost the context twice are disabled (FX-SAFE-01) | On `webglcontextlost`, call `preventDefault()` and show the poster. On `webglcontextrestored`, rebuild programs, buffers and textures from the effect definition (CPU-side sources are kept), within 1 s. After a second loss, stay one tier lower for the session |
| **Memory pressure** (large render targets, many textures, phones) | Context loss, or iOS reloads the tab | Device tiers: DPR cap, dynamic resolution, half-float only when supported, texture-size caps, particle caps. Textures are released on pause | As above, and the tier steps down |
| **Tab hidden or app switched** (mobile) | Frames stop, and the OS may drop GPU resources | Pause on `visibilitychange`; never render hidden surfaces | Restore on return, with the poster until the first frame |
| **WebGPU device lost** | `device.lost` resolves | The same budgets | Recreate the device, else fall back to WebGL2 |
| **Thermal throttling** | The frame rate sinks | The frame-time controller lowers resolution, then fps (§7.4) | The tier steps down; ambient effects cap at 30 fps |
| **One GPU/driver model crashes on one effect family** | Repeated losses in the field | Opt-in telemetry spots it (ROADMAP 82.2) | A remote kill switch forces that family to its fallback on the affected GPUs (82.3) |
| **No WebGL2 at all** | — | Feature detection | The authored Canvas 2D/SVG/CSS fallback, then the poster |

**Most interactive effects don't need a GPU context at all.** DOM-level effects animate CSS transforms on the browser compositor: split letters, magnet, tilt, follow, fields and effectors, and kinetic bodies (§8.6). They can't lose a context. The rules prefer that route whenever it can express the effect (8.3 routing).

**Tested, not assumed.** Phase 61's gate forces a context loss through the `WEBGL_lose_context` extension and checks for the poster and recovery within 1 s. Phase 71 runs GPU CI. Phase 84 soaks every library effect for 10 minutes on low-end phones.

### 7.8 Where WebGL is used, and where it isn't *(v3.3)*
WebGL is used **only where an effect needs it**. The rules (Phase 8.3) pick the lightest backend that can express an effect, in this order, and stop at the first that works (FX-PERF-07):

| Order | Backend | Used for | Examples |
|---|---|---|---|
| 1 | **CSS / DOM** (transforms, opacity, filters, CSS animations) | Anything that moves, fades, tilts or scales whole layers, even hundreds of them | Split letters fleeing a circle, magnet, tilt, follow, fields and effectors, kinetic bodies, text reveals, most menus and cards |
| 2 | **SVG** | Vector drawing, morphing, masks, light filters | Stroke draw, morphing icons, displacement fallback |
| 3 | **Canvas 2D** | Many simple marks that don't need shaders | Dot grids and lattices at T1, small particle counts, confetti |
| 4 | **WebGL2 through a minimal 2D helper** (in-house or OGL; decision 0005) | Per-pixel work: shader backgrounds, distortion, feedback trails, GPU particles, fluid | Interactive backgrounds, liquid cursors, image ripples |
| 5 | **three.js** (WebGL2, or WebGPU through TSL) | **Real 3D only**: meshes, lights, GLTF models, 3D cameras | Floating 3D object, 3D card flip, GLTF showcase |

**three.js is not the default GPU path.** A 2D shader background doesn't need a 3D engine. The minimal helper is a few KB and allocates only what the effect uses, whereas three.js brings a scene graph, materials and programs. three.js is loaded lazily, only on pages that contain a 3D layer. Most interactive effects in the library use no WebGL at all, and **a device without WebGL2 still gets every DOM effect** plus each GPU effect's fallback.

### 7.9 GPU memory: budget and resource lifecycle *(v3.3)*
Context limits (§7.3) and context loss (§7.7) are only half of it. The other half is **how much GPU and canvas memory a page uses**. Running out of it causes context loss on any device, and on iPhones the tab reloads ("A problem repeatedly occurred"). The compositor therefore keeps a **memory ledger**.

**The ledger.** Every GPU resource registers its estimated size when it is created, and is removed when it is released. It covers textures, render targets, canvas backing stores, vertex buffers and shader programs, whether made by the 2D helper or by three.js. The ledger is the single source of "how much is in use", because WebGL can't report GPU memory directly.

| Resource | Estimated size |
|---|---|
| Texture (RGBA8) | width × height × 4 bytes × 1.33 with mipmaps |
| Texture (KTX2/Basis, GPU-compressed) | About 4–8× smaller than RGBA8 |
| Render target | width × height × bytes per pixel (RGBA8 = 4, RGBA16F = 8) × the number of targets (ping-pong = 2) |
| Canvas backing store | width × height × 4 bytes × buffers |
| Vertex buffers | Their byte length |
| Shader programs | A fixed estimate per program, and a count budget |

**Budgets per device tier** (initial targets, calibrated on real devices in Phase 84 and by field telemetry in Phase 82):

| Tier | GPU and canvas memory for LazyLayout effects on one page | Largest texture edge | Simulation and feedback resolution |
|---|---|---|---|
| T1 (low-end phones) | 96 MB | 1024 px | ≤ 1/8 of the surface |
| T2 (mid phones, mainstream laptops) | 256 MB | 2048 px | ≤ 1/4 of the surface |
| T3 (recent laptops and desktops, high-end phones) | 512 MB | 4096 px | ≤ 1/2 of the surface |

**When a page nears its budget**, the compositor degrades in this order, and never crashes:
1. lower the resolution of the busiest surface;
2. drop post passes;
3. swap textures to a smaller size;
4. release offscreen surfaces;
5. show posters.

**Resource rules:**
- **Textures.** Images are downscaled to the tier's largest edge when uploaded, or at import (Phase 54), never uploaded at camera resolution. GPU-compressed textures (KTX2/Basis, transcoded in a worker) are used where supported. Decoded `ImageBitmap`s are closed after upload; the CPU keeps only the source reference needed for context restore. A video texture updates only while visible and playing.
- **Render targets.** Simulation, feedback and post targets are **pooled and shared** between effects of the same size and format. They run at the tier's reduced resolution, use half-float only when supported (with a declared 8-bit path), and are released when the surface pauses.
- **Canvases.** A canvas backing store never exceeds about 16.7 million pixels (Safari's per-canvas area limit, e.g. 4096 × 4096). The DPR cap (§7.4) enforces it, including on large iPads. A released canvas has its width and height set to 0, because Safari otherwise holds its memory until garbage collection. Older iOS versions also cap *total* canvas memory, at a few hundred MB depending on version, so the ledger counts canvas memory too.
- **three.js** (Phase 18):
  - one renderer per context, shared by every 3D layer through the compositor, never one renderer per layer;
  - every geometry, material, texture and render target a layer creates is reference-counted and `dispose()`d when its last user is removed, paused-and-released or unmounted;
  - loader caches for assets no longer referenced are cleared (the R3F loader cache and three's own cache);
  - repeated meshes use instancing, and shared materials are reused;
  - GLTF models use Draco or meshopt compression and KTX2 textures;
  - programs are precompiled asynchronously so first use doesn't stutter.

  `renderer.info.memory` is shown next to the ledger in the dev overlay.
- **Shader programs.** Identical programs are compiled once and shared. Each page has a program-count budget.
- **JavaScript heap.** Effect runtimes allocate nothing per frame: typed arrays and object pools for particles and bodies, no per-frame closures, arrays or strings (extends ROADMAP 56.3). Garbage-collection pauses are frame drops.
- **The editor** runs under its own budget:
  - only the focused frame renders live surfaces (§7.3, 61.4);
  - library thumbnails are posters that play a short loop on hover, one at a time;
  - decoded images sit in a least-recently-used cache with a byte limit;
  - undo history references assets by content hash, never by copies.

**Tested, not assumed:**
- **Leak test** (Phase 61 and 71): each library effect is mounted and unmounted 100 times. The ledger must return to zero, `renderer.info.memory` must return to its baseline, and the JavaScript heap (after a forced garbage collection) must grow less than 2 MB.
- **Stress test:** 20 effects on one page stay under the tier budget.
- **Soak test** (Phase 84): 10 minutes on a low-end iPhone and Android device with no tab reload and no context loss.
- **In the field** (Phase 82): opt-in telemetry reports peak ledger size, tier downgrades, context losses, and **unexpected reloads**. A flag is set when a page loads and cleared when the page is hidden, so a flag still set on the next load means the tab was killed. Remote kill switches can lower an effect family's budget on the affected devices.

---

## 8. Programs

### 8.1 Shader programs (Phase 62)
**Uniform contract.** Every program receives `uTime` (transport seconds), `uResolution` (px × DPR), `uSeed`, and, when bound, `uPointer` (uv), `uPointerVelocity`, `uPointerDown`, `uScroll`, `uIntensity`, plus its own props.

**Shader Graph node library.** Inputs (uv, time, pointer, resolution, prop, seed) · maths · noise (value, simplex, Perlin, Worley, fbm, curl) · SDF shapes and smooth booleans · patterns (grid, dots, stripes, rings, Voronoi) · colour (cosine palettes, gradients from design tokens, OKLab mix, hue shift) · distortion (domain warp, polar, twist, ripple, lens, displacement map) · texture sampling · feedback (previous frame) · post nodes · output.

**Compilation.** The graph compiles to GLSL ES 3.00 (WebGL2) and to TSL (three.js WebGPURenderer, which falls back to WebGL2). Raw GLSL (Pro) is allowed. Its uniform block becomes the props schema, and compile errors map to lines.

**Safety** (Untrusted Code Law): loops need constant bounds; texture fetches count against a per-pixel budget; compiles are asynchronous. A program that triggers context loss twice is disabled for the session, and the rules explain why (FX-SAFE-01).

### 8.2 Particles (Phase 63)
A Niagara-style module stack: **emitter → spawn → update → render**.
- **Forces:** gravity, drag, noise and curl fields, vortex, pointer attract/repel/orbit, spring-to-home (particles that settle into a shape, logo or text), bounds (bounce, wrap, kill).
- **Backends by tier:** CPU (Canvas 2D or GL points, ≤ 5k), GPU state textures on WebGL2 (≤ 250k), WebGPU compute (opt-in, ≤ 1M).
- **Render modes:** points, sprites, links (nearest neighbours through a spatial hash; `SpatialIndex` is reused), trails (feedback pass), instanced meshes (via Phase 18).
- **Interaction modes as affordances:** grab, repulse, attract, bubble, burst on tap, scatter on scroll.

### 8.3 Simulations (Phase 64)
| Module | Technique | Effects it enables |
|---|---|---|
| Fluid | Stable fluids (advect, diffuse, project) on GPU targets, with pointer splats | Splash cursors, liquid backgrounds, ink |
| Spring lattice | 2D mass-spring grid with neighbour springs | Grid distortion, elastic meshes, dot fields with shockwaves |
| Verlet ropes and cloth | Position-based constraints | Ribbons, strands, lanyards, flags |
| Rigid bodies | Circles and boxes (small in-house solver, or a permissively licensed library chosen by benchmark) | Ball pits, falling letters, stacking badges |
| Metaballs / SDF blobs | Field sum with threshold | Gooey cursors, blob buttons |
| Reaction–diffusion (optional) | Gray–Scott on GPU | Organic patterns |

**Determinism** (decision 0006, Phase 64.1): fixed-step integration (e.g. 1/120 s substeps), seeded PRNG, input tapes, and a snapshot every N frames. In the editor, `evaluate()` of a stateful layer replays from the nearest snapshot. Exports run live on real input, and parity tests use tapes.

### 8.4 Texture sources (Phase 65)
Images and video (from the asset store, 54), text rendered to SDF/MSDF or canvas textures (re-rendered on font load and resize), and rasterised SVG. **A general DOM subtree can't be turned into a texture** on the web. For DOM content, the rules offer the SVG-filter/CSS path instead. The source content always stays in the DOM (real text, real `alt`), and the GL surface is `aria-hidden`.

### 8.5 Cursor layer (Phase 66)
Modes: follower (dot/ring with spring), blob (metaball), trail (feedback), splash (fluid module), target brackets, image trail, magnetic snap. Cursor **states** follow the hovered target type (link, button, text, input, drag). "Hide the native cursor" is opt-in. It is never applied over text inputs, never under reduced motion, and never on coarse pointers.

### 8.6 Kinetic composition: build any interaction from primitives (Phases 88–91) *(v3.1)*
Library effects are recipes. These primitives let a user build their own interactions from scratch, the way Unreal users build with actors, components and Blueprints, and Cinema 4D users build with cloners and effectors. They work on ordinary DOM layers and need no GPU. The reference build is §12.7: an invisible circle follows the mouse by a chosen point, letters split from a card's text flee the circle, and they spring back home.

#### 8.6.1 Helper layers (Phase 88.1)
| Property | Values | Meaning |
|---|---|---|
| `render.role` | `content` (default) · `helper` | A **helper** is never rendered in Preview or export. In Design mode it draws as a dashed outline with its name, like an Unreal trigger volume, and can be hidden with "Show helpers". It keeps its geometry, pins, follow, fields, colliders and Blueprint events |

In export, helpers become runtime data (shape, position, size), not DOM nodes. They never take focus or affect layout (rule 6.17).

#### 8.6.2 Pins and the `position(pin)` target (Phase 88.2)
A **pin** is a named point in layer-local space. There are 9 box presets (corners, edge midpoints, centre) plus custom pins dragged on the canvas, which may sit outside the box to make an offset follow. The **anchor** (transform origin, Phase 51.1) is also a pin, but the follow pin can differ from it: a layer can follow by its bottom edge and rotate around its centre.

With frame origin `F` (the layer's `frame.x/y`), anchor `A` and pin `P` in layer-local px, rotation `R(θ)`, scale `S(s)` and transform offset `T`:

```
pinWorld = F + A + R(θ)·S(s)·(P − A) + T
L.position(P) = v   ⇒   T = v − F − A − R(θ)·S(s)·(P − A)
```

So `pointer.px(frame) |> spring(300, 28) -> circle.position(bottomCentre)` makes the circle's bottom-centre point chase the cursor.

#### 8.6.3 Follow component (Phase 88.3)
| Parameter | Options |
|---|---|
| Target | Pointer · another layer's pin · a path (with speed) |
| Pin | Any pin on the follower (default: centre) |
| Offset | px, in frame space |
| Lag | None · smooth (τ) · spring (stiffness, damping) |
| Axis | x · y · both |
| Bounds | None · stay inside the parent frame · custom rectangle |
| When the target leaves | Stay · return home · fade out |
| Rotation | None · face the direction of motion · lean by speed (max °) |
| Scale | Constant · scale by speed (min, max) |
| Touch | Follow the finger while pressed · hide · autopilot |
| Reduced motion | Snap without lag · off |

Follow compiles to a binding set (§3.3) plus a small state machine for the leave behaviour.

#### 8.6.4 Split and clone groups (Phase 89)
- **Split** (one click on a text layer): letters, words or lines. It is grapheme-aware, and non-destructive: the source stays editable and pieces are regenerated with their overrides kept. Pieces sit exactly where the browser laid out the text, re-measured on font load, resize and breakpoint. **Detach** makes the pieces independent layers.
- **Clone**: any layer into a grid, ring, path, scatter or linear steps. Clones can be overridden one by one, like instances.
- **Per-piece and per-clone attributes**, readable by bindings, effectors and Blueprints:

| Attribute | Meaning |
|---|---|
| `index`, `count` | Position in the group and group size |
| `lineIndex`, `wordIndex`, `char` | Split only |
| `u`, `v` | Grid clones only: 0–1 coordinates |
| `home` | The rest position (where it was laid out) |
| `random` | A seeded 0–1 value per piece; stable across reloads and exports |

- **Tags** on any layer (like Unreal actor tags). Targets can be `Group[*]`, `tag:letter` or one layer.
- *(v3.2)* **Spawner** (Phase 89.4): the `Spawn` action makes runtime copies of a layer the user designed:
  - placed at the pointer, a pin or a point, with an initial velocity, spin and Variety;
  - each copy has a lifetime and an exit (fade, shrink, fall off), and can be a kinetic body;
  - copies are pooled, capped per tier, never saved to the document, and never server-rendered;
  - over the cap, spawning switches to GPU particles using the layer as a sprite.

  This is how "confetti made of my own star shape" or "an image trail of my own photos" is built.

#### 8.6.5 Fields and effectors (Phase 90)
A **field** is a falloff shape attached to any layer, usually a helper. Shapes: circle, box, capsule, the layer's own shape, a path's stroke, linear, or noise. It gives every point a weight 0–1, with an inner radius, an outer radius and a falloff (hard, linear, smoothstep, inverse-square or a custom curve).

An **effector** turns a field's weight into changes on target layers:

| Effector | What each target does | Typical use |
|---|---|---|
| **Keep Out** | Is projected out of the shape to its boundary plus a margin: a **hard constraint** applied after smoothing, so a target is never inside at a rendered frame | Letters that won't enter the cursor circle |
| Push / Attract / Swirl | Moves away from, toward, or around the field centre, scaled by weight | Magnetic grids, whirlpools |
| Transform / Style | Scale, rotate, opacity, blur or colour by weight | Letters shrink or glow near the cursor |
| Look At | Rotates to face the field centre | Magnet lines, eyes |
| Jitter | Seeded per-target randomness (uses `random`) | Letters scatter "here and there" instead of in lockstep |
| Custom | Weight → curve → any animatable property | Anything |

Every effector has a strength, spring smoothing so targets ease out and spring back **home**, and a blend mode (grammar rule 6.9). The smoothing is a perceptual spring (Bounce and Time, §13.4); stiffness and damping appear only in Pro. Effectors stack in a listed order. Evaluation is pure given the field's transform and the targets' homes (the springs replay under the Deterministic Replay Law), and costs O(targets) per frame with a spatial hash to skip distant ones.

*(v3.2)* **One evaluation space** (Phase 90.4). Fields, targets, colliders and bodies are evaluated in the top-level frame's space (Document-Space Law), using each layer's full world transform: parents, rotation, scale and parenting. Results are converted back into each target's local `transform.*`. So a circle in the frame and letters inside a rotated card interact correctly.

*(v3.2)* **Stay inside** (Phase 90.5). Targets can be confined to their parent, the frame, or nothing. Pushed letters then stay on the card.

#### 8.6.6 Colliders, kinetic bodies and contact events (Phase 91)
| Component | Options |
|---|---|
| **Collider** | Shape auto-derived from geometry (circle, box, rounded box, capsule, convex polygon from a path) or custom. Padding. **Trigger** (overlap only) or **solid**. Collision layer and mask (e.g. "Cursor" collides only with "Letters") |
| **Body** | **Static** · **kinematic** (moved by follow, bindings or the timeline; its velocity comes from its motion, so it transfers momentum) · **dynamic** (mass, damping, bounciness, friction, gravity scale, a **home spring** with stiffness and damping, max offset, rotation on/off, sleep) |

**Solver.** One 2D physics core (`src/core/physics2d/`), shared with 64.2's rigid bodies:
- spatial-hash broadphase, reusing `SpatialIndex`;
- circle/box/polygon narrowphase (SAT);
- position-based contact resolution with velocity correction;
- a fixed step of 1/120 s, deterministic ordering, seeded randomness, and snapshots (decision 0006).

**Contact events** for Blueprints are `OverlapBegin`, `OverlapStay` (every frame while overlapping), `OverlapEnd` and `Hit` (a solid contact above an impulse threshold). Each carries `other`, contact point, normal, depth, relative velocity and impulse. Actions: add force, add impulse, set velocity, spring to (home or a point), keep out, add spin, set body type, enable/disable collider, radial explode.

**Debug view.** "Show collision" draws colliders, contacts, normals and velocities in Design and Preview modes.

*(v3.2)* **Draggable bodies** (Phase 91.2). While the pointer drags a layer, it is kinematic and follows the pointer, so it pushes others. On release it becomes dynamic with the throw velocity, with optional snap points and bounds. `DragStart`, `Drag` and `DragEnd` events reach Blueprints.

#### 8.6.7 Effector or physics?
| | Fields & effectors (90) | Colliders & bodies (91) |
|---|---|---|
| Cost | Lowest: O(targets), pure | Higher: a solver step, contacts |
| Determinism | Pure (springs replayed) | Fixed-step replay |
| Momentum, bounces | Spring overshoot only | Real momentum from the moving collider; bounces |
| Targets hitting each other | No | Yes (opt-in, grammar rule 6.20) |
| Events for Blueprints | `FieldEnter`/`FieldExit` | `OverlapBegin/Stay/End`, `Hit` |
| Best for | Most cursor-reactive text, grids and lines | Ball pits, falling letters, letters that bump each other |

The Simple rule "While *A* overlaps *B* → keep it outside" compiles to the effector when nothing needs momentum or body-to-body contacts, and to physics otherwise. The user sees one rule either way.

*(v3.2)* **Rules set up what they need** (Phase 73.5). Writing a rule that mentions overlap, hit, field enter or drag adds the missing pieces:
- a field or collider sized from each layer's geometry (a circle for an ellipse, boxes for letters);
- a matching collision layer and mask;
- home springs on moved text pieces.

The pieces are listed under the rule and stay editable. The user never has to know that "overlap" needs colliders.

---

## 9. States & Affordances

**States.** An effect can define named states (e.g. `Calm`, `Excited`) as prop snapshots. Transitions between them use Phase 11 springs or tweens, so "the background gets excited when the CTA is hovered" is a state change with a smooth transition, not a jump.

**Affordances** are the reactions an effect supports. Each one is a named binding recipe, and together they make the one-step Reactivity card possible (Phase 60.3):

| Affordance | What the user sees | Recipe sketch (per effect, tuned by Strength/Smoothness) |
|---|---|---|
| `follow` | The effect's focus drifts toward the cursor | `pointer.uv(local) \|> smooth(τ) -> S.uniform.uFocus` |
| `bend` | The pattern warps toward the cursor | `pointer.uv(local) \|> smooth(τ) -> S.uniform.uWarpCenter`; `pointer.inside(parent) \|> smooth(0.3) \|> mul(k) -> S.uniform.uWarp` |
| `repel` / `attract` | Elements push away / pull in | `pointer.uv(local) -> S.param.fieldCenter`; strength → `S.param.fieldStrength` (sign by mode) |
| `ripple` | Rings on movement or tap | `pointer.speed \|> threshold(a,b) \|> edge(rise) -> event(Ripple)`; `pointer.down \|> edge(rise) -> event(Ripple)` |
| `glow` | Brighter near the cursor | `proximity(self) \|> falloff(smoothstep, r) -> S.uniform.uGlow blend max` |
| `tilt` | 3D tilt of a layer | `pointer.ndc(local) \|> spring(k,c) \|> remap(-1,1,-θ,θ) -> L.transform.rotateY/rotateX blend add` |
| `parallax` | Depth shift by layer depth | `pointer.ndc(frame) \|> smooth(τ) \|> mul(depth) -> L.transform.x/y blend add` |
| `speed-up` / `calm-down` | Motion quickens with movement / settles when still | `pointer.speed \|> remap(0,2000,1,3) \|> smooth(0.5) -> S.uniform.uSpeed blend multiply` |
| `burst` | Particles spawn on click or tap | `pointer.down \|> edge(rise) -> event(Burst)` → emitter burst |
| `trail` | A history of the pointer | `pointer.uv(page) \|> trail(n) -> S.param.trail` or a feedback pass |
| `reveal` | Content shows through under the cursor | `pointer.uv(local) \|> smooth(τ) -> S.uniform.uMaskCenter` |
| `distort` | Texture displaces with pointer speed | `pointer.velocity`-driven displacement uniforms |
| `magnetize` | A layer is pulled toward the cursor | `pointer.px(local) \|> spring(k,c) \|> clamp(±12) -> L.transform.x/y blend add when state(Hover)` (target stability, rule 6.12) |
| `scatter` | Spreads out on scroll | `scroll.velocity \|> abs \|> smooth(0.2) -> S.param.scatter` |

---

## 10. Rules

These are the effect-specific rules the Rules Engine (Phase 8) executes. Each has a stable code, a check type (static at edit time, sampled in the Performance/A11y labs, or runtime), and a fix. The grammar-level rules they rely on are `lazylayout_element_grammer.md` §13.4.

### 10.1 Performance
| Code | Rule | Check | Fix offered |
|---|---|---|---|
| FX-PERF-01 | Only the compositor creates GPU contexts; live GL surfaces per page stay within the tier budget (desktop 8, mobile 4) | Static + runtime counter | Merge surfaces into one pass stack; lower-priority surfaces become posters |
| FX-PERF-02 | Every surface declares a cost tier; the page's summed cost fits the device tier | Static (cost model) + sampled | Lower DPR, fewer particles, 30 fps ambient cap, swap to the fallback |
| FX-PERF-03 | Offscreen and hidden surfaces make no draw calls | Runtime (instrumented) | Automatic (compositor) |
| FX-PERF-04 | Particle counts, simulation resolutions and pass counts stay within per-tier caps | Static | Clamp with explanation |
| FX-PERF-05 | Continuous bindings never target `layout`-class properties | Static | Rewrite to `transform.*` (decision 0003) |
| FX-PERF-06 | Exported runtime + programs stay within the family size budget | Export CI | Drop unused modules; lazy-load heavy modules |
| FX-PERF-07 *(v3.3)* | GPU only where needed: an effect is routed to the lightest backend that can express it (CSS/DOM → SVG → Canvas 2D → WebGL2 helper → three.js). three.js is used only for real 3D and loads lazily (§7.8) | Static (routing) | Re-route; explain the choice in the inspector |

### 10.1a Memory *(v3.3)*
| Code | Rule | Check | Fix offered |
|---|---|---|---|
| FX-MEM-01 | Every GPU resource is registered in the memory ledger, and a page stays within its tier's GPU/canvas memory budget (§7.9) | Runtime ledger + stress test | Degrade in order: resolution → passes → texture size → release offscreen → poster |
| FX-MEM-02 | Textures are capped at the tier's largest edge, downscaled at import or upload, GPU-compressed (KTX2/Basis) where supported, and their decoded bitmaps closed after upload | Static + runtime | Downscale; convert to KTX2 |
| FX-MEM-03 | Simulation, feedback and post render targets run at the tier's reduced resolution, are pooled and shared, and are released on pause | Runtime ledger | Lower the resolution fraction |
| FX-MEM-04 | Every resource is released when its layer is removed, paused-and-released or unmounted. For three.js: `dispose()` on geometries, materials, textures and render targets, loader caches cleared, one shared renderer per context | Leak test (mount/unmount 100×) | Automatic, via the ledger's reference counts |
| FX-MEM-05 | Canvas backing stores stay under about 16.7 M pixels each, and released canvases are set to 0 × 0 (Safari) | Static + runtime | Clamp DPR |
| FX-MEM-06 | Effect runtimes make no per-frame JavaScript allocations (typed arrays and pools), so garbage collection never drops frames | Benchmark test (heap sampling) | Rewrite with a pool |

### 10.2 Input
| Code | Rule | Fix offered |
|---|---|---|
| FX-IN-01 | Every binding that reads `pointer.*`, `proximity`, `hover` or `press` belongs to an effect with a declared **touch behaviour**: `tap` (reaction at the tap point), `drag` (follow while dragging), `autopilot` (seeded wander), `gyro` (device tilt, opt-in and permission-gated), `static` | Pick the effect's recommended default |
| FX-IN-02 | Listeners are passive; decorative effects never call `preventDefault` on touch or wheel events and never block scrolling | Automatic (Input Bus) |
| FX-IN-03 | `background`, `overlay` and `cursor` surfaces have `pointer-events: none` | Automatic |
| FX-IN-04 | Interactive archetypes (Button, Link, Card when clickable) move at most 12 px under reactive displacement, so pointer targets stay stable (grammar rule 6.12) | Clamp |

### 10.3 Accessibility
| Code | Rule | Check | Fix offered |
|---|---|---|---|
| FX-A11Y-01 | Every effect declares a reduced-motion policy: `freeze` (poster frame), `calm` (≤ 20% speed/amplitude, no pointer displacement over 4 px) or `off` | Static | Default by family (backgrounds: `freeze`; cursor effects: `off`) |
| FX-A11Y-02 | Auto-playing motion that lasts more than 5 s alongside other content offers a pause mechanism (WCAG 2.2.2): an exported pause control or the page-wide `data-motion="paused"` switch | Static | Add the pause control |
| FX-A11Y-03 | No more than 3 general or red flashes per second (WCAG 2.3.1), measured on sampled frames under an aggressive input tape | Sampled (Phase 29/71) | Lower contrast or speed; add temporal smoothing |
| FX-A11Y-04 | Text over an animated surface keeps ≥ 4.5:1 contrast (3:1 for large text) across sampled frames | Sampled | A scrim, a text-safe mask that softens the effect under text, or lower intensity |
| FX-A11Y-05 | Decorative surfaces are `aria-hidden` and have no focusable content; texture sources keep the real text and images in the DOM | Static | Automatic |
| FX-A11Y-06 | Reactions that convey information have a keyboard/focus equivalent (`focus(L)` mirrors `hover(L)`) | Static | Add the focus binding |
| FX-A11Y-07 | The cursor layer never hides the native cursor over text inputs, under reduced motion or on coarse pointers, and never covers focus rings | Static + runtime | Automatic |

### 10.4 Determinism
| Code | Rule |
|---|---|
| FX-DET-01 | Randomness comes only from the instance seed (seeded PRNG); `Math.random()` is banned in effect code (lint) |
| FX-DET-02 | Time comes only from the transport (`time`, `frame.dt`); `Date.now()`/`performance.now()` are banned in programs and operators |
| FX-DET-03 | Stateful modules use fixed-step integration and snapshots, and are replayable from `(seed, tape, step)` |

### 10.5 Export
| Code | Rule |
|---|---|
| FX-EXP-01 | Exported code imports no LazyLayout package; the runtime modules it needs are copied in as readable source with a NOTICE (PRD §10.6) |
| FX-EXP-02 | SSR-safe: no `window`/`document` access at module scope; the poster renders on the server |
| FX-EXP-03 | Poster first, init after LCP/idle, reserved box (CLS = 0) |
| FX-EXP-04 | Unmount releases contexts, listeners and workers (tested by mounting/unmounting 100 times) |

### 10.6 Licensing
| Code | Rule |
|---|---|
| FX-LIC-01 | Library effects are original implementations; each records its inspiration source and an originality checklist (Phase 25.4, 85.3). No third-party effect code is copied |
| FX-LIC-02 | GSAP never runs in the editor, and no default route or library effect requires it. GSAP's Standard License (checked 2026-09-26) prohibits "any implementation and/or use of GSAP Products in tools that allow users to build visual animations without code" that compete with Webflow's visual animation building (`LICENSES.md` GATE-01) |
| FX-LIC-03 | Imported code components keep their licence. Components whose terms forbid redistribution (e.g. "MIT + Commons Clause") stay private to the user's project and can't be published to templates or a marketplace (GATE-03) |

### 10.7 Safety
| Code | Rule |
|---|---|
| FX-SAFE-01 | Shader programs: constant loop bounds, a texture-fetch budget, asynchronous compiles; a program that loses the context twice is disabled for the session |
| FX-SAFE-02 | Code components run only in an opaque-origin sandbox with a typed bridge (Phase 68.2, Untrusted Code Law) |

### 10.8 Kinetic composition *(v3.1)*
| Code | Rule | Check | Fix offered |
|---|---|---|---|
| FX-KIN-01 | Helper layers never render in Preview or export, never take focus, and never affect layout (grammar 6.17) | Static | Automatic |
| FX-KIN-02 | Text pieces moved by effectors or bodies have a home spring. Text returns to readable rest within 3 s after the influence ends, and the full string is exposed to assistive technology exactly once (grammar 6.18) | Static + sampled | Add a home spring; lower max offset |
| FX-KIN-03 | DOM bodies and effector targets per page stay under the tier cap: T1 150, T2 400, T3 800 (initial targets, calibrated in Phase 84) (grammar 6.19) | Static | Offer "Render as GPU particles" (63) with the same behaviours |
| FX-KIN-04 | Keep-Out is a hard constraint applied after smoothing: a target is never inside the field's inner shape at a rendered frame (grammar 6.23) | Tape replay | Automatic |
| FX-KIN-05 | Body-to-body contacts are opt-in per collision layer. By default, pointer-driven colliders affect dynamic bodies only (grammar 6.20) | Static | Enable per layer, with its cost shown |
| FX-KIN-06 | Pointer-driven follows and kinematic colliders declare a touch behaviour (grammar 6.22, extends FX-IN-01) | Static | Default: follow the finger while pressed |
| FX-KIN-07 | Interactive archetypes (Button, Link, clickable Card) used as dynamic bodies or effector targets are capped by target stability (12 px, grammar 6.12) unless marked decorative (grammar 6.24) | Static | Clamp max offset |

---

## 11. Effect Definition Format (Phase 67)

One versioned JSON document per effect, validated by a schema generated from the same source as its TypeScript types (like the MDM, Phase 2.1). Documents store **instances**: `{ effectId, version, propOverrides, bindingOverrides, seed }`.

Example: an original background, *Aurora Veil*:
```json
{
  "schema": "lazylayout.effect/1",
  "id": "fx_aurora_veil",
  "version": "1.0.0",
  "name": "Aurora Veil",
  "category": "background",
  "provenance": { "inspiration": "generic aurora gradient flows", "original": true },
  "props": {
    "colors":    { "type": "colorList", "default": ["token:primary", "token:accent", "#0B1020"], "description": "Band colours, back to front" },
    "speed":     { "type": "number", "default": 0.4, "min": 0, "max": 2, "description": "How fast the bands drift" },
    "intensity": { "type": "number", "default": 0.7, "min": 0, "max": 1, "description": "Brightness of the bands" },
    "scale":     { "type": "number", "default": 1.2, "min": 0.3, "max": 4, "description": "Size of the bands" },
    "grain":     { "type": "number", "default": 0.06, "min": 0, "max": 0.3, "description": "Film grain amount" }
  },
  "surfaces": [
    {
      "id": "veil",
      "role": "background",
      "program": { "kind": "shaderGraph", "ref": "graphs/aurora-veil.graph.json" },
      "passes": ["program", "post:grain"],
      "fallback": ["webgl2", "css:linear-gradient", "poster"],
      "cost": { "tier": "T2", "estimateMsAt1080p": 1.1 }
    }
  ],
  "affordances": ["follow", "bend", "glow", "speed-up", "calm-down"],
  "defaultBindings": [
    "pointer.uv(local) |> smooth(0.18) -> veil.uniform.uFocus",
    "pointer.inside(parent) |> smooth(0.3) -> veil.uniform.uGlow blend max"
  ],
  "states": {
    "Calm":    { "speed": 0.2, "intensity": 0.5 },
    "Excited": { "speed": 1.2, "intensity": 1.0 }
  },
  "policies": {
    "touch": "autopilot",
    "reducedMotion": { "mode": "freeze", "at": 2.0 },
    "pauseControl": "auto"
  },
  "poster": { "at": 2.0 },
  "export": { "runtime": ["ticker", "signals", "gl"], "sizeBudgetKb": 12 }
}
```

Rules on the format: props are the only author-facing parameters (Simple mode shows at most 7, chosen by `priority`); every prop has a description (the AI reads it, PRD §5.3); `fallback` must end in `poster`; `policies.touch` and `policies.reducedMotion` are required; `version` follows semver, and breaking changes ship a migration (67.2).

---

## 12. Worked Examples

Each example lists what the user does in Simple mode, the bindings it produces, and what the rules check.

### 12.1 Cursor-reactive hero background
1. Select the hero frame → **Insert → Backgrounds → Aurora Veil**. The surface fills the frame behind its content.
2. Reactivity card: **Cursor → Bend, clearly**; **Touch → Drift on its own**.
```text
pointer.uv(local) |> smooth(0.18)                         -> veil.uniform.uWarpCenter
pointer.inside(parent) |> smooth(0.3) |> mul(0.6)          -> veil.uniform.uWarp
```
Rules: FX-IN-01 is satisfied (`autopilot`); FX-A11Y-01 (`freeze`); FX-A11Y-04 samples the headline's contrast over the moving bands and offers a text-safe mask if needed.

### 12.2 Dot field with a click shockwave
Insert **Dot Field** (spring-lattice module; Canvas 2D at T1, GL at T2+). **Cursor → Repel**, **Click → Ripple**.
```text
pointer.uv(local)                                    -> dots.param.fieldCenter
pointer.inside(parent) |> smooth(0.15)               -> dots.param.fieldStrength
pointer.down |> edge(rise)                           -> event(Shockwave)
When Custom(Shockwave) on dots -> Impulse(dots, radial, 5)
```
Touch: `tap` (the shockwave fires at the tap point); dragging repels.

### 12.3 Splash cursor
Insert **Cursor → Liquid Splash** (fluid module on the cursor layer).
```text
pointer.uv(page)                                     -> cursor.param.splatPosition
pointer.velocity |> clamp(-4000, 4000)               -> cursor.param.splatForce
```
Policies: reduced motion `off`; coarse pointer: `drag` only (no cursor). The native cursor stays visible unless the user opts in to hiding it (FX-A11Y-07).

### 12.4 Image hover distortion on a card
Select a Card's image → **Effects → Ripple Hover** (texture source + displacement pass). The real `<img>` stays in the DOM.
```text
hover(card) |> spring(170, 22)                       -> img.uniform.uAmount
pointer.uv(local) |> smooth(0.08)                    -> img.uniform.uCenter
```
The card also gets **Cursor → Tilt** (`blend add` on `rotateX/rotateY`, capped by rule 6.12 because a clickable Card is a target).

### 12.5 A whole hero: cross-layer reactions and Blueprint logic
Background, split-text headline, magnetic CTA, spark particles.
```text
proximity(cta) |> falloff(smoothstep, 260) |> spring(120, 16)      -> bg.uniform.uIntensity blend add
pointer.px(local) |> spring(200, 20) |> clamp(-10, 10)              -> cta.transform.x blend add when state(Hover)
When Click on cta -> Burst(sparks, 60), Play(comp_success), SetState(bg, Excited), Wait(1.2), SetState(bg, Default)
```
The first two lines are bindings (continuous). The third is an Interaction Blueprint rule (discrete), which opens as a graph in Pro mode. On touch, `proximity(cta)` comes from the last tap, and `Click` fires on tap.

### 12.6 Particle field that thins on scroll
```text
scroll.progress |> remap(0, 1, 1, 0.3)                -> field.param.density   blend multiply
pointer.uv(local)                                     -> field.param.fieldCenter
```
Reduced motion: `freeze`. Tier caps: 5k particles on T1 (CPU), 60k on T2 (GPU state textures).

### 12.7 The reference build: letters that flee an invisible cursor circle *(v3.1)*
This is the design-freedom test for the whole product. Nothing here is a preset. Every part is a primitive the user places and wires, and every value is editable. No code is written, and no GPU context is used.

**What the user does (Simple mode, about 2 minutes):**
1. Press **O** and Shift-drag a 120 px circle.
2. Inspector → **Role: Helper (invisible)**. The circle now shows only as a dashed outline in Design mode.
3. **Reacts to → Cursor → Follow.** Click the circle's **bottom-centre pin** so that point sits on the mouse, or drag a custom pin anywhere. Set Lag to *Spring*. Touch: *follow the finger while pressed*.
4. Draw a card with the Frame tool (**F**) and type `LAZYLAYOUT` inside it (**T**).
5. Right-click the text → **Split → Letters**. Ten letter layers appear inside a *Split* group, each exactly where it was.
6. **Interactions → + Rule:**
   - "**While** *Cursor Circle* **overlaps** *any letter of LAZYLAYOUT* → **Keep it outside** (margin 6 px) and **give it a spin** (up to 12°, random per letter)."
   - "**When it stops overlapping** → **Spring back home** (Bounce 60%, Time 0.6 s)."

   The rule adds what it needs by itself: a circle field on the circle, box shapes on the letters, and home springs. These are listed under the rule (Phase 73.5).
7. Press **Preview** and move the mouse. The letters part around the invisible circle like water, each tumbling its own way, and spring back when it passes. Record a pointer tape to scrub it on the timeline.

**The document it produces:**
```
Frame "Hero"
├─ Card
│  └─ Split "LAZYLAYOUT" (letters) ── aria-label="LAZYLAYOUT", tags: letter
│     ├─ L   index 0 · home (212, 318) · random 0.73
│     ├─ A   index 1 · home (241, 318) · random 0.12
│     └─ …   (10 pieces, each a real layer)
└─ ◌ Cursor Circle ── role: helper · 120×120
     Follow: pointer, pin = bottomCentre, lag = spring(300, 28), touch = while-pressed
     Field: circle r = 60, hard edge
```

**Effector form** (what the Simple rule compiles to, because nothing needs momentum):
```text
pointer.px(frame) |> spring(300, 28)                  -> CursorCircle.position(bottomCentre)
Effector on CursorCircle → targets: "LAZYLAYOUT"[*]
  KeepOut    margin 6 px · smoothing spring(220, 18) · hard constraint (FX-KIN-04)
  Jitter     rotate ±12° × weight · per-letter seed = random
  Transform  scale 0.9 × weight   blend multiply           (optional)
```

**Blueprint form** (the same rule opened in Pro mode; also the physics variant, where the letters are dynamic bodies and the circle is a kinematic collider that transfers momentum):
```text
When OverlapStay(Cursor Circle) on "LAZYLAYOUT"[*] -> KeepOut(other, 6), AddSpin(other, other.random × 12)
When OverlapEnd(Cursor Circle)  on "LAZYLAYOUT"[*] -> SpringHome(other, 180, 14)
```
```
[OverlapStay]────exec────►[Keep Out]────exec────►[Add Spin]
  collider: Cursor Circle     target ◄── other         target ◄── other
  targets: "LAZYLAYOUT"[*]    margin: 6                degrees ◄── [×] ◄── other.random, 12
  other ──────────────────────┘

[OverlapEnd]─────exec────►[Spring Home]
  other ──────────────────► target · stiffness 180 · damping 14
```

**Ways to push it further, all without code:**
- letters shrink and blur inside the circle (a Transform/Style effector);
- letters change colour by how deep the circle is (a Custom effector on `appearance.color`);
- a click inside the circle blows the letters apart (`When PointerDown → Explode(Cursor Circle, 800)`);
- after 20 hits, play a composition (a variable plus a branch);
- make the circle visible and give it a blur-glass fill (`role: content`);
- replace the circle with any shape: a star field, a path's stroke, another letter.

**Production behaviour, automatic:**
- **Touch:** the circle follows the finger while it's pressed; on release it goes away and the letters spring home.
- **Reduced motion:** the letters don't move.
- **Accessibility:** assistive technology reads `LAZYLAYOUT` once, the pieces are hidden from it, and the text is back at rest within 3 s (FX-KIN-02).
- **Performance:** 10 letters cost almost nothing; 400 still hold 60 fps on the mid tier (Phase 90 gate).
- **Export:** a React component with the letters as `<span>`s moved by CSS transforms, plus `fx-runtime/ticker.ts`, `signals.ts` and `kinetics.ts` (or `physics2d.ts` for the physics variant), with the rules compiled to plain functions (Phase 74).

---

## 13. Simple / Pro Experience

### 13.1 Simple (default)
```
┌ Reacts to ─────────────────────────────────────────────────┐
│ Cursor     [ Bend ▾ ]      Strength ▮▮▮▯▯   Smoothness ▮▮▯▯▯ │
│ Scroll     [ Fade out ▾ ]  Strength ▮▮▯▯▯                   │
│ Hover on…  [ Get started ▾ ] → [ Glow ▾ ]                    │
│ Touch      [ Drift on its own ▾ ]                            │
│ Sound      [ Off ▾ ]                                         │
│ “When the cursor moves over Hero, Aurora Veil bends toward it.” │
└────────────────────────────────────────────────────────────┘
```
- The menus list only the selected effect's affordances, so every option works.
- The same card appears on DOM layers (Button: Magnetize, Tilt, Glow; Card: Tilt, Glare, Spotlight; Image: Tilt, Parallax, Ripple).
- Interactions (discrete) live in the **Motion** tab's Interactions list: "When *Get started* is clicked → Burst *Sparks*, Play *Success*".

### 13.2 Pro (on demand)
- **Signals panel:** the bindings as a node graph with live meters; operators editable; tapes attachable.
- **Shader Graph:** the Material-Editor-style graph (62), or raw GLSL.
- **Particle stack:** emitter → spawn → update → render modules (63).
- **Blueprint graph:** the Event Graph (73.2) with a debugger.
- **Timeline:** input tapes as lanes (23.4), so a reactive effect scrubs like any animation.

### 13.3 Playground
Tapes (record your own pointer, or pick "figure-8", "idle", "fast swipe"), touch simulation, tier preview (DPR, resolution, fps cap), reduced-motion preview, and "Compare with export" (24.5).

### 13.4 No-math authoring: the controls vocabulary *(v3.2)*
The Visual-First Law (ROADMAP Law 17) means a user never has to type a number or a formula. Every technical parameter below has a Simple control that sets it visually. The mapping is 1:1, so Simple and Pro are two views of the same value, and switching between them loses nothing. A CI check fails any Simple face that shows a word from the left column.

| Technical parameter (Pro only) | Simple control | How it is set visually |
|---|---|---|
| Spring stiffness, damping, mass | **Bounce** (0–100%) and **Time** (how long it takes to settle), or a named feel: Snappy, Smooth, Bouncy, Lazy | A live spring curve that settles as you drag. Bounce 0% is critically damped (damping ratio = 1 − bounce); Time sets the natural frequency (ROADMAP 9.1) |
| Smoothing τ | **Smoothness** (0–100%) | A slider with a live trail preview behind the cursor |
| `remap(inMin, inMax, outMin, outMax)` | **From → To** | Two pairs of handles over a live meter: "when the cursor is 0–200 px away → scale 1.2 → 1.0" |
| `threshold(on, off)` | **When faster than… / closer than…** | A marker dragged on the live meter; hysteresis is automatic |
| Falloff curve and exponent | **Edge**: Hard, Soft, Very soft, or draw it | Inner and outer rings dragged on the canvas; a curve you can drag |
| Field radius, margin | **Reach**, **Gap** | Rings dragged on the canvas |
| Pin coordinates | **Follow point** | Click one of 9 dots on the layer, or drag a custom pin |
| Offset vector | **Offset** | Drag the ghost preview |
| Axis lock, bounds | **Move**: both, sideways, up-down · **Stay inside**: card, frame, nowhere | Plain choices |
| Rotation response | **Spin**: none, face direction, lean · "up to N°" | A dial |
| Seeded randomness | **Variety** (0–100%) and a shuffle button | Slider and button; the seed stays hidden |
| Effector weight, strength | **Strength**: Gentle, Clear, Strong, with a fine slider | Presets |
| Mass, friction, restitution | **Weight** (Light, Normal, Heavy), **Grip**, **Bounce** | Presets |
| Gravity vector | **Gravity**: off, light, normal, custom | Drag an arrow for direction |
| Easing curve | Named feels (Gentle, Snappy, Anticipate, Overshoot) | Bezier handles in the curve editor |
| uv, ndc, frame-space coordinates | Never shown | The canvas does the coordinate maths (pin maths in §8.6.2) |
| Binding text form (`signal \|> operator -> target`) | Never shown in Simple | The sentence view and the Reactivity card; Pro's Signals panel shows the graph and the text |

**The AI helps too.** "Make it bouncier", "less wobble", "only react when the cursor is close" are selection-scoped edits (ROADMAP 32) that change these same controls.

---

## 14. Export (Phase 69)

### 14.1 React (Next 16 / Vite)
```
components/AuroraVeil.tsx          client component, typed props, poster-first, cleanup
components/AuroraVeil.poster.webp  poster frame rendered at export
fx-runtime/ticker.ts               one rAF for every exported effect on the page (One Clock Law, exported)
fx-runtime/signals.ts              Input Bus + compiled bindings (plain TS, no eval)
fx-runtime/gl.ts                   minimal WebGL2 helper with the context budget
fx-runtime/NOTICE                  licence notice (MIT)
```
- The client boundary follows the Next 16 docs in `node_modules/next/dist/docs/` (read them before implementing, per `AGENTS.md`).
- The poster reserves the box on the server, so CLS stays 0. The canvas initialises after LCP/idle, pauses offscreen, and respects `prefers-reduced-motion`.
- Only the runtime modules an effect uses are copied (tree-shaken at export time).

### 14.2 Vue 3, Web Component, and embed script
- **Vue 3** single-file component and **`<fx-…>` custom element** (shadow DOM, attributes map to props).
- **Embed script** for Webflow, Framer, Wix, WordPress and plain HTML:
```html
<div data-fx="aurora-veil" data-fx-props='{"speed":0.4}' style="aspect-ratio:16/9"></div>
<script type="module" src="/fx/aurora-veil.js"></script>
```
The script works under a strict nonce-based CSP. In Release 1 the files are self-hosted; hosted CDN embeds arrive with accounts (Phase 81).

### 14.3 Size budgets (initial targets, enforced in CI)
| Family | Runtime + program (gzip) |
|---|---|
| Shader background | ≤ 12 KB |
| Canvas 2D grid/lattice | ≤ 10 KB |
| GPU particles | ≤ 16 KB |
| Fluid / simulation | ≤ 24 KB |
| Cursor layer | ≤ 12 KB (+ module) |
| three.js-based 3D | Lazy-loaded; the chunk is excluded from the initial load |

---

## 15. Verification Strategy (Phase 71)

| Surface class | Comparison | Initial tolerance (calibrated in Phase 71) |
|---|---|---|
| DOM/CSS | Pixel ratio (Phase 4.3) | ≤ 4% (the AUD-42 calibration) |
| Canvas 2D | Pixel ratio | ≤ 2% |
| WebGL2 / WebGPU programs | SSIM plus a FLIP-style perceptual error | SSIM ≥ 0.97; per-effect overrides need a written justification |
| Stateful GPU simulations | Statistics at tape checkpoints (mean luminance, histogram distance) + SSIM | SSIM ≥ 0.90 |
| CPU simulations | State checksum at checkpoints | Exact |
| Particles | Density and centroid at checkpoints | Within 2% |

- Every tolerance tier has a **falsifier**: a deliberately broken fixture (wrong uniform, wrong seed, skipped substep) that must fail.
- CI runs software-rendered WebGL2 in headless Chromium on every PR. A nightly job runs on real GPUs and records the renderer strings.
- Device-tier budgets run on the Phase 84 matrix, with 10-minute soaks for thermal throttling.

---

## 16. Build Strategy: How to Make This Easy (for Us)

1. **Build six engine families, not 80 effects.** Most effects in the reference catalogues fall into a handful of technique families. Build the families once and every effect becomes a definition:

| Family | Engine modules | Effect ideas it covers (generic names) |
|---|---|---|
| Procedural shader fields | 61 + 62 | Aurora and silk flows, plasma, iridescence, light rays, liquid chrome, galaxies, grain gradients, glitch and CRT looks |
| Pointer-physics grids and lines | 64 (lattice) + 63 | Dot and shape grids, magnet lines, ripple grids, thread fields, elastic meshes |
| Particle fields | 63 | Particles, snow, swarms, constellations, pixel dust, sparks |
| Feedback and trails | 61.2 feedback passes | Cursor trails, ribbons, pixel trails, afterimages |
| Fluid and soft bodies | 64 | Splash cursors, liquid backgrounds, gooey blobs, ball pits, falling letters |
| Texture distortion | 65 | Hover ripples, pixel transitions, halftone reveals, image trails, lens/glass |
| (DOM motion, no GPU) | 12, 15, 17 | Magnet, tilt, split text, count-up, scroll reveals |
| *(v3.1)* Kinetic composition on DOM layers | 88–91 | Letters that flee the cursor, magnetic dot and shape grids, magnet lines, cursor grids, falling or bumping letters, anything a user composes from helpers, pins, splits, clones, fields and bodies |

**(v3.1) Open recipes.** Any library effect that the kinetic primitives can express ships as an **open recipe**. Examples: text that flees the cursor, magnetic dot grids, magnet lines, cursor grids. Inserting one creates the helpers, split or clone groups, effectors and rules on the canvas, where the user can see and change every part, instead of a sealed black box. That is the "extremely detailed design freedom" requirement: the library teaches the primitives, and the primitives can build what the library doesn't have.

2. **Vertical slice first.** Right after Phase 10, ship one effect end to end: *Aurora Veil* with Cursor → Bend. That means MDM, then signals, then compositor, then shader graph, then scrub with a tape, then export, then parity, then reduced motion, then a phone. Every later effect reuses that path.
3. **Reuse what already works** (see `AUDIT.md` §3): `PathMorphSolver` and the arc-length sampler (morphs, motion paths), `AnimationLoweringCompiler` (spring → CSS `linear()` for DOM reactions that compile to CSS), `SpatialIndex` (particle links, hit-testing), `Scene3DEngine` maths (3D tilt), the NodeScript lexer/parser/language server (Blueprint text form), `BlueprintCanvas.tsx` (graph UI, after it meets the One Clock and Hot-Path laws), `DiffPreview.tsx` (ghost diffs), and the Phase 4 harness.
4. **Pick permissive building blocks where they save months.** three.js (MIT) for 3D and TSL; a minimal in-house WebGL2 helper or OGL (Unlicense) for 2D shader surfaces (export size decides, 61.1); a small in-house rigid-body solver or a permissively licensed library (MIT/Apache-2.0) chosen by benchmark (64.2). No GSAP in any runtime (FX-LIC-02).
5. **Generate the Simple UI from schemas.** Props, affordances and policies are data, so the inspector, the Reactivity card, the Playground knobs and the AI tool schemas all come from the same definition (22.4, 60.3, 67).
6. **Let the AI write the constrained IR, not raw code.** Shader graphs, particle stacks and binding text validate before compiling, so AI proposals are valid far more often than free-form GLSL (Phase 70).

---

## 17. Phase Map

| Section | Built by |
|---|---|
| §4 Signals, tapes | 59 (and the 45 scheduler input phase) |
| §5–§6 Operators, bindings, blending, Reactivity card | 60 (with 47's evaluator, 9's STA synthesis) |
| §7 Surfaces, compositor, tiers | 61 (decision 0005) |
| §8.1 Shader programs | 62 |
| §8.2 Particles | 63 |
| §8.3 Simulations, determinism | 64 (decision 0006) |
| §8.4 Texture sources | 65 |
| §8.5 Cursor layer | 66 |
| §9, §11 States, affordances, definition format | 67 |
| Code components | 68 (decision 0007) |
| §14 Export | 69 (with 27, 28) |
| AI effect authoring | 70 |
| §15 Verification | 71 (with 4, 26, 84) |
| §3.6 Interaction rules and graphs | 72–74 |
| §10 Rules | 8 (compiled into the rule table), 29 (accessibility sampling) |
| §7.7 GPU resilience | 61 (with 71, 82.3, 84) |
| §7.8 Where WebGL is used | 8.3 routing; FX-PERF-07 |
| §7.9 GPU memory budget and resource lifecycle | 61.5 (the ledger and budgets), 18 (three.js lifecycle), 54 (texture import), 64 (simulation targets), 69 (export runtime), 71 and 84 (leak, stress and soak tests), 82 (field telemetry) |
| §8.6.1–§8.6.3 Helpers, pins, follow | 88 (anchor model shared with 51.1) |
| §8.6.4 Split and clone groups, tags | 89 (on 17.1's splitter) |
| §8.6.5 Fields and effectors | 90 |
| §8.6.6 Colliders, bodies, contact events | 91 (physics core shared with 64.2; events in 72's stdlib) |
| §10.8 Kinetic rules | 8 (rule table), 84 (tier caps) |
| §12.7 Reference build | Gates of 90 and 91; ROADMAP 58.6 (Journey E); PRD §11 criterion 13 |
| §13.4 No-math controls vocabulary | ROADMAP Law 17; 9.1 (perceptual springs); 22, 60.3, 73.6, 88.4, 90.6, 91.2 (Simple faces); the 91.7 label check |
| Similar builds | ROADMAP 91.7 composition test suite (10 builds) |

---

## 18. Open Questions

1. **Compositor default** (strategy A vs B, §7.3): decided by the Phase 61.1 benchmark.
2. **WebGPU by default?** WebGPU ships in all major desktop browsers and iOS 26, but Firefox on Android still needs a flag (checked 2026-09-26). Release 1 keeps WebGL2 as the baseline and WebGPU as opt-in, and revisits this at the Release 2 gate.
3. **Microphone input** for audio-reactive effects needs a permission UX and a privacy review. Release 1 analyses media layers only.
4. **Code component isolation in exports.** In the editor, code components run sandboxed. Exported components run in the user's own app, where they are the user's code.
5. **GSAP export target:** it stays behind GATE-01 until Webflow answers in writing.
6. **Similarity checks for originality** (FX-LIC-01): a manual checklist in Release 1; automated perceptual similarity against public catalogues is a candidate for Phase 85.
7. *(v3.1)* **Split text in exported HTML.** One `<span>` per letter is simple and fast up to a few hundred letters. The alternative is keeping the text node and animating per-letter overlays. Phase 89 decides by measuring accessibility, SEO snippets and performance.
8. *(v3.1)* **Physics feel.** Position-based resolution is stable and cheap, but less "physical" than an impulse solver for stacking. Phase 91 benchmarks both on the reference build and a ball pit before choosing one per mode.

---

*End of specification. Change it the same way as the grammar: a new signal, operator, target, role or rule is defined here (and in `lazylayout_element_grammer.md` §13–§14 when it changes the grammar) before it is implemented.*
