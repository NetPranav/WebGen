# JSON SCHEMA REFERENCE CONTRACTS — INITIAL PHASE

> **Status:** §0 (Motion Document Model, schema v3) is current and authoritative as of ROADMAP Phase 42. §1–§8 below still describe Initial Phase v1.1 (the `elements` map, `animationStack`, v1 trigger names); they are kept for reference and rewritten in ROADMAP v2 Phase 6.3. Where they conflict with §0, §0 wins.

## Project Name: LazyLayout
**Internal Codename:** "Unreal Engine for Animation & Frontend Design"
**Document Version:** 1.1.0
**Phase:** Initial Phase (Element Animation Studio)
**Status:** Production-Ready Specification
**File Location:** `DOCS/Initial/SCHEMA_REFERENCE.md`

---

## 0. Motion Document Model (MDM, schema v3), authoritative

**Source of truth:** `src/core/document/schema.ts` (Zod). One source produces three outputs:
1. TypeScript types (`MotionDocument`, `Layer`, `Clip`, `Track`, `Keyframe`, `LayerState`, `Behaviour`, …).
2. Runtime validation: `validateMotionDocument(input)` / `parseMotionDocument(input)`, including referential integrity.
3. JSON Schema (draft 2020-12): `getMotionDocumentJsonSchema()`, for the AI layer (ROADMAP Phase 30).

**Units:** times and durations are in **seconds**.

**One property vocabulary (v3, Phase 42):** layer prop keys, state snapshot keys and track `property` values are all canonical paths from `src/core/document/properties.ts` (CONVENTIONS §4 names: `transform.y`, `appearance.opacity`, `appearance.background.color`, `typography.fontSize`, …). Each path declares its value type, unit, default, CSS mapping, compositing class, animatability and owning archetypes; a key that is unknown, or not a property of the layer's archetype, fails validation with the closest valid path suggested. Props are stored flat: `properties: { "content.text": "Hi", "typography.fontSize": 24 }`.

### 0.1 Shape

```text
MotionDocument
  schemaVersion: 3
  layers         Record<id, Layer>          // top-level layers are frames (v2's document-level artboard moved onto them)
  clips          Record<id, Clip>          // a layer's animation stack = its clips, in insertion order
  states         Record<id, LayerState>
  behaviours     Record<id, Behaviour>
  tokens         { colors, spacing, radii }
  exportSettings { framework, styling, animation, language }   // was project `target` in v1

Layer      { id, name, archetype, parentId | null, children[], visible?, locked?, properties: Props }
Props      = Record<CanonicalPath, PropValue>   // geometry included: frame.x|y|width|height|rotation, sizing.horizontal|vertical, positioning
Clip       { id, layerId, name, type, trigger, duration, delay?, easing, repeat? (-1 = loop),
             enabled, locked?, scrollTrigger?, stagger?, tracks: Track[] }
Track      { id, property, muted?, locked?, keyframes: Keyframe[] }
Keyframe   { id, time, value: PropValue, ease? }
LayerState { id, layerId, name, props }
Behaviour  { id, layerId, type, enabled, params }
PropValue  = string | number | boolean | null | PropValue[] | { [key]: PropValue }   // JSON data only
```

- **Layer kind** (PRD §4: element, vector, text, image, group, mask, scene3d, shader, effect) is *derived* from `archetype` through the registry (`getLayerKind`); it is not stored, so it cannot disagree with the archetype.
- **Clip `type`:** `entrance | hover | tap | scroll | loop | morph`.
- **Triggers** (PRD §4): `mount | hover | press | focus | inView | scrollProgress | pointerMove | drag | time | custom`.
- **Behaviour `type`:** `follow-pointer | magnet | tilt | spring-to | inertia | noise | loop | shader-uniform`.
- **Geometry** (every visual layer, stored sparsely under its canonical paths; `getLayerGeometry()` resolves the rest): `frame { x, y, width, height, rotation }` in parent space, `sizing { horizontal, vertical: fixed | hug | fill }`, `positioning: absolute | flow`. Defaults: a top-level layer is an `absolute` frame at 0,0 sized 1440×900 that fills horizontally and hugs vertically; a child `flow`s and hugs; an explicit width or height implies `fixed`. `frame.*` is layout; the animated offset is `transform.*` (decision `decisions/0003-geometry-vs-transform.md`).

