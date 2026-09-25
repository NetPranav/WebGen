# IMPLEMENTATION ROADMAP — INITIAL PHASE (v2)

## Project Name: LazyLayout — AI-Native Motion Design Studio
**Document Version:** 2.1.0
**Phase:** Initial Phase (Motion Element & Effect Studio)
**Status:** Active. Phases 1–4 ✅ (CI green on PR #7, all 3 browsers). Next: Phase 41 (the rest of it; 41.2 transactions shipped with Phase 3), then Phases 5 ∥ 6 ∥ 42. See §5.1.
**File Location:** `DOCS/Initial/ROADMAP.md`
**Inputs:** `PRD.md` v2.0.0 (what and why) · `AUDIT.md` (what is wrong today) · `lazylayout_element_grammer.md` + `ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md` (the rules) · `DOCS/action working.md` (the 52 World Environment properties)
**Supersedes:** v1.1.0 (8 phases). The v1.1 phases are reclassified in §4. Nothing from them is thrown away; each is either kept, fixed, or re-scoped below.
**v2.1 (2026-09-24):** Adds Track S (Phases 41–58), the studio architecture needed for a Figma / Wix Studio viewport with an After Effects timeline. The reasons are in §4.1.

---

## 1. How to Read This Roadmap

- **58 phases in 9 tracks.** Tracks run roughly in order. Some phases inside a track can run in parallel (see §7).
- **Phase numbers are identifiers, not execution order.** Track S (Phases 41–58) was added in v2.1. Its phases slot in between existing ones (e.g. 41 runs before 3, 48 before 10). §5.1 gives the order to follow. Existing numbers were kept so audit IDs, commits and progress logs stay valid.
- Every phase has: **Goal**, **Closes** (audit IDs), **Depends on**, numbered **sub-phases** with checklists, **Key files**, and a **Verification Gate**.
- Checkboxes: `[ ]` not started, `[~]` exists in code but has not passed its gate, `[x]` gate passed.
- A phase that reuses v1.1 code says so under **Reuse**, so nobody rebuilds what already works.
- **The last track (G, Phases 35–39) is the simplified design experience** (draw-to-design, draw-to-animate, Simple mode). It comes last on purpose: it sits on top of the document model, rules, engines, library and AI built before it.

---

## 2. Architectural Laws (v2)

These are binding for every phase. A Verification Gate that passes while violating a law does not count.

1. **Inside-Out Law (kept):** Types/schema → Rules Engine → Diagnostics → UI. No control is built before the rule that governs it.
2. **One Document Law (new):** Every surface (stage, layers, properties, timeline, playground, AI, code, export) reads and writes the **Motion Document Model (MDM)** through one store API. No parallel element models and no `as any` casts across model boundaries.
3. **Preview = Export Law (new):** Every animation has a pure `evaluate(doc, layerId, t, inputs)` result. The live preview and the exported build must both match it within tolerance. Engines are adapters over the document, never the source of truth.
4. **No Silent AI Writes Law (kept):** Every AI mutation is a diff that the user explicitly approves.
5. **Real-Environment Verification Law (new):** Gates run in real environments: `tsc`, a headless browser (Playwright), and real builds of the exported code. String-contains assertions may *support* a gate but never *be* the gate.
6. **Simple-by-Default Law (new):** Every new capability ships with a Simple face (≤ 7 controls, no jargon) before or alongside its Pro face.
7. **Licensing Gate Law (new):** A third-party engine or effect source may run inside the editor only after its license is recorded in `DOCS/Initial/LICENSES.md` (created in Phase 6) and cleared for the product's use.
8. **One Clock Law (v2.1):** One transport owns time (Phase 45). The canvas, timeline, playground, AI previews and render queue read it. No panel keeps its own playhead.
9. **Hot-Path Law (v2.1):** Per-frame values (the playhead, evaluated props, drag previews) never flow through React state or the document store. They go through the frame scheduler (Phase 45) and the renderer's node registry (Phase 48). The document changes only when an edit is committed.
10. **Document-Space Law (v2.1):** Geometry lives in the MDM, in document coordinates (Phase 42). The renderer maps it to the screen. Editor code reads layout from the DOM only through the renderer's measurement API (Phase 48.4).
11. **One Renderer Law (v2.1):** The stage and the exporters render layers from the same per-archetype render definitions (Phase 48.1). There is no second, hand-written preview markup.

---

## 3. Definition of Done (per Phase, v2)

A phase is **✅ COMPLETE** only when:
1. Every sub-phase checklist item is `[x]`.
2. Its **Verification Gate** passes in CI (not only locally).
3. `tsc --noEmit` has 0 errors, ESLint has 0 errors, all tests pass, and `next build` succeeds (from Phase 1 onward).
4. No regression in the Playwright suite, the export parity suite (from Phase 4) or the performance budget suite (from Phase 26).
5. Its docs are updated: this roadmap, `CHANGELOG.md`, and any schema or convention it touches.
6. Every audit ID it claims to close is marked closed in `AUDIT.md`.

---

## 4. Legacy v1.1 Phases — Honest Reclassification

| v1.1 Phase | v1.1 claim | Reality (see `AUDIT.md`) | Where it continues in v2 |
|---|---|---|---|
| 1 Shell, Docking & Tokens | ✅ | **Real.** Works; dense UI | Kept. Simplified in Phases 20–22 |
| 2 Project Hub & Launcher | ✅ | **Real**, but asks for the tech stack up front, which the new PRD removes | Reworked in Phase 39 (Simple onboarding); tech choice moves to Export (Phase 27) |
| 3 Archetype Library & Outliner | ✅ | **Partial.** Four conflicting element models (AUD-04) | Phase 2 (MDM), Phase 21 (Layers) |
| 4 Sequencer & Curve Editor | ✅ | **Partial.** Read/write bug (AUD-05); Wasm never compiled (AUD-12) | Phases 3, 5, 9, 23 |
| 5 Multi-Engine Runtime | ✅ | **Simulated.** Emits code strings; no engine runs in the editor (AUD-09, AUD-10) | Phases 10, 14, 15, 16 |
| 6 Code Emitter & Exporter | ✅ | **Unverified.** Output never compiled (AUD-15) | Phases 4, 27, 28 |
| 7 MotionAI & Presets | ✅ | **Rule-based**, no LLM (AUD-17); 51 presets are a good seed | Phases 25, 30–34 |
| 8 E2E Verification | ✅ | **Unit-level only.** No browser, build or pixel checks (AUD-13, AUD-15) | Phases 4, 26, 27, 40 |

---

## 4.1 Architecture Review v2.1 (2026-09-24, after Phase 2)

**Target experience.** The canvas works like **Figma / Wix Studio**: an infinite canvas with frames, direct manipulation, auto-layout, constraints and breakpoints. The bottom panel works like the **After Effects timeline**: compositions, a bar per layer, twirl-down property lanes, a work area, markers, parenting, a graph editor, and a render queue.

**Finding.** Phase 2 fixed the data model, but the layers above it can't support that target yet. The v2.0 phases (20 Stage, 23 Timeline) assumed a real renderer, a shared clock, geometry and a time model. None of these exist, and no phase built them. Track S adds them.

| # | Area | Today (code evidence) | Why it blocks the target | Fix |
|---|---|---|---|---|
| 1 | **Stage rendering** | `SandboxHost.buildSandboxDocument()` builds an HTML **string** per archetype and passes it to `<iframe srcDoc>`. The string is re-memoised on `layers`, so **every edit reloads the whole iframe**. Hover effects are inline `onmouseover` strings. | Drags can't hold 60 fps, and nothing can be measured for handles. It is also a third renderer next to the emitters, so preview ≠ export. | 48 |
| 2 | **Time** | The playhead is `useState` inside `MotionSequencer.tsx:222`. Its rAF loop calls `setCurrentTime` every frame, re-rendering the 966-line panel, and only the **selected layer's active clip** is previewed. | There is no global clock, so the canvas, timeline and playground can't share time. An AE timeline plays all layers together. | 45 |
| 3 | **Evaluation** | `interpolateTrackValue()` (`MotionSequencer.tsx:137`) is **linear only**: it ignores `keyframe.ease`, re-sorts keyframes every frame and parses numbers out of strings. | Scrubbing doesn't match playback or export. | 9, 45 |
| 4 | **Property vocabulary** | Three dialects: static props are flat keys (`backgroundColor`, `borderRadius`); tracks use dot-paths (`transform.y`, `appearance.background.color`); presets use a third form (`transform.translateY` ×9, `transform.translateX` ×6). The scrub hot-patch only knows `transform.x/y`, so **preset slide motion is invisible when scrubbed**. | Auto-key, the inspector↔timeline link and the AI can't address one property by one name. | 42 |
| 5 | **Geometry** | Layers have no frame (x, y, width, height, rotation). Position emerges from flexbox in the generated HTML. There is one fixed artboard. | Figma-grade handles, snapping, constraints and breakpoints need geometry to edit. | 42, 49, 50 |
| 6 | **Messaging** | Hot-patches go to **every iframe on the page** with target origin `"*"` (`MotionSequencer.tsx:292`, `HotReloadEngine.ts`). | Cross-talk between frames once there are several frames on the canvas, and an untyped, unscoped channel. | 48 |
| 7 | **Store** | `useProjectStore.ts` is 1,539 lines and holds the document plus blueprints, databases, pages, redirects, environment and history. Undo snapshots the whole project. | Every change notifies everything. There are no transactions, so a drag can't be one undo step. | 41 |
| 8 | **Shell** | `EditorShell.tsx` is 2,081 lines, with 22 `useState` calls for dock layout. Nothing is persisted, and the bottom tabs are hard-coded. | There's no model for a Design workspace vs an Animate workspace, and no lazy panels. | 44 |
| 9 | **Tools & commands** | The Floating Dock, `ShortcutRegistry`, `CommandPalette` and the menus each dispatch actions their own way. Tools have no state machine. | Keys like Space, Delete and the arrows mean different things on the canvas and in the timeline. That needs a focus-aware command system. | 43 |
| 10 | **Time model** | Clips are per-layer, trigger-started snippets. There's no composition (duration, fps, work area, markers), no layer in/out points and no nesting. | An AE timeline has nothing to draw. | 46 |
| 11 | **Compositing** | No anchor point, blend mode, mask/matte, effect stack, or parenting independent of the DOM tree. | These are core AE tools. | 51 |
| 12 | **Assets & output** | Images are hard-coded Unsplash URLs in registry defaults. There are no video or audio layers, and output is code only. | AE-style users expect footage, audio sync and video/GIF/Lottie output. | 54, 55 |

**Target architecture (v2.1).**

```
 shortcuts · menus · palette · tools · AI ──► Command Bus (43) ──► typed document commands
                                                                        │ transactions (41)
                                                                        ▼
  MDM: layers + geometry (42) + compositions (46) + clips/states/behaviours (7) + links (47) + assets (54)
        │ patch stream                          ├──► History (3) · Autosave (3) · AI diffs (31)
        ▼
  Rules (8) ──► Evaluation Kernel (9) ◄── Transport / One Clock (45)
                     │ ResolvedProps per frame (Hot-Path Law: not through React)
                     ▼
  Frame Scheduler (45) ──► Engine Adapters (10, 14–19) ──► Stage Renderer (48): MDM → live DOM
                                                             │ LayerNodeRegistry · measure()
                                                             ▼
                          Viewport Engine (49): camera · multi-frame · hit-test · overlay
                          (handles 20 · guides · breakpoints 50 · motion paths 53 · onion skin 53)

  Workspace (44):  Layers │ Canvas │ Inspector (Design · Motion · Code)
                   ───────┴────────┴──────────────────────────────────
                   AE Timeline (52) + keyframes & graph editor (23)

  Outputs, all from evaluate():  code export (27–28) · video / GIF / Lottie render queue (55)
```

---

## 5. Phase Overview

| # | Track | Phase | Key deliverable | Depends on | Status |
|---|---|---|---|---|---|
| 1 | A · Solid Ground | Build Health & CI | 0 TS / 0 lint errors, CI, `next build` green | — | ✅ (enforcement by convention) |
| 2 | A | Unified Motion Document Model (MDM v2) | One schema, one store API, migrations | 1 | ✅ |
| 3 | A | Store, History & Persistence | Correct undo/redo, IndexedDB autosave, `.lazy` files | 2 | ✅ (CI green on PR #7) |
| 4 | A | Real-Environment Verification Harness | Playwright, export build and pixel-parity harness | 1 | ✅ (CI green on PR #7) |
| 5 | A | Dependency Reality & Wasm Decision | `motion`, `three`, R3F installed; fake 3D removed; Wasm go/no-go | 1 | 📋 |
| 6 | A | Scope, Naming & Docs Cleanup | Initial bundle excludes After-track panels; one name; docs fixed | 1 | 📋 |
| 7 | B · Motion Core | Motion Primitives: Tracks, Clips, States, Triggers, Behaviours | Formal animation model inside MDM | 2 | 📋 |
| 8 | B | Executable Motion Rules Engine | Grammar + engine spec compiled into one rule table | 7 | 📋 |
| 9 | B | Deterministic Evaluation Kernel | Pure `evaluate(t)`, easing and spring library | 7 | 📋 |
| 10 | B | Live Preview Runtime & Engine Adapters | Stage actually runs the engines; scrub = seek | 8, 9 | 📋 |
| 11 | B | States, Transitions & State Machine | Smart-animate between states; Rive-style inputs | 10 | 📋 |
| 12 | B | Pointer, Physics & Reactive Behaviours | Magnet, tilt, follow, proximity, inertia, virtual pointer | 10 | 📋 |
| 13 | B | Scroll Engine | Scroll-linked/triggered, CSS scroll-timeline + fallback, simulator | 10 | 📋 |
| 14 | C · Engines | GSAP Integration (license-gated) | Adapter + export; SplitText/MorphSVG/DrawSVG/Flip | 10, 6 | 📋 |
| 15 | C | Motion (Framer Motion) Integration | Springs, variants, layout, presence, gestures | 10, 5 | 📋 |
| 16 | C | SVG Animation Studio | Path editing, morph, stroke draw, motion path, filters, masks | 10 | 📋 |
| 17 | C | Typography & Text Motion Engine | Accessible split, stagger, scramble, sheen, variable fonts | 10 | 📋 |
| 18 | C | Three.js / React-Three-Fiber Engine | Real WebGL viewport, primitives, GLTF, 3D tracks | 10, 5 | 📋 |
| 19 | C | Shader & Canvas Effects Engine | GLSL backgrounds, particles, uniforms bound to motion | 10 | 📋 |
| 20 | D · Studio | Figma-Grade Stage & Canvas | Real transform handles, snapping, guides (World Env Tier 1) | 2, 8 | 📋 |
| 21 | D | Layers Panel | Groups, masks, reorder, motion badges | 20 | 📋 |
| 22 | D | Properties Panel: Simple / Pro | Progressive disclosure, tokens (World Env Tier 2) | 20 | 📋 |
| 23 | D | Timeline 2.0 & Graph Editor | Clips, auto-key, multi-select, inline curves | 9, 21 | 📋 |
| 24 | D | Animation Playground | Props knobs, states, time scale, devices, FPS (World Env Tiers 3–4) | 10–13 | 📋 |
| 25 | D | Effects Library ("LazyLayout Bits") | ≥ 40 parametric effects across 6 categories | 14–19, 24 | 📋 |
| 26 | D | Motion Performance Lab | Browser-measured budgets, auto-fixes, regression gate | 10, 4 | 📋 |
| 27 | E · Export | Verified Export Pipeline (React / Next / Vite) | Compiled + built + pixel-compared exports | 4, 10–19 | 📋 |
| 28 | E | Additional Targets & Component Registry | Vue, Web Component, CSS-only, registry / `npx add` | 27 | 📋 |
| 29 | E | Accessibility & Reduced Motion | Per-animation reduced variants; screen-reader parity | 17, 27 | 📋 |
| 30 | F · AI | LLM Integration Layer | Server route, Claude API, schema-constrained output, caching | 2, 8 | 📋 |
| 31 | F | AI Builder: Prompt → Motion Document | Streaming ghost diff, approval, repair loop | 30, 25 | 📋 |
| 32 | F | AI Co-pilot: Edit, Explain, Fix | Selection-scoped edits, explain, diagnostics fixer | 31 | 📋 |
| 33 | F | AI Quality: Evals & Visual Self-Check | Eval set, render-and-compare, metrics dashboard | 31, 4 | 📋 |
| 34 | F | AI From References | Image / GIF / video / URL reference → motion | 31 | 📋 |
| 35 | G · Simple Design | Drawing Tools Foundation | Pen, pencil, stroke capture, smoothing, vector model | 20 | 📋 |
| 36 | G | Shape Recognition & Beautification | Oval → ellipse, line → line, polygons, arrows (< 50 ms, local) | 35 | 📋 |
| 37 | G | Draw-to-Animate Gestures | Stroke → draw anim, line → motion path, circle → orbit | 36, 16 | 📋 |
| 38 | G | Sketch-to-Element with AI | Rough UI sketch → proposed elements + motion | 36, 31 | 📋 |
| 39 | G | Simple Mode & Guided Flow | Draw → Pick motion → Export in 3 steps; new onboarding | 22, 25, 37 | 📋 |
| 40 | H · Release | Initial Phase v2 Release Gate | PRD §11 DoD proven end to end | all (incl. 58) | 📋 |
| 41 | S · Studio Architecture | Store Decomposition & Transaction API | Small document store, gesture transactions, per-layer subscriptions | 2 · *before 3* | 🚧 41.2 done (with Phase 3) |
| 42 | S | Canonical Property Paths & Geometry Model | One property vocabulary; `frame` + sizing on every layer; schema v3 | 2 · *before 7, 20, 48* | 📋 |
| 43 | S | Command Bus, Tool State Machine & Keymap | One command registry, focus-aware keys, tool state machines | 41 · *before 20* | 📋 |
| 44 | S | Workspace Architecture & Layout Presets | Figma-style side panels + AE bottom timeline; Design / Animate / Code presets | 6, 43 · *before 20* | 📋 |
| 45 | S | Transport, Global Clock & Frame Scheduler | One clock, one rAF loop, no per-frame React renders | 9, 41 · *before 10* | 📋 |
| 46 | S | Compositions, Layer Time Bars & Nesting | AE time model in MDM: comps, in/out, markers, precomps, time remap | 7 · *before 8, 9* | 📋 |
| 47 | S | Property Links, Expressions & Drivers | Pick-whip links, sandboxed expressions (`wiggle`, `loopOut`) | 9, 46 | 📋 |
| 48 | S | Stage Renderer v2: Document → DOM Reconciler | Incremental live-DOM stage, shared render definitions, `measure()` | 41, 42 · *before 10* | 📋 |
| 49 | S | Viewport Engine: Infinite Canvas, Hit-Testing & Overlay | Camera, multi-frame canvas, spatial hit-test, overlay layer, Design/Preview modes | 43, 48 · *before 20* | 📋 |
| 50 | S | Auto-Layout, Constraints & Responsive Breakpoints | Stacks, grids, constraints, per-breakpoint props **and motion** (Wix Studio) | 20, 42 | 📋 |
| 51 | S | Layer Compositing: Anchor, Parenting, Blend, Masks, Effect Stacks | AE layer toolkit mapped to web rendering | 46, 48 | 📋 |
| 52 | S | After Effects–Style Timeline Workspace | Layer bars, switches, twirl-downs, work area, markers, J/K/L | 44, 45, 46 · *before 23* | 📋 |
| 53 | S | On-Canvas Motion Editing | Motion paths with keyframe dots, spatial beziers, onion skin | 16, 49, 52 | 📋 |
| 54 | S | Asset Pipeline & Media Layers | IndexedDB asset store; image, SVG, font, video and audio layers synced to time | 3, 45 | 📋 |
| 55 | S | Render Queue: Video, GIF, Lottie & Image Sequences | Frame-accurate media output from `evaluate()` | 9, 45, 48 | 📋 |
| 56 | S | Workers, Baking & Hot-Path Performance | Heavy math off the main thread, content-hash caches, frame telemetry | 5, 9, 45 | 📋 |
| 57 | S | Legacy Runtime Retirement | One renderer, one clock, one evaluator; old paths deleted, grep-gated | 10, 20, 23, 27, 48, 52 | 📋 |
| 58 | S | Studio Architecture Integration Gate | Design → Animate → Output journeys pass in 3 browsers | 41–57, 20–24 · *before 40* | 📋 |

### 5.1 Execution Order (v2.1)

Follow this order, not the phase numbers. Phases on the same line can run in parallel.

| Stage | Order | Why this order |
|---|---|---|
| **1 · Foundation** | 41 → 3 → 4 · then 5 ∥ 6 ∥ 42 · then 43 → 44 *(actual: 3 then 4 ran first, in that order, and shipped 41.2 transactions; 41.1/41.3 follow)* | Transactions (41) must exist before undo is rebuilt on them (3). Geometry and property paths (42) must exist before the motion primitives (7) are written against them. |
| **2 · Motion core** | 7 → 46 → (8 ∥ 9) → 45 ∥ 48 → 10 → (11 ∥ 12 ∥ 13) · 47 after 9 · 56 after 45 | The time model (46) is part of the document the rules and kernel read. The clock (45) and the renderer (48) are what the adapters (10) run on. |
| **3 · Engines** | 14 ∥ 15 ∥ 16 ∥ 17 ∥ 18 ∥ 19 | Unchanged. |
| **4 · Studio** | 49 → 20 → (21 ∥ 22 ∥ 50) · 52 → 23 → 53 · 51 · 24 → 25 → 26 · 54 any time after 3 | The viewport engine (49) replaces the stage foundation Phase 20 assumed. The AE workspace (52) is the container that the Phase 23 keyframing lives in. |
| **5 · Output** | 27 → (28 ∥ 29) · 55 | The render queue (55) can start once 45 and 48 are done. |
| **6 · AI** | 30 → 31 → (32 ∥ 33 ∥ 34) | Unchanged. |
| **7 · Draw** | 35 → 36 → (37 ∥ 38) → 39 | Unchanged. 35 now draws on the Phase 49 overlay. |
| **8 · Release** | 57 → 58 → 40 | Retire legacy paths, prove the studio journeys, then the release gate. |

---

# TRACK A — SOLID GROUND (Fix What Is Broken)

> Nothing new is built until Track A is green. Every later phase depends on a model that type-checks, persists correctly, and can be verified in a browser.

---

## Phase 1: Build Health & CI
**Goal:** The codebase compiles, lints and builds, and a machine enforces this on every push.
**Closes:** AUD-01, AUD-02, AUD-03 · **Depends on:** —

### Sub-Phase 1.1: Type Error Burn-Down
- [x] Record the current `tsc --noEmit` error list in `DOCS/Initial/audit/tsc-baseline.txt` (162 errors on the audit date).
- [x] Fix the model-boundary errors (TS2339/TS2353) **by typing against the interim union** only where Phase 2 will replace the model anyway. Add a `// TODO(MDM-P2)` tag so Phase 2 can grep for them.
- [x] Fix TS2678 impossible `case` labels (27). *Actual cause differed from the plan:* 25 were legacy dotted track IDs (`transform.x`, `media.scale` …) switched against `AnimationTrackId`, and 2 were unreachable search entity types. No `toArchetype()` adapter was needed; the track-ID switch is tagged `TODO(MDM-P2)`.
- [x] Fix test-only errors (e.g. `ArchetypeEmitters.test.ts`, `ProjectInitialization.test.ts`).
- [x] Add a `typecheck` npm script. The `test` script runs `typecheck` first, so a green test run can no longer hide type errors.

### Sub-Phase 1.2: Lint Burn-Down
- [x] Fix the 179 ESLint errors. Warnings are allowed for now, but the count may not grow (budget: `--max-warnings=467` in the `lint` script; lower it as warnings are removed, never raise it).
- [x] Enable `react-hooks/exhaustive-deps` as an error for `src/editor/**`. Stale closures in timeline code are a correctness risk.

### Sub-Phase 1.3: Production Build
- [x] `next build` succeeds on Next 16.3 (read `node_modules/next/dist/docs/` for Next 16 changes first, per `AGENTS.md`).
- [x] Commit the `@next/swc-darwin-arm64` devDependency decision (it is uncommitted as of the audit). Prefer letting Next resolve SWC per platform, so Linux CI doesn't break. *Decision:* removed; the lockfile already lists every platform's SWC binary as optional.

### Sub-Phase 1.4: Continuous Integration
- [x] `.github/workflows/ci.yml`: install → typecheck → lint → test → build, on every push and PR. *(First GitHub run green on ubuntu-latest: run 35996342152.)*
- [x] Branch protection on `main` requiring CI green, **by convention** (decided 2026-09-24): merge to `main` only through PRs with a green `verify` check. *Technical enforcement blocked:* GitHub returns 403 for branch protection and rulesets on this private repo without GitHub Pro. Options: upgrade to Pro, make the repo public, or enforce by convention (merge to `main` only through PRs with a green `verify` check).

**Key files:** `package.json`, `.github/workflows/ci.yml`, `tsconfig.json`, `eslint.config.mjs`
**Verification Gate:** A fresh clone runs `npm ci && npm run typecheck && npm run lint && npm test && npm run build` with 0 errors on Linux CI. A PR that introduces a type error is blocked.

### Phase 1 Progress Log
**2026-09-24: ✅ Phase 1 complete (enforcement by convention).** `main` now carries the studio (PR #3, merged with a green `verify`). The previous webgen site is preserved on `main-webgen-backup`. Caveat: nothing technically blocks a red PR until the repo gets GitHub Pro or goes public; add the required check then.

**2026-09-24 (update): CI green on GitHub (Linux).** Branch protection is blocked by the GitHub plan (see 1.4). The gate still needs a blocked-PR demonstration, which requires enforcement.

**2026-09-24: green locally, CI gate pending.** On macOS after a clean `npm ci`: `typecheck` 0 errors (was 162), `lint` 0 errors / 467 warnings (was 179 / 494), `npm test` 594/594, `next build` succeeds. The phase stays open until: (1) the workflow passes on GitHub (Linux), (2) branch protection is on for `main`, and (3) a PR with a deliberate type error is shown to be blocked.

Fixes that were real bugs, not just types:
- **AI Co-pilot** read `activeElementId` / `updateElement` from the project store. Neither exists, so the panel never saw a selection. It now uses the selection store and `setElementProperty`.
- **Code Inspector ZIP download** called a static `ZipPacker.downloadZip` that doesn't exist. It now uses the instance API.
- **Project Hub** passed `targetConfig` to `initElementProject`, which reads `target`. The chosen framework/styling was silently replaced by defaults.
- **Sequencer / Curve Editor** read `element.animationStack`, but writes land in `element.properties.animationStack` (the read half of AUD-05). Both now read where writes land, matching the Outliner. Tagged `TODO(MDM-P2)`.
- **Live Code Inspector** called `setState` inside `useMemo` (setState during render). Compilation is now a pure function returning files + duration.
- **Whiteboard wheel/zoom** read environment zoom/pan settings from a stale closure, so settings changes didn't apply. **Blueprint canvas** re-subscribed window mouse listeners on every render during drags. **Sequencer shortcuts** captured stale delete/duplicate handlers.
- **Blueprint wire geometry** was measured from the DOM during render. It is now measured after layout (`useLayoutEffect`) into state, as offsets relative to each node.

Removed: `LiveCollaborationPanel.tsx`. It was not imported anywhere, was written against collab-store methods that don't exist, and collaboration is After-track. It can be recovered from git history.

New shared code: `src/core/errors.ts` (`errorMessage`), `src/core/ids.ts` (`createId`, the AUD-07 ID format, adopted so far only where lint required it; Phase 2.3 owns the full switch), `src/core/hooks/useLatestRef.ts`, `src/core/hooks/useNow.ts`.

Not verified in a browser: the React-hooks refactors (state-sync effects moved to render-time adjustment, layout measurement moved to layout effects) passed type, lint, unit and build checks, but nothing exercises them in a real browser until Phase 4.

---

## Phase 2: Unified Motion Document Model (MDM v2)
**Goal:** Replace the four element models with one versioned schema and one store API that every surface uses.
**Closes:** AUD-04, AUD-05 (model half), AUD-07 · **Depends on:** 1

### Sub-Phase 2.1: Schema Definition
- [x] `src/core/document/schema.ts`: the MDM types from PRD §4 (Document, Layer kinds, Archetype, Effect instance, Track, Clip, State, Trigger, Behaviour, Tokens, ExportSettings). *Notes:* layer kind is derived from the archetype (not stored, so it can't drift). `effect` is a reserved kind; the effect-instance props contract arrives with the Effects Library (Phase 25).
- [x] A runtime validator (Zod or equivalent) generated from the same source. It also produces the **JSON Schema** used by the AI in Phase 30. One source, three outputs: TS types, runtime validator, JSON Schema.
- [x] `schemaVersion: 2` plus `src/core/document/migrations/` with a `v1 → v2` migration covering `ProjectElement` and `properties.animationStack` data saved in localStorage.

### Sub-Phase 2.2: Archetype and Layer-Kind Registry
- [x] One registry, `src/core/document/registry.ts`, maps each archetype/kind to its property sections, legal states, default props, and semantic export tag. Its data comes from the v1.1 `archetypes/*.ts` and `element-sections.ts`. *Note:* default props come from the live `initElementProject` values; the `archetypes/*.ts` factories were only used by tests that never ran (outside the test glob) and were deleted.
- [x] Retire `ElementType` (20 types) and the unused parts of `GrammarElementType` (32 types). Grammar types that Initial Phase doesn't need (Navbar, Page, Form …) are listed as "reserved" in the registry, not deleted from the grammar doc. *Note:* `GrammarElementType` stays as the grammar's own vocabulary; the registry maps each archetype to one and exports `RESERVED_GRAMMAR_TYPES`.

### Sub-Phase 2.3: Single Store API
- [x] `useDocumentStore` with typed commands only: `addLayer`, `updateProps(layerId, patch)`, `addTrack`, `setKeyframe`, `addState`, `applyDiff(diff)` … No `setElementProperty(id, string, unknown)`. *Design:* the document lives in the project store's `document` field (so snapshots, saving and undo keep covering it); `useDocumentStore.ts` is the only read/write API over it.
- [x] Every command is a serialisable **Patch** (Immer patches, already a dependency). The same patch format is used by undo, AI diffs, and future collaboration. *Note:* undo still uses snapshots; Phase 3.1 moves it onto these inverse patches.
- [x] Deterministic ID generator (`prefix_` + 8 hex characters from `crypto.getRandomValues`), replacing `Math.random` IDs (AUD-07). *Scope:* all document entities (layers, clips, tracks, keyframes, states). Runtime/project records (history entries, diagnostics, trace runs, pages, branches) still use ad-hoc ids.

### Sub-Phase 2.4: Consumer Migration
- [x] Move the Sequencer, Outliner, Details, Code Inspector, Co-pilot and Emitters to MDM. Delete the `TODO(MDM-P2)` shims from Phase 1. *Note:* the runtime's dual track-id switch is re-tagged `TODO(P7)`: it serves the separate `AnimationSample` model, which Phase 7 folds into the document.
- [x] Remove `ProjectElement`, `BaseElementNode` and `AttachedAnimation` once nothing imports them.

**Reuse:** archetype defaults, property surfaces (v1.1 PRD §5), `SCHEMA_REFERENCE.md` fragments.
**Key files:** `src/core/document/*`, `src/core/store/useDocumentStore.ts`
**Verification Gate:** `grep` finds zero imports of the removed types. Every v1.1 demo project in localStorage migrates and renders identically (Playwright screenshot before and after). A property-based test round-trips 500 random documents through validate → serialise → parse without change.

### Phase 2 Progress Log
**2026-09-24: ✅ Phase 2 complete.** CI green on PR #6 (Linux). Gate evidence below.
- **Removed types:** a unit test (`documentStore.test.ts`, "Phase 2 gate") scans all source, comments excluded, and finds no `ProjectElement`, `BaseElementNode`, `AttachedAnimation` or `ElementType`. `src/core/elements/` is deleted.
- **Migration parity (Playwright):** the pre-Phase-2 build (`5d7a934`, :3001) saved a real v1 project with two co-pilot presets in `properties.animationStack`. The new build (:3000) loaded the same localStorage and rendered it with a **0 px** difference (live FPS/memory counters masked). Re-saving produced a v2 document with the same two animations as clips on `el_buy_button` (triggers `onHover→hover`, `onClick→press`, track counts equal), and no `elements` key.
- **Property test:** 500 random documents round-trip validate → serialise → parse unchanged (`schema.test.ts`, fast-check).
- `typecheck` 0 · `lint` 0 errors / 463 warnings (budget ratcheted 467 → 463) · 625/625 tests (31 new) · `next build` green · `run-editor` smoke 8/8.

Bugs found and fixed along the way:
- **Sequencer edits persist (AUD-05):** "+ Keyframe" now writes to the clip the Sequencer reads. Verified in the browser: the edits survive a save.
- **Content Block Shelf** attached blocks by writing `properties.children` instead of the layer's real `children`, so inserted blocks never joined the tree.
- **`insertGeneratedComponent`** added the component to the page root's children but left the component's `parentId` null; **`removeElement`** left the id dangling in its parent's children. Both are fixed by the new commands.
- **GPU auto-fix** in Motion Diagnostics was a no-op. It now sets `willChange: "transform"`, as its message says.
- **Zod drops `__proto__` keys silently** (found by the property test). The validator now rejects them explicitly, and migration drops them.
- **Version-control merge** now carries non-conflicting clip changes and repairs tree links. It previously added layers without linking them to their parent.

Known gaps, deliberately left for their phases:
- Undo is still snapshot-based (Phase 3.1 moves it to inverse patches).
- A clip changed on both branches merges as "current wins" with no conflict reported.
- `AnimationSample` (the AnimationEditor / emitter timeline model) is still separate (Phase 7).
- Per-archetype prop keys are not validated (Phase 8 rules engine; `src/core/document/props.ts` holds the typed views until then).
- The "Prompt AI" input steals focus from global search (pre-existing).

---

## Phase 3: Store, History & Persistence
**Goal:** Every edit is undoable, nothing is lost on reload, and documents are portable files.
**Closes:** AUD-05 (behaviour half), AUD-08 · **Depends on:** 2
> **v2.1 amendment:** Undo (3.1) is built on transactions: one committed transaction is one history entry, and transient patches never reach history or autosave (3.2). *As built:* Phase 3 ran before Phase 41 and shipped 41.2 (transactions) itself; 41.1 and 41.3 remain.

### Sub-Phase 3.1: Correct History
- [x] Undo/redo is built on the Phase 2 patches (inverse patches), replacing full-snapshot history. Memory stays bounded for long sessions. *Design:* a history entry is either a **document** entry (patches + inverse patches) or a **project** entry (a snapshot of the non-document After-track state such as pages, blueprints and databases, swapped on undo/redo; it carries the document only for the five actions that write layers outside the commands). The stack is capped at 200 entries. `historyCommands.undo / redo / jumpTo` live in `useDocumentStore.ts`.
- [x] Gesture coalescing: a drag or scrub produces **one** history entry. *Design:* this shipped Phase 41.2's transaction API (`documentCommands.begin(label)` → `commit()` / `cancel()`), plus `installGestureCoalescing(window)`, which wraps every pointer press in a transaction, so every drag, scrub and slider in the app is one step with no per-component code. Repeated value edits to the same target within 1 s (typing) merge; structural edits (adding a keyframe or layer) never merge.
- [x] Regression test for AUD-05: add a keyframe in the Sequencer → it appears in every surface that reads document clips (Sequencer, Outliner, the saved project, after reload) → undo removes it everywhere (`history.test.ts`, browser gate). *Re-scoped:* the Code view and the Playground don't read document clips at all today (AUD-40; the Playground doesn't exist yet). Those two checks moved to Phases 27 and 24, where those surfaces are built on the document.

### Sub-Phase 3.2: Autosave & Recovery
- [x] IndexedDB persistence (localStorage kept only for UI preferences), debounced autosave, crash recovery prompt. *Design:* `ProjectDatabase` stores projects, list summaries and the undo history in IndexedDB and moves pre-Phase-3 localStorage projects over once. `ProjectSession` autosaves 400 ms after the last change, never mid-gesture, and flushes on tab hide and Cmd+S. A small synchronous localStorage **journal** holds the patches since the last save; after a crash, the next load offers "Restore unsaved changes?". Undo history persists, so undo works across reloads.
- [x] Storage quota handling with a clear error: a banner says storage is full and to export a `.lazy.json` file or delete old projects. When IndexedDB is unavailable, a banner says projects last only for this tab.

### Sub-Phase 3.3: Files
- [x] `.lazy.json` export/import (the document plus embedded or linked assets), with a schema-version check and migration on import. *Assets are linked* (their URLs are listed in the file) until Phase 54 can embed them. Files from a newer schema are refused with an "update LazyLayout" message. File → Export Project File / Import Project File.
- [x] Drag a `.lazy.json` file onto the window to open it.

**Verification Gate:** Playwright: create a document, edit 20 times, reload the tab, the state is identical, undo 20 times returns to blank. An exported `.lazy.json` imported in a fresh browser profile renders pixel-identically.

### Phase 3 Progress Log
**2026-09-25: ✅ Phase 3 complete. CI green on PR #7** (`https://github.com/NetPranav/WebGen/pull/7`, `verify` + `e2e` jobs, all 3 browser projects). Phase 3 and Phase 4 shared one PR/branch (`phase-3-history`) and one CI run, since Phase 3's own gate moved into the Phase 4 harness (see below). See the Phase 4 progress log for the two real CI-only bugs this run found and fixed (AUD-42, AUD-43) before it went green.

**2026-09-24: gate passed locally in Chromium, Firefox and WebKit.** Gate script: `tests/e2e/phase3-persistence.mjs`, run against `next build && next start`. It drives the real UI and uses File → Export Project File as the oracle (the export serialises the live in-memory project):
- **A.** A new project gets 20 Sequencer "+ Keyframe" edits, then a reload: the state is identical, and 20 × Cmd/Ctrl+Z returns exactly to the blank start (history persisted in IndexedDB).
- **B.** The exported file, imported in a fresh browser profile, restores the same document, and the canvas and timeline render with **0 px** difference.
- **C.** Dropping the file on the window opens it.
- **D (Chromium).** An edit, then the renderer is killed (`Page.crash`) before autosave: the next load shows "Restore unsaved changes? … 1 change", Restore brings the edit back, and no prompt appears after that.
- **E.** Dragging a keyframe in the Sequencer is exactly one undo step.
- `typecheck` 0 · `lint` 0 errors / 463 warnings (no growth) · 654/654 unit tests (new: `history`, `diff` (500-run property test), `ProjectSession`, `ProjectDatabase`, `lazyFile`) · `next build` green · `run-editor` smoke 8/8.

Bugs found and fixed along the way:
- **Undo/redo did nothing in the editor.** Every undo/redo button in the shell was `() => {}`, and no global Cmd+Z handler existed (the shortcut registry is imported but never attached). Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z and Ctrl+Y now work everywhere except inside text fields, which keep native undo.
- **Undo after "Mount Showcase Demo" or "Clear Canvas" restored the demo itself.** Both recorded the *new* snapshot as the "before" state.
- **Every drag frame was a full-project snapshot** (a 1-second keyframe drag recorded ~60 undo steps, each a copy of the whole project).
- **There was no autosave**: Cmd+S wrote to localStorage, and the "unsaved" dot never turned on. The dot now reflects real save state.
- **The Project Hub navigated away before its save finished.** It now waits for the write.
- The Co-pilot auto-fix made two writes (one unlabelled) for one action; it is now one transaction.

New findings recorded in `AUDIT.md` (not fixed here): AUD-39 (the Content Browser's Animation panel keeps tracks in local React state, not the document) and AUD-40 (the Code view ignores document clips; Export Preview shows canned code per archetype).

Known gaps:
- Two tabs editing the same project both autosave, and the last write wins. There is no cross-tab lock yet.
- Project-level (After-track) changes are not in the crash journal; autosave alone covers them.
- The gate runs locally; Phase 4 moves it into CI.

## Phase 4: Real-Environment Verification Harness
**Goal:** The test infrastructure every later gate relies on: browser tests, export builds and pixel parity.
**Closes:** AUD-15, AUD-16 (infrastructure) · **Depends on:** 1
> **v2.1 amendment:** the Verification Gate's own "editor Playground" doesn't exist yet (Phase 24). Phase 4.3 uses an independent oracle instead (see its progress log) — the same re-scoping pattern Phase 3 used for its Playground-dependent checks. The real editor-vs-export comparison is Phase 27's job once the exporters carry animation.

### Sub-Phase 4.1: Browser E2E
- [x] Playwright set up with Chromium, WebKit and Firefox projects, running against `next build && next start` (`playwright.config.ts`; `webServer` builds once, all three projects share it).
- [x] Deterministic time: a test clock (`tests/e2e/support/clock.ts`, wrapping Playwright's native Clock API) that controls `requestAnimationFrame` and `performance.now`, and `seekRuler` (`tests/e2e/support/editor.ts`) for the MDM playhead, so animations can be screenshotted at an exact `t`. *Finding (AUD-41):* combining the fake clock with the Sequencer's pre-Phase-45 always-on `requestAnimationFrame` loop is not deterministic (up to 3× swings, measured); exact-time seeking uses a direct ruler click instead, which is exact. `deterministic-clock.spec.ts` proves both the isolated clock (works) and the entangled loop (doesn't, on purpose — it's the falsifier for AUD-41, closed by Phase 45).

### Sub-Phase 4.2: Export Build Harness
- [x] `tests/export-harness/`: fixture apps (Next 16 App Router with `output: "export"`, Vite React, Vite Vue 3, vanilla — no build step, it is the target) as npm workspaces sharing root's `next`/`react`. The harness (`build.mts`) writes real `CrossFrameworkExporter` / `VanillaHtmlEmitter` output for 4 reference elements (one per emitter family) into each fixture and runs `typecheck` + `build`.
- [x] Runs on CI for every exporter change: `.github/workflows/export-harness.yml`, nightly plus on PRs touching `src/compiler/**` (and the schema/animation types the emitters read).

### Sub-Phase 4.3: Pixel Parity
- [x] `tests/export-harness/parity.spec.ts`: the real `VanillaHtmlEmitter` markup, animated two ways — an independent oracle (`oracleValueAt`, linear interpolation computed in the test) and the real `GSAPAnimationEmitter` output, seeked with `tl.seek(t)` — rendered at the same size and sampled times (0, 25, 50, 75, 100%), diffed with `pixelmatch` at a configurable threshold (default ≤ 1%, `MAX_DIFF_RATIO`).
- [x] Parity reports are stored as CI artifacts: diff/oracle/export screenshots are `testInfo.attach()`ed (surface in the Playwright HTML report) and the report is uploaded by the `e2e` CI job.

**Verification Gate:** ✅ A deliberately broken exporter (the gate's own example: a wrong easing name, injected into the real `GSAPAnimationEmitter` output) fails the parity job at the mid-timeline sample; the correct one passes at all 5 sampled times. Proven on Chromium, Firefox and WebKit, both locally and on real CI hardware (`parity.spec.ts`, PR #7 — see progress log for the threshold that took).

### Phase 4 Progress Log
**2026-09-25: ✅ Phase 4 complete. CI green on PR #7** (`https://github.com/NetPranav/WebGen/pull/7`, `verify` + `e2e` + `export-harness` jobs, all 3 browser projects). The Real-Environment Verification Law paid for itself immediately: the *first* real CI run (ubuntu-latest — everything above had only ever run on macOS) failed twice, on two genuine environment-only bugs the harness itself had, neither visible locally:
- **AUD-42 — pixel-parity threshold too tight for real cross-platform rendering.** `parity.spec.ts`'s `MAX_DIFF_RATIO` (spec default ≤ 1%) measured an exact 0% match on all 5 samples locally (macOS) but a deterministic 2.39% diff at one sample (t=0.75) on Linux CI, reproduced identically on retry — software-rasterizer/sub-pixel variance between platforms, not an exporter bug (the actual "wrong easing" regression this gate exists to catch diverges far more — confirmed via the broken-export test's own bounding-box mismatch). Raised to 4%, with the measurement recorded in a comment.
- **AUD-43 — the `nextjs-app` fixture only ever typechecked on a machine that had already run `next build`/`next dev` there once.** Next's ambient `declare module '*.module.css'` lives behind `next-env.d.ts`, which is auto-generated only by `next build`/`next dev` (never by `tsc` alone) and is gitignored; `build.mts` runs `typecheck` before `build` by design, so nothing ever generated it first on a fresh clone. Every local pass to that point was really testing a stale leftover file, not a clean checkout. Reproduced deterministically by stripping `next-env.d.ts`, `.next/` and the `tsbuildinfo` cache before typechecking a freshly-exported `components/` directory (`TS2307: Cannot find module './*.module.css'` for all 4 reference elements). Fixed by committing the fixture's `next-env.d.ts` (static boilerplate) instead of relying on generation.
- **A third, smaller bug in the harness itself:** `build.mts`'s `check()` accepted a `detail` string but never printed it, so the first CI failure showed only a bare "FAIL compiles and builds" with no diagnosis — exactly the kind of silent gate AUD-15 exists to eliminate. Fixed: failures now print the captured `tsc`/bundler output.

None of these were exporter or animation bugs — all three are the harness's own calibration against a real, previously-untested environment, which is precisely what "CI pending" was still guarding against. Final green run: `verify` (typecheck/lint/unit/build) and `e2e` (42 Playwright tests × 3 browsers) both passed on 2 CI runs (push + pull_request triggers), `export-harness` passed in 33s.

**2026-09-24: gate passed locally in Chromium, Firefox and WebKit.** `npx playwright test` (42 tests: `phase3-persistence.spec.ts` ×5 cases, `deterministic-clock.spec.ts` ×3, `parity.spec.ts` ×6, on 3 browser projects, D skipped on non-Chromium) — 40 passed, 2 skipped, against `next build && next start`. `npm run export-harness -- --self-test` — 5/5 checks, including the self-test. `typecheck` 0 · `lint` 0 errors / 463 warnings (no growth) · 655/655 unit tests (+1) · `next build` green.

- **Phase 3's own gate moved into this harness** (`tests/e2e/phase3-persistence.spec.ts`, replacing the `PW_DIR`-driven `.mjs` script), so it now runs in CI.
- **Bug found and fixed:** `TextEmitter.emit()` threw `ReferenceError: name is not defined` for every text/heading export with `stylingSystem: "css-modules"` (a stray `${name}` where the variable is `componentName`, `TextEmitter.ts:87`). Invisible to `ArchetypeEmitters.test.ts` because every existing TextEmitter test used the default (Tailwind) styling. Found within minutes of the export build harness's first run, on a fixture app calling the real emitter with real props — exactly the class of bug AUD-15 named ("exported code is never compiled, built, or run"). Fixed, and a regression test added.
- **AUD-41 (new):** the Sequencer's `requestAnimationFrame` playback loop starts unconditionally at mount and reads real `performance.now()`, so it can't be driven deterministically by a fake clock installed mid-session (measured up to 3× variance for an identical virtual-time request). `deterministic-clock.spec.ts` Case 3 keeps this failure mode falsifiable (the assertion flips if it's ever fixed). Closed by Phase 45 (Transport & Frame Scheduler), which replaces this loop with the shared clock. Exact-time seeking for the pixel-parity work uses `seekRuler` (a direct ruler click) instead, which is unaffected and exact.
- **Re-scope, same pattern as Phase 3's AUD-05/AUD-40 note:** 4.3's Verification Gate text says "the editor Playground" — Phase 24 hasn't built it yet. `parity.spec.ts` uses an independent oracle (linear interpolation computed in the test) as the ground truth instead, so the gate is provable now; the literal editor-vs-export comparison is Phase 27's job once the exporters carry animation end to end.
- **Export build harness runs on real npm workspaces** (`tests/export-harness/fixtures/{nextjs-app,vite-react,vue}`), not hand-rolled installs: `next`/`react`/`react-dom` hoist from the root install (same pinned versions), so only Vite/Vue/their plugins are new downloads. The harness writes real `CrossFrameworkExporter` output into each fixture, runs `typecheck` then `build`, and restores the fixture's committed placeholder afterward — proven by a `--self-test` flag that injects a syntax error and asserts the harness catches it, so a pass is meaningful.
- Deliberately not done here (Phase 4 is infrastructure only, per its own "Closes: AUD-15, AUD-16 (infrastructure)"): the exporters still don't carry animation into React/Vue/Next output end to end (only the vanilla + GSAP path used by the parity harness does, and only for this one reference element). That gap, and the full editor-vs-export comparison, belong to Phase 27.

---

## Phase 5: Dependency Reality & Wasm Decision
**Goal:** Install what the product claims to use, remove what it fakes, and make an evidence-based call on the C++ kernel.
**Closes:** AUD-10, AUD-11, AUD-12 · **Depends on:** 1

### Sub-Phase 5.1: Engine Dependencies
- [ ] Add `motion` (import from `motion/react`), `three`, `@react-three/fiber` (React 19-compatible major), `@react-three/drei`, and `@gsap/react` (GSAP is already present). Pin versions.
- [ ] Code-split each engine so an unused engine costs zero bytes in the editor's initial bundle (dynamic `import()` per adapter).

### Sub-Phase 5.2: Remove Fakes
- [ ] Delete the 2D-canvas "WebGL" drawing from `Scene3DViewport.tsx`. It is rebuilt on R3F in Phase 18. Until then, the 3D layer kind is hidden behind a feature flag.
- [ ] Rename or annotate every "C++ Wasm" claim in the UI and docs to say what actually runs.

### Sub-Phase 5.3: Wasm Go / No-Go
- [ ] Build the kernel with Emscripten in CI (`npm run build:wasm`) and load it in the browser.
- [ ] Browser benchmark: spline evaluation, path arc-length sampling and spring baking, Wasm vs the TS fallback, measured with real frame timing at realistic sizes (e.g. 200 tracks × 120 samples).
- [ ] **Decision rule:** keep Wasm only if it is ≥ 2× faster on a workload the product actually runs per frame. Otherwise remove the build step, keep the TS code, and archive `wasm/` under `DOCS/Initial/decisions/`. Record the decision in `DOCS/Initial/decisions/0001-wasm.md`.

**Verification Gate:** `npm ls motion three @react-three/fiber` resolves. The editor's initial JS bundle grows ≤ 5% (engines are lazy). The Wasm decision record exists with benchmark numbers.

---

## Phase 6: Scope, Naming & Docs Cleanup
**Goal:** The Initial Phase bundle contains only Initial Phase features, the product has one name, and the docs match the code.
**Closes:** AUD-22 … AUD-27 · **Depends on:** 1

### Sub-Phase 6.1: Feature Flags Instead of String-Blocking
- [ ] `src/core/flags.ts` with an `edition: "initial" | "full"` build flag. After-track panels (Blueprint, Execution Trace, Deployment, Database Studio, Collaboration, Plugins, Pages, Version Control) are registered only when `edition === "full"` and tree-shaken otherwise.
- [ ] Remove the string-matching `database` guards in `EditorShell.tsx`.

### Sub-Phase 6.2: One Name
- [ ] The product name is **LazyLayout**. Update `package.json` `name`, page titles, the launcher, README, and all Initial docs.
- [ ] Replace the create-next-app `README.md` with a real one (what it is, how to run it, where the docs are).

### Sub-Phase 6.3: Docs Truth Pass
- [ ] Replace "Next.js 15" with "Next.js 16" everywhere in Initial docs. Fix stale `DOCS/ROADMAP.md`-style links.
- [ ] Mark `DOCS/After/*` with a banner: "Full-vision track. Not the active roadmap; see DOCS/Initial/ROADMAP.md." Rename `Roadmap_after.md` → `ROADMAP_EXISTING_PROJECT_IMPORT.md`.
- [ ] Remove `DOCS.zip` from git.
- [ ] Create `DOCS/Initial/LICENSES.md` (the Licensing Gate Law register).
- [ ] Update `UI.md`, `PANELS.md`, `SCHEMA_REFERENCE.md`, `CONVENTIONS.md` and `FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md` to PRD v2 (they carry a "pending v2 update" banner until then).

**Verification Gate:** The `edition=initial` production bundle contains none of the After-track panel modules (checked with the bundle analyzer in CI). A link checker over `DOCS/Initial` reports 0 broken links.

---

# TRACK B — MOTION CORE (The Rules and the Math)

> This is the hardest and most important track. It turns "animation settings rules" into executable code that everything else trusts.

---

## Phase 7: Motion Primitives — Tracks, Clips, States, Triggers, Behaviours
**Goal:** A formal, complete animation model inside MDM that can express every effect in PRD §5.2.
**Depends on:** 2
> **v2.1 amendment:** Also depends on 42. The 7.1 animatable property registry **is** Phase 42's registry, extended with animation metadata; there is no second registry. Sequences (7.2) are placed in compositions (Phase 46), which follows directly.

### Sub-Phase 7.1: Property Paths & Value Types
- [ ] A canonical **animatable property registry**: each path (e.g. `transform.x`, `opacity`, `filter.blur`, `svg.pathD`, `text.charOpacity[i]`, `shader.uniforms.uSpeed`, `scene.camera.fov`) declares its value type (number+unit, colour, path, transform, vector3, quaternion, enum), interpolation method, compositing class (GPU / paint / layout) and default.
- [ ] Seed it from CONVENTIONS §4 and spec §3 (the property catalogue).

### Sub-Phase 7.2: Time-Based Primitives
- [ ] **Keyframe** (time, value, easing-out, optional hold), **Track** (path + keyframes), **Clip** (tracks + duration + repeat + direction + delay), **Sequence** (clips on a timeline with offsets and staggers).
- [ ] **Stagger** as a first-class modifier (from: start/end/center/edges/random/index-list; grid distribution; each/amount).

### Sub-Phase 7.3: State & Trigger Primitives
- [ ] **State** (a partial property snapshot), **Transition** (from → to, spring or tween, per-property overrides), **Trigger** (PRD §4 list plus `custom` event names).
- [ ] **Behaviour** primitives: `followPointer`, `magnet`, `tilt`, `proximity`, `springTo`, `inertia`, `noise`, `loop`, `uniformDriver`, each with typed params.

### Sub-Phase 7.4: Effect Definitions
- [ ] The **Effect** type: props schema + internal layer template + behaviours/clips + engine routing hints + reduced-motion variant + performance class (PRD §5.3).
- [ ] Effect *instances* in a document reference an effect definition by ID and version, and store only the prop overrides.

**Verification Gate:** Each of these 12 reference effects can be *expressed* as a valid MDM document with no escape hatches: split-text reveal, magnet button, 3D tilt card, aurora shader background, stroke-draw logo, path morph icon, scroll-parallax image, dock magnification, count-up, click spark, orbiting 3D object, state-machine toggle. (Validator passes; review checklist signed.)

---

## Phase 8: Executable Motion Rules Engine
**Goal:** `lazylayout_element_grammer.md` and the animation spec become one executable rule table that the UI, AI and export all consult.
**Closes:** AUD-06 · **Depends on:** 7

### Sub-Phase 8.1: Rule Table
- [ ] `src/core/rules/`: data-driven rules (not `if` chains) for **compatibility** (layer kind × property path × trigger × behaviour), **conflicts** (Single Transform Authority, one owner engine per property per layer, priority arbitration from spec §5), **performance** (layout-triggering paths, filter cost) and **accessibility** (reduced-motion requirements, flashing limits of ≤ 3 flashes/second).
- [ ] Reuse the logic in `ElementGrammarEngine.ts`, `AnimationValidator.ts` and `grammarHelpers.ts`, merged into this table.

### Sub-Phase 8.2: Query API
- [ ] `rules.canAdd(doc, layerId, candidate)`, `rules.validate(doc)`, `rules.explain(diagnostic)`, `rules.suggestFix(diagnostic)`, and `rules.route(animation)` (the engine routing from PRD §7).
- [ ] Diagnostics use stable codes (`[ANIM_COMPAT]`, `[STA_CONFLICT]`, `[PERF_LAYOUT]`, `[A11Y_FLASH]` …) with a human message and a machine-readable fix.

### Sub-Phase 8.3: Engine Routing
- [ ] Implement the routing decision tree (PRD §7, spec §12) as rules with scores. Pro-mode overrides are validated and explained.

### Sub-Phase 8.4: UI Contract
- [ ] The "+" (add) menus, the drop targets and the property enablement **only** render `rules.canAdd` results (grammar §8, "the + icon is a query").
- [ ] Remove every ad-hoc compatibility check from `src/editor/**` (tracked by grep for known patterns).

**Verification Gate:** Grammar §9's full compatibility matrix is converted into a table-driven test (every cell asserted). The Playwright test "try to add an illegal animation" shows the disabled item with a reason. Zero compatibility logic remains in editor components (lint rule or grep gate).

---

## Phase 9: Deterministic Evaluation Kernel
**Goal:** A pure function gives the exact value of any animated property at any time, for any inputs. It is the oracle for preview, export parity, AI verification and scrubbing.
**Depends on:** 7
> **v2.1 amendment:** Also depends on 46. The signature becomes `evaluate(doc, compositionId, layerId, t, inputs)`, and it honours composition time (in/out, stretch, remap, nesting). Links and expressions (47) and parenting (51.2) are added to the composition order as they land. It replaces `interpolateTrackValue` in `MotionSequencer.tsx`, which ignores easing.

### Sub-Phase 9.1: Easing & Physics Library
- [ ] One library: cubic-bezier (with the solver from the v1.1 TS spline code), named eases (the GSAP-compatible set), `steps()`, CSS `linear()` curves, and **analytic springs** (under-, critically- and over-damped) with velocity handoff.
- [ ] Converters between engines: spring → CSS `linear()` (reuse `AnimationLoweringCompiler`), spring → Motion config, ease → GSAP string, ease → WAAPI easing.

### Sub-Phase 9.2: Interpolators
- [ ] Number+unit, colour (OKLab interpolation for perceptual smoothness), transform (decompose/recompose), SVG path (reuse `PathMorphSolver`), quaternion SLERP (reuse `Scene3DEngine`), discrete/enum.

### Sub-Phase 9.3: `evaluate()`
- [ ] `evaluate(doc, layerId, t, inputs) → ResolvedProps`. The inputs are a virtual pointer, a virtual scroll progress, the active states, prop values and a reduced-motion flag.
- [ ] Composition order: base props → state → clips (by priority) → behaviours → Single Transform Authority synthesis (reuse `synthesizeSingleTransformMatrix`).
- [ ] Performance: evaluating 200 tracks at one `t` takes < 1 ms in the browser.

**Verification Gate:** Golden-value tests for every easing and interpolator against reference implementations (GSAP's easing functions, the CSS spec for `cubic-bezier`/`linear()`). Fuzz test: evaluation is deterministic (same inputs → same bytes).

---

## Phase 10: Live Preview Runtime & Engine Adapters
**Goal:** The stage *runs* the chosen engines, and the timeline playhead seeks them. What you see is what you export.
**Closes:** AUD-09 · **Depends on:** 8, 9
> **v2.1 amendment:** Also depends on 45 and 48. Adapters are driven by the Phase 45 frame scheduler (not their own rAF loops) and write through the Phase 48 `LayerNodeRegistry` (not `postMessage`).

### Sub-Phase 10.1: Adapter Interface
- [ ] `EngineAdapter { mount(layer, el), play(), pause(), seek(t), setInputs(inputs), dispose() }` plus capabilities (`canSeek`, `canReverse`, `supportsPaths`).
- [ ] Adapters: `WaapiAdapter` (CSS/WAAPI), `MotionAdapter`, `GsapAdapter` (behind the licensing flag, Phase 14), `SvgAdapter`, `ThreeAdapter` (Phase 18), `ShaderAdapter` (Phase 19), and a `KernelAdapter` that applies `evaluate()` directly (used for scrubbing and as the universal fallback).

### Sub-Phase 10.2: Scrub vs Play Semantics
- [ ] While scrubbing, all layers are driven by `KernelAdapter` (exact and deterministic). On play, each layer hands over to its routed engine adapter at the current `t` with matching velocity.
- [ ] Reactive layers scrub against a **virtual pointer path** recorded or authored in the Playground (Phase 24), so pointer effects can be timeline-previewed.

### Sub-Phase 10.3: Parity Check In-Editor
- [ ] Dev overlay: sample the running engine vs `evaluate()` every N frames and show drift. Parity drift beyond tolerance raises `[PARITY_DRIFT]`.

**Reuse:** `EngineAdapters.ts` and `MultiEngineAnimationRuntime.ts` (their code-gen parts move to the exporters in Phase 27).
**Verification Gate:** Playwright: for 10 reference animations, a paused seek to 5 sampled times produces identical screenshots from the kernel and from the running engine (≤ 0.5% pixel diff).

---

## Phase 11: States, Transitions & State Machine
**Goal:** Figma Smart-Animate style state design, plus Rive-style interactive logic for complex elements (toggles, multi-step buttons).
**Closes:** AUD-14 (preview half) · **Depends on:** 10

### Sub-Phase 11.1: States
- [ ] Built-in states per archetype from the registry (idle, hover, pressed, focus, disabled, inView, loading …) plus custom states.
- [ ] Editing a state = selecting it and changing props on the stage. The diff from the base is stored.

### Sub-Phase 11.2: Transitions
- [ ] Auto-transition between any two states: a spring (default for interactive) or a tween, with per-property overrides and interruption that keeps velocity.

### Sub-Phase 11.3: State Machine (Pro)
- [ ] Inputs (boolean, number, trigger), transitions with conditions, blend by a number input (a 1D blend: e.g. idle → hover intensity by pointer proximity).
- [ ] Visual state graph editor (small, uses the existing node canvas components).

### Sub-Phase 11.4: Reduced Motion in Preview
- [ ] The Playground has a reduced-motion toggle that uses each animation's reduced variant (defined in Phase 29; defaults come from spec §9).

**Verification Gate:** Playwright: a toggle built with 2 states and a spring transition. Rapidly clicking it 10 times never snaps (velocity continuity checked by sampled positions). Reduced mode produces opacity-only transitions.

---

## Phase 12: Pointer, Physics & Reactive Behaviours
**Goal:** The continuous, reactive motion behind most premium effects (magnet, tilt, spotlight, trails).
**Depends on:** 10

### Sub-Phase 12.1: Input System
- [ ] Normalised inputs per layer: pointer local/global position, velocity, distance, angle, in-bounds; scroll progress; visibility ratio; device tilt (where permitted); time.
- [ ] Input mappers: input → curve → property, with clamp, smoothing (spring or lerp) and dead zones.

### Sub-Phase 12.2: Behaviour Implementations
- [ ] `magnet`, `tilt` (3D perspective), `followPointer` (with lag), `proximity` (scale/opacity by distance), `inertia` (drag with momentum and bounds), `noise`/`wander`, `loop`, `spotlight` (a radial gradient following the pointer).
- [ ] A small **rigid-body mode** for falling or bouncing items (to power "falling text" and "ball pit" type effects). Evaluate a tiny physics library vs a custom integrator and record the decision.

### Sub-Phase 12.3: Virtual Pointer Authoring
- [ ] Record a pointer path in the Playground, or draw one. It becomes an input track, so reactive effects can be scrubbed, compared and exported as demo loops.

**Verification Gate:** 8 behaviours each have a Playwright test that drives a scripted pointer and asserts the resolved props at checkpoints. 60 fps holds with 50 reactive layers (browser measurement, Phase 26 harness).

---

## Phase 13: Scroll Engine
**Goal:** First-class scroll-triggered and scroll-linked motion with a native-first strategy.
**Depends on:** 10

### Sub-Phase 13.1: Scroll Model
- [ ] Scroll triggers (enter, leave, enter-back, leave-back) and scroll-linked progress ranges (start/end offsets, scrub smoothing, pin).
- [ ] View-progress per layer (like CSS `view()` timelines).

### Sub-Phase 13.2: Runtime Strategy
- [ ] Use CSS scroll-driven animations (`animation-timeline: scroll()/view()`) where supported and the animation is CSS-expressible. Otherwise use an IntersectionObserver + rAF progress driver. GSAP ScrollTrigger is used only when routed and license-cleared.
- [ ] Feature detection at runtime and at export (with fallback code emitted).

### Sub-Phase 13.3: Scroll Simulator
- [ ] The Playground gets a scroll page wrapper with an adjustable content height and a scroll scrubber. Scroll progress becomes an input track for timeline preview (reuse `ScrollTriggerBar.tsx` visuals).

**Verification Gate:** The parallax image, scroll-reveal text and pinned sequence reference animations match `evaluate()` at 5 scroll positions in Chromium, WebKit and Firefox, on both the native path and the fallback path.

---

# TRACK C — ENGINES (Make Every Engine Real)

---

## Phase 14: GSAP Integration (License-Gated)
**Goal:** GSAP as a real preview engine and export target, legally cleared.
**Closes:** AUD-09 (GSAP half), AUD-28 · **Depends on:** 10, 6

### Sub-Phase 14.1: License Gate
- [ ] Send the licensing inquiry (spec §11.3 draft). Record the answer in `LICENSES.md`.
- [ ] **If not cleared for in-editor use:** GSAP stays **export-only**. The preview uses WAAPI/Motion/Kernel adapters, and parity tests guarantee the same visual result.

### Sub-Phase 14.2: Adapter (if cleared) & Mapping
- [ ] `GsapAdapter`: MDM clip → `gsap.timeline()`, with seek, stagger mapping, ease mapping (Phase 9 converters) and the ScrollTrigger mapping.
- [ ] Plugin coverage: SplitText (text effects), MorphSVG / DrawSVG equivalents (compare with the native SVG adapter), Flip (layout), MotionPath.

### Sub-Phase 14.3: Export
- [ ] `useGSAP()` hook export with scoped selectors, cleanup and plugin registration.

**Verification Gate:** 10 GSAP-routed reference animations pass the export parity suite (Phase 4). The license decision is recorded.

---

## Phase 15: Motion (Framer Motion) Integration
**Goal:** Springs, gestures, variants and layout animation through the `motion` package.
**Closes:** AUD-10 · **Depends on:** 10, 5

### Sub-Phase 15.1: Adapter
- [ ] `MotionAdapter` using `motion/react` components and the imperative `animate()` API for seeking.
- [ ] Map MDM states → variants, transitions → spring/tween configs, and triggers → `whileHover`/`whileTap`/`whileInView`/`whileDrag`.

### Sub-Phase 15.2: Layout & Presence
- [ ] Layout animations (`layout`, `layoutId`) for component effects (dock magnification, stacked cards, animated lists). AnimatePresence for enter/exit.

### Sub-Phase 15.3: Export
- [ ] Idiomatic `motion/react` components with typed variants. No imports from LazyLayout.

**Verification Gate:** Spring-heavy reference effects (magnet button, dock, stacked cards, toggle) pass export parity, and interrupting a gesture preserves velocity in the preview and in the export.

---

## Phase 16: SVG Animation Studio
**Goal:** Professional vector animation: edit paths, morph, draw strokes, follow paths.
**Depends on:** 10

### Sub-Phase 16.1: Vector Editing
- [ ] Path node editing (move nodes, bezier handles, add/remove nodes, close path), boolean operations for simple shapes, SVG import with sanitisation (strip scripts and external references).

### Sub-Phase 16.2: Morph
- [ ] Morph between paths with automatic point matching (reuse `PathMorphSolver`) plus manual start-point and direction correction. Morph via the kernel, the WAAPI `d` property where supported, or GSAP MorphSVG if routed.

### Sub-Phase 16.3: Stroke Draw & Motion Path
- [ ] Stroke draw (dasharray/dashoffset) per path, with direction and multiple-subpath staggering.
- [ ] Motion path: any path can drive a layer's position, with auto-rotate and offset (reuse the arc-length sampler for constant speed).

### Sub-Phase 16.4: Filters, Gradients, Masks
- [ ] Animatable filters (blur, displacement, turbulence, colour matrix), gradients (stops/angle) and masks/clip paths (reuse `SvgFilterGradientEngine`). Performance class per filter.

**Verification Gate:** The logo stroke-draw, icon morph (menu ↔ close) and motion-path orbit reference animations pass parity. An imported third-party SVG with 500 nodes stays editable at 60 fps.

---

## Phase 17: Typography & Text Motion Engine
**Goal:** The text effects that dominate premium motion libraries, done accessibly.
**Depends on:** 10

### Sub-Phase 17.1: Accessible Splitting
- [ ] Split by character, word and line (line detection re-runs on resize). The container keeps an `aria-label` with the full text and the split pieces are `aria-hidden`.
- [ ] Grapheme-aware splitting (emoji, combining marks) with `Intl.Segmenter`.

### Sub-Phase 17.2: Text Effect Primitives
- [ ] Per-piece tracks with staggers; blur/opacity/offset reveals; scramble/decrypt (a character-set interpolator); typewriter with caret; rotating words; count-up (number formatting via `Intl.NumberFormat`); gradient/sheen (background-clip text); variable-font axis animation (weight/width by proximity).

### Sub-Phase 17.3: Fonts
- [ ] Font picker (Google Fonts + local upload), `font-display` handling, and animation starts only after fonts load (prevents layout jump in splits).

**Verification Gate:** Screen-reader test (Playwright accessibility tree): every text effect exposes the full, correct string once. Split, scramble and count-up match `evaluate()` in all three browsers.

---

## Phase 18: Three.js / React-Three-Fiber Engine
**Goal:** Real WebGL 3D layers inside the 2D document.
**Closes:** AUD-11 · **Depends on:** 10, 5

### Sub-Phase 18.1: Viewport
- [ ] R3F canvas per `scene3d` layer, sized to the layer box. Orbit controls in edit mode, a locked camera in play mode, context-loss recovery, and a shared renderer where possible to limit contexts.

### Sub-Phase 18.2: Scene Content
- [ ] Primitives (box, sphere, torus, plane, text3D), GLTF/GLB import (reuse the `GLTFAssetPipeline` parser for validation and thumbnails), PBR materials (reuse `MaterialInspectorSection`), lights, environment maps.

### Sub-Phase 18.3: 3D Motion
- [ ] Tracks for position, rotation (quaternion) and scale, camera paths (reuse `Scene3DAnimationEngine`), and pointer behaviours mapped into 3D (tilt, parallax, look-at).

### Sub-Phase 18.4: Export
- [ ] R3F component export (reuse `ThreeSceneEmitter`), plus a lazy-loading wrapper and a static poster fallback for no-WebGL.

**Verification Gate:** The floating object, 3D card flip and GLTF spin reference effects render in the real WebGL viewport and the exported build (parity ≤ 2%, since GPU variance is allowed). The context-loss test recovers.

---

## Phase 19: Shader & Canvas Effects Engine
**Goal:** GPU backgrounds and particle effects (aurora, silk, waves, plasma, particles, noise), editable through props.
**Depends on:** 10

### Sub-Phase 19.1: Shader Layer
- [ ] A `shader` layer kind: a fragment shader + uniform schema (typed props) on a full-layer quad (lightweight WebGL, no Three.js required).
- [ ] Uniforms can be bound to time, pointer, scroll, props and timeline tracks.
- [ ] A shader editor (Pro): GLSL with compile errors surfaced as diagnostics, and hot reload.

### Sub-Phase 19.2: Canvas 2D Particles
- [ ] A particle system (emitters, forces, lifetimes, pointer interaction) for trails, sparks and dot grids, with an object pool and a DPR-aware canvas.

### Sub-Phase 19.3: Fallbacks & Budgets
- [ ] Automatic fallback: WebGL → Canvas 2D → static CSS gradient. Each shader declares a cost tier. Resolution scaling when frame time exceeds the budget.

**Verification Gate:** Five shader backgrounds and three particle effects hold ≥ 55 fps at 1920×1080 on the reference laptop (Phase 26 harness), fall back correctly when WebGL is disabled, and export as self-contained components.

---

# TRACK D — STUDIO (The Figma-Grade Editing Experience)

---

## Phase 20: Figma-Grade Stage & Canvas
**Goal:** Direct manipulation that feels like Figma: select, move, resize, rotate, snap, align. This is the foundation for drawing (Track G).
**Closes:** AUD-19 (selection half), AUD-20 (Tier 1) · **Depends on:** 2, 8
> **v2.1 amendment:** Also depends on 42, 43 and 49. Handles, guides and marquee draw on the Phase 49 overlay; tools are Phase 43 state machines; a manipulation edits `frame` (42.3) inside one Phase 41 transaction. 20.3's "one artboard" rule is superseded by multi-frame canvases (49.2).

### Sub-Phase 20.1: Selection & Transform
- [ ] Click, shift-click and marquee selection. Transform handles for move, resize (with aspect lock) and rotate (15° snap with Shift), plus a transform origin handle. All of this writes MDM patches (one undo step per gesture).

### Sub-Phase 20.2: Snapping & Guides
- [ ] World Environment Tier 1 (`action working.md` properties 1–12, 14–23, 27–30): pan/zoom settings, grid styles, snap to grid, smart guides to edges and centres, distance HUD, equal-spacing detection.

### Sub-Phase 20.3: Artboard & Devices
- [ ] One artboard per document, with device presets and a custom size. The backdrop can be light, dark or checkerboard.

### Sub-Phase 20.4: Keyboard & Tools
- [ ] V (select), H (pan), P (pen), B (pencil), O (ellipse), R (rectangle), L (line), T (text), plus arrow-key nudge. The dock tools are finally wired (AUD-19); pen and pencil are completed in Phase 35.

**Reuse:** `WhiteboardCanvas.tsx` pan/zoom, `CanvasOverlay.tsx`, `ZoomControls.tsx`.
**Verification Gate:** A Playwright script performs 30 Figma-standard manipulations (with snaps and guides) and verifies the resulting geometry exactly. The whole run produces 30 undo steps.

---

## Phase 21: Layers Panel
**Goal:** A clear, Figma-like layer tree that also shows motion.
**Depends on:** 20

- [ ] **21.1** Tree with drag reordering and reparenting (validated by `rules.canAdd`), groups, masks, lock and hide, rename in place, multi-select synced with the stage.
- [ ] **21.2** Motion badges per layer (clip count, state count, behaviour icons, engine icon). Clicking a badge opens that item in the Timeline or the Playground.
- [ ] **21.3** Effect instances appear as a single collapsible layer with a "props" affordance. Their internal layers are read-only unless the effect is detached.

**Reuse:** `OutlinerTree.tsx`, `TreeNode.tsx`, `ElementOutliner.tsx`.
**Verification Gate:** Reparenting an illegal child is refused with the reason shown. 500-layer documents scroll at 60 fps (virtualised list).

---

## Phase 22: Properties Panel — Simple / Pro
**Goal:** Replace the dense Unreal-style inspector with progressive disclosure.
**Closes:** AUD-20 (Tier 2), AUD-21 (panel half) · **Depends on:** 20
> **v2.1 amendment:** The panel is the **Design** tab of the Phase 44 inspector (Design · Motion · Code). The Simple Motion card and state editing live in the **Motion** tab. Per-breakpoint overrides (50.3) show here.

### Sub-Phase 22.1: Simple Face
- [ ] At most 7 controls per selection: position/size, fill, radius, text (if any), and **one Motion card** (current motion + Intensity + Speed + "Change motion…").
- [ ] Plain-language labels only ("Bounciness", not "damping ratio").

### Sub-Phase 22.2: Pro Face
- [ ] The archetype sections from the registry (reuse the v1.1 section components: Appearance, Typography, Media, Divider, Background, SVG, Material). Numeric scrubbing, token binding, engine override.

### Sub-Phase 22.3: Tokens
- [ ] World Environment Tier 2 (properties 34–40): palette, radius, font, elevation and default interactive feedback. Elements inherit tokens; overrides are shown clearly.

### Sub-Phase 22.4: Effect Props
- [ ] An effect instance's props schema renders automatically as controls (slider, colour, select, toggle, curve) with its descriptions as tooltips.

**Verification Gate:** Usability test script (5 people, recorded): each person completes "make this button bouncier and slower" in Simple mode in under 30 seconds without help. The Pro face exposes every registry property (an automated coverage test).

---

## Phase 23: Timeline 2.0 & Graph Editor
**Goal:** Sequencer-grade precision without the clutter.
**Depends on:** 9, 21
> **v2.1 amendment:** Also depends on 52. The timeline structure (23.1) moves to Phase 52, which builds the After Effects workspace. Phase 23 keeps keyframing (23.2), the graph editor (23.3) and input tracks (23.4), built inside that workspace. Spatial vs temporal interpolation comes from 53.1.

### Sub-Phase 23.1: Timeline Structure
- [ ] Rows per layer → clips → tracks (collapsible). Clips can be moved, trimmed and duplicated; stagger groups are shown as fanned clips.

### Sub-Phase 23.2: Keyframing
- [ ] **Auto-key record mode:** change any property on stage at the playhead to create or update a keyframe.
- [ ] Multi-select keyframes, box select, align, distribute, scale time, and copy/paste across layers.

### Sub-Phase 23.3: Graph Editor
- [ ] Value/time curves with bezier handles and spring previews (reuse `CurveEditor.tsx`, `SpringEditor.tsx`), per-keyframe easing, and an easing presets strip.

### Sub-Phase 23.4: Inputs as Tracks
- [ ] Virtual pointer and scroll input tracks (Phases 12–13) are shown and editable in the timeline.

**Reuse:** `MotionSequencer.tsx`, `KeyframeTrack.tsx`, `PlayheadControls.tsx` (after the Phase 2/3 fixes).
**Verification Gate:** Record 3 property changes in auto-key → 3 keyframes exist, play matches `evaluate()`, and undo removes them. A 100-track timeline scrubs at 60 fps.

---

## Phase 24: Animation Playground
**Goal:** A focused place to play with, test and tune an animation, like a Storybook for motion.
**Closes:** AUD-20 (Tiers 3–4) · **Depends on:** 10–13
> **v2.1 amendment:** Time controls (24.2) are Phase 45 transport controls. The Playground can link to studio time or run its own isolated transport instance.

- [ ] **24.0** *(moved from Phase 3.1, AUD-05 regression)* A keyframe added in the Sequencer appears in the Playground, and undo removes it there too.
- [ ] **24.1** Full-screen isolated preview with a **props panel** (effect props and element props as live knobs), state buttons, and trigger buttons (replay mount, simulate hover or press).
- [ ] **24.2** Time controls: global time scale (0.1×–2×), loop, and frame step. This is World Environment Tier 3 (properties 41–47: time scale, default curve, spring defaults, reduced-motion policy, frame snapping).
- [ ] **24.3** Environment: device frames, backdrop, reduced-motion toggle, and overlays (World Environment Tier 4, properties 48–52: bounding wireframes, box model, dimensions HUD, archetype badges, touch-target guide).
- [ ] **24.4** Pointer recording (Phase 12.3) and the scroll simulator (Phase 13.3) live here.
- [ ] **24.5** An FPS and frame-time meter plus "Compare with export" (runs the Phase 27 export in an iframe side by side).

**Verification Gate:** Every Effects Library item (Phase 25) opens in the Playground with working props, triggers, slow motion and reduced-motion preview (an automated sweep over the library).

---

## Phase 25: Effects Library — "LazyLayout Bits"
**Goal:** A curated, React Bits-grade library of parametric effects, the fastest path to a premium result.
**Depends on:** 14–19, 24

### Sub-Phase 25.1: Library Infrastructure
- [ ] Effect registry with versioning, categories (PRD §5.2), tags, search, live thumbnails (a looping preview rendered from the Playground scene), and an "insert" action that creates an effect instance.
- [ ] **Detach**: convert an effect instance into plain layers and clips for full manual editing.

### Sub-Phase 25.2: Seed Migration
- [ ] Convert the 51 v1.1 presets (`src/core/motion/presets/`) into MDM clips/effects. Drop any that duplicate a new effect.

### Sub-Phase 25.3: Effect Production (≥ 40 at launch)
Build these in waves. Each effect satisfies the PRD §5.3 contract and passes Playground, parity and performance gates:
- [ ] **Wave 1 — Text (10):** split reveal, blur-in, shiny text, gradient flow, decrypt, typewriter, rotating words, count-up, scroll-reveal text, variable proximity.
- [ ] **Wave 2 — Interaction (8):** magnet, click spark, glare hover, tilt card, spotlight card, cursor trail, electric/star border, ripple.
- [ ] **Wave 3 — SVG (6):** stroke draw logo, morph icon set, motion-path orbit, gooey blob, animated icon pack (menu/close, play/pause, check), line-art reveal.
- [ ] **Wave 4 — Components (6):** dock magnification, stacked/bounce cards, animated list, infinite/flowing menu, elastic slider, circular gallery.
- [ ] **Wave 5 — Backgrounds (7):** aurora, silk, waves, dot grid, particles, grain/noise, light rays.
- [ ] **Wave 6 — 3D (4):** floating object, 3D card flip, GLTF spin showcase, depth-parallax scene.

### Sub-Phase 25.4: Provenance & Licensing
- [ ] Each effect records its inspiration source and confirms it is an original implementation (the Licensing Gate Law). No third-party effect code is copied.

**Verification Gate:** 41+ effects are listed. For each: the Playground sweep passes, export parity passes (Phase 27), the performance budget passes (Phase 26), and the reduced variant exists. A new user inserts and customises one effect from each category in under 5 minutes (usability script).

---

## Phase 26: Motion Performance Lab
**Goal:** Measured, enforced smoothness, replacing the Node-timed "60 FPS guarantee".
**Closes:** AUD-13 · **Depends on:** 10, 4

- [ ] **26.1** Browser benchmark harness (Playwright + Chrome DevTools Protocol tracing): real frame times, dropped frames, long tasks, layout/paint counts, GPU memory estimate. A reference device profile is recorded.
- [ ] **26.2** Per-animation performance class from the rules (Phase 8) verified against traces: GPU-only animations must show no layout during play.
- [ ] **26.3** Auto-fixes (reuse `MotionDiagnostics.ts`): `left/top` → `transform`, heavy blur → pre-blurred layer, path simplification, `will-change` hints, resolution scaling for shaders.
- [ ] **26.4** Regression gate in CI: every library effect has a budget (e.g. p95 frame time < 12 ms). Exceeding it fails the build.

**Verification Gate:** The whole library meets its budgets in CI. A deliberately layout-thrashing test animation is flagged, and the auto-fix brings it within budget.

---

# TRACK E — EXPORT (Honest, Verified Output)

---

## Phase 27: Verified Export Pipeline (React / Next / Vite)
**Goal:** The PRD §10 export promise, proven by builds and pixels.
**Closes:** AUD-15, AUD-16 · **Depends on:** 4, 10–19
> **v2.1 amendment:** React output is generated from the Phase 48 render definitions (One Renderer Law), so the stage and the export render the same components. Responsive output (50.5) and compositing output (51) join the export matrix when those phases land.

### Sub-Phase 27.1: Export Architecture
- [ ] Exporters consume **MDM + routing decisions** (not UI state). The per-engine code generators move here from the runtime (`MultiEngineAnimationRuntime` code-gen, `GSAPAnimationEmitter`, the React emitters).
- [ ] The export target (framework, styling, TS/JS) is chosen **at export time** (PRD §1.3), with defaults remembered per user.

### Sub-Phase 27.2: React Output
- [ ] Next 16 App Router (`"use client"` where needed, `next/image` for images) and Vite React. Tailwind or CSS Modules. TypeScript or JavaScript.
- [ ] Effects export as components with typed props and defaults (PRD §5.3). Elements export as semantic components (reuse the archetype-aware emitters).
- [ ] Generated `README.md` with exact install commands, only for the engines actually used.

### Sub-Phase 27.3: Quality
- [ ] Output formatted with Prettier. No `any`. No unused imports. Passes the fixture app's ESLint config.

### Sub-Phase 27.4: Gate Integration
- [ ] *(moved from Phase 3.1, AUD-05 regression; AUD-40)* The Code view emits the document's clips: a keyframe added in the Sequencer appears in the Code view, and undo removes it there too. Export Preview shows the real export, not per-archetype sample code.
- [ ] Every library effect × {Next, Vite} × {Tailwind, CSS Modules} goes through the Phase 4 harness: `tsc`, `build`, pixel parity at 5 times.

**Verification Gate:** The full export matrix is green in nightly CI, and the PRD §11 criterion 5 is met.

---

## Phase 28: Additional Targets & Component Registry
**Goal:** Reach beyond React, and make effects installable like shadcn/React Bits components.
**Depends on:** 27

- [ ] **28.1** Vue 3 SFC (reuse `VueComponentEmitter`), vanilla HTML/CSS/JS as a **Web Component** (reuse `VanillaHtmlEmitter`), and **CSS-only** export when the rules say the animation is CSS-expressible.
- [ ] **28.2** Registry export: shadcn-compatible registry JSON per effect. Hosted registry endpoint (a static JSON route) so `npx shadcn add <url>` style installs work. Copy-as-snippet.
- [ ] **28.3** Download ZIP (reuse `ZipPacker.ts`) and "Open in StackBlitz/CodeSandbox" links.

**Verification Gate:** Vue, Web Component and CSS-only targets pass the build + parity harness for all applicable effects. Installing an effect through the registry command into a fresh Next app builds and renders.

---

## Phase 29: Accessibility & Reduced Motion
**Goal:** Every animation is safe and inclusive, in the editor and in exports.
**Closes:** AUD-14 · **Depends on:** 17, 27

- [ ] **29.1** Each animation carries a reduced-motion variant (auto-generated per spec §9: strip translate/scale/rotate and keep opacity/colour; stop loops; disable scroll scrub), editable in Pro.
- [ ] **29.2** Exports include `prefers-reduced-motion` handling for every engine (CSS media query, Motion `useReducedMotion`, `gsap.matchMedia`, shader pause).
- [ ] **29.3** Rules: flashing limits, auto-play pause controls for loops longer than 5 s (WCAG 2.2.2), focus-visible preserved on interactive archetypes, touch targets ≥ 44 px.
- [ ] **29.4** Automated axe-core scan of every exported effect.

**Verification Gate:** axe reports 0 violations across the export matrix. The reduced-motion Playwright run shows no spatial movement for any library effect.

---

# TRACK F — AI (Base Built by AI, Refined With AI)

---

## Phase 30: LLM Integration Layer
**Goal:** A real, safe, schema-constrained connection to a large language model.
**Closes:** AUD-17, AUD-18 · **Depends on:** 2, 8

### Sub-Phase 30.1: Server Boundary
- [ ] A Next.js route handler (`src/app/api/ai/*`, per Next 16 docs) calls the Claude API through the official `@anthropic-ai/sdk`. The key lives in server environment variables; the browser never sees it.
- [ ] Rate limiting, a per-request budget, and request/response logging with redaction.

### Sub-Phase 30.2: Model & Features
- [ ] Default model `claude-opus-5`, configured in one constant (`src/ai/llm/config.ts`) so it can be changed later without code edits.
- [ ] **Schema-constrained output:** the MDM JSON Schema from Phase 2.1 is used as strict tool input schemas (`strict: true`) and/or structured outputs (`output_config.format`). Edits are expressed as **MDM patches**, never as free-form code.
- [ ] **Streaming** responses, so partial results can render as ghosts.
- [ ] **Prompt caching:** the large, stable prefix (rules summary, schema, effect catalogue with props descriptions) comes first and is cached. Volatile content (selection, user prompt) goes after the cache breakpoint.
- [ ] **Vision:** canvas snapshots and reference images as image inputs.
- [ ] Handle `stop_reason` values, including refusals, gracefully in the UI.

### Sub-Phase 30.3: Validation Loop
- [ ] Every model output → schema validation → `rules.validate` → at most one automatic repair turn with the diagnostics fed back → otherwise reject with an explanation.

### Sub-Phase 30.4: Offline Fallback
- [ ] The v1.1 deterministic parsers (`IntentParser`, `MotionAiEngine`, `ComponentGenerator`) become the **offline provider** behind the same interface, and a test oracle for simple prompts. `ConstrainedDecoder.ts` is removed (the API's schema constraints replace it).

**Verification Gate:** 50 scripted prompts: ≥ 95% produce schema-valid, rule-valid patches (at most one repair). No API key appears in client bundles (a build-time scan). Cache hits show on repeated requests (`cache_read_input_tokens > 0`).

---

## Phase 31: AI Builder — Prompt → Motion Document
**Goal:** "Describe it" produces a complete, editable first version.
**Depends on:** 30, 25

- [ ] **31.1** Planner step: the model first chooses layers, library effects (preferred over from-scratch motion when they fit) and motion intent. Then a builder step emits patches.
- [ ] **31.2** Streaming **ghost diff** on stage and timeline (reuse the `DiffPreview.tsx` pattern). Accept all, accept per layer, or discard.
- [ ] **31.3** Follow-up turns keep conversational context scoped to the document ("now make the title shimmer").
- [ ] **31.4** Each AI result includes a one-paragraph plain-language summary and the engine choices it made (from `rules.route`).

**Verification Gate:** PRD §11 criterion 1: a first-time user gets an accepted animation from a one-sentence prompt within 20 s (measured over the Phase 33 eval prompts at p90).

---

## Phase 32: AI Co-pilot — Edit, Explain, Fix
**Goal:** An always-available assistant that understands the current selection.
**Depends on:** 31

- [ ] **32.1** Selection-scoped edits: "bouncier", "slower on exit", "stagger from the centre", "match the brand colours". The output is a patch limited to the selection (enforced).
- [ ] **32.2** Explain: a description of the selected animation, the reason for its engine route, and its performance class.
- [ ] **32.3** Fixer: turns rule and performance diagnostics into one-click proposals (combined with the Phase 26 auto-fixes).
- [ ] **32.4** Inline entry points: a prompt bar, right-click → "Ask AI", and the Simple-mode Motion card → "Describe instead".

**Verification Gate:** In the eval set, selection-scoped edits never modify unselected layers (100%). Explanations are rated accurate by a reviewer on ≥ 90% of 30 samples.

---

## Phase 33: AI Quality — Evals & Visual Self-Check
**Goal:** Measure and improve the AI instead of guessing.
**Depends on:** 31, 4

- [ ] **33.1** An eval set of ≥ 150 prompts across the categories (text, interaction, SVG, components, backgrounds, 3D, edits, fixes, sketches), each with graded expectations.
- [ ] **33.2** Visual self-check: render the proposed result at sampled times (Phase 4 harness) and check it against the intent (a second model call with the images, used as a grader in evals and optionally at runtime for complex builds).
- [ ] **33.3** A dashboard: validity rate, repair rate, acceptance rate (from real usage, opt-in), latency, cost per task.
- [ ] **33.4** Prompt and catalogue iteration loop driven by eval results, with regression thresholds in CI (run on demand, because it costs money).

**Verification Gate:** The eval baseline is recorded. The PRD §13 targets are tracked (≥ 95% validity, ≥ 60% acceptance). Any prompt change that drops validity by more than 2 points is blocked.

---

## Phase 34: AI From References
**Goal:** "Make it move like this" from an image, GIF, short video or URL screenshot.
**Depends on:** 31

- [ ] **34.1** Image reference → layout and style extraction (colours, type, shapes) into layers.
- [ ] **34.2** GIF/video reference → sampled frames (client-side extraction) → motion description → closest library effects + parameter guess.
- [ ] **34.3** The user supplies a screenshot of a page they are allowed to use, and the AI proposes a matching motion treatment. It never scrapes third-party sites automatically.

**Verification Gate:** 20 reference clips of common effects (fade up, stagger, magnet, marquee …) map to the correct effect category in ≥ 80% of cases.

---

# TRACK G — SIMPLE DESIGN (Draw It, and It Becomes Motion)

> This track makes design easy: you draw roughly, LazyLayout cleans it up, and your drawing can *become* the animation.

---

## Phase 35: Drawing Tools Foundation
**Goal:** High-quality pen and pencil input that produces clean, editable vectors.
**Closes:** AUD-19 · **Depends on:** 20
> **v2.1 amendment:** The pen and pencil are Phase 43 tools and draw their live stroke on the Phase 49 overlay, not in React state.

- [ ] **35.1** Stroke capture with Pointer Events (`getCoalescedEvents` for high-rate input, pressure and tilt when available), timestamps kept per point (needed for draw-speed timing in Phase 37).
- [ ] **35.2** Smoothing: a streamline/lag filter while drawing, then Ramer–Douglas–Peucker simplification and bezier curve fitting (Schneider's algorithm) to produce a compact SVG path.
- [ ] **35.3** Pencil (freehand, variable width optional) and Pen (click-to-place bezier nodes, Figma-style). Both output `vector` layers in MDM.
- [ ] **35.4** Stroke styles: width, colour, cap, join, dash. Fill for closed paths.

**Verification Gate:** Drawing at 120 Hz input holds 60 fps rendering. A 3-second scribble becomes a path with fewer than 60 nodes that stays within 1.5 px of the input (automated geometric test over recorded fixtures).

---

## Phase 36: Shape Recognition & Beautification
**Goal:** Draw an oval and get a perfect ellipse. Draw a wobbly line and get a straight line. Instantly, locally, with an undo-style choice.
**Depends on:** 35

### Sub-Phase 36.1: Recognisers (local, < 50 ms)
- [ ] **Line:** total-least-squares fit plus a straightness ratio (endpoint distance / path length).
- [ ] **Ellipse / circle:** algebraic least-squares ellipse fit (Fitzgibbon method) plus closure test and residual threshold. Snap to a circle when the axis ratio is > 0.9.
- [ ] **Polygon (triangle / rectangle / pentagon …):** corner detection (curvature peaks / ShortStraw), vertex count, then right-angle and equal-side snapping (rectangle → square with Shift-like tolerance).
- [ ] **Arc, arrow, star, heart, check, cross:** template matching with a $P point-cloud recogniser trained on bundled templates.
- [ ] **Confidence scoring** for every recogniser. Below the threshold, keep the smoothed freehand path.

### Sub-Phase 36.2: Interaction
- [ ] **Hold-to-snap:** when the user pauses at the end of a stroke (~400 ms, as in several drawing apps), the recognised shape morphs in. A small toast offers "Keep as drawn".
- [ ] Recognised shapes become proper parametric layers (an ellipse layer with rx/ry, a rectangle with a radius), not just paths, so they stay easy to edit.
- [ ] Settings: recognition on/off, sensitivity.

### Sub-Phase 36.3: Multi-stroke & Context
- [ ] Combine strokes drawn within a short time window (e.g. an arrow drawn as a shaft plus a head).
- [ ] Snap recognised shapes to smart guides and existing elements (Phase 20).

**Verification Gate:** A labelled fixture set of ≥ 300 hand-drawn strokes (collected from several people, mouse and pen). Recognition accuracy is ≥ 92% for line/ellipse/rectangle/triangle and ≥ 85% for the template shapes, with a false positive rate on intentional freehand of ≤ 5%. p95 latency < 50 ms.

---

## Phase 37: Draw-to-Animate Gestures
**Goal:** The drawing itself becomes the motion.
**Depends on:** 36, 16

### Sub-Phase 37.1: Stroke → Draw Animation
- [ ] "Animate drawing": any vector path gets a stroke-draw clip whose **timing follows how it was drawn** (the per-point timestamps from Phase 35.1, normalised and eased), with a speed multiplier.
- [ ] A multi-stroke drawing plays in drawing order (like a signature or handwriting reveal).

### Sub-Phase 37.2: Line From an Element → Motion Path
- [ ] Starting a stroke on a selected element (with the Motion Path tool, or with Alt held while drawing) creates a motion path. The element follows it at constant speed (the arc-length sampler), with auto-rotate optional and the ease editable.

### Sub-Phase 37.3: Gesture Vocabulary
- [ ] A circle drawn around an element → rotation/orbit clip.
- [ ] A short upward flick on an element → "fade up" entrance.
- [ ] A zig-zag over an element → shake/attention clip. In select mode the same gesture is a delete gesture (with undo).
- [ ] A spiral → scale-in with rotation.
- [ ] The gesture vocabulary is data-driven (a mapping table), discoverable (a cheat sheet), and every result is a normal clip that can be edited in the timeline.

### Sub-Phase 37.4: Draw-to-Morph
- [ ] Draw shape A, then shape B, select both → "Morph A → B" creates a morph clip (point matching from Phase 16).

**Verification Gate:** PRD §11 criterion 2 passes as a Playwright script driving recorded pointer strokes: oval → ellipse; line from it → motion path; play → the ellipse follows the path; a freehand logo → a stroke-draw animation whose duration is within 10% of the drawing time × speed.

---

## Phase 38: Sketch-to-Element with AI
**Goal:** A rough UI sketch turns into real, animated elements.
**Depends on:** 36, 31

- [ ] **38.1** The user sketches boxes, scribbled text lines and circles on a "Sketch" layer. Local recognition (Phase 36) gives the geometry; the AI (vision + stroke geometry as JSON) interprets **intent**: button, card, image placeholder, heading, toggle.
- [ ] **38.2** The result is a ghost diff of real archetype layers with sensible default motion (from the library). The sketch layer is kept, hidden, for reference.
- [ ] **38.3** Handwriting inside boxes becomes the label text (the vision model reads it), and the user confirms it before it is applied.

**Verification Gate:** 30 sketch fixtures of simple UI elements: ≥ 80% interpreted to the correct archetype, and the text read correctly in ≥ 80% of legible cases.

---

## Phase 39: Simple Mode & Guided Flow
**Goal:** Someone who has never animated anything makes something beautiful in three steps.
**Closes:** AUD-21 · **Depends on:** 22, 25, 37

### Sub-Phase 39.1: New Start Screen
- [ ] Replaces the v1.1 launcher's "choose framework / styling / engine" steps with three big choices: **Describe it** (prompt), **Draw it** (canvas in draw mode), **Start from an effect** (library gallery). Tech choices move to export (PRD §1.3).

### Sub-Phase 39.2: Three-Step Flow
- [ ] **Step 1 Create** (prompt, draw or pick) → **Step 2 Make it move** (motion cards with live previews on *your* element: Fade up, Pop, Magnetic, Tilt, Draw, Shimmer, Float, Bounce …, each with Intensity and Speed) → **Step 3 Get code** (copy the React component, or download).
- [ ] A persistent "Open in Pro" switch at every step, without losing state.

### Sub-Phase 39.3: Onboarding
- [ ] An interactive first-run tour (≤ 60 s), starter templates, and empty-state hints ("Try drawing an oval").

### Sub-Phase 39.4: UI Weight Reduction
- [ ] In Simple mode, Pro-only panels and CSS are lazy-loaded. Target an initial editor bundle ≤ 60% of today's (measured). Split the `panels.css` monolith by panel.

**Verification Gate:** Usability test with 5 first-time users: each goes from blank to a copied, working animated component in < 3 minutes (median), with no facilitator help (PRD §13).

---

# TRACK S — STUDIO ARCHITECTURE (Figma / Wix Studio Viewport + After Effects Timeline)

> Added in v2.1 after the architecture review (§4.1). These phases build the layers between the document and the studio UI that v2.0 assumed but never scheduled: a real renderer, one clock, geometry, a composition time model, a command system and a workspace model. **Phase numbers are identifiers. Follow §5.1 for the order.** Several of these phases run *before* earlier-numbered ones (41 before 3, 48 before 10, 49 before 20, 52 before 23).

---

## Phase 41: Store Decomposition & Transaction API
**Goal:** The document gets a small, fast store with transactions, so any gesture commits as one change.
**Closes:** AUD-34 · **Depends on:** 2 · **Runs before:** 3

### Sub-Phase 41.1: Split the Project Store
- [ ] The document leaves `useProjectStore` (1,539 lines). `useDocumentStore` owns the `MotionDocument` directly and stays the only read/write API.
- [ ] The UI preferences, World Environment and project meta each get a small store. The After-track slices (blueprints, databases, pages, redirects, state variables) move under `src/after/**` behind the Phase 6 edition flag.

### Sub-Phase 41.2: Transactions
- [x] `documentCommands.begin(label)` returns `{ commit(), cancel() }`. While a gesture runs, updates apply as **transient patches**: the stage shows them, but they don't enter history or autosave. `commit()` squashes them into one patch set plus its inverse. `cancel()` (Esc) reverts exactly. *Shipped with Phase 3 (needed for gesture coalescing).* The typed commands issued inside the transaction are the updates, so there is no separate `update(recipe)`.
- [x] Every existing command runs through the same commit path: inside a transaction it is transient, outside it is a one-step entry.

### Sub-Phase 41.3: Fine-Grained Subscriptions
- [ ] Per-entity selectors (`useLayer(id)`, `useClip(id)`, `useComposition(id)`) re-render only when that entity changes (structural sharing from Immer).
- [ ] The patch stream (`subscribeToDocumentChanges`) is the only change signal for the renderer, autosave, AI diffs and the timeline. Remove the duplicate `EventBus.emit("document:changed")` consumers.

**Key files:** `src/core/store/useDocumentStore.ts`, `src/core/store/useProjectStore.ts`, new `src/core/store/transactions.ts`
**Verification Gate:** A React Profiler test shows that editing layer A re-renders **0** components bound only to layer B. A 2-second scripted drag produces exactly **1** history entry and **1** autosave write, and Esc mid-drag restores the document byte-for-byte. `useProjectStore.ts` is under 400 lines and no longer holds the document.

---

## Phase 42: Canonical Property Paths & Geometry Model
**Goal:** One name for every property (static, animated, state, exported), and explicit geometry on every visual layer.
**Closes:** AUD-31, AUD-32 · **Depends on:** 2 · **Runs before:** 7, 20, 48

### Sub-Phase 42.1: Property Registry
- [ ] `src/core/document/properties.ts`: for each canonical path (`frame.x`, `transform.y`, `fill.color`, `corner.radius`, `text.fontSize`, …) it declares the value type, unit, default, CSS mapping, compositing class (GPU / paint / layout), whether it is animatable, and the archetypes that have it.
- [ ] Static props, state snapshots, tracks, links and the inspector all address properties by these paths. The per-archetype prop validation left open in Phase 2 lands here.

### Sub-Phase 42.2: Migration to Schema v3
- [ ] An alias table (`transform.translateY → transform.y`, `backgroundColor → fill.color`, `borderRadius → corner.radius`, …) and a `v2 → v3` migration covering layer props, tracks, states and the 51 presets.
- [ ] Unknown paths are a validation error with the closest valid path suggested.

### Sub-Phase 42.3: Geometry
- [ ] Every visual layer has `frame { x, y, width, height, rotation }` in parent space, `sizing { horizontal, vertical: "fixed" | "hug" | "fill" }` and `positioning: "absolute" | "flow"` (flow means it sits inside an auto-layout parent, Phase 50).
- [ ] The artboard/frame is a layer with geometry, not a document-level special case, which prepares multi-frame canvases (Phase 49).

### Sub-Phase 42.4: Layout vs Motion Transform (Decision Record)
- [ ] `decisions/0003-geometry-vs-transform.md`: `frame` is **layout** (what Figma edits: moving a layer on the canvas changes `frame`). `transform.*` is **motion offset** (what the timeline animates, composed on top of `frame`, GPU-only). This keeps animation off layout properties by default, the web equivalent of AE's Position and Anchor. Animating `frame.*` is allowed only when the rules (Phase 8) accept the layout cost.

**Key files:** `src/core/document/properties.ts`, `src/core/document/schema.ts`, `src/core/document/migrations/v2-to-v3.ts`, `src/core/motion/presets/*`
**Verification Gate:** A test walks every preset, factory, fixture and emitter template and finds no property path outside the registry. 500 random v2 documents migrate to v3 and round-trip unchanged. A Playwright screenshot of the migrated demo project matches the pre-migration one. Scrubbing a preset that uses `translateY` now moves the layer (regression for §4.1 row 4).

---

## Phase 43: Command Bus, Tool State Machine & Keymap
**Goal:** Every action (shortcut, menu, palette, toolbar, AI) goes through one command registry, and canvas tools are explicit state machines.
**Depends on:** 41 · **Runs before:** 20, 35, 52

### Sub-Phase 43.1: Commands & Context Keys
- [ ] `src/core/commands/`: `defineCommand({ id, title, when, run })` plus context keys (`canvasFocus`, `timelineFocus`, `textEditing`, `selection.count`, `transport.playing`).
- [ ] A keymap with `when` clauses (like VS Code), so one key can mean different things in different places: **Space** is pan on the canvas and play in the timeline, **Delete** removes layers on the canvas and keyframes in the timeline.
- [ ] Merge `ShortcutRegistry.ts`, `CommandPalette.tsx`, `src/core/keybindings/` and the menu handlers onto this registry.

### Sub-Phase 43.2: Tool State Machine
- [ ] A tool is `{ id, cursor, onPointerDown/Move/Up, onKey, drawOverlay }` with pointer capture. Tools: select, direct-select, hand, frame, rectangle, ellipse, line, text, pen, pencil, motion-path.
- [ ] Spring-loaded tools: holding Space gives the hand tool and holding Cmd/Ctrl gives direct-select; releasing the key returns to the previous tool.

### Sub-Phase 43.3: Focus Model
- [ ] Exactly one focused region. Panels declare focus scopes; the command bus reads them. Text inputs always win.

**Key files:** new `src/core/commands/*`, `src/runtime/ShortcutRegistry.ts`, `src/editor/shell/CommandPalette.tsx`, `src/editor/canvas/FloatingDock.tsx`
**Verification Gate:** A test asserts that every menu item, palette entry and shortcut resolves to a registered command. Playwright: holding Space over the canvas pans; Space in the timeline toggles play; Delete in the timeline deletes the selected keyframes and never a layer.

---

## Phase 44: Workspace Architecture & Layout Presets
**Goal:** A Figma / Wix Studio layout (Layers on the left, canvas in the centre, inspector on the right) with an After Effects timeline docked at the bottom, all driven by a serialisable workspace model.
**Closes:** AUD-35, AUD-21 (shell half) · **Depends on:** 6, 43 · **Runs before:** 20, 22, 52

### Sub-Phase 44.1: Panel Registry & Layout Model
- [ ] `registerPanel({ id, title, zone, load: () => import(…), edition, focusScope })`. The shell renders a `WorkspaceLayout` JSON (zones, sizes, tabs, collapsed state) instead of 22 local `useState` calls.
- [ ] Split `EditorShell.tsx` (2,081 lines) into `Shell`, `DockTree` and `PanelHost`. Panels load lazily; a panel not in the layout costs zero bytes.

### Sub-Phase 44.2: Presets
- [ ] **Design:** Layers │ Canvas │ Design inspector. The timeline collapses to a slim transport bar.
- [ ] **Animate:** Layers │ Canvas │ Motion inspector, with the timeline at ~40% height.
- [ ] **Code:** Canvas │ Code panel.
- [ ] Switch presets from the header. Users can save custom layouts (UI preferences, localStorage).

### Sub-Phase 44.3: Inspector Tabs
- [ ] The right inspector has **Design · Motion · Code** tabs (like Figma's Design / Prototype / Dev Mode). Phase 22 fills Design; states, triggers, behaviours and the Motion card live in Motion.

### Sub-Phase 44.4: Resize Performance
- [ ] Splitter drags update CSS variables only and re-render no panel. The canvas keeps its DOM node (no remount) across preset switches and resizes.

**Key files:** `src/editor/shell/*`, new `src/editor/workspace/*`
**Verification Gate:** The layout survives a reload. Switching presets takes under 100 ms and doesn't remount the stage (Playwright checks node identity). `EditorShell.tsx` is under 500 lines. The initial bundle excludes panels not in the active preset (bundle analyzer).

---

## Phase 45: Transport, Global Clock & Frame Scheduler
**Goal:** One clock for the whole studio, with per-frame work outside React.
**Closes:** AUD-30, AUD-38 · **Depends on:** 9, 41 · **Runs before:** 10, 23, 24, 52

### Sub-Phase 45.1: Transport
- [ ] `src/core/time/transport.ts`: `{ time, playing, rate, loop: "off" | "loop" | "ping-pong", workArea, fps, compositionId }`. Commands: play, pause, seek, step frame, shuttle (J/K/L), set work area.
- [ ] It is an observable store outside React. UI text reads it through `useTransportTime({ maxHz: 10 })`; per-frame consumers subscribe from the scheduler.

### Sub-Phase 45.2: Frame Scheduler
- [ ] One rAF loop with ordered phases: **input → evaluate (kernel) → apply (adapters, renderer) → overlay draw → stats**. Panels register tasks in a phase.
- [ ] A lint rule bans `requestAnimationFrame` outside `src/core/time/**` (short allowlist for third-party engines under their adapters).

### Sub-Phase 45.3: Deterministic Mode
- [ ] The Phase 4 test clock plugs in here. The render queue (Phase 55) drives it one frame at a time.

### Sub-Phase 45.4: Migrate Consumers
- [ ] The Sequencer, PlayheadControls, Playground and the canvas play button use the transport. Delete `MotionSequencer`'s local `currentTime` state, its rAF loop and the `SANDBOX_HOT_PATCH` broadcast.

**Key files:** new `src/core/time/*`, `src/editor/panels/sequencer/*`
**Verification Gate:** During playback the timeline panel makes ≤ 10 React commits per second (timecode text only), measured with the Profiler. The canvas, timeline and playground show the same time within 1 frame (Playwright). Frame stepping lands on exact frame times at 24, 30 and 60 fps.

---

## Phase 46: Compositions, Layer Time Bars & Nesting
**Goal:** The After Effects time model inside MDM: compositions with a duration, fps, work area and markers; layers with in/out points; nested compositions.
**Closes:** AUD-36 · **Depends on:** 7 · **Runs before:** 8, 9, 52

### Sub-Phase 46.1: Composition Entity
- [ ] `Composition { id, name, duration, fps, workArea, markers[], layers: Record<layerId, { start, in, out, stretch }> }`. Every document has a `main` composition (the mount / intro timeline).

### Sub-Phase 46.2: One Model for Web Triggers and AE Timelines (Decision Record)
- [ ] `decisions/0002-time-model.md`: a triggered clip (hover, press, inView, scroll) becomes an **interaction composition** that its trigger starts, seeks or scrubs. The main composition is the "always playing" one. The web trigger model and the AE model are then one model, not two.
- [ ] Migrate every existing clip into a composition with no visible change.

### Sub-Phase 46.3: Nesting (Precomps)
- [ ] A composition can be placed as a layer inside another, with a time offset, stretch and time remapping. Effect instances (Phase 7.4) are compositions with exposed props.

### Sub-Phase 46.4: Markers
- [ ] Composition and layer markers with labels. A marker can fire a `custom` trigger, exported as timeline labels or callbacks.

**Key files:** `src/core/document/schema.ts`, new `src/core/document/compositions.ts`
**Verification Gate:** The 12 Phase 7 reference effects, plus a 3-scene intro sequence with one nested composition, are expressible and valid. Golden tests: `evaluate()` matches hand-computed values at in/out edges and under stretch and time remap. The migration leaves the demo project visually identical (Playwright).

---

## Phase 47: Property Links, Expressions & Drivers
**Goal:** The equivalent of AE expressions and Rive data binding: properties that follow other properties, deterministically and safely.
**Depends on:** 9, 46

### Sub-Phase 47.1: Link Model
- [ ] `Link { target: layer.path, source: layer.path | input | time, map: range | curve | expression }`.

### Sub-Phase 47.2: Expression Language
- [ ] A small, sandboxed, typed language (parser → AST → evaluator; **no `eval` or `Function`**): arithmetic, `time`, `value`, `wiggle(freq, amp, seed)`, `loopOut(type)`, `linear` / `ease(t, tMin, tMax, a, b)`, `clamp`, `valueAtTime`, and references to other layers' properties. Noise is seeded, so results are deterministic.

### Sub-Phase 47.3: Ordering & Diagnostics
- [ ] Topological evaluation order. Cycles are refused with `[LINK_CYCLE]` and the chain shown.

### Sub-Phase 47.4: Pick-Whip & Export
- [ ] Drag from a property to another (in the timeline or inspector) to create a link.
- [ ] Export compiles expressions to plain TS functions per engine, or bakes them to keyframes when the target can't express them (CSS-only).

**Verification Gate:** 20 expression golden tests, including `wiggle` determinism across runs and browsers. A cycle is refused with its reason. A linked animation passes export parity (Phase 4).

---

## Phase 48: Stage Renderer v2 — Document → DOM Reconciler
**Goal:** Replace the HTML-string iframe with an incremental renderer that mounts the MDM as live DOM, applies changes without reloading, and shares render definitions with export.
**Closes:** AUD-29, AUD-33 · **Depends on:** 41, 42 · **Runs before:** 10, 20, 49

### Sub-Phase 48.1: Render Definitions
- [ ] One React component per archetype in `src/core/render/archetypes/`, taking `(layer, resolvedProps)`. The React exporter (Phase 27) prints the same components (One Renderer Law). The inline `onmouseover` strings go away; hover and press come from states (Phase 11).

### Sub-Phase 48.2: Host
- [ ] The stage renders into a **same-origin iframe** per frame (isolates user CSS and fonts; the frame width is a real viewport, so media queries work). A React root is mounted into `iframe.contentDocument`; there is no `srcDoc` string.
- [ ] A typed, per-frame bridge replaces `postMessage(…, "*")`.

### Sub-Phase 48.3: Incremental Updates
- [ ] Document patches re-render only the affected layers. Per-frame values from the scheduler are written straight to node styles through a `LayerNodeRegistry` (layer id → element), with no React render per frame (Hot-Path Law).

### Sub-Phase 48.4: Measurement API
- [ ] `renderer.measure(layerIds)` returns document-space rects, batched and backed by `ResizeObserver`. The viewport (49) uses it for handles, snapping and hit-testing.

### Sub-Phase 48.5: Separate the Logic Sandbox
- [ ] The After-track logic runtime (mock DB, mock API, execution tracer, hot reload) stays in `SandboxHost` behind the `full` edition flag. The design stage no longer depends on it.

**Key files:** new `src/core/render/*`, new `src/editor/stage/*`, `src/editor/runtime/SandboxHost.tsx`
**Verification Gate:** Editing a prop updates the stage in under 16 ms with no iframe reload (Playwright checks the iframe document stays the same object). A 500-layer document mounts in under 500 ms. For every archetype, the stage and the React export are pixel-identical (≤ 0.5%). `grep` finds zero `postMessage(…, "*")` in `src/editor`.

---

## Phase 49: Viewport Engine — Infinite Canvas, Camera, Hit-Testing & Overlay
**Goal:** The Figma / Wix Studio canvas: an infinite space with several frames, precise hit-testing, and one overlay layer for all editor chrome.
**Depends on:** 43, 48 · **Runs before:** 20, 35, 53

### Sub-Phase 49.1: Camera
- [ ] Document ↔ screen transform: pan, zoom (2%–6400%), zoom to fit / to selection, smooth wheel, trackpad pinch and keyboard zoom. The camera is stored per document in UI preferences. Reuses the `WhiteboardCanvas.tsx` pan/zoom math.

### Sub-Phase 49.2: Multi-Frame Canvas
- [ ] Several top-level frames side by side (device sizes, variants, or compositions), each a Phase 48 renderer host. This supersedes the one-artboard rule in 20.3.

### Sub-Phase 49.3: Hit-Testing
- [ ] A spatial index over measured rects (reuse the `SpatialIndex` R-tree, TS or Wasm per the Phase 5 decision): deepest hit first, Cmd/Ctrl for deep select, locked and hidden layers skipped.
- [ ] In Design mode the overlay captures all pointer events and nothing reaches the iframe. In Preview mode events pass through, so interactions run live.

### Sub-Phase 49.4: Overlay Layer
- [ ] One canvas/SVG layer above the frames draws selection, handles, hover outlines, guides, distance labels, motion paths (53) and onion skins (53). The frame scheduler redraws it, not React.

### Sub-Phase 49.5: Design / Preview Modes
- [ ] A toggle like Wix Studio's Preview and Figma's prototype view: Design mode edits, Preview mode runs triggers and behaviours with the real pointer.

**Key files:** new `src/editor/viewport/*`, `src/editor/canvas/WhiteboardCanvas.tsx`, `src/core/wasm/SpatialIndex.ts`
**Verification Gate:** Hover highlight appears within 1 frame with 1,000 layers. Hit-test p95 is under 1 ms. Pan and zoom hold 60 fps with 5 frames × 200 layers. Playwright clicks at 20 known points select the expected layers at 3 zoom levels.

---

## Phase 50: Auto-Layout, Constraints & Responsive Breakpoints
**Goal:** Wix Studio / Figma responsive design: stacks, grids, constraints, and per-breakpoint overrides, including per-breakpoint **motion**.
**Depends on:** 20, 42

### Sub-Phase 50.1: Auto-Layout
- [ ] Stack layout (direction, gap, padding, alignment, wrap, hug / fill sizing), mapped 1:1 to CSS flex. Grid layout mapped to CSS grid.

### Sub-Phase 50.2: Constraints
- [ ] Constraints for absolutely positioned children (left, right, left-and-right, centre, scale), exported as CSS.

### Sub-Phase 50.3: Breakpoints
- [ ] A document-level breakpoint set (Desktop 1440, Tablet 768, Mobile 375, plus custom). Props and motion (clip on/off, durations, distances, behaviour params) can be overridden per breakpoint. The inspector marks overridden values and can reset them (Wix Studio's breakpoint bar).

### Sub-Phase 50.4: Canvas
- [ ] All breakpoints side by side (multi-frame from 49.2). Dragging a frame's edge reflows the layout live.

### Sub-Phase 50.5: Export
- [ ] Media or container queries for layout; `gsap.matchMedia` / Motion variants / CSS media blocks for motion.

**Verification Gate:** A fixture page using stacks, grids and constraints reflows identically in the stage and the export at 5 widths (pixel parity). A per-breakpoint animation override plays only at its width, in both.

---

## Phase 51: Layer Compositing — Anchor, Parenting, Blend Modes, Masks & Effect Stacks
**Goal:** The After Effects layer toolkit, mapped to what the web renders well.
**Depends on:** 46, 48

- [ ] **51.1 Anchor point** per layer (`transform-origin`), editable on the canvas.
- [ ] **51.2 Parenting and null layers.** A layer can follow another layer's transform independently of the DOM tree (AE pick-whip parenting). `evaluate()` composes the transforms; export uses wrapper elements or computed transforms.
- [ ] **51.3 Blend modes** (`mix-blend-mode`), isolated groups, and **adjustment layers** (`backdrop-filter`).
- [ ] **51.4 Masks and track mattes.** Alpha and luma mattes through CSS/SVG masks. Mask paths are animatable (Phase 16 path editing).
- [ ] **51.5 Effect stack.** An ordered per-layer list (blur, glow, drop shadow, colour adjust, displacement, noise) with keyframeable parameters. The rules (Phase 8) route each effect to CSS filter, SVG filter or shader by performance class.
- [ ] **51.6 Motion blur (approximation).** Opt-in directional blur driven by transform velocity, with its performance class.

**Verification Gate:** 10 compositing reference scenes (a 3-level parent chain, a luma-matte title, an adjustment layer, a blend-mode overlay, a 4-effect stack, …) match `evaluate()` in the stage and the export, in all three browsers.

---

## Phase 52: After Effects–Style Timeline Workspace
**Goal:** The bottom timeline: every layer of the active composition as a bar, with switches, twirl-down property lanes, a work area, markers and shuttle controls.
**Depends on:** 44, 45, 46 · **Runs before:** 23 (which then adds keyframing and the graph editor inside this workspace)

### Sub-Phase 52.1: Layout
- [ ] **Left:** the layer stack (same order and selection as the Layers panel) with switches: visible, solo, lock, shy, motion blur, blend mode, parent pick-whip.
- [ ] **Right:** a time ruler (timecode or frames, fps from the composition), layer bars with in/out trimming, the work-area bar, composition and layer markers, and the current-time indicator.

### Sub-Phase 52.2: Twirl-Downs
- [ ] Layer → groups (Transform, Appearance, Effects, States, Behaviours, Links) → properties, each with a stopwatch toggle that enables keyframing.
- [ ] `U` reveals only animated properties; `UU` reveals every modified one.

### Sub-Phase 52.3: Navigation
- [ ] Ruler scrubbing, zoom to work area, J/K/L shuttle, I/O to jump to in/out, B/N to set the work area, Page Up/Down to step one frame (Shift for 10). All are Phase 43 commands with timeline focus.

### Sub-Phase 52.4: Scale
- [ ] Keyframe lanes are canvas-rendered (not one DOM node per keyframe) and virtualised: 200 layers × 20 properties stay smooth. The scheduler draws the CTI.

### Sub-Phase 52.5: Nested and Interaction Compositions
- [ ] Double-clicking a nested composition bar opens it in a new timeline tab with breadcrumbs.
- [ ] Interaction compositions (hover, press, scroll) appear as their own tabs, with the trigger shown in the tab header, so the web model stays visible.

**Reuse:** `MotionSequencer.tsx`, `KeyframeTrack.tsx`, `TrackHeader.tsx`, `PlayheadControls.tsx`, `ScrollTriggerBar.tsx` (visuals; their state moves to the transport and the document).
**Verification Gate:** A 25-step Playwright journey using AE-standard actions (trim bars, set the work area, twirl down, `U`, J/K/L, open a precomp) asserts the exact resulting state. A 200-layer composition scrubs at 60 fps. Timeline and Layers panel selection are always in sync.

---

## Phase 53: On-Canvas Motion Editing
**Goal:** Edit motion where it happens: motion paths with keyframe dots on the stage, onion skinning, and live values while scrubbing.
**Depends on:** 16, 49, 52

- [ ] **53.1 Motion path overlay.** Position keyframes draw as a path with keyframe dots and per-frame ticks (tick spacing shows speed, as in AE). Drag a dot to change that keyframe's value; drag bezier handles for **spatial** interpolation (a new track field, separate from temporal easing).
- [ ] **53.2 Auto-key on the stage.** In record mode, dragging a layer at the playhead writes keyframes (shared with 23.2).
- [ ] **53.3 Onion skin.** N ghost frames before and after at adjustable opacity, drawn from `evaluate()` at offset times.
- [ ] **53.4 Value HUD.** While scrubbing, x, y, rotation and opacity are shown next to the layer.

**Verification Gate:** Dragging a motion-path dot changes exactly that keyframe (1 undo step). Sampled positions along a spatial-bezier path match `evaluate()` within 0.5 px. An onion skin with 5 ghosts keeps 60 fps.

---

## Phase 54: Asset Pipeline & Media Layers
**Goal:** Real assets (images, SVG, fonts, GLTF, video, audio) stored locally, referenced by the document, and synced to time.
**Closes:** AUD-37 · **Depends on:** 3, 45

- [ ] **54.1 Asset store.** Content-hashed blobs in IndexedDB and a `document.assets` manifest (type, hash, name, size, duration). Import by drag-and-drop or paste. SVG and GLTF are sanitised; thumbnails render in a worker. The hard-coded Unsplash defaults in the registry are replaced by bundled sample assets.
- [ ] **54.2 Files.** `.lazy.json` (Phase 3.3) embeds or links assets; export ZIPs include only referenced assets.
- [ ] **54.3 Video layers.** `<video>` synced to the transport (seek on scrub, rate on play), trimmed by the Phase 46 in/out points.
- [ ] **54.4 Audio layers.** A waveform lane in the timeline, audio scrubbing, and optional beat markers to sync motion to sound. Audio is included in video renders (Phase 55).

**Verification Gate:** 200 MB of assets survive a reload. After 20 random seeks, a video layer shows the frame for time `t` within 1 frame. An export ZIP contains exactly the referenced assets.

---

## Phase 55: Render Queue — Video, GIF, Lottie & Image Sequences
**Goal:** An After Effects-style render queue: motion out as media, not only as code.
**Depends on:** 9, 45, 48 (54 for audio)

- [ ] **55.1 Frame-accurate capture.** The transport runs in deterministic mode one frame at a time. Capture uses headless Chromium (the Phase 4 harness) on the server, or an in-browser path where it is faithful. Record the choice in `decisions/0004-render-capture.md`.
- [ ] **55.2 Encoders.** MP4/WebM through WebCodecs plus a muxer, GIF with palette quantisation, PNG sequences and poster frames. Settings: resolution, fps, work area only, transparent background (WebM/PNG).
- [ ] **55.3 Lottie export** for the subset that maps (transform, opacity, shape paths, trim paths). The rules decide eligibility and explain what can't be exported.
- [ ] **55.4 Queue UI.** Several jobs, progress, cancel, and output presets.

**Verification Gate:** A 5-second, 60 fps composition renders to MP4, and its frames match `evaluate()` screenshots above a PSNR threshold. GIF and PNG-sequence outputs are verified the same way. Lottie output of eligible reference effects plays in `lottie-web` with ≤ 2% pixel difference.

---

## Phase 56: Workers, Baking & Hot-Path Performance
**Goal:** The main thread handles input and DOM writes; heavy math runs in workers.
**Depends on:** 5, 9, 45

- [ ] **56.1 Worker pool** (consolidating `WasmWorkerPool.ts` per the Phase 5 decision) for path-morph matching, arc-length tables, spring baking, spatial-index rebuilds, thumbnails and waveforms.
- [ ] **56.2 Caches** keyed by content hash (baked curves, path tables), invalidated by document patches.
- [ ] **56.3 Hot-path rules:** no per-frame `sort`, `JSON` round trips or string parsing in `evaluate()` (a benchmark test guards the common paths).
- [ ] **56.4 Frame telemetry** in the status bar (frame time p95, dropped frames) from the scheduler.

**Verification Gate:** A DevTools trace of a scripted 60-second editing session shows **0** main-thread long tasks ≥ 50 ms. Morphing a 500-node path while scrubbing drops no frames.

---

## Phase 57: Legacy Runtime Retirement
**Goal:** Delete the parallel systems that Track S replaces: one renderer, one clock, one evaluator.
**Depends on:** 10, 20, 23, 27, 48, 52

- [ ] **57.1** Remove from the design path: `buildSandboxDocument` / `generateElementMarkup`, `interpolateTrackValue`, the `SANDBOX_HOT_PATCH` design messages, the code generation in `MultiEngineAnimationRuntime.ts` (moved to the exporters in Phase 27), `AnimationSample` (Phase 7), and duplicate transform synthesisers.
- [ ] **57.2** Split `panels.css` (7,308 lines) per panel and delete unused selectors (Playwright CSS coverage).
- [ ] **57.3** A CI grep gate with a list of forbidden identifiers and imports.

**Verification Gate:** The grep gate is green, the bundle-size drop is recorded, and the full Playwright and parity suites pass.

---

## Phase 58: Studio Architecture Integration Gate
**Goal:** Prove the Figma / Wix Studio viewport plus the After Effects timeline end to end, before the release gate.
**Depends on:** 20–24, 41–57 · **Runs before:** 40

- [ ] **58.1 Journey A (Design):** create two frames, build a card with auto-layout and constraints, override it at the Mobile breakpoint.
- [ ] **58.2 Journey B (Animate):** a 3-scene intro in the AE timeline with a nested composition, a parent chain, a luma matte, a `wiggle` expression and markers; edit a motion path on the canvas; check the onion skin.
- [ ] **58.3 Journey C (Output):** export React (parity passes), render MP4 (parity passes), save and reopen the `.lazy.json` file (identical).
- [ ] **58.4** All three journeys stay inside the Phase 26 performance budgets.

**Verification Gate:** The three journeys pass as Playwright scripts in CI on Chromium, WebKit and Firefox, plus one recorded manual run.

---

# TRACK H — RELEASE

---

## Phase 40: Initial Phase v2 Release Gate
**Goal:** Prove PRD §11 end to end and ship a public beta of the Initial Phase.
**Depends on:** all
> **v2.1 amendment:** Runs after Phase 58 (Studio Architecture Integration Gate). The 40.2 matrices also include the render queue (55) and breakpoint parity (50).

- [ ] **40.1** Run all 8 PRD §11 Definition-of-Done scenarios as automated Playwright journeys plus a recorded manual run.
- [ ] **40.2** Full matrices green: export parity (Phase 27/28), performance budgets (26), accessibility (29), AI evals (33), recognition accuracy (36).
- [ ] **40.3** Security review: API route, SVG/GLTF import sanitisation, CSP headers, key handling, dependency audit.
- [ ] **40.4** Docs: user guide (Simple and Pro), effect authoring guide, changelog, known limitations. Close `AUDIT.md` with every ID marked resolved or explicitly deferred.
- [ ] **40.5** Go/No-Go review against the PRD §13 metrics baseline.

**Verification Gate:** Every item above is green in CI at a tagged commit (`v0.2.0-initial-beta`).

---

## 6. Milestones

| Milestone | After phase | What you can demo |
|---|---|---|
| **M1 · Solid Ground** | 6, 41–44 | Same features as today, but it type-checks, builds, persists and is verified in browsers. Gestures are single undo steps; one property vocabulary; Design / Animate / Code workspaces |
| **M2 · Real Motion Core** | 13, 45–48 | Keyframes, states, pointer and scroll motion running on a live-DOM stage from one clock, matching the math; compositions with nesting and expressions |
| **M3 · All Engines Live** | 19 | GSAP (or its cleared alternative), Motion, SVG, text, Three.js and shaders running in the editor |
| **M4 · The Studio** | 26, 49–53, 56 | Figma / Wix Studio canvas (multi-frame, auto-layout, breakpoints), After Effects timeline (bars, twirl-downs, work area, precomps), on-canvas motion paths, Simple/Pro properties, Playground, 40+ effects, measured performance |
| **M5 · Trustworthy Export** | 29, 54–55 | Every effect exports to React/Vue/vanilla/CSS, builds, and matches the preview; accessible. Assets and media layers; video, GIF and Lottie render queue |
| **M6 · AI-Native** | 34 | Prompt → animation, co-pilot edits, reference-based generation, measured quality |
| **M7 · Draw It** | 39 | Oval → ellipse, line → motion path, sketch → UI, three-step Simple mode |
| **M7.5 · Studio Proven** | 57, 58 | Legacy runtime deleted; Design → Animate → Output journeys green in three browsers |
| **M8 · Beta** | 40 | Public beta of the Initial Phase |

---

## 7. Parallelisation Guide

- **Track A:** Phase 1 first. Then 2→3 is a chain, while 4, 5 and 6 can run in parallel with 2.
- **Track B:** 7 → (8 ∥ 9) → 10 → (11 ∥ 12 ∥ 13).
- **Track C:** after 10, Phases 14–19 are independent (different engine owners).
- **Track D:** 20 → (21 ∥ 22) → 23. Phase 24 needs 10–13. Phase 25 waves start as soon as each wave's engine phase is done (e.g. Text wave after 17). Phase 26 can start any time after 10.
- **Track E:** 27 starts per engine as engines land; 28 and 29 follow.
- **Track F:** 30 can start right after Phases 2 and 8 (it doesn't need the engines). 31 needs the library for good results.
- **Track G:** 35–36 only need Phase 20 and can be built early by a separate owner. 37 needs 16; 38 needs 31; 39 comes last.
- **Track S (v2.1):** see §5.1 for where each phase slots in. In short: 41 before 3; 42 in parallel with 3; 43 → 44 alongside 6; 46 right after 7; 45 and 48 before 10; 49 before 20; 52 before 23; 47, 51, 53–56 as their dependencies land; 57 → 58 just before 40. With two owners, one can take the **time stack** (45, 46, 47, 52, 55) while the other takes the **space stack** (42, 48, 49, 50, 51, 53).

---

## 8. Explicitly Out of Scope for the Initial Phase

These remain on the full-vision track (`DOCS/After/`) and begin only after Phase 40:
- Multi-element **Component Design** (navbars, pricing cards, modals as editable compositions beyond single effects) and **Page / Section Design**.
- Logic Blueprints, NodeScript, Database Studio, API/backend emitters, deployment, collaboration, plugins, and importing existing projects (`ROADMAP_EXISTING_PROJECT_IMPORT.md`).
- Mobile (React Native / Flutter) emitters.
