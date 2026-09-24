# ENGINE FOLDER STRUCTURE & DATA HIERARCHY SPECIFICATION

## Project Name: Visual Web Application Engine
**Internal Codename:** "Unreal Engine for Web Applications"  
**Document Version:** 2.0.0  
**Status:** Production-Ready Architectural Specification  
**File Location:** `DOCS/FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md`  
**Related Documents:**  
- [PRD.md](./PRD.md) — Product Requirements Document  
- [UI.md](./UI.md) — UI & Workspace Architecture  
- [PANELS.md](./PANELS.md) — Complete Panel & Tab Registry  
- [CONVENTIONS.md](./CONVENTIONS.md) — Naming, Coding & File Conventions  
- [ROADMAP.md](./ROADMAP.md) — Implementation Phases & Milestones  
- [SCHEMA_REFERENCE.md](./SCHEMA_REFERENCE.md) — JSON Schema Contracts for All File Types  

---

## 1. Unreal Engine Architecture Analysis & Mental Model

To build an authentic "Unreal Engine for Web Applications," we first deconstruct how Epic Games structured Unreal Engine (UE4/UE5). Unreal Engine's architecture has proven itself over decades of scaling to massive, complex simulations.

### 1.1 How Unreal Engine Separates Concerns
Unreal divides its architecture into four distinct macro-layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. EDITOR LAYER (UnrealEd, Slate UI, LevelEditor, Kismet, PropertyEditor)  │
│    Tools to build, visualize, inspect, and wire systems.                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. DEVELOPER & COMPILER LAYER (KismetCompiler, BlueprintGraph, ShaderCompile)│
│    Translates visual graphs and assets into machine-executable formats.     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. RUNTIME ENGINE LAYER (Engine, World, Actor, Component, Slate, Audio)     │
│    Executes the simulation, processes tick lifecycles, and manages scenes.  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. CORE LAYER (Core, CoreUObject, Math, Memory, Serialization, Reflection)  │
│    Foundational primitives, type systems, garbage collection, and ASTs.     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Unreal Project Directory Structure (`MyGame.uproject`)
```text
MyGame/
├── MyGame.uproject           # JSON manifest: engine version, plugins, modules
├── Config/                   # DefaultEngine.ini, DefaultInput.ini, DefaultGame.ini
├── Content/                  # Assets (.uasset, .umap) organized by category:
│   ├── Maps/                 # Levels / Scenes
│   ├── Blueprints/           # Visual logic graphs & character controllers
│   ├── UI/                   # UMG widgets and HUD elements
│   ├── Materials/            # Shader node graphs
│   └── Animations/           # Sequencer timelines, curves, and blend spaces
├── Source/                   # C++ module source code
├── Plugins/                  # Project-specific plugin modules
├── Saved/                    # Autosaves, logs, local crash reports
└── Intermediate/             # Cached compilation artifacts (never committed)
```

### 1.3 Key Architectural Lessons for the Web Engine:
1. **Strict Separation of Engine vs. Project:** The Engine is the editor and compiler; the Project is the asset repository and data graph being manipulated.
2. **Deterministic Serialization:** In Unreal, every asset (`.uasset`) is a serialized representation of a `UObject`. In our platform, every asset is a declarative, human-readable JSON schema validated against a strict TypeScript schema.
3. **Core vs. Editor vs. Runtime:** The visual node graph editor (`Editor`) does not run the app directly; it emits changes to an in-memory graph (`Core`), which the `Compiler` converts into executable code for the sandboxed `Runtime`.
4. **Intermediate Build Isolation:** Transpiled outputs, temporary bundles, and local database cache files must live in an isolated directory (`intermediate/` / `generated/`), keeping project source files pristine.
5. **Plugin Architecture:** Unreal's modular plugin system allows third-party features to extend the editor without touching core engine code. Our platform must follow the same extensibility pattern.
6. **My Blueprint Panel Pattern:** Unreal's Blueprint Editor has a dedicated "My Blueprint" panel showing all variables, functions, macros, and event dispatchers belonging to the current graph. Our engine needs an equivalent "My Blueprint" sidebar for each logic graph.
7. **Reference Viewer & Size Map:** Unreal provides tools to visualize asset dependencies and memory usage. Our engine needs a Dependency Graph Viewer to understand how pages, components, blueprints, and database schemas reference each other.
8. **Find in Blueprints (Global Search):** Unreal allows searching across ALL blueprints in a project for specific nodes, variables, or functions. Our global search must cover all graphs, pages, components, database fields, API endpoints, and state variables.
9. **Undo History Panel:** Unreal provides a visible list of all recent actions with the ability to jump back to any point. Our engine needs this for all subsystems (viewport edits, blueprint wiring, database schema changes, animation keyframes).
10. **The Inside-Out Engine Law (Core Settings ➔ Compatibility Evaluator ➔ Diagnostics ➔ UI Reflection):** In Unreal, Slate UI widgets never manipulate raw state without `UProperty` reflection and compile validation. In our engine, every single visual panel and control is strictly built from the inside out: **Innermost Type Contracts & Connection Settings** (`src/core/types/`) ➔ **Engine Compatibility Evaluator** (`src/core/engine/`) ➔ **Diagnostic Bus & Output Log** (`Panel 07`) ➔ **UI Presentation Layer** (`src/editor/panels/`). If an animation sample or property cannot attach to an element archetype, the engine traps the error and emits a diagnostic to the Output Log instead of crashing or corrupting DOM styles.

---

## 2. The Two Hierarchies: Engine Codebase vs. Application Project

The platform requires **two distinct folder structures**:
1. **THE ENGINE CODEBASE STRUCTURE:** The repository housing the Next.js platform, C++ WebAssembly kernel, Blueprint compilers, and dockable editor shell.
2. **THE USER PROJECT DATA HIERARCHY:** The portable folder structure that represents a user's web application (`project.json`, pages, schemas, logic graphs, assets).

---

## 3. Hierarchy A: The Engine Codebase Structure

This is the internal architecture of the Visual Web Application Engine itself.

Every directory below is annotated with its Unreal Engine equivalent where applicable, and a rationale for why it exists.

