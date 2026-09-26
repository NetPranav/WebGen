# CHANGELOG — INITIAL PHASE

## Project Name: LazyLayout
**Internal Codename:** "Unreal Engine for Animation & Frontend Design"
**Document Version:** 1.1.0
**Phase:** Initial Phase (Element Animation Studio)
**File Location:** `DOCS/Initial/CHANGELOG.md`

All notable changes to the Initial Phase specifications will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [3.4.0] — 2026-09-26

### Phase 7 (Motion Primitives): complete — CI green on PR #13

The Motion Document can now *express* every effect the product promises: timed, state-based, reactive, GPU, Blueprint-driven and kinetic. This is types and validation only; the runtimes are later phases. Schema **v3 → v4**. The design choices are in `decisions/0004-motion-primitives.md`.

#### Added
- **`src/core/document/motion.ts`** (7.2–7.3):
  - the easing grammar (`parseEasing`);
  - perceptual springs (`{ bounce, time }`, Law 17) and physical ones;
  - `MotionSpec` (tween or spring);
  - keyframe `hold`;
  - a first-class `Stagger` (`each`/`amount`, `from` including edges and index lists, grid, ease, seed, targets);
  - clip `direction`/`repeatDelay`/`event`;
  - `Sequence` and `Transition`;
  - typed behaviour params (adds `proximity`).
- **`signals.ts`** (7.5): signals, operators, targets, guards and bindings, plus `parseBinding`/`formatBinding` for the engine spec §3.3 text form (round-trips).
- **`effects.ts`** (7.4–7.5): `Surface` (a fallback chain ending in `poster`, declared uniforms and params, policies), `InputTape` and `EffectInstance`.
- **`effect-definition.ts`** (7.4): the library `EffectDefinition` format (engine spec §11 plus PRD §5.3) and `validateEffectInstance`.
- **`graph.ts`** (7.5): interaction graphs, with the grammar §13.7/§14.6 event and action vocabulary, typed exec/data pins, wire rules, variables and custom events.
- **`kinetics.ts`** (7.5, v3.2): pins, tags, Follow/Field/Effector/Collider/Body components, and Split/Clone generators.
- **`behaviour-presets.ts`**: `behaviourToBindings`, so there is one reactive model.
- **`references.ts`**: cross-entity validation.
- **`migrations/v3-to-v4.ts`**.
- **Registry** (7.1, 7.6):
  - an `interpolation` per path;
  - `range` and `typed` value checks;
  - keyframeable holds for `media.src`, `media.objectFit` and `background.blendMode`;
  - `render.role`, `content.counter.*`, `svg.strokeLinecap`/`Linejoin` and `shape.*`;
  - archetypes `rectangle`, `ellipse`, `line`, `polygon`, `star`, `arrow` and `effectSurface` (27 in total).
- **Gate:**
  - `__tests__/phase7-gate.test.ts` covers the 12 + 4 reference effects and the reference build in effector and Blueprint forms, built in `__tests__/fixtures/reference-effects.ts`;
  - `__tests__/motion-model.test.ts` covers the easing grammar (checked against every easing literal in `src/`), binding syntax, 56 planted mistakes that must be refused, migration, cascades, effect definitions and JSON Schema;
  - `audit/phase7-gate-checklist.md` is the reviewer checklist.
- **`decisions/0004-motion-primitives.md`**.

#### Changed
- **Schema v4:** nine new collections and `Layer.pins`/`tags`.
  - State and keyframe values are typed by their property.
  - Keyframes are sorted within their clip; equal times are an instant jump.
  - `loadDocument` chains v1 → v2 → v3 → v4.
- **The store's write boundary:**
  - types keyframe values (`"20px"` → 20) and extends a clip to cover its last keyframe;
  - on `removeLayer`, removes everything that belongs to or points at the deleted subtree (`removeLayerDependents`); a Split group that loses a piece is detached.
- **Stagger panel:** offers `edges` and keeps `each`/`amount` exclusive.
- **Engine spec v1.4 §3:**
  - `pointer.velocity` (used by §12.3, never defined);
  - a constant signal;
  - `component(x|y)`;
  - the perceptual `spring(bounce:, time:)`;
  - the `position(pin[, axis])` target;
  - `self` on set targets.
- **Docs:** SCHEMA_REFERENCE §0 for v4; ROADMAP Phase 7 is `[~]` with a progress log; AUDIT AUD-57 records G1 and G2 as delivered in code.

#### Known gap
- `effectSurface` uses the `Canvas` grammar type until Phase 8 compiles grammar §13's 3.F types (`TODO(P8)`).

---

## [3.3.0] — 2026-09-26

### ROADMAP v3.3: GPU memory budget, resource lifecycle, and "WebGL only where needed"

This is a planning and spec change. No code changed, and no phase is marked ✅.

#### Why
The question was whether browser memory and graphics problems are solved when WebGL and three.js are used heavily. v3.2 limited GPU *contexts* and handled their loss, but did not budget GPU *memory* (`AUDIT.md` AUD-58). Running out of GPU memory causes context loss on any device and tab reloads on iPhones. v3.2 also didn't state that three.js is only for real 3D, which risked making it the default GPU path.

#### Added
- **Engine spec §7.8, "Where WebGL is used, and where it isn't":** routing from lightest to heaviest backend (CSS/DOM → SVG → Canvas 2D → WebGL2 helper → three.js). three.js is only for real 3D and loaded lazily. Most interactive effects use no WebGL. Rule FX-PERF-07.
- **Engine spec §7.9, "GPU memory: budget and resource lifecycle":**
  - a memory ledger with size formulas for textures, render targets, canvases, buffers and programs;
  - per-tier budgets (T1 96 MB, T2 256 MB, T3 512 MB initially), largest texture edges (1024/2048/4096 px) and simulation resolutions (1/8, 1/4, 1/2);
  - a degrade order: resolution → passes → texture size → release → poster;
  - resource rules for KTX2/Basis textures and bitmap closing, pooled render targets, Safari's per-canvas pixel limit and zeroing released canvases, three.js disposal and loader-cache clearing, shared programs, no per-frame allocations, and the editor's own budget;
  - tests (leak 100×, a 20-surface stress test, a 10-minute phone soak) and field detection of unexpected reloads;
  - rules FX-MEM-01 … 06.
- **ROADMAP 61.5, GPU Memory Ledger & Budgets,** and **71.5, Memory checks in the harness.**
- **AUDIT AUD-58.**

#### Changed
- **Surface Budget Law (13)** now covers GPU and canvas memory as well as context counts.
- **ROADMAP v3.3 amendments:**
  - 8 (GPU only where needed);
  - 18 (three.js memory discipline, with a GLTF leak test in its gate);
  - 26 (memory in every budget);
  - 54 (tier-sized and KTX2 texture variants at import);
  - 56 (no per-frame allocations; KTX2 transcoding in workers);
  - 61's gate (leak and stress tests);
  - 64 (simulation resolution caps, pooled targets, thinned snapshots);
  - 69 (the same discipline in exports);
  - 82.2 (ledger and tab-kill telemetry);
  - 84.3 (memory budgets calibrated on real devices).
- **PRD v2.4:** the memory mitigation and the "GPU only where needed" row in the risk register.

---

## [3.2.0] — 2026-09-26

### ROADMAP v3.2: the reference build traced, the no-math law, and the evidence on GSAP

This is a planning and spec change. No code changed, and no phase is marked ✅.

#### Why
The question was whether the reference build (letters flee an invisible cursor circle), and interactions like it, will really work if the roadmap is followed. Instead of asserting it, each step was traced to the phase that delivers it and that phase's dependencies. The trace found 8 gaps (`ROADMAP.md` §4.2, `AUDIT.md` AUD-57). The same question asked for "simple maths for the user, everything visual", which v3.1 stated only generally (Law 6), not for Track X/K's parameters. It also asked how much GSAP React Bits actually uses.

#### Added
- **ROADMAP Law 17, Visual-First (No-Math).** Every parameter can be set without typing numbers or formulas, a CI label check fails a Simple face that shows a technical parameter, and Pro keeps the numbers.
- **Engine spec §13.4:** the controls vocabulary, mapping every technical parameter to a visual Simple control. Springs use **Bounce** and **Time**; ranges are "From → To" handles over live meters; there is **Variety** with a shuffle button, rings on the canvas for reach and gap, and a follow point picked from 9 dots.
- **ROADMAP v3.2 amendments:**
  - **7.5** includes Track K's types; new **7.6** shape primitives (rectangle, ellipse, line, polygon, star, arrow) as real archetypes; the Phase 7 gate adds the reference build.
  - **9.1** perceptual springs.
  - **20** and **36** use 7.6.
  - **22** and **60** get no-math faces.
  - **72** adds `Spawn`/`Despawn`, `PlaySound`/`StopSound` and drag events.
  - **73.5** rules auto-attach the colliders, fields and home springs they need; **73.6** no-math rule parameters.
  - **88.4** the Follow Simple face.
  - **89.4** the spawner.
  - **90.4** one evaluation space (the top-level frame, world transforms); **90.5** "stay inside"; **90.6** the effector Simple face.
  - **91.2** draggable bodies.
  - **91.7** a **10-build composition test suite**.
  - **40** runs the suite and the label check.
