# IMPLEMENTATION ROADMAP & MILESTONES

> **⚠️ Full-vision track. Not the active roadmap; see DOCS/Initial/ROADMAP.md.**

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
| **4** | C++ Wasm Kernel & Physics Canvas | 4.1 – 4.5 | 120 FPS curved wire rendering with Verlet spring physics | ✅ COMPLETE |
| **5** | Play Mode Runtime & Execution Trace | 5.1 – 5.7 | Live sandbox preview, wire pulses, AI diagnostics & watch expressions | ✅ COMPLETE |
| **6** | Compiler & Production Code Generation | 6.1 – 6.5 | Exportable Next.js 15 + React 19 + Prisma production code & Pages Manager | ✅ COMPLETE |
| **7** | Operations, Deployment & Extensions | 7.1 – 7.5 | Build pipelines, cloud deploy, plugins, command palette, search & E2E verification | ✅ COMPLETE |

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

### Sub-Phase 4.2: Verlet Cable Physics & Spatial Index — ✅ COMPLETE
- [x] Implement `CablePhysics.hpp/.cpp` — Verlet integration for wire drape and spring tension (`wasm/include/CablePhysics.hpp`, `wasm/src/CablePhysics.cpp`, mirrored in `src/core/wasm/CablePhysics.ts`).
- [x] Implement `SpatialIndex.hpp/.cpp` — Quadtree for fast node hit-testing (`wasm/include/SpatialIndex.hpp`, `wasm/src/SpatialIndex.cpp`, mirrored in `src/core/wasm/SpatialIndex.ts`).
- [x] Write unit tests (`wasm/tests/CablePhysics.test.cpp` and `src/core/wasm/__tests__/CablePhysics.test.ts`).
- [x] Verify: 200 simultaneous wires settle within 300ms of a node drag without visible jitter (settled in 15.6ms in C++ test harness); Quadtree O(log N) hit-test, incremental updates on drag, and range queries verified; all 53/53 TypeScript tests pass cleanly.

### Sub-Phase 4.3: WebAssembly Build Pipeline — ✅ COMPLETE
- [x] Configure Emscripten build (`wasm/CMakeLists.txt` + `wasm/Makefile` targeting `wasm32-unknown-emscripten`, `-O3` / `-O0 -g` profiles).
- [x] Implement `WasmBindings.cpp` exporting C++ methods to JavaScript (`SplineSolver`, `CablePhysics`, `SpatialIndex` via `embind`).
- [x] Build pipeline configured: artifacts output to `wasm/dist/engine.js` + `.wasm` (gitignored), triggered via `npm run build:wasm`.
- [x] Create TypeScript wrapper `src/core/wasm/WasmBridge.ts` with lazy-loading Zustand store and zero `any` casts.
- [x] Write unit tests (`src/core/wasm/__tests__/WasmBridge.test.ts`).
- [x] Verify: Engine loads in <150ms on cold cache (measured at 1.88ms); all 58/58 TypeScript tests pass cleanly.

### Sub-Phase 4.4: 120 FPS Canvas Wire Renderer — ✅ COMPLETE
- [x] Create `src/editor/canvas/WasmCableCanvas.tsx` — Canvas2D overlay calling Wasm / SplineSolver for spline coords.
- [x] Render Bezier wires using color taxonomy from `UI.md §2.2` (`exec` white, data types color-coded).
- [x] Implement wire hover highlight and telemetry execution pulse streams.
- [x] Write unit tests & benchmark (`src/editor/canvas/__tests__/WasmCableCanvas.test.ts`).
- [x] Verify: 120 FPS sustained with 100 visible wires (benchmark: ~0.28ms per frame, well under 8.33ms budget); integrated into `BlueprintCanvas.tsx`.

### Sub-Phase 4.5: Interactive Node Canvas — ✅ COMPLETE
- [x] Enhance `BlueprintCanvas.tsx` with pan/zoom and node placement.
- [x] Implement `NodeCard.tsx`, `PinHandle.tsx`, `CommentBox.tsx`, `RerouteNode.tsx`.
- [x] Implement `ActionPaletteModal.tsx` (Tab / Right-click node search catalog).
- [x] Verify: Dragging wires displays real-time cable sag and spring tension at 120 FPS; comment boxes, reroute knots, and action palette verified visually and with 62 unit tests.

---