```text
WebAPPBuilder/
│
├── DOCS/                                   # Master Engineering Specifications
│   ├── PRD.md                              # Product Requirements Document
│   ├── UI.md                               # UI & Workspace Architecture
│   ├── PANELS.md                           # Complete Panel & Tab Registry (32 panels)
│   ├── FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md  # This Document
│   ├── CONVENTIONS.md                      # Naming, Coding & File Conventions
│   ├── ROADMAP.md                          # Implementation Phases & Milestones
│   ├── SCHEMA_REFERENCE.md                 # JSON Schema Contracts for All File Types
│   └── CHANGELOG.md                        # Version history of specification changes
│
├── wasm/                                   # C++ HIGH-PERFORMANCE WEBASSEMBLY CORE
│   │                                       # ═══ Unreal Equivalent: Low-level Engine C++ modules
│   ├── include/                            # C++ Header declarations
│   │   ├── SplineSolver.hpp                # Cubic Hermite & Bezier curve math
│   │   ├── CablePhysics.hpp                # Verlet integration & spring elasticity
│   │   ├── CollisionRouter.hpp             # Spatial hashing & wire obstacle avoidance
│   │   ├── PulseAnimator.hpp               # Execution trace packet stream buffer
│   │   └── SpatialIndex.hpp                # R-tree / quadtree for fast hit-testing nodes
│   ├── src/                                # C++ Implementations
│   │   ├── SplineSolver.cpp
│   │   ├── CablePhysics.cpp
│   │   ├── CollisionRouter.cpp
│   │   ├── PulseAnimator.cpp
│   │   ├── SpatialIndex.cpp
│   │   └── WasmBindings.cpp                # Emscripten / WebAssembly export API
│   ├── tests/                              # C++ unit tests (Google Test / Catch2)
│   │   ├── SplineSolver.test.cpp
│   │   └── CablePhysics.test.cpp
│   ├── CMakeLists.txt                      # CMake build configuration
│   ├── Makefile                            # Emscripten compile script (emcc)
│   └── dist/                               # Compiled WebAssembly outputs
│       ├── engine_physics.wasm             # Compiled binary
│       └── engine_physics.js               # JS/TS glue bindings
│
├── src/                                    # NEXT.JS 15 & REACT 19 ENGINE PLATFORM
│   │
│   ├── app/                                # Next.js App Router
│   │   ├── layout.tsx                      # Root HTML layout with Google Font imports
│   │   ├── page.tsx                        # Project Hub / Launcher (see Panel 1 in PANELS.md)
│   │   ├── globals.css                     # Root CSS reset & token imports
│   │   │
│   │   ├── editor/                         # ═══ Main IDE Studio Route
│   │   │   ├── layout.tsx                  # Editor shell layout (dock manager wrapper)
│   │   │   └── page.tsx                    # Full IDE Studio Workspace entry point
│   │   │
│   │   └── api/                            # Engine Backend Endpoints
│   │       ├── compile/route.ts            # On-demand blueprint compilation
│   │       ├── ai/route.ts                 # AI Assistant Co-Pilot stream
│   │       ├── deploy/route.ts             # Cloud deployment dispatch
│   │       ├── filesystem/route.ts         # Local project read/write operations
│   │       ├── marketplace/route.ts        # Marketplace asset registry & search
│   │       └── export/route.ts             # Git repository export & code download
│   │
│   ├── core/                               # CORE PLATFORM LAYER
│   │   │                                   # ═══ Unreal Equivalent: Core, CoreUObject, Engine
│   │   │
│   │   ├── types/                          # Master TypeScript Data Types & Schemas (TIER 1: INNERMOST CORE)
│   │   │   ├── project.ts                  # Project manifest schema
│   │   │   ├── component.ts                # UI component schema & properties
│   │   │   ├── details.ts                  # Details Inspector property descriptor contracts
│   │   │   ├── element-sections.ts         # Archetype-specific section mappings
│   │   │   ├── animations.ts               # Animation track schemas & archetype compatibility matrix
│   │   │   ├── data-binding.ts             # State/API to component property binding contracts
│   │   │   ├── diagnostics.ts              # Diagnostic event schemas & Output Log channel definitions
│   │   │   ├── graph.ts                    # Nodes, Pins, Wires, Dataflow schema
│   │   │   ├── node-registry.ts            # All built-in node type definitions
│   │   │   ├── database.ts                 # Collections, Fields, Relations schema
│   │   │   ├── api.ts                      # REST/GraphQL endpoints schema
│   │   │   ├── motion.ts                   # Keyframes, Easing, Timeline schema
│   │   │   ├── state.ts                    # Reactive variable store schema
│   │   │   ├── auth.ts                     # Roles, permissions, session schema
│   │   │   ├── plugin.ts                   # Plugin manifest & extension point schema
│   │   │   ├── theme.ts                    # Design tokens, colors, typography schema
│   │   │   └── workspace.ts                # Editor workspace layout schema
│   │   │
│   │   ├── engine/                         # RUNTIME COMPATIBILITY & VALIDATION LAYER (TIER 2: WRAPPER)
│   │   │   ├── AnimationValidator.ts       # Evaluates track compatibility against target element archetype
│   │   │   ├── PropertyValidator.ts        # Validates CSS metrics, layout modes, and archetype constraints
│   │   │   ├── DataBindingValidator.ts     # Validates type safety between state/API payloads and element props
│   │   │   └── DiagnosticBus.ts            # Traps invalid connections and routes errors to Panel 07 (Output Log)
│   │   │
│   │   ├── ast/                            # Abstract Syntax Tree Core
│   │   │   ├── ASTManager.ts               # In-memory graph manager & validator
│   │   │   ├── DAGSorter.ts                # Topological sort for execution order
│   │   │   ├── TypeChecker.ts              # Pin connection type safety validator
│   │   │   ├── DiffEngine.ts               # AST diffing for AI and undo/redo
│   │   │   ├── ReferenceResolver.ts        # Cross-reference tracker (which page uses which component)
│   │   │   └── DependencyGraph.ts          # Full project dependency graph builder
│   │   │
│   │   ├── store/                          # Global Reactive State Store (Zustand + Immer)
│   │   │   ├── useProjectStore.ts          # Active project data store
│   │   │   ├── useEditorStore.ts           # Selected panels, zoom, active tool
│   │   │   ├── useSelectionStore.ts        # Currently selected objects (multi-select)
│   │   │   ├── useHistoryStore.ts          # Undo / Redo command stacks
│   │   │   ├── useClipboardStore.ts        # Copy/paste buffer for components & nodes
│   │   │   ├── useDebugStore.ts            # Active execution pulses, logs, errors
│   │   │   └── useSearchStore.ts           # Global search index & results
│   │   │
│   │   ├── events/                         # Internal Event Bus
│   │   │   ├── EventBus.ts                 # Publish/subscribe for cross-panel communication
│   │   │   └── EventTypes.ts               # Typed event definitions
│   │   │
│   │   ├── keybindings/                    # Keyboard Shortcut System
│   │   │   ├── KeybindingManager.ts        # Registers and dispatches keyboard shortcuts
│   │   │   ├── defaultKeybindings.ts       # Default shortcut map (Ctrl+S, Ctrl+Z, etc.)
│   │   │   └── KeybindingEditor.tsx        # UI for customizing shortcuts
│   │   │
│   │   ├── search/                         # Global Search Engine
│   │   │   │                               # ═══ Unreal Equivalent: Find in Blueprints
│   │   │   ├── SearchIndexer.ts            # Indexes all project entities for instant search
│   │   │   ├── FuzzyMatcher.ts             # Fuzzy matching algorithm
│   │   │   └── SearchResultTypes.ts        # Typed search result categories
│   │   │
│   │   ├── versioning/                     # Version Control & History
│   │   │   │                               # ═══ Unreal Equivalent: Revision Control
│   │   │   ├── SnapshotManager.ts          # Create/restore project snapshots
│   │   │   ├── DiffViewer.ts               # Visual diff between snapshot versions
│   │   │   └── GitExporter.ts              # Export project as a Git repository
│   │   │
│   │   └── plugins/                        # Plugin Architecture
│   │       │                               # ═══ Unreal Equivalent: Plugin Manager
│   │       ├── PluginLoader.ts             # Dynamic plugin loading & initialization
│   │       ├── PluginRegistry.ts           # Registry of installed plugins
│   │       ├── ExtensionPoints.ts          # Defines hookable extension points
│   │       └── PluginSandbox.ts            # Security sandbox for third-party code
│   │
│   ├── compiler/                           # BLUEPRINT COMPILER
│   │   │                                   # ═══ Unreal Equivalent: KismetCompiler
│   │   │
│   │   ├── BlueprintCompiler.ts            # Master orchestrator
│   │   ├── ValidationPass.ts               # Pre-compilation validation (missing wires, cycles)
│   │   │
│   │   ├── emitters/                       # Code Generators
│   │   │   ├── ReactComponentEmitter.ts    # Emits React 19 JSX & Hooks
│   │   │   ├── LogicFlowEmitter.ts         # Emits async JS/TS business logic
│   │   │   ├── PrismaSchemaEmitter.ts      # Emits schema.prisma & SQL migrations
│   │   │   ├── ApiRouteEmitter.ts          # Emits Next.js API route handlers
│   │   │   ├── GSAPAnimationEmitter.ts     # Emits GSAP timelines & ScrollTriggers
│   │   │   ├── StyleEmitter.ts             # Emits CSS variables & scoped rules
│   │   │   └── AuthEmitter.ts              # Emits NextAuth / session middleware
│   │   │
│   │   ├── bundler/                        # In-Memory Sandboxed Bundler
│   │   │   ├── SandboxPackager.ts          # Bundles compiled code for Play Mode
│   │   │   └── HotModuleReplacer.ts        # Hot-swap updated modules without full rebuild
│   │   │
│   │   └── diagnostics/                    # Compilation Diagnostics
│   │       ├── CompileErrorFormatter.ts    # Human-readable error messages
│   │       └── WarningCollector.ts         # Non-fatal warnings and suggestions
│   │
│   ├── runtime/                            # LIVE SANDBOX
│   │   │                                   # ═══ Unreal Equivalent: PIE (Play in Editor)
│   │   │
│   │   ├── SandboxHost.tsx                 # Sandboxed iframe / execution boundary
│   │   ├── MockDatabase.ts                 # In-memory SQLite / IndexedDB mock store
│   │   ├── MockApiServer.ts                # Service worker mock network interceptor
│   │   ├── MockAuthProvider.ts             # Simulated auth sessions & role switching
│   │   ├── ExecutionTracer.ts              # Hooks into runtime events to emit pulses
│   │   └── PerformanceProfiler.ts          # Tracks render time, query duration, memory
│   │
│   ├── ai/                                 # AI ENGINE INTEGRATION
│   │   │                                   # ═══ No Unreal Equivalent (our innovation)
│   │   │
│   │   ├── AiOrchestrator.ts               # Routes AI prompts to appropriate generators
│   │   ├── BlueprintGenerator.ts           # Generates logic graph nodes from prompts
│   │   ├── UIGenerator.ts                  # Generates component trees from prompts
│   │   ├── DatabaseSchemaGenerator.ts      # Generates ER models from prompts
│   │   ├── MotionGenerator.ts              # Generates GSAP timelines from prompts
│   │   ├── DiagnosticAnalyzer.ts           # Analyzes runtime errors and suggests fixes
│   │   └── PromptTemplates.ts              # Structured prompt templates for each domain
│   │
│   └── editor/                             # IDE STUDIO UI
│       │                                   # ═══ Unreal Equivalent: Slate / UnrealEd
│       │
│       ├── shell/                          # Outer IDE Frame & Windowing
│       │   ├── StudioHeader.tsx            # Top bar: File, Edit, View, Window, Help menus
│       │   ├── MainToolbar.tsx             # Action bar: Save, Undo, Redo, AI, Build, Play, Deploy
│       │   ├── DockManager.tsx             # Docking / Floating window coordinator
│       │   ├── DockPanel.tsx               # Resizable panel wrapper with drag handles
│       │   ├── DockTabBar.tsx              # Tab strip for stacked panels
│       │   ├── FloatingWindow.tsx          # Undocked floating window container
│       │   ├── WorkspacePresets.ts         # Layout presets (Design, Logic, Data, etc.)
│       │   ├── StatusBar.tsx               # Bottom status bar: cursor pos, zoom, compile status
│       │   └── CommandPalette.tsx          # Ctrl+P global command palette
│       │
│       ├── canvas/                         # Confluence Whiteboard Canvas
│       │   ├── WhiteboardCanvas.tsx        # Infinite dot-grid pan/zoom canvas
│       │   ├── FloatingDock.tsx            # Atlassian pill dock (Select, Wire, Pen, etc.)
│       │   ├── CanvasOverlay.tsx           # Bounding boxes & alignment guidelines
│       │   ├── SelectionMarquee.tsx        # Rubber-band multi-select rectangle
│       │   ├── SnapGuides.tsx              # Smart snapping alignment guides
│       │   └── WasmCableCanvas.tsx         # Canvas/WebGL layer calling C++ Wasm
│       │
│       ├── panels/                         # All Dockable Studio Panels
│       │   │                               # (See PANELS.md for complete specifications)
│       │   │
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │  CORE PANELS (Always available, primary workflow)
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │
│       │   ├── viewport/                   # Panel 01: Application Viewport
│       │   │   ├── ViewportStage.tsx        # Live application preview stage
│       │   │   ├── ViewportToolbar.tsx       # Responsive toggle, zoom, grid overlay
│       │   │   ├── ResponsiveFrame.tsx       # Device frame (Desktop/Tablet/Mobile)
│       │   │   ├── DirectTextEditor.tsx      # Inline text editing overlay
│       │   │   └── SelectionHandles.tsx      # Resize/rotate handles on selected elements
│       │   │
│       │   ├── outliner/                   # Panel 02: Application Outliner
│       │   │   ├── OutlinerTree.tsx          # Hierarchical tree view
│       │   │   ├── OutlinerNodeItem.tsx      # Individual tree node with icons
│       │   │   ├── OutlinerSearch.tsx        # Inline filter/search bar
│       │   │   └── OutlinerContextMenu.tsx   # Right-click actions (rename, delete, duplicate)
│       │   │
│       │   ├── details/                    # Panel 03: Properties & Details Inspector
│       │   │   ├── DetailsInspector.tsx      # Main inspector container
│       │   │   ├── TransformSection.tsx      # Position, size, rotation, constraints
│       │   │   ├── LayoutSection.tsx         # Flex/Grid layout controls
│       │   │   ├── AppearanceSection.tsx     # Colors, gradients, borders, shadows
│       │   │   ├── TypographySection.tsx     # Font, weight, size, spacing
│       │   │   ├── DataBindingSection.tsx    # State/DB/API binding connectors
│       │   │   ├── EventsSection.tsx         # Bound event handlers list
│       │   │   ├── MotionSection.tsx         # Attached animation quick-controls
│       │   │   ├── ResponsiveSection.tsx     # Per-breakpoint overrides
│       │   │   └── AdvancedSection.tsx       # Raw CSS, custom attributes, accessibility
│       │   │
│       │   ├── content-browser/            # Panel 04: Content & Asset Browser
│       │   │   ├── ContentBrowser.tsx        # Main browser container with breadcrumbs
│       │   │   ├── AssetGrid.tsx             # Grid/list view of assets
│       │   │   ├── AssetPreviewModal.tsx     # Hover/click preview popover
│       │   │   ├── AssetImporter.tsx         # Drag-and-drop file import handler
│       │   │   └── AssetContextMenu.tsx      # Right-click: rename, duplicate, move, delete
│       │   │
│       │   ├── blueprint/                  # Panel 05: Logic Blueprint Editor
│       │   │   ├── BlueprintCanvas.tsx       # Infinite node canvas with Wasm cables
│       │   │   ├── NodeCard.tsx              # Individual node visual card
│       │   │   ├── PinHandle.tsx             # Input/output pin with type color
│       │   │   ├── ActionPaletteModal.tsx    # Right-click / Tab: node search palette
│       │   │   ├── CommentBox.tsx            # Resizable comment grouping box
│       │   │   ├── VariableGetSet.tsx        # Drag variable → creates Get/Set node
│       │   │   └── RerouteNode.tsx           # Wire reroute knot for cleanliness
│       │   │
│       │   ├── motion/                     # Panel 06: Motion Blueprint & Sequencer
│       │   │   ├── TimelineSequencer.tsx     # Multi-track timeline container
│       │   │   ├── KeyframeTrack.tsx         # Individual property animation track
│       │   │   ├── KeyframeDiamond.tsx       # Keyframe visual indicator
│       │   │   ├── BezierCurveEditor.tsx     # Easing curve visual editor
│       │   │   ├── PlaybackControls.tsx      # Play, pause, loop, reverse, scrub
│       │   │   └── ScrollTriggerOverlay.tsx  # Visual scroll trigger threshold markers
│       │   │
│       │   ├── console/                    # Panel 07: Output Log & Console
│       │   │   ├── OutputConsole.tsx         # Log stream with filtering tabs
│       │   │   ├── LogEntry.tsx              # Individual log entry (info/warn/error)
│       │   │   └── ConsoleInput.tsx          # Interactive command input line
│       │   │
│       │   ├── preview/                    # Panel 08: Play Mode / Preview Sandbox
│       │   │   ├── PlayModeContainer.tsx     # Sandbox iframe host
│       │   │   ├── PlayModeToolbar.tsx       # Role switcher, network throttle, theme toggle
│       │   │   └── ExecutionOverlay.tsx      # Execution trace pulse visualization
│       │   │
│       │   ├── settings/                   # Panel 09: Project Settings
│       │   │   ├── ProjectSettings.tsx       # Root settings container
│       │   │   ├── GeneralSettings.tsx       # App name, favicon, base URL, SEO
│       │   │   ├── EnvironmentSettings.tsx   # API keys, secrets vault, env vars
│       │   │   ├── ThemeSettings.tsx         # Global design tokens
│       │   │   ├── BuildSettings.tsx         # Framework target, optimization level
│       │   │   └── KeybindingSettings.tsx    # Custom keyboard shortcuts editor
│       │   │
│       │   ├── database/                   # Panel 10: Database ER Modeler
│       │   │   ├── DatabaseDesigner.tsx      # ER diagram canvas
│       │   │   ├── EntityTableCard.tsx       # Visual table/collection card
│       │   │   ├── FieldEditor.tsx           # Field type, constraints, defaults editor
│       │   │   ├── RelationshipWire.tsx      # Visual foreign key connection wire
│       │   │   ├── MockDataGrid.tsx          # Spreadsheet-style data inspector
│       │   │   └── MigrationPreview.tsx      # SQL migration preview before apply
│       │   │
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │  INTEGRATION & DATA PANELS
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │
│       │   ├── api-studio/                 # Panel 11: API Blueprint Studio
│       │   │   ├── ApiEndpointStudio.tsx     # Endpoint cards with method badges
│       │   │   ├── RequestBuilder.tsx        # Headers, params, body builder
│       │   │   ├── LiveRequestRunner.tsx     # In-editor API tester
│       │   │   └── ResponseInspector.tsx     # JSON tree with path extractor
│       │   │
│       │   ├── auth-studio/                # Panel 12: Authentication & RBAC Studio
│       │   │   ├── AuthFlowDiagram.tsx       # Visual auth state machine
│       │   │   ├── RolePermissionMatrix.tsx  # Role × Permission grid
│       │   │   └── RouteGuardManager.tsx     # Page protection configuration
│       │   │
│       │   ├── state-matrix/               # Panel 13: State Management & Data Binding
│       │   │   ├── StateMatrixViewer.tsx     # State variable tree & binding lines
│       │   │   ├── VariableCreator.tsx       # Create new state variables
│       │   │   └── BindingInspector.tsx      # Inspect all bindings on a component
│       │   │
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │  ANNOTATION & COLLABORATION PANELS
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │
│       │   ├── whiteboard/                 # Panel 14: Whiteboard & Annotation Canvas
│       │   │   ├── StickyNoteWidget.tsx      # Colorful sticky notes
│       │   │   ├── FreehandDrawing.tsx       # Pencil/pen tool overlay
│       │   │   └── ShapeToolWidget.tsx       # Rectangles, circles, arrows
│       │   │
│       │   ├── comments/                   # Panel 15: Comments & Review Panel
│       │   │   │                            # ═══ No direct Unreal equivalent
│       │   │   ├── CommentsPanel.tsx         # Thread list for all comments
│       │   │   ├── CommentBubble.tsx         # Inline comment attached to component/node
│       │   │   └── CommentThread.tsx         # Threaded replies on a comment
│       │   │
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │  CODE & DEVELOPMENT PANELS
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │
│       │   ├── code-view/                  # Panel 16: Live Code Inspector
│       │   │   ├── LiveCodeInspector.tsx     # Split-pane syntax-highlighted viewer
│       │   │   ├── CodeFileTab.tsx           # Individual file tab (page.tsx, route.ts, etc.)
│       │   │   └── ASTHighlighter.tsx        # Click code → highlight node; click node → highlight code
│       │   │
│       │   ├── my-blueprint/               # Panel 17: My Blueprint (Variables/Functions)
│       │   │   │                            # ═══ Unreal Equivalent: My Blueprint panel
│       │   │   ├── MyBlueprintPanel.tsx      # Tree of variables, functions, events for current graph
│       │   │   ├── VariableItem.tsx          # Variable entry with type badge
│       │   │   ├── FunctionItem.tsx          # Function entry with input/output summary
│       │   │   └── EventDispatcherItem.tsx   # Custom event dispatcher entry
│       │   │
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │  AI & INTELLIGENCE PANELS
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │
│       │   ├── ai-studio/                  # Panel 18: AI Co-Pilot Assistant
│       │   │   ├── AiPromptBar.tsx          # Floating conversational prompt input
│       │   │   ├── AiDiagnosticDrawer.tsx   # Error analysis & fix suggestions
│       │   │   ├── AiDiffPreview.tsx        # Green/red node diff on canvas
│       │   │   └── AiHistoryPanel.tsx       # Past AI conversation & generation log
│       │   │
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │  DEPLOYMENT & OPERATIONS PANELS
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │
│       │   ├── deployment/                 # Panel 19: Deployment & Cloud Studio
│       │   │   ├── DeploymentDashboard.tsx   # Pipeline progress visualizer
│       │   │   ├── ProviderSelector.tsx      # Vercel, AWS, Docker, Cloudflare
│       │   │   ├── DomainManager.tsx         # Custom domain & SSL configuration
│       │   │   └── DeploymentHistory.tsx     # Past deploys with rollback buttons
│       │   │
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │  DEBUG & DIAGNOSTIC PANELS
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │
│       │   ├── execution-trace/            # Panel 20: Visual Execution Trace
│       │   │   │                            # ═══ Unreal Equivalent: Blueprint Debugger
│       │   │   ├── ExecutionTracePanel.tsx   # Step-by-step node execution list
│       │   │   ├── TraceNodeEntry.tsx        # Individual executed node with status
│       │   │   └── PayloadInspector.tsx      # Inspect data payload at each step
│       │   │
│       │   ├── performance/                # Panel 21: Performance Profiler
│       │   │   │                            # ═══ Unreal Equivalent: Profiler / Statistics
│       │   │   ├── PerformancePanel.tsx      # Render time, query duration, bundle size
│       │   │   └── MemoryUsageChart.tsx      # Live memory usage visualization
│       │   │
│       │   ├── validation/                 # Panel 22: Blueprint Validation & Errors
│       │   │   │                            # ═══ Unreal Equivalent: Message Log / Map Check
│       │   │   ├── ValidationPanel.tsx       # All validation issues across project
│       │   │   └── ValidationRule.tsx        # Individual issue with severity & fix link
│       │   │
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │  HISTORY & VERSIONING PANELS
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │
│       │   ├── undo-history/               # Panel 23: Undo History
│       │   │   │                            # ═══ Unreal Equivalent: Undo History
│       │   │   ├── UndoHistoryPanel.tsx      # Chronological list of all editor actions
│       │   │   └── HistoryEntry.tsx          # Individual action with restore button
│       │   │
│       │   ├── version-control/            # Panel 24: Version Control & Snapshots
│       │   │   │                            # ═══ Unreal Equivalent: Revision Control
│       │   │   ├── VersionControlPanel.tsx   # Snapshot list with compare & restore
│       │   │   ├── SnapshotDiff.tsx          # Visual diff between two snapshots
│       │   │   └── BranchManager.tsx         # Branch creation & switching
│       │   │
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │  NAVIGATION & SEARCH PANELS
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │
│       │   ├── global-search/              # Panel 25: Find in Blueprints / Global Search
│       │   │   │                            # ═══ Unreal Equivalent: Find in Blueprints
│       │   │   ├── GlobalSearchPanel.tsx     # Search across all project entities
│       │   │   └── SearchResultItem.tsx      # Result entry with type icon & preview
│       │   │
│       │   ├── reference-viewer/           # Panel 26: Reference Viewer & Dependency Graph
│       │   │   │                            # ═══ Unreal Equivalent: Reference Viewer
│       │   │   ├── ReferenceViewer.tsx       # Visual dependency graph of selected asset
│       │   │   └── DependencyNode.tsx        # Node in dependency visualization
│       │   │
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │  DESIGN SYSTEM PANELS
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │
│       │   ├── design-system/              # Panel 27: Design System & Token Manager
│       │   │   │                            # ═══ Unreal Equivalent: Material Instance Editor
│       │   │   ├── DesignSystemPanel.tsx     # Color palette, typography, spacing grid
│       │   │   ├── ColorTokenEditor.tsx      # Define named color tokens
│       │   │   ├── TypographyScale.tsx       # Font scale system with preview
│       │   │   └── SpacingGrid.tsx           # Spacing token visual grid
│       │   │
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │  MARKETPLACE & PLUGIN PANELS
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │
│       │   ├── marketplace/                # Panel 28: Marketplace & Template Store
│       │   │   │                            # ═══ Unreal Equivalent: Marketplace (Epic Games)
│       │   │   ├── MarketplaceBrowser.tsx    # Browse community assets & templates
│       │   │   ├── MarketplaceCard.tsx       # Asset card with preview, rating, install
│       │   │   └── MarketplaceDetail.tsx     # Full asset detail page
│       │   │
│       │   ├── plugins/                    # Panel 29: Plugin Manager
│       │   │   │                            # ═══ Unreal Equivalent: Edit > Plugins
│       │   │   ├── PluginManagerPanel.tsx    # List of installed & available plugins
│       │   │   └── PluginCard.tsx            # Plugin enable/disable toggle card
│       │   │
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │  PAGE & ROUTING PANELS
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │
│       │   ├── pages-manager/              # Panel 30: Pages & Routing Manager
│       │   │   │                            # ═══ No direct Unreal equivalent
│       │   │   ├── PagesManager.tsx         # Visual page/route tree with navigation flow
│       │   │   ├── RouteCard.tsx             # Individual route with path, params, guards
│       │   │   └── NavigationFlowDiagram.tsx # Visual sitemap / user flow diagram
│       │   │
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │  SPECIALIZED OPTIONAL PANELS
│       │   │  ═══════════════════════════════════════════════════════════
│       │   │
│       │   ├── localization/               # Panel 31: Localization & i18n Manager
│       │   │   │                            # ═══ Unreal Equivalent: Localization Dashboard
│       │   │   ├── LocalizationPanel.tsx    # Language manager & string table
│       │   │   └── TranslationEntry.tsx     # Individual translatable string
│       │   │
│       │   └── accessibility/              # Panel 32: Accessibility Audit Panel
│       │       │                            # ═══ No Unreal equivalent (web-specific)
│       │       ├── AccessibilityPanel.tsx    # WCAG compliance checker
│       │       └── A11yIssueCard.tsx         # Individual accessibility issue
│       │   
│       ├── menus/                          # Top Menu Bar Definitions
│       │   ├── FileMenu.tsx                # File > New, Open, Save, Save As, Export, Recent
│       │   ├── EditMenu.tsx                # Edit > Undo, Redo, Cut, Copy, Paste, Preferences
│       │   ├── ViewMenu.tsx                # View > Zoom, Grid, Guides, Rulers
│       │   ├── WindowMenu.tsx              # Window > Toggle any panel, Workspace presets
│       │   ├── BuildMenu.tsx               # Build > Compile, Validate, Clean Build
│       │   └── HelpMenu.tsx                # Help > Documentation, Shortcuts, About
│       │
│       ├── shared/                         # Shared UI Components (used across panels)
│       │   ├── ColorPicker.tsx              # Reusable color picker with swatches
│       │   ├── NumberInput.tsx              # Draggable number input (like Unreal)
│       │   ├── DropdownSelect.tsx           # Styled dropdown with search
│       │   ├── TreeView.tsx                 # Generic tree view component
│       │   ├── Tooltip.tsx                  # Styled tooltip with delay
│       │   ├── ContextMenu.tsx              # Right-click context menu builder
│       │   ├── Modal.tsx                    # Modal dialog with backdrop
│       │   ├── Slider.tsx                   # Smooth range slider
│       │   ├── ToggleSwitch.tsx             # On/off toggle
│       │   ├── Badge.tsx                    # Type badge (String, Number, Boolean, etc.)
│       │   ├── Breadcrumbs.tsx              # Breadcrumb navigation trail
│       │   ├── ResizableSplitter.tsx        # Panel resize splitter handle
│       │   └── IconButton.tsx               # Icon-only button with tooltip
│       │
│       └── styles/                         # Modern Styling System (Vanilla CSS)
│           ├── globals.css                 # CSS Reset & base styles
│           ├── tokens.css                  # Colors, spacing, elevations, curves
│           ├── dock.css                    # Docking splitters and glass panels
│           ├── whiteboard.css              # Dot grid and floating dock styling
│           ├── nodes.css                   # Node cards, pin handles, cable canvas
│           ├── panels.css                  # Panel chrome, tabs, headers
│           ├── menus.css                   # Menu bar, dropdown, context menus
│           ├── forms.css                   # Inputs, sliders, toggles, dropdowns
│           ├── typography.css              # Font loading, scale, weights
│           ├── animations.css              # Micro-interaction keyframes
│           └── scrollbar.css               # Custom scrollbar styling
│
├── public/                                 # Static assets
│   ├── fonts/                              # Self-hosted Inter, JetBrains Mono
│   ├── icons/                              # Engine-specific SVG icons
│   └── templates/                          # Built-in project templates (starter kits)
│       ├── blank/                          # Empty application template
│       ├── ecommerce/                      # E-commerce starter (pages, DB, logic)
│       ├── saas-dashboard/                 # SaaS dashboard starter
│       ├── portfolio/                      # Portfolio/landing page starter
│       └── blog/                           # Blog with CMS starter
│
├── tests/                                  # Automated Test Suite
│   ├── unit/                               # Unit tests for core, compiler, AST
│   ├── integration/                        # Integration tests across subsystems
│   └── e2e/                                # End-to-end Playwright tests
│
├── .gitignore
├── next.config.ts                          # Next.js configuration
├── tsconfig.json                           # TypeScript configuration
├── package.json                            # Dependencies & scripts
└── README.md                               # Developer onboarding guide
```

