# IMPLEMENTATION ROADMAP & MILESTONES

## Project Name: Visual Web Application Engine
**Internal Codename:** "Unreal Engine for Web Applications"  
**Document Version:** 2.0.0  
**Status:** Active — Phase 1 In Progress  
**File Location:** `DOCS/ROADMAP.md`  
**Goal Checkpoint:** Before starting each sub-phase, revisit PRD.md §1 (Core Philosophy) and UI.md §1 (Design Philosophy) to confirm alignment.

---

## 1. Phased Delivery Strategy

The project is organized into **7 major phases**, each broken into **numbered sub-phases** (1.1, 1.2, etc.). Each sub-phase is a self-contained unit of work that produces a testable increment.

> **Rule:** Complete sub-phases sequentially. Each sub-phase must pass its verification test before proceeding.

---

## 2. Phase Overview

| Phase | Name | Sub-Phases | Key Deliverable | Status |
|---|---|---|---|---|
| **1** | Foundations & IDE Shell | 1.1 – 1.7 | Dockable IDE with Confluence canvas, panels, and UE5 Details Inspector | ✅ COMPLETE |
| **2** | Inside-Out Database Logic, Connection & Animation Engine | 2.1 – 2.5 | Database schemas, property access matrix, diagnostic bus, animation samples & UI wrappers | ✅ COMPLETE |
| **3** | Logic Blueprint Engine & Node System | 3.1 – 3.5 | Functional node graphs with type-safe wiring & My Blueprint panel | ✅ COMPLETE |
| **4** | C++ Wasm Kernel & Physics Canvas | 4.1 – 4.5 | 120 FPS curved wire rendering with Verlet spring physics | 🚀 IN PROGRESS (ACTIVE TARGET) |
| **5** | Play Mode Runtime & Execution Trace | 5.1 – 5.5 | Live sandbox preview with animated wire pulses & AI diagnostic | 📋 PLANNED |
| **6** | Compiler & Production Code Generation | 6.1 – 6.5 | Exportable Next.js 15 + React 19 + Prisma production code | 📋 PLANNED |
| **7** | Operations, Deployment & Extensions | 7.1 – 7.5 | Build pipelines, cloud deploy, plugins, command palette & global search | 📋 PLANNED (IN LAST) |

**Architectural Law:** All forward development follows the **Inside-Out Engine Law** (Innermost Connection Settings ➔ Engine Compatibility Evaluator ➔ Output Log Diagnostics ➔ UI Reflection).

---

## 3. Phase 1: Foundations & IDE Shell

**Goal:** Build the professional IDE framework. When this phase is done, a user should open the app and immediately feel: "This is a real development engine."

**Goal Alignment Check (PRD.md §1.1):** "A professional development platform" — the shell must feel premium, not like a toy prototype.  
**Goal Alignment Check (UI.md §1):** "Confluence Canvas + Refined Unreal Shell" — white dot-grid center, curved dockable panels.

---

### Sub-Phase 1.1: Project Scaffold & Base Configuration
**Goal:** Initialize the Next.js 15 project with the correct dependencies, folder structure, font loading, and base configuration files.

**Checklist:**
- [x] Run `npx create-next-app` with TypeScript, App Router, no Tailwind
- [x] Install core dependencies: `zustand`, `immer`, `gsap`, `lucide-react`
- [x] Configure `tsconfig.json` with path aliases (`@/core/*`, `@/editor/*`, `@/compiler/*`, `@/runtime/*`, `@/ai/*`)
- [x] Create base folder structure matching `FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md` §3
- [x] Configure Google Fonts (Inter, JetBrains Mono) in `layout.tsx`
- [x] Create `public/` directories for fonts, icons, and templates
- [x] Create `.gitignore` matching `CONVENTIONS.md` §6.2
- [x] Verify: `npm run dev` / `npm run build` starts successfully with a blank page

---

### Sub-Phase 1.2: CSS Design Token System
**Goal:** Establish the complete design token foundation so every future component pulls from a single source of truth. No hardcoded colors, sizes, or shadows anywhere.

**Checklist:**
- [x] Create `src/editor/styles/tokens.css` — Complete CSS variable registry (colors, radii, shadows, spacing, fonts, transitions) as defined in UI.md §2
- [x] Create `src/editor/styles/globals.css` — CSS reset, box-sizing, base typography, custom scrollbar styling
- [x] Create `src/editor/styles/animations.css` — Reusable micro-animation @keyframes (fade-in, slide-up, scale-in, pulse)
- [x] Import all stylesheets in the root `layout.tsx`
- [x] Verify: HTML elements on the page render with Inter font, custom scrollbars, and correct base colors

