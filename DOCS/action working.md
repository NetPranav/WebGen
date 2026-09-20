# Deep-Dive Research & World Environment Specification
## Industry Animation Standards & 52 World Environment Properties

**File**: `DOCS/action working.md`  
**Purpose**: Synthesizing modern animation sequencing, interactive element design patterns (Figma, Framer, Rive, After Effects, Unreal Engine 5, GSAP), and formalizing the master matrix of **52 World Environment Properties** that govern both canvas viewport mechanics and the live element authoring experience.

---

# Part 1: Industry Research — How Top Tools Structure Interactive Element Design

When an engineer or designer authors an interactive element—such as an **animated button**, a **modal card**, or a **dynamic navigation bar**—the canvas is never just a passive drawing board. The **World Environment** acts as the operating system for the design, providing physics, spatial constraints, theme tokens, motion timing, and diagnostic overlays.

Below is an architectural breakdown of how the industry's premier tools tackle this:

```
+--------------------------------------------------------------------------------------------------+
|                                    WORLD ENVIRONMENT SYSTEM                                      |
+------------------------------------+------------------------------------+------------------------+
| 1. Figma (Interactive Components)  | 2. Framer (Motion Engine)          | 3. Unreal Sequencer    |
| - Variants & State Triggers        | - MotionConfig (Global Transition) | - Global Time Dilation |
| - Smart Animate Physics            | - Drag Constraints & Momentum      | - Transform Spaces     |
| - Layout Grid Snapping             | - Layout Animations (layoutId)     | - Physics Friction &   |
| - Prototype Frame Environment      | - Spring Mechanics (k, c, m)       |   Collision Channels   |
+------------------------------------+------------------------------------+------------------------+
| 4. Rive & After Effects            | 5. GSAP (GreenSock Animation)      | 6. Spline (3D World)   |
| - State Machines & Blend Trees     | - Global Timeline Defaults         | - World Gravity & Fog  |
| - Temporal vs Spatial Curves       | - Stagger Distribution Logic       | - Global Lighting/HDRI |
| - Pointer Event Listeners          | - Scroller Proxies & Pinning       | - Camera Projections   |
+------------------------------------+------------------------------------+------------------------+
```

---

### 1. Figma: Interactive Components & Smart Animate Architecture
Figma's animation system operates on declarative state transitions between component variants:
- **Interaction Triggers**: `onHover`, `whilePressing`, `onDrag`, `mouseEnter/Leave`, `touchDown/Up`, `delay`, `key/gamepad`.
- **Smart Animate Interpolation**: Matches layer names and hierarchies across frames to compute interpolated vectors, colors, radii, and positions.
- **Motion Math**:
  - Classic Bezier: `cubic-bezier(x1, y1, x2, y2)` with handles.
  - Spring Dynamics: Parameterized by **Stiffness** ($k$, typically 100–300), **Damping Ratio** ($\zeta$, 0.5–1.0), and **Mass** ($m$).
- **Canvas Environment Role**:
  - Frame clipping: `clip content` bounds.
  - Constraints & Auto Layout: Elements respond to resizing of parent frames (`hug`, `fill`, `fixed`).
  - Layout Grids: Column/row grids with gutters and margins that elements magnetically attract to.

---

### 2. Framer: Production React Motion & Layout Physics
Framer is built directly atop Framer Motion, making its canvas properties map 1:1 to production code:
- **Motion Component Props**: `initial`, `animate`, `exit`, `whileHover`, `whileTap`, `whileDrag`, `whileFocus`, `whileInView`.
- **Global `MotionConfig`**: Wraps the entire canvas or page, establishing global transition policies:
  ```tsx
  <MotionConfig transition={{ type: "spring", stiffness: 200, damping: 25 }} reducedMotion="user">
    <CanvasWorld />
  </MotionConfig>
  ```
- **Drag & Gesture Physics**:
  - `dragConstraints`: Elastic boundary resistance (rubber-banding).
  - `dragMomentum`: Physics momentum decay on release.
  - `dragElastic`: Resistance factor when pulling past boundaries.
