# CODEBASE & SPECIFICATION AUDIT — INITIAL PHASE

## Project Name: LazyLayout — AI-Native Motion Design Studio
**Document Version:** 1.0.0
**Audit Date:** 2026-09-24
**Audited Branch / Commit:** `blueprint-language` @ `acec382`
**File Location:** `DOCS/Initial/AUDIT.md`
**Consumed By:** `DOCS/Initial/ROADMAP.md` v3.3.0. Every fix phase cites the audit IDs (`AUD-xx`) it closes. Section J (AUD-44 … AUD-55) was added on 2026-09-26 by the production-readiness review behind ROADMAP v3.0 (§4.2 there). AUD-56 was added the same day with ROADMAP v3.1, AUD-57 with v3.2, and AUD-58 with v3.3. AUD-59 was added by Phase 8's own work (2026-09-26), not a roadmap version bump.

---

## 0. Why This Document Exists

The v1.1 roadmap marked Phases 1–8 as **✅ COMPLETE** and reported "586/586 tests passing, 50/50 archetype cells green". The tests do pass (594/594 on the audit date), but most of them check whether generated **strings contain certain substrings**. Very little checks that the product works in a browser, that exported code compiles, or that the editor and the engine share one data model.

This audit records what is actually true in the code, so the new roadmap starts from reality and not from the checkboxes.

**Rule going forward:** A phase is only "complete" when its **Verification Gate** passes in a real environment: the TypeScript compiler, a real browser, or a real build of the exported code. Unit tests over string output are necessary but never sufficient. See `ROADMAP.md` §3 (Definition of Done v2).

### How each finding was checked
| Method | Command / evidence |
|---|---|
| Test suite | `npm test` → 594 pass / 0 fail (tests run through `tsx`, which strips types without checking them) |
| Type check | `npx tsc --noEmit -p .` → **162 errors** in 41 files |
| Lint | `npx eslint src` → **179 errors, 494 warnings** |
| Source reading | File and line references given per finding |
| Not verified | `next build` was not run during the audit (see AUD-01) |

---

## 1. Severity Scale

| Severity | Meaning |
|---|---|
| **S1 — Blocker** | The product cannot be trusted or shipped until this is fixed. It breaks correctness, build health, or core claims. |
| **S2 — Major** | A headline feature is simulated, missing, or wired incorrectly. |
| **S3 — Moderate** | Scope leaks, duplicated systems, or divergence between docs and code. |
| **S4 — Minor** | Hygiene, naming, conventions. |

---

## 2. Findings

### A. Build & Type Health

| ID | Sev | Finding | Evidence | Fix Phase |
|---|---|---|---|---|
| AUD-01 | S1 | **162 TypeScript errors.** The test suite still passes because `tsx` strips types without checking them. `next build` type-checks by default, so a production build is expected to fail (not run during the audit). | Hotspots: `MultiEngineAnimationRuntime.ts` (34), `LiveCollaborationPanel.tsx` (18), `ArchetypeEmitters.test.ts` (18), `ContentBrowser.tsx` (13). Top codes: TS2339 missing property (30), TS2322 (29), TS2353 unknown property (28), TS2678 impossible `case` (27). | 1 |
| AUD-02 | S2 | **179 ESLint errors.** | `npx eslint src` | 1 |
| AUD-03 | S3 | No CI. Nothing enforces `tsc`, lint, tests, or build on push. | No `.github/workflows` | 1 |

### B. Data Model Integrity

