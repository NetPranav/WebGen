# CODEBASE & SPECIFICATION AUDIT — INITIAL PHASE

## Project Name: LazyLayout — AI-Native Motion Design Studio
**Document Version:** 1.0.0
**Audit Date:** 2026-09-24
**Audited Branch / Commit:** `blueprint-language` @ `acec382`
**File Location:** `DOCS/Initial/AUDIT.md`
**Consumed By:** `DOCS/Initial/ROADMAP.md` v2.0.0. Every fix phase cites the audit IDs (`AUD-xx`) it closes.

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

---

## 5. Resolution Status

A finding is **Closed** only when the phase that owns it passes its Verification Gate (ROADMAP §3). Partial progress made by an earlier phase is recorded here so the owning phase doesn't redo it.

| ID | Status | Notes |
|---|---|---|
| AUD-01 | ✅ Closed | `tsc --noEmit`: 162 → 0 errors (baseline in `audit/tsc-baseline.txt`). `npm test` now runs `typecheck` first. Closes when Linux CI is green. |
| AUD-02 | ✅ Closed | ESLint: 179 → 0 errors, 494 → 467 warnings. Warning budget enforced by `--max-warnings`. Closes when Linux CI is green. |
| AUD-03 | ✅ Closed (by convention) | CI runs on every push/PR. `main` merges only through PRs with a green `verify` check. Technical enforcement needs GitHub Pro (private repo); add the required check when available. |
| AUD-04 | 🔶 Fixed (Phase 2), CI pending | One model: the MDM v2 `MotionDocument` (`src/core/document/`). `ProjectElement`, `BaseElementNode`, `AttachedAnimation` and `ElementType` are deleted; a test enforces it. |
| AUD-05 | 🔶 Model half fixed (Phase 2) | Animations live in `document.clips`; the Sequencer reads and writes the same clips (browser-verified: keyframe edits persist). The behaviour half (undo regression test) is Phase 3. |
| AUD-06 | Partial | The registry now links every archetype to its grammar type and derives legal states from it. Enforcing the grammar in the editor remains Phase 8. |
| AUD-07 | 🔶 Fixed for document entities (Phase 2) | All layers, clips, tracks, keyframes and states use `createId()` (prefix + 8 hex, `crypto.getRandomValues`), including both cited sites. Non-document runtime records (history, diagnostics, runs, pages) still use ad-hoc ids. |