### 0.2 Integrity rules (enforced by the validator)
1. Every entity is stored under its own `id`.
2. `parentId` points at an existing layer that lists this layer in `children`. Every child exists and points back. No duplicate children and no cycles.
3. Every clip, state and behaviour belongs to an existing layer.
4. Props are JSON data; the key `__proto__` is rejected (JS object copying would silently drop it).
5. Every prop key, state key and track path is a canonical path legal for its layer's archetype.
6. Geometry values are typed: `frame.*` are finite numbers; `sizing.*`, `positioning` and the `frame.*Unit` companions come from their closed sets.

### 0.3 Archetype registry
`src/core/document/registry.ts` is the single table for all 20 archetypes (10 PRD starting archetypes, `input`/`form`/`generic`, 4 SVG, 3 3D). Each entry gives its kind, family (or none), ID prefix, export tag, grammar type (for legal states), Details Inspector sections and default props. Grammar types with no archetype yet are listed in `RESERVED_GRAMMAR_TYPES`.

### 0.4 IDs
New entities use `createId(prefix)` → `<prefix>_<8 hex>` from `crypto.getRandomValues` (`elem_btn_3f8a109c`, `clip_…`, `trk_…`, `kf_…`). Existing ids are kept as they are.

### 0.5 Versions & migration
`loadDocument()` (`src/core/document/migrations`) accepts any version and migrates one step at a time (v1 → v2 → v3). **v2 → v3** renames every prop key and track path onto its canonical path (per archetype: a v2 `color` is text colour on a button but line colour on a divider), splits legacy objects (`filter`, `overlay`, `focalPoint`, 3D `material`) and v1 style blocks into leaf paths, rescales image `opacity` 0–100 → 0–1 (keyframes too), splits CSS length strings into number + unit (`"100%"` → `frame.width: 100`, `frame.widthUnit: "%"`), and moves a non-default artboard size onto the top-level frames. Anything with no meaning on its layer is dropped and reported. **v1 → v2:** v1 `elements` become `layers`, and each `properties.animationStack` / top-level `animationStack` entry becomes a clip. Legacy triggers map to v2 (`onMount→mount`, `onHover→hover`, `onClick→press`, `onScroll→scrollProgress`, `ambient→time`). Unknown archetypes become `generic`, broken tree links are repaired, and missing ids are generated. Documents from a newer schema are refused. Every snapshot load (history, version control, saved projects, demo) goes through it.

### 0.6 Writing
Only through `documentCommands` (`src/core/store/useDocumentStore.ts`): typed commands (`addLayer`, `removeLayer`, `updateProps`, `moveLayer`, `addClip`, `setLayerClips`, `addTrack`, `setKeyframe`, `addState`, `applyDiff`, …), each an Immer recipe that yields **patches + inverse patches**. `applyDiff` validates before applying. The commands are the property-name boundary: whatever key a caller passes, only canonical, archetype-legal paths are stored (a legacy name is renamed; an unknown key is dropped with a dev warning). Readers use `propReader(props)` / `readProps(layer, view)`, which accept only canonical paths at compile time.

---

## 1. Overview

This document specifies the declarative JSON schema contracts that govern all serialized data in LazyLayout's Initial Phase.

Every schema defined here is strictly validated at runtime by Zod / TypeScript contracts before committing to the project store or code emitter. Archetype-specific fragments (§3.1–3.4) are validated with a **discriminated union on `archetype`**, so a small model implementing this need only switch on that one field to know which optional block (`media`, `divider`, `background`) is required.

---

## 2. Project Manifest Schema (`project.json`)

The root manifest defining the project metadata and target tech stack. In the Initial Phase, `scope` is always `"element"` — the field exists (and is validated) because `component` and `page` are real future values per `ROADMAP.md`, but the Home Screen (`PRD.md` §6) never allows selecting them yet.