- **Shared Layout Animations (`layoutId`)**: Elements morph smoothly across different layout positions without manual keyframing.
- **Scroll-Linked Transformations**: `useScroll` and `useTransform` map scroll delta percentages directly to element scale, rotation, and opacity.

---

### 3. Rive & After Effects: State Machines, Blend Trees & Timelines
Rive and After Effects bridge visual design and game-engine runtime logic:
- **State Machine Architecture**:
  - **Inputs**: Booleans, Numbers, and Triggers that drive state switches.
  - **Transitions**: Conditional gates that fire when inputs meet criteria.
  - **Blend Trees (1D / 2D)**: Dynamically blends animations based on variable inputs (e.g. blending a button from idle to hover to active based on cursor velocity).
- **Temporal vs. Spatial Interpolation**:
  - **Temporal**: Speed curves in the Graph Editor (value vs time).
  - **Spatial**: Curvature of the motion path in world coordinate space ($X, Y$ bezier handles).
- **Pointer Listeners**: Elements register mouse tracking, hover coordinates, and pointer velocities relative to world coordinate space.

---

### 4. Unreal Engine 5: Sequencer & World Settings
UE5 provides the ultimate reference for how "World Settings" empower individual actors:
- **World Time Dilation**: Global multiplier ($0.0$ to $10.0$) scaling all actor physics and animation playback simultaneously (indispensable for scrubbing micro-animations).
- **Transform Spaces**:
  - **World Space**: Coordinates relative to absolute $(0, 0, 0)$.
  - **Parent Space**: Coordinates relative to parent container.
  - **Local Space**: Coordinates relative to element pivot/anchor.
- **Keyframe Snapping**: Snapping to frames (24/30/60/120 FPS), subframes, or audio sample clocks.
- **Curve Tangent Types**: Hermite cubic spline, Auto-clamped, Broken tangents, Weighted tangents, Constant step.

---

### 5. GSAP (GreenSock): Timelines, Defaults & Stagger Logic
- **Global Timeline Defaults**: `gsap.defaults({ duration: 0.4, ease: "power2.out" })` ensures design consistency across hundreds of elements.
- **ScrollTrigger**:
  - Pinning (`pin: true`, `anticipatePin: 1`).
  - Scrub smoothing (e.g. `scrub: 1` creates a 1-second lag/smoothing behind the scrollbar).
- **Stagger Distribution Engines**: Grid-based staggers (`from: "center"`, `from: "edges"`, `from: "random"`).
- **Transform Origin Normalization**: `transformOrigin: "50% 50%"` ensuring rotation and scaling pivots are visually intuitive.

---

# Part 2: Concrete Case Study — Designing an Interactive Animated Button

Let us trace what an engineer or designer actually experiences when building a **Modern Animated Button** (e.g., a high-converting CTA with hover glow, tactile push, and async loading spinner), and how the **World Environment** shapes every micro-interaction:

```
                                  [ ANIMATED BUTTON ANATOMY ]
                                  
       Hover / Mouse Entry                  Click / Active Push               Async Action State
  +--------------------------+          +--------------------------+     +--------------------------+
  |  (Glow Halo Expands)     |          |  (Spring Compress 0.96x) |     |  (Text Fades -> Spinner) |
  |   +------------------+   |          |   +------------------+   |     |   +------------------+   |
  |   | [>] Get Started  |   |  ----->  |   | [>] Get Started  |   | --> |   |  ( \ ) Loading   |   |
  |   +------------------+   |          |   +------------------+   |     |   +------------------+   |
  |  (Shadow Lifts +4px)     |          |  (Shadow Compresses)     |     |  (Disabled Cursor Guard) |
  +--------------------------+          +--------------------------+     +--------------------------+
               ^                                      ^                               ^
               |                                      |                               |
    [World Env: Hover Physics]             [World Env: Spring Scale]       [World Env: Loading Bus]
    - defaultInteractiveFeedback           - globalSpringStiffness         - elementLockingBehavior
    - ambientGlowColor                     - globalSpringDamping           - touchTargetSafetyGuide
```

