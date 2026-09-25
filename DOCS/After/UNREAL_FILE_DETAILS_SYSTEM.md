# Unreal Engine-Style File & Asset Details System Architecture

> **⚠️ Full-vision track. Not the active roadmap; see DOCS/Initial/ROADMAP.md.**

**Document Version:** 1.0.0  
**Status:** Approved Specification  
**Location:** `DOCS/UNREAL_FILE_DETAILS_SYSTEM.md`  
**Related Documents:** `DOCS/ROADMAP.md` (Phase 1.7), `DOCS/PANELS.md` (Panel 03), `DOCS/UI.md`

---

## 1. Executive Overview & Design Philosophy

In modern software and game development with **Unreal Engine 5 (UE5)**, opening an asset or Blueprint file never opens a simple plain-text editor or flat form. Instead, it opens a **dedicated Asset Studio Workspace** tailored specifically to that entity:

```
+-------------------------------------------------------------------------------------------------------+
|  FILE TAB BAR: [Save] [Undo] [Redo] | Tab: HeroSection.tsx (X) | Tab: Logic Blueprint (X)            |
+------------------------------------+-----------------------------------+------------------------------+
|  LEFT: COMPONENTS & MY BLUEPRINT   |  CENTER: ISOLATED ASSET VIEWPORT  |  RIGHT: DETAILS INSPECTOR    |
|  - Component Hierarchy             |  +-----------------------------+  |  [Search Details...        ] |
|    * Root (Container)              |  |                             |  |  > Transform / Geometry      |
|      -> Heading                    |  |   Isolated Component        |  |  > Slot & Attachments        |
|      -> ActionButton (Selected)    |  |   Preview Sandbox           |  |    - Parent: Container       |
|  - Graphs & Functions              |  |   (with responsive bounds)  |  |    - Slot: Flex Item (Grow 1)|
|    * HandleSubmit                  |  |                             |  |  > Appearance & Styling      |
|    * ValidateEmail                 |  +-----------------------------+  |  > Variables & Props         |
|  - Variables                       |  [Viewport] [Event Graph] [Code]|    - title: "Get Started"    |
|    * isLoading: Boolean            |                                   |  > Events & Function Bindings|
|    * buttonVariant: Enum           |                                   |    - OnClick: [ + Attach ]   |
+------------------------------------+-----------------------------------+------------------------------+
|  BOTTOM: DRAWER / OUTPUT LOG (Slide-up or minimized)                                                 |
+-------------------------------------------------------------------------------------------------------+
```

### The Unreal Engine Axiom:
> **"Every entity in the engine is an inspectable object with typed properties, hierarchical attachments, exposed variables, and delegate event dispatchers."**

Web application builders typically fail by treating components as unstructured HTML templates with arbitrary CSS. **WebAPPBuilder / WebGen** introduces the Unreal Engine paradigm to web architecture: every file, component, and blueprint is an inspectable engine asset with a 4-pillar inspection pipeline.

---

## 2. The 4 Pillars of Unreal-Style Asset Inspection

### Pillar 1: The Isolated Viewport (Center Stage)

When opening an asset in UE (e.g. a Character Blueprint, Static Mesh, or UMG UserWidget), the editor displays that element in **complete isolation**:
- **Isolated Sandbox**: The element is rendered in a clean, focused frame without surrounding page noise.
- **Interactive State Tester**: Quick toggles for element states (Default, Hover, Active, Disabled, Loading).
- **Dual View Modes**:
  - **Viewport Mode**: Interactive visual sandbox with device boundary handles and zoom/pan.
  - **Event Graph Mode**: The Logic Blueprint node graph powering that component.
  - **Code Mode**: Generated TypeScript/JSX AST view with live synchronization.

### Pillar 2: Component Hierarchy & Attachments (My Blueprint / Hierarchy Tree)

In Unreal, every Actor is composed of hierarchical `SceneComponents` attached to a `RootComponent` or specific `Sockets`.

In WebAPPBuilder, this translates to:
1. **Parent Attachment**: What container or slot does this component attach to? (e.g., `Hero Container`, `Modal Backdrop`, `Sidebar Nav`).
2. **Slot Architecture**:
   - **Flex Slot**: Margin, Align Self, Flex Grow, Flex Shrink, Order.
   - **Grid Slot**: Row Start/End, Column Start/End, Area Name.
   - **Canvas/Absolute Slot**: Anchors (Top-Left, Center, Stretch), Position X/Y, Size X/Y, Z-Order.
   - **Overlay / Portal Slot**: Target mount node, Backdrop blur, Dismiss behavior.
3. **Socket / Attachment Points**:
   - Elements can define named attachment sockets (e.g., `prefix-icon`, `suffix-icon`, `dropdown-menu`, `header-slot`).

### Pillar 3: Variables, Types & Categories