```json
{
  "$schema": "https://motion-studio.dev/schemas/project-v1.json",
  "id": "proj_98a7df8a",
  "name": "AnimatedHeroImage",
  "version": "1.0.0",
  "scope": "element",
  "rootArchetype": "image",
  "target": {
    "framework": "nextjs-app",
    "styling": "tailwind",
    "animation": "gsap",
    "language": "typescript"
  },
  "rootElementId": "elem_img_a71b290d",
  "timelines": [
    "tl_hover_01",
    "tl_scroll_01"
  ],
  "createdAt": "2026-09-17T12:00:00Z",
  "updatedAt": "2026-09-17T12:15:00Z"
}
```

### Supported Values
* `scope`: `"element"` (only value reachable in the Initial Phase; `"component"` | `"page"` are reserved for later phases and must be rejected by the Home Screen, not by this schema).
* `rootArchetype`: `"button" | "toggle" | "badge" | "fab" | "image" | "icon" | "divider" | "background" | "container" | "text"`
* `target.framework`: `"nextjs-app"` | `"nextjs-pages"` | `"react-vite"` | `"vue"` | `"svelte"` | `"vanilla"`
* `target.styling`: `"tailwind"` | `"vanilla-css"` | `"css-modules"` | `"styled-components"`
* `target.animation`: `"gsap"` | `"framer-motion"` | `"svg-native"` | `"hybrid"`
* `target.language`: `"typescript"` | `"javascript"`

---

## 3. Element AST Schema (`element.json`)

Defines a visual UI node, its layout properties, styling tokens, child relationships, and — depending on `archetype` — exactly one of the archetype-specific fragments in §3.1–3.4.

```json
{
  "id": "elem_btn_01",
  "name": "Primary Action Button",
  "archetype": "button",
  "tag": "button",
  "layout": {
    "display": "flex",
    "direction": "row",
    "justify": "center",
    "align": "center",
    "gap": "8px",
    "padding": { "top": "12px", "right": "24px", "bottom": "12px", "left": "24px" },
    "margin": { "top": "0px", "right": "0px", "bottom": "0px", "left": "0px" }
  },
  "transform": {
    "x": 0, "y": 0, "z": 0,
    "scale": 1.0,
    "rotate": 0,
    "origin": { "x": "50%", "y": "50%" }
  },
  "appearance": {
    "background": { "type": "solid", "color": "#206859" },
    "border": { "width": "1px", "style": "solid", "color": "rgba(255, 255, 255, 0.2)" },
    "radius": { "topLeft": "12px", "topRight": "12px", "bottomRight": "12px", "bottomLeft": "12px" },
    "shadows": [{ "x": 0, "y": 8, "blur": 24, "spread": -4, "color": "rgba(32, 104, 89, 0.35)" }]
  },
  "children": [
    {
      "id": "elem_icon_01",
      "name": "Sparkle Icon",
      "archetype": "icon",
      "tag": "svg",
      "svg": {
        "viewBox": "0 0 24 24",
        "strokeWidth": 2,
        "stroke": "#FFFFFF",
        "fill": "none",
        "path": "M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z"
      }
    },
    {
      "id": "elem_text_01",
      "name": "Button Label",
      "archetype": "text",
      "tag": "span",
      "typography": {
        "fontFamily": "Inter, sans-serif",
        "fontSize": "15px",
        "fontWeight": 600,
        "lineHeight": "20px",
        "color": "#FFFFFF"
      },
      "content": "Get Started Free"
    }
  ]
}
```

### 3.1 Image Archetype Fragment (`archetype: "image"`)

Adds a required `media` block. `layout`, `transform`, and `appearance` are still present and behave as in the base schema above.

