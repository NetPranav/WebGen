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

| Phase | Name | Sub-Phases | Key Deliverable |
|-------|------|------------|-----------------|
| **1** | Foundations & IDE Shell | 1.1 – 1.8 | Dockable IDE with Confluence canvas, panels, and state management |
| **2** | C++ Wasm Kernel & Blueprint Canvas | 2.1 – 2.5 | 120 FPS curved wire rendering with node connections |
| **3** | Logic Blueprint Engine & Node System | 3.1 – 3.5 | Functional node graphs with type-safe wiring |
| **4** | Database, State & Data Binding | 4.1 – 4.4 | Visual ER schema, state variables, drag-to-bind |
| **5** | Motion Blueprint & GSAP Timeline | 5.1 – 5.4 | Keyframe animation editor with GSAP playback |
| **6** | Play Mode Runtime & Execution Trace | 6.1 – 6.5 | Live sandbox preview with animated wire pulses |
| **7** | Compiler & Code Generation | 7.1 – 7.5 | Exportable Next.js + Prisma production code |

**Total estimated timeline:** 19–26 weeks for full MVP

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

### Sub-Phase 1.7: State Management Foundation (Zustand Stores)
**Goal:** Establish the reactive state backbone that all panels read from and write to. This is the "nervous system" of the editor.

**Checklist:**
- [ ] Create `src/core/store/useProjectStore.ts` — Holds the loaded project AST (pages, components, graphs, database, state, motion)
- [ ] Create `src/core/store/useEditorStore.ts` — Active panel, active workspace preset, zoom level, grid visibility, active tool
- [ ] Create `src/core/store/useSelectionStore.ts` — Currently selected component IDs (supports multi-select)
- [ ] Create `src/core/store/useHistoryStore.ts` — Undo/redo command stack with action descriptions
- [ ] Create `src/core/store/useSearchStore.ts` — Global search query, results, and filter state
- [ ] Create `src/core/store/useClipboardStore.ts` — Copy/paste buffer for components and nodes
- [ ] Create `src/core/events/EventBus.ts` — Publish/subscribe system for cross-panel communication
- [ ] Create `src/core/events/EventTypes.ts` — Typed event definitions (SelectionChanged, ZoomChanged, ProjectSaved, etc.)
- [ ] Connect stores to Outliner, Details, and Canvas panels so selection syncs across all three
- [ ] Verify: Clicking a mock item in the Outliner updates the Details panel header; Undo/Redo buttons change state

---

### Sub-Phase 1.8: Keyboard Shortcuts & Command Palette
**Goal:** Professional keyboard shortcut system and VS Code-style command palette. Power users should be able to navigate the entire IDE without touching the mouse.

**Checklist:**
- [ ] Create `src/core/keybindings/KeybindingManager.ts` — Global keydown listener that dispatches registered shortcut actions
- [ ] Create `src/core/keybindings/defaultKeybindings.ts` — Default shortcut map as specified in PANELS.md §4
- [ ] Create `src/editor/shell/CommandPalette.tsx` — `Ctrl+P` modal: fuzzy search across panels, actions, entities
- [ ] Implement `Ctrl+S` (Save), `Ctrl+Z` (Undo), `Ctrl+Shift+Z` (Redo), `Escape` (Deselect)
- [ ] Implement `Ctrl+Shift+O` (Toggle Outliner), `Ctrl+Shift+D` (Toggle Details), `Ctrl+Shift+B` (Toggle Content Browser)
- [ ] Verify: `Ctrl+P` opens the command palette; typing filters results; selecting a result performs the action; keyboard shortcuts work

---

### Phase 1 Magic Moment Test
> User opens the app → sees a professional white-themed IDE with dockable panels → the center shows an infinite dot-grid canvas with a floating Confluence-style bottom dock → the left has the Application Outliner tree → the right has the Details Inspector with collapsible sections → the bottom has tabbed Content Browser and Console → the user can drag splitters to resize panels, collapse sidebars, switch workspace presets, pan/zoom the canvas, and use Ctrl+P to search actions.

---

## 4. Phase 2: C++ Wasm Kernel & Blueprint Canvas

**Goal:** The node-and-wire canvas becomes visually alive with Unreal-quality curved connections powered by C++ WebAssembly physics.

**Goal Alignment Check (PRD.md §4.1):** "120 FPS Hermite/Bezier curve solving, cable tension, Verlet spring physics"

---

### Sub-Phase 2.1: C++ Spline Mathematics Module
- [ ] Implement `SplineSolver.hpp/.cpp` — Cubic Hermite interpolation, Bezier control point calculation
- [ ] Implement arc-length parameterization for even spacing along curves
- [ ] Write unit tests (`SplineSolver.test.cpp`)
- [ ] Verify: C++ tests pass with correct curve coordinates

