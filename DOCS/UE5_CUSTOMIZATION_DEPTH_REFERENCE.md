# Unreal Engine Customization Depth — Reference & Architectural Inspiration

> This document captures key observations about the depth of Unreal Engine 5's editor customization system. These observations serve as the north-star reference for how deeply IDE Studio should support panel customization, file-specific editor contexts, and graph-integrated detail inspection.

---

## 1. Viewport-Level Layout Customization

**UE5 Behavior:**
The entire area surrounding the Viewport is fully customizable. Every panel, dock zone, toolbar, and tab strip can be rearranged, resized, collapsed, detached into floating windows, or docked to any edge. The user has near-total control over what appears where:

- Panels can be dragged to any edge (left, right, top, bottom) or floated as independent windows.
- Multiple panels can be stacked as tabs within the same dock zone.
- The toolbar strip (Select Mode, Perspective, Lit, Show, grid settings, snap settings) is context-sensitive and can be rearranged.
- Panel visibility is toggled through the **Window** menu — any panel can be shown/hidden at any time.

**Implication for IDE Studio:**
We can achieve a comparable level of customization with our existing dock zone architecture. The splitter-based resizing, tab drag-and-drop, tear-off to new browser tabs, and full-page docking already provide a strong foundation. Future iterations should allow users to drag panels to arbitrary edges and save custom layouts.

---

## 2. File/Tool-Specific Editor Contexts (Completely Different Panel Pages)

**UE5 Behavior:**
When a file, asset, or tool editor is opened (e.g., a Blueprint, Material, Animation, Widget), Unreal **does not** simply overlay it on the viewport. Instead, it opens an **entirely separate editor page** with its own:

- **Top Menu Bar & Toolbar**: The file menu items, toolbar buttons, and quick-action icons change completely based on the type of file opened. A Blueprint editor has different menus than a Material editor, which has different menus than a Level editor.
- **Center Stage**: The main canvas changes entirely — a Blueprint shows a node graph, a Material shows a material preview + node graph, an Animation shows a timeline + skeleton viewport.
- **Left Section**: The left panels change contextually. In a Blueprint editor, the left side shows "My Blueprint" (functions, variables, macros, graphs, event dispatchers) and a search/action palette. In a Material editor, it shows material parameters and expressions.
- **Right Section**: The right panels are **not the same** as the viewport's Details panel. They are specific to the editing context of the selected element within that editor.
- **Bottom Section**: The bottom tabs also change — a Blueprint editor may show a Compiler Results tab instead of the Content Browser.

**Key Insight:**
Each editor type in UE5 is essentially its own micro-application with its own toolbar, panel layout, and context menus. The top-level tabs (at the very top of the window) allow switching between these completely independent editor contexts.

**Implication for IDE Studio:**
When we open files in full-page dock mode, we should progressively evolve toward context-aware toolbars and panel contents. For example:
- Opening a **component file** (Button.tsx) should show component-specific toolbars (state toggles, responsive frames, event graph switcher) — *already implemented in Sub-Phase 1.7*.
- Opening a **Blueprint graph** should show graph-specific toolbars (zoom, alignment, node search, compile).
- Opening a **Style/Theme file** should show color palette tools, font pickers, and token inspectors.
- The left and right panels should contextually adapt their content based on the active editor tab.

---

## 3. Context-Sensitive Right Panel (Element-Specific Editing)

**UE5 Behavior:**
When a specific element is selected (e.g., a Button widget in a UMG Widget Blueprint), the right side panel transforms into a **complete editing interface for that specific element**:

- **Add Menu (+Add)**: At the top, a button to add new sub-components, effects, or behaviors to the selected element.
- **Pre-made & Custom Animations**: If the element supports animations, the panel shows available pre-built animation presets (fade in, slide, bounce) and any custom animations the user has created.
- **API Connections**: If the element can receive data from an API endpoint, the panel shows binding options — what data source, what property to bind, what format.
- **Response Listeners**: For interactive elements, the panel shows what other systems are waiting for this element's output (e.g., a button press triggers a sequence, opens a menu, sends a network request).
- **Complete Element Capabilities**: Every single thing the selected element *can do* is surfaced — styling, behavior, data binding, event responses, child slots, constraints, accessibility properties.