---

### Sub-Phase 1.3: Editor Shell Layout & Dock Infrastructure
**Goal:** Build the outer IDE shell — the top bar, status bar, and the resizable dock zone containers (left, center, right, bottom) that will host all future panels.

**Checklist:**
- [x] Create `src/editor/shell/EditorShell.tsx` — Root layout component with CSS Grid defining 4 dock zones (left, center, right, bottom)
- [x] Create `src/editor/styles/dock.css` — Dock zone borders, splitter handles, glass panel styling
- [x] Create `src/editor/shell/DockZone.tsx` — A dock zone container that accepts panel children and supports tabbing
- [x] Create `src/editor/shell/DockSplitter.tsx` — Draggable splitter bars between dock zones with hover indicators
- [x] Create `src/editor/shell/DockTabBar.tsx` — Tab strip at the top of each dock zone for switching between stacked panels
- [x] Create `src/editor/shell/StatusBar.tsx` — Bottom status bar showing zoom level, cursor context, save status
- [x] Wire into `src/app/editor/layout.tsx` and `src/app/editor/page.tsx`
- [x] Verify: The editor page shows a 4-zone grid layout with draggable splitters between zones (Tested & verified in browser)

---

### Sub-Phase 1.4: Studio Header & Main Toolbar
**Goal:** Build the top menu bar (File, Edit, View, Window, Help) and the action toolbar (Save, Undo, Redo, AI, Build, Play, Deploy). These are the user's primary engine controls.

**Checklist:**
- [x] Create `src/editor/shell/StudioHeader.tsx` — Outer header container with logo, project name, and menu bar
- [x] Create `src/editor/shell/MainToolbar.tsx` — Action button row (Save, Undo, Redo, AI, Build, Play, Deploy)
- [x] Create `src/editor/menus/FileMenu.tsx` — File > New, Open, Save, Save As, Export, Recent
- [x] Create `src/editor/menus/EditMenu.tsx` — Edit > Undo, Redo, Cut, Copy, Paste, Preferences
- [x] Create `src/editor/menus/ViewMenu.tsx` — View > Zoom In/Out, Toggle Grid, Toggle Guides
- [x] Create `src/editor/menus/WindowMenu.tsx` — Window > Toggle each panel, Workspace presets
- [x] Create `src/editor/menus/HelpMenu.tsx` — Help > Docs, Keyboard Shortcuts, About
- [x] Create `src/editor/styles/menus.css` — Dropdown styling, menu item hover states, keyboard shortcut badges
- [x] Verify: Clicking menu items opens dropdown menus; toolbar buttons have hover states and tooltips

---

### Sub-Phase 1.5: Confluence Whiteboard Canvas (Center Viewport)
**Goal:** Build the infinite dot-grid canvas — the heart of the editor where the user sees their application. This must feel like Confluence Whiteboards: clean, infinite, responsive.

**Checklist:**
- [x] Create `src/editor/canvas/WhiteboardCanvas.tsx` — Infinite canvas with CSS dot-grid pattern background
- [x] Create `src/editor/styles/whiteboard.css` — Dot grid rendering, canvas background, zoom transitions
- [x] Implement pan: Space+Drag or Middle-click drag (translate canvas origin)
- [x] Implement zoom: Ctrl+Scroll with smooth transition (10% – 400%)
- [x] Create `src/editor/canvas/CanvasOverlay.tsx` — Layer for bounding boxes, snap guides, selection rectangles
- [x] Create `src/editor/canvas/FloatingDock.tsx` — Atlassian-style bottom pill toolbar (Select, Pan, Pen, Text, Wire, Shapes, Components, Assets, +)
- [x] Create zoom controls widget: bottom-right floating pill with `+`, `100%`, `−`, fit-to-screen
- [x] Create undo/redo widget: top-left floating canvas action pill (Save, Undo, Redo with hover-reveal)
- [x] Verify: Canvas renders with dot grid; user can pan infinitely and zoom smoothly; floating dock is visible at bottom center (Tested & verified in browser)

---

### Sub-Phase 1.6: Core Panel Shells (Outliner, Details, Content Browser, Console)
**Goal:** Create the MVP panel components as functional shells. They don't need real data yet — they need correct layout, headers, and placeholder content to prove the docking system works.