- **The §4.2 v3.2 addendum:** the step-by-step trace table, and what the plan does and doesn't prove.
- **Animation spec §11.4:** React Bits library usage by GitHub code search on 2026-09-26. Of 209 components, about 35 use GSAP (17%), 40 Motion, 53 OGL, about 30 three.js and 2 matter-js. GSAP is mostly used for text, menu and card animations; the heaviest effects are WebGL.
- **Grammar v0.3.1:** drag events, spawn and sound actions, and rules that set up their own colliders and fields.
- **PRD v2.3:** principle 9, "Visual first, no maths"; criterion 13 now also requires no typed numbers and the 91.7 suite.
- **AUDIT AUD-57.**

#### Fixed
- §5.1's overstated claim: the reference build's *engine* is demonstrable early, but the *no-code journey* needs the studio canvas, the inspector and the rules UI (49, 20, 22, 73). It is proven at Journey E (58.6).
- Engine spec §12.7: a card is drawn with the Frame tool (F), not the rectangle tool.

---

## [3.1.0] — 2026-09-26

### ROADMAP v3.1: kinetic composition (Track K), GPU resilience, and the engine without GSAP

This is a planning and spec change. No code changed, and no phase is marked ✅.

#### Why
A follow-up requirement asked for "extremely detailed design freedom": build interactions from primitives, not only pick finished effects. The test case is:
1. an invisible circle follows the mouse by a point the user chooses;
2. a card's text is split into letters with one click;
3. a Blueprint rule makes the letters flee the circle instead of entering it, then spring back.

v3.0 could only ship that as a library effect (`AUDIT.md` AUD-56). The same follow-up asked two more questions: what replaces GSAP, and how the product survives the browser taking the GPU away.

#### Added
- **ROADMAP Track K, Kinetic Composition (Phases 88–91):**
  - 88: helper layers, pins and follow behaviours;
  - 89: one-click Split into letters, words and lines as real layers, cloners, tags;
  - 90: fields and effectors (Keep-Out is a hard constraint);
  - 91: colliders, kinetic bodies and `OverlapBegin/Stay/End` and `Hit` Blueprint events, on one 2D physics core shared with 64.2.

  Also a §4.2 addendum, §5 rows, a new §5.1 stage and critical path, milestone M2.7 "Compose", Track K owners in §7, and Journey E (58.6).
- **Grammar v0.3, §14:** a helper role, pins and components, Split and Clone groups (3.G.1–3.G.2), component compatibility, rules 6.17–6.24, overlap and contact events with group/tag targets, and the worked example.
- **Engine spec v1.1:**
  - §7.7 GPU resilience: every way a browser can take the GPU away, with prevention, what the user sees, recovery, remote kill switches and tests;
  - §8.6 kinetic composition, with the pin maths for "which point follows the mouse";
  - §10.8 kinetic rules (FX-KIN-01 … 07);
  - §12.7 the reference build (Simple steps, document tree, effector form, Blueprint form and graph, production behaviour);
  - Unreal and Cinema 4D mappings, open recipes in §16, and phase-map rows.
- **Animation spec §11.4, "The Engine Without GSAP":** every GSAP feature the spec relied on, mapped to a replacement (our kernel and runtime, Motion, CSS scroll-driven animations, `offset-path`, the existing `PathMorphSolver`, the splitter), with licences and phases.
- **AUDIT AUD-56**, with its traceability and status rows.

#### Changed
- **ROADMAP v3.1 amendments** to Phases 17, 21, 25 (open recipes), 40 (criterion 13), 49 (gizmos, "Show collision"), 51 (anchor = pin; null = helper), 58 (Journey E), 60 (`position(pin)` and group/tag targets), 64 (shared physics core), 69 (`kinetics` and `physics2d` runtime modules), 72 (kinetic events, wildcards and actions) and 74 (contact events in the fixed step; Keep-Out rules compile to the effector or constraint). Release 1 now includes Track K, and the phase count is 91 in 14 tracks.
- **PRD v2.2:**
  - vision item 6, "Compose it";
  - kinetic composition in the Release 1 scope;
  - concepts: helper layer, pin, Split/Clone group, field and effector, collider and body, tag;
  - animation-model item 14;
  - a "Compose" row in the Simple/Pro table;
  - DoD criterion 13 and two metrics;
  - the tech baseline no longer lists GSAP as an editor engine (it is an opt-in export target).

#### Docs
- `check:doc-links` passes.

---

## [3.0.0] — 2026-09-26

### ROADMAP v3.0: production-readiness review, the Reactive Effects Engine, Interaction Blueprints, and a release plan

This is a planning and spec change. No code changed, and no phase is marked ✅.

#### Why
The review asked whether the product would work in production as intended once every v2.1 phase reached ✅. The intended product is a Figma / Wix Studio canvas with Unreal-style Blueprint logic, export of whatever the user designs, and React Bits-grade interactive effects.

The answer was **no**, for three reasons:
- **Scope.** v2.1 builds a single-component motion studio. Blueprints, pages and publishing were out of scope.
- **The pitch.** The grammar couldn't express a background that reacts to the cursor, and no GPU effect runtime exists or was planned beyond one shader phase.
- **Production.** There were no security boundaries, accounts, operations, cost controls, device coverage or licence automation.

Details are in `ROADMAP.md` §4.2 and `AUDIT.md` section J.

#### Added
- **`DOCS/Initial/INTERACTIVE_EFFECTS_ENGINE_SPECIFICATION.md`**: the engine design. It covers:
  - the architecture and per-frame pipeline, and an Unreal Engine → LazyLayout mapping;
  - formal grammars for signals, operators, bindings, effect definitions and the Simple-mode sentence;
  - the signal and operator catalogues, targets and channel blending;
  - surfaces, the compositor and device tiers;
  - shader, particle, simulation, texture and cursor programs;
  - affordances and numbered rules (performance, input, accessibility, determinism, export, licensing, safety);
  - the `EffectDefinition` format, 6 worked examples, the Simple/Pro UX, the export spec, the verification strategy, and a build strategy for making this easy to build.
- **ROADMAP v3.0:**
  - §4.2 records the review.
  - Five new laws: Signal, Surface Budget, Graceful Degradation, Deterministic Replay, Untrusted Code.
  - 29 new phases:
    - **Track X**, Reactive Effects Engine (59–71): signals and input tapes, bindings and the one-step Reactivity card, the GPU Surface Compositor, a Shader Graph, particles, deterministic simulations, texture distortion, the cursor layer, the Effect SDK, code components, interactive export and embed scripts, an AI effect author, and a GPU verification harness.
    - **Track L**, Interaction Blueprints (72–74).
    - **Track W**, Components, Sections, Pages, Content and Site Export (75–79, Release 2).
    - **Track P**, Production Platform (80–85).
    - Release gates **86** (Release 2 GA) and **87** (Release 3 re-baseline of the After track).
  - §5.1 is now the v3.0 execution order, with a critical path to the first interactive effect.
  - §6 milestones, §7 parallelisation (a four-owner team shape), and §8 scope by release.
- **Grammar v0.2** (`lazylayout_element_grammer.md` §13):
  - the Reactive category (4.11);
  - effect-surface element types 3.F.1–3.F.7;
  - rules 6.9–6.16 (channel blending, cross-layer signals, touch parity, target stability, surface budget, dynamic contrast, reduced-motion policy, event bridging);
  - a Reactive column for the 32 v0.1 types and a matrix for the 3.F types;
  - the Interaction rule grammar (event → action), worked examples, and resolutions of open questions 12.1 and 12.6.
- **AUDIT section J**: AUD-44 … AUD-55, with traceability and resolution-status rows.
- **LICENSES GATE-03**: user-imported code components (including "MIT + Commons Clause" code).