```json
{
  "id": "elem_img_a71b290d",
  "name": "Animated Hero Image",
  "archetype": "image",
  "tag": "img",
  "media": {
    "src": "/assets/hero-mountain.jpg",
    "objectFit": "cover",
    "focalPoint": { "x": 50, "y": 40 },
    "filter": { "grayscale": 0, "blur": 0, "brightness": 1.0, "contrast": 1.0, "saturate": 1.0 },
    "clipPath": "inset(0% 0% 0% 0%)",
    "overlay": { "color": "#0F172A", "opacity": 0, "blendMode": "normal" }
  },
  "transform": { "x": 0, "y": 0, "z": 0, "scale": 1.0, "rotate": 0, "origin": { "x": "50%", "y": "50%" } },
  "appearance": {
    "radius": { "topLeft": "16px", "topRight": "16px", "bottomRight": "16px", "bottomLeft": "16px" },
    "shadows": []
  }
}
```

### 3.2 Divider Archetype Fragment (`archetype: "divider"`)

Adds a required `divider` block. `divider.gradient` is present only when `divider.style === "gradient"`.

```json
{
  "id": "elem_divider_c40a19f2",
  "name": "Animated Section Divider",
  "archetype": "divider",
  "tag": "svg",
  "divider": {
    "orientation": "horizontal",
    "length": "100%",
    "thickness": 2,
    "style": "gradient",
    "color": "#206859",
    "gradient": {
      "stops": [
        { "offset": 0, "color": "#206859" },
        { "offset": 1, "color": "#10B981" }
      ],
      "angle": 0
    },
    "strokeDashoffset": 0,
    "capStyle": "round"
  }
}
```

### 3.3 Background Layer Archetype Fragment (`archetype: "background"`)

Adds a required `background` block. Exactly one of `color` / `gradient` / `image` / `noise` is meaningful, selected by `background.type`.

```json
{
  "id": "elem_bg_91af02cd",
  "name": "Animated Gradient Backdrop",
  "archetype": "background",
  "tag": "div",
  "background": {
    "type": "linear-gradient",
    "color": null,
    "gradient": {
      "stops": [
        { "offset": 0, "color": "#0F172A" },
        { "offset": 1, "color": "#206859" }
      ],
      "angle": 135
    },
    "image": null,
    "parallax": { "speed": 0.4 },
    "blendMode": "normal",
    "noise": { "opacity": 0.05, "scale": 1.2 }
  }
}
```

### 3.4 Text Archetype Fragment (`archetype: "text"`)

Uses the base `typography` + `content` fields already shown in the button example's child node above; no additional block is required.

---

## 4. Animation Timeline Schema (`timeline.json`)

Defines a multi-track motion sequence with triggers, playback behavior, and keyframes. `property` values must match one of the dot-paths in `CONVENTIONS.md` §4, and are validated against the target element's `archetype` (a `background.parallax.speed` track cannot legally target an `elem_img_` element).

```json
{
  "id": "tl_hover_01",
  "name": "Card Hover Lift & Glow",
  "trigger": { "type": "hover", "targetElementId": "elem_btn_01", "reverseOnLeave": true },
  "duration": 0.4,
  "iterationCount": 1,
  "tracks": [
    {
      "id": "trk_btn_scale",
      "elementId": "elem_btn_01",
      "property": "transform.scale",
      "engine": "gsap",
      "keyframes": [
        { "time": 0.0, "value": 1.0, "easing": "linear" },
        { "time": 0.4, "value": 1.05, "easing": { "type": "cubic-bezier", "points": [0.25, 1, 0.5, 1] } }
      ]
    },
    {
      "id": "trk_icon_rotate",
      "elementId": "elem_icon_01",
      "property": "transform.rotate",
      "engine": "gsap",
      "keyframes": [
        { "time": 0.0, "value": 0, "easing": "linear" },
        { "time": 0.4, "value": 45, "easing": "back.out(1.7)" }
      ]
    }
  ]
}
```

