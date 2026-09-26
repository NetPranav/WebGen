# LazyLayout: Execution Order, Step by Step

**What this is:** every phase of `DOCS/Initial/ROADMAP.md` (v3.3, 91 phases) in the order to build it, one step at a time. Phase numbers are identifiers, not order (ROADMAP §1). This file turns ROADMAP §5.1's stage table into a single numbered list.

**How it was checked:** each step comes after every phase it depends on. The dependencies come from the "Depends on" column and the *"before X"* notes in ROADMAP §5, plus the stage notes in §5.1. A script checked the list: all 91 phases appear once, and no step runs before something it needs. Where §5.1 disagreed with the dependency table, the dependency won; see [Where this differs from §5.1](#where-this-differs-from-roadmap-51).

**How to use it:**
- Take the first step that isn't ✅.
- Steps marked **∥** in the *With* column can run alongside the step or steps named there.
- When a phase passes its gate in CI, mark it ✅ here and in the ROADMAP.

**Legend:** ✅ done (CI green) · 🚧 in progress · ⏭ next · 📋 not started

---

## Done so far

| # | Phase | Name | Status |
|---|---|---|---|
| 1 | 1 | Build Health & CI | ✅ |
| 2 | 2 | Unified Motion Document Model (MDM v2) | ✅ |
| 3 | 3 (+41.2) | Store, History & Persistence (with 41.2 transactions) | ✅ PR #7 |
| 4 | 4 | Real-Environment Verification Harness | ✅ PR #7 |
| 5 | 5 | Dependency Reality & Wasm Decision | ✅ PR #8 |
| 6 | 6 | Scope, Naming & Docs Cleanup | ✅ PR #9 |
| 7 | 42 | Canonical Property Paths & Geometry Model | ✅ PR #11 |
| 8 | 7 | Motion Primitives (schema v4) | ✅ PR #13 |

---

## Stage 2 · Motion core (and the rest of Stage 1)

| # | Phase | Name | Needs | With | Status |
|---|---|---|---|---|---|
| 9 | **46** | Compositions, Layer Time Bars & Nesting | 7 | — | ✅ PR #14 |
| 10 | 8 | Executable Motion Rules Engine | 7, 46 | ∥ 11 | ⏭ |
| 11 | 9 | Deterministic Evaluation Kernel | 7, 46 | ∥ 10 | ⏭ |
| 12 | 41 | Store Decomposition (the rest: 41.1, 41.3) | 2 | ∥ 10, 11 | 📋 |
| 13 | 43 | Command Bus, Tool State Machine & Keymap | 41 | ∥ 10, 11 | 📋 |
| 14 | 44 | Workspace Architecture & Layout Presets | 6, 43 | ∥ 10, 11 | 📋 |
| 15 | 80.1 | Threat model (the first part of 80) | 3 | any time | 📋 |
| 16 | 45 | Transport, Global Clock & Frame Scheduler | 9, 41 | ∥ 17 | 📋 |
| 17 | 48 | Stage Renderer v2: Document → DOM | 41, 42 | ∥ 16 | 📋 |
| 18 | 47 | Property Links, Expressions & Drivers | 9, 46 | ∥ 16, 17 | 📋 |
| 19 | 54 | Asset Pipeline & Media Layers | 3, 45 | ∥ 20 | 📋 |
| 20 | 56 | Workers, Baking & Hot-Path Performance | 5, 9, 45 | ∥ 19 | 📋 |
| 21 | 59 | Signals & Input Bus | 45, 48 | — | 📋 |
| 22 | 71 | GPU & Interactive Verification Harness | 4, 45, 59 | ∥ 23 | 📋 |
| 23 | 60 | Signal Bindings & the Reactivity Card | 59, 9, 47 | ∥ 22 | 📋 |
| 24 | 10 | Live Preview Runtime & Engine Adapters | 8, 9, 45, 48 | — | 📋 |
| 25 | 11 | States, Transitions & State Machine | 10 | ∥ 26, 27, 28 | 📋 |
| 26 | 12 | Pointer, Physics & Reactive Behaviours | 10, 60 | ∥ 25, 27, 28 | 📋 |
| 27 | 13 | Scroll Engine | 10 | ∥ 25, 26, 28 | 📋 |
| 28 | 88 | Helper Layers, Pins & Follow | 42, 60 | ∥ 25, 26, 27 | 📋 |

## Stage 3 · Engines, GPU effects and kinetic composition

| # | Phase | Name | Needs | With | Status |
|---|---|---|---|---|---|
| 29 | 14 | GSAP Integration (licence-gated) | 10, 6 | ∥ 30–32 | 📋 |
| 30 | 15 | Motion (Framer Motion) Integration | 10, 5 | ∥ 29, 31, 32 | 📋 |
| 31 | 16 | SVG Animation Studio | 10 | ∥ 29, 30, 32 | 📋 |
| 32 | 17 | Typography & Text Motion (17.1 splitter first) | 10 | ∥ 29–31 | 📋 |
| 33 | 89 | Split, Clone & Generators | 17.1, 48, 88 | — | 📋 |
| 34 | 90 | Fields & Effectors | 88, 89, 60, 9 | — | 📋 |
| 35 | 61 | GPU Surface Compositor (its gate needs 71) | 10, 45, 48, 59, 71 | — | 📋 |
| 36 | 62 | Shader Graph & Shader Authoring | 61, 60, 8 | ∥ 37 | 📋 |
| 37 | 63 | Particles & Force Fields | 61, 60 | ∥ 36 | 📋 |
| 38 | 64 | Stateful Simulations & Deterministic Replay | 61, 63, 9, 45 | ∥ 39 | 📋 |
| 39 | 65 | Media-as-Texture & Distortion | 61, 54, 17 | ∥ 38 | 📋 |
| 40 | 49 | Viewport Engine: Infinite Canvas, Hit-Testing & Overlay | 43, 48 | ∥ 36–39 | 📋 |
| 41 | 66 | Cursor & Overlay Layer | 59, 60, 61, 49 | — | 📋 |
| 42 | 18 | Three.js / R3F Engine | 10, 5, 61 | ∥ 43 | 📋 |
| 43 | 19 | Shader & Canvas Effects Engine | 10, 61–63 | ∥ 42 | 📋 |
| 44 | 67 | Effect Definition Format & Effect SDK | 7.4, 46, 60, 61, 62 | — | 📋 |
| 45 | 72 | Interaction Blueprint Model & NodeScript IR | 7, 8, 11, 60 | — | 📋 |
| 46 | 73 | Blueprint Editor: Simple Rules, Pro Graph | 72, 44, 49 | ∥ 47 | 📋 |
| 47 | 91 | Colliders, Contact Events & Kinetic Bodies | 90, 64.1, 72, 45 | ∥ 46 | 📋 |

**Milestone after step 36** (ROADMAP §5.1, "vertical slice first"): one cursor-reactive shader background end to end. It is scrubbed with a tape, exported, parity-checked, works with reduced motion, and runs on a phone.
**Milestone after step 34:** the reference build's effector form works as a scripted Playground scene. **After step 47:** its Blueprint/physics form works too.

## Stage 4 · Studio

| # | Phase | Name | Needs | With | Status |
|---|---|---|---|---|---|
| 48 | 20 | Figma-Grade Stage & Canvas | 2, 8, 43, 44, 49 | — | 📋 |
| 49 | 21 | Layers Panel | 20 | ∥ 50, 51 | 📋 |
| 50 | 22 | Properties Panel: Simple / Pro | 20 | ∥ 49, 51 | 📋 |
| 51 | 50 | Auto-Layout, Constraints & Breakpoints | 20, 42 | ∥ 49, 50 | 📋 |
| 52 | 52 | After Effects–Style Timeline Workspace | 44, 45, 46 | ∥ 49–51 | 📋 |
| 53 | 23 | Timeline 2.0 & Graph Editor | 9, 21, 52 | — | 📋 |
| 54 | 53 | On-Canvas Motion Editing | 16, 49, 52 | ∥ 55 | 📋 |
| 55 | 51 | Layer Compositing: Anchor, Parenting, Blend, Masks | 46, 48 | ∥ 54 | 📋 |
| 56 | 24 | Animation Playground | 10–13 | — | 📋 |
| 57 | 25 | Effects Library (waves 7–9 need 63–67) | 14–19, 24 | — | 📋 |
| 58 | 26 | Motion Performance Lab (tiers from 84) | 10, 4 | — | 📋 |

**Milestone after step 58:** the no-code journey of the reference build (Journey E, 58.6) is reachable, because the canvas (49, 20), the inspector (22) and the rules UI (73) are all in place.

## Stage 5 · Output

| # | Phase | Name | Needs | With | Status |
|---|---|---|---|---|---|
| 59 | 27 | Verified Export Pipeline (React / Next / Vite) | 4, 10–19 | — | 📋 |
| 60 | 28 | Additional Targets & Component Registry | 27 | ∥ 61, 62 | 📋 |
| 61 | 29 | Accessibility & Reduced Motion | 17, 27 | ∥ 60, 62 | 📋 |
| 62 | 55 | Render Queue: Video, GIF, Lottie | 9, 45, 48 | ∥ 60, 61 | 📋 |
| 63 | 69 | Interactive Export & Embed Runtime | 27, 60, 61–67 | — | 📋 |
| 64 | 74 | Blueprint Runtime & Compiler | 72, 45, 27 | ∥ 63 | 📋 |
| 65 | 80.2 | Sandbox boundaries (the second part of 80) | 80.1 | — | 📋 |
| 66 | 68 | Code Components: Import, Sandbox & Controls | 48, 60, 80.2, 27 | — | 📋 |

## Stage 6 · AI

| # | Phase | Name | Needs | With | Status |
|---|---|---|---|---|---|
| 67 | 30 | LLM Integration Layer | 2, 8 | — | 📋 |
| 68 | 31 | AI Builder: Prompt → Motion Document | 30, 25 | — | 📋 |
| 69 | 32 | AI Co-pilot: Edit, Explain, Fix | 31 | ∥ 70, 71 | 📋 |
| 70 | 33 | AI Quality: Evals & Visual Self-Check | 31, 4 | ∥ 69, 71 | 📋 |
| 71 | 34 | AI From References | 31 | ∥ 69, 70 | 📋 |
| 72 | 70 | AI Effect Author | 31, 62, 63, 67, 71 | — | 📋 |

The AI route goes public only after 80.3 and 82.1 (ROADMAP §5.1).

## Stage 7 · Draw

| # | Phase | Name | Needs | With | Status |
|---|---|---|---|---|---|
| 73 | 35 | Drawing Tools Foundation | 20 | — | 📋 |
| 74 | 36 | Shape Recognition & Beautification | 35 | — | 📋 |
| 75 | 37 | Draw-to-Animate Gestures | 36, 16 | ∥ 76 | 📋 |
| 76 | 38 | Sketch-to-Element with AI | 36, 31 | ∥ 75 | 📋 |
| 77 | 39 | Simple Mode & Guided Flow | 22, 25, 37 | — | 📋 |

## Stage 8 · Release 1 (public beta)

| # | Phase | Name | Needs | With | Status |
|---|---|---|---|---|---|
| 78 | 80 | Threat Model, Sandboxing & Security (the rest) | 3, 80.2 | ∥ 79–81 | 📋 |
| 79 | 82 | Observability, Reliability & Operations | 30 | ∥ 78, 80, 81 | 📋 |
| 80 | 84 | Device & Browser Matrix, Real-Device Performance | 26, 71 | ∥ 78, 79, 81 | 📋 |
| 81 | 85 | Legal, Licensing & Compliance Automation | 27, 68 | ∥ 78–80 | 📋 |
| 82 | 57 | Legacy Runtime Retirement | 10, 20, 23, 27, 48, 52 | — | 📋 |
| 83 | 58 | Studio Architecture Integration Gate | 41–57, 20–24 | — | 📋 |
| 84 | **40** | **Release 1 beta gate** | all Release 1 phases | — | 📋 |

## Stage 9 · Release 2 (Sites)

| # | Phase | Name | Needs | With | Status |
|---|---|---|---|---|---|
| 85 | 75 | Components, Variants & Instances | 40, 72 | — | 📋 |
| 86 | 76 | Sections, Templates & Section Library | 75, 50, 13 | — | 📋 |
| 87 | 77 | Pages, Navigation & Page Transitions | 76 | — | 📋 |
| 88 | 78 | Content Collections, Data Binding & Forms | 75, 77 | — | 📋 |
| 89 | 79 | Site Export, SEO & Web Vitals | 77, 78, 69, 74 | — | 📋 |
| 90 | 81 | Accounts, Cloud Projects & Sharing | 80, 3, 54 | ∥ 85–89 | 📋 |
| 91 | 83 | Plans, Metering & AI Cost Controls | 30, 33, 81 | ∥ 85–89 | 📋 |
| 92 | **86** | **Release 2 GA gate (Sites)** | 40, 75–79, 80–85 | — | 📋 |

## Stage 10 · Release 3 (Apps)

| # | Phase | Name | Needs | Status |
|---|---|---|---|---|
| 93 | 87 | Release 3 Re-baseline: After-Track Reality Audit | 86 | 📋 |

After 87, Release 3 gets its own roadmap.

---

## Where this differs from ROADMAP §5.1

Five places where §5.1's stage table disagrees with the phases' own dependencies. The dependency wins here. The ROADMAP should be corrected to match.

1. **49 (Viewport Engine) moves from Stage 4 to step 40.** 66 (Cursor Layer, Stage 3) and 73 (Blueprint Editor, Stage 3.5) both depend on 49. 49 needs only 43 and 48, which are done by then.
2. **54 (Asset Pipeline) moves to step 19.** 65 (Media-as-Texture, Stage 3) depends on it. §5.1 says "54 any time after 3", but 54 also needs 45.
3. **41.1/41.3 and 43 → 44 finish in Stage 2 (steps 12–14),** because 45 and 48 need 41, and 49 and 20 need 43 and 44. §5.1 lists them as open Stage 1 work without a deadline.
4. **77 follows 76; they don't run in parallel.** §5.1 Stage 9 says "75 → (76 ∥ 77)", but 77's row says it depends on 76.
5. **12 waits for 60.** §5.1 says so in Stage 2's notes ("12 after 60"). The overview table lists only 10 as its dependency.

---

*Maintained by hand next to the ROADMAP. When a phase finishes, update its row here. When the ROADMAP adds or reorders phases, re-check this list with the same rule: no step before anything it needs.*
