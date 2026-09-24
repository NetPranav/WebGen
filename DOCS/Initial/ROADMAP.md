# IMPLEMENTATION ROADMAP — INITIAL PHASE (v2)

## Project Name: LazyLayout — AI-Native Motion Design Studio
**Document Version:** 2.0.0
**Phase:** Initial Phase (Motion Element & Effect Studio)
**Status:** Active. Phase 1 ✅ (CI enforced by convention; see Phase 1 log). Next: Phase 2 (MDM v2).
**File Location:** `DOCS/Initial/ROADMAP.md`
**Inputs:** `PRD.md` v2.0.0 (what and why) · `AUDIT.md` (what is wrong today) · `lazylayout_element_grammer.md` + `ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md` (the rules) · `DOCS/action working.md` (the 52 World Environment properties)
**Supersedes:** v1.1.0 (8 phases). The v1.1 phases are reclassified in §4. Nothing from them is thrown away; each is either kept, fixed, or re-scoped below.

---

## 1. How to Read This Roadmap

- **40 phases in 8 tracks.** Tracks run roughly in order. Some phases inside a track can run in parallel (see §7).
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

## 5. Phase Overview

| # | Track | Phase | Key deliverable | Depends on | Status |
|---|---|---|---|---|---|
| 1 | A · Solid Ground | Build Health & CI | 0 TS / 0 lint errors, CI, `next build` green | — | ✅ (enforcement by convention) |
| 2 | A | Unified Motion Document Model (MDM v2) | One schema, one store API, migrations | 1 | 📋 |
| 3 | A | Store, History & Persistence | Correct undo/redo, IndexedDB autosave, `.lazy` files | 2 | 📋 |
| 4 | A | Real-Environment Verification Harness | Playwright, export build and pixel-parity harness | 1 | 📋 |
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
| 40 | H · Release | Initial Phase v2 Release Gate | PRD §11 DoD proven end to end | all | 📋 |

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
- [ ] `src/core/document/schema.ts`: the MDM types from PRD §4 (Document, Layer kinds, Archetype, Effect instance, Track, Clip, State, Trigger, Behaviour, Tokens, ExportSettings).
- [ ] A runtime validator (Zod or equivalent) generated from the same source. It also produces the **JSON Schema** used by the AI in Phase 30. One source, three outputs: TS types, runtime validator, JSON Schema.
- [ ] `schemaVersion: 2` plus `src/core/document/migrations/` with a `v1 → v2` migration covering `ProjectElement` and `properties.animationStack` data saved in localStorage.

### Sub-Phase 2.2: Archetype and Layer-Kind Registry
- [ ] One registry, `src/core/document/registry.ts`, maps each archetype/kind to its property sections, legal states, default props, and semantic export tag. Its data comes from the v1.1 `archetypes/*.ts` and `element-sections.ts`.
- [ ] Retire `ElementType` (20 types) and the unused parts of `GrammarElementType` (32 types). Grammar types that Initial Phase doesn't need (Navbar, Page, Form …) are listed as "reserved" in the registry, not deleted from the grammar doc.

### Sub-Phase 2.3: Single Store API
- [ ] `useDocumentStore` with typed commands only: `addLayer`, `updateProps(layerId, patch)`, `addTrack`, `setKeyframe`, `addState`, `applyDiff(diff)` … No `setElementProperty(id, string, unknown)`.
- [ ] Every command is a serialisable **Patch** (Immer patches, already a dependency). The same patch format is used by undo, AI diffs, and future collaboration.
- [ ] Deterministic ID generator (`prefix_` + 8 hex characters from `crypto.getRandomValues`), replacing `Math.random` IDs (AUD-07).

### Sub-Phase 2.4: Consumer Migration
- [ ] Move the Sequencer, Outliner, Details, Code Inspector, Co-pilot and Emitters to MDM. Delete the `TODO(MDM-P2)` shims from Phase 1.
- [ ] Remove `ProjectElement`, `BaseElementNode` and `AttachedAnimation` once nothing imports them.

**Reuse:** archetype defaults, property surfaces (v1.1 PRD §5), `SCHEMA_REFERENCE.md` fragments.
**Key files:** `src/core/document/*`, `src/core/store/useDocumentStore.ts`
**Verification Gate:** `grep` finds zero imports of the removed types. Every v1.1 demo project in localStorage migrates and renders identically (Playwright screenshot before and after). A property-based test round-trips 500 random documents through validate → serialise → parse without change.