### 4.1 Example: Image Scroll-Parallax Track
```json
{
  "id": "tl_scroll_01",
  "name": "Hero Image Parallax",
  "trigger": { "type": "scroll", "targetElementId": "elem_img_a71b290d", "reverseOnLeave": false },
  "duration": 1.0,
  "iterationCount": 1,
  "tracks": [
    {
      "id": "trk_img_y",
      "elementId": "elem_img_a71b290d",
      "property": "transform.y",
      "engine": "gsap",
      "keyframes": [
        { "time": 0.0, "value": -40, "easing": "linear" },
        { "time": 1.0, "value": 40, "easing": "linear" }
      ]
    }
  ]
}
```

### 4.2 Example: Divider Draw-In Track
```json
{
  "id": "tl_scroll_02",
  "name": "Divider Draw-In on Scroll",
  "trigger": { "type": "scroll", "targetElementId": "elem_divider_c40a19f2", "reverseOnLeave": false },
  "duration": 0.8,
  "iterationCount": 1,
  "tracks": [
    {
      "id": "trk_divider_dash",
      "elementId": "elem_divider_c40a19f2",
      "property": "divider.strokeDashoffset",
      "engine": "gsap",
      "keyframes": [
        { "time": 0.0, "value": 1000, "easing": "linear" },
        { "time": 0.8, "value": 0, "easing": "power2.out" }
      ]
    }
  ]
}
```

### 4.3 Example: Background Gradient Drift Track
```json
{
  "id": "tl_ambient_01",
  "name": "Backdrop Gradient Drift",
  "trigger": { "type": "mount", "targetElementId": "elem_bg_91af02cd", "reverseOnLeave": false },
  "duration": 8.0,
  "iterationCount": -1,
  "tracks": [
    {
      "id": "trk_bg_angle",
      "elementId": "elem_bg_91af02cd",
      "property": "background.gradient.angle",
      "engine": "gsap",
      "keyframes": [
        { "time": 0.0, "value": 135, "easing": "sine.inOut" },
        { "time": 8.0, "value": 495, "easing": "sine.inOut" }
      ]
    }
  ]
}
```
`iterationCount: -1` denotes an infinite loop, used for ambient background motion that is not tied to a discrete user trigger.

---

## 5. ScrollTrigger Configuration Schema (`scrolltrigger.json`)

Defines viewport scroll boundaries and scrubbing behavior. Used by Image (parallax), Divider (scroll reveal), and Background (parallax) archetypes as well as any element's entrance animation.

```json
{
  "id": "st_section_entrance",
  "triggerElementId": "elem_bg_91af02cd",
  "start": "top 80%",
  "end": "bottom 20%",
  "scrub": 0.8,
  "pin": false,
  "markers": false,
  "stagger": { "amount": 0.3, "from": "start", "ease": "power1.inOut" }
}
```

---

## 6. Framer Motion Spring Physics Schema (`spring.json`)

Defines physical spring parameters for Framer Motion transitions.

```json
{
  "type": "spring",
  "stiffness": 400,
  "damping": 25,
  "mass": 0.8,
  "restDelta": 0.001,
  "restSpeed": 0.001
}
```

---

## 7. SVG Path Morph & Stroke-Draw Schema (`svg-morph.json`)

Defines vector path morphing between two matching SVG path strings (Icon), or a straight-line stroke-draw (Divider, when `divider.style` requires the SVG line emitter — see `PRD.md` §7.4).

```json
{
  "id": "svg_morph_play_pause",
  "elementId": "elem_icon_play",
  "property": "svg.path",
  "startPath": "M8 5v14l11-7z",
  "endPath": "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
  "duration": 0.3,
  "easing": "power2.inOut"
}
```

---

## 8. Export Configuration & Manifest Schema (`export-manifest.json`)

Defines how the project is compiled into production files for external integration.

```json
{
  "componentName": "AnimatedHeroImage",
  "outputDirectory": "./exported",
  "files": [
    { "filename": "AnimatedHeroImage.tsx", "role": "component", "language": "typescript" },
    { "filename": "useImageMotion.ts", "role": "animation-hook", "language": "typescript" },
    { "filename": "README.md", "role": "instructions", "language": "markdown" }
  ],
  "npmDependencies": {
    "gsap": "^3.12.5",
    "next": "^15.0.0"
  }
}
```