### 1. Creation & Theme Token Inheritance
- **The Problem**: If every button requires manual configuration of corner radius, font family, padding, and dark-mode colors, authoring is agonizingly slow and inconsistent.
- **World Environment Solution**:
  - The button automatically inherits `environment.defaultCornerRadius` (e.g., `12px`), `environment.globalFontFamily` (`"Inter"`), and `environment.inheritedThemePalette` (`"cyber_indigo"`).
  - Changing the World Palette from `"Cyber Dark"` to `"Clean Light"` immediately updates the button's background, border contrast, and text tokens without touching the button itself.

### 2. Spatial Placement & Canvas Alignment
- **The Problem**: When moving the button into a hero section, the author needs to know if it is aligned with the headline, centered on the page, and evenly spaced from the secondary button.
- **World Environment Solution**:
  - `snapToGrid`: Magnetically pulls the button to the active grid increment.
  - `snapToElementGeometry`: Pink smart guide lines light up when the button's horizontal center aligns with the headline's center.
  - `showDistanceHUD`: A numeric pill badge `32px` appears between the primary CTA and secondary CTA.
  - `dragAutoReparent`: Dragging the button over the `<HeroSection />` container illuminates a frosted drop zone and automatically nests the button inside the hero layout hierarchy.

### 3. Interactive State Physics (Hover, Press, Active)
- **The Problem**: The button needs to feel physically responsive and alive.
- **World Environment Solution**:
  - `defaultInteractiveFeedback`: Configures whether interactive elements exhibit `subtle_lift` (+2px Y translation, shadow expansion) or `scale_pop` (1.04x scale).
  - `elementCollisionBehavior`: Governs whether the expanding button pops above neighboring elements (`pass_through`) or gently pushes adjacent items in a flex row (`smart_push`).

### 4. Motion Sculpting & Time Dilation
- **The Problem**: Designing a 200ms spring-bounce on click is impossible to visually evaluate when running at full speed in real time.
- **World Environment Solution**:
  - `globalTimeScale`: The author sets the world time scale to `0.25x` (slow motion). The button's click animation, spring compression, and loading spinner state transition now play in smooth quarter-speed slow motion, letting the author visually inspect easing curvature and overshoot.
  - `globalSpringStiffness` ($k = 180$) & `globalSpringDamping` ($c = 24$): Provide the default physical harmonic oscillator constants for the button's tactile return bounce.

### 5. Accessibility & Mobile Touch Targets
- **The Problem**: Buttons on canvas often look great on desktop but fail accessibility guidelines on mobile (smaller than Apple's 44×44pt or Android's 48×48dp guidelines).
- **World Environment Solution**:
  - `touchTargetSafetyGuide`: Renders a translucent 44×44px bounding halo around the button if its physical hit-box is smaller than the minimum accessible target area.
  - `reducedMotionPolicy`: Allows the author to preview how the button behaves when `prefers-reduced-motion` is active (switching bounce scaling into clean opacity transitions).

---

# Part 3: The 52 World Environment Properties Master Matrix

Below is the exhaustive specification of all **52 World Environment Properties**, categorized into 8 functional pillars:

---