---

## 4. Hierarchy B: The User Project Data Hierarchy

When a user creates an application project (e.g., `MyShop/`), the project directory is organized with strict modularity, directly mirroring Unreal's `Content/` and `.uproject` philosophy.

Every file type uses a consistent extension convention (see `CONVENTIONS.md`):
- `.json` — Configuration and manifest files
- `.page.json` — Page layout trees
- `.component.json` — Reusable UI component definitions
- `.bp.json` — Logic blueprint graphs
- `.motion.json` — Motion/animation timelines
- `.api.json` — API integration configurations
- `.seed.json` — Mock data seed files

```text
MyShop/                                     # APPLICATION PROJECT ROOT
│
├── project.json                            # Master Project Manifest (.uproject equivalent)
│                                           # Contains: name, version, engineVersion,
│                                           # enabled plugins, framework target,
│                                           # default page, build settings
│
├── config/                                 # APPLICATION CONFIGURATIONS
│   ├── env.json                            # Environment variables & API base URLs
│   ├── env.production.json                 # Production-only overrides
│   ├── env.staging.json                    # Staging-only overrides
│   ├── auth.json                           # Auth provider, roles, permissions, session config
│   ├── theme.json                          # Global design tokens: colors, typography, radii
│   ├── seo.json                            # Default SEO meta tags, OpenGraph config
│   ├── routes.json                         # Route definitions, guards, redirects
│   └── localization.json                   # Supported languages & default locale
│
├── pages/                                  # APPLICATION PAGES
│   ├── home/                               # ═══ Home Page Module
│   │   ├── home.page.json                  # Page layout tree: component instances & nesting
│   │   ├── home.bp.json                    # Page-level logic graph (onLoad, scroll events)
│   │   ├── home.motion.json                # Page-level animations (hero entrance, parallax)
│   │   └── home.responsive.json            # Per-breakpoint layout overrides
│   ├── product-details/
│   │   ├── product-details.page.json
│   │   ├── product-details.bp.json
│   │   └── product-details.motion.json
│   ├── cart/
│   │   ├── cart.page.json
│   │   └── cart.bp.json
│   ├── checkout/
│   │   ├── checkout.page.json
│   │   └── checkout.bp.json
│   ├── dashboard/
│   │   ├── dashboard.page.json
│   │   ├── dashboard.bp.json
│   │   └── dashboard.motion.json
│   ├── login/
│   │   ├── login.page.json
│   │   └── login.bp.json
│   └── signup/
│       ├── signup.page.json
│       └── signup.bp.json
│
├── components/                             # REUSABLE UI COMPONENTS (Actor Components)
│   ├── Button/
│   │   ├── Button.component.json           # Properties, variants, slots, default styles
│   │   └── Button.motion.json              # Hover/press micro-animation
│   ├── ProductCard/
│   │   ├── ProductCard.component.json
│   │   ├── ProductCard.bp.json             # Local logic: Add to Cart action
│   │   └── ProductCard.motion.json         # Hover tilt, entrance stagger
│   ├── Navbar/
│   │   ├── Navbar.component.json
│   │   └── Navbar.motion.json
│   ├── Modal/
│   │   ├── Modal.component.json
│   │   └── Modal.motion.json               # Open/close animation
│   ├── Footer/
│   │   └── Footer.component.json
│   ├── DataTable/
│   │   ├── DataTable.component.json
│   │   └── DataTable.bp.json               # Sorting, filtering, pagination logic
│   └── Form/
│       ├── Form.component.json
│       └── Form.bp.json                    # Validation and submit logic
│
├── layouts/                                # SHARED LAYOUT TEMPLATES
│   ├── MainLayout.component.json           # Navbar + Content + Footer
│   ├── DashboardLayout.component.json      # Sidebar + Content + Header
│   └── AuthLayout.component.json           # Centered card for login/signup
│
├── blueprints/                             # APPLICATION BLUEPRINTS (Visual Scripting)
│   ├── logic/                              # Business Logic Workflows
│   │   ├── CheckoutWorkflow.bp.json        # Payment, cart validation, order creation
│   │   ├── UserAuthFlow.bp.json            # Login, registration, token refresh
│   │   ├── CartManagement.bp.json          # Add/remove/update cart items
│   │   ├── ProductSearch.bp.json           # Search, filter, sort products
│   │   └── OrderFulfillment.bp.json        # Order status tracking & updates
│   ├── motion/                             # Motion Blueprint Assets (GSAP)
│   │   ├── HeroEntrance.motion.json        # Staggered entrance timeline
│   │   ├── CardHover3D.motion.json         # Interactive tilt & depth animation
│   │   ├── PageTransition.motion.json      # Cross-page transition effect
│   │   ├── ScrollReveal.motion.json        # Scroll-triggered content reveal
│   │   └── LoadingSpinner.motion.json      # Loading state micro-animation
│   └── utility/                            # Reusable Utility Functions
│       ├── FormatCurrency.bp.json          # Number → formatted currency string
│       ├── ValidateEmail.bp.json           # Email validation function
│       └── CalculateDiscount.bp.json       # Discount calculation function
│
├── database/                               # DATABASE ARCHITECTURE
│   ├── schema.json                         # Collections, fields, constraints, relations
│   ├── indexes.json                        # Database index definitions
│   ├── validations.json                    # Field-level validation rules
│   └── seeds/                              # Initial mock data for testing
│       ├── users.seed.json
│       ├── products.seed.json
│       ├── orders.seed.json
│       └── categories.seed.json
│
├── apis/                                   # EXTERNAL API INTEGRATIONS
│   ├── StripePayments.api.json             # Stripe endpoints, webhooks, payload schemas
│   ├── SendGridMail.api.json               # Transactional email endpoints
│   ├── CloudinaryUpload.api.json           # Image upload & transformation
│   └── CustomBackend.api.json              # Custom REST API integrations
│
├── state/                                  # APPLICATION STATE DEFINITIONS
│   ├── global.state.json                   # Global state variables (currentUser, theme, etc.)
│   └── computed.state.json                 # Computed/derived state definitions
│
├── assets/                                 # STATIC MEDIA & CONTENT ASSETS
│   ├── images/                             # Uploaded PNG, WebP, JPG graphics
│   ├── vectors/                            # SVG icons and logos
│   ├── fonts/                              # Custom uploaded font families
│   ├── videos/                             # Embedded video assets
│   └── lottie/                             # Lottie JSON animation files
│
├── plugins/                                # PROJECT-SPECIFIC PLUGINS
│   └── .gitkeep                            # Placeholder for future plugin installations
│
├── localization/                           # INTERNATIONALIZATION
│   ├── en.json                             # English strings
│   ├── es.json                             # Spanish strings
│   └── fr.json                             # French strings
│
├── saved/                                  # LOCAL ENGINE DATA (Never committed to VCS)
│   ├── snapshots/                          # Automatic version snapshots
│   │   ├── 2026-09-05T18-00-00.snapshot.json
│   │   └── 2026-09-05T17-30-00.snapshot.json
│   ├── logs/                               # Local execution trace & debug history
│   ├── cache/                              # Indexed search cache, thumbnail cache
│   └── workspace-layout.json               # Last-used panel arrangement
│
├── generated/                              # COMPILED OUTPUT (Never manually edited)
│   ├── frontend/                           # Generated Next.js React application
│   │   ├── app/                            # Generated App Router pages
│   │   ├── components/                     # Generated React components
│   │   └── styles/                         # Generated CSS
│   ├── backend/                            # Generated API route handlers
│   ├── prisma/                             # Generated schema.prisma & migrations
│   ├── auth/                               # Generated NextAuth configuration
│   └── build-manifest.json                 # Compilation metadata & checksums
│
└── .gitignore                              # Ignores saved/, generated/, node_modules/
```