**Checklist:**
- [x] Create `src/editor/panels/outliner/OutlinerTree.tsx` — Tree view with mock hierarchy (Pages > Home, Components > Button, etc.)
- [x] Create `src/editor/panels/details/DetailsInspector.tsx` — Collapsible sections (Transform, Layout, Appearance, Typography) with mock inputs
- [x] Create `src/editor/panels/content-browser/ContentBrowser.tsx` — Breadcrumb navigation, grid/list toggle, mock asset cards
- [x] Create `src/editor/panels/console/OutputConsole.tsx` — Log stream with filter tabs (All, Errors, Warnings), mock entries
- [x] Create `src/editor/panels/settings/ProjectSettings.tsx` — Settings form with General, Environment, Theme sections
- [x] Create `src/editor/panels/blueprint/BlueprintCanvas.tsx` — Empty infinite canvas placeholder (will be powered by Wasm in Phase 2)
- [x] Create `src/editor/styles/panels.css` — Panel chrome, section headers, collapsible section animations
- [x] Create `src/editor/styles/forms.css` — Input fields, sliders, toggles, dropdowns, color pickers
- [x] Register all panels in the DockManager so they appear in Window menu
- [x] Verify: All 6 panels render inside dock zones; panels can be switched via tabs; Window menu toggles panels (Tested & verified in browser)

---

### Sub-Phase 1.7: Unreal Engine-Style File & Asset Details System
**Goal:** Implement the deep, Unreal Engine-inspired Asset & File Detail Inspector system. When any file, asset, or component is opened or selected:
1. The center displays an isolated viewport preview of the character/element/widget alongside the graph/canvas.
2. The left panel shows the component tree, attachments, variables, and function definitions ("My Blueprint" architecture).
3. The right Details panel provides a rich, categorized property inspector with variable types, default values, slot attachments, and an event-to-function binding section with quick-action `[ + ]` buttons to wire UI events directly to Blueprint logic.

**Specification Reference:** `DOCS/UNREAL_FILE_DETAILS_SYSTEM.md`

**Checklist:**
- [x] Implement data models for `ComponentAttachment`, `ComponentVariable`, and `ComponentEventBinding` in `src/core/types/details.ts`
- [x] Upgrade `src/editor/panels/details/AssetDetailsInspector.tsx` with UE-style categorized property sections:
  - Identity & File metadata (type badge, path, parent class)
  - Slot & Attachments (parent container, slot type, alignment, anchors, sockets)
  - Appearance & Styling (colors, gradients, borders, shadows, blur)
  - Typography & Layout (font, size, weight, line height, flex/grid alignment)
  - Variables & Props (typed variables with yellow reset-to-default `↺` arrows and instance-editable eye icons)
  - Events & Function Dispatchers (event list with `[ + ]` attach button, function pills, and quick-jump links)
- [x] Implement the **Events & Function Attachment Section**:
  - List available component events (`onClick`, `onHover`, `onBlur`, `onChange`, `onSubmit`, `onKeyDown`)
  - Render UE-style `[ + ]` button to generate or attach to a Blueprint function / event node
  - Show bound function pills with quick-jump link to the respective Logic Blueprint graph and detach button
- [x] Implement the **Component Attachment & Slot Hierarchy** section:
  - Display attach parent, slot type (Flex, Grid, Absolute, Canvas), alignment, and z-index ordering
- [x] Implement the **Variables & State Inspector**:
  - Variable type badge (String, Number, Boolean, Object, Array, Function)
  - Default value editor, category grouping, instance editable toggle, and yellow "Reset to Default" indicator
- [x] Implement the **Isolated Asset Viewport** in the center stage (`AssetFileEditor.tsx`):
  - When inspecting an asset/component file, show the dedicated isolated preview with interactive state handles (Default, Hover, Active, Disabled, Loading) and responsive boundary pills
- [x] Verify: Opening any file displays its isolated element preview, rich variable categories, attachment metadata, and working event-to-function attachment buttons (Tested & verified in browser).

---

### Phase 1 Completion & Validation Summary
> **Milestone Status:** ✅ **Phase 1 Complete (Sub-Phases 1.1 through 1.7 verified)**.  
> All foundational IDE shell components, design tokens, splitters, dock zones, Confluence canvas, and the deep Unreal Engine Details Inspector with element-type specific sections (Phases 2.1 – 2.6 in `DOCS/ROADMAP_2.md`) are built, styled, and verified.

---

## 4. Phase 2: Inside-Out Database Logic, Connection & Animation Engine (Current Target)