## 7. Phase 5: Play Mode Interactive Runtime & Execution Trace

**Goal:** Zero-build instant interactive simulation with live execution trace and animated wire pulses.

---

### Sub-Phase 5.1: In-Memory Runtime Sandbox Host
- [x] Create `SandboxHost.tsx` — Isolated iframe runtime boundary.
- [x] Implement DOM reconciliation from active project AST.
- [x] Trap runtime exceptions and route them to Panel 07 (Output Log).

### Sub-Phase 5.2: Mock Database & Service Worker API Interceptor ✅ COMPLETE
- [x] Create `MockDatabase.ts` — In-memory IndexedDB / SQLite store (`src/runtime/MockDatabase.ts`) with typed validation, foreign key constraints, and reactive subscriptions.
- [x] Create `MockApiServer.ts` — Dual-layer interceptor (`src/runtime/MockApiServer.ts` + `public/mock-api-worker.js`) intercepting `/api/*` fetch calls with configurable latency and error simulation.
- [x] Seed test data and verify CRUD operations in Play Mode with interactive HUD drawer in `SandboxHost.tsx` and 80 passing unit tests.

### Sub-Phase 5.3: Visual Execution Tracer & Wire Pulse Telemetry ✅ COMPLETE
- [x] Create `ExecutionTracer.ts` — Captures node-by-node execution events (`src/runtime/ExecutionTracer.ts`) with input/output pin payload snapshots, 50-run ring buffer with `TRACE_OVERFLOW_WARN`, and 120 FPS Wasm wire pulse telemetry.
- [x] Create Panel 20: `ExecutionTracePanel.tsx` — Step-by-step trace list with timeline, pin payload snapshots table, playback scrubber (Play, Pause, Step Next, Step Prev), "⚡ Run Test Trace", and status filtering.
- [x] Render Wasm wire pulses showing data packets traversing connections in real time in `WasmCableCanvas.tsx` / `BlueprintCanvas.tsx` synchronized with execution step latency.

### Sub-Phase 5.4: AI Co-Pilot Assistant Integration ✅ COMPLETE
- [x] Create Panel 18: `AiPromptBar.tsx` — Conversational assistant drawer with grounded reasoning, chat history, prompt chips, and dock/floating layouts.
- [x] Implement AI AST diagnostic mode (`DiagnosticSuggester.ts`) analyzing live `DiagnosticBus` events, trace steps, and project AST to propose verified patches.
- [x] Require explicit user approval before applying AI AST diffs ("No Silent AI Writes Law") via `GraphDiffModal` with live patch preview and rollback on reject.

### Sub-Phase 5.5: Hot Reload & Breakpoint Debugger ✅ COMPLETE
- [x] Create `debugger.ts` type contracts (`src/core/types/debugger.ts`) defining `Breakpoint`, `BreakpointHitEvent`, `DebuggerState`, `HotReloadPatch`, `HotReloadResult`, and add channels `BREAKPOINT_HIT` and `HOT_RELOAD_INFO` to `diagnostics.ts`.
- [x] Create `BreakpointManager.ts` (`src/runtime/BreakpointManager.ts`) — State machine (`idle` ➔ `running` ➔ `paused` ➔ `stepping`), pause gate with async unblocking, conditional breakpoint expression evaluator (`inputs.amount > 100`), hit counters, and `[BREAKPOINT_HIT]` diagnostics.
- [x] Create `HotReloadEngine.ts` (`src/runtime/HotReloadEngine.ts`) — Live patch generator and applier for properties and state variables via `SANDBOX_HOT_PATCH` with snapshot rollback safety and `[HOT_RELOAD_INFO]` telemetry.
- [x] Extend `ExecutionTracer.simulateGraphExecution` with breakpoint-aware pausing and fix Branch Traversal Bug (evaluating boolean condition to traverse correct `trueExec` vs `falseExec` wire).
- [x] Enhance Panel 20 `ExecutionTracePanel.tsx` with Debugger Toolbar (Resume, Step Over, Stop, live status pill, breakpoint indicators, and frozen pin inspector).
- [x] Enhance `BlueprintCanvas.tsx` & `NodeCard.tsx` with clickable breakpoint gutter circles, conditional breakpoint tooltips, and pulsing amber paused-glow state.
- [x] Add in-sandbox `SANDBOX_HOT_PATCH` DOM listener and HUD status indicator in `SandboxHost.tsx`.
- [x] 102 passing unit tests across 15 suites in `npm test` with 9 dedicated Sub-Phase 5.5 tests in `BreakpointDebugger.test.ts`.