### Sub-Phase 2.2: Cable Physics & Spatial Index
- [ ] Implement `CablePhysics.hpp/.cpp` — Verlet integration for wire droop and spring tension
- [ ] Implement `SpatialIndex.hpp/.cpp` — Quadtree for fast node hit-testing
- [ ] Write unit tests
- [ ] Verify: Physics simulation produces realistic wire drape values

### Sub-Phase 2.3: WebAssembly Build Pipeline
- [ ] Configure Emscripten build: CMakeLists.txt + Makefile
- [ ] Implement `WasmBindings.cpp` — Export functions to JavaScript
- [ ] Build `.wasm` + `.js` glue files into `wasm/dist/`
- [ ] Create TypeScript wrapper: `src/core/wasm/WasmBridge.ts`
- [ ] Verify: TypeScript code calls Wasm functions and receives correct spline coordinates

### Sub-Phase 2.4: Canvas Wire Renderer
- [ ] Create `src/editor/canvas/WasmCableCanvas.tsx` — HTML5 Canvas overlay calling Wasm for spline data
- [ ] Render curved Bezier wires with type-aware colors (from UI.md §2.2 wire taxonomy)
- [ ] Implement wire hover highlight and selection
- [ ] Implement animated execution pulse rendering (dashed line animation)
- [ ] Verify: Wires render as smooth curves at 120 FPS; wire colors match data types

### Sub-Phase 2.5: Interactive Node Canvas
- [ ] Enhance `BlueprintCanvas.tsx` with pan/zoom, node placement, and drag
- [ ] Implement `NodeCard.tsx` with title bar, category badge, input/output pins
- [ ] Implement `PinHandle.tsx` with colored circles and drag initiation
- [ ] Implement wire drag: pin → cursor → snap to compatible pin (with cable physics)
- [ ] Implement `CommentBox.tsx` for grouping nodes
- [ ] Implement `RerouteNode.tsx` for clean wire routing
- [ ] Implement `ActionPaletteModal.tsx` (right-click / Tab: searchable node catalog)
- [ ] Verify: User can place nodes, drag wires with physics, snap connections, group with comments

---

## 5. Phase 3: Logic Blueprint Engine & Node System

**Goal:** Nodes actually represent application logic with type-safe connections and real execution semantics.

**Goal Alignment Check (PRD.md §1.3.2):** "The visual node graph translates directly to a structured AST"

---

### Sub-Phase 3.1: Node Type Registry & Core Definitions
- [ ] Create `src/core/types/node-registry.ts` — All built-in node definitions with pin schemas
- [ ] Define Event nodes (OnClick, OnPageLoad, OnSubmit, OnHover, OnTimer, OnScroll)
- [ ] Define Control Flow nodes (Branch, Switch, ForEach, Sequence, Delay)
- [ ] Define Variable nodes (Get, Set, Compute)
- [ ] Define Navigation nodes (NavigateTo, OpenModal, ShowToast, CloseModal)
- [ ] Define Math nodes (Add, Subtract, Multiply, Divide, Compare, Concat)
- [ ] Verify: Node registry is queryable by category; each node has typed input/output pins

### Sub-Phase 3.2: Type Checker & Wire Validation
- [ ] Create `src/core/ast/TypeChecker.ts` — Real-time pin compatibility validation
- [ ] Implement type compatibility matrix (String↔String ✓, String→Number ✗ unless converter)
- [ ] Show red wire + block connection on type mismatch
- [ ] Show compatible pin highlights when dragging a wire
- [ ] Verify: Dragging a String pin near a Number input shows red; near a String input shows green

### Sub-Phase 3.3: DAG Sorter & Graph Validation
- [ ] Create `src/core/ast/DAGSorter.ts` — Topological sort for execution order
- [ ] Detect circular dependencies and emit error
- [ ] Create `src/core/ast/ASTManager.ts` — Central graph CRUD operations
- [ ] Verify: Circular connections are rejected with a visual error; acyclic graphs sort correctly

### Sub-Phase 3.4: My Blueprint Panel & Variable System
- [ ] Create Panel 17: `MyBlueprintPanel.tsx` — Variables, functions, event dispatchers
- [ ] Implement variable creation: name, type, default value
- [ ] Implement drag variable → canvas → auto-creates Get/Set node
- [ ] Implement function creation with custom sub-graph
- [ ] Verify: Creating a variable and dragging it onto the canvas creates a properly typed Get node

### Sub-Phase 3.5: Validation Panel & Graph Serialization
- [ ] Create Panel 22: `ValidationPanel.tsx` — Real-time issue list
- [ ] Implement `.bp.json` save/load (serialize/deserialize full graph state)
- [ ] Implement click-to-navigate from validation issue to offending node
- [ ] Verify: Saving a graph and reloading produces identical node positions and wire connections