**Goal:** Build from the innermost data contracts outward. First define the entire logic of the database, its categorized property taxonomy, and the archetype-to-property access compatibility matrix. Next build the central Diagnostic Bus and connection pipeline to trap illegal bindings in the Output Log. Then implement the animation sample connection system (evaluating track legality per element and trapping incompatible assignments). Finally, wrap these validated engines with reactive state stores and visual UI controls.

**Architectural Law (CONVENTIONS.md §7):** Build from the inside out. Never construct visual controls before the data schemas, property access rules, and diagnostic interceptors exist.

---

### Sub-Phase 2.1: Innermost Database Core Logic, Field Categorization & Element Property Access Matrix (Top Priority) ✅ COMPLETE
**Goal:** Define the pure TypeScript database schema contracts, categorize database properties into functional groups, and establish the formal compatibility matrix specifying exactly which category of element properties can access which database properties.
- [x] Create `src/core/types/database.ts` — Relational collection schemas, Prisma-aligned types (`String`, `Int`, `Float`, `Boolean`, `DateTime`, `JSON`, `Enum`, `Relation`), and cardinality rules (1:1, 1:N, N:M).
- [x] Define **Database Property Categories**:
  - **Category 1 (Textual / Scalar)**: `String`, `Enum` (titles, descriptions, badges, statuses)
  - **Category 2 (Numeric)**: `Int`, `Float` (prices, counts, metrics, percentages)
  - **Category 3 (Boolean / Flag)**: `Boolean` (isPublished, inStock, hasDiscount, isActive)
  - **Category 4 (Temporal / Timestamp)**: `DateTime` (createdAt, updatedAt, eventDate)
  - **Category 5 (Media / Asset URL)**: `String` with URL/CDN format (image src, avatar, document file)
  - **Category 6 (Structured / Document)**: `JSON` (flexible metadata, settings blobs)
  - **Category 7 (Relational / Collections)**: `Relation` (1:1 user profile, 1:N order items, N:M tags)
- [x] Define **Element Property Categories & Access Matrix (`ArchetypePropertyBindingMatrix`)**:
  - **Text Archetype Props** (`textContent`): Can access Textual, Numeric (formatted), Temporal (formatted), Enum. Trapped if assigned Relational, Structured JSON, or Media.
  - **Image Archetype Props** (`src`, `alt`): `src` can only access Media/Asset URL or Textual URL; `alt` can access Textual. Trapped if assigned Numeric, Boolean, Temporal, or Relational.
  - **Button Archetype Props** (`label`, `disabled`): `label` can access Textual or Numeric; `disabled` can access Boolean. Trapped if assigned Relational or Structured JSON.
  - **Toggle / Checkbox Props** (`checked`, `disabled`): `checked` can only access Boolean. Trapped if assigned Textual, Numeric, or Relational.
  - **Container / List Repeater Props** (`itemsSource`): Can only access Relational (1:N, N:M) or Array of Entities. Trapped if assigned Single Scalar Text, Boolean, or Date.
  - **Input Archetype Props** (`value`, `placeholder`): `value` can access Textual or Numeric; `placeholder` can access Textual. Trapped if assigned Relational.
- [x] Create `src/core/engine/DatabaseValidator.ts` — Detects orphaned foreign keys, circular relations, or missing primary keys; dispatches `[DB_SCHEMA_ERR]` to Output Log.
- [x] Verify: Unit test verifying that assigning a Relational Array to a Button label is trapped, while assigning a String title succeeds (`npm test` passes 5/5 tests).

---

### Sub-Phase 2.2: Universal Connection Engine & Central Diagnostic Event Bus ✅ COMPLETE
**Goal:** Build the central pub/sub diagnostic bus that catches all incompatible connections across the engine and dispatches structured, actionable error entries to Panel 07 (Output Log).
- [x] Create `src/core/types/diagnostics.ts` — Structured diagnostic error payloads, severity levels (`Error`, `Warning`, `Info`), and typed channels:
  - `[DB_SCHEMA_ERR]`: Schema inconsistencies, foreign key cycles, missing PKs.
  - `[BIND_ERR]`: Incompatible database/state bindings (e.g. Array to Boolean, Object to Text).
  - `[ANIM_COMPAT]`: Incompatible animation sample tracks for element archetype (e.g. `letterSpacing` on `image`).
  - `[PROP_ERR]`: Invalid property ranges, syntax, or unit errors.