### Sub-Phase 5.6: Performance Profiler & Flame Graph (Completed)
- [x] Aggregate `TraceStep.durationMs` into per-node execution metrics (`NodePerformanceMetric`) and flame graph waterfall bars (`FlameGraphBar`).
- [x] Implement `PerformanceProfiler` state machine (`src/runtime/PerformanceProfiler.ts`) with threshold configuration (default 50ms) and `[PERF_WARN]` DiagnosticBus event emission.
- [x] Render interactive Flame Graph / Waterfall view in Panel 20 (`ExecutionTracePanel.tsx`) with KPI cards, time axis, proportional bars, hover details, and bottleneck ranking table.
- [x] Display performance bottleneck badges (`🔥 <ms>`) on `BlueprintCanvas.tsx` / `NodeCard.tsx` when a node exceeds the threshold.
- [x] Integrate with `ExecutionTracer.completeRun()` to automatically analyze runs and notify subscribers.
- [x] 109 passing unit tests across 16 suites in `npm test` with 7 dedicated Sub-Phase 5.6 tests in `PerformanceProfiler.test.ts`.

### Sub-Phase 5.7: Watch Expressions & Live Variable Inspector
- [x] Implement pure TypeScript Watch contracts (`WatchExpression`, `WatchEvaluationContext`, `WatchEvaluationResult`, `WatchValueType`, `WatchListener`) in `src/core/types/watch.ts`.
- [x] Implement `WatchExpressionManager` singleton (`src/runtime/WatchExpressionManager.ts`) with CRUD, safe sandboxed execution (`inputs`, `outputs`, `state`, `variables`, `step`, `run`), mutation detection across steps, `[WATCH_MUTATION]` DiagnosticBus events, and `localStorage` persistence.
- [x] Add Watch Expressions sub-panel in Panel 20 (`ExecutionTracePanel.tsx`) with tab switching (`[ 🔌 Pin Payloads ]` vs `[ 👁️ Watch Expressions ]`), quick expression add form, suggestion chips, live evaluation cards with type pills, and inline `+ Watch` button on pin snapshot table rows.
- [x] Implement CSS styles and `@keyframes watch-mutation-glow` amber pulsing animations in `src/editor/styles/panels.css`.
- [x] 116 passing unit tests across 17 suites in `npm test` with 7 dedicated Sub-Phase 5.7 tests in `WatchExpressionManager.test.ts`.

---

## 8. Phase 6: Blueprint Compiler & Production Code Generation

**Goal:** Compile the visual project AST into clean, human-readable Next.js 15, React 19, and Prisma code.

---

### Sub-Phase 6.1: Frontend React 19 / JSX Code Emitters
- [x] Create `ReactComponentEmitter.ts` (`src/compiler/emitters/ReactComponentEmitter.ts`) — Generates accessible Next.js 15 & React 19 JSX components with full TypeScript prop interfaces, semantic HTML tags, WCAG accessibility attributes (`alt`, `aria-label`, `aria-required`), and App Router `page.tsx` generation.
- [x] Create `StyleEmitter.ts` (`src/compiler/emitters/StyleEmitter.ts`) — Generates scoped CSS rules, design tokens under `:root { --... }`, pseudo-classes (`:hover`, `:active`, `:disabled`), and responsive media query overrides.
- [x] Create `GSAPAnimationEmitter.ts` (`src/compiler/emitters/GSAPAnimationEmitter.ts`) — Compiles visual keyframe tracks into production GSAP 3 timelines with lifecycle hooks (`useEffect` / `useGSAP`), context scoping, and cleanups.
- [x] 135 passing unit tests across 21 suites in `npm test` with 15 dedicated Sub-Phase 6.1 tests across `ReactComponentEmitter.test.ts`, `StyleEmitter.test.ts`, and `GSAPAnimationEmitter.test.ts`.