**Key Insight:**
The right panel is not a generic inspector. It is a **deeply contextual capability surface** that changes entirely based on the selected element's type. A Button shows button-specific capabilities. A Text element shows typography controls. A Canvas shows layout constraints. An Image shows texture/material settings.

**Implication for IDE Studio:**
Our `AssetDetailsInspector` (Sub-Phase 1.7) already provides categorized property inspection with typed variables, event bindings, and slot attachments. The next evolution should include:
- Element-type-specific capability sections (animation presets, API binding, response listeners).
- A `+Add` button to attach new behaviors, animations, or data sources directly from the Details panel.
- Dynamic section loading based on the selected element's component schema.

---

## 4. Details Tab — Deep Schema-Level Property Inspection

**UE5 Behavior:**
The Details tab in Unreal Engine is the deepest level of property inspection. When an element is selected:

- **Parent Class Display**: The top-right corner of the Details tab shows the parent class hierarchy (e.g., `Button → UserWidget → Widget → UObject`). This tells the user exactly what inheritance chain the element follows.
- **Exhaustive Property Categories**: Every single property the element can possibly have is listed in collapsible categories:
  - **Transform**: Location (X, Y, Z), Rotation (Roll, Pitch, Yaw), Scale (X, Y, Z), Mobility (Static, Stationary, Movable).
  - **Static Mesh / Rendering**: Mesh reference, material slots, LOD settings, shadow casting, visibility.
  - **Physics**: Collision presets, mass, gravity, constraints.
  - **Events**: All bindable events with function attachment points.
- **Schema Completeness**: Literally every connection, every relationship, every possible configuration is exposed. If a button can have a background image — there's a property for it. If it can have text — there's a text property with font, size, color, alignment, wrapping, overflow. If it can trigger a Blueprint event — there's a dispatcher binding row.
- **Blueprint-Editable Properties**: Properties that can be modified via Blueprint logic are marked with special indicators (instance-editable eye icon, Blueprint read/write badges).

**Key Insight:**
The Details tab is a **complete schema dump** of every capability the element possesses. Nothing is hidden. Every relationship, every default value, every override is visible and editable. Properties added through Blueprint scripting also appear here.

**Implication for IDE Studio:**
Our current `AssetDetailsInspector` covers the core categories (Identity, Slots, Variables, Events). Future iterations should:
- Display the parent class/component hierarchy chain in the top-right corner.
- Support dynamic property injection from Blueprint-defined variables.
- Show rendering/physics-equivalent properties (CSS shadows, transforms, filters, animations, transitions).
- Surface accessibility properties (ARIA roles, tab index, screen reader labels).

---

## 5. Graph/Blueprint — Its Own Complete Editor with Contextual Left Panel

**UE5 Behavior:**
When the user clicks on the **Event Graph** or any Blueprint graph, it doesn't just open the Logic Blueprint on top of the viewport. It opens the **graph as the center stage** with its own dedicated panel ecosystem:

- **Center Stage**: The node graph canvas fills the entire center area. The viewport is replaced by the graph editor.
- **Left Panel — Top Section (Search & Action Palette)**: The top-left becomes a searchable action palette showing:
  - All nodes that have been placed in the graph.
  - Search functionality to find specific nodes, functions, variables, or events.
  - Quick-add actions to insert new nodes directly from the search.
  - Recently used nodes and favorites.
- **Left Panel — Bottom Section (Hierarchy / My Blueprint)**:
  - Shows the structural hierarchy of the graph: what's connected to what, parent-child relationships between node groups, function call chains.
  - "My Blueprint" panel listing all functions, variables, macros, event dispatchers, and graphs defined in this Blueprint class.
  - Clicking any item in the hierarchy navigates to and highlights that node/group in the graph canvas.