- [x] Create `src/core/engine/DiagnosticBus.ts` — Central pub/sub diagnostic bus routing engine violations directly to Panel 07 (Output Log) with entity jump links.
- [x] Create `src/core/types/data-binding.ts` — Data binding contracts (`BindingSource`, `DataBindingDescriptor`, `TypeCompatibilityRules`).
- [x] Create `src/core/engine/DataBindingValidator.ts` & `ConnectionPipeline.ts` — Evaluates source-to-target compatibility using `ArchetypePropertyBindingMatrix`. Traps illegal bindings ➔ logs `[BIND_ERR]` to Output Log and provides safe fallback value to prevent UI crashing.
- [x] Verify: Emitting mock `[DB_SCHEMA_ERR]`, `[BIND_ERR]`, and live `test-pipeline` events prints structured entries in the Output Log with clickable entity navigation (`npm test` passes 10/10 tests, live browser verified).

---

### Sub-Phase 2.3: Motion & Animation Connection Engine (Animation Samples & Archetype Applicability) ✅ COMPLETE
**Goal:** Establish the animation sample connection pipeline. Animation samples contain property tracks that connect to element properties. If an animation sample is connected to an element where any track is not applicable, the engine intercepts the violation, logs an error to the Output Log, and safely skips the track.
- [x] Create `src/core/types/animations.ts` — Animation track identifiers (`opacity`, `translateY`, `translateX`, `scale`, `filterBlur`, `letterSpacing`, `backgroundColor`, `borderRadius`), keyframe points, cubic-bezier handles, and `ArchetypeAnimationCompatibility` matrix.
- [x] Implement **Animation Sample Connection Model**:
  - An **Animation Sample** defines reusable motion curves across property tracks.
  - When an animation sample connects to an element, the engine evaluates track compatibility against the target element archetype.
  - Applicable tracks apply to the element's CSS properties.
  - Incompatible tracks (e.g. sample contains `letterSpacing` or `color` track, but element is `image` or `container`) are trapped by the engine, generate an error in the Output Log (`[ANIM_COMPAT]`), and are excluded without corrupting styles.
- [x] Create `src/core/engine/AnimationValidator.ts` — Evaluates track-to-archetype legality; traps invalid assignments and routes diagnostics to `DiagnosticBus`.
- [x] Create `src/core/engine/GSAPTimelineCompiler.ts` — Compiles validated animation tracks into GSAP timelines and CSS `@keyframes` for smooth 60/120 FPS execution.
- [x] Verify: Attaching an animation sample with typography tracks to an Image element logs `[ANIM_COMPAT]` in the Output Log and skips the track; attaching to a Text element applies cleanly (`npm test` passes 13/13 tests, live browser verified).

---

### Sub-Phase 2.4: State Management & Reactive Data Binding Engine ✅ COMPLETE
**Goal:** Build the reactive state management layer connecting database records and reactive state atoms directly to element properties.
- [x] Create `src/core/store/useProjectStore.ts` — Single source of truth for the project AST (pages, elements, animations, database schemas, active bindings).
- [x] Create `src/core/store/useSelectionStore.ts` — Selected element/entity IDs with multi-selection support.
- [x] Create `src/core/store/useHistoryStore.ts` — Transactional undo/redo stack with descriptive action labels.
- [x] Create `src/core/events/EventBus.ts` — Cross-panel pub/sub messaging.
- [x] Create Panel 13: `src/editor/panels/state/StateMatrixViewer.tsx` — State variable manager (Global, Page, Component scopes).
- [x] Verify: Updating a bound state variable or database record propagates live updates to connected element properties; Undo reverts cleanly (`npm test` passes 18/18 tests, live browser verified with toggle controls).

---