---

## Phase 3: Store, History & Persistence
**Goal:** Every edit is undoable, nothing is lost on reload, and documents are portable files.
**Closes:** AUD-05 (behaviour half), AUD-08 · **Depends on:** 2

### Sub-Phase 3.1: Correct History
- [ ] Undo/redo is built on the Phase 2 patches (inverse patches), replacing full-snapshot history. Memory stays bounded for long sessions.
- [ ] Gesture coalescing: a drag or scrub produces **one** history entry.
- [ ] Regression test for AUD-05: add a keyframe in the Sequencer → it appears in the Sequencer, the Code view and the Playground → undo removes it everywhere.

### Sub-Phase 3.2: Autosave & Recovery
- [ ] IndexedDB persistence (localStorage kept only for UI preferences), debounced autosave, crash recovery prompt.
- [ ] Storage quota handling with a clear error.

### Sub-Phase 3.3: Files
- [ ] `.lazy.json` export/import (the document plus embedded or linked assets), with a schema-version check and migration on import.
- [ ] Drag a `.lazy.json` file onto the window to open it.

**Verification Gate:** Playwright: create a document, edit 20 times, reload the tab, the state is identical, undo 20 times returns to blank. An exported `.lazy.json` imported in a fresh browser profile renders pixel-identically.

---

## Phase 4: Real-Environment Verification Harness
**Goal:** The test infrastructure every later gate relies on: browser tests, export builds and pixel parity.
**Closes:** AUD-15, AUD-16 (infrastructure) · **Depends on:** 1

### Sub-Phase 4.1: Browser E2E
- [ ] Playwright set up with Chromium, WebKit and Firefox projects, running against `next build && next start`.
- [ ] Deterministic time: a test clock that controls `requestAnimationFrame`, `performance.now`, and the MDM playhead, so animations can be screenshotted at an exact `t`.

### Sub-Phase 4.2: Export Build Harness
- [ ] `tests/export-harness/`: fixture apps (Next 16 App Router, Vite React, Vue 3, vanilla). The harness writes exported files in, installs pinned deps (cached), and runs `tsc` + `build`.
- [ ] Runs on CI for every exporter change. It is too slow for every commit, so it runs nightly plus on PRs that touch `src/compiler/**`.

### Sub-Phase 4.3: Pixel Parity
- [ ] Render the editor Playground and the exported build at the same size and at the same sampled times (0, 25, 50, 75, 100%), then diff with `pixelmatch`. The threshold is configurable (default ≤ 1%).
- [ ] Parity reports are stored as CI artifacts (images plus diff heatmaps).

**Verification Gate:** A deliberately broken exporter (e.g. a wrong easing name) fails the parity job. A correct one passes, on all three browsers.

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

# TRACK H — RELEASE

---

## Phase 40: Initial Phase v2 Release Gate
**Goal:** Prove PRD §11 end to end and ship a public beta of the Initial Phase.
**Depends on:** all

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
| **M1 · Solid Ground** | 6 | Same features as today, but it type-checks, builds, persists, and is verified in browsers |
| **M2 · Real Motion Core** | 13 | Keyframes, states, pointer and scroll motion that actually run on stage and match the math |
| **M3 · All Engines Live** | 19 | GSAP (or its cleared alternative), Motion, SVG, text, Three.js and shaders running in the editor |
| **M4 · The Studio** | 26 | Figma-grade stage, Simple/Pro properties, Timeline 2.0, Playground, 40+ effects, measured performance |
| **M5 · Trustworthy Export** | 29 | Every effect exports to React/Vue/vanilla/CSS, builds, and matches the preview; accessible |
| **M6 · AI-Native** | 34 | Prompt → animation, co-pilot edits, reference-based generation, measured quality |
| **M7 · Draw It** | 39 | Oval → ellipse, line → motion path, sketch → UI, three-step Simple mode |
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

---

## 8. Explicitly Out of Scope for the Initial Phase

These remain on the full-vision track (`DOCS/After/`) and begin only after Phase 40:
- Multi-element **Component Design** (navbars, pricing cards, modals as editable compositions beyond single effects) and **Page / Section Design**.
- Logic Blueprints, NodeScript, Database Studio, API/backend emitters, deployment, collaboration, plugins, and importing existing projects (`ROADMAP_EXISTING_PROJECT_IMPORT.md`).
- Mobile (React Native / Flutter) emitters.
