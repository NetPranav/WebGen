# IMPLEMENTATION ROADMAP — v4 (Sequential)

## Project Name: LazyLayout — AI-Native Motion Design Studio
**Document Version:** 4.0.0
**Date:** 2026-10-18
**Status:** Active. Stage 0 (Phases 1–12) ✅. **Next: Phase 13** (in progress).
**File Location:** `DOCS/INITIAL/ROADMAP.md`
**Supersedes:** v3.3 (91 phases, run through a separate order file). v3.3 is kept unchanged as `ROADMAP_v3_ARCHIVE.md` for its progress logs, amendments and evidence. `order.md` is retired: in v4, **the phase number is the order**.
**Inputs:** `PRD.md` v2.4, `AUDIT.md`, the grammar (`lazylayout_element_grammer.md` v0.3), `ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md`, `INTERACTIVE_EFFECTS_ENGINE_SPECIFICATION.md`, and the World Environment properties in `action working.md`.

---

## 0. How to Use This Roadmap

1. **Take the lowest-numbered phase that isn't ✅.** There is no other order to look up.
2. **A phase only needs lower-numbered phases.** Every "Needs" line points backwards. `scripts/check-roadmap-order.mts` checks this (Law 18), so the order can't silently break when phases are added.
3. **Every stage ends with a gate you can try in the website.** If a stage gate passes, that stage's promise is true in a real browser and a real build, not just in tests.
4. **Every phase from 13 on says what changes on screen** ("You'll see"). If a phase can't name something a user sees or does, it is infrastructure, and at most two of those may run in a row (Law 19).
5. **Status:** ✅ gate passed in CI · 🚧 in progress · 📋 not started. Mark a phase ✅ in the index (§5) and in its own entry when its gate passes, and add a dated line to `CHANGELOG.md`.
6. **"Was" names the v3 phase(s)** the work came from, so audit IDs, decision records, commit messages and `TODO(P7)`-style comments stay traceable. The full crosswalk is §7.
7. **Working with several people:** someone may start a later phase early only if every phase in its "Needs" line is ✅. The number order stays the default. Since 2026-10-18 two people work in parallel lanes, **Lane A** (Phases 13–52) and **Lane B** (Phases 53–102); the lanes, the points where B waits on A, and the daily-merge workflow are in `DOCS/TEAM/COLLABORATION.md`.

---

## 1. Where the Project Really Is (audited 2026-10-18)

### 1.1 Measured on `main` @ `4c97bfb` (2026-10-17)

| Check | Result |
|---|---|
| `tsc --noEmit` | 0 errors |
| ESLint | 0 errors, 437 warnings (budget 463) |
| Unit tests (`npm run test:unit`) | 1,365 tests: 1,362 pass, 0 fail, 3 skipped (edition-gated) |
| Browser tests | 11 Playwright tests in 5 specs, plus the export harness (last green in CI per the v3 logs; not re-run for this audit) |
| Source size | ~108,000 lines of TS/TSX in `src/`, plus ~21,000 lines of tests |

### 1.2 What is done

12 of v3's 91 phases are complete (v3 1–9, 41, 42, 46), and v3 43 is half done. In v4 they are **Phases 1–12** (Stage 0), and Phase 13 is in progress. They delivered:
- one document model (MDM schema v5) with 216 canonical property paths, real geometry on every layer, compositions with nesting, and the types for every later feature (bindings, surfaces, tapes, graphs, helpers, pins, splits, fields, colliders, bodies);
- an executable rules engine compiled from the grammar (432 matrix assertions), with engine routing that never needs GSAP;
- a deterministic evaluation kernel (`evaluate()`), with easing checked against real GSAP output and springs checked against real Motion output;
- patch-based undo with gesture transactions, IndexedDB autosave, crash recovery and `.lazy.json` files;
- CI, a three-browser Playwright harness, an export build harness and pixel parity;
- a small, split store, and a command registry with a focus model.

### 1.3 What the website shows today

Checked by running the editor locally and screenshotting `/editor`:
- **Works:** the editor shell (header, workspace tabs, docked panels, command palette, status bar), the dotted canvas with pan and zoom, the World Environment inspector, undo/redo, autosave, the showcase demo.
- **Still the old system:** the stage is the v1.1 HTML-string iframe (`srcDoc`), and layers are laid out by flexbox, not by their geometry. The timeline is the legacy Sequencer with its own clock. The Content Browser's animation panel keeps tracks in local React state (AUD-39). The Code view doesn't show the document's animation (AUD-40).
- **Not there yet:** on `main`, only the Select and Pan tools work. The Pencil, Text, Wire, Shapes, Components and Assets buttons do nothing. There are no transform handles, no dragging of layers on the canvas, and the Details panel's Position and Size fields are placeholders.

### 1.4 Built, but invisible

| Built | Used by the website today |
|---|---|
| MDM v5, geometry, 216 property paths | Partly: the stage ignores geometry |
| Rules engine (`rules.canAdd`, `validate`, `route`) | In 3 panels |
| Evaluation kernel (`evaluate()`) | **Not imported by any editor file** |
| Compositions, markers, precomps | Nothing shows them |
| Track X / Track K types (bindings, helpers, splits …) | No runtime yet |

### 1.5 Why it feels like nothing moved, and how much should be on screen

The v3 plan built **inside out**, which was right for the foundations: the model, rules and maths are the hardest parts to change later. But its order put the first phase that changes the canvas (v3 48, the new renderer) at step 17 of 93, and the Figma-style stage (v3 20) at **step 48 of 93**. All 13 finished steps were model, store, rules and maths work. None of it can show on screen until a renderer and a viewport consume it.

With the same 13 phases of effort in a viewport-first order, the stage would already render from geometry, and you would have selection, move/resize handles and a synced layers panel. In v4 that point is **Phase 27**, 15 phases from now, and every one of those phases changes something you can see except Phase 16 (a short threat-model document).

**Progress in numbers:** 12 of 202 phases (6%). By difficulty it's better than the count suggests, because what everything else stands on is done and tested.

### 1.6 Unmerged work

Branch `phase-43-command-bus-finish` (last commit 2026-10-14) holds about 770 lines that are not on `main`: Tier A canvas tools on the old stage (select, hand, frame, rectangle, ellipse, line, text, commits `7a97baa` … `5c020dd`) and the menus-through-the-command-bus work in progress (`0792374`). Phases 13, 24 and 25 reuse it instead of redoing it. The last commit on `main` (2026-10-17) deleted `DOCS/After/` and the archived Wasm sources.

### 1.7 What v3.3 was missing for the product described

| Gap in v3.3 | Fixed in v4 by |
|---|---|
| Phase numbers weren't the order, so a separate `order.md` was needed. It also recorded 5 places where v3's own stage table contradicted the dependencies | Law 18: numbers are the order, checked by a script |
| Basic Figma editing was never planned: copy/paste, duplicate, group, align and distribute, z-order, inline text editing, rulers, image crop, multi-selection editing | 28–31, 33–35, 37 |
| Components and variants, core to Figma, were deferred to Release 2 | 46–47 (design), 80 (animated variants) |
| Nothing could be exported until the whole motion pipeline existed | 49: static export at the end of Stage 1 |
| The pen tool and vector editing came very late (v3 Stages 3 and 7) | 39, 40 |
| Fonts lived inside the text-motion phase | 38 |
| No MCP server, so Claude couldn't drive the editor | 50 (local MCP), 176 (full agent parity), 194 (remote MCP), and Law 20 |
| Keyboard interactivity was a single `key` event in Blueprints | 104 (keyboard signals), 112 (keyboard and focus interactions) |
| 3D was a single phase (v3 18) | Stage 4: 20 phases |
| No on-ramp for people who already know Figma or After Effects | 177 (familiar keymaps), 178 (Figma import), 179 (After Effects import via Lottie) |
| Legacy systems were removed in one late phase (v3 57), so old and new ran side by side for most of the project | Each phase that replaces a system deletes the old one (18, 56, 68 …); 188 is the final grep gate |
| A few v3 decision-record numbers clashed with records that already exist (`0004`, `0005`, `0007`) | New records are numbered from `0008` (§6, "Decision records") |

### 1.8 Will following this roadmap produce the engine?

It covers everything the PRD, the grammar, both engine specs and the product description ask for, every phase has a real-environment gate, and the order is machine-checked. What a plan can't promise: phases differ in size, the usability gates need real people, and the first version of many gates will surface problems no document can predict (text measurement, physics feel, browser differences, GPU drivers). The protection against that is structural: **every stage ends with a website you can use**, so a wrong turn shows up within one stage instead of at the end.

### 1.9 three.js: no custom 3D engine needed

`three` 0.186.1, `@react-three/fiber` 9.8.1 and `@react-three/drei` 10.7.8 are **MIT-licensed** (checked in `node_modules` on 2026-10-18). MIT allows commercial use, modification and redistribution with the notice kept. So the "build our own three.js" stage isn't needed. Stage 4 builds the 3D *editor* on top of three.js instead. The only engine with a licence problem is GSAP (`LICENSES.md` GATE-01), which is already kept out of the editor.

---

## 2. The Stages at a Glance

| Stage | Phases | Count | At the stage gate, a user can… |
|---|---|---|---|
| **0 · Foundation** ✅ | 1–12 | 12 | (no new UI) One document model, rules engine, evaluation kernel, history and persistence, test harnesses |
| **1 · Figma / Wix viewport** | 13–52 | 40 | Design a responsive, multi-page site with components on an infinite canvas (frames, shapes, pen, text, auto-layout, constraints, breakpoints, styles), export it to Next.js, Vite or HTML, and let Claude build on the canvas through MCP |
| **2 · Animation grammar** | 53–102 | 50 | Animate anything on an After Effects-style timeline: keyframes, curves, states and transitions, scroll, text and SVG motion, parenting, masks, expressions, motion paths on the canvas. Export verified motion code, and render MP4, GIF or Lottie |
| **3 · Interactive & complex animation** | 103–147 | 45 | Make anything react to the mouse, touch, scroll and keyboard. Add GPU backgrounds, particles, fluids and cursors. Compose interactions from helpers, splits, fields and physics. Wire logic as Simple rules or Blueprint graphs. Export with a small vendored runtime or an embed script |
| **4 · 3D** | 148–167 | 20 | Build 3D scenes with gizmos, GLTF models, materials, lights and cameras, animate them on the same timeline, make them react to the cursor and scroll, add 3D physics, and export them |
| **5 · AI & agents** | 168–176 | 9 | Prompt → design, animation, effect or interaction; a co-pilot for edits; Claude can do everything the UI can through MCP |
| **6 · Easy for everyone** | 177–183 | 7 | Use Figma or After Effects shortcuts, import Figma files and After Effects animations, draw rough shapes that become clean ones, and finish in a 3-step Simple mode |
| **7 · Production & public beta** | 184–191 | 8 | Use a secure, observable, real-device-tested, licence-clean public beta |
| **8 · Sites & platform** | 192–201 | 10 | Sign in, share, use remote MCP, manage content collections and forms, export or deploy whole sites, pay for a plan (GA) |
| **9 · Apps** | 202 | 1 | (Planning) Re-plan data, backend logic, collaboration and plugins after an honest audit |

**Total: 202 phases.** Stages 1–4 follow the order asked for: the viewport first, then the basic animation grammar, then complex and interactive animation, then 3D.

---

## 3. Architectural Laws

Binding for every phase. A gate that passes while breaking a law doesn't count. Laws 1–17 are v3's, shortened; the full text with examples is in `ROADMAP_v3_ARCHIVE.md` §2.

1. **Inside-Out:** types and schema → rules → diagnostics → UI. No control before the rule that governs it.
2. **One Document:** every surface reads and writes the MDM through one store API. No parallel models.
3. **Preview = Export:** every animation has a pure `evaluate()` result that the live preview and the exported build both match within tolerance. Stateful layers replay deterministically (Law 15).
4. **No Silent AI Writes:** every AI or agent change is a diff the user approves (per change, or with a per-session "approve automatically" switch that still logs each change as its own undo step).
5. **Real-Environment Verification:** gates run in `tsc`, real browsers and real builds. String checks may support a gate, never be it.
6. **Simple by Default:** every capability has a Simple face (≤ 7 controls, no jargon) before or with its Pro face.
7. **Licensing Gate:** third-party code runs only after its licence is recorded in `LICENSES.md`.
8. **One Clock:** one transport owns time (Phase 54). No panel keeps its own playhead.
9. **Hot Path:** per-frame values never go through React state or the document store. They go through the frame scheduler and the renderer's node registry.
10. **Document Space:** geometry lives in the MDM in document coordinates. Editor code reads layout only through the renderer's measurement API.
11. **One Renderer:** the stage and the exporters render from the same per-archetype render definitions (Phase 17).
12. **Signal:** continuous inputs (pointer, scroll, keys, time, audio, tilt) are sampled once per frame by the input bus (Phase 103). Nothing else attaches its own listeners or runs its own `requestAnimationFrame`.
13. **Surface Budget:** only the GPU compositor (Phase 129) creates WebGL/WebGPU contexts, within a context and memory budget per device tier.
14. **Graceful Degradation:** every effect declares a fallback chain ending in a poster, a touch behaviour and a reduced-motion behaviour.
15. **Deterministic Replay:** simulations, particles and stateful operators replay exactly from `(seed, input tape, fixed step)`.
16. **Untrusted Code:** user code (code components, raw shaders, expressions, imported files) runs only inside its sandbox and never with the editor origin's privileges.
17. **Visual First (No Maths):** everything can be authored without typing a number or formula: canvas handles, plain-language choices, feel controls (Bounce, Time, Smoothness, Strength, Variety), or ranges dragged over live meters. Pro mode shows the numbers.
18. **Sequential (new in v4):** a phase's "Needs" list contains only lower phase numbers. The phase number is the execution order. `scripts/check-roadmap-order.mts` fails if any phase needs a later one.
19. **Visible Progress (new in v4):** from Phase 13 on, every phase states what changes for a user ("You'll see"). Phases with nothing visible are infrastructure, and no more than two run in a row.
20. **Agent Parity (new in v4):** every user action is a typed command on the command bus (Phase 13), and the MCP server exposes every command (Phases 50, 176). A CI test fails if a menu item, button, shortcut or palette entry has no command. This is what lets Claude do everything a person can do in the editor.

---

## 4. Definition of Done (per phase)

A phase is **✅** only when:
1. Every checklist item is `[x]`.
2. Its "Done when" gate passes in CI, not only locally.
3. `tsc` has 0 errors, ESLint has 0 errors within the warning budget, all tests pass, and `next build` succeeds.
4. Nothing regresses in the Playwright suite, the export parity suite, or (from Phase 101) the performance budget suite.
5. The "You'll see" line is true in the running editor (or the exported build), checked by a Playwright test or a recorded run.
6. Every command the phase adds is registered with a typed argument schema (Law 20).
7. Docs are updated: this roadmap (index and entry), `CHANGELOG.md`, any spec or decision record it touches, and `AUDIT.md` for the IDs it closes.
8. Any legacy code the phase replaces is deleted in the same phase, or the phase names the later phase that deletes it.


## 5. Phase Index (the tracking list)

One row per phase, in execution order. Update the Status column together with the phase's own entry; `npm run check:roadmap-order` fails if they disagree or if any phase needs a later one.

**Stage 0 · Foundation (Phases 1–12)**

| # | Phase | Needs | Was (v3) | Stage | Status |
|---|---|---|---|---|---|
| 1 | Build health & CI | — | v3 1 | 0 | ✅ |
| 2 | Unified Motion Document Model | 1 | v3 2 | 0 | ✅ |
| 3 | History, autosave & project files | 2 | v3 3 + 41.2 | 0 | ✅ |
| 4 | Real-environment verification harness | 1 | v3 4 | 0 | ✅ |
| 5 | Dependency reality & Wasm decision | 1 | v3 5 | 0 | ✅ |
| 6 | Scope, naming & docs cleanup | 1 | v3 6 | 0 | ✅ |
| 7 | Canonical property paths & geometry | 2 | v3 42 | 0 | ✅ |
| 8 | Motion primitives | 7 | v3 7 | 0 | ✅ |
| 9 | Compositions & nesting | 8 | v3 46 | 0 | ✅ |
| 10 | Executable rules engine | 8, 9 | v3 8 | 0 | ✅ |
| 11 | Deterministic evaluation kernel | 8, 9 | v3 9 | 0 | ✅ |
| 12 | Store decomposition | 2, 3 | v3 41 | 0 | ✅ |

**Stage 1 · Figma / Wix-style viewport (Phases 13–52)**

| # | Phase | Needs | Was (v3) | Stage | Status |
|---|---|---|---|---|---|
| 13 | Command bus: finish and type every command | 12 | v3 43.1 (rest), 43.3 | 1 | 🚧 |
| 14 | Workspace model & panel registry | 13 | v3 44.1, 44.4 | 1 | 📋 |
| 15 | Design / Animate / Code presets & inspector tabs | 14 | v3 44.2, 44.3 | 1 | 📋 |
| 16 | Threat model for the stage and user content | 3 | v3 80.1 | 1 | 📋 |
| 17 | Render definitions per archetype | 7, 8, 16 | v3 48.1 | 1 | 📋 |
| 18 | Stage host v2: live DOM frames, no HTML strings | 17 | v3 48.2, 48.5 | 1 | 📋 |
| 19 | Incremental updates & measurement API | 18 | v3 48.3, 48.4 | 1 | 📋 |
| 20 | Viewport camera | 19 | v3 49.1 | 1 | 🚧 |
| 21 | Multi-frame canvas | 20 | v3 49.2, 20.3 | 1 | 🚧 |
| 22 | Hit-testing | 21 | v3 49.3 | 1 | 🚧 |
| 23 | Overlay layer & Design / Preview modes | 22 | v3 49.4, 49.5 | 1 | 🚧 |
| 24 | Tool state machine | 13, 23 | v3 43.2 (infrastructure) | 1 | 📋 |
| 25 | Creation tools: frames, shapes and text boxes | 24 | v3 43.2 (Tier A), 20.4 | 1 | 📋 |
| 26 | Selection | 25 | v3 20.1 (selection) | 1 | 📋 |
| 27 | Transform handles | 26 | v3 20.1 (transform) | 1 | 📋 |
| 28 | Snapping, smart guides & rulers | 27 | v3 20.2 | 1 | 📋 |
| 29 | Editing operations | 26 | — (new: not planned in v3) | 1 | 📋 |
| 30 | Align, distribute & tidy | 29 | — (new) | 1 | 📋 |
| 31 | Text on the canvas | 25 | — (new) | 1 | 📋 |
| 32 | Layers panel | 15, 26 | v3 21.1 | 1 | 📋 |
| 33 | Design inspector: Simple face | 32 | v3 22.1 (design half) | 1 | 📋 |
| 34 | Design inspector: Pro face | 33 | v3 22.2 | 1 | 📋 |
| 35 | Paint: colour, gradients, strokes, shadows & blur | 34 | v3 22.2 (paint) + new | 1 | 📋 |
| 36 | Asset store & storage safety | 3 | v3 54.1, 54.2 | 1 | 📋 |
| 37 | Image layers | 36 | — (new) | 1 | 📋 |
| 38 | Fonts | 36 | v3 17.3 | 1 | 📋 |
| 39 | Pen & pencil | 24 | v3 35.1–35.4 | 1 | 📋 |
| 40 | Vector editing & boolean operations | 39 | v3 16.1 | 1 | 📋 |
| 41 | Auto-layout: stacks | 27, 32 | v3 50.1 (stacks) | 1 | 📋 |
| 42 | Grid layout & constraints | 41 | v3 50.1 (grid), 50.2 | 1 | 📋 |
| 43 | Breakpoints & overrides | 42 | v3 50.3 (properties half) | 1 | 📋 |
| 44 | Breakpoint canvas | 21, 43 | v3 50.4 | 1 | 📋 |
| 45 | Design tokens & styles | 35, 38 | v3 22.3 | 1 | 📋 |
| 46 | Components & instances | 29, 32 | v3 75.1, 75.5 (design) | 1 | 📋 |
| 47 | Variants & component properties | 46 | v3 75.2 (static), 75.3 | 1 | 📋 |
| 48 | Sections, pages & prototype links | 23, 47 | v3 76.1 (static), 77.1, 77.2, 77.4 | 1 | 📋 |
| 49 | Static export v1 | 37, 45, 48 | v3 27.1 (part), 48 gate, 50.5 (layout), 75.5 | 1 | 📋 |
| 50 | Agent bridge: local MCP server v0 | 13, 49 | — (new) | 1 | 📋 |
| 51 | Section templates & starter projects | 45, 48 | v3 76.3 (static half), 76.4 | 1 | 📋 |
| 52 | Stage 1 gate: the design journey | 13–51 | v3 58.1 + new | 1 | 📋 |

**Stage 2 · Animation grammar (Phases 53–102)**