### Sub-Phase 2.5: Visual UI Panels, Details Inspector Controls & Dedicated Database Studio ✅ COMPLETE
**Goal:** Build the visual controls, inspector panels, and dedicated Database Studio as the outer UI wrapper over the validated core engines.
- [x] Details Inspector Data Binding Section: `src/editor/panels/details/sections/DataBindingEditor.tsx` & `src/editor/panels/details/controls/StateVariablePicker.tsx` — Surfaces bindable properties and compatible database fields based on the access matrix.
- [x] Details Inspector Animation Section: `src/editor/panels/details/sections/AnimationEditor.tsx`, `KeyframeTimeline.tsx`, `BezierCurveModal.tsx` — Preset cards, keyframe scrubbing, and cubic-bezier curve modal.
- [x] Viewport Top Bar Cleanup: Removed the center tab bar clutter from the Viewport; placed a sleek, compact Project Settings button on the right side of the Viewport toolbar.
- [x] Dedicated Database Studio Page (`/database` & `src/editor/panels/database/DatabaseStudio.tsx`):
  - Top header `DataBase` button in `StudioHeader.tsx` between Window and Help.
  - 2-Section Left Explorer (`DatabaseLeftExplorer.tsx`): Search + Indented Database Tree (`Database` ➔ `Tables` ➔ `Fields`) on top; Relational Hierarchy & Foreign Key Dependency Tree on bottom.
  - Center Workspace (`DatabaseCenterStage.tsx`): Engine selector (PostgreSQL 16, SQLite 3, MySQL 8, MongoDB), Triple View Switcher (`ER Canvas`, `Mock Data Grid`, `SQL DDL / Prisma Migration`), and interactive draggable entity cards.
  - Right Details Panel (`DatabaseDetailsPanel.tsx`): Deep table property inspector (display name, columns manager, inline "+ Add Column" creator, seed records, danger zone) and field property inspector (Prisma types, PK/Nullable/Unique flags, Foreign Key relation targets, cascade rules, check validation, and indexing).
  - Bottom Status Bar (`DatabaseStatusBar.tsx`): Live engine active status, schema integrity validation badge (`Schema Valid • 0 Violations`), tables/records count, and Output Log console toggle.
- [x] Verify: Full inside-out workflow verified with 25 passing unit tests (`npm test` 25/25 pass in 428ms) and comprehensive browser subagent recording verifying Viewport cleanup, top DataBase button, Database Studio 3-column layout, ER canvas, mock grid, and SQL DDL.

---

## 5. Phase 3: Logic Blueprint Engine & Visual Scripting System ✅ COMPLETE

**Goal:** Visual node-and-wire scripting where logic graphs connect directly to element properties and database actions.

---

### Sub-Phase 3.1: Node Type Registry & Core Definitions ✅ COMPLETE
- [x] Create `src/core/types/node-registry.ts` — Built-in node definitions with pin schemas (Events, Flow Control, Variables, Navigation, Math, Utility, Database, API).
- [x] Define Event nodes (`onClick`, `onPageLoad`, `onSubmit`, `onHover`, `onTimer`).
- [x] Define Action nodes (`database/query`, `database/insert`, `variables/set`, `variables/get`, `api/request`, `navigation/push`, `flow/branch`, `utility/printString`).
- [x] Verify: Node registry is queryable by category; all pins have strict data types (`exec`, `boolean`, `number`, `string`, `object`, `array`, `any`) with color taxonomy mapping.

### Sub-Phase 3.2: Type Checker & Pin Wire Validation ✅ COMPLETE
- [x] Create `src/core/ast/TypeChecker.ts` — Pin compatibility evaluator with direction enforcement (Output ➔ Input only) and self-loop rejection.
- [x] Enforce wire type rules (String ➔ String ✓, Number/Boolean widening ➔ String ✓, Exec isolation ✓, Array ➔ String ✗).
- [x] Reject illegal connections with red feedback and dispatch `[PIN_TYPE_MISMATCH]` to Output Log via `DiagnosticBus`.
- [x] Verify: Incompatible pins refuse attachment and log structured diagnostics.

### Sub-Phase 3.3: DAG Sorter & Graph AST Manager ✅ COMPLETE
- [x] Create `src/core/ast/DAGSorter.ts` — Topological sorting via Kahn's algorithm for layered execution order.
- [x] Detect circular execution cycles via 3-color DFS cycle detector and emit `[GRAPH_CYCLE_ERR]`.
- [x] Create `src/core/ast/ASTManager.ts` — Graph CRUD operations, wire connections, literal pin values, and graph validation.
- [x] Verify: Cycles are trapped; acyclic graphs sort accurately into execution batches.

### Sub-Phase 3.4: My Blueprint Panel & Variable System ✅ COMPLETE
- [x] Create Panel 17: `MyBlueprintPanel.tsx` — Unreal-style hierarchy explorer with Graphs, Functions, Variables, and Event Hooks.
- [x] Implement variable system: add/update/remove variables, with one-click `GET` and `SET` node generation onto the active canvas.
- [x] Verify: Interacting with variables creates typed accessor nodes on canvas and updates store state seamlessly.