---

## 5. In-Memory Data Model & AST Hierarchy

Every visual action in the editor manipulates an in-memory **Abstract Syntax Tree (AST)**. This guarantees that UI components, logic nodes, database schemas, and animations are synchronized with zero ambiguity.

### 5.1 The Root Application Graph Hierarchy
```
ProjectAST (Root)
 │
 ├── Metadata
 │    ├── id: string (UUID)
 │    ├── name: string
 │    ├── version: string (semver)
 │    ├── engineVersion: string
 │    ├── createdAt: ISO8601
 │    └── lastModified: ISO8601
 │
 ├── Config
 │    ├── Theme: ThemeTokens (colors, typography, spacing, radii)
 │    ├── Environment: Map<EnvKey, EnvValue> (per env override)
 │    ├── AuthPolicy: AuthConfig (provider, roles, sessionDuration)
 │    ├── SEO: SEOConfig (title template, OpenGraph defaults)
 │    ├── Routes: RouteConfig (path mappings, guards, redirects)
 │    └── Localization: LocaleConfig (supported languages, default)
 │
 ├── Pages: Map<PageId, PageNode>
 │    ├── route: string ("/products/:id")
 │    ├── layoutRef: ComponentId (optional shared layout)
 │    ├── guards: Array<AuthGuard> (role requirements)
 │    ├── seoOverrides: SEOConfig (page-specific meta)
 │    └── ComponentTree (Hierarchical DOM Tree)
 │         ├── ComponentInstance
 │         │    ├── id: string (UUID)
 │         │    ├── type: string (registered component type)
 │         │    ├── name: string (user-assigned label)
 │         │    ├── parentId: string | null
 │         │    ├── children: Array<ComponentId>
 │         │    ├── Properties: Map<PropName, PropValue>
 │         │    │    ├── style: CSSProperties
 │         │    │    ├── responsive: Map<Breakpoint, CSSOverrides>
 │         │    │    ├── content: string | RichText
 │         │    │    └── customProps: Map<string, any>
 │         │    ├── Bindings: Map<PropName, BindingExpression>
 │         │    │    └── BindingExpression → StateVariable | DBField | APIField | Computed
 │         │    ├── EventListeners: Map<EventName, GraphId>
 │         │    ├── MotionRefs: Array<MotionId> (attached animations)
 │         │    ├── isVisible: boolean
 │         │    ├── isLocked: boolean
 │         │    └── comments: Array<CommentThread>
 │
 ├── Layouts: Map<LayoutId, LayoutDefinition>
 │    └── ComponentTree (same structure as Page, but reusable)
 │
 ├── Components: Map<ComponentDefId, ComponentDefinition>
 │    ├── name: string
 │    ├── category: string (UI, Navigation, Forms, Display)
 │    ├── defaultProps: Map<PropName, DefaultValue>
 │    ├── propSchema: Map<PropName, PropTypeDefinition>
 │    ├── slots: Array<SlotDefinition> (named child insertion points)
 │    ├── variants: Array<VariantDefinition>
 │    ├── localGraph: GraphId | null (component-level logic)
 │    └── localMotion: MotionId | null (built-in animations)
 │
 ├── Graphs: Map<GraphId, BlueprintGraph>
 │    ├── name: string
 │    ├── type: "logic" | "motion" | "utility"
 │    ├── ownerType: "page" | "component" | "standalone"
 │    ├── ownerId: PageId | ComponentId | null
 │    │
 │    ├── LocalVariables: Map<VarName, VariableDefinition>
 │    │    ├── type: DataType
 │    │    ├── defaultValue: any
 │    │    └── isExposed: boolean (visible outside this graph)
 │    │
 │    ├── LocalFunctions: Map<FuncName, FunctionDefinition>
 │    │    ├── inputPins: Array<PinDefinition>
 │    │    ├── outputPins: Array<PinDefinition>
 │    │    └── subGraphId: GraphId (the function's internal graph)
 │    │
 │    ├── EventDispatchers: Map<DispatcherName, EventDispatcherDef>
 │    │    └── payload: Array<PinDefinition>
 │    │
 │    ├── Nodes: Map<NodeId, BlueprintNode>
 │    │    ├── type: string (from node-registry)
 │    │    ├── category: NodeCategory
 │    │    ├── position: { x: number, y: number }
 │    │    ├── size: { width: number, height: number } | "auto"
 │    │    ├── data: Map<string, any> (node-specific configuration)
 │    │    ├── inputPins: Array<PinInstance>
 │    │    ├── outputPins: Array<PinInstance>
 │    │    ├── isCollapsed: boolean
 │    │    ├── commentText: string | null
 │    │    └── debugBreakpoint: boolean
 │    │
 │    ├── Edges: Array<WireEdge>
 │    │    ├── id: string (UUID)
 │    │    ├── fromNodeId: NodeId
 │    │    ├── fromPinId: PinId
 │    │    ├── toNodeId: NodeId
 │    │    ├── toPinId: PinId
 │    │    ├── wireType: "execution" | "data"
 │    │    └── dataType: DataType (for data wires)
 │    │
 │    └── CommentBoxes: Array<CommentBox>
 │         ├── position: { x, y }
 │         ├── size: { width, height }
 │         ├── color: string (hex)
 │         ├── title: string
 │         └── containedNodeIds: Array<NodeId>
 │
 ├── Database: DatabaseSchema
 │    ├── Collections: Map<CollectionId, CollectionDefinition>
 │    │    ├── name: string
 │    │    ├── Fields: Array<FieldDefinition>
 │    │    │    ├── name: string
 │    │    │    ├── type: FieldType (string, number, boolean, datetime, json, enum, relation)
 │    │    │    ├── isPrimaryKey: boolean
 │    │    │    ├── isRequired: boolean
 │    │    │    ├── isUnique: boolean
 │    │    │    ├── defaultValue: any | null
 │    │    │    ├── validationRules: Array<ValidationRule>
 │    │    │    └── enumValues: Array<string> | null
 │    │    └── Indexes: Array<IndexDefinition>
 │    │         ├── fields: Array<string>
 │    │         ├── isUnique: boolean
 │    │         └── type: "btree" | "hash"
 │    │
 │    ├── Relations: Array<RelationDefinition>
 │    │    ├── fromCollection: CollectionId
 │    │    ├── fromField: string
 │    │    ├── toCollection: CollectionId
 │    │    ├── toField: string
 │    │    ├── cardinality: "1:1" | "1:N" | "N:M"
 │    │    └── onDelete: "cascade" | "setNull" | "restrict"
 │    │
 │    └── SeedData: Map<CollectionId, Array<Record>>
 │
 ├── APIs: Map<ApiId, ApiIntegration>
 │    ├── name: string
 │    ├── baseUrl: string (can reference env variable)
 │    ├── authType: "none" | "bearer" | "apiKey" | "oauth2"
 │    ├── authConfig: AuthHeaderConfig
 │    └── Endpoints: Array<ApiEndpoint>
 │         ├── method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
 │         ├── path: string (with path params like /:id)
 │         ├── queryParams: Array<ParamDefinition>
 │         ├── requestBody: JSONSchema | null
 │         ├── responseSchema: JSONSchema (extracted output pins)
 │         └── headers: Map<string, string>
 │
 ├── MotionTimelines: Map<MotionId, MotionTimeline>
 │    ├── name: string
 │    ├── duration: number (seconds)
 │    ├── loop: boolean
 │    ├── autoPlay: boolean
 │    ├── triggerType: "load" | "scroll" | "hover" | "click" | "manual"
 │    ├── scrollTrigger: ScrollTriggerConfig | null
 │    └── Tracks: Array<AnimationTrack>
 │         ├── targetComponentId: ComponentId
 │         ├── property: AnimatableProperty
 │         └── Keyframes: Array<Keyframe>
 │              ├── time: number (seconds)
 │              ├── value: number | string
 │              ├── easing: EasingFunction
 │              └── controlPoints: { in: Point, out: Point } (bezier handles)
 │
 ├── StateStore: StateDefinition
 │    ├── GlobalVariables: Map<VarName, StateVariable>
 │    │    ├── type: DataType
 │    │    ├── defaultValue: any
 │    │    ├── isPersisted: boolean (survives page reload)
 │    │    └── scope: "global" | "session"
 │    ├── PageVariables: Map<PageId, Map<VarName, StateVariable>>
 │    └── ComputedVariables: Map<VarName, ComputedDefinition>
 │         ├── dependencies: Array<VarName>
 │         └── expression: string (computation expression)
 │
 ├── Auth: AuthConfiguration
 │    ├── provider: "credentials" | "oauth" | "magic-link"
 │    ├── oauthProviders: Array<OAuthProvider>
 │    ├── roles: Array<RoleDefinition>
 │    │    ├── name: string
 │    │    └── permissions: Array<string>
 │    ├── protectedRoutes: Map<PageId, Array<RoleName>>
 │    └── sessionConfig: SessionConfig
 │
 ├── Plugins: Map<PluginId, PluginConfig>
 │    ├── name: string
 │    ├── version: string
 │    ├── enabled: boolean
 │    └── settings: Map<string, any>
 │
 └── Localization: LocalizationData
      ├── defaultLocale: string
      ├── supportedLocales: Array<string>
      └── strings: Map<LocaleCode, Map<StringKey, string>>
```