---

## 6. Phase 4: Database, State & Data Binding

**Goal:** Visual database modeling and reactive connections between data, state, and UI components.

**Goal Alignment Check (PRD.md §4.4):** "Visual Entity-Relationship Modeling"

---

### Sub-Phase 4.1: Database ER Modeler Canvas
- [ ] Create Panel 10: `DatabaseDesigner.tsx` — Canvas with entity cards
- [ ] Implement `EntityTableCard.tsx` with fields, types, and connection ports
- [ ] Implement `FieldEditor.tsx` for type, constraints, defaults
- [ ] Implement relationship wires between collection ports
- [ ] Verify: User can create tables, add fields, and draw FK relationships visually

### Sub-Phase 4.2: Database CRUD Nodes & Mock Data
- [ ] Add CRUD nodes to node registry (Create, Query, Filter, Sort, Update, Delete)
- [ ] Create `MockDataGrid.tsx` — Spreadsheet viewer for seed data
- [ ] Implement seed data import (JSON/CSV)
- [ ] Verify: CRUD nodes in blueprint connect to actual database collections

### Sub-Phase 4.3: State Management & Reactive Variables
- [ ] Create Panel 13: `StateMatrixViewer.tsx` — Variable manager (Global, Page, Component scopes)
- [ ] Implement computed/derived state expressions
- [ ] Implement persistence toggles (localStorage, sessionStorage)
- [ ] Verify: State variables are creatable with types, scopes, and defaults

### Sub-Phase 4.4: Data Binding System & Viewport Components
- [ ] Implement drag-to-bind: drag DB field or state variable onto UI component property
- [ ] Create basic Viewport rendering of components (Button, Text, Container, Input, Image, Card)
- [ ] Implement bidirectional Outliner ↔ Viewport selection sync
- [ ] Verify: Dragging `product.name` onto a Text component shows a binding indicator

---

## 7. Phase 5: Motion Blueprint & GSAP Timeline

**Goal:** Dedicated animation system for web micro-interactions and scroll-driven experiences.

**Goal Alignment Check (PRD.md §4.5):** "GSAP-driven keyframe editor and preview system"

---

### Sub-Phase 5.1: Timeline Sequencer UI
- [ ] Create Panel 06: `TimelineSequencer.tsx` — Multi-track container with time ruler
- [ ] Implement `KeyframeTrack.tsx` — Horizontal property track
- [ ] Implement `KeyframeDiamond.tsx` — Place, drag, delete keyframe markers
- [ ] Implement `PlaybackControls.tsx` — Play, Pause, Loop, Reverse, Speed, Scrub
- [ ] Verify: User can add keyframes to tracks and scrub the playhead

### Sub-Phase 5.2: Easing Curve Editor
- [ ] Create `BezierCurveEditor.tsx` — Visual curve editor with control point handles
- [ ] Implement easing preset library (Power2, Power3, Elastic, Bounce, Back, Custom)
- [ ] Verify: Selecting different easings visually changes the curve shape

### Sub-Phase 5.3: GSAP Integration & Live Preview
- [ ] Connect timeline data to GSAP runtime for live preview on Viewport components
- [ ] Implement `ScrollTriggerOverlay.tsx` for scroll-based animation configuration
- [ ] Verify: Playing the timeline animates components in the Viewport in real time

### Sub-Phase 5.4: Motion Assets & API/Auth Studios
- [ ] Implement saving timelines as reusable `.motion.json` assets
- [ ] Create Panel 11: API Studio — Basic endpoint configuration and test runner
- [ ] Create Panel 12: Auth Studio — Basic auth flow diagram and role matrix
- [ ] Verify: Motion assets appear in Content Browser and can be attached to components

---

## 8. Phase 6: Play Mode Runtime & Execution Trace

**Goal:** Press ▶ Play and watch the application work. This is the "First Magic Moment" of the entire product.

**Goal Alignment Check (PRD.md §1.3.4):** "Visual Execution Trace & Debugging"

---

### Sub-Phase 6.1: Blueprint Compiler (In-Memory)
- [ ] Create `BlueprintCompiler.ts` — AST → executable JavaScript compilation
- [ ] Implement `ValidationPass.ts` — Pre-compilation checks
- [ ] Verify: A simple blueprint compiles into runnable JS without errors

### Sub-Phase 6.2: Sandbox Runtime Environment
- [ ] Create `SandboxHost.tsx` — Secure iframe sandbox
- [ ] Create `MockDatabase.ts` — In-memory data store
- [ ] Create `MockApiServer.ts` — Service Worker mock interceptor
- [ ] Create `MockAuthProvider.ts` — Simulated sessions
- [ ] Verify: The sandbox loads and renders compiled components with working interactions