### Sub-Phase 3.5: Blueprint Validation & Serialization ✅ COMPLETE
- [x] Create Panel 22: `ValidationPanel.tsx` — Real-time issue list with click-to-navigate links, compiler status badge, and AST verification.
- [x] Implement `.bp.json` save, export, and load serialization (`serializeGraphToJson` / `deserializeJsonToGraph`).
- [x] Create interactive `BlueprintCanvas.tsx` — Renders live AST nodes, dynamic cubic Bezier curves, interactive wire dragging, and contextual Tab search palette.
- [x] Verify: All 38/38 unit tests pass (`npm test`), full TypeScript compilation clean (`npx tsc --noEmit`), and comprehensive browser subagent verification confirms live node rendering, wire dragging, compilation, and variable node spawning.

---

## 6. Phase 4: C++ WebAssembly Physics Kernel & Blueprint Canvas

**Goal:** 120 FPS high-performance curved wire rendering powered by C++ WebAssembly physics.

---

### Sub-Phase 4.1: C++ Spline Mathematics Module ✅ COMPLETE
- [x] Implement `SplineSolver.hpp/.cpp` — Cubic Hermite interpolation, Bezier control point calculation matching Unreal Engine's `FConnectionDrawingPolicy` (`tension = 0.5f`, `minTangent = 45.0f`, reverse-loop routing).
- [x] Implement arc-length parameterization for uniform curve spacing: 64-step cumulative chord LUT with $O(\log N)$ binary search inversion (`getTForDistance`, `getTForNormalizedArcLength`, `evaluateUniformAt`, `sampleUniformPoints`).
- [x] Write unit tests (`SplineSolver.test.cpp` and `SplineSolver.test.ts`).
- [x] Verify: All C++ unit tests compiled with Apple `clang++ -std=c++17` pass 100% (forward splines, minTangent clamping, reverse loops, monotonic LUT, equidistant sampling); all 47/47 TypeScript tests pass cleanly (`npm test`).

### Sub-Phase 4.2: Verlet Cable Physics & Spatial Index
- [ ] Implement `CablePhysics.hpp/.cpp` — Verlet integration for wire drape and spring tension.
- [ ] Implement `SpatialIndex.hpp/.cpp` — Quadtree for fast node hit-testing.
- [ ] Write unit tests.

### Sub-Phase 4.3: WebAssembly Build Pipeline
- [ ] Configure Emscripten build (`CMakeLists.txt` + `Makefile`).
- [ ] Implement `WasmBindings.cpp` exporting C++ methods to JavaScript.
- [ ] Build `.wasm` + `.js` artifacts into `wasm/dist/`.
- [ ] Create TypeScript wrapper `src/core/wasm/WasmBridge.ts`.

### Sub-Phase 4.4: 120 FPS Canvas Wire Renderer
- [ ] Create `src/editor/canvas/WasmCableCanvas.tsx` — Canvas overlay calling Wasm for spline coords.
- [ ] Render Bezier wires using color taxonomy from `UI.md §2.2`.
- [ ] Implement wire hover highlight and execution pulse streams.

### Sub-Phase 4.5: Interactive Node Canvas
- [ ] Enhance `BlueprintCanvas.tsx` with pan/zoom and node placement.
- [ ] Implement `NodeCard.tsx`, `PinHandle.tsx`, `CommentBox.tsx`, `RerouteNode.tsx`.
- [ ] Implement `ActionPaletteModal.tsx` (Tab / Right-click node search catalog).
- [ ] Verify: Dragging wires displays real-time cable sag and spring tension at 120 FPS.

---

## 7. Phase 5: Play Mode Interactive Runtime & Execution Trace

**Goal:** Zero-build instant interactive simulation with live execution trace and animated wire pulses.

---

### Sub-Phase 5.1: In-Memory Runtime Sandbox Host
- [ ] Create `SandboxHost.tsx` — Isolated iframe runtime boundary.
- [ ] Implement DOM reconciliation from active project AST.
- [ ] Trap runtime exceptions and route them to Panel 07 (Output Log).

### Sub-Phase 5.2: Mock Database & Service Worker API Interceptor
- [ ] Create `MockDatabase.ts` — In-memory IndexedDB / SQLite store.
- [ ] Create `MockApiServer.ts` — Service Worker intercepting fetch calls.
- [ ] Seed test data and verify CRUD operations in Play Mode.

### Sub-Phase 5.3: Visual Execution Tracer & Wire Pulse Telemetry
- [ ] Create `ExecutionTracer.ts` — Captures node-by-node execution events.
- [ ] Create Panel 20: `ExecutionTracePanel.tsx` — Step-by-step trace list.
- [ ] Render Wasm wire pulses showing data packets traversing connections in real time.

