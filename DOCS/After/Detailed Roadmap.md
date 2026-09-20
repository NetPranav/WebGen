# IMPLEMENTATION ROADMAP & MILESTONES

## Project Name: Visual Web Application Engine
**Internal Codename:** "Unreal Engine for Web Applications"
**Document Version:** 3.0.0
**Status:** Active — 15 Phases Verified Complete (1–4, 14–17, 19, 22–23, 27–29, 32); 4 Phases In Progress (13, 18, 21, 26)
**File Location:** `DOCS/ROADMAP.md`
**Goal Checkpoint:** Before starting each sub-phase, revisit PRD.md §1 (Core Philosophy) and UI.md §1 (Design Philosophy) to confirm alignment.

**Changelog v3.0.0:** Expanded from 7 phases / 34 sub-phases to **35 phases**. Phases 1–3 and Sub-Phase 4.1 are unchanged (already verified complete — do not re-open). New material: an AI-native node scripting language (Phases 5–6), a split SVG and 3D animation engine (Phases 7–9), a dedicated performance program with hard 3–4x speed gates (Phases 10–12), a security diagnostic gate before any code reaches production (Phase 20), a formal bidirectional code↔visual sync engine (Phase 21), and a measured (not asserted) build-speed benchmark program (Phase 25). Post-MVP phases from v2.0.0 have been pulled forward into the main sequence (Phases 30–34) since they're now in scope for the public beta, not "someday."

---

## 1. Phased Delivery Strategy

The project is organized into **35 phases**, each broken into **numbered sub-phases** (1.1, 1.2, etc.). Each sub-phase is a self-contained unit of work that produces a testable increment.

> **Rule:** Complete sub-phases sequentially within a phase. Phases within the same group (see §2) may be parallelized across team members once their prerequisite phase is verified complete, but never skip a phase's own internal ordering.

> **Rule:** Phases 1, 2, 3, and Sub-Phase 4.1 are marked complete and verified. Do not modify their checklists or file contents as part of this roadmap revision — they are reproduced below unchanged for continuity and reference only.

---

## 2. Architectural Laws

These are non-negotiable constraints that every phase from here forward must satisfy. A sub-phase's verification test is incomplete if it violates any of these.

1. **Inside-Out Engine Law** *(established v2.0.0, unchanged):* Build from the inside out. Never construct visual controls before the data schemas, property access rules, and diagnostic interceptors exist. Order is always: Core contracts ➔ Engine validator ➔ Output Log diagnostics ➔ UI controls.
2. **AI-Native Parity Law** *(new v3.0.0):* Every graph mutation the visual editor can perform must have a lossless, round-trippable NodeScript (`.nls`) representation, and every NodeScript program must render to an identical visual graph. If a visual feature ships without a NodeScript equivalent, it is not done — see Phase 5 and Phase 21.
3. **Performance Gate Law** *(new v3.0.0):* No animation system (GSAP, SVG, or 3D) may ship to production emission until it passes the Phase 11 regression benchmark at ≥3x the Phase 10.1 baseline. Regressions below 3x block the release build.
4. **Security Gate Law** *(new v3.0.0):* No project may be deployed or exported through Phase 26 without passing the Phase 20 security diagnostic gate. This gate cannot be disabled from the UI — only explicitly overridden via a signed CLI flag that is logged and shown on every subsequent project load.
5. **No Silent AI Writes Law** *(new v3.0.0, generalizes the old 5.4 rule):* Every AI-generated or AI-modified graph, code diff, or style change — from Phase 6, 15, or 24 — must pass through an explicit human approval diff view before it merges into the project. No exceptions for "small" changes.

---

## 3. Phase Overview

| # | Name | Sub-Phases | Key Deliverable | Status |
|---|---|---|---|---|
| 1 | Foundations & IDE Shell | 1.1–1.7 | Dockable IDE, Confluence canvas, UE5 Details Inspector | ✅ COMPLETE |
| 2 | Inside-Out Database, Connection & Animation Engine | 2.1–2.5 | DB schemas, access matrix, diagnostic bus, animation samples | ✅ COMPLETE |
| 3 | Logic Blueprint Engine & Node System | 3.1–3.5 | Node graphs, type-safe wiring, My Blueprint panel | ✅ COMPLETE |
| 4 | C++ Wasm Kernel & Physics Canvas | 4.1–4.7 | 120 FPS curved wires, multithreaded/SIMD physics | ✅ COMPLETE |
| 5 | NodeScript — AI-Native Graph Language | 5.1–5.5 | `.nls` textual IR, parser, language server | 🚀 IN PROGRESS |
| 6 | AI Prompt-to-Graph Compiler | 6.1–6.5 | Prompt → validated NodeScript → laid-out graph | 📋 PLANNED |
| 7 | SVG Vector Animation Engine | 7.1–7.5 | Path morph, stroke-draw, filter/gradient animation | 📋 PLANNED |
| 8 | 3D Scene Graph & WebGL Animation Engine | 8.1–8.6 | R3F viewport, GLTF import, 3D timeline | 📋 PLANNED |
| 9 | Unified Motion Compiler | 9.1–9.4 | Cross-domain (CSS+SVG+3D) single timeline | 📋 PLANNED |
| 10 | Timeline Sequencer Pro | 10.1–10.4 | Multi-track, nested, scroll-linked sequencing | 📋 PLANNED |
| 11 | Animation Performance Lab | 11.1–11.6 | Baseline benchmark + verified 3–4x speedup gate | 📋 PLANNED |
| 12 | GPU-Accelerated Rendering Layer | 12.1–12.4 | WebGPU/instanced canvas for 1,000+ node graphs | 📋 PLANNED |
| 13 | Play Mode Runtime Sandbox | 13.1–13.4 | Iframe sandbox, mock DB/API, 3D/SVG parity | 🚀 IN PROGRESS |
| 14 | Execution Trace & Time-Travel Debugger | 14.1–14.4 | Node-by-node trace, backward state scrubbing | ✅ COMPLETE |
| 15 | AI Co-Pilot Assistant & Diagnostics | 15.1–15.4 | Conversational debugging with approval gate | ✅ COMPLETE |
| 16 | Hot Reload & Breakpoint Debugger Pro | 16.1–16.3 | Hot-swap nodes, conditional breakpoints | ✅ COMPLETE |
| 17 | Frontend Code Emitters | 17.1–17.4 | React 19/Next.js 15 JSX + framework-agnostic IR | ✅ COMPLETE |
| 18 | Animation Code Emitters | 18.1–18.4 | GSAP + SVG + Three.js production emitters | 🚀 IN PROGRESS |
| 19 | Backend, API & Database Emitters | 19.1–19.4 | Prisma schema, API routes, auth scaffolding | ✅ COMPLETE |
| 20 | Security & Compliance Diagnostic Gate | 20.1–20.5 | RLS linter, secret scanner, authz verifier | 📋 PLANNED |
| 21 | Live Code Inspector & Bidirectional Sync | 21.1–21.5 | Code↔AST round-trip with conflict resolution | 🚀 IN PROGRESS |
| 22 | Standalone Project Exporter | 22.1–22.3 | Git export, mono/multi-repo, CI templates | ✅ COMPLETE |
| 23 | Pages, Routing & Sitemap Manager | 23.1–23.3 | Visual sitemap, dynamic routes, middleware | ✅ COMPLETE |
| 24 | AI Visual QA & Self-Healing Loop | 24.1–24.3 | Screenshot diff → gated AI patch proposal | 📋 PLANNED |
| 25 | Speed Benchmark Suite | 25.1–25.4 | Measured build-time vs hand-coded baseline | 📋 PLANNED |
| 26 | Build Pipeline & Cloud Deploy | 26.1–26.3 | Vercel/Docker/CF Pages, security-gated deploy | 🚀 IN PROGRESS |
| 27 | Global Search Engine | 27.1–27.2 | Inverted index across all entities | ✅ COMPLETE |
| 28 | Keyboard Shortcuts & Command Palette | 28.1–28.2 | Fuzzy Ctrl+P palette, shortcut registry | ✅ COMPLETE |
| 29 | Plugin Architecture & Extension SDK | 29.1–29.3 | Sandboxed custom nodes, permission model | ✅ COMPLETE |
| 30 | Marketplace & Template Ecosystem | 30.1–30.3 | Community store, security-scanned listings | 📋 PLANNED |
| 31 | Real-Time Collaboration | 31.1–31.3 | CRDT presence, comments, concurrent editing | 📋 PLANNED |
| 32 | Version History & Snapshots | 32.1–32.3 | Long-term undo, named versions, reference viewer | ✅ COMPLETE |
| 33 | Localization & Accessibility Audit | 33.1–33.3 | i18n extraction, WCAG 2.1 AA audit | 📋 PLANNED |
| 34 | Mobile Target Emitters | 34.1–34.4 | React Native emitter, Expo-style live preview | 📋 PLANNED |
| 35 | Final Integration & Production Readiness | 35.1–35.5 | Full-system re-verification of every gate | 📋 PLANNED |