## Pillar 1: Viewport Camera & Canvas Navigation (6 Properties)
| # | Property Key | Type & Values | Default | How it Shapes Element & Authoring Experience |
|---|--------------|---------------|---------|---------------------------------------------|
| 1 | `viewportPanEnabled` | `boolean` | `true` | **Viewport Draggable**: Master toggle to allow camera panning across the infinite design canvas. |
| 2 | `viewportPanTrigger` | `"space_drag" \| "middle_mouse" \| "right_click" \| "any_blank_drag"` | `"space_drag"` | The exact mouse/keyboard gesture that pans the camera vs box-selecting elements. |
| 3 | `panInertiaFriction` | `number` (`0.0` to `1.0`) | `0.4` | Friction decay applied when releasing canvas drag. `0.0` stops instantly; `0.8` glides smoothly. |
| 4 | `viewportZoomEnabled` | `boolean` | `true` | Locks or unlocks canvas zoom via trackpad pinch and Ctrl+Wheel. |
| 5 | `zoomSensitivity` | `number` (`0.25x` to `3.0x`) | `1.0` | Multiplier for zoom speed responsiveness. |
| 6 | `zoomBounds` | `{ min: number, max: number }` | `{ min: 10, max: 400 }` | Hard minimum and maximum scale bounds (10% to 400%). |

---

## Pillar 2: Spatial Coordinate Matrix & Visual Grid (7 Properties)
| # | Property Key | Type & Values | Default | How it Shapes Element & Authoring Experience |
|---|--------------|---------------|---------|---------------------------------------------|
| 7 | `gridMatrixStyle` | `"dots" \| "lines" \| "crosses" \| "isometric" \| "subdivided" \| "none"` | `"dots"` | The geometric matrix pattern rendered beneath elements. |
| 8 | `gridBaseSize` | `number` (`8`, `12`, `16`, `24`, `32`, `48`, `64`) | `24` | Primary grid cell spacing in world pixels; provides the base rhythm for element dimensions. |
| 9 | `gridMajorInterval` | `number` (`0`, `4`, `8`, `10`) | `4` | Accents every $N$th line/dot to represent macro increments (e.g. 96px macro blocks). |
| 10 | `gridMatrixColor` | `string` (hex/rgba) | `"rgba(148, 163, 184, 0.22)"` | Base color and opacity for standard grid dots/lines. |
| 11 | `gridMajorColor` | `string` (hex/rgba) | `"rgba(99, 102, 241, 0.45)"` | Accent color and opacity for major subdivision marks. |
| 12 | `adaptiveOctaveLOD` | `boolean` | `true` | **Adaptive LOD**: Uses octave modulo folding so grid dots never clutter into soup or disperse into blankness. |
| 13 | `isometricProjectionAngle` | `30 \| 45 \| 60` | `30` | Projection slant angle for 2.5D axonometric / isometric web apps. |

---

## Pillar 3: World Origin, Center Guides & Coordinate Crosshairs (6 Properties)
| # | Property Key | Type & Values | Default | How it Shapes Element & Authoring Experience |
|---|--------------|---------------|---------|---------------------------------------------|
| 14 | `showWorldAxes` | `boolean` | `true` | Renders the infinite $X$ and $Y$ world coordinate axes intersecting at $(0, 0)$. |
| 15 | `axesStrokeColor` | `string` (hex/rgba) | `"rgba(99, 102, 241, 0.35)"` | Tint and gradient opacity of the world axis guide lines. |
| 16 | `axesLineStyle` | `"solid" \| "gradient_fade" \| "dashed" \| "dotted"` | `"gradient_fade"` | Visual geometry of the axis lines extending infinitely from $(0, 0)$. |
| 17 | `originMarkerStyle` | `"transparent_reticle" \| "minimal_dot" \| "crosshair_ring" \| "hidden"` | `"transparent_reticle"` | The icon/shape placed exactly at world $(0, 0)$ origin. |
| 18 | `originMarkerSize` | `16 \| 20 \| 24 \| 32` | `24` | Diameter of the center origin indicator in pixels. |
| 19 | `originCoordinateReadout` | `boolean` | `false` | Toggles whether the small numeric label `(0, 0)` displays below the origin marker. |

---