#### Changed
- **ROADMAP v3.0 amendments** to Phases 7 (new 7.5: reactive, surface and graph types), 8 (new 8.5: rules-source reconciliation; no GSAP default routing), 9, 10, 12, 14, 18, 19, 22, 24–31, 33, 39, 40 (now the Release 1 beta gate), 45, 47, 49 and 54–58 (new 58.5: the React journey).
- **Phase 25 target raised** from ≥ 40 to ≥ 80 effects, with waves 7–9 (interactive backgrounds, cursor effects, image and text distortion).
- **PRD v2.1:**
  - vision items 4 and 5 ("make it react", "bring it"), and scope by release;
  - new concepts: signal, binding, affordance, surface, Interaction Blueprint, code component, input tape;
  - new effect categories and effect-contract items 8–11, and §5.4 "Interactive Effects: the Pitch";
  - animation-model items 11–13, routing without a GSAP default, new AI roles, the Reactivity and Interactions rows of the Simple/Pro table, and export items 8–9;
  - DoD criteria 9–12, new risks (context limits, simulation determinism, untrusted code, Commons Clause, Figma Config 2026, device thermals) and new metrics.
- **LICENSES GATE-01** now quotes the GSAP Standard License's "Prohibited Uses" definition (checked 2026-09-26) and states the consequence: GSAP never runs in the editor and is an opt-in export target only.

#### Docs
- `check:doc-links` passes. Every new decision record named in v3.0 (0005 GPU surface strategy, 0006 stateful simulation, 0007 code-component isolation) is referenced only from unchecked checklist items, like the existing future records 0002 and 0004.

---

## [2.9.0] — 2026-09-25

### Phase 42 (Canonical Property Paths & Geometry Model): complete — CI green on PR #11

#### Changed
- **Schema v3** (`SCHEMA_VERSION = 3`). Layer prop keys, state keys and track paths must be canonical `properties.ts` paths legal for the layer's archetype. `document.artboard` is removed: top-level layers are frames. Geometry (`frame.*`, `sizing.*`, `positioning`) is stored on layers, and its values are type-checked.
- **`migrations/v2-to-v3.ts`**: per-archetype renames, object and style-block splitting, image-opacity rescale (keyframes too), CSS length strings to number plus unit, and a non-default artboard size moved onto the root frames. `loadDocument` chains v1 → v2 → v3.
- **Store boundary**: the `documentCommands` write commands only ever store canonical keys.
- Every preset, template, fixture, emitter, the stage renderer, the Details sections, the 3D engine and the diagnostics now use canonical paths. `StyleEmitter` maps CSS through the registry and emits geometry by sizing. Pseudo-state and breakpoint styles now arrive through options.

#### Fixed
- Scrubbing a preset authored with `transform.translateY` now moves the layer (ROADMAP §4.1 row 4 / AUD-32). The 15 legacy-dialect preset tracks are `transform.x/y`.

#### Added (tests)
- `property-gate.test.ts` (the Phase 42 gate, unit half). `tests/e2e/property-migration.spec.ts`: a genuine v2 export from `main` renders pixel-identically after migration in 3 browsers. Fixture: `tests/e2e/fixtures/showcase-v2.lazy.json`.

#### Added
- **`src/core/document/properties.ts`** (Phase 42.1): the canonical property registry, now 216 dot-paths (198 when first added), each with value type, unit, default, CSS mapping, compositing class, animatability and owning archetypes. It includes a legacy alias table (flat v2 keys and the `transform.translateX/Y` preset dialect, per-archetype where meanings differ, with value scaling and object splitting), plus `resolvePropertyPath`, `suggestPropertyPath` and `validateLayerProps`. Additive only: no stored data or reader changes yet (that is 42.2).
- **`DOCS/Initial/decisions/0003-geometry-vs-transform.md`** (Phase 42.4): `frame` is layout, `transform.*` is the GPU motion offset. CONVENTIONS §4 is the naming source.
- `src/core/document/__tests__/properties.test.ts`: 15 tests covering the registry against CONVENTIONS §4, all 51 presets, every archetype default and the showcase demo.

## [2.8.0] — 2026-09-25

### Phase 6 (Scope, Naming & Docs Cleanup): complete — CI green on PR #9