In Unreal Engine's Details panel:
- Every property belongs to a **collapsible category** with distinct visual headers.
- Variables feature **strict type safety** (String, Number, Boolean, Enum, Color, Object Reference, Callback).
- **Modified Indicator (Yellow Reset Arrow)**: Whenever a value differs from its class/component default, a yellow circular reset button appears next to the property name. Clicking it instantly reverts the value to default.
- **Instance Editable (Eye Icon)**: Toggle whether a variable is exposed as an external prop or kept internal to the component.
- **Tooltip & Metadata**: Inline documentation explaining what the property controls.

#### Property Categories in WebGen:
| Category | Properties Inspected |
|----------|----------------------|
| **Transform & Geometry** | X, Y, Width, Height, Aspect Ratio, Rotation, Scale, Z-Index |
| **Slot & Attachments** | Parent container, Slot type, Alignment, Anchors, Sockets |
| **Appearance & Styling** | Surface color, Gradients, Borders, Radius, Shadows, Blur, Opacity |
| **Typography** | Font family, Size, Weight, Line height, Letter spacing, Transform |
| **Variables & Props** | Component inputs (`props`), default values, type constraints, documentation |
| **State & Data Bindings**| Local state variables (`useState`), Global store bindings, Database query links |
| **Events & Function Dispatchers** | Event hooks (`onClick`, `onHover`, `onChange`, `onSubmit`) with Blueprint attachment |

### Pillar 4: Events, Delegates & Function Attachment ("Attach to Function")

The hallmark of Unreal Engine's Details panel is its **Events Section** at the bottom of any Actor, Widget, or Component:

```
▼ Events & Function Dispatchers
  -------------------------------------------------------------------------
  On Clicked            [ + ] Attach Function  /  [ + Create Event Node ]
  On Hovered            [ + ] Attach Function
  On Unhovered          [ + ] Attach Function
  On Value Changed      [ + ] Attach Function
  On Submit             [ HandleFormSubmit    ]  [↗ View Node]  [✕ Detach]
```

#### Workflow:
1. **Unattached State**:
   - Shows event name (e.g., `On Clicked`) with a distinctive green/blue `[ + ]` button.
   - Clicking `[ + ]`:
     - Opens a search dropdown listing existing Blueprint functions and Custom Event nodes in the project.
     - Includes a prominent option: **"+ Create New Blueprint Node"**.
2. **Attaching to a Function**:
   - If user selects an existing function (e.g., `NavigateToDashboard` or `AddToCart`), the event is immediately wired in the component AST.
   - If user chooses **Create New Blueprint Node**:
     - The engine creates a new `Event Node` (e.g. `Event OnClicked (Button_HeroAction)`) in the Logic Blueprint.
     - The IDE seamlessly opens or switches to the Logic Blueprint tab and focuses the camera on the newly created node!
3. **Attached State**:
   - The event row turns into an active connection badge showing the bound function name.
   - Includes **[↗ View Node]** button (jumps directly to the node in Blueprint Canvas).
   - Includes **[✕ Detach]** button (unlinks event without deleting the function).

---

## 3. WebAPPBuilder AST Representation

To support this Unreal-style Details architecture, the project data model represents component properties and attachments as follows:

```typescript
/** Component Attachment Descriptor */
export interface ComponentAttachment {
  parentId: string;
  parentName: string;
  slotType: "flex" | "grid" | "absolute" | "portal" | "canvas";
  slotProperties: {
    alignSelf?: "auto" | "flex-start" | "flex-end" | "center" | "stretch";
    flexGrow?: number;
    flexShrink?: number;
    order?: number;
    gridArea?: string;
    zIndex?: number;
    anchors?: {
      horizontal: "left" | "center" | "right" | "stretch";
      vertical: "top" | "center" | "bottom" | "stretch";
    };
  };
  attachedSocket?: string;
}

/** Component Variable / Prop Definition */
export interface ComponentVariable {
  id: string;
  name: string;
  type: "string" | "number" | "boolean" | "color" | "enum" | "json" | "reference";
  category: "General" | "Styling" | "Data" | "Advanced";
  defaultValue: unknown;
  currentValue: unknown;
  isModified: boolean;
  isInstanceEditable: boolean; // "Eye icon" in Unreal
  tooltip?: string;
  enumOptions?: string[];
}

/** Component Event Dispatcher & Function Binding */
export interface ComponentEventBinding {
  eventId: string;
  eventName: string; // e.g. "onClick", "onHover", "onChange", "onSubmit"
  eventLabel: string; // e.g. "On Clicked", "On Hovered"
  attachedFunctionId: string | null;
  attachedFunctionName: string | null;
  graphId?: string; // Logic Blueprint graph ID where node lives
  isCustomEvent?: boolean;
}
```

---

## 4. Interaction Flows & User Experience

### Flow A: Opening a File / Component into the Asset Studio
1. User clicks or drags a component/file from Outliner or Content Browser into the header or workspace.
2. The IDE docks the file full-page.
3. The **Center Stage** renders the component's **Isolated Viewport**:
   - Surrounded by a subtle responsive canvas frame with device handles (Desktop 1440px, Tablet 768px, Mobile 375px).
   - Top action bar allows switching between:
     - `[Viewport]` (Live visual preview)
     - `[Logic Blueprint]` (Event Graph for this file)
     - `[Code]` (Generated TypeScript)