## Pillar 4: Element Dragging, Collision & Spatial Transform Rules (7 Properties)
| # | Property Key | Type & Values | Default | How it Shapes Element & Authoring Experience |
|---|--------------|---------------|---------|---------------------------------------------|
| 20 | `elementDragEnabled` | `boolean` | `true` | **Element Draggable**: When `true`, elements can be dragged across canvas; when `false`, elements are locked against accidental displacement. |
| 21 | `dragOrthogonalLock` | `"free" \| "shift_ortho" \| "isometric"` | `"shift_ortho"` | Holding Shift restricts element dragging strictly along $X$, $Y$, or isometric diagonal axes. |
| 22 | `elementAutoReparenting` | `boolean` | `true` | **Auto-Hierarchy Nesting**: Dragging an element over a container highlights the drop target and nests the element inside. |
| 23 | `elementCollisionBehavior` | `"pass_through" \| "smart_push_siblings"` | `"pass_through"` | Elements either layer freely (`pass_through`) or dynamically push sibling elements in the layout flow (`smart_push`). |
| 24 | `dragBoundingClamping` | `"infinite" \| "clamp_to_device" \| "clamp_to_parent"` | `"infinite"` | Prevents elements from being lost in infinite space by constraining movement within parent/viewport bounds. |
| 25 | `transformAnchorPreset` | `"top_left" \| "center" \| "bottom_center" \| "custom"` | `"center"` | The rotational and scaling pivot anchor point inherited by newly authored elements. |
| 26 | `multiSelectMarqueeMode` | `"touching_intersection" \| "fully_enclosed"` | `"touching_intersection"` | Marquee drag selection policy: selects anything touching the box vs only items fully enclosed. |

---

## Pillar 5: Snapping Physics, Alignment & Distance HUD (7 Properties)
| # | Property Key | Type & Values | Default | How it Shapes Element & Authoring Experience |
|---|--------------|---------------|---------|---------------------------------------------|
| 27 | `snapToGridMatrix` | `boolean` | `true` | Magnetically snaps element edges and anchors to grid lines during dragging or resizing. |
| 28 | `snapToElementGeometry` | `boolean` | `true` | **Smart Guides**: Emits laser alignment lines when an element aligns with neighbor centers, edges, or baselines. |
| 29 | `snapMagneticDistance` | `number` (`4px`, `8px`, `12px`, `16px`) | `8` | The magnetic capture threshold in screen pixels before snapping engages. |
| 30 | `showDistanceHUD` | `boolean` | `true` | **Live Distance Badges**: Displays real-time numeric pixel callouts (e.g. `24px`) between adjacent elements. |
| 31 | `snapRotationInterval` | `0 \| 15 \| 30 \| 45 \| 90` | `15` | Quantizes rotation angles when using rotation handles on stage. |
| 32 | `snapDistributionEqual` | `boolean` | `true` | Detects and snaps when 3+ elements share equal spacing gaps (e.g. navbar items, card grids). |
| 33 | `snapGuideColor` | `string` (hex) | `"#EC4899"` | The accent color of smart guide alignment lasers (Figma pink `#EC4899`, Indigo `#6366F1`, Emerald `#10B981`). |

---

## Pillar 6: Global Theme Inheritance & Design System DNA (7 Properties)
| # | Property Key | Type & Values | Default | How it Shapes Element & Authoring Experience |
|---|--------------|---------------|---------|---------------------------------------------|
| 34 | `inheritedThemePalette` | `"cyber_indigo" \| "emerald_tech" \| "slate_modern" \| "clean_light" \| "custom"` | `"cyber_indigo"` | Active color palette token set inherited by all elements for background, surface, text, and accents. |
| 35 | `defaultCornerRadius` | `0 \| 6 \| 12 \| 16 \| 24 \| 9999` | `12` | Corner radius inherited by newly dropped buttons, cards, containers, and badges. |
| 36 | `defaultGlassmorphism` | `"none" \| "frosted_subtle" \| "frosted_deep"` | `"frosted_subtle"` | Backdrop filter blur and translucent border styling inherited by new cards and modals. |
| 37 | `globalFontFamily` | `"Inter" \| "Space Grotesk" \| "Outfit" \| "JetBrains Mono"` | `"Inter"` | Typography typeface inherited across all newly created headings, buttons, and body text. |
| 38 | `globalTypographicScale` | `1.200 \| 1.250 \| 1.333 \| 1.414 \| 1.618` | `1.250` | Modular type scale ratio defining the progression from H1 down to small captions. |
| 39 | `defaultElevationShadow` | `"none" \| "subtle_float" \| "medium_elevation" \| "dramatic_pop"` | `"subtle_float"` | Ambient drop shadow elevation applied to floating cards, dropdowns, and buttons. |
| 40 | `defaultInteractiveFeedback` | `"subtle_lift" \| "glow_accent" \| "scale_pop" \| "tactile_push" \| "none"` | `"subtle_lift"` | Built-in hover/active micro-animation automatically applied to interactive buttons and links. |