| # | Phase | Needs | Was (v3) | Stage | Status |
|---|---|---|---|---|---|
| 53 | Animation grammar: close the schema gaps | 10, 11 | — (AUD-59, found by v3 8) | 2 | ✅ |
| 54 | Transport & one clock | 11, 12 | v3 45.1 | 2 | ✅ |
| 55 | Frame scheduler | 54 | v3 45.2, 45.3 | 2 | ✅ |
| 56 | Move playback onto the clock; retire the old Sequencer clock | 55 | v3 45.4 | 2 | ✅ |
| 57 | Engine adapters & the kernel on the stage | 19, 56 | v3 10.1 (interface, kernel adapter) | 2 | 📋 |
| 58 | CSS / Web Animations adapter | 57 | v3 10.1 (WAAPI) | 2 | 📋 |
| 59 | Scrub vs play | 58 | v3 10.2 | 2 | 📋 |
| 60 | Parity overlay | 59 | v3 10.3 | 2 | 📋 |
| 61 | Timeline workspace: layout | 15, 54, 60 | v3 52.1, 23.1, 21.2 | 2 | 📋 |
| 62 | Twirl-downs & stopwatches | 61 | v3 52.2 | 2 | 📋 |
| 63 | Timeline navigation | 62 | v3 52.3 | 2 | 📋 |
| 64 | Timeline at scale | 63 | v3 52.4 | 2 | 📋 |
| 65 | Nested & interaction composition tabs | 64 | v3 52.5 | 2 | 📋 |
| 66 | Keyframing | 65 | v3 23.2 | 2 | 📋 |
| 67 | Graph editor & easing | 66 | v3 23.3 | 2 | 📋 |
| 68 | Retire the legacy animation panels | 67 | v3 57.1 (part) | 2 | 📋 |
| 69 | Motion paths on the canvas | 40, 68 | v3 53.1 | 2 | 📋 |
| 70 | Auto-key on the stage & value HUD | 69 | v3 53.2, 53.4 | 2 | 📋 |
| 71 | Onion skin | 70 | v3 53.3 | 2 | 📋 |
| 72 | Anchor points & pins | 71 | v3 51.1, 88.2 (model) | 2 | 📋 |
| 73 | Parenting & helper layers | 72 | v3 51.2, 88.1 (rendering) | 2 | 📋 |
| 74 | Blend modes, adjustment layers, masks & mattes | 73 | v3 51.3, 51.4 | 2 | 📋 |
| 75 | Effect stack & motion blur | 74 | v3 51.5, 51.6 | 2 | 📋 |
| 76 | Property links & pick-whip | 75 | v3 47.1, 47.3, 47.4 | 2 | 📋 |
| 77 | Expressions | 76 | v3 47.2, 47.4 (export) | 2 | 📋 |
| 78 | States | 33, 77 | v3 11.1 | 2 | 📋 |
| 79 | Transitions & smart animate | 78 | v3 11.2 | 2 | 📋 |
| 80 | Animated variants & interactive components | 47, 79 | v3 75.2 (animated half), 75.4 | 2 | 📋 |
| 81 | Scroll: model & runtime | 59 | v3 13.1, 13.2 | 2 | 📋 |
| 82 | Scroll simulator & section choreography | 48, 81 | v3 13.3, 76.2 | 2 | 📋 |
| 83 | Accessible text splitting | 31, 38, 82 | v3 17.1 | 2 | 📋 |
| 84 | Text motion | 83 | v3 17.2 | 2 | 📋 |
| 85 | SVG morph & stroke drawing | 84 | v3 16.2, 16.3 (stroke) | 2 | 📋 |
| 86 | Motion along paths & SVG filters | 85 | v3 16.3 (motion path), 16.4 | 2 | 📋 |
| 87 | Motion engine adapter | 86 | v3 15 | 2 | 📋 |
| 88 | Motion per breakpoint | 43, 87 | v3 50.3 (motion half) | 2 | 📋 |
| 89 | Page transitions | 88 | v3 77.3 | 2 | 📋 |
| 90 | Animation Playground | 89 | v3 24.0–24.3, 24.5 | 2 | 📋 |
| 91 | Motion library infrastructure | 90 | v3 25.1, 25.2, 21.3, 22.4 | 2 | 📋 |
| 92 | Library: text, SVG & component motion | 91 | v3 25.3 (waves 1, 3, 4) | 2 | 📋 |
| 93 | Reduced motion & accessibility rules | 92 | v3 29.1, 29.3, 11.4 | 2 | 📋 |
| 94 | Motion export architecture | 49, 93 | v3 27.1 | 2 | 📋 |
| 95 | Motion export: React, Next & Vite | 94 | v3 27.2, 27.3, 29.2 | 2 | 📋 |
| 96 | Export matrix in CI | 95 | v3 27.4 | 2 | 📋 |
| 97 | More export targets | 96 | v3 28 | 2 | 📋 |
| 98 | GSAP as an opt-in export target | 97 | v3 14 | 2 | 📋 |
| 99 | Video & audio layers | 36, 98 | v3 54.3, 54.4 | 2 | 📋 |
| 100 | Render queue: video, GIF, image sequences & Lottie | 99 | v3 55 | 2 | 📋 |
| 101 | Performance lab, workers & hot path | 100 | v3 56, 26.1–26.4 | 2 | 📋 |
| 102 | Stage 2 gate: the animation journey | 53–101 | v3 58.2, 58.3, 58.4 | 2 | 📋 |

**Stage 3 · Interactive & complex animation (Phases 103–147)**

| # | Phase | Needs | Was (v3) | Stage | Status |
|---|---|---|---|---|---|
| 103 | Input bus & coordinate spaces | 55, 102 | v3 59.1 | 3 | 📋 |
| 104 | Signal catalogue, including the keyboard | 103 | v3 59.2 + new (keyboard) | 3 | 📋 |
| 105 | Input tapes | 104 | v3 59.3, 23.4, 24.4, 12.3 | 3 | 📋 |
| 106 | GPU & interactive verification harness | 105 | v3 71 | 3 | 📋 |
| 107 | Operators & bindings runtime | 106 | v3 60.1 | 3 | 📋 |
| 108 | Targets, blending & cycles | 107 | v3 60.2 + the v3 9 amendment | 3 | 📋 |
| 109 | Reactivity card (Simple) | 108 | v3 60.3 | 3 | 📋 |
| 110 | Signals panel (Pro) & binding export | 109 | v3 60.4 | 3 | 📋 |
| 111 | Pointer behaviours as presets | 110 | v3 12.2 | 3 | 📋 |
| 112 | Keyboard & focus interactivity | 111 | — (new) | 3 | 📋 |
| 113 | State machines | 112 | v3 11.3 | 3 | 📋 |
| 114 | Helpers, pins & Follow | 113 | v3 88 | 3 | 📋 |
| 115 | Split into real layers | 114 | v3 89.1 | 3 | 📋 |
| 116 | Cloners, tags & group targets | 115 | v3 89.2, 89.3 | 3 | 📋 |
| 117 | Fields & effectors | 116 | v3 90.1–90.3 | 3 | 📋 |
| 118 | One evaluation space & no-maths kinetics | 117 | v3 90.4–90.6 | 3 | 📋 |
| 119 | Blueprint model & interaction library | 118 | v3 72.1, 72.2 | 3 | 📋 |
| 120 | NodeScript text form & one model with the grammar | 119 | v3 72.3, 72.4 | 3 | 📋 |
| 121 | Blueprint runtime | 120 | v3 74.1 | 3 | 📋 |
| 122 | 2D physics core | 121 | v3 91.3, 64.1 (decision) | 3 | 📋 |
| 123 | Colliders & bodies | 122 | v3 91.1, 91.2 | 3 | 📋 |
| 124 | Contact events & collision view | 123 | v3 91.4, 91.5 | 3 | 📋 |
| 125 | Simple rules editor | 124 | v3 73.1, 73.5, 73.6 | 3 | 📋 |
| 126 | Blueprint graph editor & debugger | 125 | v3 73.2, 73.3 | 3 | 📋 |
| 127 | Blueprint compiler & interaction parity | 126 | v3 74.2–74.4, 91.6 | 3 | 📋 |
| 128 | Spawner | 127 | v3 89.4 | 3 | 📋 |
| 129 | GPU surface strategy & compositor | 128 | v3 61.1, 61.3 | 3 | 📋 |
| 130 | Passes, render targets & GPU memory ledger | 129 | v3 61.2, 61.5 | 3 | 📋 |
| 131 | Surfaces in the editor & the first interactive background | 130 | v3 61.4, 19.1 | 3 | 📋 |
| 132 | Shader graph | 131 | v3 62.1, 62.3 | 3 | 📋 |
| 133 | Raw GLSL (Pro) & shader safety | 132 | v3 62.2 | 3 | 📋 |
| 134 | Particles & force fields | 133 | v3 63, 19.2 | 3 | 📋 |
| 135 | Stateful simulations & replay | 134 | v3 64.2, 64.3 | 3 | 📋 |
| 136 | Media as texture & distortion | 135 | v3 65 | 3 | 📋 |
| 137 | Cursor & overlay layer | 136 | v3 66 | 3 | 📋 |
| 138 | Effect SDK: effects as data | 137 | v3 67 | 3 | 📋 |
| 139 | Library: interaction, backgrounds, cursors & distortion | 138 | v3 25.3 (waves 2, 5, 7, 8, 9) | 3 | 📋 |
| 140 | Sandbox boundaries for untrusted code | 139 | v3 80.2 | 3 | 📋 |
| 141 | Code components | 140 | v3 68 | 3 | 📋 |
| 142 | Interactive export runtime | 141 | v3 69.1, 69.2 | 3 | 📋 |
| 143 | Embed script, size budgets & Web Vitals | 142 | v3 69.3–69.5 | 3 | 📋 |
| 144 | Interactive accessibility | 143 | v3 29 (v3.0 amendment), 29.4 | 3 | 📋 |
| 145 | Interactive performance budgets per tier | 144 | v3 26 (v3.0 amendment) | 3 | 📋 |
| 146 | Composition test suite | 145 | v3 91.7 | 3 | 📋 |
| 147 | Stage 3 gate: the interactive journey | 103–146 | v3 58.5, 58.6 | 3 | 📋 |

**Stage 4 · 3D (Phases 148–167)**

| # | Phase | Needs | Was (v3) | Stage | Status |
|---|---|---|---|---|---|
| 148 | 3D stack decision & licences | 147 | v3 18 (v3.0, v3.3 amendments) | 4 | 📋 |
| 149 | Scene layer | 148 | v3 18.1 | 4 | 📋 |
| 150 | 3D viewport editing | 149 | — (new) | 4 | 📋 |
| 151 | Scene hierarchy & 3D inspector | 150 | — (new) | 4 | 📋 |
| 152 | Primitives & 3D text | 151 | v3 18.2 (primitives) | 4 | 📋 |
| 153 | GLTF import pipeline | 152 | v3 18.2 (GLTF), 54 (v3.3 amendment) | 4 | 📋 |
| 154 | Materials & textures | 153 | v3 18.2 (materials) | 4 | 📋 |
| 155 | Lights, shadows & environments | 154 | v3 18.2 (lights) | 4 | 📋 |
| 156 | Cameras & camera paths | 155 | v3 18.3 (camera) | 4 | 📋 |
| 157 | 3D keyframes on the timeline | 156 | v3 18.3 (tracks) | 4 | 📋 |
| 158 | Animated GLTF playback | 157 | — (new) | 4 | 📋 |
| 159 | 3D materials in the shader graph & WebGPU | 158 | v3 18 (v3.0 amendment), 62 (TSL) | 4 | 📋 |
| 160 | 3D reactions & raycast events | 159 | v3 18.3 (pointer) + new | 4 | 📋 |
| 161 | Instancing, LOD & 3D cloners | 160 | — (new; extends 116 to 3D) | 4 | 📋 |
| 162 | 3D physics | 161 | — (new) | 4 | 📋 |
| 163 | Post-processing | 162 | — (new) | 4 | 📋 |
| 164 | 3D memory discipline | 163 | v3 18 (v3.3 amendment) | 4 | 📋 |
| 165 | 3D export | 164 | v3 18.4 | 4 | 📋 |
| 166 | 3D library | 165 | v3 25.3 (wave 6) | 4 | 📋 |
| 167 | Stage 4 gate: the 3D journey | 148–166 | — (new) | 4 | 📋 |

**Stage 5 · AI & agents (Phases 168–176)**

| # | Phase | Needs | Was (v3) | Stage | Status |
|---|---|---|---|---|---|
| 168 | LLM integration layer | 167 | v3 30.1, 30.2 | 5 | 📋 |
| 169 | Validation loop & offline provider | 168 | v3 30.3, 30.4 | 5 | 📋 |
| 170 | AI builder: prompt → design and motion | 169 | v3 31 | 5 | 📋 |
| 171 | AI evals & visual self-check | 170 | v3 33 | 5 | 📋 |
| 172 | AI co-pilot: edit, explain, fix | 171 | v3 32 | 5 | 📋 |
| 173 | AI interaction builder | 172 | v3 73.4 | 5 | 📋 |
| 174 | AI effect author | 173 | v3 70 | 5 | 📋 |
| 175 | AI from references | 174 | v3 34 | 5 | 📋 |
| 176 | MCP v1: full agent parity | 175 | — (new) | 5 | 📋 |

**Stage 6 · Easy for everyone (Phases 177–183)**

| # | Phase | Needs | Was (v3) | Stage | Status |
|---|---|---|---|---|---|
| 177 | Familiar keymaps & terms | 176 | — (new) | 6 | 📋 |
| 178 | Figma import | 177 | — (new) | 6 | 📋 |
| 179 | After Effects import via Lottie | 178 | — (new) | 6 | 📋 |
| 180 | Shape recognition & beautification | 179 | v3 36 | 6 | 📋 |
| 181 | Draw-to-animate gestures | 180 | v3 37 | 6 | 📋 |
| 182 | Sketch to elements with AI | 181 | v3 38 | 6 | 📋 |
| 183 | Simple mode & guided flow | 182 | v3 39 | 6 | 📋 |

**Stage 7 · Production & public beta (Phases 184–191)**

| # | Phase | Needs | Was (v3) | Stage | Status |
|---|---|---|---|---|---|
| 184 | Security hardening | 183 | v3 80.3–80.5 | 7 | 📋 |
| 185 | Observability & kill switches | 184 | v3 82 | 7 | 📋 |
| 186 | Real-device & browser matrix | 185 | v3 84 | 7 | 📋 |
| 187 | Licensing & compliance automation | 186 | v3 85 | 7 | 📋 |
| 188 | Legacy retirement & grep gates | 187 | v3 57 | 7 | 📋 |
| 189 | Documentation & audit close-out | 188 | v3 40.4 | 7 | 📋 |
| 190 | Integration journeys | 189 | v3 58 | 7 | 📋 |
| 191 | Public beta gate | 184–190 | v3 40 | 7 | 📋 |

**Stage 8 · Sites & platform (Phases 192–201)**

| # | Phase | Needs | Was (v3) | Stage | Status |
|---|---|---|---|---|---|
| 192 | Accounts & cloud projects | 191 | v3 81.1, 81.2 | 8 | 📋 |
| 193 | Share links & hosted embeds | 192 | v3 81.3, 81.4 | 8 | 📋 |
| 194 | Remote MCP endpoint | 193 | — (new) | 8 | 📋 |
| 195 | Content collections & repeaters | 194 | v3 78.1, 78.2 | 8 | 📋 |
| 196 | Forms | 195 | v3 78.3 | 8 | 📋 |
| 197 | Whole-site export & SEO | 196 | v3 79.1, 79.2, 78.4 | 8 | 📋 |
| 198 | Web Vitals & deploy handoff | 197 | v3 79.3, 79.4 | 8 | 📋 |
| 199 | Plans, metering & billing | 198 | v3 83 | 8 | 📋 |
| 200 | Animated templates & themes | 199 | v3 76.3 (interactive variants), 76.4 | 8 | 📋 |
| 201 | General availability gate | 192–200 | v3 86 | 8 | 📋 |

**Stage 9 · Apps (Phases 202–202)**

| # | Phase | Needs | Was (v3) | Stage | Status |
|---|---|---|---|---|---|
| 202 | Apps re-baseline: the After-track audit | 201 | v3 87 | 9 | 📋 |

---

# STAGE 0 — FOUNDATION ✅ (Phases 1–12)

> Done. The document model, rules, maths, store and test harnesses that everything else stands on. Detailed checklists, gate evidence and progress logs are in `ROADMAP_v3_ARCHIVE.md` under the v3 phase number given in "Was".

### Phase 1 · Build health & CI
**Needs:** — · **Was:** v3 1 · **Closes:** AUD-01, AUD-02, AUD-03 · **Status:** ✅
0 TypeScript errors (from 162), 0 lint errors with a ratcheting warning budget, `next build` green, CI on every push and PR (branch protection by convention).

### Phase 2 · Unified Motion Document Model
**Needs:** 1 · **Was:** v3 2 · **Closes:** AUD-04, AUD-05 (model), AUD-07 · **Status:** ✅
One versioned schema with a runtime validator and JSON Schema from one source, one typed store API, migrations, and deterministic IDs. CI green on PR #6.

### Phase 3 · History, autosave & project files
**Needs:** 2 · **Was:** v3 3 + 41.2 · **Closes:** AUD-05 (behaviour), AUD-08 · **Status:** ✅
Patch-based undo with gesture transactions (one drag = one step), IndexedDB autosave, a crash-recovery journal, and versioned `.lazy.json` import and export. CI green on PR #7.
*Carried forward:* two tabs on one project both autosave (last write wins) → fixed in Phase 36.

### Phase 4 · Real-environment verification harness
**Needs:** 1 · **Was:** v3 4 · **Closes:** AUD-15, AUD-16 (infrastructure), AUD-42, AUD-43 · **Status:** ✅
Playwright in Chromium, Firefox and WebKit against a production build; a deterministic test clock; export fixtures (Next, Vite React, Vue) that typecheck and build; pixel parity with a proven falsifier. CI green on PR #7.

### Phase 5 · Dependency reality & Wasm decision
**Needs:** 1 · **Was:** v3 5 · **Closes:** AUD-10, AUD-11, AUD-12 · **Status:** ✅
`motion`, `three` and R3F installed; the fake 2D "WebGL" viewport deleted; Wasm benchmarked in a real browser and archived (No-Go, `decisions/0001-wasm.md`). CI green on PR #8.

### Phase 6 · Scope, naming & docs cleanup
**Needs:** 1 · **Was:** v3 6 · **Closes:** AUD-22 … AUD-27 · **Status:** ✅
The `edition` flag keeps After-track panels out of the default bundle (checked in CI), one product name, a doc-link checker, and `LICENSES.md`. CI green on PR #9.
*Carried forward:* rewriting `UI.md`, `PANELS.md`, `SCHEMA_REFERENCE.md`, `CONVENTIONS.md` and `FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md` to match the code → Phase 52.

### Phase 7 · Canonical property paths & geometry
**Needs:** 2 · **Was:** v3 42 · **Closes:** AUD-31 (model), AUD-32 · **Status:** ✅
216 canonical property paths with types, units and compositing class; schema v3 migration; `frame`, `sizing` and `positioning` on every visual layer; frame = layout, `transform.*` = motion (`decisions/0003-geometry-vs-transform.md`). CI green on PR #11.

### Phase 8 · Motion primitives
**Needs:** 7 · **Was:** v3 7 · **Closes:** — (AUD-57 G1, G2) · **Status:** ✅
Schema v4: keyframes, tracks, clips, sequences, staggers, states, transitions, perceptual springs, triggers, behaviours, effect definitions and instances, and the types for bindings, surfaces, tapes, graphs, helpers, pins, tags, components and Split/Clone groups; six shape archetypes. The 12 + 4 reference effects and the reference build validate. CI green on PR #13.

### Phase 9 · Compositions & nesting
**Needs:** 8 · **Was:** v3 46 · **Closes:** AUD-36 · **Status:** ✅
Schema v5: main and interaction compositions, layer in/out and stretch, precomps with time remap, markers, golden-tested time maths (`decisions/0002-time-model.md`). CI green on PR #14.

### Phase 10 · Executable rules engine
**Needs:** 8, 9 · **Was:** v3 8 · **Closes:** AUD-06, AUD-47 (routing), AUD-52 · **Status:** ✅
The grammar compiled into one rule table (432 matrix assertions), `rules.canAdd / validate / explain / suggestFix / route`, routing lightest-first with no GSAP route, and a CI grep gate against ad-hoc compatibility checks (`decisions/0005-phase8-rule-table-and-reconciliation.md`).
*Carried forward:* AUD-59 (Exit, Focus, Stagger, LayoutTransition have no schema form) → Phase 53. Rules 6.12–6.15 (sampled at runtime) → Phase 144.

### Phase 11 · Deterministic evaluation kernel
**Needs:** 8, 9 · **Was:** v3 9 · **Closes:** AUD-48 (partial) · **Status:** ✅
`evaluate(doc, composition, layer, t, inputs)`, with easing checked against GSAP, springs against Motion, OKLab colour, and a determinism fuzz test (`decisions/0007-deterministic-evaluation-kernel.md`).
*Carried forward:* no editor file uses the kernel yet → Phase 57. Reactive behaviours and bindings (`KERNEL_GAPS`) → Phases 108 and 111. Stateful layers → Phase 135.

### Phase 12 · Store decomposition
**Needs:** 2, 3 · **Was:** v3 41 · **Closes:** AUD-34 · **Status:** ✅
The document and World Environment have their own stores, After-track actions moved behind the edition flag, per-entity subscriptions, and `useProjectStore.ts` cut from 1,554 to 395 lines.
*Carried forward:* project metadata has no store of its own → Phase 13.

---

# STAGE 1 — FIGMA / WIX-STYLE VIEWPORT (Phases 13–52)

> **Stage output:** a responsive design tool. On an infinite canvas with several frames, a user draws frames, shapes, vectors and text, selects and transforms them with Figma-style handles and snapping, lays them out with auto-layout, grids, constraints and breakpoints, builds components with variants, organises pages and sections, styles everything with tokens, and exports a site that matches the canvas. Claude can do the same through a local MCP server.
>
> Order inside the stage: commands and workspace (13–15) → the renderer that finally draws layers from their geometry (16–19) → the viewport (20–23) → tools and direct manipulation (24–31) → panels (32–35) → assets, images and fonts (36–38) → vectors (39–40) → layout (41–44) → design systems (45–48) → output, agents and templates (49–51) → the gate (52).

### Phase 13 · Command bus: finish and type every command
**Needs:** 12 · **Was:** v3 43.1 (rest), 43.3 · **Closes:** — · **Status:** 🚧
**Goal:** Every action (shortcut, menu, toolbar, palette, context menu, AI, MCP) is one typed command, so every later phase only adds commands.
- [x] Command registry, context keys, keymap with `when` clauses, palette on the registry, one focused region (landed 2026-09-27).
- [x] Menus and toolbar buttons run commands through `invokeCommand(id)`, which skips the `when` gate the way the palette does. File, Edit, View and Help are one data model (`src/editor/menus/menuModel.tsx`); an item that isn't built yet is disabled and names its phase (Cut/Copy/Paste/Duplicate/Delete: 29). Landed from `0792374` and finished here.
- [x] A command can declare a zod `args` schema and `result` schema; `tryRunCommand(id, args)` / `runCommand(id, args)` validate them and report why nothing ran (`unknown-command`, `unavailable`, `invalid-args`, `invalid-result`, `threw`). Both are optional so existing commands keep working. Each later phase declares schemas on the commands it adds; the MCP server (50) is generated from them (Law 20).
- [x] Coverage test (`menus/__tests__/commandCoverage.test.ts`): every menu item names a registered command or is pending on a phase, and no new raw `keydown` shortcut listener may be added. The palette already lists the registry. `Ctrl+A` (+Add palette) moved onto the bus; the remaining listeners are Escape-to-close and the Space spring-load, which need no command.
- [x] `tests/e2e/command-bus.spec.ts`: Edit > Undo/Redo, File > Save, a pending item is disabled, undo from the palette, Space plays over the timeline and not over the canvas, Delete in the timeline removes one keyframe.
- [x] Project metadata (id, name, scope, root archetype) has its own store, `useProjectMetaStore`. `ProjectStateSnapshot` is unchanged (it is the `.lazy.json` contract); `getSnapshot`/`restoreSnapshot` compose it, and undo swaps name, scope and root archetype through it.
- [ ] `npm run check:roadmap-order` runs in CI (Law 18). The script exists; adding the CI step needs a token with the `workflow` scope (blocked on 2026-10-19).