---

## 6. How the Engine Works in Practice: Execution Lifecycle

To visualize how this architecture functions during development, consider this step-by-step user workflow:

```
[1. User opens Project Hub → selects "MyShop" project]
         │
         ▼
[2. Engine loads project.json → hydrates ProjectAST in Zustand store]
         │
         ▼
[3. Editor shell renders: Outliner (left), Viewport (center), Details (right)]
         │
         ▼
[4. User drags "Checkout Button" from Content Browser → Viewport Canvas]
         │
         ▼
[5. ASTManager creates ComponentInstance in active Page's ComponentTree]
         │
         ▼
[6. HistoryStore records action: "Add CheckoutButton to Checkout page"]
         │
         ▼
[7. User switches to Logic Workspace & opens CheckoutWorkflow.bp]
         │
         ▼
[8. My Blueprint panel shows: variables (cartTotal, isProcessing), functions (validateCart)]
         │
         ▼
[9. User creates: [OnClick] ──> [Stripe Payment Node] ──> [Create Order DB Node]]
         │
         ▼
[10. C++ Wasm Kernel calculates Hermite Splines & Spring Tension at 120 FPS]
         │
         ▼
[11. TypeChecker validates: Number→Number ✓, String→Boolean ✗ (shows red wire)]
         │
         ▼
[12. DAGSorter validates: No circular dependencies detected ✓]
         │
         ▼
[13. User clicks ▶ Play Mode]
         │
         ▼
[14. BlueprintCompiler runs: ValidationPass → Emitters → SandboxPackager]
         │
         ▼
[15. SandboxHost launches iframe; MockDatabase seeds data; MockApiServer intercepts]
         │
         ▼
[16. User clicks "Complete Purchase" inside preview]
         │
         ▼
[17. ExecutionTracer captures: node_01 ✓ → node_02 ✓ → node_03 ✓ → node_04 ✗]
         │
         ▼
[18. C++ PulseAnimator fires visual light pulses across wires in real time]
         │
         ▼
[19. Execution Trace panel shows: node_04 failed — "Orders.amount: Required field missing"]
         │
         ▼
[20. User clicks "AI Diagnose" → AI suggests: "Connect Price output pin to Amount input"]
         │
         ▼
[21. User accepts fix → AST updates → re-runs Play Mode → all nodes pass ✓]
```