---

## Pillar 7: Global Motion Sequencer, Timing & Spring Physics (7 Properties)
| # | Property Key | Type & Values | Default | How it Shapes Element & Authoring Experience |
|---|--------------|---------------|---------|---------------------------------------------|
| 41 | `globalTimeScale` | `0.1 \| 0.25 \| 0.5 \| 1.0 \| 2.0` | `1.0` | **Master Time Dilation**: Scales animation playback speed for all element keyframes and physics simultaneously (slow-mo authoring). |
| 42 | `defaultTransitionCurve` | `"Power2.out" \| "Power4.inOut" \| "Spring" \| "Bounce" \| "Linear"` | `"Power2.out"` | Default easing curve assigned when animating an element property. |
| 43 | `globalSpringStiffness` | `number` (`50` to `400`) | `180` | Default spring oscillator stiffness ($k$) defining acceleration toward target values. |
| 44 | `globalSpringDamping` | `number` (`5` to `60`) | `24` | Default spring friction ($c$) controlling bounce overshoot vs critical dampening. |
| 45 | `globalSpringMass` | `number` (`0.5` to `3.0`) | `1.0` | Inertial mass ($m$) scaling weight and settling duration of physical elements. |
| 46 | `reducedMotionPolicy` | `"respect_os" \| "force_reduced_motion" \| "force_full_motion"` | `"respect_os"` | Simulates accessibility motion preferences directly inside the canvas stage. |
| 47 | `animationFrameSnapping` | `"120_fps" \| "60_fps" \| "30_fps" \| "audio_sample"` | `"120_fps"` | Quantization frame rate for sequencer timeline scrubbing and keyframe snapping. |

---

## Pillar 8: Viewport Diagnostics, Element HUD & Atmosphere (5 Properties)
| # | Property Key | Type & Values | Default | How it Shapes Element & Authoring Experience |
|---|--------------|---------------|---------|---------------------------------------------|
| 48 | `elementBoundingWireframes` | `"always" \| "hover_only" \| "selected_only"` | `"hover_only"` | Renders subtle boundary wireframes so transparent containers remain easily visible and clickable. |
| 49 | `elementBoxModelOverlay` | `boolean` | `true` | Color-coded box model display (Blue: Content, Green: Padding, Orange: Margin) on selected elements. |
| 50 | `elementDimensionsHUD` | `boolean` | `true` | Floating readout badge (`W: 240 × H: 48`) displayed beside elements during dragging and resizing. |
| 51 | `elementArchetypeBadges` | `boolean` | `false` | Displays archetype tags (`[Button]`, `[Hero]`, `[Card]`) above elements for instant structural recognition. |
| 52 | `touchTargetSafetyGuide` | `boolean` | `true` | Highlights elements that fall below the minimum 44×44px mobile touch target accessibility standard. |

---

# Part 4: Interactive UI Architecture & Selection Plan

To make these 52 properties intuitive, frictionless, and instant to access, they will be surfaced through three integrated touchpoints:

```
+-----------------------------------------------------------------------------------------------+
|                                      STUDIO WORKSPACE                                         |
+------------------------------+----------------------------------+-----------------------------+
| LEFT OUTLINER                | CENTER VIEWPORT                  | RIGHT DETAILS INSPECTOR     |
|                              |                                  |                             |
| 🌍 World Environment <-------+-- [Top-Right Quick Popover]      | [ World Environment Mode ]  |
|   |- Container               |    [ ⚙️ Settings ]                |  > 1. Viewport & Camera     |
|   |   |- Animated Button     |    [ 🎯 Recenter ]                |  > 2. Grid & Coordinates    |
|   |   `- Heading             |    [ 🌍 World Options ] -------->|  > 3. Element Drag Physics  |
|                              |                                  |  > 4. Snapping & Guides     |
|                              |  (Clicking empty canvas space    |  > 5. Design System Tokens  |
|                              |   switches inspector to World)   |  > 6. Motion & Spring       |
|                              |                                  |  > 7. Viewport Overlays     |
+------------------------------+----------------------------------+-----------------------------+
```

### 1. Right Details Inspector ("World Environment" Context)
- **Automatic Contextual Trigger**: When no element is selected (clicking empty canvas space or pressing `Escape`), or when clicking the `🌍 World Environment` node in the outliner, the right Details panel automatically switches to the **World Environment Inspector**.
- **Collapsible Accordion Groups**:
  1. 🖱️ **Element Dragging & Physics**: `elementDragEnabled`, `dragOrthogonalLock`, `elementAutoReparenting`, `elementCollisionBehavior`, `dragBoundingClamping`.
  2. 🧲 **Snapping & Distance HUD**: `snapToGridMatrix`, `snapToElementGeometry`, `snapMagneticDistance`, `showDistanceHUD`, `snapRotationInterval`.
  3. 🎨 **Theme Tokens & Design System**: `inheritedThemePalette`, `defaultCornerRadius`, `defaultGlassmorphism`, `globalFontFamily`, `defaultInteractiveFeedback`.
  4. ⚡ **Motion Sequencer & Spring Physics**: `globalTimeScale`, `defaultTransitionCurve`, `globalSpringStiffness`, `globalSpringDamping`, `reducedMotionPolicy`.
  5. 📐 **Diagnostic Overlays & Accessibility**: `elementBoundingWireframes`, `elementBoxModelOverlay`, `elementDimensionsHUD`, `touchTargetSafetyGuide`.
  6. 🌐 **Viewport Camera & Grid Matrix**: `viewportPanEnabled`, `gridMatrixStyle`, `gridBaseSize`, `showWorldAxes`, `worldBackdropColor`.

### 2. Viewport Floating Quick-Toggle Popover
- Directly below the Settings gear and Recenter focus button at top-right:
  - Button with `<Globe size={14} />` or `<Sliders size={14} />` icon.
  - Clicking opens a micro popover for the 6 most frequently toggled properties:
    - `Element Draggable`: `ON / OFF`
    - `Viewport Draggable`: `ON / OFF`
    - `Grid Style`: `Dots | Lines | Crosses | None`
    - `Snap to Elements`: `ON / OFF`
    - `Distance HUD`: `ON / OFF`
    - `Time Scale`: `0.25x | 0.5x | 1.0x | 2.0x`

### 3. Outliner Tree `🌍 World Environment` Root
- Pinned at the very top of `OutlinerTree.tsx` as the ultimate root node.
- Clicking it immediately highlights it and loads the full World Environment Inspector.

---

# Part 5: Next Steps & Selection Gate

This document serves as the foundational design reference. We can now select the priority tiers from this 52-property matrix to activate in the active codebase:
1. **Tier 1 (Core Canvas & Dragging Mechanics)**: Properties 1–12, 14–23, 27–30.
2. **Tier 2 (Theme Inheritance & Element Defaults)**: Properties 34–40.
3. **Tier 3 (Motion Sequencer & Time Dilation)**: Properties 41–47.
4. **Tier 4 (Diagnostic Overlays & Accessibility HUD)**: Properties 48–52.