| ID | Sev | Finding | Evidence | Fix Phase |
|---|---|---|---|---|
| AUD-04 | S1 | **At least three parallel element models that don't agree.** (1) `ProjectElement` in the store: `{id, name, archetype, parentId, properties, children}`. (2) `BaseElementNode` / `AttachedAnimation` in `src/core/elements/types.ts`, which has `family` and `animationStack`. (3) `GrammarElementType` (32 types) in `src/core/types/element-grammar.ts`. A fourth, `ElementType` (20 types) in `element-sections.ts`, mixes archetypes with SVG and 3D types. UI code casts between them freely. | TS2339 errors such as `Property 'family' does not exist on type 'ProjectElement'` at `MotionSequencer.tsx:177` | 2 |
| AUD-05 | S1 | **The Sequencer reads animations from a different place than it writes them.** It reads `activeElement.animationStack` (a top-level field that doesn't exist on `ProjectElement`) but writes through `setElementProperty(id, "animationStack", …)`, which stores the value in `element.properties.animationStack`. Edits made in the timeline are therefore not read back by the timeline. | `MotionSequencer.tsx:181` (read), `:364` / `:577` (write); `useProjectStore.ts:840-860` | 2, 3 |
| AUD-06 | S2 | **The element grammar (the "single source of truth" in `lazylayout_element_grammer.md`) is not used by the editor.** `ElementGrammarEngine.ts` (791 lines) is only exercised by tests. The UI decides what can be added to what with its own logic. | Only 4 references to grammar types under `src/editor` | 8 |
| AUD-07 | S3 | ID generation uses `Math.random().toString(16/36)` with variable length. This breaks the "prefix + 8-char hex" rule in CONVENTIONS §3 and can collide. | `ComponentGenerator.ts:27`, `MotionAiEngine.ts:168` | 2 |
| AUD-08 | S3 | Persistence is `localStorage` only. There is no schema version on saved projects, no migration path, and no file import/export. | `src/core/storage/ProjectDatabase.ts` | 3 |

### C. Animation Runtime Reality

| ID | Sev | Finding | Evidence | Fix Phase |
|---|---|---|---|---|
| AUD-09 | S1 | **GSAP is a dependency but never runs inside the editor.** Every `gsap` reference under `src/` is a *string* of emitted code. The "GSAP runtime" (`MultiEngineAnimationRuntime.ts`) builds code text; it doesn't drive the stage. What the user sees on stage is an in-house interpolator, so the preview and the exported GSAP code can behave differently. | `grep "import.*gsap" src` → only string literals in emitters | 10, 14 |
| AUD-10 | S1 | **Framer Motion is not installed.** "Framer Motion integration" produces code text only. The library was also renamed: current releases ship as `motion` (`motion/react`). | `package.json` | 5, 15 |
| AUD-11 | S1 | **The "WebGL" 3D viewport draws on a 2D canvas.** `Scene3DViewport.tsx` listens for `webglcontextlost` but renders with `canvas.getContext("2d")`. `three` and `@react-three/fiber` are not installed, so the R3F emitter's output has never run. | `Scene3DViewport.tsx:62,102` | 5, 18 |
| AUD-12 | S2 | **The C++/WebAssembly kernel has never been compiled.** `wasm/dist/` holds only `.gitkeep`. Every "C++ Wasm 120 FPS" claim actually measures the TypeScript fallback inside `WasmBridge.ts`. | `ls wasm/dist` | 5 |
| AUD-13 | S2 | The "60 FPS guarantee" (Phase 8.3) is measured in Node by timing JS function calls. Nothing measures real frames in a browser (no rAF timing, no dropped-frame count, no paint or composite cost). | `PerformanceBenchmark.test.ts` | 26 |
| AUD-14 | S2 | Reduced-motion handling exists in the lowering compiler and the environment inspector, but live previews don't honour it and there's no way to test it end to end. | `grep matchMedia src` | 11, 29 |

### D. Export Truthfulness

| ID | Sev | Finding | Evidence | Fix Phase |
|---|---|---|---|---|
| AUD-15 | S1 | **Exported code is never compiled, built, or rendered.** The export tests assert things like `content.includes("<button")` and `!content.includes("@/core")`. Nothing proves the PRD §8 promise that the code "builds and animates identically without warnings or errors". | `CrossFrameworkExporter.test.ts:18-37` | 4, 27 |
| AUD-16 | S2 | There's no visual comparison between the editor preview and the exported component, so drift between the two can't be detected. | none | 4, 27 |

### E. AI Reality

| ID | Sev | Finding | Evidence | Fix Phase |
|---|---|---|---|---|
| AUD-17 | S1 | **There is no language model anywhere in the product.** `IntentParser`, `MotionAiEngine`, and `ComponentGenerator` are deterministic keyword and regex parsers. That's useful as an offline fallback, but it can't deliver the "base built by AI, refined with AI" vision. | `src/ai/intent/IntentParser.ts` ("Deterministic natural-language parser") | 30 |
| AUD-18 | S3 | "Grammar-constrained decoding" (`ConstrainedDecoder.ts`) constrains a decoder that doesn't exist. | `src/ai/scaffold/` | 30 |

### F. Editor UX Reality

| ID | Sev | Finding | Evidence | Fix Phase |
|---|---|---|---|---|
| AUD-19 | S2 | **The drawing tools are buttons with no behaviour.** The Floating Dock lists Pencil (P), Text (T), Wire (W) and Shapes (S), but `WhiteboardCanvas.tsx` only implements `select` and `pan`. | `FloatingDock.tsx:31,56`; `WhiteboardCanvas.tsx:336-420` | 20, 35 |
| AUD-20 | S2 | The 52-property World Environment (`DOCS/action working.md`) is only partly wired. `EnvironmentInspector.tsx` exists, but none of the tier gates in Part 5 of that doc are checked off. | `EnvironmentInspector.tsx` | 20, 22, 24 |
| AUD-21 | S3 | The UI is very dense, built around an "Unreal Details panel" model: `panels.css` is 7,308 lines, `EditorShell.tsx` 2,081 and `BlueprintCanvas.tsx` 2,751. That works against the new goal of Figma-simple design. | file sizes | 22, 39 |

### G. Scope Leaks (contradict Initial PRD v1.1 §8.5: "no partial UI, dead code paths, or placeholder screens")

| ID | Sev | Finding | Evidence | Fix Phase |
|---|---|---|---|---|
| AUD-22 | S3 | The Logic Blueprint canvas, Execution Trace, Deployment Dashboard, Version Control, Collaboration, Plugins, Pages Manager and Database Studio are still bundled and reachable from `EditorShell`. The `/database` route and panel are blocked by string matching. | `EditorShell.tsx:291-296, 466-473, 1007, 1236` | 6 |
| AUD-23 | S3 | Two roadmaps (`Initial/ROADMAP.md` and `After/Detailed Roadmap.md`) number different work as the same phase ("Phase 7", "Phase 8") and both mark it complete against the same code. | both files | 6 |

### H. Documentation Drift

| ID | Sev | Finding | Evidence | Fix Phase |
|---|---|---|---|---|
| AUD-24 | S4 | The docs say "Next.js 15" but the project runs `next@16.3.4` / React 19.2. `AGENTS.md` warns that Next 16 APIs differ. | `package.json` | 6 |
| AUD-25 | S4 | The product has several names: Visual Motion & Frontend Design Studio, LazyLayout, WebAPPBuilder, WebGen, and `"name": "engine"` in `package.json`. | docs and `package.json` | 6 |
| AUD-26 | S4 | Stale cross-links: many docs point to `DOCS/ROADMAP.md`, `DOCS/PRD.md` and so on from before the move into `After/` and `Initial/`. `After/Roadmap_after.md` calls itself `ROADMAP_EXISTING.md`. | grep | 6 |
| AUD-27 | S4 | The repository tracks `DOCS.zip` (213 KB), which duplicates the `DOCS/` folder. | `git ls-files` | 6 |
| AUD-28 | S3 | The GSAP "Competitive Products" licensing question (spec §11) is still open, yet v1.1 planned GSAP as the primary authoring engine. It must be resolved before GSAP ships inside the editor. | `ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md` §11 | 14 |

### I. Studio Architecture (added 2026-09-24 for ROADMAP v2.1, audited at `098c859`)

Checked by reading the source after Phase 2. These gaps block the target of a Figma / Wix Studio canvas with an After Effects timeline (ROADMAP §4.1).

| ID | Sev | Finding | Evidence | Fix Phase |
|---|---|---|---|---|
| AUD-29 | S1 | **The stage is an HTML string in `<iframe srcDoc>`.** `buildSandboxDocument()` regenerates the whole document from `layers`, so every edit reloads the iframe. Its markup is hand-written per archetype and separate from the export emitters, so preview and export can differ. | `SandboxHost.tsx:79` (`generateElementMarkup`), `:279` (`buildSandboxDocument`), `useMemo` over `elements` | 48 |
| AUD-30 | S1 | **There is no global clock.** The playhead is local `useState` in the Sequencer. Its rAF loop calls `setState` every frame (re-rendering the whole panel), and only the selected layer's active clip is previewed. | `MotionSequencer.tsx:222` (`currentTime`), `:314-334` (rAF loop) | 45 |
| AUD-31 | S2 | **Layers have no geometry.** There is no x, y, width, height or rotation in the MDM; position comes from flexbox in the generated HTML. There is one fixed artboard. | `schema.ts` `LayerSchema`; `SandboxHost.tsx` flex markup | 42, 49, 50 |
| AUD-32 | S2 | **Three property vocabularies.** Static props use flat keys (`backgroundColor`), tracks use dot-paths (`transform.y`), and presets use a third form (`transform.translateY` ×9, `transform.translateX` ×6). The scrub hot-patch only handles `transform.x/y`, so preset slide motion is invisible when scrubbed. | `registry.ts` defaults; `src/core/motion/presets/*`; `MotionSequencer.tsx:248-285` | 42 |
| AUD-33 | S2 | Stage updates are posted to **every iframe on the page** with target origin `"*"`. | `MotionSequencer.tsx:292` (`document.querySelectorAll("iframe")`), `HotReloadEngine.ts:195` | 48 |
| AUD-34 | S2 | **One store holds everything.** `useProjectStore.ts` (1,539 lines) holds the document plus blueprints, databases, pages, redirects, environment and history; undo snapshots the whole project; there are no transactions for gestures. | `useProjectStore.ts:102-271` | 41 |
| AUD-35 | S3 | The shell's dock layout is 22 local `useState` calls in a 2,081-line component. Nothing is persisted, and the bottom tabs are hard-coded. | `EditorShell.tsx` | 44 |
| AUD-36 | S2 | **There is no composition model.** Clips are per-layer, trigger-started snippets with no composition (duration, fps, work area, markers), no layer in/out points and no nesting. An After Effects-style timeline has nothing to show. | `schema.ts` `ClipSchema` | 46 |
| AUD-37 | S3 | There is no asset pipeline. Image defaults are hard-coded remote URLs; there are no video or audio layers. | `registry.ts:102` (`IMAGE_SRC`) | 54 |
| AUD-38 | S2 | **Scrubbing ignores easing.** `interpolateTrackValue` is linear only (it never reads `keyframe.ease`), re-sorts keyframes every frame and parses numbers from strings, so scrubbing doesn't match playback or export. | `MotionSequencer.tsx:137-162` | 9, 45 |
| AUD-39 | S2 | **The Content Browser's Animation panel (open by default in the bottom drawer) keeps its tracks in local React state**, seeded from `INITIAL_ELEMENT_TRACKS`, not in the document. Its edits (duration, delay, easing, deltas) are lost on reload, don't undo, and don't export. That's a parallel animation model, against the One Document Law. Found during Phase 3. | `ContentBrowser.tsx:375` (`useState(INITIAL_ELEMENT_TRACKS)`), `:1016` (`handleUpdateTrackField`) | 23, 52 |
| AUD-40 | S1 | **The Code view and Export Preview don't show the user's animation.** The Live Code Inspector emits only `animationSamples` (the separate v1.1 model), never `document.clips`, so a Sequencer keyframe never appears in the code. Export Preview prints canned sample code per archetype. Found during Phase 3 (AUD-05 regression). | `LiveCodeInspector.tsx:90-93`; `AnimationExportPreview.tsx:64+` | 7, 27 |
| AUD-41 | S2 | **The Sequencer's playback loop can't be driven deterministically.** Its `requestAnimationFrame` loop starts unconditionally at mount (not gated on `isPlaying`) and reads real `performance.now()` for `dt`. Installing Playwright's fake clock mid-session (Phase 4.1) and then starting playback produces wildly inconsistent `currentTime` deltas run to run (measured 400ms–1300ms of playhead advance for the same 400ms of virtual time), because the pre-existing loop's closure captured a real timestamp before the fake clock existed. Isolated `performance.now()`/rAF control (no Sequencer mounted) is fine, deterministic within about one frame. Exact-time seeking works today only via a direct seek (the ruler click, `onLaneClick`), not via clock-driven playback. Found while building the Phase 4.1 harness. | `MotionSequencer.tsx:313-335` | 45 |
| AUD-42 | S4 | **Not a product defect — a test-harness calibration gap.** The Phase 4.3 pixel-parity threshold (`MAX_DIFF_RATIO`, spec default ≤ 1%) was too tight for real cross-platform headless-Chromium rendering: PR #7's first CI run (ubuntu-latest) measured a deterministic 2.39% diff at one sample (t=0.75 of 5), reproduced identically on retry, while the same test measured an exact 0% match on all 5 samples locally (macOS). This is software-rasterizer/sub-pixel rendering variance between platforms, not an exporter or animation bug — the actual "wrong easing" regression this gate exists to catch diverges far more (the compared element's bounding box itself differs, short-circuiting the comparator to its size-mismatch path). Fixed in the same PR: threshold raised to 4% with the measurement recorded in `parity.spec.ts`. Separately, `tests/export-harness/build.mts`'s `check()` accepted a `detail` string but never printed it on failure, so a real `tsc`/bundler error was silently swallowed as a bare "FAIL" — also fixed in this PR (detail is now printed). | `tests/export-harness/parity.spec.ts`, `tests/export-harness/build.mts` | 4 (closed by this PR's CI run) |
| AUD-43 | S3 | **The export-harness `nextjs-app` fixture only ever typechecked on a machine that had already run `next build`/`next dev` there once.** Next.js's ambient `declare module '*.module.css'` (needed to import the exporter's CSS-module output) lives behind `next-env.d.ts`'s `/// <reference types="next" />`, and that file is (a) auto-generated only by `next build`/`next dev`, never by `tsc` alone, and (b) gitignored. `build.mts` runs `typecheck` *before* `build` (by design, to fail fast) on every element that imports a `*.module.css` file, so on a genuinely fresh checkout (PR #7's first real CI run, ubuntu-latest) the very first `typecheck` failed with `TS2307: Cannot find module './*.module.css'` for all 4 reference elements. It silently passed on every local run to that point only because a `next-env.d.ts` left over from an earlier manual `next dev`/`next build` in that fixture directory was still on disk — a stale artifact, never a clean checkout. Reproduced deterministically by stripping `next-env.d.ts`, `.next/`, and `tsconfig.tsbuildinfo` before typechecking a freshly-exported `components/`. Fixed in the same PR: the fixture's `next-env.d.ts` is static boilerplate (references `next`'s and `next/image-types`'s ambient types only, no generated `.next/types/*` imports), so it's now committed and un-gitignored instead of relying on generation. | `tests/export-harness/fixtures/nextjs-app/next-env.d.ts`, `.gitignore` | 4 (closed by this PR's CI run) |

### J. Production Readiness (added 2026-09-26 for ROADMAP v3.0, audited at `ae61f2c`)

The review asked: if every v2.1 phase reached ✅, would LazyLayout work in production as intended? The intended product is a Figma / Wix Studio canvas with Unreal-style Blueprint logic and export of whatever the user designs, including React Bits-grade interactive effects. The answer was no. These findings are why. The methods were source reading and `grep` over `src/`, reading the Initial and After docs, and checking licence and platform facts on the web. The date on each fact is 2026-09-26.

| ID | Sev | Finding | Evidence | Fix Phase |
|---|---|---|---|---|
| AUD-44 | S1 | **Completing ROADMAP v2.1 would not deliver the stated product.** PRD §1.5 limits a document to one element or effect. ROADMAP §8 (v2.1) defers logic Blueprints, component/page design, CMS and publishing to the After track, whose phases are marked ✅ without real-environment gates. | PRD §1.5; ROADMAP §8 (v2.1); `DOCS/After/Detailed Roadmap.md` phase table | 72–74, 75–79, 87 |
| AUD-45 | S1 | **The grammar cannot express reactive effects, the product's flagship.** 3.E.3 makes Canvas opaque and blocks Hover/Press/StateTransition on it. There is no continuous, pointer-driven category: Hover is only an enter/exit pair (4.3). 12.6 states that cross-element bindings aren't expressible. PRD §4 lists `pointerMove` triggers and behaviours, but the grammar doesn't, so Phase 8 would compile a rule table that forbids "a background that reacts to the cursor". | `lazylayout_element_grammer.md` 3.E.3, 4.3, 12.6 | 8, 59, 60, 72 (grammar §13, v0.2) |
| AUD-46 | S2 | **No GPU effect runtime exists.** No source under `src/` creates a WebGL/WebGPU context or imports `three`, `ogl` or `@react-three/*`. Only `ThreeSceneEmitter.ts` emits R3F import *strings*. There is no shader, particle or simulation code. Phase 19 plans shaders and particles in three sub-phases, with no compositor, render targets, simulations, texture sources or cursor layers. | `grep` for `getContext("webgl…")`, `from "three"`, `WebGLRenderer` | 61–66 |
| AUD-47 | S2 | **The engine spec's default routing depends on GSAP, which the licence rules out.** The spec's §6.1 routes Entrance, ScrollLinked and Stagger to GSAP, and §7.5 drives canvases from `gsap.ticker`. GSAP's Standard License defines Prohibited Uses as "any implementation and/or use of GSAP Products in tools that allow users to build visual animations without code that encourages, induces, or materially assists in creating a solution that competes with Webflow's visual animation building capabilities". | `ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md` §6.1, §7.5; gsap.com standard license; `LICENSES.md` GATE-01 | 8.3, 14 |
| AUD-48 | S2 | **The kernel's purity assumption doesn't cover stateful effects.** Law 3 and Phase 9 define `evaluate(doc, layerId, t, inputs)` as pure. Fluid, particle, spring-grid and trail effects depend on their history, not only on `t`. Scrubbing, parity (4/27) and the render queue (55) have no defined behaviour for them. | ROADMAP §2 Law 3, Phase 9 | 64, 9 (amendment) |
| AUD-49 | S2 | **The planned GPU layers would exceed browser context limits.** 18.1 plans an R3F canvas per `scene3d` layer, 19.1 a canvas per shader layer, and 25.1 live thumbnails for every library effect. Browsers cap live WebGL contexts (Chrome: 16 on desktop, 8 on Android) and silently lose the oldest. A library gallery, or a multi-frame canvas (49.2/50.4), would exceed that. | ROADMAP 18.1, 19.1, 25.1 | 61 (Surface Budget Law), 25/49 amendments |
| AUD-50 | S2 | **The Blueprint language has no motion or interaction vocabulary, and its compiler is unverified.** The node vocabulary in `src/core` covers events, flow, variables, database, API, navigation, maths and utility, plus a single `ui/render`. It has no motion, state, signal or effect nodes. `src/compiler/blueprint-to-js/index.ts` re-exports `LogicFlowEmitter.ts` (async business-logic strings, 378 lines) and `ApiRouteEmitter.ts`, and none of it is exercised in a browser or a build. The Blueprint canvas and NodeScript are After-track code behind the `full` edition flag, and their `DOCS/After` ✅ claims predate the Real-Environment Verification Law. | `grep` of node type IDs in `src/core`; `src/compiler/blueprint-to-js/index.ts` | 72–74, 87 |
| AUD-51 | S2 | **Nothing is planned for running the product as a service.** There are no accounts, cloud storage, share links, error reporting, usage metering or billing, and none are planned. Security is a single release-gate item (40.3). The only telemetry is the planned status-bar frame read-out (56.4). The AI route (30), which holds a server-side key, would face the internet with only per-request limits. | ROADMAP 30.1, 40.3, 56.4 | 80–83 |
| AUD-52 | S3 | **The two rule sources that Phase 8 compiles disagree.** Badge: grammar 3.A.6 blocks Hover and allows StateTransition; spec §7.1 allows Hover and blocks StateTransition. Spinner: the grammar allows Ambient only, with 1 track; the spec allows Entrance/Exit/Ambient, with 2 tracks. Track caps differ for Link (4 vs 3), Avatar (4 vs 3) and Container (5 vs 4), and Container's Press is conditional in one source and blocked in the other. Spec §13.5 lists "Media & Data" types (Table, List, Chart) that the grammar doesn't define. | Grammar §3/§9 vs spec §7.1–§7.2, §13.5 | 8.5 |
| AUD-53 | S3 | **Saved projects can be evicted.** Projects live in IndexedDB (Phase 3), but the app never calls `navigator.storage.persist()`, so browsers may evict best-effort storage under pressure. There is no cloud copy. | `grep "storage.persist"` → none | 81 (the persist request can land earlier) |
| AUD-54 | S3 | **The planned library is small next to the reference market, and doesn't scale.** PRD §5.2 and Phase 25 target ≥ 40 effects with 7 backgrounds. The reference catalogue the PRD names (React Bits) lists 200+ components, dozens of them backgrounds. Hand-building each effect as bespoke code for 5 export targets doesn't scale to a competitive library, and there is no way to bring your own component. | PRD §5.2; ROADMAP 25.3; reactbits.dev | 25 (amendment), 67, 68, 70 |
| AUD-55 | S3 | **Performance gates don't cover phones.** PRD §11.3 and Phase 26 define budgets on "a 2020-class laptop". Nothing measures exported effects on phones, where GPU, thermal and memory limits (and the 8-context cap) apply. | PRD §11.3, §13; ROADMAP 26.1 | 84, 26 (amendment) |
| AUD-56 | S2 | *(added with ROADMAP v3.1)* **Interactions can be picked but not composed.** The reference interaction can't be built by a user: an invisible circle follows the mouse by a chosen point, a card's text is split into letters with one click, and a rule makes the letters flee the circle and spring back. The model has no logic-only (helper) layers (51.2's null layers are compositing-only), no follow pins beyond the transform anchor, and no split into real, rule-addressable layers (17.1 splits for animation only). It has no fields or effectors, and no colliders or bodies on DOM layers (64.2's rigid bodies live inside effect surfaces). The Blueprint vocabulary (v3.0 72.2 and the After-track node set) has no overlap or contact events and no group/tag targets. So the interaction exists only if someone ships it as a finished library effect. | ROADMAP v3.0 Phases 17.1, 51, 64.2, 72.2; grammar §13 (v0.2) | 88–91; 17, 25, 51, 60, 64, 72, 74 (v3.1 amendments); grammar §14 (v0.3) |
| AUD-57 | S2 | *(added with ROADMAP v3.2)* **A step-by-step trace of the reference build through ROADMAP v3.1 found 8 gaps**, listed in ROADMAP §4.2 (v3.2 addendum):<br>**G1** Parametric shapes (ellipse, rectangle) existed only as a by-product of shape recognition (36.2, Stage 7); the registry has no shape archetypes.<br>**G2** Track K's types were missing from the model's type pass (7.5).<br>**G3** Springs were authored as stiffness/damping, and Track X/K parameters had no no-math face.<br>**G4** A rule mentioning overlap didn't create the colliders or fields it needs.<br>**G5** The evaluation space for kinetics across nested or rotated parents was undefined.<br>**G6** There were no draggable bodies, runtime spawning or sound actions.<br>**G7** Only one build was tested.<br>**G8** §5.1 overstated how early the no-code journey is demonstrable. | `src/core/document/registry.ts` archetype list; ROADMAP v3.1 7.5, 9.1, 36.2, 73.1, 88–91, §5.1 | 7.5–7.6, 9.1, 20, 22, 36, 60, 72, 73.5–73.6, 88.4, 89.4, 90.4–90.6, 91.2, 91.7 (v3.2 amendments); ROADMAP Law 17 |
| AUD-58 | S2 | *(added with ROADMAP v3.3)* **GPU memory was not budgeted.** v3.2 limited GPU *contexts* (Surface Budget Law) and handled their loss (§7.7), but not how much GPU and canvas memory a page uses. Running out causes context loss on any device and tab reloads on iPhones. The plan had no texture-size caps or GPU-compressed textures, and no resolution limits or pooling for simulation, feedback and post render targets. It had no three.js disposal rules (three.js frees geometries, materials, textures and render targets only on `dispose()`, and its loader caches keep assets alive), and no handling of Safari's per-canvas pixel limit (about 16.7 M pixels) or older iOS versions' total canvas-memory cap. There was no rule against per-frame JavaScript allocations, no leak test beyond releasing contexts (FX-EXP-04), and no field detection of memory tab kills. It also didn't say that three.js is only for real 3D, so three.js could have become the default GPU path. | Engine spec v1.2 §7.3–§7.7; ROADMAP v3.2 18, 54, 61, 64, 84.3 | 8.3, 18, 26, 54, 56, 61.5, 64, 69, 71.5, 82.2, 84.3 (v3.3 amendments); Surface Budget Law extended; engine spec §7.8–§7.9 and FX-MEM-01 … 06 |
| AUD-59 | S3 | *(added with Phase 8, 2026-09-26)* **The real, schema-validated motion model speaks a different vocabulary than the grammar and legacy engine Phase 8 compiles.** Phase 7's `Clip.type` is one of 6 `ClipType`s (`entrance`, `hover`, `tap`, `scroll`, `loop`, `morph`); the grammar has 10 `AnimationCategory`s and `ElementGrammarEngine` still operates on the pre-Phase-7 `AnimationBinding`/`TriggerType` shape. Four grammar categories have no schema representation at all: **Exit** (no leave-trigger distinct from entering), **Focus** (a `Trigger`, not a `ClipType`), **Stagger** (a modifier on `Clip.stagger`, not its own category) and **LayoutTransition** (nothing yet). `pointerMove`/`drag`/`time` triggers also have no lossless `TriggerType` equivalent. | `src/core/document/motion.ts` `CLIP_TYPES`/`TRIGGERS` vs `src/core/types/element-grammar.ts`; decision 0005 §3 | 8 (documented, not closed), a future schema amendment for Exit/Focus/Stagger/LayoutTransition |

---

## 3. What Is Genuinely Solid (Keep and Build On)

The audit is not a teardown. These parts are real, tested, and worth keeping:

- **Pure math modules.** Spline solving (TS path), path morph point normalisation (`PathMorphSolver.ts`), SVG arc-length sampling, quaternion and matrix math (`Scene3DEngine.ts`), and spring baking into CSS `linear()` (`AnimationLoweringCompiler.ts`). These become the deterministic `evaluate(t)` kernel in Phase 9.
- **The specifications.** The element grammar, the animation property catalogue and the engine conflict protocols (Single Transform Authority, priority arbitration) are thorough. They need to be *executed* (Phase 8), not rewritten.
- **The preset catalogue.** 51 presets across 4 families is a good seed for the Effects Library (Phase 25).
- **The approval-gate UX.** Ghost keyframes plus Accept/Discard (`DiffPreview.tsx`) is the right pattern and carries into the real AI (Phase 31).
- **The shell.** Docking, splitters and tokens work. They get simplified, not replaced.
- **The test habit.** 594 tests is a strong culture to build on. They need real-environment gates added.

---

## 4. Audit → Phase Traceability

| Phase (ROADMAP v2) | Closes |
|---|---|
| 1 Build Health & CI | AUD-01, AUD-02, AUD-03 |
| 2 Unified Motion Document Model | AUD-04, AUD-05, AUD-07 |
| 3 Store, History & Persistence | AUD-05, AUD-08 |
| 4 Real-Environment Verification Harness | AUD-15, AUD-16 |
| 5 Dependency Reality & Wasm Decision | AUD-10, AUD-11, AUD-12 |
| 6 Scope, Naming & Docs Cleanup | AUD-22 … AUD-27 |
| 8 Executable Motion Rules Engine | AUD-06 |
| 10 Live Preview Runtime | AUD-09 |
| 11 States & Interaction | AUD-14 |
| 14 GSAP Integration | AUD-09, AUD-28 |
| 15 Motion Integration | AUD-10 |
| 18 Three.js / R3F | AUD-11 |
| 20 Figma-Grade Stage | AUD-19, AUD-20 |
| 22 Simplified Properties Panel | AUD-20, AUD-21 |
| 24 Animation Playground | AUD-20 |
| 26 Performance Lab | AUD-13 |
| 27 Verified Export Pipeline | AUD-15, AUD-16 |
| 29 Accessibility & Reduced Motion | AUD-14 |
| 30 Real LLM Integration | AUD-17, AUD-18 |
| 35 Drawing Tools | AUD-19 |
| 39 Simple Mode | AUD-21 |
| 41 Store Decomposition & Transactions | AUD-34 |
| 42 Property Paths & Geometry | AUD-31, AUD-32 |
| 44 Workspace Architecture | AUD-35, AUD-21 |
| 45 Transport & Frame Scheduler | AUD-30, AUD-38, AUD-41 |
| 46 Compositions & Nesting | AUD-36 |
| 48 Stage Renderer v2 | AUD-29, AUD-33 |
| 49 Viewport Engine | AUD-31 |
| 50 Auto-Layout & Breakpoints | AUD-31 |
| 54 Asset Pipeline | AUD-37 |
| 23/52 Timeline | AUD-39 |
| 27 Verified Export Pipeline (AUD-40) | AUD-40 |
| 8 Executable Motion Rules Engine (v3.0 amendment, 8.3/8.5) | AUD-47 (routing half), AUD-52 |
| 14 GSAP Integration (v3.0 amendment) | AUD-47 (licence half) |
| 25 Effects Library (v3.0 amendment) + 67 Effect SDK + 70 AI Effect Author | AUD-54 |
| 59 Signals & Input Bus + 60 Signal Bindings | AUD-45 |
| 61 GPU Surface Compositor | AUD-46 (runtime half), AUD-49 |
| 62–66 Shader Graph, Particles, Simulations, Textures, Cursor Layer | AUD-46 |
| 64 Stateful Simulations & Deterministic Replay | AUD-48 |
| 72–74 Interaction Blueprints | AUD-50, AUD-45 (cross-element half), AUD-44 (logic half) |
| 75–79 Components, Sections, Pages, Content, Site Export | AUD-44 |
| 80–83 Security, Accounts, Operations, Metering | AUD-51, AUD-53 |
| 84 Device & Browser Matrix | AUD-55 |
| 87 Release 3 Re-baseline | AUD-50 (After-track half), AUD-44 (apps half) |
| 88–91 Kinetic Composition (+ v3.1 amendment to 72) | AUD-56 |
| v3.2 amendments (7.5–7.6, 9.1, 20, 22, 36, 60, 72, 73, 88–91) + Law 17 | AUD-57 |
| v3.3 amendments (8.3, 18, 26, 54, 56, 61.5, 64, 69, 71.5, 82.2, 84.3) + Surface Budget Law memory clause | AUD-58 |
| 8 Executable Motion Rules Engine (own finding, 2026-09-26) | AUD-59 |

---

## 5. Resolution Status

A finding is **Closed** only when the phase that owns it passes its Verification Gate (ROADMAP §3). Partial progress made by an earlier phase is recorded here so the owning phase doesn't redo it.

| ID | Status | Notes |
|---|---|---|
| AUD-01 | ✅ Closed | `tsc --noEmit`: 162 → 0 errors (baseline in `audit/tsc-baseline.txt`). `npm test` now runs `typecheck` first. Closes when Linux CI is green. |
| AUD-02 | ✅ Closed | ESLint: 179 → 0 errors, 494 → 467 warnings. Warning budget enforced by `--max-warnings`. Closes when Linux CI is green. |
| AUD-03 | ✅ Closed (by convention) | CI runs on every push/PR. `main` merges only through PRs with a green `verify` check. Technical enforcement needs GitHub Pro (private repo); add the required check when available. |
| AUD-04 | ✅ Closed (Phase 2) | One model: the MDM v2 `MotionDocument` (`src/core/document/`). `ProjectElement`, `BaseElementNode`, `AttachedAnimation` and `ElementType` are deleted; a test enforces it. |
| AUD-05 | ✅ Closed (Phases 2–3; CI green on PR #7) | Model half: animations live in `document.clips`, and the Sequencer reads and writes them (Phase 2). Behaviour half: a Sequencer keyframe is undone everywhere the document is read, including after a reload, verified by unit tests and the browser gate. The Code view / Playground checks moved to Phases 27 / 24 (see AUD-40). |
| AUD-06 | ✅ Closed (Phase 8) | The registry links every archetype to its grammar type and derives legal states from it. `src/core/rules/` gives the UI a single `rules.canAdd`/`canAddFromBindings` query surface operating on the real document; `ContentBrowser.tsx`, `AnimationEditor.tsx` and `OutputConsole.tsx` all call it instead of the engines directly, enforced by `check:no-adhoc-compat` in CI. The grammar is no longer "only exercised by tests." |
| AUD-07 | ✅ Closed for document entities (Phase 2) | All layers, clips, tracks, keyframes and states use `createId()` (prefix + 8 hex, `crypto.getRandomValues`), including both cited sites. Non-document runtime records (history, diagnostics, runs, pages) still use ad-hoc ids. |
| AUD-08 | ✅ Closed (Phase 3; CI green on PR #7) | Projects and undo history live in IndexedDB (moved from localStorage once); debounced autosave; crash-recovery journal; versioned `.lazy.json` export/import with migration. Browser-verified in Chromium, Firefox and WebKit. |
| AUD-10 | ✅ Closed (Phase 5; CI green on PR #8) | `motion@13.4.3` installed (`npm ls motion` resolves); code-split obligation documented for the phases that actually import it (10, 15). |
| AUD-11 | ✅ Closed (Phase 5; CI green on PR #8) | `three`, `@react-three/fiber`, `@react-three/drei` installed. `Scene3DViewport.tsx`'s fake `getContext("2d")` "WebGL" renderer and its dead `webglcontextlost`/`webglcontextrestored` listeners are deleted, replaced with an honest "Phase 18" placeholder; the 3D layer kind was already unreachable in the editor (no add-layer UI lists `object3D`/`camera3D`/`light3D`), so no feature flag was needed. `StudioHeader.tsx`'s hardcoded "C++ WebAssembly Engine linked" badge (which never reflected reality) is now a static, honest "TypeScript 120 FPS" per the AUD-12 decision. |
| AUD-12 | ✅ Closed (Phase 5; CI green on PR #8) | Evidence-based Wasm go/no-go call: **No-Go** (`DOCS/Initial/decisions/0001-wasm.md`). The kernel had never actually compiled (missing SIMD header, missing namespace, bindings referencing non-existent methods/fields); fixed to get a real build and benchmark it in real Chromium. Per-wire calls: Wasm ~0.67x TS speed (slower). Batched (best case): ~1.93x, never reliably ≥ 2x. `wasm/` archived to `DOCS/Initial/decisions/0001-wasm-archive/`; `build:wasm` removed from `package.json`; TypeScript (`SplineSolver.ts` et al.) is the permanent sole implementation. |
| AUD-22 | ✅ Closed (Phase 6; CI green on PR #9) | The 6 After-track panels reachable from `EditorShell` (Blueprint, Execution Trace, Deployment, Pages Manager, Plugin Manager, Version Control) are now gated behind `edition === "full"` (`src/core/flags.ts`, `src/editor/shell/afterTrackPanels.tsx`) via a `dynamic(() => import(...))` branch that's dead-code-eliminated out of an `edition=initial` build — not just runtime-hidden. Verified by resolving the actual chunk graph Next registers for the `/editor` route and confirming a marker string unique to each panel's source is absent (`npm run check:bundle-scope`, wired into CI). Database Studio and Collaboration were already unreachable (no call sites), so no gate was needed for them yet. The `panelParam`/`panelId` string-matching `database` guards in `EditorShell.tsx` are removed; `/database` still just redirects to `/editor` (unchanged, already correct). |
| AUD-23 | ✅ Closed (Phase 6; CI green on PR #9) | Every file under `DOCS/After/` (both roadmaps included) now carries a banner: "Full-vision track. Not the active roadmap; see DOCS/Initial/ROADMAP.md." `After/Roadmap_after.md` (which called itself `DOCS/ROADMAP_EXISTING.md`, a path that never existed) is renamed to `DOCS/After/ROADMAP_EXISTING_PROJECT_IMPORT.md` with its self-reference fixed. `DOCS/Initial/ROADMAP.md` remains the one document a reader should treat as authoritative for phase numbering. |
| AUD-24 | ✅ Closed (Phase 6; CI green on PR #9) | "Next.js 15" → "Next.js 16" in `FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md`, `PANELS.md`, `UI.md` (current-state docs). Left as-is in `CHANGELOG.md`'s dated log entries, which record what a past phase actually built at the time — rewriting that would misrepresent history, not fix it. |
| AUD-25 | ✅ Closed (Phase 6; CI green on PR #9) | One name: **LazyLayout**. `package.json` `"name"`: `"engine"` → `"lazylayout"`. All "Visual Motion & Frontend Design Studio" headers/prose in `DOCS/Initial/*.md` → LazyLayout. "WebAPPBuilder"/"WebGen" product-name strings baked into compiler emitter output (`PrismaSchemaEmitter`, `GSAPAnimationEmitter`, `StyleEmitter`, `ReactComponentEmitter`, `LogicFlowEmitter`, `ApiRouteEmitter`, `GitExporter`, `AssetFileEditor`) → LazyLayout — these ship inside every exported user project, so this was a real naming leak beyond just docs. Page titles/metadata and a stale `StudioHeader.tsx` doc comment fixed; the launcher and header brand UI were already correctly LazyLayout-branded. |
| AUD-26 | ✅ Closed (Phase 6; CI green on PR #9) | No stale pre-move `DOCS/ROADMAP.md`/`DOCS/PRD.md`-style links found under `DOCS/Initial/` beyond this finding's own example text. Two `file:///Users/pranav/...` absolute links, hardcoded to one contributor's home directory (would 404 in CI or for any other contributor) found and converted to relative links in `ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md`. `After/Roadmap_after.md`'s self-reference to the nonexistent `DOCS/ROADMAP_EXISTING.md` fixed as part of its Phase 6/AUD-23 rename. New `npm run check:doc-links`, wired into CI, checks this going forward (123 links, 0 broken as of this phase). |
| AUD-27 | ✅ Closed (Phase 6; CI green on PR #9) | `DOCS.zip` untracked (`git rm --cached`, local file kept) and added to `.gitignore` so it can't be re-added by accident. |
| AUD-15 | Partial (Phase 4 infrastructure ✅, CI green on PR #7) | Exported code is now actually compiled, built and run: `tests/export-harness/build.mts` drops real `CrossFrameworkExporter` output into pinned Next/Vite-React/Vite-Vue fixtures and runs `typecheck` + `build`; `tests/export-harness/parity.spec.ts` runs the real `GSAPAnimationEmitter` output in 3 real browsers and diffs it against an independent oracle. Found and fixed real bugs along the way (`TextEmitter.ts:87`; the harness's own AUD-42/AUD-43). What's still open, and stays open until Phase 27: the React/Vue/Next exporters don't wire animation into their output end to end (only the vanilla+GSAP path the parity harness needs does), so this is infrastructure, not the "verified export pipeline" itself. |
| AUD-16 | Partial (Phase 4 infrastructure ✅, CI green on PR #7) | The pixel-parity comparator exists and is proven (18/18 passing across Chromium/Firefox/WebKit, on real CI hardware — see AUD-42 for the threshold this took): a wrong-easing injection fails it, a correct export passes it. It compares the export against an independent oracle, not the editor Playground (Phase 24 hasn't built it yet) — the literal editor-vs-export comparison is Phase 27's. |
| AUD-31 | ✅ Closed for the model (Phase 42; CI green on PR #11) | Every visual layer has geometry (`frame.*`, `sizing.*`, `positioning`, canonical paths with derived defaults, `getLayerGeometry()`); the document-level artboard became the top-level frames. Position still *renders* from flexbox until the Phase 48 renderer and Phase 49 viewport read it; this closes the model half. |
| AUD-32 | ✅ Closed (Phase 42; CI green on PR #11) | One vocabulary end to end: schema v3 stores and validates only canonical `properties.ts` paths; v2 → v3 migrates props, states, tracks and presets (`transform.translateY` → `transform.y`). The scrub regression is a test (`property-gate.test.ts`). |
| AUD-36 | ✅ Closed (Phase 46; CI green on PR #14) | **Phase 46** added the composition model: `main` and interaction compositions, layer time bars (in/out, stretch), precomps with time remap, markers, and golden-tested time maths (schema v5, decision 0002). |
| AUD-41 | Open, tracked | New finding from Phase 4.1: the Sequencer's `requestAnimationFrame` loop can't be driven deterministically by a fake clock (up to 3× swings measured). `deterministic-clock.spec.ts` Case 3 keeps this falsifiable. Closes with Phase 45. |
| AUD-42 | ✅ Closed (Phase 4; PR #7) | Pixel-parity threshold raised 1% → 4% with the measurement that justified it recorded in `parity.spec.ts`. |
| AUD-43 | ✅ Closed (Phase 4; PR #7) | `tests/export-harness/fixtures/nextjs-app/next-env.d.ts` is now committed (static boilerplate) instead of relying on `next build`/`next dev` to generate it, which never happens before the harness's own `typecheck` step on a fresh checkout. |
| AUD-44 | Open, planned | ROADMAP v3.0 schedules it: Track L in Release 1; Track W (75–79) in Release 2; Phase 87 re-baselines Release 3. PRD v2.1 §1.5 records the release scope. |
| AUD-45 | Open, Phase 8's half done | The grammar-level fix is written (`lazylayout_element_grammer.md` v0.2 §13) and now compiled into the rule table: the Reactive category and the 7 3.F effect-surface types are in `TYPE_REGISTRY` and asserted against grammar §9/§13.5/§13.6's full matrix (Phase 8). The rule table can express "a background that reacts to the cursor" today. What's still missing is the *runtime* — Phases 59 and 60 (Signals & Input Bus, Signal Bindings) — before a Reactive binding can actually run. |
| AUD-46 | Open, planned | Track X (61–66). |
| AUD-47 | ✅ Closed for the routing/licence half (Phase 8); the §7.5 canvas-ticker half stays open for Phase 18 | The GATE-01 mitigation (GSAP is never in the editor) holds. `src/core/rules/routing.ts` routes today's property catalogue lightest-first and can never return a GSAP backend by construction (`RouteBackend` has no `"gsap"` member), scored against device tiers with an explained downgrade; live GPU-budget telemetry is Track X's job (59–61), but the decision tree itself is complete and tested. The spec's §7 tables are corrected in place (8.5, decision 0005). |
| AUD-48 | Partial (Phase 9's half done) | `evaluate()` (`src/core/kernel/evaluate.ts`) is now a genuinely pure function of `(doc, compositionId, layerId, t, inputs)`, fuzz-tested for it (200 random samples, byte-identical repeats). It stays honest about what it doesn't cover: the behaviours step evaluates only `loop` (stateless); `follow-pointer`/`magnet`/`tilt`/`inertia`/`noise`/`spring-to` and stateful simulations are named in `KERNEL_GAPS`, not faked. Closes fully with Phase 64's deterministic replay (decision 0006, reserved) and the Phase 9 v3.0 amendment (signal bindings, input tape). |
| AUD-49 | Open, planned | Phase 61 (Surface Budget Law), plus the 25.1 and 49 amendments. |
| AUD-50 | Open, planned | Track L (72–74) for interactions; Phase 87 for the After-track logic and its claims. |
| AUD-51 | Open, planned | Track P (80–83). |
| AUD-52 | ✅ Closed (Phase 8) | All 5 named contradictions resolved grammar-wins, with a table-driven test (`src/core/rules/__tests__/reconciliation.test.ts`, decision 0005). The engine spec's §7 per-type tables and §13.5 are corrected in place. The ⚠️/🔒 conditional/subsumed tier the type system never modelled (Container's Press and 6 other cells) is added (`conditional-gates.ts`), verified against grammar §9's full 320-cell matrix plus §13.5/§13.6's 109 v0.2 cells. Phase 8's Verification Gate (compatibility matrix, Playwright "illegal animation" test, editor grep gate) is green. |
| AUD-53 | Open, planned | Phase 81.2. The one-line persist request can land earlier. |
| AUD-54 | Open, planned | The Phase 25 v3.0 amendment (≥ 80 effects), 67, 68 and 70. |
| AUD-55 | Open, planned | Phase 84, plus the Phase 26 v3.0 amendment. |
| AUD-56 | Open, spec written | The grammar is `lazylayout_element_grammer.md` v0.3 §14 (helpers, pins, Split and Clone groups, fields, colliders, bodies, rules 6.17–6.24, overlap and contact events). The engine design is `INTERACTIVE_EFFECTS_ENGINE_SPECIFICATION.md` §8.6, §10.8 and §12.7 (the reference build). It closes when Phases 88–91 and the v3.1 amendment to 72 pass their gates. |
| AUD-57 | Open, in progress | Every gap has a v3.2 fix in the plan. **Phase 7 (✅, CI green on PR #13) delivered G1 and G2:** the six shape archetypes (7.6) and Track K's types in the model (7.5). It also types the perceptual spring (`{ bounce, time }`) that 9.1 will evaluate. It closes when 7.6, 9.1's perceptual springs, 73.5, 88.4, 89.4, 90.4–90.6, 91.2 and the 91.7 composition suite pass their gates, and when the Law 17 label check is green in CI. |
| AUD-58 | Open, planned | Designed in engine spec §7.8–§7.9 (FX-PERF-07, FX-MEM-01 … 06). It closes when the 61.5 ledger and budgets exist, the leak and stress tests (61, 71.5) pass, the 18 GLTF leak test passes, the 84.3 soak passes on the named low-end iPhone and Android devices, and 82.2 reports unexpected reloads in the field. |
| AUD-59 | Open, documented | The mapping that exists (`src/core/rules/clip-adapter.ts`) is tested; the schema gaps (Exit, Focus, Stagger, LayoutTransition as independent `ClipType`s) are named in `PHASE8_SCHEMA_GAPS` and decision 0005 §3, not fixed. Closes when a schema amendment adds them, or when it's decided they're expressible some other way. |