4. The **Left Panel** displays the Component Tree and "My Blueprint" structure (Functions, Variables, Local State).
5. The **Right Panel** displays the deep **Details Inspector** populated with all categories, variables, slot attachments, and event attachments.

### Flow B: Binding an Element Event to a Blueprint Function
1. In the Details Inspector, user scrolls to the **Events & Function Dispatchers** section.
2. User clicks the `[ + ]` button next to `On Clicked`.
3. A popup menu presents:
   - Search input (`Search functions...`)
   - Existing functions: `HandleLogin()`, `OpenCheckoutModal()`, `ToggleTheme()`
   - Action item: `+ Create New Event Node in Logic Blueprint`
4. User clicks `+ Create New Event Node`.
5. The IDE:
   - Binds the event in the AST.
   - Displays the event as attached in the Details panel.
   - Automatically opens or switches to the Logic Blueprint tab.
   - Animates the Blueprint canvas to center on the newly placed `Event OnClicked` node with glowing pulse.

### Flow C: Modifying and Resetting Variables (Yellow Arrow)
1. User changes `Button Padding` from `12px 24px` to `16px 32px`.
2. The property row displays a yellow reset indicator (`↺`).
3. Hovering the reset indicator shows tooltip: *"Reset to default value: 12px 24px"*.
4. Clicking `↺` instantly reverts the property and marks the asset clean.

---

## 5. Roadmap Implementation Checklist (Sub-Phase 1.7)

- [ ] **Data Model Foundation**:
  - Implement `ComponentAttachment`, `ComponentVariable`, and `ComponentEventBinding` interfaces in `src/core/types/workspace.ts`.
- [ ] **Details Inspector UI Upgrade**:
  - Update `AssetDetailsInspector.tsx` to render all 6 categories:
    1. Identity & File Info
    2. Slot & Attachments (Parent, Slot Type, Alignment)
    3. Appearance & Tokens
    4. Typography & Layout
    5. Variables & Props (with yellow reset arrow and eye icon)
    6. Events & Function Dispatchers (with `[ + ]` attach button and function pills)
- [ ] **Isolated Element Viewport**:
  - Enhance `AssetFileEditor.tsx` to render an isolated preview container with zoom, responsive size pill, and state toggles (Default, Hover, Active, Disabled).
- [ ] **Event-to-Blueprint Connector**:
  - Clicking `[ + ]` creates or binds to a Blueprint function and updates cross-panel state.
- [ ] **Verification**:
  - Test opening multiple assets, inspecting attachments, modifying variables, clicking yellow reset arrows, and attaching events to functions.

---

## 6. The Inside-Out Architecture Pipeline (Core Connection Settings → Compatibility Validator → Output Log → UI Inspector)

To prevent visual fragility and ensure engine-grade accuracy, all element capabilities (properties, animations, transitions, API bindings) originate from the **innermost connection settings** and propagate outwards to the Details Inspector:

```
+─────────────────────────────────────────────────────────────────────────────+
|  TIER 1: INNERMOST CONNECTION SETTINGS & TYPE SCHEMAS (`src/core/types/`)   |
|  - Property track registries, data contracts, and animation curve models    |
|  - Strictly typed TypeScript contracts independent of React or HTML         |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
|  TIER 2: RUNTIME COMPATIBILITY VALIDATOR & ENGINE (`src/core/engine/`)      |
|  - Evaluates whether property/track connections match target element archetype|
|  - INCOMPATIBLE CONNECTION INTERCEPTOR:                                     |
|    If an animation or data source is attached to an unsupported element:    |
|    --> Dispatches structured diagnostic error to OUTPUT LOG                 |
|    --> Prevents runtime crash or CSS corruption                             |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
|  TIER 3: VISUAL DETAILS INSPECTOR & VIEWPORT CONTROLS (`src/editor/`)       |
|  - Details Inspector sub-panels, sliders, scrubbers, and timeline handles    |
|  - Visualizes valid property values and marks incompatible bindings in red  |
+─────────────────────────────────────────────────────────────────────────────+
```

### Incompatible Connection Diagnostic Handling (Output Log)
Whenever a user binds an animation track or property to an element:
1. The **Engine Validator** evaluates the element's archetype (e.g. `button`, `image`, `container`).
2. If the archetype does not support the requested property track (for example, applying `letterSpacing` keyframes to an `image` element, or attaching `gridAutoFlow` to an element in `absolute` layout):
   - The engine generates an immediate diagnostic error in the **Output Log**:
     ```
     [ANIM_COMPAT] Error: Track 'letterSpacing' cannot be bound to element 'ast_img' (archetype: 'image').
     Target archetype only supports: opacity, transform, filter, objectFit.
     ```
   - The Details Inspector displays a yellow/red warning pill on the track instead of corrupting the component's styles.