### Sub-Phase 6.3: Execution Trace System
- [ ] Create `ExecutionTracer.ts` — Captures node-by-node execution events
- [ ] Create Panel 20: `ExecutionTracePanel.tsx` — Step-by-step trace list
- [ ] Implement `PulseAnimator` (C++ Wasm) — Animated light pulses along wires
- [ ] Verify: Clicking a button in Play Mode shows checkmarks traveling along wires

### Sub-Phase 6.4: AI Assistant Integration
- [ ] Create Panel 18: `AiPromptBar.tsx` — Floating prompt input with streaming response
- [ ] Create `AiDiagnosticDrawer.tsx` — Error analysis with "Fix Blueprint" suggestions
- [ ] Verify: AI can diagnose a simple runtime error and suggest a wire fix

### Sub-Phase 6.5: Hot Reload & Debug Breakpoints
- [ ] Implement hot module replacement in sandbox (editor changes reflect without restart)
- [ ] Implement breakpoint support (pause at node, step forward)
- [ ] Verify: Setting a breakpoint pauses execution; user can inspect data payloads

---

## 9. Phase 7: Blueprint Compiler & Code Generation

**Goal:** Export the visual application as clean, production-ready, human-readable source code.

**Goal Alignment Check (PRD.md §4.8):** "Clean Code Generation: React 19 / Next.js with semantic HTML"

---

### Sub-Phase 7.1: Frontend Code Emitters
- [ ] Create `ReactComponentEmitter.ts` — Generates React 19 JSX with hooks
- [ ] Create `StyleEmitter.ts` — Generates CSS with design tokens
- [ ] Create `GSAPAnimationEmitter.ts` — Generates GSAP timelines
- [ ] Verify: Generated React components render identically to the Viewport

### Sub-Phase 7.2: Backend & Database Emitters
- [ ] Create `LogicFlowEmitter.ts` — Generates async TypeScript business logic
- [ ] Create `ApiRouteEmitter.ts` — Generates Next.js API handlers
- [ ] Create `PrismaSchemaEmitter.ts` — Generates `schema.prisma` + SQL migrations
- [ ] Create `AuthEmitter.ts` — Generates NextAuth configuration
- [ ] Verify: Generated backend code handles CRUD operations correctly

### Sub-Phase 7.3: Code Inspector Panel
- [ ] Create Panel 16: `LiveCodeInspector.tsx` — Split-pane code viewer
- [ ] Implement AST-to-code bidirectional mapping (click code → highlight node, and vice-versa)
- [ ] Verify: Clicking a line of generated code highlights the corresponding Blueprint Node

### Sub-Phase 7.4: Build Pipeline & Export
- [ ] Implement full build pipeline: Validate → Compile → Bundle → generate `build-manifest.json`
- [ ] Create `GitExporter.ts` — Export as standalone Git repository
- [ ] Create Panel 19: `DeploymentDashboard.tsx` — Build pipeline visualizer
- [ ] Verify: Exported repository runs independently with `npm install && npm run dev`

### Sub-Phase 7.5: Pages Manager & Remaining MVP Panels
- [ ] Create Panel 30: `PagesManager.tsx` — Visual route tree
- [ ] Create Panel 25: `GlobalSearchPanel.tsx` — Full-project search (Find in Blueprints)
- [ ] Final integration testing across all panels
- [ ] Verify: Complete end-to-end flow from project creation to code export works

---

## 10. Post-MVP Phases (Future)

| Phase | Name | Key Deliverables |
|-------|------|-----------------|
| **8** | Advanced Panels | Undo History (P23), Version Control (P24), Reference Viewer (P26), Design System (P27), Performance Profiler (P21) |
| **9** | Collaboration | Real-time CRDT editing, Comments panel (P15), presence cursors |
| **10** | Marketplace | Community marketplace (P28), Plugin SDK (P29), template publishing |
| **11** | Localization & Accessibility | i18n manager (P31), WCAG audit (P32), RTL support |
| **12** | Advanced Deployment | Docker export, AWS/Cloudflare, CI/CD pipelines |
| **13** | Mobile Generation | React Native / Flutter emitters |

---

## 11. Definition of Done (per Sub-Phase)

A sub-phase is considered **complete** when:
1. All checklist items are checked off
2. The verification test described at the end passes
3. No critical bugs in the implemented features
4. New panels integrate with the existing docking system
5. Undo/redo works for all new editor actions (where applicable)
6. The CHANGELOG.md is updated
7. All CSS uses tokens from `tokens.css` — no hardcoded values
8. All component files have header comments describing their purpose and which panel/screen they belong to