- **Right Panel**: Changes to show properties of the **currently selected node** in the graph (not the original element). Selecting a "Set Variable" node shows the variable's type, default value, and connected pins. Selecting a "Branch" node shows the condition input.
- **Top Tab Strip**: The graph has its own tab section — multiple graphs can be open simultaneously (Event Graph, Construction Script, custom functions), each as a separate tab within the Blueprint editor.

**Key Insight:**
The graph editor is a fully self-contained environment. The left panel, right panel, toolbar, and tab strip all transform to serve the graph editing context. The hierarchy panel is critical — it shows what's under what, what builds up what, providing a structural overview of the entire logic flow.

**Implication for IDE Studio:**
When the Logic Blueprint is opened in full-page mode, we should evolve toward:
- **Left Panel — Top**: A searchable node palette showing all placed nodes, with search-to-navigate functionality.
- **Left Panel — Bottom**: A hierarchy view showing the graph's structural composition (what connects to what, grouped by function/event handler).
- **Right Panel**: Context-switches to show the properties of the selected Blueprint node (not the original component).
- **Tab Strip**: Support multiple graph tabs (Event Graph, custom functions, animation state machines) within the Blueprint editor context.

---

## 6. The Inside-Out Engine Law: Why UE5 Details Panels Never Break

**UE5 Architectural Reality:**
In Unreal Engine 5, visual property inspectors never touch raw C++ memory or emit unchecked changes. Everything flows strictly **inside-out**:
1. **UProperty / UClass Reflection (Innermost)**: Defines property types, metadata tags (`EditAnywhere`, `BlueprintReadWrite`, `Category`), and allowed value boundaries.
2. **Compile-Time & Runtime Validation (Middle)**: When an Animation Montage, Sequencer Track, or Blueprint Wire connects to a component, the engine validates type compatibility. If a user binds an incompatible track, UE5 emits a compiler warning/error to the **Message Log / Output Log** rather than rendering broken visuals.
3. **Slate UI Details Panel (Outermost)**: The visual controls are a pure reactive reflection of the validated reflection data.

**Application to WebAPPBuilder:**
- All element properties, CSS animation tracks, and data bindings must first be defined in `src/core/types/`.
- The engine validator (`src/core/engine/`) validates whether property tracks can attach to target element archetypes (`button`, `image`, `container`, etc.).
- Incompatible track attachments immediately route a diagnostic warning/error to the **Output Log** drawer.
- The Details Inspector merely renders the controls and displays the engine's validation status.

---

## Summary: Depth Levels of UE5 Customization

| Level | UE5 Capability | IDE Studio Status |
|-------|---------------|-------------------|
| **Layout Customization** | Fully drag-and-drop panel arrangement, floating windows, saved layouts | ✅ Partially implemented (dock zones, splitters, tear-off, full-page) |
| **File-Specific Editor Contexts** | Each file type opens its own micro-application with unique toolbars and panels | ✅ Foundation laid (AssetFileEditor with state toggles, mode switcher) |
| **Element-Specific Right Panel** | Right panel shows complete capability surface for selected element type | ✅ Implemented in Phase 2.6 (Archetype-driven context switching) |
| **Schema-Complete Details Tab** | Every property, relationship, and binding is exposed and editable | 🔄 Deepened via Phase 2.3–2.6; Phase 2.7–2.8 adding animation & data bindings |
| **Graph-Specific Panel Ecosystem** | Graph editor has its own left panel (search + hierarchy), right panel (node details), and tab strip | 📋 Phase 2.10 planned (requires graph node selection system) |

---

> **Note**: This document is a living reference. As we progress through the roadmap, each level of customization depth will be incrementally implemented, always using Unreal Engine 5 as the north-star benchmark for editor capability density.

