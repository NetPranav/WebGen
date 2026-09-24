# PRODUCT REQUIREMENTS DOCUMENT (PRD) — INITIAL PHASE

## Project Name: LazyLayout — AI-Native Motion Design Studio
**Internal Codename:** "Figma for Motion, built with AI"
**Document Version:** 2.0.0
**Phase:** Initial Phase (Motion Element & Effect Studio)
**Status:** Approved direction. Implementation restarts from `ROADMAP.md` v2.0.0 Phase 1.
**Target Platform:** Desktop web (Chrome, Edge, Safari, Firefox)
**Tech Baseline:** Next.js 16 (App Router) / React 19 / TypeScript. Animation engines: CSS & Web Animations API, Motion (`motion/react`, formerly Framer Motion), GSAP 3, SVG, Three.js via React-Three-Fiber, and WebGL shaders. AI: Claude API.
**File Location:** `DOCS/Initial/PRD.md`
**Supersedes:** v1.1.0. The history is in `CHANGELOG.md`. What was actually built under v1.1 is recorded in `AUDIT.md`.

---

## 1. Executive Summary

### 1.1 The Vision
LazyLayout is a **motion design studio where AI builds the first version and helps you refine it, and where designing feels like Figma rather than like writing code.**

A designer or developer can:
1. **Describe** an animation ("a headline whose letters blur in one by one, then shimmer"), or
2. **Draw** it (sketch an oval and get a perfect ellipse; draw a line and it becomes a path the element travels along), or
3. **Pick** it from a library of high-end effects (in the spirit of [React Bits](https://reactbits.dev): split-text reveals, magnetic buttons, aurora backgrounds, 3D tilt cards),

…then tune it visually on a timeline and in a live playground, and **export clean, dependency-honest code** that runs the same way in their own project.

### 1.2 Core Thesis
> *Top-tier web animation today needs three rare skills at once: motion design taste, knowledge of animation engines (GSAP, Motion, SVG, Three.js, shaders), and front-end engineering. LazyLayout collapses all three into one canvas. The AI supplies the engineering and a first draft of the taste, the canvas gives the human direct manipulation, and a rules engine keeps every result valid, fast and accessible.*

### 1.3 What Changed From v1.1 (and Why)
| v1.1 | v2.0 | Why |
|---|---|---|
| The user picks framework, styling and animation engine *before* designing | The user designs first. The engine is **chosen automatically** per animation by the rules engine (§7), and the export target is chosen **at export time** | Designers think in motion, not in libraries |
| 10 fixed archetypes in 4 families | Archetypes stay, plus **Effects**: parametric, prop-driven motion components (§5) | High-end effects (React Bits style) are prop-driven systems, not keyframe lists |
| Keyframes were the only animation model | Keyframes **plus** states, pointer-reactive behaviours, physics, scroll and procedural/shader animation (§6) | Most premium effects are continuous and reactive, not timed |
| "AI" was a rule-based keyword parser | **A real LLM** constrained to the Motion Document schema, with a rule-based offline fallback (§8) | Delivers "base built by AI, helped by AI" |
| Unreal-style dense inspector | **Figma-style** progressive disclosure: *Simple* mode by default, *Pro* on demand (§9) | Design making must be easy |
| No drawing | **Draw-to-design and draw-to-animate** (§9.2) | Sketch an oval and get an ellipse; draw a line and get a motion path or stroke animation |
| Three.js was out of scope | **Three.js / R3F and shader effects are in scope** | Many premium effects are WebGL |
| "Verified" meant unit tests over strings | "Verified" means **compiled, rendered in a browser, and pixel-compared** (§11) | See `AUDIT.md` |

### 1.4 Target Users
| Persona | Needs | Primary entry point |
|---|---|---|
| **Front-end developer** with no motion background | A polished animated hero, button or background quickly, as code they can own | Prompt or Effects Library, then Export |
| **Product / UI designer** used to Figma | Animate without code, hand off something developers accept | Draw, then Timeline, then Share / Export |
| **Motion designer** (After Effects / Rive) | Precise timing, curves, states; web-native output | Timeline Pro, Curve Editor, State Machine |
| **Design engineer** | Build and publish reusable effect components with props | Effect authoring, then Registry export |

### 1.5 Scope Boundary (Initial Phase)
**In scope:** one **Motion Document** containing one hero **Element** or one self-contained **Effect Component**, which may have internal layers (e.g. a card with an image, a title and a glare layer), authored, previewed and exported.

**Out of scope (unchanged from v1.1, see `ROADMAP.md` §8):** multi-page sites, routing, databases, logic blueprints, backend, deployment, real-time collaboration. That code already exists from the full-vision track (`DOCS/After/`). It is **removed from the Initial Phase bundle** (Phase 6), not deleted from the repository.

---

## 2. Product Principles (Non-Negotiable)

1. **Design first, engine second.** The user never has to know which library runs an animation. The Rules Engine (§7) picks one and explains its choice on request.
2. **One document, one truth.** Every surface (canvas, timeline, AI, code view, export) reads and writes the same **Motion Document Model (MDM)**. No parallel models. *(Closes AUD-04.)*
3. **Preview = Export.** What plays on stage is the same engine code that ships. A sampled `evaluate(t)` from the document must match the running preview and the exported build within tolerance. *(Closes AUD-09, AUD-15.)*
4. **AI proposes, human disposes.** Every AI change arrives as a visible diff (ghost layers, ghost keyframes) and merges only on explicit approval. *No Silent AI Writes.*
5. **Rules before UI.** Compatibility, conflict and performance rules live in one executable rule table. The UI only *renders* what the rules allow. *(Inside-Out Law, kept from v1.x.)*
6. **Simple by default, deep on demand.** Every panel has a Simple face (3–7 controls) and a Pro face. Nothing in Simple mode requires animation vocabulary.
7. **Motion must be accessible and fast.** Every animation has a reduced-motion variant and a performance classification (GPU / paint / layout). Layout-thrashing animations are blocked or auto-fixed.
8. **Honest claims.** A feature is only listed as shipped when its Verification Gate passes in a real environment (see `ROADMAP.md` §3).

---

## 3. Mental Model: Figma for Motion

| Figma concept | LazyLayout equivalent | Notes |
|---|---|---|
| Canvas + Frames | **Stage + Artboard** | One artboard per document in the Initial Phase; device frame presets |
| Layers panel | **Layers panel** | Groups, masks, lock and hide; each layer shows its motion badges |
| Pen / Pencil / Shape tools | **Draw tools with shape recognition** | Sketch → clean vector (§9.2) |
| Design panel (right) | **Properties panel** | Simple / Pro faces |
| Prototype tab | **Motion tab** | States, triggers, timeline |
| Smart Animate | **Auto-transition between states** | Spring or tween, chosen by rules |
| Components + Variants | **Effects + States** | Effects expose typed props like component properties |
| Plugins / Community | **Effects Library** | Curated, parametric, exportable |
| Dev Mode | **Code panel + Export** | Framework and engine chosen here, at the end |

---

## 4. Core Concepts (Motion Document Model)

The formal schema is in `SCHEMA_REFERENCE.md` (updated in Phase 2). These are the concepts:

| Concept | Definition |
|---|---|
| **Motion Document** | The root file. Holds the artboard, layers, effects, states, timelines, tokens and export settings. Versioned (`schemaVersion`). |
| **Layer** | A node in the tree. Its kind is one of: `element` (archetype-backed DOM), `vector` (SVG path/shape), `text`, `image`, `group`, `mask`, `scene3d`, `shader`, `effect` (an instance of a library effect). |
| **Archetype** | The semantic type of an element layer (Button, Image, Divider, Background, Text, …). It determines the legal properties and states, and the tag emitted on export. The v1.1 archetypes are kept. |
| **Effect** | A parametric motion component: typed **props** (with defaults, ranges and AI descriptions), internal layers, and a **behaviour** (timeline, reactive, physics, procedural or shader). Example: `SplitTextReveal { splitBy, stagger, from, blur, ease }`. |
| **Track** | A property animated over time on one layer. |
| **Clip** | A reusable group of tracks with a duration, placed on the timeline and triggered by a state or event. |
| **State** | A named snapshot of properties (e.g. `idle`, `hover`, `pressed`, `inView`). Transitions between states are auto-animated. |
| **Trigger** | What starts a clip or state change: `mount`, `hover`, `press`, `focus`, `inView`, `scrollProgress`, `pointerMove`, `drag`, `time`, `custom`. |
| **Behaviour** | A continuous, non-keyframed driver: `follow-pointer`, `magnet`, `tilt`, `spring-to`, `inertia`, `noise`, `loop`, `shader-uniform`. |
| **Rule** | An executable constraint from the Rules Engine (compatibility, conflict, performance, accessibility). |

---

## 5. What Can Be Designed: Families & Effect Categories

### 5.1 Element Families (kept from v1.1)
| Family | Archetypes |
|---|---|
| Interactive | Button, Toggle, Badge/Chip, FAB |
| Media | Image, Icon (SVG) |
| Structural | Divider, Background Layer, Container |
| Text | Text / Heading / Label |

The property surfaces from v1.1 §5 (media, divider, background) stay valid and move into `SCHEMA_REFERENCE.md`.

### 5.2 Effect Categories (new; React Bits-grade target list)
The Effects Library (`ROADMAP.md` Phase 25) must ship **at least 40 effects** across these categories. Each one is built from LazyLayout primitives. Nothing is copied from third-party code (see §12, Licensing).

| Category | Representative effects (target) | Primary engine(s) |
|---|---|---|
| **Text** | Split reveal (chars/words/lines), blur-in, shiny/sheen text, gradient flow, decrypt/scramble, typewriter, rotating words, count-up, scroll-reveal text, variable-font proximity, circular text, glitch, falling letters (physics) | CSS/WAAPI, GSAP, Motion, Canvas |
| **Interaction** | Magnet, click spark, star/electric border, glare hover, tilt (3D), spotlight card, cursor trail, blob cursor, image trail, ripple, pixel/particle trail | Motion (springs), Pointer Behaviours, Canvas |
| **SVG** | Stroke draw, path morph, motion along path, animated logo mark, liquid/gooey blob, animated icons, line-art reveal | SVG + GSAP/WAAPI |
| **Components** | Dock magnification, stacked/bounce cards, flowing/infinite menu, circular gallery, animated list, elastic slider, folder open, counter | Motion (layout + springs) |
| **Backgrounds** | Aurora, silk, waves, dot grid, particles, noise/grain, iridescence, beams/light rays, plasma, grid distortion, hyperspeed | WebGL shader, Canvas 2D, CSS |
| **3D** | Floating object, orbit showcase, 3D card flip, lanyard/physics badge, GLTF hero spin, parallax depth scene | Three.js / R3F |

### 5.3 Effect Contract
Every effect must declare:
1. **Props schema**: typed, with defaults, min/max, units, and a one-line description the AI can read.
2. **Behaviour type(s)**: timeline, state, reactive, physics, procedural or shader.
3. **Engine route**: the default engine plus fallbacks, chosen by the rules (§7).
4. **Reduced-motion variant.**
5. **Performance class and budget**: e.g. "GPU, < 2 ms/frame at 1080p".
6. **Export templates** for each supported target (§10).
7. **A thumbnail** and a **playground scene** (the default props shown in the gallery).

---

## 6. Animation Model Requirements

1. **Keyframe timelines:** multi-track, per-keyframe easing, graph editor, auto-key record mode.
2. **States & transitions:** Figma Smart-Animate style state-to-state interpolation, with per-transition spring or tween settings, plus an optional state machine (Rive-style inputs: boolean, number, trigger).
3. **Reactive behaviours:** pointer position, proximity, velocity, scroll progress, element visibility, drag, device tilt, all mappable to properties through curves.
4. **Physics:** springs (stiffness, damping, mass, velocity handoff), inertia/momentum, simple rigid bodies for "falling" effects.
5. **Procedural & shader:** noise, loops, and GLSL uniforms driven by time, pointer and props.
6. **Text splitting:** by character, word and line, with accessible markup preserved.
7. **SVG:** path editing, morph (with point matching), stroke draw, motion path with auto-rotate, filters, gradients, masks.
8. **3D:** primitives, GLTF, materials, lights, camera and 3D tracks; camera paths.
9. **Scroll:** scroll-linked and scroll-triggered animation, with native CSS scroll-driven timelines where supported and a JS fallback.
10. **Time controls:** global time scale (slow motion), loop, ping-pong, frame snapping, playhead scrubbing of *everything*, including reactive and shader layers, through a virtual pointer and virtual scroll.

---

## 7. Rules Engine & Automatic Engine Routing

The Rules Engine is the executable form of `lazylayout_element_grammer.md` and `ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md`. It answers three questions everywhere in the product:

1. **"Is this allowed?"** Is the property, state, trigger or effect compatible with this layer? (The grammar compatibility matrix.)
2. **"Does it conflict?"** Single Transform Authority, priority arbitration, and one engine owning each property per layer.
3. **"Which engine should run it?"** The routing decision, based on the spec's §12 decision tree:

| Animation shape | Default engine | Why |
|---|---|---|
| Passive loop on transform/opacity/colour | CSS `@keyframes` / WAAPI | Zero JS, compositor thread |
| Gesture, hover, press, drag, layout change | Motion (springs, layout) | Velocity-preserving interruption |
| Orchestrated multi-layer timeline, text split, SVG morph, scroll scrub | GSAP (subject to the §12 licensing gate), otherwise WAAPI + LazyLayout sequencing | Mature sequencing |
| 3D scene | Three.js / R3F | WebGL |
| Full-surface procedural background | WebGL fragment shader (Canvas 2D fallback) | GPU |

The user can override the routing in Pro mode. The Rules Engine then validates the override and explains any trade-off it introduces.

---

## 8. AI System

### 8.1 Roles
| Role | Input | Output |
|---|---|---|
| **Builder** | Text prompt, optional reference image or sketch | A complete Motion Document (layers + effects + motion) as a **proposed diff** |
| **Co-pilot** | Selection plus instruction ("make it bouncier", "stagger from centre", "slower on mobile") | A targeted diff on the selected layers or tracks |
| **Explainer** | Selection | A plain-language description of what the animation does and why this engine was chosen |
| **Fixer** | Rules Engine and performance diagnostics | Auto-fix proposals (e.g. animate `transform` instead of `left`) |
| **Sketch interpreter** | Drawn strokes plus a canvas snapshot | Recognised shapes and UI intent (Phase 38) |

### 8.2 Technical Requirements
- **Model:** Claude API, default `claude-opus-5`. The model ID is one config constant so it can be changed without code edits.
- **Output is schema-constrained:** tool use with `strict: true` and/or structured outputs (`output_config.format`) against the MDM JSON Schema. Free-form code generation is never used for document edits.
- **Every AI output is validated** by the Rules Engine *before* the user sees it. Invalid output is repaired in one automatic retry that feeds the diagnostics back to the model, or it is rejected with an explanation.
- **Streaming**, so ghost layers appear progressively.
- **Prompt caching** of the large, stable prefix (rules, schema, effect catalogue) to keep cost and latency down.
- **Vision input** for reference images, canvas snapshots and sketches.
- **API keys stay server-side** (a Next.js route handler). The browser never holds a key.
- **Offline fallback:** the existing deterministic parsers (`IntentParser`, `MotionAiEngine`) are kept as a no-network mode and as a test oracle.
- **An eval set** (Phase 33) measures validity rate, rule-violation rate, and human acceptance rate of AI proposals.

---

## 9. Design Experience

### 9.1 Simple Mode (default) vs Pro Mode
| Surface | Simple | Pro |
|---|---|---|
| Properties | Position, size, colour, corner radius, one "Motion" card | Full archetype sections, tokens, engine override |
| Motion | Pick a motion card (Fade up, Pop, Magnetic, Draw, Shimmer …) with an **Intensity** and a **Speed** slider | Timeline, graph editor, states, state machine, behaviours |
| AI | Prompt bar ("Describe what you want") | Co-pilot with scope selection, history, explain |
| Export | "Copy React component" | Framework, styling, engine, file layout, registry |

### 9.2 Draw-to-Design & Draw-to-Animate
| The user draws… | LazyLayout produces… |
|---|---|
| A rough oval | A perfect ellipse (vector), fitted by least squares; "keep as drawn" is available |
| A rough rectangle / triangle / star / polygon | A clean shape with snapped corners and right angles |
| A wobbly line | A straightened line, or a smoothed curve if it is clearly curved |
| A freehand path, then "animate" | A **stroke-draw animation** whose timing follows the drawing speed |
| A line *from* an element | A **motion path**: the element travels along it (auto-rotate optional) |
| A circular gesture around an element | A **rotation / orbit** animation |
| A zig-zag over an element | A **delete** gesture (with undo) |
| A rough UI sketch (box + scribble text) | AI-interpreted elements (Button with label, Card …), proposed as a diff |

Recognition must be **instant (< 50 ms) and local** for shapes. Only UI-intent interpretation calls the LLM.

### 9.3 Animation Playground
An isolated, full-screen preview with:
- State toggles and a **props panel** (like Storybook controls).
- Time scale (0.1×–2×).
- A reduced-motion toggle.
- Device frames.
- A light / dark / checkerboard backdrop.
- An FPS and frame-time meter.
- "Compare with export": runs the exported build side by side.

---

## 10. Export Requirements

1. **Targets:** React (TSX) for Next.js App Router and Vite; Vue 3 SFC; vanilla HTML/CSS/JS (Web Component); CSS-only when the animation allows it.
2. **Engine-honest:** export imports only the packages the routed engines need (`motion`, `gsap` + `@gsap/react`, `three` + `@react-three/fiber` + `@react-three/drei`, none for CSS/WAAPI), and lists exact install commands.
3. **Effect export = component with props**, matching the effect's props schema with defaults, typed.
4. **Registry export:** a shadcn-style registry item and `npx`-installable snippet (Phase 28).
5. **Verified:** every export target is type-checked, built, and rendered headlessly in CI, then compared against the in-editor preview (Phase 27).
6. **Zero lock-in:** no imports from LazyLayout in exported code.
7. **Accessibility:** `prefers-reduced-motion` handling, semantic tags, split text that stays readable to screen readers.

---

## 11. Definition of Done (Initial Phase v2)

The Initial Phase is complete when **all** of the following are demonstrated in a real browser and a real build, not only in unit tests:

1. **Prompt → animation.** A new user types a one-sentence prompt, receives a valid animated element or effect as a ghost diff within 20 seconds, accepts it, and plays it.
2. **Draw → animation.** A user draws an oval (it becomes an ellipse), draws a line from it (it becomes a motion path), presses play, and the ellipse travels the path. Then they draw a freehand logo stroke and it becomes a stroke-draw animation.
3. **Library → customise.** A user inserts at least one effect from each §5.2 category, changes props in Simple mode, and sees live results at ≥ 55 fps on a 2020-class laptop (measured in the browser).
4. **Timeline precision.** A user edits keyframes, curves and states in Pro mode, and the scrubbed playhead matches `evaluate(t)` for every layer type, including reactive (virtual pointer) and shader layers.
5. **Export parity.** For every effect in the library and every archetype: the exported React code type-checks, builds with Next 16 and Vite, renders headlessly, and differs from the editor preview by ≤ 1% pixels at 5 sampled times.
6. **Rules.** It is impossible to create an animation the Rules Engine marks invalid. Every blocked action shows a reason and a suggested alternative.
7. **Accessibility.** Every exported animation respects `prefers-reduced-motion`. Text effects stay screen-reader readable.
8. **Health.** `tsc` has 0 errors, lint has 0 errors, CI is green, and `next build` succeeds.

---

## 12. Licensing & Risk Register

| Risk | Mitigation | Owner phase |
|---|---|---|
| The GSAP Standard License "Competitive Products" clause may cover a visual animation builder | Written clarification from GreenSock/Webflow (draft in the animation spec §11) **before** GSAP runs inside the editor. Until then the editor preview uses WAAPI/Motion, and GSAP is available as an **export target only** | 14 |
| React Bits and similar libraries have their own licenses | Treat them as **inspiration only**. Every effect is re-implemented from LazyLayout primitives. The library records the source of each effect's idea, and no third-party code is copied | 25 |
| LLM cost and latency | Prompt caching, compact schema, streaming, per-request budget, offline fallback | 30 |
| WebGL availability and performance on low-end devices | Feature detection, Canvas 2D and static fallbacks, per-effect performance budget | 18, 19, 26 |
| The C++/Wasm kernel adds build complexity for unproven gain | Decision gate in Phase 5, driven by a real browser benchmark; delete the claim or ship the kernel | 5 |

---

## 13. Success Metrics (post-launch)

| Metric | Target |
|---|---|
| Time from blank to exported animated element | Median < 3 minutes |
| AI proposal acceptance rate | ≥ 60% accepted without manual edits |
| AI proposal validity (passes rules on first try) | ≥ 95% |
| Export parity failures | 0 in CI |
| Effects in the library | ≥ 40 at launch |
| Preview frame rate for the library's default scenes | ≥ 55 fps p95 on the reference laptop |