### Sub-Phase 6.2: Backend API & Prisma Schema Emitters
- [x] Create `LogicFlowEmitter.ts` (`src/compiler/emitters/LogicFlowEmitter.ts`) — Compiles visual Blueprint DAGs into async TypeScript business logic functions with branch control flow (`if/else`), math expressions, string operations, and async Prisma database & fetch calls.
- [x] Create `ApiRouteEmitter.ts` (`src/compiler/emitters/ApiRouteEmitter.ts`) — Generates production Next.js 15 App Router route handlers (`app/api/.../route.ts`) supporting collection-level CRUD (GET list with limit/skip, POST create) and item-level (GET, PUT, DELETE by ID), plus custom Blueprint endpoints.
- [x] Create `PrismaSchemaEmitter.ts` (`src/compiler/emitters/PrismaSchemaEmitter.ts`) — Compiles visual database schemas (`CollectionSchema`) into standard `schema.prisma` definitions with model relations (`@relation` with cascade delete rules), enums, indexes, and raw SQL DDL migration files (`migration.sql`).
- [x] 143 passing unit tests across 24 suites in `npm test` with 8 dedicated Sub-Phase 6.2 tests across `LogicFlowEmitter.test.ts`, `ApiRouteEmitter.test.ts`, and `PrismaSchemaEmitter.test.ts`.

### Sub-Phase 6.3: Live Code Inspector Panel
- [x] Create Panel 16: `LiveCodeInspector.tsx` (`src/editor/panels/code-view/LiveCodeInspector.tsx`) — Read-only split-pane code viewer compiling visual project AST into Next.js 15, React 19, scoped CSS, Prisma, and GSAP code with file categories, search, copy, and download actions.
- [x] Implement bidirectional AST-to-code mapping: selecting an element in the canvas/outliner highlights matching code lines in the inspector; clicking code lines selects corresponding element in `useSelectionStore`.
- [x] Integrate Panel 16 into `EditorShell.tsx` center docking, `WindowMenu.tsx`, and global shortcut `Ctrl+Shift+G` / `Cmd+Shift+G` with `[CODEGEN_INTEGRITY_ERR]` diagnostic support.
- [x] 146 passing unit tests across 25 suites in `npm test` with 3 dedicated Sub-Phase 6.3 tests in `LiveCodeInspector.test.ts`.

