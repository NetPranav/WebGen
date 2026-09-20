# IMPLEMENTATION ROADMAP & MILESTONES — INITIAL PHASE

## Project Name: Visual Motion & Frontend Design Studio
**Internal Codename:** "Unreal Engine for Animation & Frontend Design"
**Document Version:** 1.1.0
**Phase:** Initial Phase (Element Animation Studio)
**Status:** Active Execution
**File Location:** `DOCS/Initial/ROADMAP.md`
**Scope Note:** This roadmap builds **Element Design only** (`PRD.md` §3). Component Design and Page/Section Design begin at **Phase 9** and are out of scope for every phase below — do not build UI, schema, or emitter code for them while working through Phases 1–8.

---

## 1. Phased Delivery Strategy

The Initial Phase is organized into **8 sequential phases**, each containing numbered sub-phases with verifiable deliverables. The objective of this roadmap is to deliver a rock-solid, production-grade visual tool that can **completely** animate every archetype in the four Element families (Interactive, Media, Structural, Text — `PRD.md` §5) and emit clean, drop-in code for any existing React, Next.js, Vue, or Vanilla project.

"Completely" is not a slogan here — it is the literal Definition of Done in `PRD.md` §8, and it is why Phases 3, 5, 6, and 7 are each broken out **per element family** below rather than treating "elements" as one generic bucket.

---

## 2. Phase Overview Summary

| # | Name | Sub-Phases | Key Deliverable | Status |
|---|---|---|---|---|
| 1 | IDE Shell, Docking & Design Tokens | 1.1–1.5 | Dockable shell, Confluence dot grid, token system | ✅ COMPLETE |
| 2 | Interactive Project Hub & Design Launcher | 2.1–2.4 | Element-only scope card, archetype picker, tech stack picker | ✅ COMPLETE |
| 3 | Element Archetype Library & Outliner | 3.1–3.5 | Full schema + defaults for all 4 families, incl. Image/Divider/Background | ✅ COMPLETE |
| 4 | Motion Sequencer & Bezier Curve Editor | 4.1–4.4 | Multi-track keyframes, C++ Wasm Bezier solver, ScrollTrigger | ✅ COMPLETE |
| 5 | Multi-Engine Animation Runtime | 5.1–5.6 | GSAP, Framer Motion, SVG/Divider stroke-draw, Image & Background motion | ✅ COMPLETE |
| 6 | Professional Clean Code Emitter & Exporter | 6.1–6.5 | Archetype-aware emitters, live preview, 1-click copy, ZIP exporter | ✅ COMPLETE |
| 7 | MotionAI Co-Pilot & Preset Ecosystem | 7.1–7.4 | Prompt-to-motion generator, visual diff, per-family preset browser | ✅ COMPLETE |
| 8 | End-to-End Verification & Integration Gate | 8.1–8.4 | Real-world drop-in testing, per-archetype verification matrix | 🚀 NEXT |

---

## 3. Phase Specifications

---

### Phase 1: IDE Shell, Docking & Design Tokens — ✅ COMPLETE
**Goal:** Establish the rock-solid visual foundation, token architecture, and dockable windowing shell.

- [x] Sub-Phase 1.1: Confluence warm-white dot grid canvas (`#FCFDFD`, 24px spacing) and single-source CSS tokens (`tokens.css`).
- [x] Sub-Phase 1.2: Dockable layout infrastructure with top, bottom, left, right dock zones and resizable splitters.
- [x] Sub-Phase 1.3: 2D corner drag handles (`DockCornerSplitter.tsx`) for simultaneous width and height resizing.
- [x] Sub-Phase 1.4: Floating viewport history actions (Undo/Redo) with glassmorphic hover pills.
- [x] Sub-Phase 1.5: Design token showcase and verification page (`/`).

---

### Phase 2: Interactive Project Hub & Design Launcher — ✅ COMPLETED
**Goal:** Build the dedicated launcher page (`Screen 00`) that locks the user into Element Design, has them pick a starting archetype, and configures target technologies before entering the editor.

- [x] **Sub-Phase 2.1: Element-Only Scope Selector:**
  - Implement the Element Design card as active and pre-selected (`PRD.md` §6, `UI.md` Screen 00).
  - Implement Component Design and Page/Section Design cards in a **disabled** visual state (`UI.md` §2.1 disabled-surface tokens) with tooltip `Coming in a later phase — see ROADMAP.md`. They must render but must not be clickable or navigable via keyboard focus.
- [x] **Sub-Phase 2.2: Archetype Picker:**
  - Build `ArchetypePicker.tsx` (`FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md` §2) showing the 4 families and their archetypes:
    1. **Interactive:** Button, Toggle Switch, Badge/Chip, Floating Action Button.
    2. **Media:** Image, Icon (SVG).
    3. **Structural:** Divider, Background Layer, Container.
    4. **Text:** Text / Label.
  - Selecting an archetype sets `project.rootArchetype` and is required before "Launch Design Studio" enables.