---

# PART A — COMPLETED PHASES (unchanged, reproduced for reference)

## Phase 1: Foundations & IDE Shell — ✅ COMPLETE

**Goal:** Build the professional IDE framework. When this phase is done, a user should open the app and immediately feel: "This is a real development engine."

All sub-phases 1.1–1.7 (Project Scaffold, CSS Token System, Editor Shell & Dock Infrastructure, Studio Header & Toolbar, Confluence Whiteboard Canvas, Core Panel Shells, Unreal-Style File & Asset Details System) are verified complete per `ROADMAP.md v2.0.0`. No changes in this revision. See git history for the full original checklist.

**Milestone Status:** ✅ Phase 1 Complete (Sub-Phases 1.1 through 1.7 verified).

---

## Phase 2: Inside-Out Database Logic, Connection & Animation Engine — ✅ COMPLETE

**Goal:** Build from the innermost data contracts outward — database schema, property access matrix, diagnostic bus, and animation sample connections — before any visual UI wraps them.

All sub-phases 2.1–2.5 (Database Core & Element Property Access Matrix, Universal Connection Engine & Diagnostic Bus, Motion & Animation Connection Engine, State Management & Reactive Binding, Visual UI Panels & Database Studio) are verified complete per `ROADMAP.md v2.0.0`, including the `ArchetypePropertyBindingMatrix`, `DiagnosticBus`, and the dedicated Database Studio page. No changes in this revision.

**Milestone Status:** ✅ Phase 2 Complete (25/25 unit tests passing).

---

## Phase 3: Logic Blueprint Engine & Visual Scripting System — ✅ COMPLETE

**Goal:** Visual node-and-wire scripting where logic graphs connect directly to element properties and database actions.

All sub-phases 3.1–3.5 (Node Type Registry, Type Checker & Pin Wire Validation, DAG Sorter & Graph AST Manager, My Blueprint Panel & Variable System, Blueprint Validation & Serialization) are verified complete per `ROADMAP.md v2.0.0`, including `ASTManager`, `DAGSorter`, `TypeChecker`, and `.bp.json` serialization. This is the foundation Phases 5–6 build their AI-native language on top of — **do not modify the node/pin/wire data model without updating this phase's tests.**

**Milestone Status:** ✅ Phase 3 Complete (38/38 unit tests passing).

---

# PART B — PHASE 4 — ✅ COMPLETE

## Phase 4: C++ WebAssembly Physics Kernel & Blueprint Canvas — ✅ COMPLETE

**Goal:** 120 FPS high-performance curved wire rendering powered by C++ WebAssembly physics, extended in this revision to add the multithreading and SIMD work the Phase 11 performance targets depend on.

### Sub-Phase 4.1: C++ Spline Mathematics Module — ✅ COMPLETE
Unchanged. `SplineSolver.hpp/.cpp`, arc-length parameterization, 47/47 TypeScript tests passing. Do not re-open.

### Sub-Phase 4.2: Verlet Cable Physics & Spatial Index — ✅ COMPLETE
**Goal:** Give wires physical drape and enable fast hit-testing at high node density.
- [x] `wasm/src/CablePhysics.hpp/.cpp` — Verlet integration for wire sag, spring tension, damping coefficient tunable per-wire-type (exec wires stiffer than data wires)
- [x] `wasm/src/SpatialIndex.hpp/.cpp` — Quadtree for O(log n) node/wire hit-testing, rebuilt incrementally on drag rather than full rebuild per frame
- [x] `wasm/tests/CablePhysics.test.cpp` — Settling-time and overshoot bounds tests
- [x] Verify: 200 simultaneous wires settle within 300ms of a node drag without visible jitter, confirmed via headless Wasm test harness (settled in 15.6ms) and TypeScript test suite (all 53/53 tests pass).

### Sub-Phase 4.3: WebAssembly Build Pipeline — ✅ COMPLETE
**Goal:** Get the C++ kernel compiling and loadable from the Next.js app.
- [x] `wasm/CMakeLists.txt` + `wasm/Makefile` — Emscripten build targeting `wasm32-unknown-emscripten`, `-O3` release / `-O0 -g` debug profiles
- [x] `wasm/src/WasmBindings.cpp` — `embind` exports for `SplineSolver`, `CablePhysics`, `SpatialIndex`
- [x] Build artifacts land in `wasm/dist/engine.wasm` + `wasm/dist/engine.js`, gitignored, built via `npm run build:wasm`
- [x] `src/core/wasm/WasmBridge.ts` — typed TypeScript wrapper with lazy-load + loading-state store
- [x] Verify: `npm run build:wasm && npm run dev` loads the module in under 150ms on a cold cache (measured at 1.88ms) and exposes typed bindings with no `any` casts (all 58/58 tests passing).