**You'll see:** Edit and File menus and the toolbar's undo, redo and save behave exactly like their shortcuts.
**Done when:** the coverage test and the committed spec pass in CI in 3 browsers.

### Phase 14 · Workspace model & panel registry
**Needs:** 13 · **Was:** v3 44.1, 44.4 · **Closes:** AUD-35 · **Status:** 📋
**Goal:** The shell renders from a saved layout instead of 22 local `useState` calls, and panels load only when shown.
- [x] `registerPanel({ id, title, zone, edition, focusScope, load | component, props })` (`src/editor/shell/panels/registry.ts`, every panel registered in `panels/builtins.tsx`) and a zod-validated `WorkspaceLayout` (`src/core/workspace/`: sizes, collapsed state, active tabs, the AI dock, the preset) saved to `localStorage` 300 ms after a change and restored on load; corrupt or blocked storage falls back to the default.
- [x] `EditorShell.tsx` is 389 lines (was 2,139): it composes `DockTree`, `PanelHost`, `CanvasChrome`, `AiDockColumn`, `OutputLogDrawer` and six hooks (`shell/hooks/`). Only the stage, Details and the Content Browser are imported statically; every other panel is fetched when first shown, and a unit test fails if a shell file imports a panel module outside the registry.
- [x] The canvas DOM node never remounts on resize, a preset switch or a viewport change (Playwright proves it). Splitters write the zone's `--zone-size` custom property straight to its DOM node during a drag and commit once on release.

**You'll see:** the panel layout you arrange survives a reload.
**Done when:** `EditorShell.tsx` is under 500 lines; Playwright proves the stage node is the same object across resizes; the bundle check shows unopened panels aren't loaded.
**Evidence (2026-10-19):** `shellStructure.test.ts` (under 500 lines, no static panel imports); `tests/e2e/workspace.spec.ts` (layout survives a reload, stage node is the same object, unopened panels are not loaded, read from `data-loaded-panels` on the dock root). Status stays 🚧 until CI passes in 3 browsers.

### Phase 15 · Design / Animate / Code presets & inspector tabs
**Needs:** 14 · **Was:** v3 44.2, 44.3 · **Closes:** AUD-21 (shell) · **Status:** 📋
- [x] Presets: **Design** (the default: stage │ Design inspector, the timeline folded to the transport bar in the status bar; the Layers panel joins it in Phase 32), **Animate** (timeline at 40% of the window, clamped to the splitter limits, Motion inspector), **Code** (stage │ a 520 px Code inspector). The header's tabs switch them; each is also a command (`workspace.preset.<id>`, and the typed `workspace.setPreset`).
- [x] Inspector tabs **Design · Motion · Code**. Motion lists the selected layer's clips and tracks from the document and opens the timeline (`MotionInspector`); editing stays on the timeline until Stage 2. Users save a layout under a name, apply it with one click and delete it (`Layouts` menu; commands `workspace.saveLayout/applyLayout/deleteLayout`, up to 20, kept in `localStorage`).
- [x] Logic, Data and Debug presets, and the Debug inspector tab, appear only in the `full` edition (unit-tested; the initial-edition browser test finds none of them).

**You'll see:** one click switches between a Figma-like and an After Effects-like layout.
**Done when:** a preset switch takes < 100 ms and doesn't remount the stage; a custom layout survives a reload.
**Evidence (2026-10-19):** `tests/e2e/presets.spec.ts` (median of five switches under 100 ms, the stage node survives them, custom layout saved, applied after a reload and deleted); `src/core/workspace/__tests__/`. Status stays 🚧 until CI passes in 3 browsers.

### Phase 16 · Threat model for the stage and user content
**Needs:** 3 · **Was:** v3 80.1 · **Closes:** AUD-51 (partial) · **Status:** 📋
**Goal:** Decide the security boundaries before building the new stage host.
- [x] A STRIDE threat model as decision record 0008 (`decisions/0008-threat-model.md`): nine trust boundaries, each with its threats and the phase that enforces it, and seven findings in today's code.
- [x] Rules the new renderer (17–19) must follow (R1–R10 in the record): no HTML strings, same-origin stage frames render only document content through render definitions, one typed bridge per frame with `event.source` checked, imported SVG sanitised once at import, limits, and a test for each rule; untrusted code goes to an opaque-origin sandbox (140).

**You'll see:** nothing yet (a document). It unblocks Phase 18.
**Done when:** the record is reviewed, and each boundary names the phase that enforces it.
**Found while writing it (2026-10-19):** layer text and ids were put into the stage's HTML unescaped inside a same-origin, scripts-allowed frame, so an imported project could run script on the editor origin; AI chat text was rendered as HTML unescaped. Both are mitigated now (`escapeHtml`, with tests) and removed for good by Phases 18 and 168.

### Phase 17 · Render definitions per archetype
**Needs:** 7, 8, 16 · **Was:** v3 48.1 · **Closes:** AUD-29 (markup half) · **Status:** 📋
**Goal:** One React component per archetype draws a layer from its geometry and props. The stage and the exporter both use them (Law 11).
- [x] `src/core/render/archetypes/*`: one React component per archetype takes `(layer, resolved props)` (a complete `Record<ArchetypeId, …>` in `definitions.ts`, so a missing one is a compile error). `layerBoxStyle` positions every layer from `frame`, `sizing` and `positioning` (absolute at `frame.x/y`, fixed sizes, hug, and fill along or across the parent's main axis; rotation, opacity, CSS units). Archetypes the old stage drew as an invisible `<div>` (toggle, badge, fab, icon, divider, background, svg group/use/text) now draw; effect surfaces and the 3D layers draw a labelled placeholder until Stages 3 and 4.
- [x] The six shape archetypes render as SVG (stroke drawn inside the frame); so do `svgPath`, `svgGroup`, `svgText`, `svgUse` and `icon`.
- [x] No inline handlers and no HTML strings: a test fails on `innerHTML`, `srcDoc`, `dangerouslySetInnerHTML`, `eval` or `new Function` under `src/core/render/` (rule R1 of decision record 0008). Hover and press looks come from states in Phase 78. The renderer also applies R5–R7: unsafe image sources and path data are dropped, sizes are clamped, a document draws at most 5,000 layers and 64 levels deep, and a cyclic document ends.
- [x] A dev route, `/editor/render-gallery`, shows 53 cases covering every archetype with default and edge-case props (empty, long and hostile text, blocked sources, tiny shapes, rotation, fill sizing).

**You'll see:** the render gallery shows every element type drawn the new way.
**Done when:** the gallery renders every archetype identically in 3 browsers (screenshot tests).
**Evidence (2026-10-19):** `tests/e2e/render-gallery.spec.ts` compares what must not differ across Chromium, Firefox and WebKit: every case's drawn size where its geometry fixes it (±1 px), that nothing from a hostile case ran or loaded, and that column, row, fill and absolute layouts place their children the same way. **Deviation:** pixel baselines are not committed, because they differ by operating system and font rasteriser and would have to be generated on the CI runner; this is a geometry check, not a screenshot diff. Status stays 🚧 until CI passes in 3 browsers.

### Phase 18 · Stage host v2: live DOM frames, no HTML strings
**Needs:** 17 · **Was:** v3 48.2, 48.5 · **Closes:** AUD-29, AUD-33 · **Status:** 📋
- [x] The stage is a same-origin `<iframe src="/stage-frame.html">` (a static file: doctype, reset, empty root, no script) drawn into by a React portal from the editor's own tree (not a second React root: stores, context and handlers stay shared). No `srcDoc`. The frame's width is a real viewport, so media queries work; it is in standards mode. No script can run in it: its document has a `script-src 'none'` CSP (response header plus meta tag), tested with an injected inline handler, script element and `javascript:` URL in all three browsers. There is no `sandbox` attribute, because WebKit then drops all events to the frame (decision record 0009 §1). (`src/editor/stage/`)
- [x] No `postMessage(…, "*")` remains in `src/` (a unit test scans every source, including scripts inside template literals). The design stage sends no messages, so it needs no bridge; the logic sandbox's messages go through `frameBridge.ts` (editor origin as target, accepted only from that frame's window, from that origin and in zod-checked shapes).
- [x] The logic sandbox (mock database and API, tracer, hot reload) stays in `SandboxHost`, loaded only through `afterTrackPanels.tsx` in the `full` edition and added to `check:bundle-scope`; the design stage (`WhiteboardCanvas` → `StageHost`) does not import it (a test checks).
- [x] `buildSandboxDocument` and `generateElementMarkup` are off the design path (decision record 0009, render host). They remain inside the full edition's logic sandbox, with every interpolated value escaped, until Phase 140 rebuilds it on the render definitions.

**You'll see:** the showcase demo is drawn from layer geometry, and editing a property no longer reloads the stage.
**Done when:** a property edit updates the stage in < 16 ms without a reload (the iframe document stays the same object); `grep` finds no `postMessage(…, "*")`; the demo matches the render gallery.
**Evidence (2026-10-19):** `tests/e2e/stage-host.spec.ts` (the frame's document is the same object across edits; undo and redo of a drawn shape reach the frame's DOM in under one frame in Chromium; keys typed over the stage reach the command bus), `frameBridge.test.ts` (including the wildcard scan), `stage.test.ts`, and the render gallery now draws through the same `StageFrame`. **Deviations:** (1) the inspector's fields are not yet wired to the document (Phases 33–34), so the latency test drives real document edits (undo/redo of a drawn shape) rather than a field; (2) Chromium is held to 16 ms, Firefox and WebKit to 50 ms until their numbers on the CI runner are known; (3) the demo no longer has the old stage's padding and card defaults, because it is now drawn from geometry. Status stays 🚧 until CI passes in 3 browsers.

### Phase 19 · Incremental updates & measurement API
**Needs:** 18 · **Was:** v3 48.3, 48.4 · **Status:** 📋
- [x] Document patches re-render only the layers they touch. Every layer is a `StoreRenderLayer`: it subscribes to its own object (`useLayer`, which Immer's structural sharing keeps identical for every untouched layer) and to its own list of drawn children in a plan store that returns the same array while a layer's children are unchanged. `StageHost` re-renders only when the top-level ids change. Editing one layer's property re-renders that layer and nothing else; adding or removing a layer re-renders its parent and the new layer; both are tested in the browser by counting renders.
- [x] `LayerNodeRegistry` (layer id → element, with subscriptions and a late-cleanup guard), filled by a `nodeRef` every render definition now receives, and held by the stage's `StageRenderer`, which `getStageRenderer()` returns (Phase 57 writes per-frame values through it).
- [x] `renderer.measure(layerIds)` returns document-space rectangles (the frame's scroll is added, so they don't change when the frame scrolls), answered from one read pass per animation frame however many callers ask, and cached until a `ResizeObserver` on every drawn element, a `MutationObserver` on the stage root or a window resize says something may have moved. `measureNow` is the synchronous form.

**You'll see:** a 500-layer document stays responsive while you edit it.
**Done when:** 500 layers mount in < 500 ms; editing one layer re-renders no other layer (subscription test); `measure()` matches the DOM within 0.5 px.
**Evidence (2026-10-19):** `/editor/stage-lab` loads 500 layers into the real stage and edits them through the real document commands; `tests/e2e/stage-incremental.spec.ts` (6 tests, Chromium, Firefox and WebKit) measured, on a quiet laptop, **500 layers mounting in 15 ms (Chromium), 42 ms (Firefox) and 34 ms (WebKit)**; one property edit → exactly one layer rendered once; add → the new layer and its parent only; remove → the parent only; `measure()` within 0.5 px of the DOM for the root, first, middle and last layers, unchanged by scrolling the frame, correct after a layout shift, and 100 simultaneous callers costing one read pass. Unit tests cover the plan store, the registry, the batching and the cache (`src/core/render/__tests__/incremental.test.ts`). Edits reach the frame's DOM in 2–7 ms in all three engines. Status stays 🚧 until CI passes in 3 browsers.

### Phase 20 · Viewport camera
**Needs:** 19 · **Was:** v3 49.1 · **Closes:** — (World Environment properties 1–6) · **Status:** 🚧
- [x] Document ↔ screen transform (`src/core/viewport/camera.ts`, pure and unit-tested); pan (Space-drag, middle mouse, trackpad), zoom 2%–6,400% (wheel, pinch, keys) around the cursor, zoom to fit (Shift+1), to selection (Shift+2) and to 100% (Shift+0). The camera is saved per document. Reuses the `WhiteboardCanvas.tsx` maths.
- [x] Wheel and pinch over the stage frame reach the camera (record 0009 §4 said Phase 20 must forward them).
- [~] Pan and zoom hold 60 fps with 5 frames × 200 layers: measured in Phase 21's canvas lab. Chromium and Firefox hold it; WebKit holds it for pan but not for zoom (37–45 ms a frame).

**You'll see:** smooth panning and zooming around your frames.
**Done when:** pan and zoom hold 60 fps with 5 frames × 200 layers; zoom keeps the point under the cursor fixed (test).

**Evidence (2026-10-19):** `src/core/viewport/__tests__/camera.test.ts` (round trip, the point under the cursor stays fixed through zooms from 2% to 6,400%, clamping, steps, fit); `tests/e2e/viewport-camera.spec.ts` in Chromium, Firefox and WebKit (zoom keeps the cursor point fixed to 0.01 px, 2%–6,400% range, wheel pans, buttons zoom to 100% and fit, pinch and wheel over the stage frame reach the camera, the camera survives a reload, Shift+2 centres the selected layer and Shift+0 returns to 100%). **Design:** the camera lives in `useCameraStore` and is written straight to the canvas node's CSS variables, so a wheel tick never re-renders React. It is saved per project id in `localStorage` (a view setting, not document content, so no schema change). **Deviations:** the 60 fps gate needs five frames, which Phase 21 builds, so it is measured there; zoom limits in the World Environment defaults moved to 2–6,400 and the canvas no longer reads them (the camera clamps). Status stays 🚧 until CI passes in 3 browsers.

### Phase 21 · Multi-frame canvas
**Needs:** 20 · **Was:** v3 49.2, 20.3 · **Status:** 🚧
- [x] Several top-level frames side by side, each its own stage host, with device presets and custom sizes, titles, and add, duplicate and reorder. The backdrop can be light, dark or checkerboard.
- [x] The header's Desktop / Tablet / Mobile switch creates or focuses frames of those sizes.

**You'll see:** Desktop, Tablet and Mobile frames next to each other.
**Done when:** Playwright creates 3 frames, reloads, and finds the same 3.

**Evidence (2026-10-19):** `src/core/frames/__tests__/frames.test.ts` (frames are top-level layers, order, positions, add / duplicate / rename / resize / reorder / delete as one undo step each) and `src/core/render/__tests__/frameRenderers.test.ts`; `tests/e2e/frames.spec.ts` (Desktop, Tablet and Mobile make three frames, each its own frame element with its own width, and the same three come back after a reload; custom size, rename, resize, duplicate, reorder, delete; the three backdrops; the active frame follows the header and clicks). **Design:** a frame is a top-level layer (Phase 42), so frames are saved with the document and need no schema change; their order is their position left to right, and a reorder re-spaces the row in one undo step. Each frame is its own `StageHost` (`frameId`) with its own renderer; `getStageRenderer()` answers for the active frame, `getStageRendererForLayer(id, layers)` for the frame that draws a layer. Everything runs through typed `frame.*` commands (Law 20). **Phase 20's 60 fps gate** is measured here on `/editor/canvas-lab` (5 frames × 200 layers): Chromium and Firefox 16.7 ms per frame for pan and zoom; WebKit 18 ms for pan but 37–45 ms for zoom, because it repaints a scaled frame's text on every zoom step (two compositing-layer hints did not help). **Open:** WebKit zoom at 60 fps, so Phase 20's last box stays unticked. Status stays 🚧 until CI passes in 3 browsers.

### Phase 22 · Hit-testing
**Needs:** 21 · **Was:** v3 49.3 · **Status:** 🚧
- [x] A spatial index over measured rectangles (the existing TS `SpatialIndex`): deepest layer first, Cmd/Ctrl for deep select, locked and hidden layers skipped.
- [x] In Design mode the canvas captures every pointer event; nothing reaches the frames.

**You'll see:** hovering shows the layer a click would select.
**Done when:** hit-test p95 < 1 ms with 1,000 layers; clicks at 20 known points select the expected layers at 3 zoom levels.

**Evidence (2026-10-19):** `src/core/hit/__tests__/hitTest.test.ts` (the rules, the build from measured frames, and **p95 under 1 ms for a plain plus a deep pick with 1,001 layers**); `tests/e2e/hit-testing.spec.ts` in Chromium, Firefox and WebKit (the frames get `pointer-events: none`; 20 points chosen from the visible layers of `/editor/canvas-lab`, at three zoom levels, each clicked plainly and with the deep-select modifier and the exact selection asserted; a locked group is skipped and a hidden one is not there to hit; hovering shows the outline of what a click would select). **Rules decided here:** a plain click picks the frame's direct child (Figma's rule), Cmd/Ctrl picks the deepest layer, empty space inside a frame picks the frame, a locked layer hides its whole subtree from hits, and a layer is clipped to its frame. The index is rebuilt only when the document or a frame's layout version changes. **Deviation:** clicks no longer reach the frames' own click handlers in Design mode (record 0009 §2 said they did); `onElementClick` stays for Preview mode (Phase 23). A frame whose own content scrolls isn't handled yet. Status stays 🚧 until CI passes in 3 browsers.

### Phase 23 · Overlay layer & Design / Preview modes
**Needs:** 22 · **Was:** v3 49.4, 49.5 · **Status:** 🚧
- [x] One overlay layer above the frames draws hover outlines, selection, handles, guides and labels. Its redraw loop moves onto the frame scheduler in Phase 55. (Hover and selection with its name and size are drawn; handles are Phase 27 and guides Phase 28. Phase 55 is already done, so the overlay redraws on the frame scheduler from the start.)
- [x] A Design / Preview toggle: in Preview, pointer events reach the frames, so links and buttons work.

**You'll see:** hover outlines, and a Preview button that makes the page clickable.
**Done when:** the hover outline appears within 1 frame with 1,000 layers; a click in Preview reaches a button (test).

**Evidence (2026-10-19):** `tests/e2e/overlay-modes.spec.ts` in Chromium, Firefox and WebKit on the 1,055-layer canvas lab: there is one overlay layer, after the frames in the same world, with `pointer-events: none`; **a dispatched mouse move has its outline on screen by the second animation frame** (the gate's "within 1 frame"; the annotation records the count); a selected layer gets an outline labelled with its name and size; in Design mode a click selects and never reaches the frame, in Preview mode the same click reaches a handler inside the frame, doesn't change the selection, and the overlay shows no selection. **Design:** `OverlayController` writes a few pooled DOM elements and redraws in the frame scheduler's `overlay` phase, asked for by pointer, selection, document, camera and mode changes (edits ask for two follow-up passes, since layout can land a frame later); no React renders per pointer move. **Deviation:** the deep-select modifier is read from mouse events, not from a key listener (Phase 13's coverage test forbids raw key listeners), so Cmd/Ctrl changes the hover on the next pointer move. Status stays 🚧 until CI passes in 3 browsers.

### Phase 24 · Tool state machine
**Needs:** 13, 23 · **Was:** v3 43.2 (infrastructure) · **Status:** 📋
- [ ] A tool is `{ id, cursor, onPointerDown/Move/Up, onKey, drawOverlay }` with pointer capture. Spring-loaded tools: holding Space gives the Hand, holding Cmd/Ctrl gives deep select, and releasing returns to the previous tool.
- [ ] The floating dock switches tools through commands. Buttons whose feature doesn't exist yet are hidden until their phase.
- [ ] Port the Tier A tools from branch `phase-43-command-bus-finish` (`7a97baa`, `6d4e1bd`, `5c020dd`) onto the overlay instead of rewriting them.

**You'll see:** every tool button in the dock either works or isn't there.
**Done when:** tool-switching and spring-loaded tests pass.

### Phase 25 · Creation tools: frames, shapes and text boxes
**Needs:** 24 · **Was:** v3 43.2 (Tier A), 20.4 · **Status:** 📋
- [ ] F frame, R rectangle, O ellipse (Shift for a circle), L line and arrow, polygon, star, T text box. Drawing inside a frame parents the new layer to it; Shift constrains; Alt draws from the centre.
- [ ] Each creation is one undo step and leaves the new layer selected.

**You'll see:** you can draw frames, shapes and text boxes.
**Done when:** Playwright draws with each tool and checks geometry, parent and undo.

### Phase 26 · Selection
**Needs:** 25 · **Was:** v3 20.1 (selection) · **Status:** 📋
- [ ] Click, Shift-click, marquee, select all / none / inverse, select children and parent (Enter / Shift+Enter), deep select. One selection store shared by the canvas, Layers panel, inspector and (later) timeline.

**You'll see:** selection stays in sync everywhere.
**Done when:** a 15-step selection journey asserts the exact selection after each step.

### Phase 27 · Transform handles
**Needs:** 26 · **Was:** v3 20.1 (transform) · **Closes:** AUD-19 (selection) · **Status:** 📋
- [ ] Move, resize (edges and corners, aspect lock, from centre) and rotate (Shift snaps to 15°), for single and multiple selections. Each gesture writes `frame.*` in one transaction; Esc cancels it.
- [ ] On-canvas parameter handles: corner radius, star points and inner radius, polygon sides.