- [x] **Sub-Phase 2.3: Technology & Engine Configurator:**
  - Dropdown 1: **Target Framework** (Next.js 15 App Router, Next.js Pages, React 19 Vite, Vue 3, Svelte 5, Vanilla HTML/JS).
  - Dropdown 2: **Styling System** (Tailwind CSS v4/v3, Vanilla CSS, CSS Modules, Styled Components).
  - Dropdown 3: **Animation Engine** (GSAP 3.12, Framer Motion 11, SVG & Native CSS, Hybrid).
  - Toggle: **Language** (`TypeScript` default, `JavaScript`).
- [x] **Sub-Phase 2.4: Project Initialization & Workspace Tailoring:**
  - Clicking "Launch Design Studio" initializes the reactive project store with `rootArchetype` and target config, and navigates to the studio layout with the correct Details Inspector sections pre-rendered (`PANELS.md` §3, Panel 03).
- **Verification Gate:** Naming a project, confirming Element Design (the only enabled option), picking `Image` as the archetype, and choosing `Next.js 15 + Tailwind + GSAP` launches the studio with an empty Image element on stage and the Media Details section visible. Attempting to click the disabled Component or Page cards does nothing.

---

### Phase 3: Element Archetype Library & Outliner — ✅ COMPLETED
**Goal:** Implement the full property schema, defaults, and Outliner representation for **every** archetype in all 4 families — this is the phase where "Element-only, but complete" is actually built out, not just Buttons.

- [x] **Sub-Phase 3.1: Interactive Family (Button, Toggle, Badge, FAB):**
  - Implement `interactive.ts` archetype schema + defaults (`FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md` §2).
  - Universal Transform/Layout/Appearance/Typography sections wired to the Details Inspector.
- [x] **Sub-Phase 3.2: Media Family (Image, Icon):**
  - Implement `media.ts` archetype schema + defaults, including the full `media.*` property surface (`CONVENTIONS.md` §4.3): `src`, `objectFit`, `focalPoint`, `filter.*`, `clipPath`, `overlay.*`.
  - Build `MediaSection.tsx` in the Details Inspector: source uploader, object-fit selector, draggable focal-point crosshair, filter sliders, clip-path shape picker, overlay color/opacity/blend controls.
  - Icon retains its existing `svg.*` schema (path, stroke, dasharray, dashoffset).