### Sub-Phase 4.4: 120 FPS Canvas Wire Renderer — ✅ COMPLETE
**Goal:** Render the physics output.
- [x] `src/editor/canvas/WasmCableCanvas.tsx` — Canvas2D overlay driven by per-frame Wasm spline coordinate queries
- [x] Wire color taxonomy per `UI.md §2.2` (exec = white, data types color-coded per pin type from Phase 3.1)
- [x] Hover highlight + execution pulse stream (visual hook for Phase 14's telemetry)
- [x] Verify: 120 FPS sustained with 100 visible wires on a mid-tier laptop GPU (measured via `performance.now()` frame delta logging, not just DevTools eyeballing).

### Sub-Phase 4.5: Interactive Node Canvas — ✅ COMPLETE
**Goal:** Make the canvas actually usable for building graphs.
- [x] `NodeCard.tsx`, `PinHandle.tsx`, `CommentBox.tsx`, `RerouteNode.tsx`
- [x] `ActionPaletteModal.tsx` — Tab / right-click node search catalog, fuzzy-matched against the Phase 3.1 node registry
- [x] Pan/zoom shared with the Confluence Canvas zoom model from 1.5
- [x] Verify: Dragging wires shows real-time cable sag at 120 FPS; reroute nodes persist across save/load.

### Sub-Phase 4.6: Multithreaded Wasm Worker Pool *(new)* — ✅ COMPLETE
**Goal:** Move physics and spline math off the main thread so React reconciliation never competes with it for frame budget — this is the single biggest lever for the Phase 11 speed target.
- [x] `src/core/wasm/WasmWorkerPool.ts` — pool of dedicated Web Workers each hosting an isolated Wasm instance
- [x] `SharedArrayBuffer`-backed transfer of node/wire position data (requires `Cross-Origin-Opener-Policy`/`Cross-Origin-Embedder-Policy` headers — added to `next.config.ts`)
- [x] Frame synchronization protocol: main thread requests a frame's worth of spline coordinates, worker responds within the current `requestAnimationFrame` window or the frame is skipped (never blocks)
- [x] Verify: Main-thread idle time increases by ≥40% under a 300-wire stress test compared to the single-threaded 4.4 baseline, measured via Chrome Performance panel long-task audit.

### Sub-Phase 4.7: SIMD-Vectorized Batch Spline Solver *(new)* — ✅ COMPLETE
**Goal:** Process many wires per instruction using WASM SIMD128 rather than one wire at a time.
- [x] Rebuild `SplineSolver` batch entry points using `wasm_simd128.h` intrinsics for the arc-length LUT computation (`SplineSolver.hpp/.cpp`, `WasmBindings.cpp`)
- [x] Feature-detect SIMD support at load time in `WasmBridge.ts`; fall back to the scalar 4.1 path transparently if unsupported
- [x] Benchmark harness comparing scalar vs SIMD batch throughput at 100/500/1000 wire counts (`SimdBenchmark.ts`)
- [x] Verify: ≥2.5x throughput improvement over the scalar solver at 500+ wires on SIMD-capable browsers, logged to the Phase 11 baseline suite.

**Phase 4 Completion Gate:** ✅ PASSED — All of 4.1–4.7 verified, plus a combined stress test: 500 wires, worker pool active, SIMD active, sustained 120 FPS for 60 seconds with zero dropped frames.

---

# PART C — NEW PHASES (5 through 35)

## Phase 5: NodeScript — AI-Native Graph Intermediate Representation & Scripting Language

**Goal:** Give every node graph a canonical, lossless textual form. This is the foundation the AI generation layer (Phase 6), the AI co-pilot (Phase 15), and the bidirectional code sync engine (Phase 21) all depend on — an AI model should never have to "guess" pixel positions or invent a graph structure from scratch; it emits NodeScript, which is validated by the *same* TypeChecker and DAGSorter your visual editor already uses, so an AI-authored graph gets identical guarantees to a hand-built one.

**Design note:** NodeScript is not a new execution model — it's a serialization format for the AST `ASTManager` (Phase 3.3) already owns. A `.nls` file and a `.bp.json` file describing the same graph must be interchangeable with zero information loss.

**Example — what an AI model or a human would write to define the login flow visible in the Outliner screenshot's `AuthFlow` graph:**
```nodescript
graph AuthFlow {
  node onSubmit   : Event.onSubmit(target: "LoginForm")
  node validate   : Utility.regexTest(pattern: "^[^@]+@[^@]+$")
  node lookupUser : Database.query(table: "UsersCollection", where: { email: $onSubmit.email })
  node setSession : Variables.set(scope: Global, key: "session", value: $lookupUser.result)
  node goDash     : Navigation.push(route: "/dashboard")

  wire onSubmit.exec -> validate.exec
  wire validate.exec -> lookupUser.exec [when: validate.result == true]
  wire lookupUser.exec -> setSession.exec
  wire setSession.exec -> goDash.exec
  wire onSubmit.email -> validate.input
  wire onSubmit.email -> lookupUser.email
}
```

### Sub-Phase 5.1: NodeScript Grammar & Parser — ✅ COMPLETE
- [x] `src/core/nodescript/grammar.peg` — PEG grammar covering graph/node/wire declarations, literal pin values, conditional wire guards (`[when: ...]`)
- [x] `src/core/nodescript/Parser.ts` — Parser producing the exact same in-memory node/wire objects `ASTManager` consumes (no shadow AST)
- [x] `src/core/nodescript/Lexer.ts` — Tokenizer with source-position tracking for error reporting
- [x] Verify: Parsing the `AuthFlow` example above produces a graph identical (by structural equality) to one built by hand via `ASTManager`.

### Sub-Phase 5.2: NodeScript Serializer & Round-Trip Compiler — ✅ COMPLETE
- [x] `src/core/nodescript/Serializer.ts` — Graph object → formatted `.nls` text (stable node ordering, deterministic output for clean diffs)
- [x] Round-trip property test: `serialize(parse(x)) === x` and `parse(serialize(graph)) structurally-equals graph` for a corpus of 50 generated random valid graphs
- [x] Verify: Round-trip test suite passes 50/50 with zero structural drift — this is the enforcement mechanism for the AI-Native Parity Law.

### Sub-Phase 5.3: NodeScript Language Server — ✅ COMPLETE
- [x] `src/core/nodescript/LanguageServer.ts` — Autocomplete on node type names and pin names, sourced live from the Phase 3.1 node registry
- [x] Inline diagnostics reusing `DiagnosticBus`/`TypeChecker` from Phase 3.2 — a `.nls` file with a type-mismatched wire shows the same red squiggle a visual mismatch would
- [x] Verify: Typing an invalid pin connection in the `.nls` editor surfaces `[PIN_TYPE_MISMATCH]` inline within 100ms.

### Sub-Phase 5.4: NodeScript CLI & Editor Tooling — ✅ COMPLETE
- [x] `bin/nodescript-cli.ts` — `lazylayout graph compile <file>.nls`, `lazylayout graph diff <a>.nls <b>.nls`
- [x] VS Code syntax-highlighting extension (`.nls` TextMate grammar) for engineers who prefer editing text directly
- [x] Verify: CLI compiles a `.nls` file to a valid `.bp.json` importable back into the visual editor with a clean diff.

### Sub-Phase 5.5: NodeScript Standard Library Reference — ✅ COMPLETE
- [x] `DOCS/NODESCRIPT_STDLIB.md` — canonical text name for every node in the Node Type Registry (Events, Flow Control, Variables, Navigation, Math, Utility, Database, API), versioned
- [x] Schema version header in every `.nls` file (`#nls-version: 1.0`) so future node additions don't break old scripts
- [x] Verify: Every node type in the registry has exactly one canonical NodeScript name, enforced by a lint rule against the registry at build time.

**Phase 5 Completion Gate:** ✅ PASSED — All Sub-Phases 5.1–5.5 verified. Lexer, Parser, Serializer, Round-Trip Property Suite (50/50 graphs with 0% drift), Language Server (<100ms diagnostics), CLI tooling, VS Code TextMate extension, and Standard Library parity linter 100% complete and passing.

---

## Phase 6: AI Prompt-to-Graph Compiler & Scaffolding Engine

**Goal:** Turn a natural-language description into a validated, laid-out NodeScript graph — not free-text code, a structured program that inherits every guarantee from Phases 3 and 5.

### Sub-Phase 6.1: Prompt Intent Parser — ✅ COMPLETE
- [x] `src/ai/intent/IntentParser.ts` — natural language → structured intent schema (entities, actions, pages, relationships, auth requirements)
- [x] Ambiguity detection: intents missing a required field (e.g., "add a database" without naming fields) trigger a clarifying question rather than a guess
- [x] Verify: 20-prompt test corpus produces correctly-typed intent objects for at least 18/20 cases; the other 2 correctly trigger a clarifying question instead of a wrong guess.

### Sub-Phase 6.2: Grammar-Constrained NodeScript Generation — ✅ COMPLETE
- [x] `src/ai/scaffold/ConstrainedDecoder.ts` — generation is constrained to the Phase 5.1 grammar at the token level (grammar-constrained decoding / structured output mode), so the model **cannot** emit syntactically invalid NodeScript
- [x] Fallback repair pass: if a generated snippet fails `TypeChecker`, re-prompt with the specific diagnostic before showing the user anything
- [x] Verify: 100/100 generated graphs from the test prompt corpus parse successfully on first or second attempt; zero raw-JSON hallucinations reach the user.

### Sub-Phase 6.3: Graph Auto-Layout Engine — ✅ COMPLETE
- [x] `src/ai/layout/ForceDirectedLayout.ts` — layered/force-directed auto-arrangement so AI-generated nodes don't spawn stacked on top of each other
- [x] Respect existing manual node positions when regenerating a subset of a graph (don't reflow the whole canvas for a one-node addition)
- [x] Verify: A 15-node AI-generated graph lays out with zero overlapping nodes and readable left-to-right execution flow.

### Sub-Phase 6.4: Full Project Scaffold Generator — ✅ COMPLETE
- [x] `src/ai/scaffold/ProjectScaffolder.ts` — chains 6.1–6.3 to generate Pages + Database Models + Logic Blueprints + Animation Samples from a single prompt in one pass
- [x] Verify: Prompting "SaaS with auth, a pricing page, and a dashboard" produces a project that opens cleanly in the Outliner with zero `[BIND_ERR]`/`[DB_SCHEMA_ERR]` entries in the Output Log.

### Sub-Phase 6.5: Approval & Diff Review Gate — ✅ COMPLETE
- [x] `src/ai/review/GraphDiffModal.tsx` — every AI-generated or AI-modified graph renders as an explicit add/remove/modify diff against the current project before merge
- [x] Per-node accept/reject, not just whole-graph accept/reject
- [x] Enforces the **No Silent AI Writes Law** — this component is imported by Phase 15 and Phase 24 as well, not reimplemented
- [x] Verify: Rejecting individual nodes from a proposed diff merges only the accepted subset, leaving the rest untouched.

---

## Phase 7: SVG Vector Animation Engine

**Goal:** First-class SVG support — path morphing, stroke-draw, and filter animation — validated through the same compatibility-matrix pattern established in Phase 2.3, extended rather than duplicated.

### Sub-Phase 7.1: SVG Element Archetype & Path Data Model — ✅ COMPLETE
- [x] `src/core/types/svg.ts` — `svgPath`, `svgGroup`, `svgUse`, `svgText` archetypes; `d` attribute, `viewBox`, `stroke`/`fill` schemas
- [x] Extend `ArchetypePropertyBindingMatrix` (Phase 2.1) with SVG-specific property categories (Path Data, Stroke Config)
- [x] Verify: Assigning a relational array to `svgPath.d` is trapped by the existing `DataBindingValidator`, no new validator needed.

### Sub-Phase 7.2: Path Morphing & Stroke-Draw Engine
- [x] `src/core/engine/PathMorphSolver.ts` — point-count-normalized path interpolation between two `d` datasets
- [x] Stroke-draw ("line drawing on") via animated `stroke-dashoffset`, computed path length cached per element
- [x] Verify: Morphing a 12-point star into a circle produces no visual popping at any interpolation step (spot-checked at t=0.25/0.5/0.75).

### Sub-Phase 7.3: SVG Filter & Gradient Animation
- [ ] Animated `feGaussianBlur`, `feColorMatrix`, `feDisplacementMap` tracks
- [ ] Gradient stop keyframing (`linearGradient`/`radialGradient` stop-color and offset)
- [ ] Verify: A blur-in filter animation renders identically in Play Mode and the exported production build (cross-checked against Phase 13.4).

### Sub-Phase 7.4: SVG-to-Wasm Path Sampler
- [ ] Extend `SplineSolver` (Phase 4.1) to accept arbitrary SVG path data for "motion along path" animation — reuse the existing arc-length LUT machinery rather than writing a second sampler
- [ ] Verify: An element following a hand-drawn SVG path moves at constant perceived speed regardless of path curvature (uniform arc-length sampling, same guarantee as wire rendering).

### Sub-Phase 7.5: SVG Compatibility Matrix & AnimationValidator Extension
- [ ] Extend `ArchetypeAnimationCompatibility` (Phase 2.3) with SVG-only tracks (`pathMorph`, `strokeDashoffset`, `filterBlur`) and trap them on non-SVG elements
- [ ] Trap CSS-only tracks (`letterSpacing`) applied to `svgPath` elements the same way
- [ ] Verify: Attaching a `pathMorph` track to a Text element logs `[ANIM_COMPAT]` and is skipped, matching the existing Phase 2.3 test pattern exactly.

---

## Phase 8: 3D Scene Graph & WebGL Animation Engine

**Goal:** A real 3D sub-system — scene graph, GLTF import, camera animation, compiling to react-three-fiber in production — integrated as a sub-viewport inside the existing Confluence Canvas rather than a bolted-on separate app.

### Sub-Phase 8.1: 3D Scene Graph Data Model
- [ ] `src/core/types/scene3d.ts` — `Object3D` archetype: `position3D`, `rotation3D` (quaternion, not Euler, to avoid gimbal-lock bugs in interpolation), `scale3D`, `Camera3D`, `Light3D`
- [ ] Parent/child transform hierarchy mirroring the existing Outliner tree model
- [ ] Verify: A nested 3-level Object3D hierarchy computes correct world-space transforms against a hand-calculated reference matrix.

### Sub-Phase 8.2: React-Three-Fiber Viewport Integration
- [ ] `src/editor/canvas/Scene3DViewport.tsx` — WebGL sub-viewport embedded as a special canvas region, orbit controls for editing, camera-locked for Play Mode
- [ ] Verify: A 3D viewport and the 2D Confluence Canvas can be open in the same dock zone via tabs without WebGL context loss on tab switch.

### Sub-Phase 8.3: GLTF/GLB Asset Import Pipeline
- [ ] Content Browser 3D asset type with auto-generated thumbnail (offscreen render)
- [ ] Material inspector surfaced in the Details panel (PBR properties: roughness, metalness, emissive)
- [ ] Verify: Importing a 5MB `.glb` file completes in under 3 seconds and appears correctly thumbnailed in the Content Browser grid.

### Sub-Phase 8.4: 3D Timeline Keyframing & Camera Path Animation
- [ ] Extend `KeyframeTimeline` (Phase 2.5) to support 3D transform tracks and bezier camera dolly paths
- [ ] Verify: A camera path with 4 keyframes plays back smoothly with no orientation snapping between quaternion keys (spherical interpolation, not linear).

### Sub-Phase 8.5: 3D-to-Production Emitter
- [ ] `ThreeSceneEmitter.ts` — compiles the 3D scene graph to react-three-fiber JSX + `drei` helpers
- [ ] "Lite mode" fallback: simple 3D transforms (no lighting/materials) emit as CSS `transform-style: preserve-3d` instead of pulling in the full Three.js bundle
- [ ] Verify: A project with zero 3D content produces zero Three.js code in the exported bundle (tree-shaking confirmed via bundle analyzer).

### Sub-Phase 8.6: 3D Compatibility Matrix
- [ ] Extend `ArchetypeAnimationCompatibility` so 2D-only tracks (`letterSpacing`, `borderRadius`) are trapped on `Object3D` nodes and 3D-only tracks (`position3D`) are trapped on 2D elements
- [ ] Verify: Same `[ANIM_COMPAT]` trap-and-log pattern as Phase 2.3 and 7.5 — three domains, one validator, one Output Log channel.

---

## Phase 9: Unified Motion Compiler

**Goal:** One timeline system that doesn't care whether it's driving a CSS opacity fade, an SVG stroke-draw, or a 3D camera move. This is what makes Phase 10's sequencer coherent instead of three separate animation tools stapled together.

### Sub-Phase 9.1: Motion Track Abstraction Layer
- [ ] `src/core/engine/TrackDescriptor.ts` — a single track type carrying a target-domain tag (`css` | `svg` | `3d`) so the Timeline Sequencer UI (Phase 10) never branches on domain
- [ ] Verify: The same `KeyframeTimeline` component renders an `opacity` track, a `strokeDashoffset` track, and a `position3D` track with no per-domain UI code paths.

### Sub-Phase 9.2: Cross-Domain Timeline Merge Engine
- [ ] `src/core/engine/TimelineMerger.ts` — a single sequence can drive a CSS fade, an SVG draw-on, and a 3D dolly in sample-accurate sync
- [ ] Verify: A hero-section entrance sequence combining all three domains plays back with zero frame drift between domains over a 5-second timeline.

### Sub-Phase 9.3: Shared Easing & Physics Curve Library
- [ ] `src/core/engine/EasingLibrary.ts` — bezier/spring/Verlet curve presets shared across CSS, SVG, and 3D tracks, physics presets driven by the Phase 4.2 Verlet solver where applicable
- [ ] Verify: The same "bouncy spring" preset produces visually consistent bounce characteristics whether applied to a 2D scale track or a 3D position track.

### Sub-Phase 9.4: Motion Compiler Output Router
- [ ] `src/compiler/motion/OutputRouter.ts` — chooses GSAP, native Web Animations API, or Wasm-driven `requestAnimationFrame` per track based on complexity, automatically, at compile time
- [ ] Verify: A simple two-keyframe opacity fade compiles to WAAPI (zero library weight); a physics-driven spring compiles to GSAP; both are correctly routed without manual configuration.

---

## Phase 10: Timeline Sequencer Pro

**Goal:** Upgrade the Timeline Sequencer tab (already stubbed in the Content Browser drawer) into a real multi-track, nested, reusable sequencing tool — the direct analog of Unreal's Level Sequencer.

### Sub-Phase 10.1: Multi-Track Sequencer Panel Upgrade
- [ ] `src/editor/panels/timeline/SequencerPanel.tsx` — horizontal multi-lane timeline replacing the current single-track stub
- [ ] Lane types per Phase 9.1 domain tag, color-coded consistent with the wire taxonomy
- [ ] Verify: A sequence with 5 simultaneous lanes (2 CSS, 2 SVG, 1 3D) scrubs smoothly with the playhead in real time.

### Sub-Phase 10.2: Nested Sequence & Sub-Timeline Support
- [ ] A sequence can embed another sequence as a single scrubbable block, matching Unreal's sub-sequence pattern
- [ ] Verify: Nesting 3 levels deep, scrubbing the outer timeline correctly drives all inner sequence states without desync.

### Sub-Phase 10.3: Scroll-Trigger & Viewport-Linked Sequencing
- [ ] Bind the sequence playhead to scroll position or `IntersectionObserver` triggers, for scroll-driven storytelling animation
- [ ] Verify: A scroll-linked sequence scrubs bidirectionally (scroll up reverses it) with no jank on a throttled/low-end device profile.

### Sub-Phase 10.4: Sequence Library & Reusable Presets
- [ ] Save a sequence as a named, parameterized asset browsable in the Content Browser, draggable onto any element
- [ ] Verify: Applying a saved "card hover reveal" sequence to 10 different card elements produces 10 independently-scoped instances, not 10 references to shared mutable state.

---

## Phase 11: Animation Performance Lab — The 3–4x Program

**Goal:** This is where "make animation 3–4x faster" stops being a slogan and becomes a measured, gated engineering target. Every sub-phase here produces a number, not a vibe.

**Baseline & Target Table:**

| Scenario | Baseline (pre-Phase 4.6) | Target | Verified In |
|---|---|---|---|
| 100-wire canvas render | 1x (reference FPS) | ≥3x sustained FPS | 11.6 |
| 500-wire canvas render | 1x | ≥3x sustained FPS | 11.6 |
| Production-exported hero animation (CSS) | 1x (naive GSAP timeline) | ≥3x (WAAPI-routed) load-to-interactive | 11.6 |
| 3D camera path scrub | 1x (main-thread) | ≥3x (worker-offloaded) | 11.6 |

### Sub-Phase 11.1: Baseline Performance Benchmark Suite
- [ ] `bench/AnimationBenchmark.ts` — headless benchmark harness recording FPS, CPU %, memory, and load-to-interactive time across the four scenarios above, run **before** any Phase 11 optimization work lands, establishing the "1x" numbers in the table above
- [ ] Verify: Baseline numbers committed to `bench/baseline.json`, checked into the repo as the permanent reference point.

### Sub-Phase 11.2: Main-Thread Offload Verification
- [ ] Confirm all physics/spline math actually routes through the Phase 4.6 worker pool under animation workloads, not just wire-drag workloads
- [ ] Verify: Long-task audit shows zero physics-related main-thread tasks >16ms during a 500-wire animated scene.

### Sub-Phase 11.3: GPU-Compositable Property Enforcement
- [ ] The Phase 9.4 Output Router refuses to animate layout-triggering properties (`width`, `top`, `left`, `margin`) directly and auto-substitutes `transform`/`opacity` equivalents, logging a `[PERF_WARN]` when it does so the user knows why their input was rewritten
- [ ] Verify: A layout-thrashing animation authored by a user is automatically rewritten to a compositor-only equivalent with visually identical output.

### Sub-Phase 11.4: Batched Keyframe Scheduler
- [ ] Single `requestAnimationFrame` driver for the whole canvas/timeline instead of one per animated element, reusing the Phase 3.3 DAGSorter batching pattern to order updates
- [ ] Verify: CPU usage during a 50-simultaneously-animating-element scene drops by ≥50% versus the per-element-rAF baseline.

### Sub-Phase 11.5: Production Emitter Performance Mode
- [ ] The Phase 18 emitters default to the smallest sufficient runtime per track (WAAPI-only when possible, GSAP only when a track genuinely needs it), verified by a bundle-size regression test
- [ ] Verify: A landing page with only simple fades ships zero GSAP bytes in its production bundle.

### Sub-Phase 11.6: 3–4x Target Verification & Regression Gate
- [ ] `bench/regression-gate.ts` — CI step comparing every PR's benchmark run against `bench/baseline.json`
- [ ] Enforces the **Performance Gate Law**: build fails if any of the four table scenarios falls below 3x baseline
- [ ] Verify: A deliberately-reverted optimization commit correctly fails the CI gate, proving the gate actually catches regressions rather than rubber-stamping.

---

## Phase 12: GPU-Accelerated Rendering Layer

**Goal:** Scale the canvas itself to graphs with hundreds or thousands of nodes without degrading interactivity — this is what makes Phase 11's targets hold up on large real-world projects, not just benchmark toy scenes.

### Sub-Phase 12.1: WebGPU Canvas Compositor Feasibility Spike
- [ ] Time-boxed evaluation of Canvas2D vs WebGL vs WebGPU for the node/wire canvas at 1,000+ node counts, written up in `DOCS/RENDERING_SPIKE.md` with a clear go/no-go recommendation
- [ ] Verify: Spike produces concrete FPS numbers per approach at 1,000 nodes, not just qualitative impressions.

### Sub-Phase 12.2: Instanced Node Rendering
- [ ] GPU-instanced batch rendering of node card backgrounds rather than one DOM/Canvas draw call per node
- [ ] Verify: 1,000-node graph renders at ≥60 FPS during pan/zoom, versus baseline degradation below 20 FPS at the same count.

### Sub-Phase 12.3: Level-of-Detail Canvas Rendering
- [ ] Simplify node rendering detail (hide pin labels, collapse to colored rectangles) below a zoom threshold, coordinated with the Phase 4.2 spatial index for culling off-screen nodes entirely
- [ ] Verify: Zooming out to fit a 1,000-node graph maintains 60 FPS pan with LOD active.

### Sub-Phase 12.4: Fallback Renderer & Feature Detection
- [ ] Graceful degradation to the Phase 4.4 Canvas2D renderer on browsers without WebGPU/adequate WebGL2 support
- [ ] Verify: Feature-detected fallback produces a functionally identical (if slower) canvas with no crashes on a WebGPU-unsupported browser.

---

## Phase 13: Play Mode Runtime Sandbox & Mock Services

**Goal:** Zero-build instant interactive simulation, extended in this revision to guarantee 3D and SVG parity with the real production build.

### Sub-Phase 13.1: In-Memory Runtime Sandbox Host — ✅ COMPLETE
- [x] `src/editor/runtime/SandboxHost.tsx` — isolated iframe runtime boundary, DOM reconciliation from the active project AST
- [x] Trap runtime exceptions and route to Output Log (Panel 07)
- [x] Verify: A malformed logic graph throws inside the sandbox without crashing the parent editor frame.

### Sub-Phase 13.2: Mock Database & Service Worker API Interceptor — ✅ COMPLETE
- [x] `src/runtime/MockDatabase.ts` — in-memory IndexedDB store seeded from schema defaults
- [x] `src/runtime/MockApiServer.ts` — Service Worker intercepting fetch calls (`public/mock-api-worker.js`)
- [x] Verify: CRUD operations against a `UsersCollection` in Play Mode behave identically to the eventual Prisma-backed production API's contract.

### Sub-Phase 13.3: Play Mode Motion Runtime
- [ ] Wire the Phase 9 Unified Motion Compiler into Play Mode so sequences play using the same output-routing logic that production will use, not a simplified preview approximation
- [ ] Verify: A sequence's timing in Play Mode matches its exported production timing within 1 frame at 60fps.

### Sub-Phase 13.4: 3D/SVG Runtime Parity Check
- [ ] Automated screenshot comparison between Play Mode render and the exported production build's render for every 3D and SVG scene in the project
- [ ] Verify: Pixel diff under 1% for a representative set of 3D and SVG test scenes — this is the parity guarantee referenced by Phase 8.5 and 7.3.

---

## Phase 14: Execution Trace, Wire Telemetry & Time-Travel Debugger — ✅ COMPLETE

**Goal:** See exactly what the logic graph did, and step backward through it, not just forward.

### Sub-Phase 14.1: Execution Tracer Core — ✅ COMPLETE
- [x] `src/runtime/ExecutionTracer.ts` — captures node-by-node execution events with timestamps and pin payload snapshots
- [x] Verify: A 10-node graph execution produces a complete, ordered trace with no dropped events under rapid re-triggering.

### Sub-Phase 14.2: Execution Trace Panel UI — ✅ COMPLETE
- [x] Panel 20: `src/editor/panels/execution-trace/ExecutionTracePanel.tsx` — step-by-step trace list with click-to-jump-to-node
- [x] Verify: Clicking a trace entry highlights the corresponding node on the Blueprint Canvas and scrolls it into view.

### Sub-Phase 14.3: Wasm Wire Pulse Telemetry Rendering — ✅ COMPLETE
- [x] Render animated pulses along wires (using the Phase 4.4 renderer `WasmCableCanvas.tsx`) showing data packets traversing connections in real time during Play Mode
- [x] Verify: Pulse animation speed accurately reflects actual execution latency, not a fixed cosmetic duration.

### Sub-Phase 14.4: Time-Travel State Scrubber *(new)* — ✅ COMPLETE
- [x] Snapshot full sandbox state (DOM + variable store + mock DB) at each traced execution step; scrubber lets the user step backward through captured snapshots, not just forward through the trace log
- [x] Verify: Scrubbing backward 5 steps and forward again reproduces bit-identical intermediate state at each point.

---

## Phase 15: AI Co-Pilot Assistant & Runtime Diagnostics — ✅ COMPLETE

**Goal:** A conversational assistant grounded in the actual execution trace and diagnostic bus — not a general chatbot bolted onto the sidebar.

### Sub-Phase 15.1: AI Prompt Bar Panel — ✅ COMPLETE
- [x] Panel 18: `src/editor/panels/copilot/AiPromptBar.tsx` — conversational assistant drawer
- [x] Verify: Prompt bar is dockable and persists conversation history per project session.

### Sub-Phase 15.2: AST Diagnostic Suggestion Engine — ✅ COMPLETE
- [x] `src/ai/copilot/DiagnosticSuggester.ts` — reads live `DiagnosticBus` entries, proposes an AST patch
- [x] Verify: A `[BIND_ERR]` in the Output Log produces a one-click "ask AI to fix" action that generates a valid, relevant patch.

### Sub-Phase 15.3: Explicit Diff Approval Flow — ✅ COMPLETE
- [x] Every AI patch routes through explicit diff review before merge — enforces the **No Silent AI Writes Law**
- [x] Verify: No code path exists where an AI suggestion mutates the project graph without the modal appearing first.

### Sub-Phase 15.4: Conversational Debugging Grounded in Execution Trace — ✅ COMPLETE
- [x] User can ask "why did this node fail" in Play Mode; the assistant's answer is generated from the actual Phase 14.1 trace data for that run, not a generic explanation of the node type
- [x] Verify: Asking about two different failed runs of the same node with different input values produces two different, input-specific explanations.

---

## Phase 16: Hot Reload & Breakpoint Debugger Pro — ✅ COMPLETE

**Goal:** Fast iteration loop and real debugging tools for the logic graph.

### Sub-Phase 16.1: Hot-Swap Blueprint Nodes Without Sandbox Restart — ✅ COMPLETE
- [x] `src/runtime/HotReloadEngine.ts` — diff-based patch application to the running sandbox instead of a full iframe reload on every graph edit
- [x] Verify: Editing a node mid-Play-Mode-session updates behavior within one frame, preserving current mock DB/variable state.

### Sub-Phase 16.2: Breakpoint Toggle & Pin Payload Inspector — ✅ COMPLETE
- [x] `src/runtime/BreakpointManager.ts` — click-to-toggle breakpoints on any node; execution pauses and surfaces live pin values in the Details panel
- [x] Verify: A breakpoint correctly halts the DAGSorter-ordered execution at the exact node, not an adjacent one.

### Sub-Phase 16.3: Conditional Breakpoints — ✅ COMPLETE
- [x] Break only when a pin value matches a user-supplied expression (e.g., `email == "test@test.com"`)
- [x] Verify: A conditional breakpoint correctly skips 9 non-matching executions and halts on the 10th matching one.

---

## Phase 17: Frontend Code Emitters — Multi-Framework Compiler Core — ✅ COMPLETE

**Goal:** Compile the visual AST into clean, human-readable production code, starting with React/Next.js as the primary target and architected so a second framework target doesn't require a rewrite.

### Sub-Phase 17.1: React 19 / Next.js 15 JSX Emitter — ✅ COMPLETE
- [x] `src/compiler/emitters/ReactComponentEmitter.ts` — accessible JSX with TypeScript types
- [x] `src/compiler/emitters/StyleEmitter.ts` — scoped CSS variables/rules from design tokens
- [x] Verify: A generated component passes `npx tsc --noEmit` cleanly and matches the canvas render pixel-for-pixel.

### Sub-Phase 17.2: Framework-Agnostic IR Layer — ✅ COMPLETE
- [x] `src/core/types/compiler.ts` (`ComponentEmitterOptions`, `EmittedFile`, etc.) — decouples the project AST from React specifics
- [x] Verify: `ReactComponentEmitter` is structured around intermediate representation types with zero test regressions.

### Sub-Phase 17.3: Accessibility-Aware Emission — ✅ COMPLETE
- [x] Auto-generate ARIA attributes and semantic HTML tags (`<nav>`, `<button>`, `<main>`) from archetype metadata instead of emitting `<div>` for everything
- [x] Verify: Generated output correctly resolves semantic HTML tags across standard archetypes.

### Sub-Phase 17.4: Live Preview Diffing — ✅ COMPLETE
- [x] Emitted code diffed against the previous export on every compile, surfaced in the Live Code Inspector (Phase 21) rather than silently overwriting
- [x] Verify: A one-property change produces a minimal, readable diff, not a full-file rewrite.

---

## Phase 18: Animation Code Emitters — GSAP / SVG / 3D / CSS

**Goal:** Compile the Phase 9 Unified Motion Compiler's output into production code across all three animation domains.

### Sub-Phase 18.1: GSAPAnimationEmitter — ✅ COMPLETE
- [x] `src/compiler/emitters/GSAPAnimationEmitter.ts` — Compiles CSS-domain tracks into production GSAP timelines
- [x] Verify: Exported timeline plays identically to its Play Mode counterpart per the Phase 13.3 parity check.

### Sub-Phase 18.2: SVGAnimationEmitter
- [ ] Compiles path/stroke/filter tracks from Phase 7 into production SVG + minimal JS (or CSS-only where possible)
- [ ] Verify: A stroke-draw animation exports without requiring GSAP if it's a pure CSS-animatable case.

### Sub-Phase 18.3: ThreeSceneEmitter
- [ ] Wraps the Phase 8.5 3D emitter into the same compile pass as the 2D emitters, sharing the Phase 17.4 diffing infrastructure
- [ ] Verify: A page with both 2D and 3D content exports a single coherent component, not two disconnected files.

### Sub-Phase 18.4: Unified Motion Import Consolidation
- [ ] Single generated `motion.ts` per page importing only the libraries actually used (tree-shaken), assembled from whichever of 18.1–18.3 fired
- [ ] Verify: A page with only CSS animation ships zero SVG/Three.js-related imports.

---

## Phase 19: Backend, API & Database Emitters — ✅ COMPLETE

**Goal:** Compile the Database Studio schema and Logic Blueprint graphs into a real backend.

### Sub-Phase 19.1: LogicFlowEmitter — ✅ COMPLETE
- [x] `src/compiler/emitters/LogicFlowEmitter.ts` — Blueprint graphs → async TypeScript business logic functions
- [x] Verify: A generated function's control flow matches the DAGSorter-ordered execution trace exactly.

### Sub-Phase 19.2: ApiRouteEmitter — ✅ COMPLETE
- [x] `src/compiler/emitters/ApiRouteEmitter.ts` — Next.js API route handlers generated from graph entry points tagged as API-exposed
- [x] Verify: Generated route handlers return correctly-typed responses matching the Database Studio schema.

### Sub-Phase 19.3: PrismaSchemaEmitter — ✅ COMPLETE
- [x] `src/compiler/emitters/PrismaSchemaEmitter.ts` — `schema.prisma` + SQL migrations generated from the Phase 2.1 database core types
- [x] Verify: Prisma schema correctly models models, fields, types, and relations.

### Sub-Phase 19.4: Auth Emitter — ✅ COMPLETE
- [x] Scaffolds an auth pattern with hashed credential storage by default — never plaintext, never client-exposed
- [x] Verify: Generated auth code rejects plaintext credentials and properly enforces hashed security standards.

---

## Phase 20: Security & Compliance Diagnostic Gate

**Goal:** This category of product — AI-generated full-stack apps with auth, databases, and payments — has a well-documented, ongoing pattern of shipping with disabled row-level security, exposed credentials, and broken access controls. This phase exists specifically so LazyLayout doesn't join that list. It is not optional tooling; per the **Security Gate Law**, nothing reaches Phase 26 deploy without passing it.

### Sub-Phase 20.1: Row-Level Security & Access Control Linter
- [ ] `src/compiler/security/RlsLinter.ts` — statically verifies every database collection with an auth relation (like `UsersCollection (Auth)`) has an enforced ownership rule before it can be emitted
- [ ] Dispatches `[SEC_RLS_ERR]` via the existing `DiagnosticBus`, blocks export if unresolved
- [ ] Verify: A schema with an auth-adjacent table and no ownership rule fails the linter; adding the rule clears it.

### Sub-Phase 20.2: Secret & Credential Scanner
- [ ] `src/compiler/security/SecretScanner.ts` — pre-deploy scan of generated code and env files for hardcoded API keys/DB credentials, pattern-matched against known credential formats
- [ ] Verify: A deliberately-planted fake API key string in a generated file is caught and blocks the deploy step.

### Sub-Phase 20.3: Auth Flow Static Verifier
- [ ] `src/compiler/security/AuthzVerifier.ts` — confirms every protected route/page node has a reachable auth-check node upstream in its execution path, using the DAGSorter's reachability analysis (Phase 3.3) rather than a new graph walker
- [ ] Verify: A protected `/dashboard` node with no upstream auth-check produces `[SEC_AUTHZ_ERR]` and blocks export.

### Sub-Phase 20.4: Dependency & Supply-Chain Audit
- [ ] Integrate `npm audit`/equivalent into the Build Pipeline (Phase 26), blocking on known-critical CVEs in generated project dependencies
- [ ] Verify: A deliberately-pinned vulnerable dependency version fails the build pipeline step.

### Sub-Phase 20.5: Pre-Deploy Security Report
- [ ] Panel: human-readable pass/fail summary of 20.1–20.4, wired as a hard gate into Phase 26's Deploy button (disabled until passing)
- [ ] Verify: Deploy button is genuinely disabled — not just visually greyed out while still clickable — until all four checks pass.

---

## Phase 21: Live Code Inspector & Bidirectional AST-Code Sync Engine

**Goal:** This is the hardest problem in the whole roadmap, and it's flagged as such deliberately: keeping a visual graph and its generated code in perfect sync in both directions is the thing most "visual + AI" tools quietly avoid solving. Treat this phase's timeline estimate generously.

### Sub-Phase 21.1: Split-Pane Code Viewer — ✅ COMPLETE
- [x] Panel 16: `src/editor/panels/code-view/LiveCodeInspector.tsx` — read-only split-pane code viewer, first milestone before any write-back capability
- [x] Verify: Viewer stays in sync with the canvas on every AST mutation with no manual refresh.

### Sub-Phase 21.2: AST-to-Code Line Mapping — ✅ COMPLETE
- [x] Bidirectional source-map-style mapping: click a code line → highlight the corresponding canvas element/node, and the reverse
- [x] Verify: Mapping survives a re-compile after an unrelated edit elsewhere in the file (line numbers shift; mapping must not).

### Sub-Phase 21.3: Manual Code Edit Ingestion
- [ ] Parse hand-edited code back into AST diffs using the Phase 17.2 framework-agnostic IR as the common language between "what the code says" and "what the graph says"
- [ ] Verify: Manually renaming a JSX prop in the code viewer correctly updates the corresponding node's pin name on the canvas.

### Sub-Phase 21.4: Conflict Resolution UI
- [ ] When a manual code edit and a subsequent visual edit touch the same node, surface an explicit merge prompt rather than silently overwriting either side
- [ ] Verify: A deliberately-constructed conflict (edit the same property in both code and canvas before syncing) triggers the merge UI instead of data loss.

### Sub-Phase 21.5: Sync Integrity Test Suite
- [ ] Property-based round-trip tests: random graph → emit code → re-parse code → resulting graph must be structurally identical to the original, run against a large generated corpus (target: 500+ random graphs)
- [ ] Verify: 500/500 round-trip tests pass with zero structural drift — this is the concrete proof that the **AI-Native Parity Law** holds for code, not just for NodeScript.

---

## Phase 22: Standalone Project Exporter & Multi-Repo Packaging — ✅ COMPLETE

### Sub-Phase 22.1: GitExporter Core — ✅ COMPLETE
- [x] `src/compiler/export/GitExporter.ts` — packages compiled files into a standard Next.js repository (`ZipPacker.ts`)
- [x] Verify: Exported repo boots with `npm install && npm run dev` with zero manual fixes.

### Sub-Phase 22.2: Monorepo vs Multi-Repo Packaging Options — ✅ COMPLETE
- [x] Support both a single combined repo and a split frontend/backend repo layout, user-selectable at export time
- [x] Verify: Both layouts produce independently bootable projects.

### Sub-Phase 22.3: CI Workflow Template Generator — ✅ COMPLETE
- [x] Scaffold a GitHub Actions workflow alongside export (`.github/workflows/ci.yml`)
- [x] Verify: Generated workflow file runs successfully against the exported repo.

---

## Phase 23: Pages, Routing & Sitemap Manager — ✅ COMPLETE

### Sub-Phase 23.1: Visual Sitemap Tree Panel — ✅ COMPLETE
- [x] Panel 30: `src/editor/panels/pages-manager/PagesManager.tsx` — visual sitemap tree, mirrors the Outliner's Pages folder
- [x] Verify: Adding a page in the sitemap tree correctly creates the corresponding Outliner entry and vice versa.

### Sub-Phase 23.2: Dynamic Route Parameter Configuration — ✅ COMPLETE
- [x] `[slug]`-style dynamic segment configuration with typed params surfaced to bound Logic Blueprint graphs
- [x] Verify: A dynamic route's param is extracted into typed route parameters and validated.

### Sub-Phase 23.3: Redirect & Middleware Rule Editor — ✅ COMPLETE
- [x] Visual editor for redirect rules and route-level middleware in `PagesManager.tsx`
- [x] Verify: Redirect rules can be added, modified, deleted, and audited for route collisions.

---

## Phase 24: AI Visual QA — Screenshot Verification & Self-Healing Loop

**Goal:** Close the loop between "what the user asked for" and "what actually rendered," the way the earlier competitive research showed leading agentic tools building trust through verifiable artifacts rather than raw claims.

### Sub-Phase 24.1: Headless Preview Renderer
- [ ] Server-side render of Play Mode for automated screenshot capture across breakpoints (Desktop/Tablet/Mobile, matching the existing viewport switcher)
- [ ] Verify: Headless render output matches interactive Play Mode pixel-for-pixel.

### Sub-Phase 24.2: Visual Diff Engine
- [ ] Pixel/layout diff between a design intent snapshot (from a prompt or a reference image) and the rendered output
- [ ] Verify: A deliberately misaligned button produces a diff report highlighting the specific region and offset.

### Sub-Phase 24.3: Self-Healing Patch Loop
- [ ] When diff exceeds a threshold, AI proposes a NodeScript/style patch via the Phase 6.2 constrained decoder — routed through the Phase 6.5/15.3 approval gate, **never auto-applied silently**, consistent with the No Silent AI Writes Law
- [ ] Verify: A visual regression triggers a relevant, scoped patch proposal rather than a full-page regeneration.

---

## Phase 25: Speed Benchmark Suite — Measured Build-Speed Claims

**Goal:** "4–5x faster than coding" should be a number you can show, not a line you say. This phase exists to make that claim honest and defensible — and reusable as real marketing material, the kind grounded in adversarial, publishable testing rather than assertion.

### Sub-Phase 25.1: Reference Task Library
- [ ] `bench/tasks/` — 10–15 standardized build tasks ("auth flow," "pricing table," "animated hero," "CRUD admin table"), each with a documented hand-coded baseline time from an experienced engineer, methodology published alongside results
- [ ] Verify: Each task has a written spec precise enough that two different engineers produce comparably-scoped baseline builds (±20% time variance).

### Sub-Phase 25.2: Time-to-Ship Instrumentation
- [ ] Opt-in, local-first telemetry measuring actual in-editor build time per reference task, no data leaves the user's machine without explicit consent
- [ ] Verify: Instrumentation correctly excludes idle/away time from the measured duration.

### Sub-Phase 25.3: Comparative Benchmark Reports
- [ ] Publish methodology and results (`DOCS/BENCHMARKS.md`) comparing LazyLayout completion time against the 25.1 hand-coded baseline, including tasks where LazyLayout does *not* beat hand-coding, if any exist — credibility requires showing the losses too
- [ ] Verify: Report is reproducible by a third party following the published methodology.

### Sub-Phase 25.4: Friction Point Telemetry & UX Iteration Loop
- [ ] Identify which panel/interaction consumes the most time per task, feed directly into the design backlog
- [ ] Verify: Top-3 friction points identified from real usage data are each tied to a specific, filed UX improvement ticket.

---

## Phase 26: Build Pipeline Visualizer & Cloud Deploy Targets

### Sub-Phase 26.1: DeploymentDashboard Panel — ✅ COMPLETE
- [x] Panel 19: `src/editor/panels/deployment/DeploymentDashboard.tsx` — build pipeline progress tracker (`src/runtime/DeploymentEngine.ts`)
- [x] Verify: Each build stage (compile → security gate → package → deploy) shows live status with real-time logs.

### Sub-Phase 26.2: Deploy Targets — ✅ COMPLETE
- [x] Vercel, Docker, Cloudflare Pages multi-target deployment support
- [x] Verify: A test project deploys successfully to all three targets with rollback support.

### Sub-Phase 26.3: Security Gate Integration
- [ ] The Phase 20.5 report must pass before the Deploy button activates — enforces the **Security Gate Law** at the actual point of no return
- [ ] Verify: Attempting to deploy a project with an unresolved `[SEC_RLS_ERR]` is blocked with a clear explanation, not a generic error.

---

## Phase 27: Global Search Engine — ✅ COMPLETE

### Sub-Phase 27.1: Inverted Index Builder — ✅ COMPLETE
- [x] `src/runtime/GlobalSearchEngine.ts` — Index pages, nodes, variables, and database fields for fast lookup
- [x] Verify: Index rebuilds incrementally on edit, not a full rebuild per keystroke.

### Sub-Phase 27.2: GlobalSearchPanel UI — ✅ COMPLETE
- [x] Panel 25: `src/editor/panels/global-search/GlobalSearchPanel.tsx` — jump-to-entity from any search result
- [x] Verify: Searching a variable name jumps directly to its declaration in My Blueprint panel.

---

## Phase 28: Keyboard Shortcuts & Command Palette — ✅ COMPLETE

### Sub-Phase 28.1: CommandPalette Core — ✅ COMPLETE
- [x] `src/editor/shell/CommandPalette.tsx` (`Ctrl+P`) with fuzzy search across all registered commands
- [x] Verify: Palette surfaces relevant commands within 2 keystrokes for common actions.

### Sub-Phase 28.2: Global Shortcut Registry & Conflict Detection — ✅ COMPLETE
- [x] `src/runtime/ShortcutRegistry.ts` — Register `Ctrl+S`, `Ctrl+Z`, `Ctrl+Shift+F`, `Ctrl+Enter`, and plugin-contributed shortcuts with conflict detection
- [x] Verify: A plugin attempting to register an already-bound shortcut is rejected with a clear conflict message, not a silent override.

---

## Phase 29: Plugin Architecture & Extension SDK — ✅ COMPLETE

### Sub-Phase 29.1: PluginManager Panel — ✅ COMPLETE
- [x] Panel 29: `src/editor/panels/plugins/PluginManager.tsx` (`src/runtime/PluginManagerEngine.ts`)
- [x] Verify: Installing/disabling a plugin takes effect without a full app restart.

### Sub-Phase 29.2: Sandboxed Custom Node & Archetype Plugin API — ✅ COMPLETE
- [x] Plugin-defined nodes and element archetypes register into the same Phase 3.1 registry and Phase 2.1 property matrix as built-ins
- [x] Verify: A sample third-party node plugin passes the same TypeChecker validation as a built-in node.

### Sub-Phase 29.3: Plugin Permission Model — ✅ COMPLETE
- [x] Explicit capability grants at install time (network access, filesystem access) — no ambient access by default (`PLUGIN_SECURITY_VIOLATION`)
- [x] Verify: A plugin requesting network access it wasn't granted has the request blocked and logged, not silently allowed.

---

## Phase 30: Marketplace & Template Ecosystem

### Sub-Phase 30.1: Community Marketplace Panel
- [ ] Panel 28: browsable community node/template/plugin listings
- [ ] Verify: Listings are filterable by category and compatibility version.

### Sub-Phase 30.2: Template Store & One-Click Project Scaffolds
- [ ] One-click full-project templates (reusing the Phase 6.4 scaffolder's output format)
- [ ] Verify: A template installs and opens as a fully valid, zero-diagnostic project.

### Sub-Phase 30.3: Publisher Review & Security Scan Pipeline
- [ ] Every submitted template/plugin runs through the Phase 20 security gate before listing goes live
- [ ] Verify: A submission containing a hardcoded secret is rejected automatically pre-review, not caught manually after the fact.

---

## Phase 31: Real-Time Collaboration & Multiplayer Presence

### Sub-Phase 31.1: Presence & Cursor Sync
- [ ] CRDT-backed shared graph state, live cursor/selection presence per collaborator
- [ ] Verify: Two simultaneous editors see each other's cursor and selection within 200ms.

### Sub-Phase 31.2: Comments Panel
- [ ] Panel 15: threaded comments attachable to any node, element, or database field
- [ ] Verify: Resolving a comment thread updates for all connected collaborators in real time.

### Sub-Phase 31.3: Conflict-Free Concurrent Node Editing
- [ ] CRDT merge semantics for simultaneous edits to the same graph region
- [ ] Verify: Two collaborators editing adjacent nodes simultaneously produce a merged result with no data loss (stress-tested with induced network latency).

---

## Phase 32: Version History, Snapshots & Reference Viewer — ✅ COMPLETE

### Sub-Phase 32.1: Undo History Panel — ✅ COMPLETE
- [x] Panel 23: `src/editor/panels/history/UndoHistoryPanel.tsx` — long-term undo history backed by `useHistoryStore.ts` with action grouping, categories, and state jumping
- [x] Verify: Undo history supports arbitrary state jumping backward and forward with snapshot integrity verification.

### Sub-Phase 32.2: Named Version Snapshots — ✅ COMPLETE
- [x] Panel 24: `src/editor/panels/versioning/VersionControlPanel.tsx` — manually-tagged project snapshots, restorable, with branch management and 3-way merge conflict detection (`VersionControlEngine.ts`, `useVersionControlStore.ts`)
- [x] Verify: Restoring a named snapshot correctly reverts the full AST (pages, database, logic, animations) atomically.

### Sub-Phase 32.3: Reference Viewer — ✅ COMPLETE
- [x] Panel 26: `src/editor/panels/dependencies/ReferenceViewerPanel.tsx` — find all usages of a variable, component, or database table across the project (`DependencyAnalysisEngine.ts`, `useDependencyStore.ts`)
- [x] Verify: Detects orphan assets with `[ORPHAN_ASSET_WARN]`, detects circular loops with `[CIRCULAR_REF_ERR]`, and renders visual graph canvas, orphans tab, and size map.

---

## Phase 33: Localization & Accessibility (WCAG 2.1) Audit

### Sub-Phase 33.1: Localization Dashboard & String Extraction
- [ ] Panel 31: automatic extraction of user-facing strings into a translation-ready format
- [ ] Verify: A project with 50 text elements produces a complete, correctly-keyed string extraction with zero misses.

### Sub-Phase 33.2: WCAG 2.1 AA Automated Audit Panel
- [ ] Panel 32: integrates axe-core scanning directly into the canvas, building on the Phase 17.3 accessibility-aware emission
- [ ] Verify: Audit panel correctly flags a manually-introduced contrast violation.

### Sub-Phase 33.3: Screen-Reader Parity Check in Play Mode
- [ ] Verify Play Mode's DOM structure produces a sane screen-reader announcement order matching the visual layout order
- [ ] Verify: A screen-reader simulation traversal matches the intended reading order for a representative test page.

---

## Phase 34: Mobile Target Emitters — React Native / Flutter

### Sub-Phase 34.1: Mobile Archetype Compatibility Matrix
- [ ] Document which web-only tracks/elements (hover states, certain CSS filters) don't map to native, extend the compatibility-matrix pattern established in Phases 2.3/7.5/8.6 to cover a `mobile` target dimension
- [ ] Verify: Attempting to target-export a hover-dependent interaction to mobile logs a clear `[MOBILE_COMPAT]` warning rather than silently dropping it.

### Sub-Phase 34.2: React Native Emitter
- [ ] `ReactNativeEmitter.ts` — reuses the Phase 17.2 framework-agnostic IR as its input, proving the IR decoupling investment pays off
- [ ] Verify: A simple page (text, image, button, list) emits working React Native + Expo code with zero manual fixes.

### Sub-Phase 34.3: Flutter Emitter (stretch)
- [ ] Second mobile target, lower priority, contingent on 34.2 proving the IR approach works
- [ ] Verify: Same acceptance bar as 34.2, on the same reference page.

### Sub-Phase 34.4: Mobile Play Mode Preview
- [ ] Expo Go-style live device preview streamed from the editor
- [ ] Verify: Editing an element updates the connected physical device preview within 1 second.

---

## Phase 35: Final Integration Testing, Full-System Benchmark & Production Readiness Audit

**Goal:** Every gate established across this roadmap, re-verified together, end to end, before public beta.

### Sub-Phase 35.1: End-to-End Blank-Canvas-to-Deployed-App Audit
- [ ] Full manual + scripted audit: blank project → AI scaffold (Phase 6) → visual editing → Play Mode → export → deploy (Phase 26), zero manual workarounds permitted
- [ ] Verify: Audit completes with a written pass/fail report per stage.

### Sub-Phase 35.2: Full Security Gate Re-Verification
- [ ] Re-run Phase 20 against the output of every emitter phase (17–19), not just the reference test project
- [ ] Verify: Zero unresolved `[SEC_*]` diagnostics across a corpus of 20 diverse test projects.

### Sub-Phase 35.3: 3–4x Animation Performance Re-Verification
- [ ] Re-run the Phase 11.6 regression gate against the full, integrated build (not isolated benchmark scenes)
- [ ] Verify: All four Phase 11 table scenarios hold ≥3x at the full-system level.

### Sub-Phase 35.4: 5x Build-Speed Benchmark Re-Verification
- [ ] Re-run Phase 25's reference task library against the final release candidate
- [ ] Verify: Published benchmark report reflects the actual shipping build, not an earlier development snapshot.

### Sub-Phase 35.5: Public Beta Readiness Checklist & Go/No-Go Review
- [ ] Consolidated checklist covering 35.1–35.4 plus outstanding P0/P1 bugs, reviewed by the full team before beta announcement
- [ ] Verify: Explicit written go/no-go decision recorded, not an implicit "we ran out of roadmap so we shipped."

---

## 10. Definition of Done (per Sub-Phase)

A sub-phase is considered **complete** when:
1. All checklist items are checked off.
2. The verification test passes.
3. No regressions in existing dock zones, inspector sections, or previously-passing test suites.
4. Full adherence to the **Inside-Out Engine Law**: Core contracts ➔ Engine validator ➔ Output Log diagnostics ➔ UI controls.
5. All styling uses tokens from `tokens.css` without hardcoded values.
6. *(new)* Any graph-mutating feature has a NodeScript round-trip test per the **AI-Native Parity Law** (Phase 5/21).
7. *(new)* Any animation-emitting feature passes its Phase 11 benchmark scenario before merge, per the **Performance Gate Law**.
8. *(new)* Any code-emitting feature that touches auth, database access, or secrets passes the relevant Phase 20 check before merge, per the **Security Gate Law**.