---

## 7. Cross-System Data Flow Map

This diagram shows how data flows between all major subsystems during a single user action:

```
┌──────────────┐    selects     ┌──────────────┐    reads     ┌──────────────┐
│   OUTLINER   │ ──────────────>│  AST MANAGER │<────────────│  DETAILS     │
│   (Panel 2)  │<───────────────│   (Core)     │────────────>│  (Panel 3)   │
│              │    highlights  │              │   updates    │              │
└──────────────┘                └──────┬───────┘              └──────────────┘
                                       │
                        ┌──────────────┼──────────────┐
                        │              │              │
                        ▼              ▼              ▼
                ┌──────────────┐ ┌──────────┐ ┌──────────────┐
                │   VIEWPORT   │ │ BLUEPRINT│ │   TIMELINE   │
                │   (Panel 1)  │ │ (Panel 5)│ │   (Panel 6)  │
                └──────┬───────┘ └────┬─────┘ └──────┬───────┘
                       │              │              │
                       └──────────────┼──────────────┘
                                      │
                                      ▼
                              ┌──────────────┐
                              │   COMPILER   │
                              └──────┬───────┘
                                     │
                          ┌──────────┼──────────┐
                          ▼          ▼          ▼
                   ┌──────────┐ ┌────────┐ ┌────────┐
                   │ FRONTEND │ │BACKEND │ │DATABASE│
                   │  CODE    │ │ CODE   │ │ SCHEMA │
                   └────┬─────┘ └───┬────┘ └───┬────┘
                        │           │          │
                        └───────────┼──────────┘
                                    ▼
                            ┌──────────────┐
                            │   SANDBOX    │
                            │  RUNTIME     │
                            └──────┬───────┘
                                   │
                                   ▼
                           ┌──────────────┐
                           │  EXECUTION   │
                           │   TRACER     │
                           └──────────────┘
```

---

## 8. Future Scalability Considerations

### 8.1 Multi-Project Workspaces
As the platform matures, users will want to manage multiple interconnected projects (e.g., a shared component library used across several apps). The `Project Hub` (Panel 1 in PANELS.md) must eventually support workspace-level project grouping.

### 8.2 Collaborative Real-Time Editing
The AST must eventually support Conflict-free Replicated Data Types (CRDTs) for real-time multi-user collaboration. The current Zustand store architecture is designed to be replaceable with a CRDT-backed store (e.g., Yjs or Automerge) without changing panel code.

### 8.3 Custom Node SDK
Developers will need to create custom Blueprint Nodes (e.g., "Twilio SMS Node", "OpenAI Completion Node"). The Plugin Architecture (`src/core/plugins/`) defines extension points where third-party node packages can register new node types, pins, and compilation emitters.

### 8.4 Self-Hosted Deployment
The platform should eventually support self-hosted on-premises deployment for enterprise customers. The `generated/` output directory is designed to produce fully portable, framework-standard code bundles that can run independently of the engine.

### 8.5 Mobile App Generation
Future expansion could add emitters for React Native or Flutter, allowing the same visual blueprint to compile into mobile application code alongside the web application.