### Sub-Phase 6.4: Standalone Git Project Exporter
- [x] Create `ZipPacker.ts` (`src/compiler/export/ZipPacker.ts`) — Zero-dependency pure TypeScript PKZIP format encoder with IEEE 802.3 CRC-32 checksum calculation, local file headers, central directory records, and browser/Node.js compatibility.
- [x] Create `GitExporter.ts` (`src/compiler/export/GitExporter.ts`) — Packages visual project AST into a production-grade, independently bootable Next.js 15 App Router repository with `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `.gitignore`, `.env.example`, `app/layout.tsx`, `app/globals.css`, `lib/prisma.ts`, `.github/workflows/ci.yml`, and comprehensive `README.md`.
- [x] Integrate "Export Repo (.zip)" action into Panel 16: `LiveCodeInspector.tsx` toolbar with `FolderArchive` icon, ZIP downloading, and diagnostic error trapping.
- [x] 154 passing unit tests across 29 suites in `npm test` with 8 dedicated Sub-Phase 6.4 tests in `GitExporter.test.ts`.

### Sub-Phase 6.5: Pages & Routing Manager
- [x] Create pure TypeScript routing types (`RouteParameter`, `RouteGuard`, `RedirectRule`, `extractRouteParameters`, `normalizeRouteSlug`) in `src/core/types/routing.ts` and add `ROUTE_COLLISION` & `MISSING_LAYOUT_ERR` channels to `DiagnosticChannel`.
- [x] Extend `PageDefinition` and implement page & route management store actions in `src/core/store/useProjectStore.ts` (`setActivePage`, `addPage`, `updatePage`, `deletePage`, `duplicatePage`, `detectRouteCollisions`, `addRedirectRule`, `updateRedirectRule`, `deleteRedirectRule`).
- [x] Create Panel 30: `PagesManager.tsx`, `RouteCard.tsx`, and `NavigationFlowDiagram.tsx` (`src/editor/panels/pages-manager/`) featuring tabbed visual route tree, interactive visual sitemap hierarchy diagram, redirect rules editor, route guard configuration (public/auth/admin), and slide-out Route Settings drawer.
- [x] Integrate Panel 30 into `EditorShell.tsx` center/full-page dock, `WindowMenu.tsx`, and global shortcut `Ctrl+Shift+P` / `Cmd+Shift+P`.
- [x] 163 passing unit tests across 33 suites in `npm test` with 9 dedicated Sub-Phase 6.5 tests in `PagesManager.test.ts`.

---

## 9. Phase 7: Cloud Deployment, Operations & Extensions

**Goal:** Production cloud deployment, global search, keyboard commands, and plugin ecosystem.

---

### Sub-Phase 7.1: Build Pipeline Visualizer & Cloud Deploy
- [x] Create Panel 19: `DeploymentDashboard.tsx` — Build pipeline progress tracker (6-stage visual pipeline: AST & Schemas -> Blueprints & Routes -> Next.js 15 App Router Bundle -> Prisma Migrations -> Edge CDN -> Health Verification & DNS).
- [x] Support deployment targets: Vercel, Docker OCI, Cloudflare Pages, AWS ECS, Self-Hosted.
- [x] Implement real-time terminal build log streaming with auto-scroll and filter.
- [x] Build Custom Domain Manager (`DomainManager.tsx`) with DNS records table (A, CNAME, TXT) and SSL status indicator.
- [x] Implement Deployment History with 1-Click Rollback (`DeploymentHistory.tsx`) via `DeploymentEngine.rollback()`.
- [x] Register `Ctrl+Shift+D` / `Cmd+Shift+D` shortcut and WindowMenu entry for instant docking.
- [x] 173 passing unit tests across 38 suites in `npm test` with 10 dedicated Sub-Phase 7.1 tests in `DeploymentDashboard.test.ts`.

### Sub-Phase 7.2: Global Search Engine (Find in Blueprints)
- [x] Create Panel 25: `GlobalSearchPanel.tsx` — Inverted index search across all entities (Blueprints, Visual Elements, Pages, Database, Variables, APIs).
- [x] Implement Inverted Index Engine (`GlobalSearchEngine.ts`) with camelCase/snake_case tokenization and ranked fuzzy matching scores.
- [x] Category filters: `All`, `Blueprints`, `Elements`, `Pages`, `Database`, `Variables`, `API`.
- [x] Match controls: Case-Sensitive (`Aa`) and Exact Word (`[W]`) matching flags.
- [x] Deep jump-to-entity navigation: Automatically switches active page, selects canvas element, opens Blueprint graph, and focuses nodes.
- [x] Dual-mode presentation: Floating Command Palette overlay modal (`Ctrl+Shift+F`) and dockable full-page studio panel.
- [x] Recent searches caching and quick jump tips.
- [x] 185 passing unit tests across 43 suites in `npm test` with 12 dedicated Sub-Phase 7.2 tests in `GlobalSearchEngine.test.ts`.

### Sub-Phase 7.3: Keyboard Shortcuts & Command Palette
- [x] Create `CommandPalette.tsx` (`Ctrl+P` / `Ctrl+K`) with type-ahead fuzzy search across all IDE studio actions.
- [x] Implement central Global Shortcut Registry (`ShortcutRegistry.ts`) with canonical key normalization and conflict detection.
- [x] Enforce conflict prevention: Rejects plugins or custom commands attempting to hijack already-bound shortcuts with clear conflict diagnostic payloads.
- [x] Register canonical studio shortcuts (`Ctrl+S`, `Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+Shift+D`, `Ctrl+Shift+F`, `Ctrl+Shift+P`, `Ctrl+Shift+G`, `Ctrl+Shift+I`, `Ctrl+Enter`).
- [x] Wire floating Command Palette modal into `EditorShell.tsx` and menu entry in `WindowMenu.tsx`.
- [x] 194 passing unit tests across 48 suites in `npm test` with 9 dedicated Sub-Phase 7.3 tests in `ShortcutRegistry.test.ts`.

### Sub-Phase 7.4: Plugin Architecture & Extension Points ✅ COMPLETE
- [x] Create Panel 29: `PluginManager.tsx` (`src/editor/panels/plugins/PluginManager.tsx`) with search, category filtering, capability badges, enable/disable switches, and permissions/settings inspector drawer.
- [x] Create `src/core/types/plugin.ts` defining contracts for manifests, capabilities (`network`, `storage`, `database`, `clipboard`, `filesystem`), setting fields, custom node definitions, and custom element archetypes.
- [x] Create `src/runtime/PluginManagerEngine.ts` singleton managing plugin lifecycle, dynamic Blueprint node injection into `node-registry.ts`, security capability enforcement, and `[PLUGIN_SECURITY_VIOLATION]` diagnostics.
- [x] Implement sandbox for custom node and element archetype plugins with dynamic registration/ejection without app restart.
- [x] Mount Panel 29 in `EditorShell.tsx` FullPageDock, wire `Ctrl+Shift+X` shortcut, and register "Plugin Manager" in `WindowMenu.tsx` and `ShortcutRegistry.ts`.
- [x] 208 passing unit tests across 56 suites in `npm test` with 14 dedicated Sub-Phase 7.4 tests in `PluginEngine.test.ts`.

### Sub-Phase 7.5: Final Integration Testing & Production Verification ✅ COMPLETE
- [x] Full 12-stage end-to-end integration audit (`ProductionVerificationE2E.test.ts`):
  - **Stage 1 (Routing & Sitemap)**: Blank Project Initialization & Dynamic Route Setup (`/`, `/products/[productId]`, `/checkout`, 0 route collisions).
  - **Stage 2 (Visual Hierarchy)**: Visual Canvas Element Hierarchy & Responsive Layout Tree (containers, text, buttons, grid with properties).
  - **Stage 3 (Data Architecture)**: Database ER Modeling & Schema Validation (relational schemas: `users`, `products`, `orders` with primary keys and CASCADE foreign keys validated by `DatabaseValidator`).
  - **Stage 4 (Reactive Binding)**: Reactive State Atoms & Property Data-Binding (`DataBindingValidator` evaluates legal text bindings and blocks illegal relational bindings with fallbacks).
  - **Stage 5 (Motion System)**: Animation Curve Compilation & Motion Samples (`AnimationValidator` checks track-to-archetype legality; `GSAPTimelineCompiler` generates CSS `@keyframes` and GSAP timelines).
  - **Stage 6 (Visual Scripting)**: Logic Blueprint AST Scripting with Custom Plugin Node (Event trigger -> Branch condition -> Stripe Checkout custom node DAG with type-safe execution wires).
  - **Stage 7 (Extension Security)**: Plugin Security Capabilities & Sandboxed Extension Execution (`PluginManagerEngine` verifies network grant, blocks revoked access with security violation diagnostics).
  - **Stage 8 (Search Engine)**: Global Cross-Domain Inverted Index Search (`GlobalSearchEngine` builds index and retrieves pages, elements, database collections, and blueprint nodes).
  - **Stage 9 (Command System)**: Keyboard Shortcuts & Studio Commands (`ShortcutRegistry` validates, registers, and dispatches studio commands).
  - **Stage 10 (Compiler Pipeline)**: Full AST Multi-Domain Compilation Emitters (`ReactComponentEmitter`, `StyleEmitter`, `LogicFlowEmitter`, `ApiRouteEmitter`, `PrismaSchemaEmitter`, `GSAPAnimationEmitter` all generate valid production source files).
  - **Stage 11 (Operations & Cloud)**: Build Pipeline Visualizer, Pre-flight Validation & Cloud Deploy Execution (`DeploymentEngine.validatePreflight()` passes; 6-stage cloud deployment triggers and succeeds with Vercel URL and historical logging).
  - **Stage 12 (Distribution)**: Zero-Dependency Standalone Git Project Bundle Export (`GitExporter.packageProject()` creates valid PKZIP buffer with magic signature `0x50 0x4B 0x03 0x04`).
- [x] Production build verification: `npm run build` runs clean with Next.js 16.3.4 (Turbopack), compiling all routes (`/`, `/database`, `/editor`, `/editor/detach/[panelId]`) in < 700ms with zero errors.
- [x] 220 passing unit tests across 57 test suites in `npm test` with 100% pass rate.

---

## 10. Phase 8: Advanced History, Versioning & Dependency Systems

### Sub-Phase 8.1: Panel 23 — Undo History & Transaction Graph ✅ COMPLETE
- [x] Pure TypeScript contracts in `src/core/types/history.ts`:
  - `HistoryActionCategory`: `"canvas" | "property" | "blueprint" | "database" | "page" | "style" | "variable" | "general"`.
  - `HistoryTransaction<T>`: ID, actionLabel, actionCategory, timestamp, snapshot, entityId, entityName, propertyKey, diffSummary, groupKey, groupCount.
  - `HistoryTimeline<T>`: past transactions, present active HEAD, future redo queue, total count.
  - `HistoryFilterOptions`: category filter, search query.
- [x] Diagnostic channels in `src/core/types/diagnostics.ts`:
  - `UNDO_STACK_CORRUPT`: Snapshot integrity violation and corrupted state rollback prevention.
  - `SNAPSHOT_DIFF_ERR`: AST version comparison discrepancy channel.
- [x] Transactional Undo/Redo Engine in `src/core/store/useHistoryStore.ts`:
  - 800ms debounce action grouping for rapid sequential property edits (`groupKey`, `groupCount`).
  - Auto-categorization inference engine (`inferActionCategory`).
  - Arbitrary state jumping (`jumpToState`) backward and forward with partition reconciliation.
  - Snapshot integrity validator emitting `[UNDO_STACK_CORRUPT]` diagnostics to `DiagnosticBus`.
  - Timeline projector (`getTimeline`).
- [x] Integration with `useProjectStore.ts`:
  - `jumpToHistoryState(transactionId)` cleanly restores AST element tree, page structure, schemas, and selection state.
- [x] Full Panel 23 UI in `src/editor/panels/history/UndoHistoryPanel.tsx`:
  - Real-time search and category filter chips with count badges.
  - Future redo stack visualization with step indices and single-click forward jump.
  - Active HEAD marker with live entity tags and timestamp.
  - Past undo history list with category icons, badges, diff summaries, and grouping indicators (`+N edits`).
  - Clear history modal dialog with confirmation.
- [x] Studio Integration:
  - Mounted `<UndoHistoryPanel />` in `FullPageDock` with toggle via `Ctrl+Shift+H` shortcut and custom window event `antigravity:open_history`.
  - Registered "Undo History" in `WindowMenu.tsx` with `History` icon and `Ctrl+Shift+H` accelerator.
  - Registered `core.undo_history` command in `ShortcutRegistry.ts` for Command Palette invocation.
- [x] Automated Verification:
  - 7 unit tests in `src/editor/panels/history/__tests__/UndoHistory.test.ts` (all passing).
  - 227 passing unit tests across 58 suites in `npm test`.
  - Next.js 16.3.4 (Turbopack) production build (`npm run build`) compiles cleanly in 554ms.

### Sub-Phase 8.2: Panel 24 — Version Control & Snapshots ✅ COMPLETE
- [x] Core types in `src/core/types/versioning.ts`:
  - `ProjectSnapshotRecord`: id, name, description, timestamp, author, branchName, snapshot (ProjectStateSnapshot), sizeBytes, tags, isAutoSnapshot.
  - `SnapshotDiffReport`: baseSnapshotId, targetSnapshotId, elements, pages, schemas, blueprintGraphs, totalAdded, totalRemoved, totalModified, isIdentical, summary.
  - `BranchRecord`: id, name, headSnapshotId, createdAt, updatedAt, isDefault, description.
  - `BranchMergeResult`: success, conflicts list, mergedSnapshot, summary.
- [x] Diagnostics in `src/core/types/diagnostics.ts`:
  - `[SNAPSHOT_DIFF_ERR]`: Inconsistent or corrupt snapshot diff evaluation.
  - `[BRANCH_MERGE_CONFLICT]`: Structural conflict between diverging branches.
- [x] Version Control & Diff Engine in `src/core/engine/VersionControlEngine.ts`:
  - Snapshot byte size calculation (`computeSnapshotSize`) and deep clone creation (`createSnapshotRecord`).
  - Semantic AST Diff engine comparing two snapshots (`diffSnapshots`) across pages, canvas elements, element properties, schemas, and blueprint graphs with diagnostic error trapping.
  - 3-Way merge conflict evaluator (`detectMergeConflicts`) detecting conflicting property mutations, edit-vs-delete collisions, and route slug conflicts.
- [x] Version Control Store in `src/core/store/useVersionControlStore.ts`:
  - Manages branches, snapshots, active branch HEAD, comparing snapshots, mergeBranch, and restoreSnapshot.
- [x] Panel 24 UI in `src/editor/panels/versioning/VersionControlPanel.tsx`:
  - Branch selector dropdown and new branch modal.
  - Take Snapshot modal (name, description, tags).
  - Snapshot list with search, timestamp, size, author, and tags.
  - Visual Side-by-Side AST Diff inspector highlighting additions (green), deletions (red), and mutations (amber) with expandable property tables.
  - 1-Click Restore Snapshot modal with confirmation.
  - Branch checkout and merge interface.
- [x] Studio integration in `EditorShell.tsx` (FullPageDock, `Ctrl+Shift+V`, `antigravity:open_versioning`), `WindowMenu.tsx` (Version Control & Snapshots menu item), and `ShortcutRegistry.ts` (`core.version_control`).
- [x] Automated Verification:
  - 8 unit tests in `src/editor/panels/versioning/__tests__/VersionControl.test.ts` (all passing).
  - 235 passing unit tests across 59 suites in `npm test` with 100% pass rate.
  - Clean Next.js 16.3.4 (Turbopack) production build (`npm run build`).

### Sub-Phase 8.3: Panel 26 — Reference Viewer & Dependency Graph ✅ COMPLETE
- [x] Core types in `src/core/types/dependencies.ts`:
  - `DependencyNode`: id, name, type (`page` | `element` | `blueprint` | `schema` | `variable` | `redirect`), sizeBytes, referenceCount, dependencyCount, isOrphan, metadata.
  - `DependencyEdge`: id, sourceId, targetId, relationType (`contains` | `binds_to` | `queries` | `navigates_to` | `triggers`), description.
  - `DependencyGraphData`: nodes, edges, orphanNodes, circularChains, metrics.
- [x] Diagnostics in `src/core/types/diagnostics.ts`:
  - `[ORPHAN_ASSET_WARN]`: Unused components, dead variables, or unreferenced database fields.
  - `[CIRCULAR_REF_ERR]`: Circular dependency cycles detected in project graph.
- [x] Dependency Analysis Engine in `src/core/engine/DependencyAnalysisEngine.ts`:
  - Traverses pages, elements, bindings, blueprint nodes, database queries, redirect rules, and variables.
  - Computes forward and backward references.
  - Detects orphan assets and dispatches `[ORPHAN_ASSET_WARN]`.
  - Employs DFS cycle detection to trap circular dependency loops and dispatches `[CIRCULAR_REF_ERR]`.
  - Computes relative asset complexity and size footprint in bytes.
- [x] Dependency Store in `src/core/store/useDependencyStore.ts`:
  - Reactive store for dependency graph traversal, active node selection, zoom level, and view modes.
- [x] Panel 26 UI in `src/editor/panels/dependencies/ReferenceViewerPanel.tsx`:
  - Interactive SVG hierarchical dependency canvas with zoom, pan, and connected chain highlighting.
  - Forward dependencies and backward references side inspector drawer.
  - Dedicated Orphan assets tab with inspection actions.
  - Visual Size Map view showing complexity distribution and memory weights.
- [x] Studio integration in `EditorShell.tsx` (FullPageDock, `Ctrl+Shift+R`, `antigravity:open_dependencies`), `WindowMenu.tsx` (Reference Viewer & Dependency Graph menu item), and `ShortcutRegistry.ts` (`core.reference_viewer`).
- [x] Automated Verification:
  - 6 unit tests in `src/editor/panels/dependencies/__tests__/ReferenceViewer.test.ts` (all passing).
  - 241 passing unit tests across 60 suites in `npm test` with 100% pass rate.
  - Next.js 16.3.4 (Turbopack) production build (`npm run build`) compiles cleanly in 623ms.

---

## 11. Post-MVP Phases (Future)

| Phase | Name | Key Deliverables |
|---|---|---|
| **9** | Collaboration | Real-time multi-user presence, Comments Panel (P15) |
| **10** | Marketplace | Community Marketplace (P28), Template Store |
| **11** | Localization & A11y | Localization Dashboard (P31), WCAG 2.1 Audit (P32) |
| **12** | Mobile Target | React Native / Flutter emitters |

---

## 12. Definition of Done (per Sub-Phase)

A sub-phase is considered **complete** when:
1. All checklist items are checked off
2. The verification test passes
3. No regressions in existing dock zones or inspector sections
4. Full adherence to the **Inside-Out Engine Law** (Core contracts ➔ Engine validator ➔ Output Log diagnostics ➔ UI controls)
5. All styling uses tokens from `tokens.css` without hardcoded values
