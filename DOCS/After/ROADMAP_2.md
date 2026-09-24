# ROADMAP 2: Deep Detailing Panel System — Full Unreal Engine Parity

> **North Star Reference**: `DOCS/UE5_CUSTOMIZATION_DEPTH_REFERENCE.md`
> **Specification**: `DOCS/UNREAL_FILE_DETAILS_SYSTEM.md`
> **Architectural Law**: **Inside-Out Engineering** — Always build from innermost connection settings/data schemas outward to the engine compatibility & Output Log diagnostic layer, and finally to the outermost UI inspector controls.
> **Scope**: Complete rebuild and deep expansion of the Asset Details Inspector, Isolated Viewport, and context-aware panel ecosystem to achieve Unreal Engine 5-grade editing depth.

---

## The Inside-Out Engine Architecture Pipeline

Every phase from Phase 2.7 onward follows a strict 3-tier inside-out construction order:

```
┌────────────────────────────────────────────────────────────────────────┐
│  TIER 1: INNERMOST CORE SETTINGS & TYPED SCHEMAS (`src/core/types/`)   │
│  - Property track registries, animation curve math, connection schemas │
│  - Pure TypeScript contracts independent of React or DOM               │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│  TIER 2: RUNTIME ENGINE & COMPATIBILITY VALIDATORS (`src/core/engine/`)│
│  - Evaluates if property/animation track connects to element archetype │
│  - Emits diagnostic warnings/errors to OUTPUT LOG if incompatible      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│  TIER 3: VISUAL DETAILS INSPECTOR & CONTROLS (`src/editor/panels/`)    │
│  - Sliders, scrubbers, keyframe timelines, preset cards & live preview │
│  - Surfaces valid connections and visually marks invalid ones          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Current State Assessment & Known Issues

Before building forward, the current Phase 1.7 implementation has several issues that must be corrected:

### UI Polish Issues (Right Panel)
1. **Flat, unstyled section headers** — Section headers (`Asset Specification`, `Slot & Hierarchy Attachments`, `Variables & Props`, etc.) are plain text with a chevron. They lack the dark banded header bar style that the rest of the editor uses (no background fill, no subtle gradient, no border separation).
2. **Inconsistent form row spacing** — Property rows (`Asset Name: Button.tsx`, `Identifier: ast_btn`) have inconsistent vertical padding. Some rows are cramped, others have too much space.
3. **Labels and values not aligned in a 2-column grid** — In UE5, the Details panel uses a strict 2-column layout: labels on the left (~40%), values on the right (~60%). Our current layout has labels and values at different widths per row, causing visual jitter.
4. **Attachment card styling looks plain** — The `ue-attachment-card` has a basic border but lacks the subtle inset/recessed look that UE5 uses for nested property groups.
5. **Slider controls for Appearance & Tokens are unstyled** — The range inputs for `Corner Radius` and `Border Width` are default browser sliders, not matching the dark UE5 theme. They should use custom-styled track/thumb.
6. **Color picker is tiny and bare** — The color swatch for `Background Fill` is a bare 22px browser color input. Should be a proper styled swatch with hex code inline and no browser chrome.
7. **Typography section is bare-bones** — Only 3 fields (Font Family, Font Size, Font Weight). Missing: line-height, letter-spacing, text-transform, text-decoration, text-shadow, text-align visual toggle row.
8. **No scrollbar custom styling** — The right panel scrollbar is the default OS scrollbar, not the thin dark custom scrollbar used in the rest of the editor.
9. **Search bar** renders `&amp;` as literal text in the placeholder instead of `&`.
10. **Variable type pills** (`STRING`, `ENUM`, `BOOLEAN`) lack the subtle glow/shadow and rounded chip styling — they look like flat badges.
11. **No category sub-grouping** — Variables are listed flat without category sub-headers (`General`, `Styling`, `Data`). UE5 groups variables under their categories with collapsible sub-headers.

### Functional Issues
1. **Panel doesn't scroll independently** — The right panel scrolls together with the page in some configurations instead of having its own scroll container.
2. **No `+Add` component button** at the top of the Details panel (UE5 has this prominently).
3. **No parent class chain display** in the top-right corner (UE5 shows `Button → Widget → UObject` ancestry).
4. **Appearance section has no opacity slider, no box-shadow editor, no border-color picker** — only 3 out of ~8 appearance properties are exposed.
5. **Events section doesn't show event parameter signatures** — In UE5, each event shows its parameter types (e.g., `onClick(MouseEvent)`, `onChange(value: string)`).
6. **No "Advanced" section toggle** — UE5 has a bottom toggle to show/hide advanced properties. We show everything always.
7. **Asset File Editor (center)** preview area is mostly empty — the live sandbox only shows a tiny preview at the bottom of a large empty space.

---

## Phase 2.1: UI Polish & Foundation Fix ✅ COMPLETE

**Goal**: Fix all visual inconsistencies, align the Details panel styling with the rest of the editor, and establish the correct foundation CSS/layout before adding new features.

**Checklist:**
- [x] **Restyle section headers** — Add dark banded background (`var(--panel-header-bg)`), left border accent on expand, subtle bottom border separator, uppercase 10px font-weight-700 tracking with item count badge on the right.
- [x] **Implement strict 2-column label-value grid** — All property rows use CSS grid with `grid-template-columns: minmax(120px, 38%) 1fr`. Labels always left-aligned, values always right-aligned or filling remaining space.
- [x] **Fix search bar placeholder** — Replace `&amp;` entity with proper `&` character in JSX.
- [x] **Custom-style all form controls** — Range sliders (custom track + thumb matching dark theme), select dropdowns (dark background, subtle border, no browser chrome), checkboxes (UE5-style toggle switches instead of browser checkboxes), color pickers (larger swatch 28px + hex input inline).
- [x] **Redesign variable type pills** — Rounded pill shape (border-radius 10px), subtle inner shadow, slightly larger (20px height), with left-aligned colored dot indicator per type instead of full background fill.
- [x] **Add custom thin scrollbar** to the right panel scroll container — 4px width, dark track, subtle thumb matching `var(--surface-3)`.
- [x] **Polish attachment card** — Inset shadow on card, subtle left border accent, tighter row spacing.
- [x] **Fix independent scroll** — Ensure the right panel has `overflow-y: auto` contained within its own flex child, not spilling to page scroll.
- [x] **Reduce empty space in Asset File Editor** — Move the live sandbox preview to vertically center in the available space. Add a subtle grid/dot pattern background to the empty canvas area (like UE5's dark viewport grid).

**Files Modified:**
- `src/editor/styles/panels.css` — Major restyle of all `.details-section__*`, `.ue-prop-*`, `.ue-attachment-*`, `.ue-event-*`, `.form-*` classes
- `src/editor/styles/forms.css` — Custom range slider, toggle switch, color picker
- `src/editor/panels/details/AssetDetailsInspector.tsx` — Fix placeholder, restructure layout to grid rows
- `src/editor/panels/content-browser/AssetFileEditor.tsx` — Center preview, add canvas grid background

---

## Phase 2.2: Parent Class Chain & `+Add` Component System ✅ COMPLETE

**Goal**: Add the UE5-style parent class hierarchy display and the `+Add` component/behavior button at the top of the Details panel.

**Checklist:**
- [x] **Parent Class Breadcrumb Chain** — At the top of the Details panel (below the search bar), show a horizontal breadcrumb chain: `Button → BaseInteractiveWidget → PageElement → UObject`. Each segment is clickable (navigates to parent class details). The rightmost item (current class) is highlighted with the accent color.
- [x] **`+Add` Component Button** — Prominent button at the very top of the Details panel (after the header, before search). Opens a searchable dropdown palette showing:
  - **Sub-components**: Child elements that can be nested (Icon, Label, Badge, Tooltip)
  - **Behaviors**: Attachable behaviors (Hover Effect, Click Animation, Scroll Trigger, Intersection Observer)
  - **Data Bindings**: Connectable data sources (API Endpoint, State Variable, URL Parameter, LocalStorage Key)
  - **Animations**: Pre-made animation presets (Fade In, Slide Up, Bounce, Pulse, Skeleton Loader)
- [x] **Update `AssetDetailSchema`** type to include `classChain: string[]` field
- [x] **Create `AddComponentPalette.tsx`** — Searchable dropdown component with categorized items, fuzzy search, and keyboard navigation

**New Files:**
- `src/editor/panels/details/AddComponentPalette.tsx`

**Files Modified:**
- `src/core/types/details.ts` — Add `classChain` to schema
- `src/editor/panels/details/AssetDetailsInspector.tsx` — Render parent chain + `+Add` button
- `src/editor/styles/panels.css` — Styles for breadcrumb chain and palette dropdown

---

## Phase 2.3: Deep Appearance & Styling Editor ✅ COMPLETE

**Goal**: Expand the Appearance & Tokens section from 3 properties to the full visual property set, matching UE5's exhaustive styling capabilities for web components.

**Checklist:**
- [x] **Background Section** (collapsible sub-group):
  - Background Color (color picker + hex + opacity slider)
  - Background Gradient (type selector: `linear`, `radial`, `conic` + angle/position + color stop editor with draggable stops)
  - Background Image (URL input + upload placeholder + `cover`/`contain`/`repeat` selector)
  - Background Blend Mode (`normal`, `multiply`, `screen`, `overlay`)
- [x] **Border Section** (collapsible sub-group):
  - Border Width (4-sided independent input: top/right/bottom/left with `link` toggle for uniform)
  - Border Color (color picker)
  - Border Style (`solid`, `dashed`, `dotted`, `double`, `none`)
  - Border Radius (4-corner independent input with `link` toggle, visual corner preview)
- [x] **Shadow & Effects Section** (collapsible sub-group):
  - Box Shadow (multi-shadow editor: X offset, Y offset, blur, spread, color, inset toggle)
  - Text Shadow (X offset, Y offset, blur, color)
  - Backdrop Filter (blur amount, brightness, contrast, saturate)
  - Opacity slider (0–100%)
  - Mix Blend Mode
- [x] **Transform Section** (collapsible sub-group):
  - Translate X/Y (px or %)
  - Rotate (degrees, with visual rotation wheel)
  - Scale X/Y
  - Skew X/Y
  - Transform Origin (visual 9-point grid selector)
- [x] **Transition & Timing Section** (collapsible sub-group):
  - Transition Property (multi-select: `all`, `opacity`, `transform`, `background-color`, etc.)
  - Duration (ms slider)
  - Easing (visual curve selector: `ease`, `ease-in`, `ease-out`, `ease-in-out`, `cubic-bezier()`)
  - Delay (ms)

**New Files:**
- `src/editor/panels/details/sections/AppearanceEditor.tsx` — Complete appearance sub-panel
- `src/editor/panels/details/controls/GradientEditor.tsx` — Gradient stop editor widget
- `src/editor/panels/details/controls/ShadowEditor.tsx` — Multi-shadow stack editor
- `src/editor/panels/details/controls/TransformOriginPicker.tsx` — 9-point grid origin selector
- `src/editor/panels/details/controls/EasingCurveSelector.tsx` — Visual easing curve preview

**Files Modified:**
- `src/core/types/details.ts` — Expand `appearance` schema to full properties
- `src/editor/panels/details/AssetDetailsInspector.tsx` — Replace inline Appearance section with `<AppearanceEditor>`
- `src/editor/styles/panels.css` — Gradient editor, shadow stack, transform origin grid styles

---

## Phase 2.4: Deep Typography & Layout Editor ✅ COMPLETE

**Goal**: Expand the Typography & Text section to full web typography control, and add a dedicated Layout & Spacing section with visual box model editor.

**Checklist:**
- [x] **Typography Section** (expanded):
  - Font Family (dropdown with font preview in each option)
  - Font Size (number input + unit selector: `px`, `rem`, `em`, `vw`)
  - Font Weight (visual weight slider: 100–900 with preview)
  - Line Height (number input + unit selector)
  - Letter Spacing (number input + unit selector)
  - Word Spacing
  - Text Align (visual toggle row: left, center, right, justify — with icons)
  - Text Transform (`none`, `uppercase`, `lowercase`, `capitalize`)
  - Text Decoration (`none`, `underline`, `line-through`, `overline` + color + style)
  - Text Overflow (`clip`, `ellipsis`, `fade`)
  - White Space (`normal`, `nowrap`, `pre`, `pre-wrap`)
  - Font Variant (numeric, ligatures, normal/italic toggle)
- [x] **Layout & Spacing Section** (new section):
  - **Visual Box Model Editor** — Interactive box diagram showing margin, border, padding, content dimensions. Click any edge to edit its value inline. Color-coded zones (margin=orange, padding=green, content=blue).
  - Width / Height (number + unit + `auto`/`fit-content`/`min-content` selector)
  - Min Width / Max Width / Min Height / Max Height
  - Display (`block`, `flex`, `grid`, `inline-flex`, `inline-block`, `none`)
  - Position (`static`, `relative`, `absolute`, `fixed`, `sticky`)
  - Overflow X / Overflow Y (`visible`, `hidden`, `scroll`, `auto`)
  - Flex properties (when parent is flex): `flex-grow`, `flex-shrink`, `flex-basis`, `align-self`, `order`
  - Grid properties (when parent is grid): `grid-column`, `grid-row`, `grid-area`, `place-self`
  - Gap (`row-gap`, `column-gap`)
- [x] **Cursor & Interaction** (sub-group):
  - Cursor style (`default`, `pointer`, `grab`, `text`, `not-allowed`, `crosshair`, custom URL)
  - Pointer Events (`auto`, `none`)
  - User Select (`auto`, `none`, `text`, `all`)

**New Files:**
- `src/editor/panels/details/sections/TypographyEditor.tsx`
- `src/editor/panels/details/sections/LayoutSpacingEditor.tsx`
- `src/editor/panels/details/controls/BoxModelDiagram.tsx` — Interactive visual box model
- `src/editor/panels/details/controls/TextAlignToggle.tsx` — Icon toggle row

**Files Modified:**
- `src/core/types/details.ts` — Add `layout`, expand `typography` schema
- `src/editor/panels/details/AssetDetailsInspector.tsx` — Replace inline Typography, add Layout section
- `src/editor/styles/panels.css` — Box model diagram, text align toggles, font weight slider

---

## Phase 2.5: Variable System Upgrade — Categories, Sub-Groups & Advanced Toggle ✅ COMPLETE

**Goal**: Transform the flat variable list into a fully categorized, sub-grouped variable inspector with UE5-style Advanced toggle and inline documentation.

**Checklist:**
- [x] **Category Sub-Headers** — Group variables under collapsible category banners (`General`, `Styling`, `Data`, `Advanced`) with category item count. Each category has a slightly indented dark background band.
- [x] **Advanced Toggle** — At the bottom of the Variables section, a toggle button: `▶ Show Advanced Properties (N hidden)`. When active, reveals variables marked `category: "Advanced"`. Default state is hidden.
- [x] **Variable Search Integration** — The global search bar also filters within variable categories. When filtering, all matching category groups auto-expand.
- [x] **Inline Tooltips** — Hovering a variable name shows a floating tooltip card with: type badge, default value, description text, and "instance editable" status.
- [x] **Variable Drag Reorder** — Variables within the same category can be drag-reordered (UE5 supports this in some contexts). Visual drag handle on left edge.
- [x] **Number Input Improvements** — Number type variables get a horizontal scrub input: click-and-drag horizontally to increment/decrement, double-click to type directly. Step controls on right edge.
- [x] **JSON/Object Variable Editor** — For `json` type variables, show a collapsible key-value editor with nested key expansion, type indicators per key, and inline editing.
- [x] **Reference Variable Picker** — For `reference` type variables, show a searchable asset picker dropdown that lists available components/assets from the content browser.
- [x] **Event Parameter Types** — Each event in the Events section now displays its parameter signature: `onClick(event: MouseEvent)`, `onChange(value: string, index: number)`.
- [x] **"Create New Variable" Button** — At the bottom of the Variables section, a `+ Add Variable` button that opens an inline form: name, type selector, category selector, default value, instance-editable toggle. New variables are immediately added to the local state.

**New Files:**
- `src/editor/panels/details/controls/ScrubNumberInput.tsx` — Horizontal scrub number input
- `src/editor/panels/details/controls/JsonObjectEditor.tsx` — Nested key-value JSON editor
- `src/editor/panels/details/controls/AssetReferencePicker.tsx` — Searchable asset reference selector

**Files Modified:**
- `src/core/types/details.ts` — Add `isAdvanced` flag, event parameter types
- `src/editor/panels/details/AssetDetailsInspector.tsx` — Category grouping, advanced toggle, create variable form
- `src/editor/styles/panels.css` — Category bands, scrub input, JSON editor, advanced toggle

---

## Phase 2.6: Context-Aware Panel Switching (Element-Type Specific Sections) ✅ COMPLETE

**Goal**: The Details panel dynamically shows different sections based on the element type. A Button shows button-specific capabilities. An Image shows image-specific controls. A Container shows layout controls. This is how UE5 works — the Details panel is not one-size-fits-all.

**Checklist:**
- [x] **Element Type Registry** — Create a registry mapping element types to their available detail sections. Each element type declares which sections it supports and in what order.
- [x] **Button-Specific Sections**:
  - [x] Interaction States (hover color, active color, disabled opacity, focus ring)
  - [x] Loading State (spinner type, spinner color, disabled-while-loading toggle)
  - [x] Ripple Effect (enable/disable, color, duration, origin)
- [x] **Image-Specific Sections**:
  - [x] Source (URL input, upload, fallback image)
  - [x] Fit & Crop (`object-fit`: cover/contain/fill/none, `object-position`)
  - [x] Alt Text (accessibility input)
  - [x] Lazy Loading (toggle, threshold, placeholder type: blur/skeleton)
- [x] **Text-Specific Sections**:
  - [x] Content (multiline text input)
  - [x] Rich Text Formatting (bold, italic, underline, strikethrough toggles)
  - [x] Truncation (max lines, ellipsis, expand on hover)
- [x] **Container-Specific Sections**:
  - [x] Layout Mode toggle (Flex / Grid / Absolute Canvas) with visual mode preview
  - [x] Flex controls (direction, wrap, justify, align, gap) with visual axis indicator
  - [x] Grid controls (template columns/rows, auto-flow, gap) with visual grid overlay
  - [x] Children list (ordered list of child components with drag reorder)
- [x] **Input-Specific Sections**:
  - [x] Input Type (`text`, `email`, `password`, `number`, `tel`, `url`, `search`)
  - [x] Validation (required, min/max length, pattern regex, custom validator function reference)
  - [x] Placeholder text
  - [x] Autocomplete (`on`, `off`, specific types)
- [x] **Form-Specific Sections**:
  - [x] Submit Action (function binding, API endpoint, redirect URL)
  - [x] Validation Mode (`onSubmit`, `onChange`, `onBlur`)
  - [x] Form Data Schema (key-value list of form fields with types)

**New Files:**
- `src/core/types/element-sections.ts` — Element type registry and section definitions
- `src/editor/panels/details/sections/ButtonStateEditor.tsx`
- `src/editor/panels/details/sections/ImagePropertiesEditor.tsx`
- `src/editor/panels/details/sections/ContainerLayoutEditor.tsx`
- `src/editor/panels/details/sections/InputValidationEditor.tsx`
- `src/editor/panels/details/sections/TextContentEditor.tsx`

**Files Modified:**
- `src/editor/panels/details/AssetDetailsInspector.tsx` — Dynamic section rendering based on element type registry
- `src/core/types/details.ts` — Add `elementType` field to schema

---

## Phase 2.7: Animation & Transition Binding System (Inside-Out Pipeline)

**Goal**: Establish a complete animation pipeline from the innermost property track math and compatibility validation out to the Details Inspector keyframe editor and live preview. If an animation is attached to an incompatible element or property track, the engine validator catches it and logs a diagnostic error directly to the **Output Log**.

**Inside-Out Execution Checklist:**

### Tier 1: Innermost Core Settings & Track Schemas (`src/core/types/`)
- [ ] **Animation Track & Preset Contracts** (`src/core/types/animations.ts`):
  - `AnimationTrackId`: target property paths (`opacity`, `transform.scale`, `transform.translate`, `backgroundColor`, `borderRadius`, `filter.blur`, etc.).
  - `KeyframePoint`: timestamp (0% → 100%), track values, and cubic bezier handles (`[x1, y1, x2, y2]`).
  - `AnimationSequence`: name, duration (ms), delay, iteration (`1`, `infinite`, custom), direction (`normal`, `reverse`, `alternate`), fill mode (`forwards`, `both`).
  - `AnimationTrigger`: trigger event (`onMount`, `onScroll`, `onHover`, `onClick`, `onStateChange(var)`, `manual`).
  - `ArchetypeAnimationCompatibility`: defines which property tracks are legal for which `ElementType` (e.g. `image` allows opacity, transform, filter; rejects typography tracks).

### Tier 2: Engine Runtime, Compatibility Evaluator & Output Log Diagnostic Bus (`src/core/engine/`)
- [ ] **Animation Compatibility & Evaluation Engine** (`src/core/engine/animation-validator.ts`):
  - Evaluates whether an `AnimationSequence` can safely apply to a target `ElementType`.
  - **Diagnostic Error Interceptor**: If an animation track targets an unsupported property (e.g. applying a line-height curve to an Image, or a flex-grow track to an Absolute canvas child), the engine:
    1. Intercepts the illegal connection.
    2. Dispatches a formatted error to the **Output Log** (`[ANIM_COMPAT] Error: Track '${track}' cannot bind to archetype '${elementType}'. Valid tracks: ${validTracks.join(', ')}`).
    3. Prevents CSS corruption and marks the track with an inline diagnostic warning in the inspector.
- [ ] **Runtime CSS Keyframe Generator**: Compiles pure TypeScript animation sequences into CSS `@keyframes` and spring transition definitions for instant viewport playback.

### Tier 3: Visual Details Inspector, Keyframe Scrubber & Presets (`src/editor/panels/`)
- [ ] **Animation Library Section** in Details Inspector (`AnimationEditor.tsx`):
  - Preset cards with animated thumbnail preview (Fade, Slide, Bounce, Pulse, Shake, Flip, Zoom, Skeleton Shimmer).
  - Attached animation list with duration scrubbers, trigger pickers, and live play/pause toggles.
- [ ] **Custom Keyframe Timeline Editor** (`KeyframeTimeline.tsx`):
  - Draggable 0%–100% keyframe track with scrubber handle.
  - Per-keyframe property inspector and visual cubic bezier curve editor.
  - Live viewport preview button.
- [ ] **Blueprint Node Linkage**: Expose `PlayAnimation` / `StopAnimation` node connections in Logic Blueprints with quick-jump links from the Details panel.

**New Files:**
- `src/core/types/animations.ts` — Innermost animation schemas and compatibility matrices
- `src/core/engine/animation-validator.ts` — Runtime track evaluator and Output Log diagnostic logger
- `src/editor/panels/details/sections/AnimationEditor.tsx` — Details Inspector Animation sub-panel
- `src/editor/panels/details/controls/KeyframeTimeline.tsx` — Interactive keyframe timeline strip
- `src/editor/panels/details/controls/AnimationPresetCard.tsx` — Preset thumbnail item

**Files Modified:**
- `src/core/types/details.ts` — Add `animations` array to `AssetDetailSchema`
- `src/editor/panels/details/AssetDetailsInspector.tsx` — Integrate Animation section per element registry
- `src/editor/styles/panels.css` — Keyframe timeline, preset cards, bezier handles, and diagnostic badge styles

---

## Phase 2.8: Data Binding & API Connection System (Inside-Out Pipeline)

**Goal**: Connect component properties to external data sources (REST API endpoints, state variables, URL parameters, WebSockets) from the innermost data schema and validation wrappers outward to the Details Inspector configurator. If an API payload type conflicts with a component property, the engine validator dispatches a type mismatch error to the **Output Log**.

**Inside-Out Execution Checklist:**

### Tier 1: Innermost Data Contracts & Binding Schemas (`src/core/types/`)
- [ ] **Data Binding Schemas** (`src/core/types/data-binding.ts`):
  - `BindablePropertyDescriptor`: target property path, required data type (`string`, `number`, `boolean`, `array`, `object`), default value.
  - `DataSourceBinding`: source type (`api`, `state_variable`, `url_param`, `local_storage`, `websocket`), refresh strategy (`once`, `interval`, `onChange`, `realtime`), fallback error value.
  - `ApiEndpointDefinition`: URL with `{params}` interpolation, HTTP method, headers, request body template, response JSONPath extractor, cache TTL.

### Tier 2: Schema Validation Wrapper & Diagnostic Error Interceptor (`src/core/engine/`)
- [ ] **Data Binding Evaluator** (`src/core/engine/binding-validator.ts`):
  - Validates source-to-target compatibility.
  - **Output Log Diagnostics**: When an API endpoint or variable returns a type incompatible with the bound property (e.g. binding an array payload to a boolean `isDisabled` property):
    1. Intercepts the payload mismatch.
    2. Logs a structured diagnostic to the **Output Log** (`[BIND_ERR] Incompatible Type: Cannot bind Array to Boolean property '${propName}' on element '${elementId}'. Use a transform node or check JSONPath query.`).
    3. Emits fallback value to maintain application stability without crashing.

### Tier 3: Details Inspector Data Binding Controls (`src/editor/panels/`)
- [ ] **Data Source Section** in Details Inspector (`DataBindingEditor.tsx`):
  - Searchable list of bindable component properties with connection status badges.
  - Source type selector (`API`, `Variable`, `URL`, `Storage`).
- [ ] **API Endpoint Configurator** (`ApiEndpointConfig.tsx`):
  - Endpoint URL input with parameter chips, method dropdown, header editor, and JSONPath response selector with live preview test.
- [ ] **State Variable Picker** (`StateVariablePicker.tsx`):
  - Searchable variable picker with two-way binding toggle and debounce controls.

**New Files:**
- `src/core/types/data-binding.ts` — Innermost data contracts and binding definitions
- `src/core/engine/binding-validator.ts` — Runtime compatibility evaluator and Output Log logger
- `src/editor/panels/details/sections/DataBindingEditor.tsx` — Details panel data binding editor
- `src/editor/panels/details/controls/ApiEndpointConfig.tsx` — API endpoint configurator modal/card
- `src/editor/panels/details/controls/StateVariablePicker.tsx` — State variable selector palette

**Files Modified:**
- `src/core/types/details.ts` — Add `dataBindings` array to schema
- `src/editor/panels/details/AssetDetailsInspector.tsx` — Integrate Data Binding section per element registry
- `src/editor/styles/panels.css` — API endpoint configurator, JSONPath chips, and binding rows

---

## Phase 2.9: Accessibility & SEO Properties System (Inside-Out Pipeline)

**Goal**: Inspect and enforce accessibility (a11y) and SEO properties from the innermost W3C validation models and audit engine out to the Details Inspector. Missing labels, improper contrast, or semantic mismatches are detected by the engine and logged as actionable diagnostics to the **Output Log**.

**Inside-Out Execution Checklist:**

### Tier 1: Innermost A11y & SEO Schemas (`src/core/types/`)
- [ ] **A11y & SEO Contracts** (`src/core/types/accessibility.ts`):
  - ARIA role specifications, live region modes (`off`, `polite`, `assertive`), keyboard focus matrices.
  - SEO metadata schemas (canonical URLs, OpenGraph tags, JSON-LD structured data).

### Tier 2: Accessibility Engine, Audit Scanner & Output Log Diagnostic Bus (`src/core/engine/`)
- [ ] **A11y Audit Engine** (`src/core/engine/a11y-auditor.ts`):
  - Validates interactive elements against WCAG 2.1 AA rules.
  - **Output Log Diagnostics**: If an interactive element lacks an accessible name or has invalid attributes (e.g. an icon button with no `aria-label` or an image lacking `alt`), the engine:
    1. Intercepts the defect.
    2. Emits an audit diagnostic to the **Output Log** (`[A11Y_WARN] Missing accessible name on element '${elementId}'. Provide aria-label or visible text children.`).
    3. Computes the real-time compliance score (Pass / Warning / Fail).

### Tier 3: Details Inspector Accessibility Controls (`src/editor/panels/`)
- [ ] **Accessibility Section** (`AccessibilityEditor.tsx`):
  - Live audit status badge (Pass / Warning / Fail) with click-to-view diagnostics.
  - ARIA role, label, described-by, live region, and tab-index scrubbers.
- [ ] **SEO Section** (`SeoPropertiesEditor.tsx`):
  - Semantic tag selector (`article`, `section`, `nav`), heading levels, and JSON-LD schema builder.

**New Files:**
- `src/core/types/accessibility.ts` — Innermost A11y & SEO contracts
- `src/core/engine/a11y-auditor.ts` — Runtime audit engine with Output Log integration
- `src/editor/panels/details/sections/AccessibilityEditor.tsx` — A11y section with audit badge
- `src/editor/panels/details/sections/SeoPropertiesEditor.tsx` — Semantic SEO editor

**Files Modified:**
- `src/core/types/details.ts` — Add `accessibility` and `seo` schemas
- `src/editor/panels/details/AssetDetailsInspector.tsx` — Render A11y & SEO sections

---

## Phase 2.10: Graph-Contextual Panel Switching (Blueprint Editor Integration) (Inside-Out Pipeline)

**Goal**: When the Logic Blueprint is opened in full-screen mode, the left and right panels switch to graph-specific content, connecting the innermost node reflection schemas and execution pin contracts out to the Node Details Inspector and Search Palette.

**Inside-Out Execution Checklist:**

### Tier 1: Innermost Node Reflection & Pin Contracts (`src/core/types/`)
- [ ] **Node Reflection Schemas** (`src/core/types/node-reflection.ts`):
  - Exposes node internal states, input pin constraints, execution flow signatures, and variable read/write metadata.

### Tier 2: Pin Compatibility Compiler & Diagnostic Bus (`src/core/engine/`)
- [ ] **Graph Connection Validator** (`src/core/engine/graph-connection-validator.ts`):
  - Evaluates pin connections between nodes. If an invalid connection is attempted (e.g. connecting an execution flow pin to a data value pin, or creating a circular dependency), the compiler logs the violation to the **Output Log** (`[GRAPH_ERR] Illegal pin connection: Execution pin cannot connect to data pin.`).

### Tier 3: Graph Details Inspector & Search Hierarchy (`src/editor/panels/`)
- [ ] **Left Panel — Node Search Palette & Graph Hierarchy Tree**:
  - Searchable node palette and function scope hierarchy.
- [ ] **Right Panel: Selected Node Properties Inspector**:
  - Dynamically inspects the selected Blueprint node's inputs, outputs, and internal parameters.
- [ ] **Multi-Graph Tabs**:
  - Support independent tabs for Event Graph, Construction Script, and custom function graphs.

**New Files:**
- `src/core/types/node-reflection.ts` — Innermost node reflection schemas
- `src/core/engine/graph-connection-validator.ts` — Pin compatibility compiler and Output Log logger
- `src/editor/panels/blueprint/NodeSearchPalette.tsx`
- `src/editor/panels/blueprint/GraphHierarchyTree.tsx`
- `src/editor/panels/blueprint/NodePropertiesInspector.tsx`

**Files Modified:**
- `src/editor/shell/EditorShell.tsx` — Context-aware left/right panel switching
- `src/editor/panels/blueprint/BlueprintCanvas.tsx` — Node selection events and multi-graph tabs

---

## Execution Order & Dependencies

```
Phase 2.1 (UI Polish)
   ↓