**You'll see:** Figma-style handles on whatever you select.
**Done when:** 30 standard manipulations give exact geometry and exactly 30 undo steps.

### Phase 28 · Snapping, smart guides & rulers
**Needs:** 27 · **Was:** v3 20.2 · **Closes:** AUD-20 (Tier 1: properties 7–23, 27–30) · **Status:** 📋
- [ ] Snap to the pixel grid, to layout grids, and to edges and centres of other layers; equal-spacing detection; the distance HUD (Alt shows distances); rulers with draggable guides; snap toggles.

**You'll see:** guides and spacing labels while you drag.
**Done when:** snapping golden tests pass; guides persist per frame.

### Phase 29 · Editing operations
**Needs:** 26 · **Was:** — (new: not planned in v3) · **Status:** 📋
- [ ] Copy, cut and paste (in place, into the selection, across frames and across projects through the clipboard), duplicate (Cmd+D, remembering the last offset), delete, arrow-key nudge (Shift for 10 px), bring forward / backward / to front / to back, group and ungroup (Cmd+G), frame selection (Cmd+Alt+G), lock, hide and rename.
- [ ] A context menu on the canvas and in the Layers panel. Every item is a command (Law 20).

**You'll see:** the familiar Figma keyboard workflow works.
**Done when:** a 25-step operations journey passes, and a copy in one tab pastes into another.

### Phase 30 · Align, distribute & tidy
**Needs:** 29 · **Was:** — (new) · **Status:** 📋
- [ ] Align left, centre, right, top, middle and bottom (to the selection or the parent); distribute horizontal and vertical spacing; tidy into a grid; drag equal-spacing handles on the canvas.

**You'll see:** align and distribute buttons in the inspector, and spacing handles on the canvas.
**Done when:** golden geometry tests pass for every operation.

### Phase 31 · Text on the canvas
**Needs:** 25 · **Was:** — (new) · **Status:** 📋
- [ ] Double-click to edit text in place; auto-width, auto-height and fixed sizing; mixed styles inside one text layer (bold, italic and colour runs); paste as plain text.
- [ ] Text properties in the inspector: family, size, weight, line height, letter spacing, alignment, decoration and case.

**You'll see:** you type directly on the canvas.
**Done when:** styled runs survive save and reload; an IME composition test passes.

### Phase 32 · Layers panel
**Needs:** 15, 26 · **Was:** v3 21.1 · **Status:** 📋
- [ ] A tree with drag to reorder and reparent (validated by `rules.canAdd`, with the reason shown when refused), rename in place, lock and hide, expand and collapse, search, and a virtualised list. The old outliner components are retired.

**You'll see:** a Figma-like layer tree in sync with the canvas.
**Done when:** an illegal reparent is refused with its reason; a 500-layer tree scrolls at 60 fps.

### Phase 33 · Design inspector: Simple face
**Needs:** 32 · **Was:** v3 22.1 (design half) · **Closes:** AUD-20 (partial) · **Status:** 📋
- [ ] At most 7 controls: position and size (writing `frame.*`; today these fields are placeholders that never reach the document), fill, stroke, radius, opacity, text.
- [ ] Mixed values for multiple selections. Every change is a command.

**You'll see:** editing position, size or fill updates the canvas live.
**Done when:** every Simple control round-trips to the document (unit and Playwright).

### Phase 34 · Design inspector: Pro face
**Needs:** 33 · **Was:** v3 22.2 · **Status:** 📋
- [ ] Every registry property for the selection, grouped by the registry's sections; numeric scrubbing, units and keyboard increments.
- [ ] The Law 17 label check: a CI test scans the rendered Simple faces for technical terms.

**You'll see:** a Pro switch that shows every property.
**Done when:** a coverage test finds a control for every registry path of every archetype.

### Phase 35 · Paint: colour, gradients, strokes, shadows & blur
**Needs:** 34 · **Was:** v3 22.2 (paint) + new · **Status:** 📋
- [ ] A colour picker (HSB and OKLCH, hex, alpha, eyedropper where the browser supports it); linear, radial and conic gradients with handles on the canvas; multiple fills; strokes with dashes; drop and inner shadows; layer and background blur.

**You'll see:** Figma-style paint controls with gradient handles on the canvas.
**Done when:** each paint type renders identically in 3 browsers (screenshot tests).

### Phase 36 · Asset store & storage safety
**Needs:** 3 · **Was:** v3 54.1, 54.2 · **Closes:** AUD-37 (images), AUD-53 (persist request) · **Status:** 📋
- [ ] Content-hashed blobs in IndexedDB with a `document.assets` manifest; import by drag and drop or paste; SVG sanitised (rules from Phase 16); thumbnails made in a worker; the hard-coded remote image defaults replaced by bundled sample assets.
- [ ] `.lazy.json` embeds or links assets; `navigator.storage.persist()` is requested on the first save; a cross-tab lock (BroadcastChannel) opens a second tab of the same project read-only, so two tabs can't overwrite each other.

**You'll see:** an Assets panel; dropping an image file onto the canvas adds it.
**Done when:** 200 MB of assets survive a reload; a malicious SVG fixture is cleaned; a second tab opens read-only.

### Phase 37 · Image layers
**Needs:** 36 · **Was:** — (new) · **Status:** 📋
- [ ] Image fills on any shape or frame; fill, fit, crop and tile modes; crop handles on the canvas; replace image; brightness, contrast and saturation as properties.

**You'll see:** Figma-style image cropping.
**Done when:** crop and fill modes round-trip through save and render identically in 3 browsers.

### Phase 38 · Fonts
**Needs:** 36 · **Was:** v3 17.3 · **Status:** 📋
- [ ] A font picker (the Google Fonts list plus local uploads stored as assets), weights and variable axes, `font-display`, and layout that waits for fonts to load (no jump).

**You'll see:** any Google font or your own font on the canvas.
**Done when:** an uploaded font renders after a reload in 3 browsers.

### Phase 39 · Pen & pencil
**Needs:** 24 · **Was:** v3 35.1–35.4 · **Closes:** AUD-19 · **Status:** 📋
- [ ] Pointer capture with coalesced events and pressure. Pencil: streamline smoothing, Ramer–Douglas–Peucker simplification and bezier fitting. Pen: click-to-place bezier nodes as in Figma. Both produce vector layers with caps, joins, dashes, and fills for closed paths.
- [ ] Per-point timestamps are kept (Phase 181 uses them for draw-to-animate).

**You'll see:** working pen and pencil tools.
**Done when:** a recorded 3-second scribble becomes a path of < 60 nodes within 1.5 px of the input; 120 Hz input renders at 60 fps.

### Phase 40 · Vector editing & boolean operations
**Needs:** 39 · **Was:** v3 16.1 · **Status:** 📋
- [ ] Path edit mode (Enter or double-click): move nodes, drag bezier handles, add and remove nodes, close and open paths, mirrored handles. Boolean union, subtract, intersect and exclude; flatten. SVG import (sanitised) as editable vectors.

**You'll see:** you can reshape any vector point by point.
**Done when:** a 500-node imported SVG stays editable at 60 fps; boolean golden tests pass.

### Phase 41 · Auto-layout: stacks
**Needs:** 27, 32 · **Was:** v3 50.1 (stacks) · **Status:** 📋
- [ ] Shift+A adds auto-layout: direction, gap, padding, alignment, wrap; hug, fill and fixed sizing; drag to reorder inside a stack. It maps 1:1 to CSS flex.

**You'll see:** cards and buttons that resize to their content.
**Done when:** a fixture with nested stacks lays out identically in 3 browsers at 5 widths.

### Phase 42 · Grid layout & constraints
**Needs:** 41 · **Was:** v3 50.1 (grid), 50.2 · **Status:** 📋
- [ ] Grid containers (columns, rows, gaps, spans) mapped to CSS grid, and layout-grid overlays. Constraints for absolutely positioned children: left, right, both, centre or scale, and the same vertically.

**You'll see:** resizing a frame moves and stretches its children the way you set.
**Done when:** constraint and grid golden tests pass when frames are resized.