### Sub-Phase 5.4: AI Co-Pilot Assistant Integration
- [ ] Create Panel 18: `AiPromptBar.tsx` — Conversational assistant drawer.
- [ ] Implement AI AST diagnostic mode suggesting fixes for failing nodes or bindings.
- [ ] Require explicit user approval before applying AI AST diffs.

### Sub-Phase 5.5: Hot Reload & Breakpoint Debugger
- [ ] Hot-swap updated blueprint nodes and element properties without full sandbox restart.
- [ ] Implement breakpoint toggles on nodes to pause execution and inspect pin payloads.

---

## 8. Phase 6: Blueprint Compiler & Production Code Generation

**Goal:** Compile the visual project AST into clean, human-readable Next.js 15, React 19, and Prisma code.

---

### Sub-Phase 6.1: Frontend React 19 / JSX Code Emitters
- [ ] Create `ReactComponentEmitter.ts` — Generates accessible JSX components with TypeScript types.
- [ ] Create `StyleEmitter.ts` — Generates scoped CSS variables and rules from design tokens.
- [ ] Create `GSAPAnimationEmitter.ts` — Generates production GSAP timelines.

### Sub-Phase 6.2: Backend API & Prisma Schema Emitters
- [ ] Create `LogicFlowEmitter.ts` — Generates async TypeScript business logic.
- [ ] Create `ApiRouteEmitter.ts` — Generates Next.js API route handlers.
- [ ] Create `PrismaSchemaEmitter.ts` — Generates `schema.prisma` + SQL migrations.

### Sub-Phase 6.3: Live Code Inspector Panel
- [ ] Create Panel 16: `LiveCodeInspector.tsx` — Split-pane code viewer.
- [ ] Implement bidirectional AST-to-code mapping (click line ➔ highlight element, and vice-versa).

### Sub-Phase 6.4: Standalone Git Project Exporter
- [ ] Create `GitExporter.ts` — Packages compiled files into a standard Next.js repository.
- [ ] Verify: Exported repository boots independently with `npm install && npm run dev`.

### Sub-Phase 6.5: Pages & Routing Manager
- [ ] Create Panel 30: `PagesManager.tsx` — Visual sitemap tree and dynamic route configuration.

---

## 9. Phase 7: Cloud Deployment, Operations & Extensions

**Goal:** Production cloud deployment, global search, keyboard commands, and plugin ecosystem.

---

### Sub-Phase 7.1: Build Pipeline Visualizer & Cloud Deploy
- [ ] Create Panel 19: `DeploymentDashboard.tsx` — Build pipeline progress tracker.
- [ ] Support deployment targets: Vercel, Docker, Cloudflare Pages.

### Sub-Phase 7.2: Global Search Engine (Find in Blueprints)
- [ ] Create Panel 25: `GlobalSearchPanel.tsx` — Inverted index search across all entities.

### Sub-Phase 7.3: Keyboard Shortcuts & Command Palette
- [ ] Create `CommandPalette.tsx` (`Ctrl+P`) with fuzzy search.
- [ ] Register global shortcuts (`Ctrl+S`, `Ctrl+Z`, `Ctrl+Shift+F`, `Ctrl+Enter`).

### Sub-Phase 7.4: Plugin Architecture & Extension Points
- [ ] Create Panel 29: `PluginManager.tsx`.
- [ ] Implement sandbox for custom node and element archetype plugins.

### Sub-Phase 7.5: Final Integration Testing & Production Verification
- [ ] Full end-to-end audit from blank canvas to deployed web application.

---

## 10. Post-MVP Phases (Future)

| Phase | Name | Key Deliverables |
|---|---|---|
| **8** | Advanced History | Undo History (P23), Version Snapshots (P24), Reference Viewer (P26) |
| **9** | Collaboration | Real-time multi-user presence, Comments Panel (P15) |
| **10** | Marketplace | Community Marketplace (P28), Template Store |
| **11** | Localization & A11y | Localization Dashboard (P31), WCAG 2.1 Audit (P32) |
| **12** | Mobile Target | React Native / Flutter emitters |

---

## 11. Definition of Done (per Sub-Phase)

A sub-phase is considered **complete** when:
1. All checklist items are checked off
2. The verification test passes
3. No regressions in existing dock zones or inspector sections
4. Full adherence to the **Inside-Out Engine Law** (Core contracts ➔ Engine validator ➔ Output Log diagnostics ➔ UI controls)
5. All styling uses tokens from `tokens.css` without hardcoded values