- [x] **Sub-Phase 3.3: Structural Family (Divider, Background Layer, Container):**
  - Implement `structural.ts` archetype schema + defaults, including the full `divider.*` and `background.*` property surfaces (`CONVENTIONS.md` §4.4).
  - Build `DividerSection.tsx`: orientation, length (with draw-in toggle), thickness, style selector, gradient stop editor, cap style.
  - Build `BackgroundSection.tsx`: type selector, color/gradient/image sub-forms, parallax speed slider, blend mode dropdown, noise opacity/scale sliders.
  - Container ships with only universal sections (Transform, Layout, Appearance) — it exists purely to compose the other archetypes when an archetype needs a child (e.g. Button's icon + label).
- [x] **Sub-Phase 3.4: Text Family:**
  - Implement `text.ts` archetype schema + defaults; wire Typography section + GSAP SplitText stagger authoring for character/word reveals.
- [x] **Sub-Phase 3.5: Simplified Outliner & Content Browser Linkage:**
  - Build `ElementOutliner.tsx` rendering the root archetype, its children (if any), and attached Animation Stacks, with a family-indicating icon badge per node (`PANELS.md` §3, Panel 02).
  - Quick-add (`+`) popover filters animation-type options to what is valid for the selected archetype's family.
  - Drag-and-drop binding of Content Browser presets directly onto the Outliner root/children.
- **Verification Gate:** For each of the 10 archetypes (Button, Toggle, Badge, FAB, Image, Icon, Divider, Background Layer, Container, Text), creating one and opening the Details Inspector shows exactly the sections listed for it in `PANELS.md` §3 — no missing sections, no sections from the wrong family.

---

### Phase 4: Motion Sequencer & Bezier Curve Editor — ✅ COMPLETED
**Goal:** Provide an Unreal Sequencer-grade multi-track timeline and visual easing curve editor that works identically across all 4 element families.

- [x] **Sub-Phase 4.1: Multi-Track Keyframe Timeline (`MotionSequencer.tsx`):**
  - Dedicated horizontal tracks for every property path in `CONVENTIONS.md` §4 (universal, plus family-specific: `media.*`, `divider.*`, `background.*`).
  - Interactive playhead with smooth scrubbing, timecode readout, and frame snapping.
  - Diamond keyframe markers: add, move, stretch, duplicate, and delete keyframes.
- [x] **Sub-Phase 4.2: C++ WebAssembly Bezier Curve Editor (`CurveEditor.tsx`):**
  - Interactive curve visualizer with tangent handles for sculpting custom `cubic-bezier()` easing.
  - Leverage Wasm kernel (`SplineSolver.cpp`) to calculate smooth cubic spline curves and arc-length parameterization at 120 FPS.
  - Preset easing quick-picker: `Power2.out`, `Power4.inOut`, `Elastic.out`, `Bounce.out`, `Custom Bezier`.
- [x] **Sub-Phase 4.3: ScrollTrigger Threshold Visualizer:**
  - Visual scroll trigger tracks with start/end markers, scrub toggle, and pin container options — required for Image parallax, Background parallax, and Divider scroll-reveal.
  - Viewport scroll simulator bar enabling real-time preview of scroll-linked animations.
- [x] **Sub-Phase 4.4: Stagger & Infinite-Loop Manager:**
  - Configure multi-child staggered entrance delays (`start`, `center`, `end`, `random`) for archetypes with children.
  - Infinite-loop toggle (`iterationCount: -1`) for ambient, trigger-less tracks such as Background gradient drift.
- **Verification Gate:** Scrubbing the Sequencer timeline smoothly animates the element on stage at 60+ FPS for all 4 families; modifying a bezier curve handle immediately alters easing interpolation; toggling infinite loop on a Background gradient track runs it continuously in the sandbox.

---

### Phase 5: Multi-Engine Animation Runtime — ✅ COMPLETE
**Goal:** Deliver visual authoring support for GSAP 3.12, Framer Motion 11, SVG/stroke vector animation, and native CSS, applied completely across every archetype.

- [x] **Sub-Phase 5.1: GSAP 3.12 Core Integration:**
  - Runtime driver compiling timeline tracks to `gsap.timeline()` and `gsap.to()` calls with ScrollTrigger bindings, for all property paths in `CONVENTIONS.md` §4 (`MultiEngineAnimationRuntime.ts`).
- [x] **Sub-Phase 5.2: Framer Motion 11 Core Integration:**
  - Runtime driver compiling continuous spring physics ($v_0$ handoff, `stiffness`, `damping`, `mass`) and declarative `whileHover` / `whileTap` gesture variants.
- [x] **Sub-Phase 5.3: SVG & Divider Stroke-Draw Engine:**
  - Visual SVG path morphing (`d` attribute point interpolation) and stroke-dashoffset line drawing for Icon and Divider (`divider.strokeDashoffset`, `divider.length`).
- [x] **Sub-Phase 5.4: Image Motion Engine:**
  - Ken Burns slow-zoom (`transform.scale` + `transform.x/y` drift), clip-path reveal wipes (`inset()`, `circle()`), filter transitions (blur, grayscale, brightness, contrast, saturate), and scroll parallax.
- [x] **Sub-Phase 5.5: Background Motion Engine:**
  - Animatable gradient angle/stop drift, scroll-linked parallax, blend-mode crossfades, and SVG-filter-driven noise/grain pulse.
- [x] **Sub-Phase 5.6: Native CSS Keyframe & Spring Emitter:**
  - Pure CSS `@keyframes` generator with custom `cubic-bezier()` timing functions and CSS Easing Level 2 `linear(...)` spring curves for zero-runtime dependencies.
- **Verification Gate:** For each family — an Interactive element with a spring bounce, an Image with a Ken Burns + parallax combo, a Divider with a scroll-triggered draw-in, and a Background with an infinite gradient drift — all run identically in both the visual preview sandbox and the compiled output (`MultiEngineAnimationRuntime.test.ts`).

---

### Phase 6: Professional Clean Code Emitter & Exporter — ✅ COMPLETE
**Goal:** Generate human-readable, production-grade code that can be dropped directly into any external codebase with zero engine lock-in, using the correct semantic tag per archetype.

- [x] **Sub-Phase 6.1: Next.js 15 & React 19 TSX Emitters:**
  - Emitter for **Tailwind CSS**: Translates visual layout, typography, and styling into clean, idiomatic Tailwind classes (`InteractiveEmitter.ts`, `MediaEmitter.ts`, etc.).
  - Emitter for **Vanilla CSS / CSS Modules**: Emits semantic JSX paired with clean, scoped `styles.module.css`.
- [x] **Sub-Phase 6.2: Archetype-Aware Tag Emission (`FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md` §2):**
  - `InteractiveEmitter.ts`: `<button>` / `<div role="switch">` semantics for Interactive family.
  - `MediaEmitter.ts`: `<Image />` (Next.js) or `<img loading="lazy">` with explicit `width`/`height`, wrapped in an animatable container when `clipPath`/`overlay` is used.
  - `StructuralEmitter.ts`: `<hr>`/styled `<div>` for solid/dashed/dotted Dividers; `<svg><line/></svg>` for gradient/draw-in Dividers; absolutely-positioned `<div>` for Background Layer.
  - `TextEmitter.ts`: Text/label emission with optional GSAP SplitText stagger wiring.
- [x] **Sub-Phase 6.3: Animation Code Emitter:**
  - Generates idiomatic GSAP `useGSAP()` hooks or Framer Motion `<motion.div>` components with fully typed props, for every property path used by the project.
  - Zero proprietary runtime imports; uses ONLY standard npm packages (`gsap`, `framer-motion`, `next/image`).
- [x] **Sub-Phase 6.4: Live Code Inspector Split-View (`CodeInspector.tsx`):**
  - Live split-view tab displaying `Component.tsx`, `useAnimation.ts`, and `styles.module.css`.
  - Formatted in real time with syntax highlighting; root-tag preview matches the archetype's emitter output.
- [x] **Sub-Phase 6.5: Standalone Exporter & ZIP Bundler:**
  - "1-Click Copy Code" button with copy feedback.
  - "Download ZIP Package" containing `ComponentName.tsx`, `styles.module.css` (if applicable), `types.ts`, `README.md` (exact `npm install` instructions for dependencies).
- **Verification Gate:** For one archetype per family (Button, Image, Divider, Background, Text), clean production drop-in code confirmed with zero internal engine leaks (`ArchetypeEmitters.test.ts`).

---

### Phase 7: MotionAI Co-Pilot & Preset Ecosystem — ✅ COMPLETE
**Goal:** Provide AI-powered animation generation and an expansive, per-family library of pre-choreographed motion assets.

- [x] **Sub-Phase 7.1: Natural Language Prompt-to-Motion:**
  - Users input prompts (e.g. *"Add a slow Ken Burns zoom to this image"*, *"Make this divider draw in from the center on scroll"*, *"Give this background a slow sunrise gradient drift"*).
  - MotionAI parses intent, determines the target archetype's valid property paths, and generates keyframe tracks on the Sequencer.
- [x] **Sub-Phase 7.2: Visual Diff & Human Approval Gate:**
  - AI-generated keyframes appear as translucent green ghost keyframes on the timeline.
  - User can scrub preview and explicitly click "Accept" or "Discard".
- [x] **Sub-Phase 7.3: Curated Preset Library (per family):**
  - Interactive/Entrance/Scroll presets (existing) plus the full Image preset set (§`PRD.md` §5.2), Divider preset set (§`PRD.md` §5.3), and Background preset set (§`PRD.md` §5.3) — 50+ production-grade motion presets total across all families (51 presets delivered).
- [x] **Sub-Phase 7.4: Diagnostic Assistant:**
  - Suggests performance optimizations for heavy SVG path morphs, oversized/unoptimized images, excessive noise-filter layers, or layout reflows with 1-click auto-fixes.
- **Verification Gate:** Asking MotionAI to "add an elastic bounce on tap" (Interactive), "add a Ken Burns zoom" (Image), or "make this background drift like a slow sunrise" (Background) each places correct, family-valid keyframes, previews in ghost mode, and merges cleanly on approval (`MotionAiEngine.test.ts`).

---

### Phase 8: End-to-End Verification & Integration Gate — 📋 PLANNED
**Goal:** Verify complete workflow from Home Screen selection to external production deployment, across every archetype in every family.

- [ ] **Sub-Phase 8.1: Full Pipeline Integration Test (per family):**
  - Launch from Home Screen ➔ Pick archetype ➔ Choreograph in Sequencer ➔ Test in Sandbox ➔ Export Code — run once per family (Interactive, Media, Structural, Text), not just once overall.
- [ ] **Sub-Phase 8.2: Cross-Framework Export Validation:**
  - Verify exported code across: Next.js 15 (App Router), React 19 (Vite), Vue 3, Vanilla HTML/JS — for at least one archetype per family.
- [ ] **Sub-Phase 8.3: Performance & 60 FPS Guarantee:**
  - Verify animation execution maintains 60+ FPS on mid-tier hardware with zero memory leaks, including Image filter stacks and Background noise layers, which are the most GPU-intensive archetypes.
- [ ] **Sub-Phase 8.4: Archetype Verification Matrix:**
  - Produce and check off a matrix of all 10 archetypes × {schema valid, Details Inspector correct, animation authoring works, Sandbox preview correct, code export correct} before the Initial Phase is declared done. No archetype may ship with any cell unchecked.