### Phase 43 · Breakpoints & overrides
**Needs:** 42 · **Was:** v3 50.3 (properties half) · **Status:** 📋
- [ ] Document breakpoints (1440, 768, 375 and custom). Any property can be overridden per breakpoint, and layers can be hidden per breakpoint. The inspector marks overridden values and resets them (like Wix Studio's breakpoint bar).

**You'll see:** a breakpoint bar; changes at Mobile don't touch Desktop.
**Done when:** an override applies only at its width, can be reset, and undoes in one step.

### Phase 44 · Breakpoint canvas
**Needs:** 21, 43 · **Was:** v3 50.4 · **Status:** 📋
- [ ] Every breakpoint of a page side by side as linked frames; drag a frame's edge to reflow it live; selecting a layer selects it at every breakpoint.

**You'll see:** Desktop, Tablet and Mobile versions of the same page updating together.
**Done when:** a 200-layer page reflows at 60 fps while its frame edge is dragged.

### Phase 45 · Design tokens & styles
**Needs:** 35, 38 · **Was:** v3 22.3 · **Closes:** AUD-20 (Tier 2: properties 34–40) · **Status:** 📋
- [ ] Colour, text, effect and spacing styles (variables); light and dark modes; layers bind to tokens, and detached values are shown clearly. The inspector's Tokens tab becomes the real token manager.

**You'll see:** change one colour style and the whole design updates; switch to dark mode.
**Done when:** a fixture restyles completely when the mode changes, and detached values stay put.

### Phase 46 · Components & instances
**Needs:** 29, 32 · **Was:** v3 75.1, 75.5 (design) · **Closes:** AUD-44 (components, design) · **Status:** 📋
- [ ] Create a component (Cmd+Alt+K); instances with overrides tracked per property path; reset, swap and detach; go to main component; components listed in the Assets panel.

**You'll see:** a button component whose instances update when you edit the main one.
**Done when:** editing a main component keeps every override in 40 instances.

### Phase 47 · Variants & component properties
**Needs:** 46 · **Was:** v3 75.2 (static), 75.3 · **Status:** 📋
- [ ] Variant sets as a property matrix (for example size × tone × state); exposed properties (text, image, boolean, instance swap); slots for nested content (grammar 3.C.4).

**You'll see:** a button with Size and Tone dropdowns in the inspector.
**Done when:** a design-system fixture (3 components × 3 variants, 40 instances with overrides) behaves correctly after editing every main component.

### Phase 48 · Sections, pages & prototype links
**Needs:** 23, 47 · **Was:** v3 76.1 (static), 77.1, 77.2, 77.4 · **Closes:** AUD-44 (pages, design) · **Status:** 📋
- [ ] Sections (full-width bands with anchors). A Pages panel with routes (reusing the After-track Pages Manager after checking it works). Shared navbar and footer sections. Links to a page, an anchor or a URL, and frame-to-frame prototype links. Preview mode navigates between pages.

**You'll see:** a multi-page site you can click through in Preview.
**Done when:** a 5-page fixture navigates in Preview, including back and forward.

### Phase 49 · Static export v1
**Needs:** 37, 45, 48 · **Was:** v3 27.1 (part), 48 gate, 50.5 (layout), 75.5 · **Closes:** AUD-15, AUD-16, AUD-40 (static halves) · **Status:** 📋
- [ ] Export from the render definitions (Phase 17) to Next 16 App Router, Vite React and plain HTML/CSS, with Tailwind or CSS Modules. Components become files with typed props, pages become routes, breakpoints become responsive CSS, and only referenced assets and fonts are included.
- [ ] The export target is chosen at export time. The Code tab shows the real export of the selection.
- [ ] Export harness: every archetype and the 5-page fixture build, and match the stage (≤ 0.5% per archetype, at 5 widths).

**You'll see:** Export → Download ZIP gives a site that looks like the canvas.
**Done when:** the harness is green in CI for Next, Vite and HTML.

### Phase 50 · Agent bridge: local MCP server v0
**Needs:** 13, 49 · **Was:** — (new) · **Status:** 📋
**Goal:** Claude (Desktop, Code, or any MCP client) can operate the editor through the same commands a person uses.
- [ ] `npx lazylayout-mcp` (a stdio MCP server) pairs with an open editor tab over a localhost WebSocket. Pairing is off by default, needs a code shown in the editor, and checks the origin (decision record 0014, MCP bridge).
- [ ] Tools are generated from the command registry (Phase 13): read the document, selection and layers; run any command with typed arguments; apply MDM patches; render a frame to PNG; export. Resources: the MDM JSON Schema, a rules summary and the property registry.
- [ ] Writes arrive as a pending diff the user approves, or with a per-session "approve automatically" switch. Each change is still one logged undo step (Law 4).

**You'll see:** in Claude, "add a pricing section with three cards" builds it on your canvas as a diff you accept.
**Done when:** an MCP client test drives 20 commands end to end; unpaired connections are refused; the coverage test reports no command missing from MCP.

### Phase 51 · Section templates & starter projects
**Needs:** 45, 48 · **Was:** v3 76.3 (static half), 76.4 · **Status:** 📋
- [ ] Original, token-themed templates: navbar, hero, features, pricing, testimonials, FAQ, CTA, footer. Starter projects (landing page, portfolio). Switching the theme restyles every template.

**You'll see:** an Insert → Sections gallery.
**Done when:** a first-time user builds a landing page from 6 templates in < 10 minutes (usability script).

### Phase 52 · Stage 1 gate: the design journey
**Needs:** 13–51 · **Was:** v3 58.1 + new · **Status:** 📋
- [ ] **Journey A (Figma user):** two frames; a card component with auto-layout, constraints and 3 variants; a Mobile override; a pen-drawn icon; inline text; colour and text styles.
- [ ] **Journey B (Wix user):** a 3-page site from templates, with navigation links, breakpoints and Preview.
- [ ] **Journey C (output):** the export ZIP builds in Next and Vite and matches the canvas at 5 widths; `.lazy.json` round-trips unchanged.
- [ ] **Journey D (agent):** Claude, through MCP, builds a section that the user approves.
- [ ] **Performance:** 5 frames × 200 layers pan and zoom at 60 fps; hit-test p95 < 1 ms.
- [ ] **Cleanup:** the old design-path renderer is gone (grep gate). `UI.md`, `PANELS.md`, `SCHEMA_REFERENCE.md`, `CONVENTIONS.md` and `FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md` are rewritten to match the code (v3 6.3's open item).

**You'll see:** LazyLayout works as a responsive design tool with export. This is the first stage a user could try for real.
**Done when:** all four journeys pass as Playwright scripts in CI in 3 browsers, plus one recorded manual run.

---

# STAGE 2 — ANIMATION GRAMMAR (Phases 53–102)

> **Stage output:** everything designed in Stage 1 can be animated the way After Effects users expect. One clock drives the stage; the kernel from Phase 11 finally runs it. An After Effects-style timeline (layer bars, twirl-downs, work area, precomps, J/K/L), keyframes with a graph editor, motion paths and onion skin on the canvas, anchors, parenting, blend modes, masks and mattes, effect stacks, expressions, states and smart-animate transitions, animated component variants, scroll-driven motion, split-text and SVG motion, per-breakpoint motion and page transitions. A Playground to tune it, a first library of ready-made motion, and verified export to code, video, GIF and Lottie.
>
> Order inside the stage: grammar completeness (53) → time (54–56) → the live preview runtime (57–60) → the After Effects timeline (61–68) → motion on the canvas (69–71) → compositing (72–75) → expressions (76–77) → states (78–80) → scroll (81–82) → text (83–84) → SVG (85–86) → the Motion engine (87) → responsive and page motion (88–89) → Playground, library and accessibility (90–93) → export and output (94–101) → the gate (102).

### Phase 53 · Animation grammar: close the schema gaps
**Needs:** 10, 11 · **Was:** — (AUD-59, found by v3 8) · **Closes:** AUD-59 · **Status:** ✅
**Goal:** Every animation category in the grammar has a lossless form in the document before any UI is built on it (Law 1).
- [x] A schema version bump with migration (v6, `migrations/v5-to-v6.ts`): **Exit** (a leave trigger distinct from entering), **Focus** as a clip category, **Stagger** as a first-class category over the existing modifier, **LayoutTransition** (FLIP-style layout changes); lossless `pointerMove`, `drag` and `time` triggers.
- [x] `clip-adapter.ts` maps all 10 grammar categories with no named gaps; `PHASE8_SCHEMA_GAPS` becomes empty.
- [x] The kernel evaluates Exit and LayoutTransition clips (golden tests).

**You'll see:** nothing new yet; the animation menus offer Exit, Focus and Layout categories once the timeline lands (61).
**Done when:** the rule table, kernel and migration tests pass with no schema gaps listed.

### Phase 54 · Transport & one clock
**Needs:** 11, 12 · **Was:** v3 45.1 · **Closes:** AUD-30 · **Status:** ✅
- [x] `src/core/time/transport.ts`: time, playing, rate, loop (off / loop / ping-pong), work area, fps, composition. Commands: play, pause, seek, step frame, shuttle (J/K/L), set work area.
- [x] An observable store outside React. Text reads it through `useTransportTime({ maxHz: 10 })`.

**You'll see:** a transport bar (play, pause, timecode, loop) that controls the whole studio.
**Done when:** frame stepping lands on exact frame times at 24, 30 and 60 fps (golden tests).

### Phase 55 · Frame scheduler
**Needs:** 54 · **Was:** v3 45.2, 45.3 · **Closes:** AUD-41 · **Status:** ✅
- [x] One `requestAnimationFrame` loop with ordered phases: input → evaluate → apply → render → overlay → stats (`src/core/time/scheduler.ts`). Panels register tasks in a phase. The transport advances in `evaluate`. *(The overlay moves onto it when Phase 23 builds it.)*
- [x] A lint rule bans `requestAnimationFrame` outside `src/core/time/**` (short allowlist in `eslint.config.mjs`; `MotionSequencer.tsx` leaves it in Phase 56).
- [x] Deterministic mode (`setDeterministic` + `step(dt)`): the Phase 4 test clock plugs in, and the render queue (100) drives it one frame at a time.

**You'll see:** playback and overlay redraws stay smooth together.
**Done when:** `deterministic-clock.spec.ts` case 3 (the AUD-41 falsifier) flips to deterministic; the lint rule passes.

### Phase 56 · Move playback onto the clock; retire the old Sequencer clock
**Needs:** 55 · **Was:** v3 45.4 · **Closes:** AUD-38 · **Status:** ✅
- [x] The Sequencer and its playhead controls use the transport (the toolbar's Play is the live-app preview, a different thing, and is untouched). Deleted `MotionSequencer`'s local `currentTime`, its rAF loop, `interpolateTrackValue` (and `scrubPatch.ts`) and the `SANDBOX_HOT_PATCH` broadcast. Until Phase 57 puts the kernel on the stage, scrubbing and playing move the playhead but do not animate the stage.

**You'll see:** the timeline playhead and the canvas always show the same time.
**Done when:** during playback the timeline panel makes ≤ 10 React commits per second; canvas and timeline agree within 1 frame (Playwright).

### Phase 57 · Engine adapters & the kernel on the stage
**Needs:** 19, 56 · **Was:** v3 10.1 (interface, kernel adapter) · **Closes:** AUD-09 (partial) · **Status:** 📋
- [ ] `EngineAdapter { mount, play, pause, seek, setInputs, dispose }` plus capabilities. Adapters are driven by the scheduler and write through the `LayerNodeRegistry` (Phase 19), never through React or `postMessage`.
- [ ] `KernelAdapter` applies `evaluate()` directly. It is the universal fallback and the scrub engine.

**You'll see:** pressing play animates the real layers on the canvas, eased exactly as the curves say.
**Done when:** 10 reference animations seeked to 5 times match the kernel's values within 0.5 px.

### Phase 58 · CSS / Web Animations adapter
**Needs:** 57 · **Was:** v3 10.1 (WAAPI) · **Status:** 📋
- [ ] Routed animations (Phase 10's `rules.route`) run as Web Animations or CSS where they can (compositor thread); seek maps to `currentTime`.

**You'll see:** passive loops and simple tweens keep running smoothly even when the main thread is busy.
**Done when:** WAAPI-routed reference animations match the kernel at 5 times (≤ 0.5% pixels).

### Phase 59 · Scrub vs play
**Needs:** 58 · **Was:** v3 10.2 · **Status:** 📋
- [ ] While scrubbing, every layer is driven by the kernel. On play, each layer hands over to its routed adapter at the current time with matching velocity.

**You'll see:** scrubbing and playing look the same at every frame.
**Done when:** 10 reference animations show identical screenshots paused at 5 times from the kernel and from the running engine (≤ 0.5%).

### Phase 60 · Parity overlay
**Needs:** 59 · **Was:** v3 10.3 · **Status:** 📋
- [ ] A dev overlay samples running engines against `evaluate()` every N frames and raises `[PARITY_DRIFT]` beyond tolerance.

**You'll see:** a parity badge in the status bar (dev builds) that turns red on drift.
**Done when:** an injected wrong easing raises `[PARITY_DRIFT]`; correct playback stays green.

### Phase 61 · Timeline workspace: layout
**Needs:** 15, 54, 60 · **Was:** v3 52.1, 23.1, 21.2 · **Status:** 📋
- [ ] Left: the layer stack (same order and selection as the Layers panel) with switches: visible, solo, lock, shy, motion blur, blend mode, parent pick-whip.
- [ ] Right: a time ruler (timecode or frames), layer bars with in/out trimming, the work area, composition and layer markers, the current-time indicator.
- [ ] Motion badges in the Layers panel (clip count, states, engine); clicking one opens it in the timeline.

**You'll see:** an After Effects-style timeline under the canvas in the Animate preset.
**Done when:** a 10-step journey (trim, set work area, add marker, solo, lock) asserts the document after each step.

### Phase 62 · Twirl-downs & stopwatches
**Needs:** 61 · **Was:** v3 52.2 · **Status:** 📋
- [ ] Layer → groups (Transform, Appearance, Effects, States, Behaviours, Links) → properties, each with a stopwatch that starts keyframing. `U` reveals animated properties, `UU` modified ones.

**You'll see:** twirl down a layer and click a stopwatch to animate any property.
**Done when:** stopwatch on/off round-trips through undo and save.

### Phase 63 · Timeline navigation
**Needs:** 62 · **Was:** v3 52.3 · **Status:** 📋
- [ ] Ruler scrubbing, zoom to work area, J/K/L shuttle, I/O to jump to in/out points, B/N to set the work area, Page Up/Down to step frames (Shift for 10). All are commands with timeline focus.

**You'll see:** After Effects shortcuts work in the timeline.
**Done when:** a keyboard-only navigation journey lands on exact times.

### Phase 64 · Timeline at scale
**Needs:** 63 · **Was:** v3 52.4 · **Status:** 📋
- [ ] Keyframe lanes drawn on a canvas (not one DOM node per keyframe) and virtualised; the scheduler draws the time indicator.

**You'll see:** big compositions stay smooth.
**Done when:** 200 layers × 20 properties scrub at 60 fps.

### Phase 65 · Nested & interaction composition tabs
**Needs:** 64 · **Was:** v3 52.5 · **Status:** 📋
- [ ] Double-click a precomp bar to open it in a new tab with breadcrumbs. Interaction compositions (hover, press, scroll) appear as their own tabs with the trigger in the tab header.

**You'll see:** hover and press animations are timelines you can open and edit.
**Done when:** a journey opens a precomp, edits it and returns via breadcrumbs; the parent shows the change.

### Phase 66 · Keyframing
**Needs:** 65 · **Was:** v3 23.2 · **Status:** 📋
- [ ] Auto-key record mode (change any property at the playhead → keyframe). Multi-select, box select, align, distribute, scale time, copy and paste across layers.

**You'll see:** turn on record, move things on the canvas or in the inspector, and keyframes appear.
**Done when:** 3 recorded changes create 3 keyframes, playback matches `evaluate()`, and undo removes them.

### Phase 67 · Graph editor & easing
**Needs:** 66 · **Was:** v3 23.3 · **Status:** 📋
- [ ] Value and speed graphs with bezier handles and spring previews (reusing `CurveEditor.tsx` and `SpringEditor.tsx`), per-keyframe easing, an easing preset strip, and springs edited as Bounce and Time (Law 17).

**You'll see:** a graph editor like After Effects', with named feels (Snappy, Smooth, Bouncy, Lazy).
**Done when:** curve edits match the kernel's golden values; the Simple face shows no stiffness or damping (label check).

### Phase 68 · Retire the legacy animation panels
**Needs:** 67 · **Was:** v3 57.1 (part) · **Closes:** AUD-39 · **Status:** 📋
- [ ] The Content Browser's Animation panel (tracks in local state) and the legacy Sequencer are deleted or rebuilt on the document. `AnimationSample` is folded into the document model.

**You'll see:** one timeline; every animation edit survives reload and undo.
**Done when:** a grep gate finds no `INITIAL_ELEMENT_TRACKS` or `AnimationSample` usage; the Phase 3 persistence suite passes.

### Phase 69 · Motion paths on the canvas
**Needs:** 40, 68 · **Was:** v3 53.1 · **Status:** 📋
- [ ] Position keyframes draw as a path with keyframe dots and per-frame ticks (spacing shows speed). Drag a dot to change that keyframe; drag bezier handles for spatial interpolation (a new track field, separate from easing).

**You'll see:** After Effects-style motion paths you can bend on the canvas.
**Done when:** dragging a dot changes exactly one keyframe in one undo step; sampled positions match `evaluate()` within 0.5 px.

### Phase 70 · Auto-key on the stage & value HUD
**Needs:** 69 · **Was:** v3 53.2, 53.4 · **Status:** 📋
- [ ] In record mode, dragging a layer on the canvas writes keyframes. While scrubbing, x, y, rotation and opacity show next to the layer.

**You'll see:** animate by dragging things around the canvas.
**Done when:** a drag at 3 playhead times creates 3 keyframes.

### Phase 71 · Onion skin
**Needs:** 70 · **Was:** v3 53.3 · **Status:** 📋
- [ ] N ghost frames before and after the playhead at adjustable opacity, drawn from `evaluate()`.

**You'll see:** ghosts of where a layer was and will be.
**Done when:** 5 ghosts hold 60 fps.

### Phase 72 · Anchor points & pins
**Needs:** 71 · **Was:** v3 51.1, 88.2 (model) · **Status:** 📋
- [ ] One pin model: 9 preset pins plus custom pins (which may lie outside the box). The anchor is the pin used for rotation and scale; it can be moved on the canvas.

**You'll see:** drag a layer's anchor point; rotation follows it.
**Done when:** rotation and scale about every preset pin match golden values.

### Phase 73 · Parenting & helper layers
**Needs:** 72 · **Was:** v3 51.2, 88.1 (rendering) · **Status:** 📋
- [ ] Pick-whip parenting independent of the layer tree; the kernel composes parent transforms. Helper layers (`render.role: helper`, the After Effects null) draw dashed in Design mode and never in Preview or export.

**You'll see:** link a layer to an invisible null and it follows.
**Done when:** a 3-level parent chain matches `evaluate()` in the stage; helpers are absent from the Preview DOM.

### Phase 74 · Blend modes, adjustment layers, masks & mattes
**Needs:** 73 · **Was:** v3 51.3, 51.4 · **Status:** 📋
- [ ] Blend modes, isolated groups, adjustment layers (`backdrop-filter`), alpha and luma mattes through CSS/SVG masks, and animatable mask paths (Phase 40 path editing).

**You'll see:** a title revealed through an animated mask.
**Done when:** 5 compositing reference scenes match `evaluate()` in 3 browsers.

### Phase 75 · Effect stack & motion blur
**Needs:** 74 · **Was:** v3 51.5, 51.6 · **Status:** 📋
- [ ] An ordered per-layer effect list (blur, glow, drop shadow, colour adjust, displacement, noise) with keyframeable parameters, routed by the rules to CSS filter, SVG filter or (from Stage 3) shader. Opt-in motion blur from transform velocity.

**You'll see:** stack effects on a layer and keyframe their settings.
**Done when:** a 4-effect stack matches `evaluate()`; the rules explain each effect's route.

### Phase 76 · Property links & pick-whip
**Needs:** 75 · **Was:** v3 47.1, 47.3, 47.4 · **Status:** 📋
- [ ] `Link { target, source, map }` (range or curve). Drag from one property to another in the timeline or inspector to link them. Topological order; cycles refused with `[LINK_CYCLE]` and the chain shown.

**You'll see:** link one layer's rotation to another's position.
**Done when:** link golden tests pass; a cycle is refused with its chain.

### Phase 77 · Expressions
**Needs:** 76 · **Was:** v3 47.2, 47.4 (export) · **Status:** 📋
- [ ] A small typed expression language (parser → AST → evaluator; no `eval`): arithmetic, `time`, `value`, `wiggle(freq, amp, seed)`, `loopOut`, `linear` / `ease`, `clamp`, `valueAtTime`, and references to other layers. Exports compile to plain functions or bake to keyframes.

**You'll see:** type `wiggle(2, 10)` on a property and it moves.
**Done when:** 20 golden tests pass, including `wiggle` determinism across runs and browsers.

### Phase 78 · States
**Needs:** 33, 77 · **Was:** v3 11.1 · **Status:** 📋
- [ ] Built-in states per archetype (idle, hover, pressed, focus, disabled, inView, loading …) and custom states. Editing a state means selecting it and changing properties on the canvas; the difference from the base is stored.

**You'll see:** a state picker in the Motion tab; style a button's hover state on the canvas.
**Done when:** state edits round-trip; Preview shows the states on real hover and press.

### Phase 79 · Transitions & smart animate
**Needs:** 78 · **Was:** v3 11.2 · **Closes:** AUD-14 (preview, partial) · **Status:** 📋
- [ ] Automatic transitions between any two states: a spring (default for interactions) or a tween, per-property overrides, and interruption that keeps velocity.

**You'll see:** hovering a button animates smoothly, even when you move in and out quickly.
**Done when:** clicking a 2-state toggle 10 times rapidly never snaps (velocity continuity checked on sampled positions).

### Phase 80 · Animated variants & interactive components
**Needs:** 47, 79 · **Was:** v3 75.2 (animated half), 75.4 · **Status:** 📋
- [ ] Switching a component's variant animates (variants map to states). Instances can override motion and bind their own interactions.

**You'll see:** a toggle component that animates between its On and Off variants.
**Done when:** a variant switch matches `evaluate()` in the stage; instance overrides survive main-component edits.

### Phase 81 · Scroll: model & runtime
**Needs:** 59 · **Was:** v3 13.1, 13.2 · **Status:** 📋
- [ ] Scroll triggers (enter, leave, enter-back, leave-back) and scroll-linked ranges (start/end offsets, scrub smoothing, pin); view progress per layer. Native CSS scroll-driven animations where possible, otherwise an IntersectionObserver plus scheduler progress driver (never GSAP).

**You'll see:** parallax and scroll-reveal work in Preview.
**Done when:** parallax, scroll-reveal and pinned-sequence references match `evaluate()` at 5 scroll positions in 3 browsers, on both the native and fallback paths.

### Phase 82 · Scroll simulator & section choreography
**Needs:** 48, 81 · **Was:** v3 13.3, 76.2 · **Status:** 📋
- [ ] A scroll scrubber for the canvas and timeline (scroll progress becomes an input track), and section-level scroll choreography: pinned sequences, reveals, parallax and scroll-driven staggers.

**You'll see:** scrub the page's scroll from the timeline.
**Done when:** a pinned section sequence plays identically from the scrubber and from real scrolling.

### Phase 83 · Accessible text splitting
**Needs:** 31, 38, 82 · **Was:** v3 17.1 · **Status:** 📋
- [ ] Split by character (grapheme-aware, `Intl.Segmenter`), word and line, with measured positions and line/word/char indices (Phase 115 builds on this). The container keeps the full text as an accessible label; pieces are hidden from assistive technology; line detection re-runs on resize and after fonts load.

**You'll see:** split any text into letters, words or lines for animation.
**Done when:** the accessibility tree exposes each fixture string exactly once in 3 browsers.

### Phase 84 · Text motion
**Needs:** 83 · **Was:** v3 17.2 · **Status:** 📋
- [ ] Per-piece tracks with staggers; blur, opacity and offset reveals; scramble/decrypt; typewriter with caret; rotating words; count-up (`Intl.NumberFormat`); gradient sheen; variable-font axis animation.

**You'll see:** headline reveals, typewriters and counters.
**Done when:** split, scramble and count-up match `evaluate()` in 3 browsers.

### Phase 85 · SVG morph & stroke drawing
**Needs:** 84 · **Was:** v3 16.2, 16.3 (stroke) · **Status:** 📋
- [ ] Morph between paths with automatic point matching (`PathMorphSolver`) plus manual start-point and direction fixes; stroke draw per path with direction and multi-subpath staggers.

**You'll see:** a menu icon morphing into a close icon; a logo drawing itself.
**Done when:** the icon-morph and logo-draw references match `evaluate()`.

### Phase 86 · Motion along paths & SVG filters
**Needs:** 85 · **Was:** v3 16.3 (motion path), 16.4 · **Status:** 📋
- [ ] Any path can drive a layer's position at constant speed (arc-length sampler), with auto-rotate and offset. Animatable SVG filters (blur, displacement, turbulence, colour matrix), gradients and clip paths with a performance class each.

**You'll see:** a layer travelling along a drawn path.
**Done when:** the motion-path orbit reference matches `evaluate()`.

### Phase 87 · Motion engine adapter
**Needs:** 86 · **Was:** v3 15 · **Closes:** AUD-10 (runtime) · **Status:** 📋
- [ ] `MotionAdapter` (`motion/react`, loaded lazily): states → variants, transitions → spring/tween configs, triggers → `whileHover` / `whileTap` / `whileInView` / `whileDrag`; layout animation and presence for layout transitions and enter/exit.

**You'll see:** layout changes and enter/exit animate smoothly.
**Done when:** spring-heavy references (toggle, stacked cards, dock) keep velocity on interruption in the stage.

### Phase 88 · Motion per breakpoint
**Needs:** 43, 87 · **Was:** v3 50.3 (motion half) · **Status:** 📋
- [ ] Clips on or off, durations, distances and behaviour settings can be overridden per breakpoint.

**You'll see:** a calmer animation on Mobile than on Desktop.
**Done when:** a per-breakpoint override plays only at its width in the stage.

### Phase 89 · Page transitions
**Needs:** 88 · **Was:** v3 77.3 · **Status:** 📋
- [ ] View Transitions API page transitions (same-document and cross-document where supported, with fallbacks); shared elements between pages.

**You'll see:** animated navigation between pages in Preview.
**Done when:** a 5-page fixture shows the same transitions at sampled times in Preview, on the native and fallback paths.

### Phase 90 · Animation Playground
**Needs:** 89 · **Was:** v3 24.0–24.3, 24.5 · **Closes:** AUD-20 (Tiers 3–4: properties 41–52) · **Status:** 📋
- [ ] A focused preview with a props panel (live knobs), state and trigger buttons, time scale (0.1×–2×), loop, frame step, device frames, backdrop, reduced-motion toggle, overlays (wireframes, box model, dimensions, touch targets), and an FPS meter.

**You'll see:** open any animation in a Storybook-style Playground and tune it.
**Done when:** every reference animation opens with working props, triggers, slow motion and reduced motion (automated sweep).

### Phase 91 · Motion library infrastructure
**Needs:** 90 · **Was:** v3 25.1, 25.2, 21.3, 22.4 · **Status:** 📋
- [ ] An effect registry with versions, categories, tags and search; insert creates an effect instance; detach converts it into plain layers and clips. Effect instances show as one collapsible layer; their props render as controls automatically. Thumbnails are pre-rendered loops (never live contexts).
- [ ] The 51 v1.1 presets migrate into the registry (duplicates dropped).

**You'll see:** a searchable library of motion you can drop onto any layer.
**Done when:** insert → customise → detach works for every migrated preset.

### Phase 92 · Library: text, SVG & component motion
**Needs:** 91 · **Was:** v3 25.3 (waves 1, 3, 4) · **Status:** 📋
- [ ] Wave 1, text (10): split reveal, blur-in, shiny text, gradient flow, decrypt, typewriter, rotating words, count-up, scroll-reveal text, variable proximity.
- [ ] Wave 3, SVG (6): stroke-draw logo, morph icon set, motion-path orbit, gooey blob, animated icon pack, line-art reveal.
- [ ] Wave 4, components (6): dock magnification, stacked cards, animated list, infinite menu, elastic slider, circular gallery.
- [ ] Every item is original (provenance recorded) and an open recipe where the primitives can express it.

**You'll see:** 22 polished, editable motion effects.
**Done when:** each passes the Playground sweep and the parity check against the kernel.

### Phase 93 · Reduced motion & accessibility rules
**Needs:** 92 · **Was:** v3 29.1, 29.3, 11.4 · **Closes:** AUD-14 (partial) · **Status:** 📋
- [ ] Every animation has a reduced-motion variant (generated from the spec's §9 policy: keep opacity and colour, drop movement, stop loops, disable scroll scrub), editable in Pro. Rules: flash limits, pause controls for loops over 5 s, visible focus, 44 px touch targets. The Playground toggle uses the variants.

**You'll see:** a reduced-motion preview that shows exactly what those users get.
**Done when:** the reduced-motion Playwright run shows no spatial movement in any library effect.

### Phase 94 · Motion export architecture
**Needs:** 49, 93 · **Was:** v3 27.1 · **Status:** 📋
- [ ] Exporters read the document and routing decisions only (never UI state). The per-engine code generators move out of `MultiEngineAnimationRuntime` into the exporters.

**You'll see:** nothing new (refactor); 95 builds on it.
**Done when:** the static export (49) still passes the harness with the new architecture.

### Phase 95 · Motion export: React, Next & Vite
**Needs:** 94 · **Was:** v3 27.2, 27.3, 29.2 · **Status:** 📋
- [ ] Clips, states, transitions, scroll, text and SVG motion, links and expressions export as idiomatic code (CSS / Web Animations / `motion/react`, chosen by routing), with `prefers-reduced-motion` handling, typed props and defaults, Prettier formatting, no `any`, and a README listing only the engines used. No LazyLayout imports.

**You'll see:** the Code tab and the ZIP include your animations.
**Done when:** every library effect and reference animation builds in the Next and Vite fixtures.

### Phase 96 · Export matrix in CI
**Needs:** 95 · **Was:** v3 27.4 · **Closes:** AUD-15, AUD-16, AUD-40 · **Status:** 📋
- [ ] Every library effect × {Next, Vite} × {Tailwind, CSS Modules}: `tsc`, build, and pixel parity against the editor at 5 times. A keyframe added in the timeline appears in the Code tab, and undo removes it there.

**You'll see:** export is trustworthy: what you see is what ships.
**Done when:** the full matrix is green in nightly CI (PRD §11 criterion 5).

### Phase 97 · More export targets
**Needs:** 96 · **Was:** v3 28 · **Status:** 📋
- [ ] Vue 3 single-file components, a Web Component (vanilla), CSS-only export when the rules allow it, shadcn-compatible registry items with a static registry route, copy as snippet, ZIP download, and "Open in StackBlitz / CodeSandbox".

**You'll see:** export menu options for Vue, Web Component, CSS-only and registry install.
**Done when:** each target passes the build and parity harness for every applicable effect; a registry install into a fresh Next app builds.

### Phase 98 · GSAP as an opt-in export target
**Needs:** 97 · **Was:** v3 14 · **Closes:** AUD-28, AUD-47 (licence) · **Status:** 📋
- [ ] Send the licensing inquiry (spec §11.3) and record the answer in `LICENSES.md`. While GATE-01 is open, GSAP stays an opt-in **export** target only (`useGSAP()` with scoped selectors and cleanup); it never runs in the editor and no default needs it.

**You'll see:** an optional "GSAP" export flavour, off by default.
**Done when:** 10 animations pass parity through the optional GSAP export; a bundle check proves `gsap` isn't in the editor.

### Phase 99 · Video & audio layers
**Needs:** 36, 98 · **Was:** v3 54.3, 54.4 · **Closes:** AUD-37 · **Status:** 📋
- [ ] Video layers synced to the transport (seek on scrub, rate on play, trimmed by in/out). Audio layers with a waveform lane, scrubbing and beat markers.

**You'll see:** drop a video or a soundtrack into the timeline and animate to it.
**Done when:** after 20 random seeks a video shows the frame for `t` within 1 frame.

### Phase 100 · Render queue: video, GIF, image sequences & Lottie
**Needs:** 99 · **Was:** v3 55 · **Status:** 📋
- [ ] Frame-accurate capture in deterministic mode (decision record 0010, render capture). MP4 and WebM through WebCodecs, GIF with palette quantisation, PNG sequences and posters, transparent backgrounds. Lottie export for the subset that maps, with the rules explaining what can't. A queue UI with presets.

**You'll see:** File → Render to MP4, GIF or Lottie.
**Done when:** a 5-second 60 fps composition renders to MP4 with frames matching `evaluate()` above a PSNR threshold; eligible Lottie output plays in `lottie-web` within 2% pixels.

### Phase 101 · Performance lab, workers & hot path
**Needs:** 100 · **Was:** v3 56, 26.1–26.4 · **Closes:** AUD-13 · **Status:** 📋
- [ ] A worker pool (path morph matching, arc-length tables, spring baking, spatial index, thumbnails, waveforms), content-hash caches, no per-frame sorting, JSON or string parsing in `evaluate()`, frame telemetry in the status bar.
- [ ] A browser benchmark harness (Playwright + DevTools tracing), per-animation performance class checked against traces, auto-fixes (`left/top` → `transform`, pre-blurred layers, path simplification), and a CI budget per library effect.

**You'll see:** frame-time readout in the status bar; one-click performance fixes.
**Done when:** a scripted 60-second editing session shows 0 main-thread tasks ≥ 50 ms; a layout-thrashing test animation is flagged and auto-fixed within budget; every library effect meets its budget in CI.

### Phase 102 · Stage 2 gate: the animation journey
**Needs:** 53–101 · **Was:** v3 58.2, 58.3, 58.4 · **Status:** 📋
- [ ] **Journey A (After Effects user):** a 3-scene intro with a precomp, a parent chain, a luma matte, a `wiggle` expression and markers; a motion path edited on the canvas; onion skin; graph-editor easing.
- [ ] **Journey B (interactive components):** a toggle and a card with states and smart-animate transitions, an animated variant, scroll reveals and a page transition.
- [ ] **Journey C (output):** React export passes parity, MP4 render passes parity, `.lazy.json` reopens identically.
- [ ] All three stay within the performance budgets.

**You'll see:** LazyLayout works as a motion design studio on top of the design tool.
**Done when:** the journeys pass in CI in 3 browsers, plus one recorded manual run.

---

# STAGE 3 — INTERACTIVE & COMPLEX ANIMATION (Phases 103–147)

> **Stage output:** anything can react to the **mouse, touch, scroll and keyboard**. One-step reactions ("Cursor → Bend") and Pro binding graphs; magnet, tilt, follow and spotlight behaviours; keyboard-driven motion and focus parity; Rive-style state machines. Kinetic composition from primitives: invisible helpers, follow pins, one-click Split, cloners, fields and effectors, 2D physics with contact events. Interaction logic as Simple "When → Do" rules or Unreal-style Blueprint graphs, compiled to plain code. GPU effects on a budgeted compositor: shader graphs, particles, fluids and other simulations, image and text distortion, custom cursors. Effects as data, bring-your-own code components, and production-hardened export with a small vendored runtime or an embed script.
>
> Order inside the stage: inputs (103–106) → bindings (107–110) → DOM reactions, keyboard and state machines (111–113) → kinetic composition (114–118) → Blueprints and physics (119–128) → GPU effects (129–137) → effects as data and code components (138–141) → interactive export and accessibility (142–144) → budgets, the composition suite and the gate (145–147). The design is `INTERACTIVE_EFFECTS_ENGINE_SPECIFICATION.md` and grammar §13–§14.

### Phase 103 · Input bus & coordinate spaces
**Needs:** 55, 102 · **Was:** v3 59.1 · **Closes:** AUD-45 (input, partial) · **Status:** 📋
- [ ] `src/core/signals/inputBus.ts`: one passive listener set per frame host (pointer, wheel/scroll, keys, focus, resize, visibility, orientation), sampled in the scheduler's input phase into an immutable per-frame snapshot (Law 12). A lint rule forbids these listeners anywhere else.
- [ ] Coordinate spaces: layer-local, parent, frame and page, in px, uv and ndc, resolved through `renderer.measure()`, so a background with `pointer-events: none` still knows where the cursor is.

**You'll see:** nothing new yet; 104 adds live meters.
**Done when:** the grep/lint gate finds no stray pointer, scroll, wheel or key listeners; input sampling costs < 0.3 ms per frame with 200 bound layers.

### Phase 104 · Signal catalogue, including the keyboard
**Needs:** 103 · **Was:** v3 59.2 + new (keyboard) · **Status:** 📋
- [ ] The typed catalogue of spec §4: `pointer.*`, `pointer.inside(L)`, `hover(L)`, `press(L)`, `focus(L)`, `proximity(L)`, `scroll.*`, `view(L).*`, `time`, `frame.dt`, `audio(L).*`, `device.tilt*` (permission-gated), `state`, `sm`, `prop`, `var`, `seed`.
- [ ] **New: keyboard signals:** `key.down(K)`, `key.held(K)`, `key.axis(arrows | WASD)` (−1…1 per axis), `key.lastPressed`, `focusVisible(L)`, with layout-independent key codes.
- [ ] Every signal declares unit, range, default and its touch behaviour. Live signal meters in a dev panel.

**You'll see:** a Signals dev panel with live meters for mouse, scroll and keys.
**Done when:** each signal's meter matches scripted input in 3 browsers.

### Phase 105 · Input tapes
**Needs:** 104 · **Was:** v3 59.3, 23.4, 24.4, 12.3 · **Status:** 📋
- [ ] Record or author any signal over time; synthetic sources (seeded autopilot pointer, scripted paths, tap sequences, scroll curves, key sequences). In deterministic mode the transport plays tapes, so reactive motion scrubs, renders and tests identically. Tapes appear as editable input tracks in the timeline and are recorded from the Playground.

**You'll see:** record your mouse movement, then scrub through it on the timeline.
**Done when:** a recorded pointer, scroll and key tape replayed 3 times gives byte-identical per-frame snapshots in 3 browsers.

### Phase 106 · GPU & interactive verification harness
**Needs:** 105 · **Was:** v3 71 · **Status:** 📋
- [ ] Headless Chromium with a software WebGL2/WebGPU rasteriser on every PR, a nightly real-GPU job, tape playback with frame capture at exact times, perceptual metrics (SSIM plus a FLIP-style metric) with tolerance tiers, particle statistics, memory checks (ledger, heap after forced GC), and a deliberately broken fixture per tier that must fail.

**You'll see:** nothing in the editor (test infrastructure). Phases 107 and 109 are visible again.
**Done when:** falsifiers fail and correct fixtures pass in 3 browsers; flake rate < 1% over 50 runs.

### Phase 107 · Operators & bindings runtime
**Needs:** 106 · **Was:** v3 60.1 · **Status:** 📋
- [ ] The spec §5 operators (`smooth`, `spring`, `remap`, `clamp`, `curve`, `deadzone`, `falloff`, `noise`, `delay`, `trail`, `velocity`, `accumulate`, `threshold`, `edge`, `toggle`, `sampleHold`, `quantize`, `mix`, vector maths), frame-rate independent and deterministic, reusing the expression evaluator (77). Bindings `signal |> operators -> target` run each frame.

**You'll see:** a layer following the cursor, set up in the text form.
**Done when:** 12 reference bindings match hand-computed values at tape checkpoints; a 60 s tape at 30, 60 and 120 Hz gives the same values within tolerance.

### Phase 108 · Targets, blending & cycles
**Needs:** 107 · **Was:** v3 60.2 + the v3 9 amendment · **Closes:** AUD-45 (binding half), AUD-48 (bindings) · **Status:** 📋
- [ ] Targets: registry paths whose compositing class is `gpu` or `paint` (continuous bindings to layout paths refused with `[SIG_LAYOUT]`), state-machine inputs, CSS custom properties, events. Channel blending (replace, add, multiply, max) feeds the Single Transform Authority synthesis. Links and bindings share one dependency graph; cycles refused with `[SIGNAL_CYCLE]`.
- [ ] The kernel evaluates bindings in its composition order (closes the bindings entries of `KERNEL_GAPS`).

**You'll see:** a float, a magnet and a tilt on one button combine instead of fighting.
**Done when:** the blending golden tests pass; a cycle is refused with its chain.

### Phase 109 · Reactivity card (Simple)
**Needs:** 108 · **Was:** v3 60.3 · **Status:** 📋
- [ ] "Reacts to" rows: **Cursor · Scroll · Hover on… · Touch · Keyboard · Sound**, each listing only the selected layer's affordances (follow, bend, repel, ripple, glow, tilt, parallax …) with Strength and Smoothness, plus a generated plain-language sentence. Ranges are dragged over live meters (Law 17).

**You'll see:** make anything follow the cursor in one click.
**Done when:** 5 first-time users each make "the background follow the cursor" in < 20 s without help.

### Phase 110 · Signals panel (Pro) & binding export
**Needs:** 109 · **Was:** v3 60.4 · **Status:** 📋
- [ ] A node view of bindings with live meters in Preview, and "Open in Playground with tape".
- [ ] Export: bindings compile to plain TypeScript in the first vendored runtime modules (`ticker`, `signals`) copied into the user's project, or to CSS scroll/view timelines when expressible.

**You'll see:** a Pro graph of every reaction; exported pages react like the editor.
**Done when:** the 12 reference bindings pass tape parity in the Next and Vite exports.

### Phase 111 · Pointer behaviours as presets
**Needs:** 110 · **Was:** v3 12.2 · **Status:** 📋
- [ ] Magnet, tilt (3D perspective), follow with lag, proximity, spotlight, inertia (drag with momentum), noise and wander, implemented as binding presets with affordances (closes the behaviour entries of `KERNEL_GAPS`).

**You'll see:** magnetic buttons, tilt cards and spotlights from the Reactivity card.
**Done when:** 8 behaviours pass scripted-pointer tests at checkpoints; 50 reactive layers hold 60 fps.

### Phase 112 · Keyboard & focus interactivity
**Needs:** 111 · **Was:** — (new) · **Status:** 📋
- [ ] Key-driven bindings and triggers (arrows/WASD move or rotate a layer, keys step through states, shortcuts trigger compositions), roving focus for groups, and focus-driven motion. Keyboard parity rule: any informative pointer reaction must have a keyboard or focus equivalent (grammar 6.11), checked by the rules.
- [ ] Exported pages get the same keyboard handling, scoped so they never steal the host page's shortcuts.

**You'll see:** "when the user presses → , slide to the next card" without code.
**Done when:** a keyboard-only journey drives 5 interactive references in the stage and in the export; the parity rule flags a pointer-only reaction.

### Phase 113 · State machines
**Needs:** 112 · **Was:** v3 11.3 · **Status:** 📋
- [ ] Rive-style inputs (boolean, number, trigger), conditional transitions, and 1D blends by a number input (for example hover intensity by pointer proximity). A small visual state-graph editor.

**You'll see:** a multi-step button whose states are wired in a graph.
**Done when:** a 4-state machine driven by a tape matches hand-computed states at checkpoints.

### Phase 114 · Helpers, pins & Follow
**Needs:** 113 · **Was:** v3 88 · **Closes:** AUD-56 (helpers & follow) · **Status:** 📋
- [ ] Any layer can become a helper (73). Binding target `L.position(pin)`. The Follow component: target, pin, offset, lag, axis, bounds, leave behaviour, rotation, scale by speed, touch and reduced-motion policies. Simple face: click one of the 9 pin dots on the canvas, lag as Bounce and Time.

**You'll see:** draw a circle, make it invisible, and have its bottom point follow the mouse.
**Done when:** the helper matches hand-computed positions at tape checkpoints with rotation and scale; helpers are absent from the exported DOM.

### Phase 115 · Split into real layers
**Needs:** 114 · **Was:** v3 89.1 · **Status:** 📋
- [ ] Right-click → Split into letters, words or lines: real, rule-addressable layers built on the splitter (83), non-destructive (edits keep overrides), with Detach. The string is read once by assistive technology.

**You'll see:** one click turns a headline into individual letter layers.
**Done when:** 5 fixture strings split within 0.5 px of the unsplit glyph positions in 3 browsers.

### Phase 116 · Cloners, tags & group targets
**Needs:** 115 · **Was:** v3 89.2, 89.3 · **Status:** 📋
- [ ] Grid, radial, path, scatter and linear cloners with per-clone overrides; per-piece attributes (`index`, `count`, `home`, `random` …); layer tags; `Group[*]` and `tag:` binding targets. Over the tier cap, offer GPU particles (134).

**You'll see:** a 20 × 20 dot grid where every dot can react.
**Done when:** a 20 × 20 grid matches between stage and export.

### Phase 117 · Fields & effectors
**Needs:** 116 · **Was:** v3 90.1–90.3 · **Closes:** AUD-56 (fields) · **Status:** 📋
- [ ] Fields (circle, box, capsule, own shape, path stroke, linear, noise) with inner and outer radius and falloff. Effectors (keep out, push, attract, swirl, transform, style, look at, jitter) with strength, spring home and blending; Keep-Out is a hard constraint. Gizmos and weight heat maps.

**You'll see:** letters that flee a circle and spring home.
**Done when:** the reference build (effector form) never draws a letter inside the circle at any tape checkpoint and springs every letter home within 0.5 px.

### Phase 118 · One evaluation space & no-maths kinetics
**Needs:** 117 · **Was:** v3 90.4–90.6 · **Status:** 📋
- [ ] Fields and targets evaluate in the top-level frame's space using full world transforms (Law 10), so nested, rotated and scaled parents interact correctly. "Stay inside" boundaries. Simple faces: reach and gap as rings on the canvas, edge Hard/Soft, Strength Gentle/Clear/Strong, Variety with shuffle.

**You'll see:** kinetics work inside rotated cards, set up without numbers.
**Done when:** the reference build passes inside a rotated, scaled card; the label check passes for every kinetic Simple face; 400 letters hold 60 fps.

### Phase 119 · Blueprint model & interaction library
**Needs:** 118 · **Was:** v3 72.1, 72.2 · **Closes:** AUD-50 (model), AUD-45 (cross-element) · **Status:** 📋
- [ ] `document.graphs`: event graphs, functions, macros, typed variables, custom events, exec and data pins. Validation through the rules (pin types, latent placement, bounded loops).
- [ ] Standard library: pointer, hover, focus, **key** and drag events; view, scroll-crossing, breakpoint and mount events; markers, state changes, variable changes, signal thresholds, timers; overlap and hit events (driven by 124). Flow: branch, sequence, gate, do-once, do-N, flip-flop, delay, for-each, switch. Actions: play/seek/reverse compositions, set state or state-machine input, spring or set a property, set a uniform, burst, show/hide, scroll to, focus, open URL, navigate, `PlaySound`, `Spawn` (128), KeepOut, SpringHome, AddForce/Impulse/Spin, Explode, SetBody.

**You'll see:** nothing new until 125 adds the editors (model work).
**Done when:** grammar §10 and §13.8 examples and 10 cross-element interactions validate as graphs.

### Phase 120 · NodeScript text form & one model with the grammar
**Needs:** 119 · **Was:** v3 72.3, 72.4 · **Status:** 📋
- [ ] Audit and reuse `src/core/nodescript/` (lexer, parser, `grammar.peg`, language server); add the `interaction` namespace. Every Simple binding and Simple rule is a view over a canonical graph fragment, so one rules engine validates both.

**You'll see:** nothing new yet (the `.nls` text form is what AI and MCP use in 173 and 176).
**Done when:** graph → `.nls` → graph round-trips unchanged over 500 random graphs.

### Phase 121 · Blueprint runtime
**Needs:** 120 · **Was:** v3 74.1 · **Status:** 📋
- [ ] Events queued in the input phase; latent nodes as resumable, cancellable continuations; a per-frame node budget and loop guards; deterministic under the test clock and tapes. Runs in Preview and the Playground.

**You'll see:** interactions written in text form run live in Preview.
**Done when:** 20 reference graphs produce identical state timelines on repeated tape replays.

### Phase 122 · 2D physics core
**Needs:** 121 · **Was:** v3 91.3, 64.1 (decision) · **Status:** 📋
- [ ] Decision record 0006 (stateful simulation and determinism): fixed 1/120 s step, seeded PRNG, snapshots for seeking. `src/core/physics2d/`: spatial-hash broadphase, SAT narrowphase, deterministic; shared later by simulations (135) and the spawner (128).

**You'll see:** a "drop test" in the Playground: shapes fall and bounce.
**Done when:** a 200-body scene replays bit-identically on the CPU across runs and browsers.

### Phase 123 · Colliders & bodies
**Needs:** 122 · **Was:** v3 91.1, 91.2 · **Status:** 📋
- [ ] Colliders (shapes derived from the layer: ellipse → circle, rectangle → box; trigger or solid; collision layers and masks). Bodies: static, kinematic, dynamic (home spring, damping, bounciness). Draggable bodies: kinematic while dragged, then thrown. Simple face: Weight, Bounce, Grip, Return, Gravity with a direction arrow.

**You'll see:** drag a letter and throw it into the others.
**Done when:** the falling-letters fixture matches stored snapshots at 5 checkpoints.

### Phase 124 · Contact events & collision view
**Needs:** 123 · **Was:** v3 91.4, 91.5 · **Closes:** AUD-56 (physics) · **Status:** 📋
- [ ] `OverlapBegin`, `OverlapStay`, `OverlapEnd`, `Hit` and `FieldEnter/Exit` events with `other` and contact pins, fired from the fixed step. "Show collision" draws colliders, contacts, normals and velocities.

**You'll see:** collision outlines and contact points while previewing.
**Done when:** contact events fire at the expected tape frames in 3 browsers.

### Phase 125 · Simple rules editor
**Needs:** 124 · **Was:** v3 73.1, 73.5, 73.6 · **Status:** 📋
- [ ] An Interactions list in the Motion tab: "When [event] on [layer] → Do [actions]" in plain language, ≤ 7 controls. Rules that mention overlap, hit, field or drag add the colliders, fields and home springs they need (listed under the rule, editable, removable with it). Rule parameters are dragged on the canvas or chosen by feel (Law 17).

**You'll see:** "When the button is hovered → the background glows" built from dropdowns.
**Done when:** 5 people each build "hover → background glows; click → confetti and the card flips" in < 3 minutes.

### Phase 126 · Blueprint graph editor & debugger
**Needs:** 125 · **Was:** v3 73.2, 73.3 · **Status:** 📋
- [ ] The Pro graph (reusing `BlueprintCanvas.tsx` after it meets Laws 8 and 9): pin-aware node search, comments, reroutes, collapse to function, variables panel. "Open as graph" from any Simple rule and back. Debugger in Preview: pulses on wires, breakpoints, watches, event log, step-through on the transport.

**You'll see:** an Unreal-style graph for any interaction, with live execution pulses.
**Done when:** a 25-step graph journey (create, wire, collapse, breakpoint, step) asserts the exact graph and trace.

### Phase 127 · Blueprint compiler & interaction parity
**Needs:** 126 · **Was:** v3 74.2–74.4, 91.6 · **Closes:** AUD-50 (runtime) · **Status:** 📋
- [ ] Graphs compile to plain TypeScript per target (React hooks, Vue composables, vanilla listeners) with node names as comments and no LazyLayout imports; CSS-expressible rules compile to CSS; keep-out rules compile to the effector or physics constraint. The vendored runtime gains `kinetics`, `physics2d` and `blueprint` modules. No arbitrary-code nodes.

**You'll see:** interactions work the same in the exported site.
**Done when:** 20 reference graphs pass journey parity in the Next, Vite and vanilla exports in 3 browsers; compiled code passes the fixtures' ESLint with no `any`.

### Phase 128 · Spawner
**Needs:** 127 · **Was:** v3 89.4 · **Status:** 📋
- [ ] The `Spawn` action creates runtime copies of a layer the user designed (at the pointer, a pin or a point), with velocity, spin, Variety and a lifetime with an exit; copies come from a pool with a cap per tier and can be bodies. Never saved into the document.

**You'll see:** click to spray confetti made of your own star shape.
**Done when:** the click-confetti build stays within its pool cap and matches tape replays.

### Phase 129 · GPU surface strategy & compositor
**Needs:** 128 · **Was:** v3 61.1, 61.3 · **Closes:** AUD-46 (runtime, partial), AUD-49 · **Status:** 📋
- [ ] Decision record 0011 (GPU surface strategy): per-surface canvases within a budget, a shared backdrop canvas, or one hidden context blitting to 2D, per surface role; WebGL2 baseline, WebGPU opt-in through three.js TSL; minimal in-house WebGL2 helper or OGL (Unlicense) for 2D surfaces.
- [ ] The compositor owns every context (Law 13): ≤ 8 live surfaces on desktop and ≤ 4 on mobile, posters over budget, device tiers T0–T3 with a frame-time controller, pausing offscreen and in hidden tabs, async compile, context-loss recovery.

**You'll see:** a test surface on the canvas that pauses offscreen and recovers from a forced context loss.
**Done when:** a 20-surface page never exceeds the budget or logs "Too many active WebGL contexts" in 3 browsers; a forced loss recovers within 1 s.

### Phase 130 · Passes, render targets & GPU memory ledger
**Needs:** 129 · **Was:** v3 61.2, 61.5 · **Closes:** AUD-58 (partial) · **Status:** 📋
- [ ] Pass stacks (program, feedback ping-pong, post: grain, dither, vignette, bloom-lite, pixelate, chromatic offset); float targets after a capability check. A memory ledger for every texture, target, buffer and canvas, with per-tier budgets (T1 96 MB, T2 256 MB, T3 512 MB initially) and a degrade order; a shared render-target pool; a program cache; Safari canvas limits.

**You'll see:** a memory readout in the dev overlay.
**Done when:** mounting and unmounting a surface 100 times returns the ledger to 0 and the heap to within 2 MB.

### Phase 131 · Surfaces in the editor & the first interactive background
**Needs:** 130 · **Was:** v3 61.4, 19.1 · **Status:** 📋
- [ ] Only the focused frame runs live surfaces; other frames and breakpoint copies show their last frame. A `background` surface fills its frame behind its siblings and stays selectable in Design mode.
- [ ] **Vertical slice:** one hand-written shader background that bends toward the cursor through a binding, scrubbed with a tape, with reduced-motion and touch behaviours.

**You'll see:** a cursor-reactive shader background on your hero, scrubbable on the timeline.
**Done when:** the slice matches stored frames at tape checkpoints within the GPU tolerance.

### Phase 132 · Shader graph
**Needs:** 131 · **Was:** v3 62.1, 62.3 · **Status:** 📋
- [ ] A typed node graph (float, vec, colour, texture, SDF) compiling to GLSL ES 3.00 and TSL; the uniform contract (`uTime`, `uResolution`, `uSeed`, pointer uniforms from bindings, props); noise, SDF, pattern, colour, distortion, texture, feedback and post nodes; a static cost estimate feeding the rules and tiers.

**You'll see:** build backgrounds visually, like Unreal's material editor.
**Done when:** 10 reference backgrounds built from the graph alone compile on WebGL2 and WebGPU and match within tolerance; a node edit updates the stage in < 100 ms.

### Phase 133 · Raw GLSL (Pro) & shader safety
**Needs:** 132 · **Was:** v3 62.2 · **Status:** 📋
- [ ] A GLSL editor with errors mapped to lines and hot reload; its uniform block becomes props. Safety: constant loop bounds, a texture-fetch budget, async compile, and a program that loses the context twice is disabled for the session.

**You'll see:** a code editor for shaders in Pro mode.
**Done when:** an injected unbounded-loop shader is refused at compile time.

### Phase 134 · Particles & force fields
**Needs:** 133 · **Was:** v3 63, 19.2 · **Status:** 📋
- [ ] Niagara-style module stack (emitter → spawn → update → render); forces (gravity, drag, noise and curl, vortex, pointer attract/repel/orbit, spring-to-shape, bounds); CPU (≤ 5k) and GPU (≤ 250k) backends by tier; points, sprites, links, trails, instanced meshes; interaction modes (grab, repulse, burst on tap, scatter on scroll).

**You'll see:** particle fields that swirl around the cursor.
**Done when:** 5 reference effects hold their tier budgets; CPU and GPU backends agree within 2% on density and centroid at checkpoints; seeded runs repeat exactly.

### Phase 135 · Stateful simulations & replay
**Needs:** 134 · **Was:** v3 64.2, 64.3 · **Closes:** AUD-48 · **Status:** 📋
- [ ] Stable fluids with pointer splats, spring-mass lattices (grid distortion, dot fields with shockwaves), Verlet ropes and cloth, metaballs and SDF blobs, rigid bodies on the physics core (122). Simulations run at reduced resolution per tier, and scrubbing re-simulates from the nearest snapshot (≤ 50 ms per seek; CPU modules in a worker).

**You'll see:** a fluid splash that follows the cursor and scrubs on the timeline.
**Done when:** each module's reference replay matches stored snapshots at 5 checkpoints in 3 browsers; a 10 s back-and-forth scrub never shows two states for one time.

### Phase 136 · Media as texture & distortion
**Needs:** 135 · **Was:** v3 65 · **Status:** 📋
- [ ] Images, video, text (SDF or canvas, re-rendered on font load and resize) and rasterised SVG as textures. Hover displacement, pixel and dither transitions, grid and wave distortion, halftone reveals, image trails, glass and lens. Real text and `alt` stay in the DOM; SVG-filter or CSS fallbacks for low tiers.

**You'll see:** images that ripple under the cursor.
**Done when:** 6 references work on image, video and text; the accessibility tree reads the real text and alt once; fallbacks render with WebGL disabled.

### Phase 137 · Cursor & overlay layer
**Needs:** 136 · **Was:** v3 66 · **Status:** 📋
- [ ] One cursor layer per page: follower, blob, trail, splash, target brackets, image trail, magnetic snap. Cursor states from what's under the pointer; hiding the native cursor is opt-in and never over text inputs, under reduced motion or on touch; focus rings stay visible. Runs live only in Preview and the Playground.

**You'll see:** custom cursors in Preview.
**Done when:** 8 cursor references pass mouse, pen and touch profiles; axe and keyboard-only journeys pass with the cursor layer on.

### Phase 138 · Effect SDK: effects as data
**Needs:** 137 · **Was:** v3 67 · **Closes:** AUD-54 (engine) · **Status:** 📋
- [ ] `EffectDefinition` v1 (spec §11): props view-model with AI descriptions, surfaces and programs by reference, bindings and affordances, states, fallback, touch and reduced-motion policies, tier costs, poster, export templates, provenance. Instances store only overrides; definitions migrate by version. Fork into the project, edit, publish to the project library. Every definition ships a tape test and a Playground scene.

**You'll see:** fork any library effect and change how it works.
**Done when:** every library effect is a definition validated in CI with no per-effect code; a definition migration round-trips 100 fixtures.

### Phase 139 · Library: interaction, backgrounds, cursors & distortion
**Needs:** 138 · **Was:** v3 25.3 (waves 2, 5, 7, 8, 9) · **Closes:** AUD-54 (library) · **Status:** 📋
- [ ] Wave 2 interaction (8), Wave 5 backgrounds (7), Wave 7 interactive backgrounds (≥ 20, ≥ 15 pointer-reactive, ≥ 5 scroll-reactive), Wave 8 cursors (≥ 10), Wave 9 distortion (≥ 8). Original implementations with provenance; open recipes wherever the primitives can express them.

**You'll see:** 50+ interactive effects ready to insert (80+ in the library with Stage 2's).
**Done when:** each passes the Playground sweep, tape parity and its tier budget; a new user makes a background react to the cursor in < 2 minutes.

### Phase 140 · Sandbox boundaries for untrusted code
**Needs:** 139 · **Was:** v3 80.2 · **Status:** 📋
- [ ] Opaque-origin sandboxed iframes (`allow-scripts` without `allow-same-origin`) with typed MessageChannel bridges; no editor-origin storage, cookies or tokens reachable from any user-content frame (decision record 0012, code isolation).

**You'll see:** nothing yet; 141 runs code components inside it.
**Done when:** a malicious fixture reading `document.cookie`, `localStorage` and `parent.document` gets nothing in 3 browsers.

### Phase 141 · Code components
**Needs:** 140 · **Was:** v3 68 · **Status:** 📋
- [ ] Import TSX/JSX, files or an npm package; bundle in a worker (esbuild-wasm) with pinned, hashed dependencies; render in the sandbox; infer property controls from prop types (JSDoc hints optional); bind props to signals, variables and states; callback props become Blueprint events; record the licence and keep restricted ones private (GATE-03).

**You'll see:** paste your own animated React component and get inspector controls for it.
**Done when:** 10 real-world fixtures import, render, expose controls and export to a Next app that builds.

### Phase 142 · Interactive export runtime
**Needs:** 141 · **Was:** v3 69.1, 69.2 · **Status:** 📋
- [ ] The exporter copies only the vendored modules an effect uses (`ticker`, `signals`, `kinetics`, `physics2d`, `blueprint`, `gl`, `particles`, `sims`, `cursor`) as readable source with an MIT notice. React for Next and Vite (client boundary, poster first, init after idle, cleanup releases contexts), Vue 3 and a Web Component. Memory discipline as in the editor.

**You'll see:** export any interactive effect and it runs in your own app with no LazyLayout package.
**Done when:** every library effect builds in the Next, Vite, Vue and HTML fixtures and passes tape parity.

### Phase 143 · Embed script, size budgets & Web Vitals
**Needs:** 142 · **Was:** v3 69.3–69.5 · **Status:** 📋
- [ ] A framework-free embed (`<script type="module">` + `<div data-fx>`) for Webflow, Framer, Wix, WordPress and plain HTML (self-hosted until 193). Per-family size budgets in CI; the poster reserves the box (CLS 0), init waits for LCP, effects pause offscreen.

**You'll see:** "Copy embed code" for any effect.
**Done when:** every effect meets its size budget with CLS 0 and no long task ≥ 50 ms at init; the embed works under a strict nonce-based CSP.

### Phase 144 · Interactive accessibility
**Needs:** 143 · **Was:** v3 29 (v3.0 amendment), 29.4 · **Closes:** AUD-14 · **Status:** 📋
- [ ] Per-effect reduced-motion policy (freeze, calm, off); a pause control and page-wide switch for motion longer than 5 s; flash detection on sampled GPU frames under aggressive tapes; dynamic contrast for text over animated backgrounds; target stability; cursor safeguards; rules 6.12–6.15 checked at runtime; axe on every export.

**You'll see:** accessibility warnings in the inspector with one-click fixes.
**Done when:** axe reports 0 violations across the export matrix; the reduced-motion run with pointer tapes shows no spatial movement.

### Phase 145 · Interactive performance budgets per tier
**Needs:** 144 · **Was:** v3 26 (v3.0 amendment) · **Closes:** AUD-55 (simulated tiers) · **Status:** 📋
- [ ] Budgets per device tier for every interactive effect (frame time, memory, live surfaces, runtime size), measured under input tapes with a 10-minute soak on simulated low and mid tiers. Real phones come in 186.

**You'll see:** tier badges (runs on low / mid / high devices) on every effect.
**Done when:** every library effect meets its simulated tier budgets in CI.

### Phase 146 · Composition test suite
**Needs:** 145 · **Was:** v3 91.7 · **Closes:** AUD-57 · **Status:** 📋
- [ ] Ten interactions built from primitives only (no code, no preset, no typed numbers), run in 3 browsers and on a phone profile, then exported and parity-checked: letters flee an invisible cursor circle; a magnetic dot grid with a click shockwave; a cursor chain; falling, throwable letters with a reset; eyes that look at the cursor; scroll scatter; click confetti of your own shape; a tilting card grid; an orbit around a lagging helper; a hit counter that plays a composition and a sound.

**You'll see:** the same 10 builds work for anyone, from primitives.
**Done when:** all 10 pass, and no Simple face in them shows a technical parameter.

### Phase 147 · Stage 3 gate: the interactive journey
**Needs:** 103–146 · **Was:** v3 58.5, 58.6 · **Status:** 📋
- [ ] **Journey A (React):** a hero with a cursor-reactive background, a magnetic CTA, a cursor effect and a rule (hover → glow, click → particles and a card flip), scrubbed with a tape, opened as a graph, exported and parity-checked on desktop and a mid-tier phone profile.
- [ ] **Journey B (Compose):** the reference build from primitives in < 5 minutes: helper circle following by its bottom pin, Split letters, "keep outside, spin, spring home" rule, opened as a graph, exported, accessibility tree and touch profile checked.
- [ ] **Journey C (Keyboard):** a card carousel driven by arrows and focus, identical in the export.
- [ ] **Journey D (Bring your own):** an imported component with one prop bound to the cursor, exported, isolation verified.

**You'll see:** LazyLayout's pitch, working end to end: interactive effects anyone can add, compose and export.
**Done when:** the journeys pass in CI in 3 browsers, plus one recorded manual run.

---

# STAGE 4 — 3D (Phases 148–167)

> **Stage output:** real 3D inside the same documents, timeline and interactions: a scene layer drawn through the GPU compositor, Spline-style editing with gizmos, primitives and 3D text, GLTF models (including their animations), PBR materials, lights, shadows and environments, cameras and camera paths, 3D keyframes, cursor and scroll reactions, raycast events for Blueprints, instancing, 3D physics, post-processing, and export to React Three Fiber or plain three.js.
>
> **Why three.js and not our own engine:** three.js, React Three Fiber and drei are MIT-licensed (§1.9), which allows commercial use. Building a custom 3D engine would cost years and add nothing a user would see. If that ever changed, Phase 148's decision record names the fallback.

### Phase 148 · 3D stack decision & licences
**Needs:** 147 · **Was:** v3 18 (v3.0, v3.3 amendments) · **Status:** 📋
- [ ] Decision record 0013 (3D stack): three.js r186+ through the compositor (one renderer per context, shared by every 3D layer); `WebGPURenderer` with TSL falling back to WebGL2; R3F for export and React targets; a 3D physics engine chosen by benchmark among permissively licensed candidates (licence recorded in `LICENSES.md` before use); the fallback if a licence ever changed (the compositor's WebGL2 helper for 2.5D; a new stage for full 3D).
- [ ] Record three.js, R3F, drei and the physics engine in `LICENSES.md` (Law 7).

**You'll see:** nothing yet (a decision). 149 draws the first scene.
**Done when:** the record is reviewed and every 3D dependency is in `LICENSES.md`.

### Phase 149 · Scene layer
**Needs:** 148 · **Was:** v3 18.1 · **Closes:** AUD-11 · **Status:** 📋
- [ ] A `scene3d` layer kind, lazily loaded, rendered through the compositor (shared contexts, posters offscreen, context-loss recovery). The 3D archetypes (object, camera, light) become reachable in the editor.

**You'll see:** add a 3D scene to any frame.
**Done when:** a scene renders in 3 browsers and recovers from a forced context loss.

### Phase 150 · 3D viewport editing
**Needs:** 149 · **Was:** — (new) · **Status:** 📋
- [ ] Enter a scene to edit it: orbit, pan and dolly camera; translate, rotate and scale gizmos with snapping; click selection by raycast; grid, axes and local/world space toggle; frame selected. All are commands (Law 20).

**You'll see:** Spline-style 3D editing inside the canvas.
**Done when:** a 15-step gizmo journey gives exact transforms and one undo step per gesture.

### Phase 151 · Scene hierarchy & 3D inspector
**Needs:** 150 · **Was:** — (new) · **Status:** 📋
- [ ] Scene objects appear in the Layers panel (grouping, parenting, visibility); the inspector shows position, rotation (Euler display, quaternion stored) and scale, with Simple and Pro faces.

**You'll see:** 3D objects listed and edited like any other layer.
**Done when:** reparenting in the tree keeps world transforms (golden tests).

### Phase 152 · Primitives & 3D text
**Needs:** 151 · **Was:** v3 18.2 (primitives) · **Status:** 📋
- [ ] Box, sphere, cylinder, torus, plane, capsule and 3D text (extruded, with the project's fonts); parameters editable with handles.

**You'll see:** drop in 3D shapes and extruded headlines.
**Done when:** each primitive renders identically (within GPU tolerance) in 3 browsers.

### Phase 153 · GLTF import pipeline
**Needs:** 152 · **Was:** v3 18.2 (GLTF), 54 (v3.3 amendment) · **Status:** 📋
- [ ] GLTF/GLB import into the asset store: validation and sanitising (rules from Phase 16), Draco and meshopt decoding, KTX2/Basis textures transcoded in a worker, tier-sized variants, thumbnails.

**You'll see:** drag a `.glb` model onto a scene.
**Done when:** 10 sample models import; a malformed fixture is rejected with a reason.

### Phase 154 · Materials & textures
**Needs:** 153 · **Was:** v3 18.2 (materials) · **Status:** 📋
- [ ] PBR materials (colour, metalness, roughness, normal, emissive, transmission, clearcoat) with a material inspector and presets; texture maps from the asset store; shared materials.

**You'll see:** make an object look like glass, metal or plastic.
**Done when:** material presets match reference renders within tolerance.

### Phase 155 · Lights, shadows & environments
**Needs:** 154 · **Was:** v3 18.2 (lights) · **Status:** 📋
- [ ] Ambient, directional, point, spot and area lights with gizmos; shadows with quality per tier; HDRI environments and backgrounds; tone mapping.

**You'll see:** light a scene and see real shadows.
**Done when:** lighting references render within tolerance and stay within tier budgets.

### Phase 156 · Cameras & camera paths
**Needs:** 155 · **Was:** v3 18.3 (camera) · **Status:** 📋
- [ ] Perspective and orthographic cameras, an active-camera switch, field of view and depth of field settings, and camera paths drawn in 3D (constant speed, look-at target).

**You'll see:** a camera flying along a path through your scene.
**Done when:** sampled camera positions on a path match `evaluate()`.

### Phase 157 · 3D keyframes on the timeline
**Needs:** 156 · **Was:** v3 18.3 (tracks) · **Status:** 📋
- [ ] Position, rotation (quaternion slerp) and scale tracks, material and light properties, camera properties; 3D motion paths and onion skin in the scene view.

**You'll see:** animate 3D objects on the same After Effects-style timeline.
**Done when:** 3D tracks match `evaluate()` at 5 times; scrubbing is exact.

### Phase 158 · Animated GLTF playback
**Needs:** 157 · **Was:** — (new) · **Status:** 📋
- [ ] Skeletal clips and morph targets from imported models appear as clips on the timeline (trim, loop, blend, speed) and can be triggered by states and Blueprints.

**You'll see:** a character model's walk cycle placed on the timeline.
**Done when:** an animated sample model scrubs exactly and plays in sync with other layers.

### Phase 159 · 3D materials in the shader graph & WebGPU
**Needs:** 158 · **Was:** v3 18 (v3.0 amendment), 62 (TSL) · **Status:** 📋
- [ ] The shader graph (132) targets TSL node materials for 3D objects; the WebGPU path (opt-in, with WebGL2 fallback) is tested end to end.

**You'll see:** custom animated materials built visually.
**Done when:** 5 graph materials match between WebGPU and WebGL2 within tolerance.

### Phase 160 · 3D reactions & raycast events
**Needs:** 159 · **Was:** v3 18.3 (pointer) + new · **Status:** 📋
- [ ] Bindings into 3D (tilt, parallax, look-at, follow in 3D, scroll-driven camera); raycast pointer events (enter, leave, click, drag on objects) for the Blueprint library; keyboard bindings for 3D (orbit with arrows).

**You'll see:** an object that turns toward the cursor and reacts when clicked.
**Done when:** scripted tapes produce the expected object transforms and Blueprint events.

### Phase 161 · Instancing, LOD & 3D cloners
**Needs:** 160 · **Was:** — (new; extends 116 to 3D) · **Status:** 📋
- [ ] Instanced meshes, levels of detail, and grid, radial, scatter and path cloners in 3D with per-instance attributes usable by bindings and effectors.

**You'll see:** thousands of 3D objects reacting together.
**Done when:** 10,000 instances hold the mid-tier budget.

### Phase 162 · 3D physics
**Needs:** 161 · **Was:** — (new) · **Status:** 📋
- [ ] Rigid bodies and colliders on the engine chosen in 148, deterministic fixed step with snapshots for scrubbing, contact events for Blueprints, draggable 3D bodies.

**You'll see:** drop objects into a scene and throw them around.
**Done when:** a 100-body scene replays within tolerance at checkpoints; contact events fire at the expected frames.

### Phase 163 · Post-processing
**Needs:** 162 · **Was:** — (new) · **Status:** 📋
- [ ] Bloom, depth of field, ambient occlusion, colour grading and vignette as an ordered stack, each with a cost per tier and automatic downgrade.

**You'll see:** cinematic glow and depth of field.
**Done when:** each effect stays within its tier budget and degrades in the documented order.

### Phase 164 · 3D memory discipline
**Needs:** 163 · **Was:** v3 18 (v3.3 amendment) · **Closes:** AUD-58 (3D) · **Status:** 📋
- [ ] Every geometry, material, texture and target is reference-counted in the ledger and disposed when unused; loader caches cleared; programs precompiled asynchronously.

**You'll see:** big scenes stay stable for long sessions.
**Done when:** loading and unloading a GLTF 20 times returns `renderer.info.memory` to its baseline.

### Phase 165 · 3D export
**Needs:** 164 · **Was:** v3 18.4 · **Status:** 📋
- [ ] Export to React Three Fiber components and plain three.js, lazily loaded, with a poster fallback when WebGL is missing and the vendored runtime for bindings and Blueprints.

**You'll see:** export a 3D hero to your Next app.
**Done when:** the 3D references build in the fixtures and match the editor within 2% (GPU tolerance).

### Phase 166 · 3D library
**Needs:** 165 · **Was:** v3 25.3 (wave 6) · **Status:** 📋
- [ ] Floating object, 3D card flip, GLTF spin showcase, depth-parallax scene, physics badge on a lanyard, product turntable, as open recipes.

**You'll see:** ready-made 3D effects you can customise.
**Done when:** each passes the Playground sweep, parity and its tier budget.

### Phase 167 · Stage 4 gate: the 3D journey
**Needs:** 148–166 · **Was:** — (new) · **Status:** 📋
- [ ] A hero with an imported GLTF product that turns toward the cursor, a scroll-driven camera path, PBR materials, lights, a physics interaction on click, and a Blueprint rule; scrubbed with a tape, exported, parity-checked, and run on a mid-tier phone profile.

**You'll see:** 3D scenes designed, animated and made interactive in the same editor.
**Done when:** the journey passes in CI in 3 browsers, plus one recorded manual run.

---

# STAGE 5 — AI & AGENTS (Phases 168–176)

> **Stage output:** a real model builds the first version and helps refine it, always as a diff the user approves. Claude, through MCP, can do everything a person can do in the editor.

### Phase 168 · LLM integration layer
**Needs:** 167 · **Was:** v3 30.1, 30.2 · **Closes:** AUD-17 · **Status:** 📋
- [ ] A Next.js route handler calls the Claude API through `@anthropic-ai/sdk`; the key stays server-side. The model ID lives in one constant, checked against the current model lineup when this phase starts.
- [ ] Schema-constrained output (the MDM JSON Schema and the command schemas from 13 as strict tool inputs); edits are MDM patches, graphs are `.nls`; streaming; prompt caching of the stable prefix; vision input; graceful handling of every stop reason.
- [ ] The route is private (developer use) until Phases 184 and 185.

**You'll see:** an AI panel that answers about your document.
**Done when:** no API key appears in client bundles (build scan); cache reads show on repeated requests.

### Phase 169 · Validation loop & offline provider
**Needs:** 168 · **Was:** v3 30.3, 30.4 · **Closes:** AUD-18 · **Status:** 📋
- [ ] Every model output goes through schema validation, then `rules.validate`, then at most one repair turn with the diagnostics, otherwise it's rejected with an explanation. The v1.1 deterministic parsers become the offline provider and a test oracle; `ConstrainedDecoder.ts` is removed.

**You'll see:** AI suggestions never break the rules.
**Done when:** 50 scripted prompts give ≥ 95% schema- and rule-valid patches with at most one repair.

### Phase 170 · AI builder: prompt → design and motion
**Needs:** 169 · **Was:** v3 31 · **Status:** 📋
- [ ] A planner picks layers, library effects (preferred when they fit), reactions and rules; a builder emits patches; a streaming ghost diff on the canvas and timeline (accept all, per layer, or discard); follow-up turns; a plain-language summary with the engine choices.

**You'll see:** type a sentence and watch a first version appear as a ghost you can accept.
**Done when:** a first-time user gets an accepted result from a one-sentence prompt within 20 s at p90 over the eval prompts.

### Phase 171 · AI evals & visual self-check
**Needs:** 170 · **Was:** v3 33 · **Status:** 📋
- [ ] An eval set of ≥ 210 prompts (layouts, motion, interactive effects, interaction rules, 3D, edits, fixes, sketches); renders checked at sampled times and under tapes by a second model call; a dashboard of validity, repair, acceptance, latency and cost; CI blocks prompt changes that drop validity by > 2 points.

**You'll see:** (team) an AI quality dashboard.
**Done when:** the baseline is recorded, with ≥ 95% validity tracked.

### Phase 172 · AI co-pilot: edit, explain, fix
**Needs:** 171 · **Was:** v3 32 · **Status:** 📋
- [ ] Selection-scoped edits ("bouncier", "stagger from the centre", "calmer on mobile"), enforced to touch only the selection; explanations of what an animation does and why it routes where it does; one-click fixes for rule and performance diagnostics; entry points in a prompt bar, the context menu and the Simple Motion card.

**You'll see:** right-click → Ask AI on anything.
**Done when:** selection-scoped edits never modify unselected layers (100% on the eval set); explanations are rated accurate on ≥ 90% of 30 samples.

### Phase 173 · AI interaction builder
**Needs:** 172 · **Was:** v3 73.4 · **Status:** 📋
- [ ] "When the button is clicked, burst confetti and flip the card" → Simple rules or graph patches as a ghost diff, using the `.nls` text form.

**You'll see:** describe an interaction and get rules you can open as a graph.
**Done when:** ≥ 90% of the 20 interaction prompts in the eval set produce valid, runnable rules.

### Phase 174 · AI effect author
**Needs:** 173 · **Was:** v3 70 · **Closes:** AUD-54 (authoring) · **Status:** 📋
- [ ] A prompt or reference becomes a shader graph, particle stack and bindings (never free-form GLSL by default), validated, compiled and render-probed at tape checkpoints before it appears as a ghost diff; remix edits ("react to scroll too").

**You'll see:** "a background like ink in water that swirls around the cursor" becomes an editable effect.
**Done when:** on the 40 effect prompts, ≥ 90% are valid and within budget, and ≥ 60% are accepted without manual edits.

### Phase 175 · AI from references
**Needs:** 174 · **Was:** v3 34 · **Status:** 📋
- [ ] Image references → layout and style; GIF or video references → sampled frames → closest effects and parameters; a screenshot the user is allowed to use → a matching motion treatment (no automatic scraping).

**You'll see:** drop a GIF and get a matching animation.
**Done when:** 20 reference clips map to the right effect category in ≥ 80% of cases.

### Phase 176 · MCP v1: full agent parity
**Needs:** 175 · **Was:** — (new) · **Status:** 📋
- [ ] The MCP server covers every command added since Phase 50 (timeline, states, bindings, Blueprints in `.nls`, effects, 3D, export, render queue). New tools: render a frame at time `t` under a tape, evaluate a property, validate, explain, run the Playground sweep for one effect. Resources: effect catalogue, signal catalogue, grammar summary. Prompts: guided flows ("animate this hero", "make it react to the cursor").
- [ ] An MCP activity log in the editor showing each agent action and its approval.

**You'll see:** in Claude: "make the cards fly in on scroll and tilt toward the cursor" happens on your canvas, step by step, as diffs you approve.
**Done when:** the coverage test reports 0 commands missing from MCP; an MCP client completes the Stage 1–4 gate journeys' key steps using only MCP tools.

---

# STAGE 6 — EASY FOR EVERYONE (Phases 177–183)

> **Stage output:** someone who knows Figma or After Effects feels at home immediately, can bring their existing work in, and a complete beginner can draw roughly and get a clean, animated result in three steps.

### Phase 177 · Familiar keymaps & terms
**Needs:** 176 · **Was:** — (new) · **Status:** 📋
- [ ] Keymap presets: **Figma** (default on the canvas) and **After Effects** (default in the timeline), switchable, with a searchable cheat sheet. Tooltips show the equivalent term ("Precomp — like a Figma component for time").

**You'll see:** your Figma and After Effects shortcuts just work.
**Done when:** a test checks the 60 most-used Figma and After Effects shortcuts map to the right commands.

### Phase 178 · Figma import
**Needs:** 177 · **Was:** — (new) · **Status:** 📋
- [ ] Import a Figma file the user owns through Figma's REST API (personal access token or OAuth, used server-side and not stored): frames, auto-layout, constraints, components and variants, text styles, vectors, images and colour styles map to the MDM; anything that doesn't map is listed, never silently dropped.

**You'll see:** paste a Figma file link and keep working on it here.
**Done when:** 5 sample files import with a mapping report; layouts match screenshots within tolerance.

### Phase 179 · After Effects import via Lottie
**Needs:** 178 · **Was:** — (new) · **Status:** 📋
- [ ] Import Bodymovin/Lottie JSON (exported from After Effects): shape layers, transforms, keyframes and easing, trim paths, masks, mattes and precomps become compositions; unsupported features are reported.

**You'll see:** bring an After Effects animation in and edit it on the timeline.
**Done when:** 10 sample Lottie files import and play within 2% pixels of `lottie-web`.

### Phase 180 · Shape recognition & beautification
**Needs:** 179 · **Was:** v3 36 · **Status:** 📋
- [ ] Local recognisers (< 50 ms): lines, ellipses and circles, polygons with right-angle snapping, and template shapes (arc, arrow, star, heart, check, cross); confidence scores; hold-to-snap with "keep as drawn"; multi-stroke grouping; recognised shapes become the shape archetypes.

**You'll see:** draw a wobbly oval and get a perfect ellipse.
**Done when:** on ≥ 300 labelled strokes, ≥ 92% accuracy for basic shapes, ≥ 85% for templates, ≤ 5% false positives, p95 < 50 ms.

### Phase 181 · Draw-to-animate gestures
**Needs:** 180 · **Was:** v3 37 · **Status:** 📋
- [ ] Stroke → draw animation timed like the drawing; a line from an element → motion path; circle around an element → orbit; flick → fade up; zig-zag → shake; draw shape A and B → morph. Every result is a normal clip.

**You'll see:** draw a line from a shape and it travels along it.
**Done when:** PRD §11 criterion 2 passes as a Playwright script with recorded strokes.

### Phase 182 · Sketch to elements with AI
**Needs:** 181 · **Was:** v3 38 · **Status:** 📋
- [ ] Rough boxes and scribbles on a sketch layer → real elements (buttons, cards, images, headings, toggles) with default motion as a ghost diff; handwriting becomes label text after confirmation.

**You'll see:** sketch a UI and get real components.
**Done when:** 30 sketch fixtures map to the right element in ≥ 80% of cases.

### Phase 183 · Simple mode & guided flow
**Needs:** 182 · **Was:** v3 39 · **Closes:** AUD-21 · **Status:** 📋
- [ ] A new start screen: **Describe it**, **Draw it**, **Start from a template or effect**, **Import from Figma or After Effects**. Three steps: Create → Make it move and react → Get code or embed. "Open in Pro" at every step; a ≤ 60 s first-run tour; Pro panels and CSS lazy-loaded in Simple mode (initial bundle ≤ 60% of today's).

**You'll see:** a beginner-friendly path from blank to exported animation.
**Done when:** 5 first-time users each go from blank to a copied, working animated component in < 3 minutes (median), without help.

---

# STAGE 7 — PRODUCTION & PUBLIC BETA (Phases 184–191)

> **Stage output:** a public beta that is secure, observable, tested on real devices and licence-clean, with the legacy systems gone.

### Phase 184 · Security hardening
**Needs:** 183 · **Was:** v3 80.3–80.5 · **Closes:** AUD-51 (security) · **Status:** 📋
- [ ] A strict CSP with nonces and Trusted Types; sanitisers for SVG, GLTF and fonts re-verified; GPU compile limits and a watchdog; AI and MCP routes with authentication, authorisation, rate limits and prompt-injection handling for references; dependency audit, lockfile integrity and secret scanning in CI; exported code with no `eval`, no inline handlers, and working under a CSP.

**You'll see:** nothing new; everything keeps working under a strict security policy.
**Done when:** an escape corpus (malicious SVG, code component, shader, expression, GLTF, text inside a reference image) can't read editor storage, cookies or tokens in 3 browsers; 0 high or critical dependency findings; the editor runs with no CSP violations.

### Phase 185 · Observability & kill switches
**Needs:** 184 · **Was:** v3 82 · **Closes:** AUD-51 (operations) · **Status:** 📋
- [ ] Client and server error reporting with PII scrubbing; opt-in performance telemetry (frame time, long tasks, GPU tier, context losses, memory, unexpected reloads); remote kill switches and feature flags without a deploy; canary, beta and stable channels; SLOs, runbooks and a status page for the AI and MCP routes.

**You'll see:** a status page; a crashing effect family can be switched off remotely.
**Done when:** an injected error and a context-loss storm show on dashboards within 5 minutes; a kill switch disables an effect family for new sessions within 5 minutes.

### Phase 186 · Real-device & browser matrix
**Needs:** 185 · **Was:** v3 84 · **Closes:** AUD-55 · **Status:** 📋
- [ ] The support matrix (editor: current and previous desktop Chrome, Edge, Safari, Firefox; exports: those plus the last 2 majors of iOS Safari and Android Chrome); named reference devices per tier in a device lab; per-tier budgets for every effect and 3D scene calibrated on real hardware; 10-minute soaks; the input matrix (mouse, trackpad, pen, touch, keyboard-only, screen reader).

**You'll see:** "tested on" tier badges backed by real devices.
**Done when:** every library effect meets its tier budgets on the matrix; no crash or tab kill in a 10-minute soak on the low mobile tier; input-matrix journeys pass.

### Phase 187 · Licensing & compliance automation
**Needs:** 186 · **Was:** v3 85 · **Status:** 📋
- [ ] A licence scanner in CI with an allowlist (fails on GPL/AGPL or Commons Clause in shipped code); generated third-party notices in exports; provenance complete for every library effect; a bundle check that `gsap` is absent from the editor; terms of service, privacy policy, and AI and MCP data-use policy; consent for telemetry.

**You'll see:** a notices file in every export.
**Done when:** CI fails on a planted disallowed licence and on a planted `gsap` import; every export carries correct notices.

### Phase 188 · Legacy retirement & grep gates
**Needs:** 187 · **Was:** v3 57 · **Status:** 📋
- [ ] Remove whatever earlier phases left behind (each replacing phase deleted most of it already). A CI grep gate forbids: HTML-string stage markup, local playheads, `requestAnimationFrame` outside the scheduler, listeners outside the input bus, WebGL contexts outside the compositor, `Math.random()`/`Date.now()` in effect programs, `gsap` in editor code. Split `panels.css` per panel and drop unused selectors.

**You'll see:** a smaller, faster editor (bundle size drop recorded).
**Done when:** the grep gate is green and the full Playwright and parity suites pass.

### Phase 189 · Documentation & audit close-out
**Needs:** 188 · **Was:** v3 40.4 · **Status:** 📋
- [ ] A user guide (Simple and Pro, written for Figma and After Effects users), an effect authoring guide, an MCP guide for agents, known limitations; every `AUDIT.md` ID resolved or explicitly deferred.

**You'll see:** in-app help and docs links.
**Done when:** the doc-link checker passes and `AUDIT.md` has no open ID without an owner.

### Phase 190 · Integration journeys
**Needs:** 189 · **Was:** v3 58 · **Status:** 📋
- [ ] Every stage gate journey (52, 102, 147, 167) and the AI and MCP journeys run together on the release candidate in CI in 3 browsers and on the device matrix.

**You'll see:** a release candidate.
**Done when:** all journeys are green on one tagged commit.

### Phase 191 · Public beta gate
**Needs:** 184–190 · **Was:** v3 40 · **Status:** 📋
- [ ] PRD §11 criteria 1–13 as automated journeys plus a recorded manual run; every matrix green (export parity, performance tiers, accessibility, AI evals, recognition accuracy, security, licences); a go/no-go review against PRD §13.

**You'll see:** the public beta.
**Done when:** every item is green in CI at a tagged commit (`v0.2.0-beta`).

---

# STAGE 8 — SITES & PLATFORM (Phases 192–201)

> **Stage output:** general availability. Accounts, cloud projects and sharing, remote MCP, content collections and forms, whole-site export and deploy, and plans and billing.

### Phase 192 · Accounts & cloud projects
**Needs:** 191 · **Was:** v3 81.1, 81.2 · **Closes:** AUD-51 (platform), AUD-53 · **Status:** 📋
- [ ] Passkeys and OAuth sign-in, account deletion and data export; local-first IndexedDB projects synced to the server with a single-writer lock per project; assets stored by content hash; backups.

**You'll see:** sign in and open your projects on another computer.
**Done when:** a project edited offline on device A syncs to device B with no loss; deleting an account removes its data (verified by test).

### Phase 193 · Share links & hosted embeds
**Needs:** 192 · **Was:** v3 81.3, 81.4 · **Status:** 📋
- [ ] View-only Preview links with live effects and Blueprints (password and expiry options); hosted embeds served from a CDN; storage and bandwidth quotas.

**You'll see:** share a live, interactive preview with a link.
**Done when:** a share link renders the interactive preview in a logged-out browser.

### Phase 194 · Remote MCP endpoint
**Needs:** 193 · **Was:** — (new) · **Status:** 📋
- [ ] A hosted MCP endpoint (Streamable HTTP, OAuth) that works on cloud projects without a local bridge; per-project agent permissions; the same approval and activity log as Phase 176.

**You'll see:** connect Claude to LazyLayout from anywhere, without installing anything.
**Done when:** an MCP client authenticates, edits a cloud project, and the user approves the diffs; unauthorised projects are refused.

### Phase 195 · Content collections & repeaters
**Needs:** 194 · **Was:** v3 78.1, 78.2 · **Closes:** AUD-44 (content) · **Status:** 📋
- [ ] Collections with typed fields (text, rich text, image, number, date, reference); repeaters bound to collections with item templates, sorting, filtering and staggered entrances; dynamic pages per item.

**You'll see:** a blog list and post pages driven by your own content.
**Done when:** a 50-post collection renders its list and post pages correctly in Preview.

### Phase 196 · Forms
**Needs:** 195 · **Was:** v3 78.3 · **Status:** 📋
- [ ] Form fields, validation, and Submitting, Success and Error states (animated); submission to a user-configured endpoint, webhook or form service, with spam protection and a privacy-notice slot.

**You'll see:** a contact form that animates through its states.
**Done when:** the form posts to a mock endpoint and all three states animate in Preview and export.

### Phase 197 · Whole-site export & SEO
**Needs:** 196 · **Was:** v3 79.1, 79.2, 78.4 · **Closes:** AUD-44 (site) · **Status:** 📋
- [ ] A complete Next 16 App Router (or static Vite) project: routes, layouts, components, collections as static JSON or MDX with typed loaders, statically generated dynamic routes, the vendored runtime, compiled Blueprints, assets and fonts. SEO: metadata, Open Graph images, sitemap, robots, structured data, landmarks.

**You'll see:** export your whole site as one project.
**Done when:** the 5-page fixture with a blog exports, builds statically and passes axe with 0 violations.

### Phase 198 · Web Vitals & deploy handoff
**Needs:** 197 · **Was:** v3 79.3, 79.4 · **Status:** 📋
- [ ] LCP, INP and CLS budgets in CI on the mid and low tiers with auto-fixes (poster-first effects, image sizing, font loading); export to a Git repository or one-click deploy to the user's own hosting through OAuth.

**You'll see:** one-click deploy.
**Done when:** the fixture deploys to a preview environment and meets LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 on the mid tier.

### Phase 199 · Plans, metering & billing
**Needs:** 198 · **Was:** v3 83 · **Status:** 📋
- [ ] Metering of AI tokens and cost per feature, MCP usage, storage and bandwidth; quotas per plan with graceful fallbacks; abuse detection; billing with idempotent webhooks, upgrades, downgrades and invoices.

**You'll see:** plans and usage in account settings.
**Done when:** over-limit use is blocked with a clear message and fallback; replayed billing webhooks are idempotent.

### Phase 200 · Animated templates & themes
**Needs:** 199 · **Was:** v3 76.3 (interactive variants), 76.4 · **Status:** 📋
- [ ] Every section template gets default motion and at least one interactive variant; whole-site themes (tokens + motion style) switch in one click.

**You'll see:** templates that already move and react.
**Done when:** every template passes accessibility checks, tier budgets and export parity.

### Phase 201 · General availability gate
**Needs:** 192–200 · **Was:** v3 86 · **Status:** 📋
- [ ] A first-time user builds a 3-page site from templates with an interactive hero background, a cursor effect, a 3D element, a collection list and a contact form, plus two Blueprint interactions; previews it on desktop and phone; exports and deploys it. Every matrix green; operations and billing live; go/no-go against PRD §13 using beta telemetry.

**You'll see:** LazyLayout 1.0.
**Done when:** every item is green in CI at a tagged commit (`v1.0.0`), plus a recorded manual run on desktop and phone.

---

# STAGE 9 — APPS (Phase 202)

### Phase 202 · Apps re-baseline: the After-track audit
**Needs:** 201 · **Was:** v3 87 · **Closes:** AUD-50 (After-track) · **Status:** 📋
- [ ] Audit the After-track code (NodeScript backend nodes, `LogicFlowEmitter`, `ApiRouteEmitter`, `PrismaSchemaEmitter`, Database Studio, deployment, version control) the way `AUDIT.md` audited v1.1, and record what really works in a browser and a build.
- [ ] Write the Apps roadmap in this format (sequential, gated), reusing the Blueprint language so interaction logic and app logic are one language. Include real-time collaboration, plugins, importing existing code projects (`DOCS/FUTURE/ROADMAP_EXISTING_PROJECT_IMPORT.md`) and mobile app export as candidates.
- [ ] Decide the backend model (user-owned or hosted) with its security and compliance scope.

**You'll see:** (planning) a gated roadmap for data, backend logic, collaboration and plugins.
**Done when:** the audit and the Apps roadmap exist, and every old ✅ claim for the After track is re-verified or withdrawn.

---

## 6. Reference

### Decision records

Existing: `decisions/0001-wasm.md`, `decisions/0002-time-model.md`, `decisions/0003-geometry-vs-transform.md`, `decisions/0004-motion-primitives.md`, `decisions/0005-phase8-rule-table-and-reconciliation.md`, `decisions/0007-deterministic-evaluation-kernel.md`. Number 0006 stays reserved for stateful simulation (Phase 122).

v3 planned three records under numbers that were already taken (`0004-render-capture`, `0005-gpu-surface-strategy`, `0007-code-component-isolation`). v4 renumbers every new record:

| Record | Phase |
|---|---|
| 0006 stateful simulation & determinism | 122 |
| 0008 threat model | 16 |
| 0009 render host | 18 |
| 0010 render capture | 100 |
| 0011 GPU surface strategy | 129 |
| 0012 code component isolation | 140 |
| 0013 3D stack | 148 |
| 0014 MCP bridge | 50 |

### Scope notes
- **GSAP:** never runs in the editor while `LICENSES.md` GATE-01 is open; optional export target only (Phase 98).
- **three.js:** MIT, used for real 3D only and loaded lazily; 2D GPU effects use the lighter compositor helper (Phase 129).
- **Mobile apps (React Native, Flutter):** out of scope until the Apps roadmap (Phase 202).
- **Real-time multiplayer editing:** Apps roadmap (Phase 202). Cloud projects use a single-writer lock (Phase 192).
- **Reverse-engineering other products' code:** not used. Figma and After Effects users are served by importing their own files through public APIs and formats (Phases 178, 179) and by familiar keymaps (Phase 177).


## 7. Crosswalk: v3 Phase → v4 Phase

Use this to read `AUDIT.md`'s "Fix Phase" column, decision records, the PRD and specs, old commit messages and `TODO(P…)` comments, which all use v3 numbers. Where a v3 phase was split, each part is listed with its v3 sub-phase.

| v3 | v4 |
|---|---|
| 1 | 1 |
| 2 | 2 |
| 3 | 3 |
| 4 | 4 |
| 5 | 5 |
| 6 | 6 |
| 7 | 8 |
| 8 | 10 |
| 9 | 11, 108 |
| 10 | 57 (10.1), 58 (10.1), 59 (10.2), 60 (10.3) |
| 11 | 78 (11.1), 79 (11.2), 93 (11.4), 113 (11.3) |
| 12 | 105 (12.3), 111 (12.2) |
| 13 | 81 (13.1, 13.2), 82 (13.3) |
| 14 | 98 |
| 15 | 87 |
| 16 | 40 (16.1), 85 (16.2, 16.3), 86 (16.3, 16.4) |
| 17 | 38 (17.3), 83 (17.1), 84 (17.2) |
| 18 | 148, 149 (18.1), 152 (18.2), 153 (18.2), 154 (18.2), 155 (18.2), 156 (18.3), 157 (18.3), 159, 160 (18.3), 164, 165 (18.4) |
| 19 | 131 (19.1), 134 (19.2) |
| 20 | 21 (20.3), 25 (20.4), 26 (20.1), 27 (20.1), 28 (20.2) |
| 21 | 32 (21.1), 61 (21.2), 91 (21.3) |
| 22 | 33 (22.1), 34 (22.2), 35 (22.2), 45 (22.3), 91 (22.4) |
| 23 | 61 (23.1), 66 (23.2), 67 (23.3), 105 (23.4) |
| 24 | 90 (24.0–24.3, 24.5), 105 (24.4) |
| 25 | 91 (25.1, 25.2), 92 (25.3), 139 (25.3), 166 (25.3) |
| 26 | 101 (26.1–26.4), 145 |
| 27 | 49 (27.1), 94 (27.1), 95 (27.2, 27.3), 96 (27.4) |
| 28 | 97 |
| 29 | 93 (29.1, 29.3), 95 (29.2), 144 (29.4) |
| 30 | 168 (30.1, 30.2), 169 (30.3, 30.4) |
| 31 | 170 |
| 32 | 172 |
| 33 | 171 |
| 34 | 175 |
| 35 | 39 (35.1–35.4) |
| 36 | 180 |
| 37 | 181 |
| 38 | 182 |
| 39 | 183 |
| 40 | 189 (40.4), 191 |
| 41 | 3 (41.2), 12 |
| 42 | 7 |
| 43 | 13 (43.1, 43.3), 24 (43.2), 25 (43.2) |
| 44 | 14 (44.1, 44.4), 15 (44.2, 44.3) |
| 45 | 54 (45.1), 55 (45.2, 45.3), 56 (45.4) |
| 46 | 9 |
| 47 | 76 (47.1, 47.3, 47.4), 77 (47.2, 47.4) |
| 48 | 17 (48.1), 18 (48.2, 48.5), 19 (48.3, 48.4), 49 |
| 49 | 20 (49.1), 21 (49.2), 22 (49.3), 23 (49.4, 49.5) |
| 50 | 41 (50.1), 42 (50.1, 50.2), 43 (50.3), 44 (50.4), 49 (50.5), 88 (50.3) |
| 51 | 72 (51.1), 73 (51.2), 74 (51.3, 51.4), 75 (51.5, 51.6) |
| 52 | 61 (52.1), 62 (52.2), 63 (52.3), 64 (52.4), 65 (52.5) |
| 53 | 69 (53.1), 70 (53.2, 53.4), 71 (53.3) |
| 54 | 36 (54.1, 54.2), 99 (54.3, 54.4), 153 |
| 55 | 100 |
| 56 | 101 |
| 57 | 68 (57.1), 188 |
| 58 | 52 (58.1), 102 (58.2, 58.3, 58.4), 147 (58.5, 58.6), 190 |
| 59 | 103 (59.1), 104 (59.2), 105 (59.3) |
| 60 | 107 (60.1), 108 (60.2), 109 (60.3), 110 (60.4) |
| 61 | 129 (61.1, 61.3), 130 (61.2, 61.5), 131 (61.4) |
| 62 | 132 (62.1, 62.3), 133 (62.2), 159 |
| 63 | 134 |
| 64 | 122 (64.1), 135 (64.2, 64.3) |
| 65 | 136 |
| 66 | 137 |
| 67 | 138 |
| 68 | 141 |
| 69 | 142 (69.1, 69.2), 143 (69.3–69.5) |
| 70 | 174 |
| 71 | 106 |
| 72 | 119 (72.1, 72.2), 120 (72.3, 72.4) |
| 73 | 125 (73.1, 73.5, 73.6), 126 (73.2, 73.3), 173 (73.4) |
| 74 | 121 (74.1), 127 (74.2–74.4) |
| 75 | 46 (75.1, 75.5), 47 (75.2, 75.3), 49 (75.5), 80 (75.2, 75.4) |
| 76 | 48 (76.1), 51 (76.3, 76.4), 82 (76.2), 200 (76.3, 76.4) |
| 77 | 48 (77.1, 77.2, 77.4), 89 (77.3) |
| 78 | 195 (78.1, 78.2), 196 (78.3), 197 (78.4) |
| 79 | 197 (79.1, 79.2), 198 (79.3, 79.4) |
| 80 | 16 (80.1), 140 (80.2), 184 (80.3–80.5) |
| 81 | 192 (81.1, 81.2), 193 (81.3, 81.4) |
| 82 | 185 |
| 83 | 199 |
| 84 | 186 |
| 85 | 187 |
| 86 | 201 |
| 87 | 202 |
| 88 | 72 (88.2), 73 (88.1), 114 |
| 89 | 115 (89.1), 116 (89.2, 89.3), 128 (89.4) |
| 90 | 117 (90.1–90.3), 118 (90.4–90.6) |
| 91 | 122 (91.3), 123 (91.1, 91.2), 124 (91.4, 91.5), 127 (91.6), 146 (91.7) |