Phase 2.2 (Parent Chain + Add)
   ↓
Phase 2.3 (Deep Appearance) ←──→ Phase 2.4 (Deep Typography + Layout)
   ↓                                     ↓
Phase 2.5 (Variable System Upgrade)
   ↓
Phase 2.6 (Context-Aware Sections)
   ↓
Phase 2.7 (Animations) ←──→ Phase 2.8 (Data Binding)
   ↓                              ↓
Phase 2.9 (Accessibility & SEO)
   ↓
Phase 2.10 (Graph Panel Integration)
```

> **Phases 2.3/2.4** and **2.7/2.8** can be parallelized if needed. All other phases are sequential — each builds on the foundation established by the previous phase.

---

## Verification Strategy

After each phase:
1. **TypeScript Clean Build**: `npx tsc --noEmit` must pass with 0 errors
2. **Visual Verification**: Browser subagent captures screenshots of the Details panel at each phase, comparing against UE5 reference screenshots
3. **Interaction Testing**: Each new control (slider, color picker, dropdown, toggle, drag handle) is tested for correct behavior
4. **Responsive Behavior**: The right panel must remain functional at panel widths from 250px to 500px
5. **Performance**: No jank on section collapse/expand, search filter, or variable editing with 20+ variables

---

> **End Goal**: When Phase 2.10 is complete, the Details panel will match UE5's depth — every property, every relationship, every animation, every data binding, every accessibility attribute is visible and editable directly from the inspector. The panel will contextually adapt to the element type and the active editor context (component viewport vs. Blueprint graph).