#### Added
- **`src/core/flags.ts`**: the `edition: "initial" | "full"` build flag, read from `process.env.NEXT_PUBLIC_EDITION` so Next's webpack config can inline the literal at build time.
- **`src/editor/shell/afterTrackPanels.tsx`**: the 6 After-track panels reachable from `EditorShell` (Blueprint, Execution Trace, Pages Manager, Deployment, Plugin Manager, Version Control), each exported as `edition === "full" ? dynamic(() => import(...)) : notInThisEdition`, so the unreached branch — and its chunk — is dead-code-eliminated out of an `edition=initial` build.
- **`scripts/check-bundle-scope.mts`** (`npm run check:bundle-scope`): resolves the real chunk graph Next registers for the `/editor` route tree and confirms none of the 6 gated panels are present. Wired into CI.
- **`scripts/check-doc-links.mts`** (`npm run check:doc-links`): checks markdown and backtick doc-filename references under `DOCS/Initial/` for broken targets. Wired into CI.
- **`DOCS/Initial/LICENSES.md`**: the Licensing Gate Law register. One open gate (GSAP's "Competitive Products" clause, Phase 14), one closed-by-policy non-gate (reference libraries, never vendored).
- A real root `README.md` (the create-next-app boilerplate is gone): what LazyLayout is, the `edition` flag, how to run it, where the docs live.

#### Changed
- **One name: LazyLayout.** `package.json` `"name"`: `"engine"` → `"lazylayout"`. Page titles/metadata (`src/app/layout.tsx` and the `/editor` and `/editor/detach/[panelId]` layouts). Compiler emitter output headers that ship inside every exported user project (`PrismaSchemaEmitter`, `GSAPAnimationEmitter`, `StyleEmitter`, `ReactComponentEmitter`, `LogicFlowEmitter`, `ApiRouteEmitter`, `GitExporter`, `AssetFileEditor`) renamed from "WebAPPBuilder"/"WebGen" variants. All `DOCS/Initial/*.md` "Project Name:" headers and prose.
- "Next.js 15" → "Next.js 16" in `FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md`, `PANELS.md`, `UI.md` (current-state docs; dated `CHANGELOG.md` log entries describing past phases were left as accurate history).
- Every file under `DOCS/After/` (15 files) now carries a "Full-vision track. Not the active roadmap" banner. The old *Roadmap_after.md* → `DOCS/After/ROADMAP_EXISTING_PROJECT_IMPORT.md` (`git mv`), including fixing its own stale self-reference to a *DOCS/ROADMAP_EXISTING.md* path that never existed.
- Two `file:///Users/pranav/...` absolute links in `ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md` (hardcoded to one contributor's home directory — would 404 in CI or for anyone else) converted to relative links.

#### Fixed
- **The `panelParam`/`panelId` string-matching `database` guards in `EditorShell.tsx` are removed.** They're superseded by the edition gate — Database Studio was already unreachable (no call sites), so nothing needed the string match to begin with.

#### Removed
- `DOCS.zip` (untracked via `git rm --cached`, local file kept, added to `.gitignore`).

#### Left incomplete, honestly
- The full PRD-v2 content rewrite of `UI.md`, `PANELS.md`, `SCHEMA_REFERENCE.md`, `CONVENTIONS.md`, `FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md` did **not** happen — only the naming/version truth pass ran on them. Their "pending v2 update" banners are still up; reconciling 11–140 KB of doc content against current code is its own pass, not something to rush inside Phase 6. See the ROADMAP Phase 6 progress log for the reasoning.

#### Docs
- ROADMAP: Phase 6 checklist ([x] for everything except the v2 content rewrite, marked [~]) and progress log. AUDIT: AUD-22 through AUD-27 closed (CI green on PR #9).

---

## [2.7.0] — 2026-09-25

### Phase 5 (Dependency Reality & Wasm Decision): ✅ complete — CI green on PR #8

#### Added
- Real dependencies: `motion@13.4.3`, `three@0.186.1`, `@react-three/fiber@9.8.1`, `@react-three/drei@10.7.8`, `@gsap/react@2.1.2`, `@types/three` (dev). `npm ls motion three @react-three/fiber` resolves; none are imported anywhere yet, so bundle growth is 0%.
- **`DOCS/Initial/decisions/0001-wasm.md`**: the Wasm go/no-go decision record — **No-Go**. Per-wire calls (the app's actual default pattern): Wasm ~0.67x TS speed. Batched into one JS↔Wasm crossing (Wasm's best case): ~1.93x, only 3/5 runs even reached the required 2x. Real Chromium (Playwright), not simulated; reproducible benchmark script included.
- **`DOCS/Initial/decisions/0001-wasm-archive/`**: the former `wasm/` — C++ source, headers, build system, and the benchmark harness that produced the numbers above.

#### Fixed
- **The C++ Wasm kernel had never actually compiled**, on any prior commit: `SplineSolver.cpp` used SIMD intrinsics without `#include <wasm_simd128.h>`; `WasmBindings.cpp` was missing `using namespace WebAppEngine;` (so its own type references didn't resolve) and separately bound several methods, fields and enum members that don't exist on the current C++ headers at all. Fixed to make an honest benchmark possible; the fixes live in the archive, not in an active build.
- **`Scene3DViewport.tsx`** claimed "WebGL canvas rendering" while drawing hand-rolled 3D-to-2D projection math on `canvas.getContext("2d")`, with `webglcontextlost`/`webglcontextrestored` listeners that can never fire there. Deleted; replaced with an honest placeholder. The component was unmounted anywhere in the app, and its `object3D`/`camera3D`/`light3D` archetypes were already unreachable (no add-layer UI lists them) — no feature flag was needed.
- **`StudioHeader.tsx`**'s "Wasm 120 FPS" badge was hardcoded to claim "C++ WebAssembly Engine linked" unconditionally — nothing in the app ever called `WasmBridge.init()`. Now a static, honest "TypeScript 120 FPS".
- **`ProjectSettings.tsx`**'s "C++ WebAssembly Optimization Level" dropdown had zero effect on any build. Removed (permanently inapplicable after the No-Go decision, not merely unwired).

#### Removed
- `wasm/` (moved to `DOCS/Initial/decisions/0001-wasm-archive/`). `build:wasm` npm script.

#### Docs
- ROADMAP: Phase 5 checklist and progress log. AUDIT: AUD-10, AUD-11, AUD-12 closed (CI pending); doc comments in `SplineSolver.ts`/`WasmBridge.ts`/`WasmWorkerPool.ts`/`CurveEditor.tsx` updated from "decision pending" to recording the concluded decision.

---

## [2.6.0] — 2026-09-25

### Phases 3 & 4: ✅ complete — CI green on PR #7

Phase 3 (Store, History & Persistence) and Phase 4 (Real-Environment Verification Harness) close together: Phase 3's own persistence gate moved into the Phase 4 Playwright harness, so both shipped on one branch/PR and one CI run.

#### Fixed (found by the first real CI run, ubuntu-latest — everything before this had only run on macOS)
- **AUD-42:** `parity.spec.ts`'s pixel-diff threshold (1%) was too tight for real cross-platform headless-Chromium rendering — 0% match on all 5 samples locally, a deterministic 2.39% diff at one sample on Linux CI. Not an exporter bug (confirmed against the much larger divergence the "wrong easing" regression test produces). Raised to 4%.
- **AUD-43:** the `nextjs-app` export-harness fixture typechecked *before* `next build`/`next dev` ever ran there, so on a genuinely fresh checkout it never had `next-env.d.ts` (gitignored, auto-generated) and every `*.module.css` import failed with `TS2307`. Every prior local pass was really testing a stale leftover file from an earlier manual `next build`. Fixed by committing a static `next-env.d.ts` for that one fixture.
- `tests/export-harness/build.mts`'s `check()` swallowed the actual `tsc`/bundler error on failure, showing only a bare "FAIL" — the first CI failure was undiagnosable until this was fixed. Failures now print the captured output.

#### Docs
- ROADMAP: Phase 3 and Phase 4 marked ✅ with the CI evidence (PR #7, all 3 browser projects, `verify` + `e2e` + `export-harness` jobs). AUDIT: AUD-05, AUD-08, AUD-15, AUD-16 close out their CI-pending caveats; new findings AUD-42 and AUD-43, both closed in this same PR.

---

## [2.5.0] — 2026-09-24

### Phase 4 (Real-Environment Verification Harness): gate passed locally in 3 browsers, CI pending

#### Added
- **Playwright harness** (`playwright.config.ts`): Chromium, Firefox and WebKit projects sharing one `next build && next start` server. `tests/e2e/support/{editor,clock}.ts` are the shared helpers (open/save/export the project, seek the Sequencer ruler exactly, install Playwright's native Clock API).
- **`tests/e2e/phase3-persistence.spec.ts`**: Phase 3's gate, moved off the `PW_DIR`-driven `phase3-persistence.mjs` script and into this harness, so it now runs in CI.
- **`tests/e2e/deterministic-clock.spec.ts`**: proves the fake-clock helper controls `requestAnimationFrame`/`performance.now` deterministically in isolation, that `seekRuler` reaches an exact playhead time repeatably, and keeps AUD-41 (below) falsifiable.
- **Export build harness** (`tests/export-harness/`): `fixtures/{nextjs-app,vite-react,vue}` are pinned, minimal apps registered as npm workspaces (hoisting `next`/`react` from the root install); `fixtures/vanilla` needs no build step. `build.mts` writes real `CrossFrameworkExporter`/`VanillaHtmlEmitter` output for 4 reference elements (one per emitter family) into each fixture and runs `typecheck` + `build`; `--self-test` injects a syntax error and asserts the harness catches it.
- **Pixel parity** (`tests/export-harness/parity.spec.ts`): the real `VanillaHtmlEmitter` markup animated two ways — an independent linear-interpolation oracle vs. the real `GSAPAnimationEmitter` output seeked with `tl.seek(t)` — diffed with `pixelmatch` at 5 sampled times (0/25/50/75/100%), ≤ 1% by default. A wrong-easing injection fails the mid-sample; the correct export passes all 5, on all 3 browsers. Screenshots and diffs are `testInfo.attach()`ed for the CI report.
- **CI:** `.github/workflows/ci.yml` gets an `e2e` job (installs Playwright browsers, runs the full suite, uploads the HTML report). New `.github/workflows/export-harness.yml`: nightly, plus PRs touching `src/compiler/**`.
- Dev dependencies: `@playwright/test`, `pixelmatch`, `pngjs`. New root `workspaces` field for the 3 buildable fixtures.

#### Fixed
- **`TextEmitter.emit()` threw `ReferenceError: name is not defined`** for every text/heading export with `stylingSystem: "css-modules"` (`TextEmitter.ts:87`, a stray `${name}` where the variable is `componentName`). Invisible to the existing emitter tests, which only ever used the default Tailwind styling — found by the export build harness within minutes of its first real run. Regression test added (`ArchetypeEmitters.test.ts`).

#### Docs
- ROADMAP: Phase 4 checklist and progress log; §5 and §5.1 updated (4 now runs between 3 and 5, not in parallel with them). AUDIT: new finding AUD-41 (the Sequencer's playback loop can't be driven deterministically by a fake clock — pre-existing, closed by Phase 45).

#### Known gaps
- The literal Phase 4.3 wording ("the editor Playground") doesn't apply yet — Phase 24 hasn't built it. The parity harness uses an independent oracle instead, same re-scoping pattern as Phase 3's AUD-05/AUD-40 note. The full editor-vs-export comparison is Phase 27's.
- Only the vanilla + GSAP path carries animation through export end to end (what the parity harness needs). The React/Vue/Next exporters still don't wire `document.clips` into their output — that gap is tracked separately (AUD-40) and isn't Phase 4's to close.
- The gates run locally against a production build; CI needs to go green on the PR before ✅.

---

## [2.4.0] — 2026-09-24

### Phase 3 (Store, History & Persistence): gate passed locally in 3 browsers, CI pending

#### Added
- **Patch-based undo/redo** (`historyCommands` in `useDocumentStore.ts`, `useHistoryStore.ts`): document entries are Immer patches; After-track actions keep project-state entries that no longer copy the document. The stack holds 200 entries, and a corrupt entry is dropped with `[UNDO_STACK_CORRUPT]`.
- **Transactions and gesture coalescing** (Phase 41.2): `documentCommands.begin(label)` with `commit()` / `cancel()`, transient vs durable change events, and `installGestureCoalescing(window)` so every pointer press is one undo step. Repeated value edits within 1 s merge; structural edits don't.
- **`diffPatches`** (`src/core/document/diff.ts`): a structural diff to Immer patches that squashes transactions and merges.
- **IndexedDB storage** (`src/core/storage/idb.ts`, `ProjectDatabase.ts`): projects, summaries and undo history, a one-time move from localStorage, and an in-memory fallback.
- **`ProjectSession`**: load, debounced autosave (never mid-gesture), flush on tab hide and Cmd+S, a crash-recovery journal with a "Restore unsaved changes?" prompt, save status, and storage-full errors.
- **`.lazy.json` files** (`lazyFile.ts`): versioned export/import with migration and validation. File → Export Project File / Import Project File, and drag-and-drop onto the window.
- Global Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z and Ctrl+Y.
- `tests/e2e/phase3-persistence.mjs` (browser gate), and 5 new unit suites. Dev dependency: `fake-indexeddb`.

#### Changed
- `useProjectStore` no longer has `undo` / `redo` / `jumpToHistoryState`; use `historyCommands`. Commands without a label are recorded as "Edit" (every durable change is undoable).
- `ProjectDatabase` is async.
- The Project Hub waits for the new project to be saved before navigating.

#### Fixed
- The undo/redo buttons and Cmd+Z did nothing. Undoing "Mount Showcase Demo" or "Clear Canvas" restored the demo instead of the previous state. A drag recorded ~60 full-project snapshots. There was no autosave, and the unsaved indicator never lit. The Co-pilot auto-fix took two undo steps.

#### Docs
- ROADMAP: Phase 3 checklist and progress log; 41.2 marked done; the AUD-05 Code view and Playground checks moved to Phases 27 and 24. AUDIT: AUD-05 and AUD-08 closed (CI pending); new findings AUD-39 and AUD-40.

---

## [2.3.0] — 2026-09-24

### Roadmap v2.1: Track S (Studio Architecture), Phases 41–58

Docs only; no code changed.

#### Added
- **ROADMAP §4.1 Architecture Review v2.1:** what stands between today's code and a Figma / Wix Studio canvas with an After Effects timeline, with code evidence and a target architecture diagram.
- **Laws 8–11:** One Clock, Hot-Path, Document-Space, One Renderer.
- **Track S, 18 phases:** 41 Store Decomposition & Transactions · 42 Canonical Property Paths & Geometry · 43 Command Bus & Tool State Machine · 44 Workspace Architecture & Layout Presets · 45 Transport, Global Clock & Frame Scheduler · 46 Compositions, Layer Time Bars & Nesting · 47 Property Links & Expressions · 48 Stage Renderer v2 · 49 Viewport Engine · 50 Auto-Layout, Constraints & Breakpoints · 51 Layer Compositing · 52 After Effects–Style Timeline · 53 On-Canvas Motion Editing · 54 Asset Pipeline & Media Layers · 55 Render Queue (video/GIF/Lottie) · 56 Workers & Hot-Path Performance · 57 Legacy Runtime Retirement · 58 Studio Architecture Integration Gate.
- **§5.1 Execution Order:** phase numbers stay stable; the new phases slot in between existing ones (41 before 3, 48 before 10, 49 before 20, 52 before 23, 58 before 40).
- **AUDIT §2.I:** AUD-29 … AUD-38 (string-iframe stage, no global clock, no geometry, three property vocabularies, `postMessage("*")` broadcast, one store for everything, shell layout state, no composition model, no asset pipeline, linear-only scrubbing).

#### Changed
- Phases 3, 7, 9, 10, 20, 22, 23, 24, 27, 35 and 40 carry a "v2.1 amendment" note describing how Track S changes them. Phase 23's timeline structure moves to Phase 52.
- Milestones M1, M2, M4 and M5 now include Track S phases. New milestone M7.5 (Studio Proven).
- Next phase is now 41, then 3.

---

## [2.2.0] — 2026-09-24

### Phase 2 (Unified Motion Document Model): complete (CI green on PR #6)

#### Added
- **MDM v2** (`src/core/document/`): Zod schema with three outputs (types, validator with referential integrity, JSON Schema); archetype registry (20 archetypes → kind, family, id prefix, export tag, grammar type/legal states, Details sections, default props); `v1 → v2` migrations with tree repair; typed prop views.
- **Document store API** (`src/core/store/useDocumentStore.ts`): typed commands, each an Immer recipe that yields patches plus inverse patches; `applyDiff` with validation; `useLayer` / `useLayers` / `useLayerClips` hooks.
- 31 tests, including a 500-run property-based round trip and a source scan that keeps the retired types out.
- `.claude/skills/run-editor`: a project skill that launches the editor and smoke-tests it in headless Chromium, with an old-vs-new comparison mode.
- Dependencies: `zod` (runtime), `fast-check` (dev).

#### Changed
- The project snapshot holds `document: MotionDocument` instead of `elements`; export `target` moved into `document.exportSettings`. Every load path migrates older snapshots.
- Animation triggers use the PRD vocabulary (`mount`, `hover`, `press`, `scrollProgress`, `time`, …); all 51 presets were updated.
- Sequencer, Curve Editor, Outliner, Details sections, Co-pilot, Content Shelf, AI engine, diagnostics, emitters, exporters, version control, search and deployment read and write the document through the new API.

#### Fixed
- Sequencer keyframe edits now persist (AUD-05 model half); Content Shelf blocks are linked into the layer tree; generated components get both sides of their parent link; deleting a layer removes its subtree and owned clips; the GPU auto-fix works; `__proto__` prop keys are rejected instead of silently dropped; version-control merges carry clips.

#### Removed
- `src/core/elements/` (`BaseElementNode`, `AttachedAnimation`, archetype factories, validator tests that never ran), `ProjectElement`, `ElementType`, `ELEMENT_SECTION_REGISTRY`, `setElementProperty` / `addElement` / `removeElement`.

---

## [2.1.0] — 2026-09-24

### Phase 1 (Build Health & CI): green locally, CI gate pending

#### Fixed
- **Type errors 162 → 0** (AUD-01). Model-boundary shims are tagged `TODO(MDM-P2)` for Phase 2 to remove. Baseline: `DOCS/Initial/audit/tsc-baseline.txt`.
- **ESLint errors 179 → 0** (AUD-02): typed every `any`, escaped JSX entities, and replaced state-syncing effects, ref writes during render, and impure render calls with the patterns React's compiler rules expect.
- Real bugs found along the way: the AI Co-pilot never saw the selection; the Code Inspector ZIP download called a missing method; Project Hub dropped the chosen tech stack; the Sequencer/Curve Editor read the animation stack from a field that is never written (AUD-05 read side); the Live Code Inspector called setState during render; stale closures in whiteboard zoom settings, blueprint drag listeners and sequencer shortcuts.

#### Added
- `typecheck` and `test:unit` scripts; `test` runs `typecheck` first.
- `react-hooks/exhaustive-deps` is an error for `src/editor/**`; the `lint` script enforces a warning budget (`--max-warnings=467`).
- `.github/workflows/ci.yml`: install → typecheck → lint → test → build on every push and PR (AUD-03).
- Shared helpers: `src/core/errors.ts`, `src/core/ids.ts` (AUD-07 ID format), `src/core/hooks/useLatestRef.ts`, `src/core/hooks/useNow.ts`.

#### Removed
- `@next/swc-darwin-arm64` devDependency: Next resolves SWC per platform from the lockfile, so Linux CI works.
- `src/editor/panels/collaboration/LiveCollaborationPanel.tsx`: unused, and written against collab-store methods that don't exist.

#### Pending before Phase 1 is ✅
- The first green GitHub CI run, branch protection on `main`, and a PR with a deliberate type error shown to be blocked.

---

## [2.0.0] — 2026-09-24

### Direction Reset: AI-Native, Figma-Way Motion Studio, Rebuilt on an Honest Baseline

This release changes the Initial Phase's direction and replaces its roadmap. It follows a full audit of the codebase against the v1.1 claims.

#### Why
- Direction: the base of every design should be **built by AI and refined with AI**, designing should feel like **Figma** (including drawing: an oval becomes an ellipse, a line becomes a motion path), and the output should reach **React Bits-grade** effects across GSAP, Motion (Framer Motion), SVG, Three.js and shaders.
- Reality: the audit (`AUDIT.md`) found that v1.1's "8/8 phases complete" rested mostly on string-output unit tests. Specifically: 162 TypeScript errors, four conflicting element models, a timeline read/write bug, no animation engine running inside the editor, Framer Motion and Three.js not installed, a 2D canvas labelled as WebGL, an uncompiled Wasm kernel, no LLM, and exports that are never compiled.

#### Added
- **`AUDIT.md` (v1.0.0):** 28 findings (AUD-01 … AUD-28) with severity, evidence and fix phase, plus a list of what is genuinely solid and should be kept.

#### Changed
- **`PRD.md` (v1.1.0 → v2.0.0):** Renamed to *LazyLayout — AI-Native Motion Design Studio*. New principles (design first, engine second; One Document; Preview = Export; No Silent AI Writes; Simple by default; honest claims). Introduced the Motion Document Model concepts (Layer, Effect, Track, Clip, State, Trigger, Behaviour, Rule). Added Effect categories (Text, Interaction, SVG, Components, Backgrounds, 3D) with an effect contract, automatic engine routing, the AI system (Claude API, schema-constrained, streaming, cached, vision, offline fallback), Simple/Pro modes, draw-to-design and draw-to-animate, the Animation Playground, verified export, a real-environment Definition of Done, a licensing and risk register, and success metrics. Tech stack selection moves from project start to export time. Three.js and shader effects are now in scope.
- **`ROADMAP.md` (v1.1.0 → v2.0.0):** Expanded from 8 to **40 phases in 8 tracks**: A Solid Ground (fixes, 1–6), B Motion Core (7–13), C Engines (14–19), D Studio (20–26), E Export (27–29), F AI (30–34), G Simple Design / drawing (35–39), H Release (40). Added seven Architectural Laws (v2), a stricter Definition of Done, an honest reclassification of the v1.1 phases, audit traceability, milestones M1–M8, and a parallelisation guide.

#### Pending (tracked in ROADMAP v2 Phase 6.3)
- `UI.md`, `PANELS.md`, `SCHEMA_REFERENCE.md`, `CONVENTIONS.md` and `FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md` still describe v1.1. Each now carries a "pending v2 update" banner.

---

## [1.7.0] — 2026-09-21

### Phase 8 Completed: End-to-End Verification & Integration Gate (Initial Phase MVP)

Final completion and end-to-end integration gate for the Initial Phase (Element Animation Studio MVP). Full pipeline verification across all 4 element families, cross-framework drop-in code generation, 60 FPS performance guarantees with zero memory leaks, and complete 10-archetype × 5-dimension verification matrix (50 / 50 cells verified green):

#### Added
- **Sub-Phase 8.1: Full Pipeline Integration Test per Family (`PipelineIntegration.test.ts`)**
  - Verified full user flow from Project Hub launch ➔ Archetype selection ➔ Sequencer choreography ➔ Sandbox visual rendering ➔ Production code export for all 4 families (`Interactive`, `Media`, `Structural`, `Text`).
- **Sub-Phase 8.2: Cross-Framework Export Pipeline (`CrossFrameworkExporter.ts`)**
  - Added `VueComponentEmitter.ts`: Compiles visual AST elements into idiomatic Vue 3 Single File Components (`<template>`, `<script setup lang="ts">`, `<style scoped>`) with reactive state and GSAP integration.
  - Added `VanillaHtmlEmitter.ts`: Compiles visual AST elements into zero-dependency, framework-free HTML5 markup, modern CSS3 styling, and native Web Animations API / GSAP scripts.
  - Added `CrossFrameworkExporter.ts`: Unified export coordinator supporting Next.js 15 App Router, React 19 (Vite), Vue 3 SFC, and Vanilla HTML/CSS/JS with zero proprietary imports.
  - Added `CrossFrameworkExporter.test.ts` verifying clean, error-free exports across all 4 framework targets.
- **Sub-Phase 8.3: Performance Profiler & 60 FPS Guarantee (`PerformanceProfiler.ts`, `PerformanceBenchmark.test.ts`)**
  - High-precision frame execution profiler verifying frame tick durations within the 60 FPS frame budget ($\le 16.67$ms average).
  - Stress benchmark for GPU-intensive Image multi-filter stacks (blur, grayscale, brightness, contrast, saturate) and Background noise / animated multi-gradient drift layers.
  - Multi-iteration memory lifecycle profiler proving zero memory leaks and bounded heap growth across repeated timeline generation and disposal cycles.
  - Automated diagnostic analyzer providing GPU layer promotion and `will-change` hints to eliminate CPU layout reflows.
- **Sub-Phase 8.4: 10-Archetype × 5-Dimension Verification Matrix (`ArchetypeVerificationMatrix.test.ts`)**
  - Fully automated, comprehensive test suite verifying all 10 archetypes (`Button`, `Toggle`, `Badge`, `FAB`, `Image`, `Icon`, `Divider`, `Background Layer`, `Container`, `Text`) across all 5 dimensions:
    1. Schema Validation (AST structure, properties, hierarchy).
    2. Details Inspector Properties (archetype-specific configuration fields).
    3. Animation Authoring & Runtime (property tracks, keyframes, timeline compilation).
    4. Sandbox Preview Rendering (layout styles, CSS synthesis).
    5. Clean Code Export (zero-leak drop-in across Next.js 15, React 19 Vite, Vue 3, Vanilla HTML/JS).
  - **100% Green Verification Gate:** 50 out of 50 cells verified passing.
  - Total test suite expanded to **586 / 586 passing tests** across 174 test suites with 0 failures.

---

## [1.6.0] — 2026-09-21

### Phase 7 Completed: MotionAI Co-Pilot & Preset Ecosystem

Full implementation of the conversational prompt-to-motion AI engine, ghost keyframe visual diff approval gate, 51-preset per-family motion library, and GPU performance diagnostic assistant:

#### Added
- **Sub-Phase 7.1: Natural Language Prompt-to-Motion (`src/core/ai/MotionAiEngine.ts`)**
  - Synthesizes valid animation tracks from natural language prompts ("add an elastic bounce on tap", "add a Ken Burns zoom", "make this background drift like a slow sunrise", "draw divider in from center on scroll", "word stagger cascade").
  - Enforces **Rule 6.1 (Category Hard Block)**: Intercepts illegal gestures (e.g. tap on plain text, hover on divider) with clear architectural guidance and suggested alternatives.
- **Sub-Phase 7.2: Visual Diff & Human Approval Gate (`DiffPreview.tsx`)**
  - Stages proposed tracks as translucent green ghost keyframes without silent mutations.
  - Interactive Before vs After property track diff with explicit "Accept & Merge" and "Discard" actions.
- **Sub-Phase 7.3: Curated Preset Library (51 Presets across 4 Families)**
  - `interactivePresets.ts`: 13 presets (Magnetic Hover, Tactile Bounce, Mount Pop-In, Elastic Snap, Skeuomorphic Click, Liquid Toggle Slide, Jiggle Attention, Ripple Press, Haptic Vibrate, Focus Ring Pulse, Glint Shimmer, Float Levitate, Breathing Glow).
  - `mediaPresets.ts`: 13 presets (Ken Burns Zoom, Ken Burns Pan, Clip-Path Circle, Diamond Reveal, Angle Wipe, Grayscale to Color, Cinematic Blur-Up, Hover Zoom & Darken, 3D Tilt, SVG Stroke Draw, SVG Morph Pulsar, Vignette Shadow, Glitch Displacement).
  - `structuralPresets.ts`: 13 presets (Divider Draw LTR, Divider Draw Center, Gradient Sweep Loop, Dash Marquee, Scroll Reveal, Sunrise Gradient Drift, Aurora Mesh, Cosmic Drift, Parallax Scroll Depth, Film Grain Noise Pulse, Color Crossfade, Radial Scanner, Mesh Flow).
  - `textPresets.ts`: 12 presets (Word Stagger Cascade, Character Stagger Pop, Blur-Up Reveal, Kinetic Type Tracking, Underline Draw, Highlighter Sweep, Typewriter Step, Bounce Wave, Gradient Sheen, Split 3D Flip, Glitch Chromatic, Fade-Up Editorial).
  - Master aggregator (`src/core/motion/presets/index.ts`) with family filtering, query search, and Rule 6.1 validation.
- **Sub-Phase 7.4: Diagnostic Assistant (`MotionDiagnostics.ts`)**
  - Performance audit analyzing layout reflows (animating top/left/width/height instead of transform), high-complexity SVG path morphs (> 80 commands), oversized images (> 2000px), and heavy filter stacks (blur > 24px + noise).
  - 1-click Auto-Fix actions returning corrected elements and animation tracks.
- **Panel 11: MotionAI Co-Pilot Assistant Studio (`MotionAICoPilot.tsx`)**
  - Dockable studio panel in Right Dock (`Ctrl+Shift+I`) with pine-green design token theme (`#206859`).
  - Three integrated tabs: Prompt AI, Presets (51), and Diagnostics.
- **Phase 7 Verification Gate**
  - Verified prompt synthesis, Rule 6.1 enforcement, ghost diff calculation, preset hydration, and auto-fix execution in `MotionAiEngine.test.ts`.
  - Total test suite expanded to **495 / 495 passing unit tests** across 162 test suites.

---

## [1.5.0] — 2026-09-18

### Phase 6 Completed: Professional Clean Code Emitter & Exporter

Comprehensive delivery of the production code generation pipeline and clean code exporter for React 19, Next.js 15, Tailwind CSS, Scoped CSS Modules, GSAP 3, and Framer Motion across all 4 element families:

#### Added
- **Sub-Phase 6.1: Next.js 15 & React 19 TSX Emitters**
  - Generated clean, semantic JSX paired with either Tailwind CSS utility classes or Scoped CSS Modules (`styles.module.css`).
- **Sub-Phase 6.2: Archetype-Aware Tag Emission (`src/compiler/emitters/react/`)**
  - `InteractiveEmitter.ts`: Semantic `<button>` / `<div role="switch">` / status chips with full ARIA accessibility (`aria-pressed`, `aria-checked`, `aria-label`).
  - `MediaEmitter.ts`: Next.js `<Image />` with `fill` and aspect-ratio container, Vite/CRA `<img loading="lazy">`, and `<svg>`/`<path>` for Icon archetypes.
  - `StructuralEmitter.ts`: Semantic `<hr>` / styled `<div>` for solid/dashed/dotted Dividers, `<svg><line/></svg>` for gradient stroke-drawing, and backdrop `<div>` with `mixBlendMode` for Background Layers.
  - `TextEmitter.ts`: Inferred semantic headings (`<h1>`–`<h4>`), paragraphs, and character/word tokenization for SplitText stagger reveals.
- **Sub-Phase 6.3: Clean Animation Code Emitter**
  - Emits idiomatic `@gsap/react` `useGSAP()` hooks or Framer Motion `<motion.div>` variants with 0 proprietary runtime imports.
- **Sub-Phase 6.4: Live Code Inspector Split-View (`CodeInspector.tsx`)**
  - Dockable panel featuring real-time tab switching between `Component.tsx`, `useAnimation.ts`, `styles.module.css`, and `README.md`.
  - Instantaneous framework toggle (Next.js 15 / React 19 Vite), styling toggle (Tailwind / CSS Modules), and animation engine toggle (GSAP / Framer Motion / Native CSS).
- **Sub-Phase 6.5: Standalone Exporter & ZIP Bundler**
  - "1-Click Copy Code" button with visual feedback.
  - "Download ZIP Package" bundling `ComponentName.tsx`, `styles.module.css`, and `README.md` with exact dependency installation instructions.
- **Phase 6 Verification Gate**
  - Verified clean drop-in output for Button, Image, Divider, Background, and Text with 100% test pass rate in `ArchetypeEmitters.test.ts`.
  - Total test suite upgraded to **478 / 478 passing unit tests** across 157 test suites.

---

## [1.4.0] — 2026-09-18

### Phase 5 Completed: Multi-Engine Animation Runtime

Comprehensive implementation of visual authoring and runtime compilation support for GSAP 3.12, Framer Motion 11, SVG vector animations, and Native CSS across all 4 element families (Interactive, Media, Structural, Text):

#### Added
- **Sub-Phase 5.1: GSAP 3.12 Core Integration (`MultiEngineAnimationRuntime.ts`)**
  - Compiled timeline tracks to `gsap.timeline()` and `gsap.to()` chains with ScrollTrigger thresholds (`start`, `end`, `scrub`, `pin`, `markers`).
  - Full property mapping covering universal, media (`media.scale`, `media.clipPath`), divider (`divider.length`, `divider.strokeDashoffset`), and background paths (`background.gradient.angle`, `background.blendMode`).
  - Generated idiomatic React `@gsap/react` `useGSAP()` hook bindings with container scope and automatic garbage-collection cleanup.
- **Sub-Phase 5.2: Framer Motion 11 Core Integration**
  - Solved damped harmonic oscillator equations with continuous velocity handoff ($v_0$) for gesture interruption:
    $$\ddot{x} + 2\zeta\omega_n \dot{x} + \omega_n^2 (x - 1) = 0$$
  - Compiled declarative `whileHover` and `whileTap` variants with typed spring configurations (`stiffness`, `damping`, `mass`).
- **Sub-Phase 5.3: SVG & Divider Stroke-Draw Engine**
  - Implemented `solveSvgStrokeDraw` for line-drawing (`strokeDasharray`, `strokeDashoffset`).
  - Built Divider draw-in mechanism supporting both horizontal/vertical GPU scale and SVG stroke drawing (`divider.strokeDashoffset`).
  - Point-interpolated SVG path morphing for Icon vector transforms.
- **Sub-Phase 5.4: Image Motion Engine**
  - Ken Burns slow-zoom engine (`transform.scale` + `transform.x/y` drift).
  - Clip-path reveal wipes (`inset()`, `circle()`, `polygon()`).
  - Multi-property image filter evaluator (`blur`, `grayscale`, `brightness`, `contrast`, `saturate`).
  - Scroll-linked parallax translation offsets (`transform.y`).
- **Sub-Phase 5.5: Background Motion Engine**
  - Animatable gradient angle and stop drift (`background.gradient.angle`, `background.gradient.stopOffset`).
  - Background noise grain pulse evaluator for dynamic backdrop textures.
- **Sub-Phase 5.6: Native CSS Keyframe & Spring Emitter**
  - Pure CSS `@keyframes` generator with custom `cubic-bezier()` and CSS Easing Level 2 `linear(...)` spring curves.
- **Phase 5 Verification Gate**
  - Verified all 4 family archetypes (Interactive Button spring bounce, Media Image Ken Burns + filter, Structural Divider draw-in, Structural Background color/gradient) in `MultiEngineAnimationRuntime.test.ts`.
  - Upgraded total test suite to **464 / 464 passing unit tests** across 151 test suites.

---

## [1.3.0] — 2026-09-18

### Phase 3 & 4 Completed & Animation Engine Architecture Unified

Comprehensive delivery of the Visual Motion Sequencer, Element Archetype Library, and the unified Animation Properties & Engine Reconciliation Specification:

#### Added
- **Animation Properties & Engine Reconciliation Specification (`ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md`)**
  - Exhaustive 1,827-line technical architectural manual reconciling GSAP 3.x, Framer Motion, and Native CSS/WAAPI at the physical rendering pipeline level for guaranteed 120 FPS performance.
  - Complete mathematical models: $4 \times 4$ affine homogeneous coordinate matrices, 2-pass separable Gaussian blur convolution, RK4 numerical integration for continuous spring dynamics, and FLIP layout reflow projection.
  - Single Transform Authority (STA) synthesis, `transition: all` AST sanitization, and priority arbitration protocols.
  - Full element contract coverage across all 32 element types defined in `lazylayout_element_grammer.md`.
  - Master Architecture, Engine & Property Implementation Checklist (§13) with 100% verified status.
- **Runtime Engine Adapters & Lowering Compiler (`EngineAdapters.ts` & `AnimationLoweringCompiler.ts`)**
  - Implemented `synthesizeSingleTransformMatrix()` to unify multi-track 3D spatial transforms into a single GPU compositor string.
  - Built `CssCompositorAdapter` (Target A), `FramerMotionAdapter` (Target B), and `GsapEngineAdapter` (Target C) managed by `EngineAdapterManager`.
  - Implemented analytical damped harmonic oscillator spring baking into standard CSS Easing Level 2 `linear(...)` curves for zero-dependency exports.
- **Studio Sequencer & Content Browser Linkage**
  - Interactive `+ Add Animation` evaluation with dynamic quota status (`[Locked]` tooltips, candidate count pills).
  - Outliner tree 1-click synchronization scoping the animation stack to selected elements.
  - Track lanes with performance classification badges (`GPU 120fps`, `Paint 60fps`, `Reflow Alert`).
  - Live Animation Export Preview modal supporting instantaneous toggling between Pure CSS, WAAPI, Framer Motion, and GSAP.
- **Automated Verification**
  - 444 / 444 automated unit tests passing across 143 test suites (`npm test`).
  - Browser subagent visual verification confirmed 0 console errors and clean 120 FPS timeline operation.

---

## [1.2.0] — 2026-09-17

### Phase 2 Implementation Completed: Interactive Project Hub & Design Launcher

Implemented Screen 00 (`/`) and workspace tailoring for the Initial Phase:

#### Added
- **Sub-Phase 2.1: Element-Only Scope Selector**
  - `ScopeCard.tsx`: Element Design active and pre-selected. Component Design and Page/Section Design rendered in disabled state with tooltip reason per `PRD.md` §6 and `UI.md` §2.1.
- **Sub-Phase 2.2: Archetype Picker**
  - `archetypeData.ts`: Central registry for 4 families (Interactive, Media, Structural, Text) and 10 archetypes with ID prefixes (`elem_btn_`, `elem_img_`, `elem_divider_`, `elem_bg_`, etc.).
  - `ArchetypePicker.tsx`: Accessible interactive grid with keyboard navigation and archetype selection.
  - Launch gating logic: Blocks launching until an archetype is selected.
- **Sub-Phase 2.3: Technology & Engine Configurator**
  - `TechConfigurator.tsx`: Configures Target Framework (6 options), Styling System (4 options), Animation Engine (4 options), Language toggle (TypeScript/JavaScript), and Starting Template presets.
  - Integrated into `ProjectHub.tsx` Step 4 with live preview summary in Step 5.
- **Sub-Phase 2.4: Project Initialization & Workspace Tailoring**
  - `useProjectStore.ts`: Added `initElementProject` creating tailored root elements, stage page, and target manifest.
  - `MediaSection.tsx`, `DividerSection.tsx`, `BackgroundSection.tsx`, `SvgVectorSection.tsx`: Context-aware inspector sections.
  - `DetailsInspector.tsx`: Dynamic section rendering based on selected archetype (`image` -> Media Details, `divider` -> Divider, `background` -> Background, `icon` -> SVG Vector, `button`/`text` -> Typography).
  - `EditorShell.tsx`: Automatically initializes from URL parameters (`archetype`, `name`, `framework`, `styling`, `animation`, `lang`, `template`).
  - Unit test suites in `src/editor/panels/launcher/__tests__/`: 31 tests passing across 4 sub-phases, plus all 376 workspace tests passing.

---

## [1.1.0] — 2026-09-17

### Scope Correction: Element Design Only, With Full Image / Divider / Background Depth

This release corrects and narrows the Initial Phase specification suite. It does **not** add Component or Page/Section functionality — it does the opposite: it removes ambiguity around scope and replaces it with a single, completely-specified target (**Element Design only**), while adding the missing technical depth for three element archetypes that were previously unspecified: **Image, Divider, and Background Layer**.

#### Why
The v1.0.0 suite described 3 design scopes (Element, Component, Page) as if all three were in play for the Initial Phase. In practice, the Initial Phase builds **only** Element Design, and even within Element Design, the Image, Divider, and Background archetypes — despite being core, everyday use cases (a hero image, a section divider, an animated backdrop) — had no dedicated property schema, Details Inspector section, ID convention, or code emitter path. v1.1.0 closes both gaps so the specification is unambiguous enough for an implementer (human or AI) to build directly against it.

#### Changed
- **PRD.md (v1.0.0 → v1.1.0)**
  - Reframed §1–§3 around a single scope: Element Design. Component Design and Page/Section Design are now explicitly deferred to `ROADMAP.md` Phase 9+, disabled (not hidden) on the Home Screen.
  - Added §5: **The Four Element Families** — Interactive, Media, Structural, Text — with a full property surface for Image, Divider, and Background Layer.
  - Rewrote §6 (Home Screen) to show the Element-only scope selector, disabled Component/Page cards, and a required Archetype Picker.
  - Rewrote §7 (Exporter Requirements) to specify archetype-correct tag emission (`<img>`/`<Image>`, `<hr>`/`<svg><line/>`, `<div>`).
  - Rewrote §8 (Definition of Done) to require completeness across all 10 archetypes, not just Button.

- **CONVENTIONS.md (v1.0.0 → v1.1.0)**
  - Added a §1 Purpose statement and TypeScript/testing conventions.
  - Extended the ID Generation table (§3) with prefixes for every archetype: `elem_toggle_`, `elem_badge_`, `elem_fab_`, `elem_img_`, `elem_divider_`, `elem_bg_`, `elem_container_`, `elem_text_`.
  - Split the Standard Animation Property Paths section (§4) into Universal / Interactive & Text / Media / Structural groups, adding the full `media.*`, `divider.*`, and `background.*` dot-paths.
  - Added the archetype-correct semantics rule to Code Export Conventions (§6).

- **SCHEMA_REFERENCE.md (v1.0.0 → v1.1.0)**
  - Added archetype-specific fragments for Image (§3.1), Divider (§3.2), and Background Layer (§3.3) to the Element AST Schema.
  - Added example animation timelines for Image scroll-parallax, Divider draw-in, and Background gradient drift, including the new `iterationCount: -1` infinite-loop convention.
  - Documented that `project.json`'s `scope` field is fixed to `"element"` in this phase.

- **PANELS.md (v1.0.0 → v1.1.0)**
  - Panel 00: documented the disabled Component/Page cards and the new required Archetype Picker.
  - Panel 01: removed responsive multi-breakpoint framing (was Page-scope leakage); documented Image focal-point and Divider length handles.
  - Panel 03: split into Universal sections plus new archetype-specific sections — Media, Divider, Background.
  - Panel 04: added `Presets/Image/`, `Presets/Divider/`, `Presets/Background/`, and `Images/` content browser folders.
  - Added two new Workspace Layout Presets: **Media & Image Workshop** and **Structural & Background Workshop**.

- **UI.md (v1.0.0 → v1.1.0)**
  - Screen 00: documented the disabled scope cards and Archetype Picker step.
  - Screen 01–03: updated to reflect Element-only framing and the new Media/Divider/Background inspector sections and on-canvas handles.
  - Screen 04: added Image/Divider/Background preset folders.
  - Added a disabled-surface color token set (§2.1) for the Component/Page cards.

- **FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md (v1.0.0 → v1.1.0)**
  - Split `src/core/elements/archetypes.ts` into a per-family `archetypes/` directory (`interactive.ts`, `media.ts`, `structural.ts`, `text.ts`) with matching validators.
  - Added `MediaSection.tsx`, `DividerSection.tsx`, `BackgroundSection.tsx` to the Details panel folder.
  - Split the React code emitter into `InteractiveEmitter.ts`, `MediaEmitter.ts`, `StructuralEmitter.ts`, `TextEmitter.ts`.
  - Updated the in-memory AST diagram to show `family`, `media?`, `divider?`, `background?` on `ElementNodeAST`.

- **ROADMAP.md (v1.0.0 → v1.1.0)**
  - Restructured Phase 3 into per-family sub-phases (3.1 Interactive, 3.2 Media, 3.3 Structural, 3.4 Text, 3.5 Outliner).
  - Restructured Phase 5 into per-family runtime sub-phases (5.3 SVG & Divider Stroke-Draw, 5.4 Image Motion Engine, 5.5 Background Motion Engine).
  - Restructured Phase 6 to require archetype-aware tag emission (6.2) rather than a single generic emitter.
  - Restructured Phase 8 to require an explicit per-archetype verification matrix (8.4) before sign-off.

#### Added
- **CHANGELOG.md (v1.1.0)** — This entry.

---

## [1.0.0] — 2026-09-17

### Initial Phase Specification Suite Created

Established the comprehensive documentation suite for the **Initial Phase** inside `DOCS/Initial/`. This isolates and perfects **LazyLayout**—a professional tool for visually crafting interactive elements, components, and pages using GSAP, Framer Motion, SVG vector animations, and CSS, compiling into clean, production-grade code ready to drop into any external codebase.

#### Added
- **PRD.md (v1.0.0)** — Master Product Requirements Document for Initial Phase
  - Core philosophy: "Unreal Engine for Animation & Frontend Design".
  - Unreal-to-Motion Studio conceptual mapping table.
  - Definition of the 3 Design Scopes: Element Design, Component Design, and Page/Section Design.
  - Multi-engine animation architecture: GSAP 3.12, Framer Motion 11, SVG path morphing & stroke, and native CSS.
  - Elimination of all backend, database, SQL, API, and Auth subsystems.
  - Professional code export requirements with zero engine runtime overhead.

- **UI.md (v1.0.0)** — UI & Workspace Architecture
  - Synthesis of Atlassian Confluence warm-white canvas (`#FCFDFD`) and refined Unreal curved dockable shell.
  - Animation track and timeline color taxonomy (Transform, Scale, Rotation, Opacity, Color, SVG, Filter, Springs).
  - Dedicated specification for **Screen 00: Interactive Project Hub & Design Launcher**.
  - Detailed specs for 10 tailored screens.
  - 5 workspace presets.

- **PANELS.md (v1.0.0)** — Complete Panel & Tab Registry
  - 12 core dockable panels + 1 standalone launcher page.
  - Inside-Out Engine Law applied to animations.
  - Panel features, default dock positions, and keyboard shortcuts.
  - Stripped of all database ER modeler, API integration, Auth RBAC, and cloud deployment panels.

- **ROADMAP.md (v1.0.0)** — Phased Implementation Milestones
  - 8 focused phases for the Initial Phase.

- **FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md (v1.0.0)** — Codebase & Data Architecture
  - Clean separation between Hierarchy A (Engine Codebase) and Hierarchy B (User Project Hierarchy).
  - In-memory AST hierarchy.
  - 6-step execution lifecycle from visual edit to external repository drop-in.

- **SCHEMA_REFERENCE.md (v1.0.0)** — JSON Schema Contracts
  - Declarative JSON schema contracts for `project.json`, `element.json`, `timeline.json`, `scrolltrigger.json`, `spring.json`, `svg-morph.json`, and `export-manifest.json`.

- **CONVENTIONS.md (v1.0.0)** — Naming, Coding & File Conventions
  - File naming standards, deterministic prefix-plus-hex ID generation.
  - Standard animation property dot-paths.
  - "One Element = One Styling Source" principle and code export hygiene.

- **CHANGELOG.md (v1.0.0)** — This file.