# PRODUCT REQUIREMENTS DOCUMENT (PRD) — INITIAL PHASE

## Project Name: LazyLayout — AI-Native Motion Design Studio
**Internal Codename:** "Figma for Motion, built with AI"
**Document Version:** 2.4.0
**Phase:** Initial Phase = Release 1 (Motion & Interactive Effects Studio). Releases 2 (Sites) and 3 (Apps) are planned in `ROADMAP.md` §8.
**Status:** Approved direction. Implementation restarts from `ROADMAP.md` v2.0.0 Phase 1.
**v2.1 (2026-09-26):** After a production-readiness review (`ROADMAP.md` §4.2), v2.1 adds:
- the Reactive Effects Engine: interactive backgrounds, cursors, particles and shaders that react to pointer, scroll, touch and sound (§5.4);
- Interaction Blueprints (Unreal-style visual logic);
- imported code components;
- a release plan.

The engine is specified in `INTERACTIVE_EFFECTS_ENGINE_SPECIFICATION.md`.

**v2.2 (2026-09-26):** Adds **kinetic composition** (§1.1 item 6, §4, §6 item 14, §11 criterion 13), so users can *build* interactions from primitives, not only pick finished effects:
- invisible helper layers;
- pins that choose which point of a shape follows the mouse;
- one-click Split of text into letters, words or lines;
- cloners;
- fields and effectors;
- colliders and bodies with Blueprint contact events.

The reference build is "letters flee an invisible cursor circle" (`INTERACTIVE_EFFECTS_ENGINE_SPECIFICATION.md` §12.7; `ROADMAP.md` Track K).

**v2.3 (2026-09-26):** Adds principle 9, **Visual first, no maths** (§2). Its controls vocabulary is `INTERACTIVE_EFFECTS_ENGINE_SPECIFICATION.md` §13.4. v2.3 also adds criterion 13's no-numbers condition and a 10-build composition test suite (`ROADMAP.md` 91.7), so "similar" interactions are tested, not assumed.

**v2.4 (2026-09-26):** GPU memory is budgeted, not only GPU contexts: a ledger with per-tier budgets, texture and simulation limits, three.js disposal, and leak and soak tests. WebGL is used only where an effect needs it, and three.js only for real 3D (§12; `INTERACTIVE_EFFECTS_ENGINE_SPECIFICATION.md` §7.8–§7.9).
**Target Platform:** The editor runs on desktop web (Chrome, Edge, Safari, Firefox). Exported code runs on desktop and mobile browsers (`ROADMAP.md` Phase 84).
**Tech Baseline:** Next.js 16 (App Router) / React 19 / TypeScript. Animation engines: CSS & Web Animations API, Motion (`motion/react`, formerly Framer Motion), SVG, Three.js via React-Three-Fiber, WebGL shaders, and LazyLayout's own kernel and runtime. *(v2.1)* GSAP 3 is an opt-in **export target** only, never an editor engine (§12; the replacement map is in `ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md` §11.4). AI: Claude API.
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
4. **Make it react** *(v2.1)* in one step: "the background bends toward the cursor", "the grid ripples on click", "calmer when scrolled", with a sensible touch behaviour chosen for phones, or
5. **Bring it** *(v2.1)*: import an animated React component they already have and get inspector controls for its props, or
6. **Compose it** *(v2.2)* from primitives, the way Unreal users build with actors, components and Blueprints. For example:
   - make an invisible circle that follows the mouse by the exact point they choose;
   - split a card's text into letters with one click;
   - add a rule so that the letters flee the circle instead of entering it and spring back home.

   Nothing is a preset; every part and every value is theirs to change,

…then tune it visually on a timeline and in a live playground, wire interactions as simple rules or Blueprint graphs *(v2.1)*, and **export clean, dependency-honest code** that runs the same way in their own project.

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
| *(v2.1)* Interactive effects were one shader phase | A **Reactive Effects Engine**: signals, bindings, a budgeted GPU compositor, Shader Graph, particles, simulations, cursor layers, effects as data (§5.4) | The pitch is interactive effects made easy; the v2.0 grammar couldn't express them (`AUDIT.md` AUD-45) |
| *(v2.1)* Logic Blueprints were out of scope | **Interaction Blueprints** for the document's own UI logic: Simple "When → Do" rules and a Pro Unreal-style graph over one model | "Wix + Figma + Unreal Blueprint" is the product; data/API logic stays in Release 3 |
| *(v2.1)* One release | **Three releases**: 1 Motion & Interactive Effects Studio, 2 Sites, 3 Apps | So that finishing the roadmap means the intended product, operated in production (`ROADMAP.md` §4.2) |

### 1.4 Target Users
| Persona | Needs | Primary entry point |
|---|---|---|
| **Front-end developer** with no motion background | A polished animated hero, button or background quickly, as code they can own | Prompt or Effects Library, then Export |
| **Product / UI designer** used to Figma | Animate without code, hand off something developers accept | Draw, then Timeline, then Share / Export |
| **Motion designer** (After Effects / Rive) | Precise timing, curves, states; web-native output | Timeline Pro, Curve Editor, State Machine |
| **Design engineer** | Build and publish reusable effect components with props | Effect authoring, then Registry export |

### 1.5 Scope Boundary (Initial Phase = Release 1)
**In scope:** one **Motion Document** containing one hero **Element**, one self-contained **Effect Component**, or one component-sized composition such as a hero section built from several layers. Any of these may have internal layers (e.g. a card with an image, a title and a glare layer), and is authored, previewed and exported. *(v2.1)* Release 1 also covers:
- interactive effects, including backgrounds, cursor layers, particles and simulations (§5.4);
- **interaction logic** for the document's own layers (Interaction Blueprints: states, compositions, effects, variables);
- imported **code components**;
- **embed-script** export;
- *(v2.2)* **kinetic composition**: helper layers, pins and follow, one-click Split and cloners, fields and effectors, colliders and bodies.

**Later releases (v2.1, see `ROADMAP.md` §8):**
- **Release 2 (Sites)**: components with variants and instances, sections, multi-page sites, routing, content collections, forms, site export, accounts and sharing.
- **Release 3 (Apps)**: databases, data/API/backend Blueprints, deployment infrastructure, real-time collaboration and plugins, once the After-track code (`DOCS/After/`) has been audited (`ROADMAP.md` Phase 87).

The After-track code already exists. It is **removed from the Initial Phase bundle** (Phase 6), not deleted from the repository.

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
9. *(v2.3)* **Visual first, no maths.** Anything a user can make can be made without typing a number or a formula:
   - **points and distances** are dragged on the canvas (which point follows the mouse, how far the push reaches, the gap);
   - **motion feel** is chosen by feel (Bounce, Time, Smoothness, Strength, Variety);
   - **ranges** are drawn over live meters ("when the cursor is 0–200 px away → scale 1.2 → 1.0").

   The engine does the maths: spring constants, coordinate spaces, collision geometry. Pro mode shows the numbers for those who want them (`ROADMAP.md` Law 17).

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
| Prototype interactions *(v2.1)* | **Interactions** | Simple "When → Do" rules; the same model opens as an Unreal-style Blueprint graph (Pro) |
| Code layers *(v2.1)* | **Code components** | Your own React component with inferred controls, sandboxed in the editor |
| Shader fills *(v2.1)* | **Effect surfaces** | Interactive: they react to pointer, scroll, touch and sound through signals, within a GPU budget |

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
| **Signal** *(v2.1)* | A continuous input sampled once per frame: pointer, hover/proximity of a layer, scroll, view progress, time, audio, device tilt, state, prop, variable. |
| **Binding** *(v2.1)* | `signal \|> operators -> target`: a continuous, deterministic mapping from a signal to a property, shader uniform, simulation parameter or state input, with a blend mode (replace, add, multiply, max). |
| **Affordance** *(v2.1)* | A named reaction an effect supports (follow, bend, repel, ripple, glow, tilt, burst …). The one-step Reactivity card lists affordances; each one is a binding recipe. |
| **Surface** *(v2.1)* | Where an effect draws (background, inline, overlay, cursor, texture source), with a fallback chain ending in a poster, a touch behaviour and a reduced-motion behaviour. |
| **Interaction Blueprint** *(v2.1)* | A typed event graph (events → flow → actions) for discrete logic. Simple mode shows it as "When → Do" rules. |
| **Code Component** *(v2.1)* | An imported React component whose props become inspector controls; it runs in a sandbox in the editor. |
| **Input Tape** *(v2.1)* | Signals recorded or authored over time, so reactive effects can be scrubbed, rendered and tested deterministically. |
| **Helper Layer** *(v2.2)* | An invisible, logic-only layer (like an Unreal trigger volume or an After Effects null). It is never rendered in Preview or export, but it still follows, collides and fires events. |
| **Pin** *(v2.2)* | A named point on a layer (a preset such as bottom-centre, or a custom point, even outside the box). A Follow uses a pin to decide which point sits on the mouse; the anchor is the pin used for rotation and scale. |
| **Split / Clone Group** *(v2.2)* | Text split with one click into letter, word or line layers, or a layer cloned into a grid, ring, path or scatter. Each piece is a real layer that knows its `index`, `home` (rest position) and seeded `random`. |
| **Field & Effector** *(v2.2)* | A falloff shape (a field) that changes other layers by distance (an effector): keep out, push, attract, swirl, scale, rotate, recolour, jitter; targets spring back home. |
| **Collider & Body** *(v2.2)* | 2D physics for any layer. Colliders give shape and collision layers; bodies are static, kinematic (moved by the user's motion) or dynamic (pushed, with a spring home). Contacts fire Blueprint events such as `OverlapBegin` and `Hit`. |
| **Tag** *(v2.2)* | A free-form label on a layer, so one rule can target "every layer tagged `letter`". |

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
The Effects Library (`ROADMAP.md` Phase 25) must ship **at least 40 effects** across these categories. **(v2.1) Raised to at least 80 at the Release 1 beta.** The increase comes from the three categories added at the bottom of the table:
- **Interactive backgrounds:** at least 20, of which at least 15 react to the pointer.
- **Cursor & pointer:** at least 10.
- **Image & text distortion:** at least 8. Each one is built from LazyLayout primitives, and from v2.1 each one is an `EffectDefinition` built on the effects engine (§5.4). Nothing is copied from third-party code (see §12, Licensing).

| Category | Representative effects (target) | Primary engine(s) |
|---|---|---|
| **Text** | Split reveal (chars/words/lines), blur-in, shiny/sheen text, gradient flow, decrypt/scramble, typewriter, rotating words, count-up, scroll-reveal text, variable-font proximity, circular text, glitch, falling letters (physics) | CSS/WAAPI, GSAP, Motion, Canvas |
| **Interaction** | Magnet, click spark, star/electric border, glare hover, tilt (3D), spotlight card, cursor trail, blob cursor, image trail, ripple, pixel/particle trail | Motion (springs), Pointer Behaviours, Canvas |
| **SVG** | Stroke draw, path morph, motion along path, animated logo mark, liquid/gooey blob, animated icons, line-art reveal | SVG + GSAP/WAAPI |
| **Components** | Dock magnification, stacked/bounce cards, flowing/infinite menu, circular gallery, animated list, elastic slider, folder open, counter | Motion (layout + springs) |
| **Backgrounds** | Aurora, silk, waves, dot grid, particles, noise/grain, iridescence, beams/light rays, plasma, grid distortion, hyperspeed | WebGL shader, Canvas 2D, CSS |
| **3D** | Floating object, orbit showcase, 3D card flip, lanyard/physics badge, GLTF hero spin, parallax depth scene | Three.js / R3F |
| **Interactive backgrounds** *(v2.1)* | Shader fields that follow or bend toward the cursor; dot and shape grids that repel and ripple; particle fields that attract, repel or burst; fluid and ribbon backgrounds; scroll-reactive fields | WebGL2 via the surface compositor (WebGPU opt-in), Canvas 2D fallback |
| **Cursor & pointer** *(v2.1)* | Spring followers, trails, liquid splash, blobs, target brackets, magnetic snap, image trails, click sparks | Cursor layer + particles/simulations |
| **Image & text distortion** *(v2.1)* | Hover displacement, pixel/dither transitions, halftone reveals, glass/lens, wave text | Texture sources + shader passes, SVG-filter fallback |

### 5.3 Effect Contract
Every effect must declare:
1. **Props schema**: typed, with defaults, min/max, units, and a one-line description the AI can read.
2. **Behaviour type(s)**: timeline, state, reactive, physics, procedural or shader.
3. **Engine route**: the default engine plus fallbacks, chosen by the rules (§7).
4. **Reduced-motion variant.**
5. **Performance class and budget**: e.g. "GPU, < 2 ms/frame at 1080p".
6. **Export templates** for each supported target (§10).
7. **A thumbnail** and a **playground scene** (the default props shown in the gallery).
8. *(v2.1)* **Affordances:** the reactions it supports (follow, bend, repel, ripple, glow, tilt, burst …), each a binding recipe the Reactivity card can offer.
9. *(v2.1)* **A touch behaviour** (tap, drag, autopilot, gyro or static) and **a reduced-motion behaviour** (freeze, calm or off).
10. *(v2.1)* **A fallback chain** ending in a static poster (WebGPU → WebGL2 → Canvas 2D/SVG/CSS → poster) and a **device-tier cost**.
11. *(v2.1)* **A runtime size budget** for its export, and **provenance** (inspiration source, originality checklist).

### 5.4 Interactive Effects: the Pitch *(v2.1)*
People already copy React Bits-style components to get a background that reacts to the cursor, a cursor that splashes, or a grid that ripples on click. Then they do the production work themselves. LazyLayout makes those effects **one-step** (pick an effect, choose "Cursor → Bend"), **editable** (props, states, timeline scrub with recorded pointer input), **wireable** (Interaction rules and Blueprints), and **production-hardened on export**. On export, one frame loop and one input listener serve every effect on the page. The rest is part of each effect:
- GPU contexts within a budget;
- pausing offscreen;
- device tiers;
- touch and reduced-motion behaviours;
- poster-first loading;
- a vendored, readable runtime with no LazyLayout dependency.

The engine, its grammar and its rules are in `INTERACTIVE_EFFECTS_ENGINE_SPECIFICATION.md` and `lazylayout_element_grammer.md` §13. The work is `ROADMAP.md` Track X.

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
11. *(v2.1)* **Signals & bindings:** any continuous input can drive any animatable property, uniform or state input through deterministic, frame-rate-independent operator chains. Reactions on one channel compose (add, multiply, max) instead of fighting.
12. *(v2.1)* **Stateful simulation:** fluid, particles, spring lattices, ropes and rigid bodies run at a fixed step with seeded randomness. In the editor they replay from input tapes, so they scrub, render and test deterministically.
13. *(v2.1)* **Interaction logic:** events → flow → actions (play/seek compositions, set states and variables, burst particles, spring properties), as Simple rules or a Pro graph.
14. *(v2.2)* **Kinetic composition:** any layer can be a helper, follow something by any pin, be split or cloned into indexed pieces, carry a field that influences other layers, or become a collider or physics body. Overlaps and hits are Blueprint events, and "keep out" is a hard guarantee: a target is never drawn inside the shape that repels it.

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
| Orchestrated multi-layer timeline, text split, SVG morph, scroll scrub | WAAPI + LazyLayout sequencing (v2.1: GSAP only as an opt-in *export* target while the §12 licensing gate is open) | Mature sequencing without a licence dependency |
| 3D scene | Three.js / R3F through the surface compositor (WebGPU via TSL opt-in, WebGL2 baseline) | WebGL, within the context budget |
| Full-surface procedural background | WebGL2 fragment shader through the surface compositor, with a Canvas 2D/CSS/poster fallback chain | GPU |
| *(v2.1)* Pointer-, scroll- or sound-reactive continuous motion | Signal bindings writing transforms, CSS variables or uniforms (one input bus, one clock) | Deterministic, composable, no per-component listeners |
| *(v2.1)* Stateful simulation (fluid, particles, lattices) | GPU surface simulations, with deterministic replay in the editor | Scrubbable, testable, renderable |

The user can override the routing in Pro mode. The Rules Engine then validates the override and explains any trade-off it introduces. *(v2.1)* No default route may require GSAP (see §12).

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
| **Effect author** *(v2.1)* | Prompt or reference image/video | A new interactive effect as a shader graph, particle stack and bindings, compiled and render-checked before it appears as a ghost diff (Phase 70) |
| **Interaction builder** *(v2.1)* | "When the button is clicked, burst confetti and flip the card" | Interaction rules / Blueprint graph patches as a ghost diff (Phase 73) |

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
| Reactivity *(v2.1)* | A "Reacts to" card: Cursor / Scroll / Hover on… / Touch / Sound, each offering the effect's affordances with **Strength** and **Smoothness** | Signals panel (binding graph), Shader Graph, particle stack, input tapes |
| Interactions *(v2.1)* | "When → Do" rules in plain language | Blueprint graph with debugger (pulses, breakpoints, watches) |
| Compose *(v2.2)* | Right-click **Split into letters**; **Role: Helper**; **Follow** with a pin picked on the canvas; rules like "while *A* overlaps *B* → keep it outside" | Field and effector stacks, collider layers and masks, body parameters, "Show collision" debug view, per-piece attributes in graphs |

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

1. **Targets:** React (TSX) for Next.js App Router and Vite; Vue 3 SFC; vanilla HTML/CSS/JS (Web Component); CSS-only when the animation allows it. *(v2.1)* An **embed script** (framework-free) for Webflow, Framer, Wix, WordPress and plain HTML.
2. **Engine-honest:** export imports only the packages the routed engines need (`motion`, `gsap` + `@gsap/react`, `three` + `@react-three/fiber` + `@react-three/drei`, none for CSS/WAAPI), and lists exact install commands.
3. **Effect export = component with props**, matching the effect's props schema with defaults, typed.
4. **Registry export:** a shadcn-style registry item and `npx`-installable snippet (Phase 28).
5. **Verified:** every export target is type-checked, built, and rendered headlessly in CI, then compared against the in-editor preview (Phase 27).
6. **Zero lock-in:** no imports from LazyLayout in exported code.
7. **Accessibility:** `prefers-reduced-motion` handling, semantic tags, split text that stays readable to screen readers.
8. *(v2.1)* **Interactive effects ship production-hardened.** The export copies a small, readable runtime into the user's project; there is no LazyLayout package. That runtime brings:
   - one frame loop and one input listener for every effect on the page;
   - GPU contexts within a budget;
   - a poster first and lazy initialisation (CLS 0);
   - pausing offscreen;
   - device tiers;
   - touch and reduced-motion behaviours;
   - cleanup on unmount;
   - a size budget per effect family (`ROADMAP.md` Phase 69).
9. *(v2.1)* **Interactions compile to plain code**: React hooks, Vue composables or vanilla listeners, readable and commented, with no LazyLayout imports (Phase 74).

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
9. *(v2.1)* **Interactive in one step.** A new user inserts an interactive background, makes it react to the cursor, and picks a touch behaviour in Simple mode in under 2 minutes. It then scrubs on the timeline with a recorded pointer tape.
10. *(v2.1)* **Interactive export.** Every interactive-background, cursor and distortion effect meets four checks: it exports (React, Vue, Web Component, embed script); it replays the editor's input tape within tolerance; it meets its size budget; and it holds its tier budget on a mid-tier phone.
11. *(v2.1)* **Interactions.** A user builds "hovering the CTA makes the background glow; clicking bursts particles and flips a card" as Simple rules, then opens it as a Blueprint graph. The exported code behaves identically.
12. *(v2.1)* **Bring your own.** A user imports an animated React component they own, gets controls for its props, binds one prop to the cursor, and exports it. In the editor, the component cannot reach the editor's storage or cookies.
13. *(v2.2)* **Compose.** A first-time user builds the reference interaction from primitives in under 5 minutes, with no code, no preset and *(v2.3)* no typed numbers. They draw a circle, make it an invisible helper, and have it follow the mouse by a pin they pick. They put text on a card, split it into letters with one click, and add a rule: while the circle overlaps a letter, keep the letter outside it with a random spin; when it stops, spring it home. Four checks must pass:
    - no letter is ever drawn inside the circle;
    - the letters return home within 3 s;
    - the text is read once by assistive technology;
    - the same rule opens as a Blueprint graph, and the export behaves identically, including on touch.

    *(v2.3)* The 10 similar builds of `ROADMAP.md` 91.7 pass the same way. They include a magnetic dot grid, a cursor chain, falling and throwable letters, eyes that look at the cursor, scroll scatter, confetti made of the user's own shape, a tilting card grid, an orbit and a hit counter with sound.

---

## 12. Licensing & Risk Register

| Risk | Mitigation | Owner phase |
|---|---|---|
| The GSAP Standard License "Competitive Products" clause may cover a visual animation builder. *(v2.1, checked 2026-09-26: its "Prohibited Uses" explicitly cover GSAP "in tools that allow users to build visual animations without code" that compete with Webflow's visual animation building.)* | Written clarification from GreenSock/Webflow (draft in the animation spec §11) **before** GSAP runs inside the editor. Until then the editor preview uses WAAPI/Motion, and GSAP is available as an **export target only**. *(v2.1)* No default route or library effect may require GSAP; GSAP export is opt-in (`LICENSES.md` GATE-01) | 8, 14, 85 |
| React Bits and similar libraries have their own licenses | Treat them as **inspiration only**. Every effect is re-implemented from LazyLayout primitives. The library records the source of each effect's idea, and no third-party code is copied | 25 |
| LLM cost and latency | Prompt caching, compact schema, streaming, per-request budget, offline fallback | 30 |
| WebGL availability and performance on low-end devices | Feature detection, Canvas 2D and static fallbacks, per-effect performance budget | 18, 19, 26 |
| The C++/Wasm kernel adds build complexity for unproven gain | Decision gate in Phase 5, driven by a real browser benchmark; delete the claim or ship the kernel | 5 |
| *(v2.1)* Browsers cap live WebGL contexts (Chrome: 16 on desktop, 8 on Android) and silently drop the oldest | One surface compositor owns every context, within a per-page budget; posters cover released surfaces | 61 |
| *(v2.1)* Stateful simulations aren't a pure function of time, which breaks scrub, parity and render | Fixed-step, seeded simulation with input tapes and snapshot replay | 64 |
| *(v2.1)* User-supplied code (code components, shaders, expressions) could attack the editor or other users | Opaque-origin sandboxes, typed bridges, strict CSP, shader limits, a threat model before any of it ships | 68, 80 |
| *(v2.1)* Imported components may carry licences that forbid redistribution (e.g. React Bits' "MIT + Commons Clause") | Licence detection on import; such components stay private to the user's project and never reach templates or a marketplace | 68, 85 |
| *(v2.1)* Competition: Figma shipped Figma Motion (timeline with CSS/React/video export) and parameterized shader fills at Config 2026; interactive shaders were announced as "coming soon" | Differentiate on effects that **react**, **interaction logic** (Blueprints) and **verified, production-hardened export**; reach the first interactive effect early (ROADMAP §5.1 critical path) | 59–71 |
| *(v2.1)* GPU driver crashes, thermal throttling and memory kills on phones | Device tiers, dynamic resolution, 10-minute soak tests, remote kill switches per effect family. *(v2.4)* Also: a GPU/canvas **memory ledger with per-tier budgets** (T1 96 MB, T2 256 MB, T3 512 MB initially); tier-sized, GPU-compressed textures; pooled low-resolution simulation targets; three.js disposal rules; Safari canvas limits; leak tests; field detection of tab kills | 61, 61.5, 18, 54, 64, 82, 84 |
| *(v2.4)* Using the GPU where it isn't needed (battery, memory, compatibility) | Routing uses the lightest backend that can express an effect: CSS/DOM → SVG → Canvas 2D → WebGL2 helper → three.js, and three.js only for real 3D (`INTERACTIVE_EFFECTS_ENGINE_SPECIFICATION.md` §7.8) | 8.3 |

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
| *(v2.1)* Time from blank to an exported interactive background | Median < 2 minutes |
| *(v2.1)* Interactive effects in the library | ≥ 20 backgrounds and ≥ 10 cursor effects at the Release 1 beta |
| *(v2.1)* Exported effects within their size budget | 100% |
| *(v2.1)* Field frame time for library effects on mid-tier phones (opt-in telemetry) | p95 < 16.7 ms |
| *(v2.2)* Time for a first-time user to compose the reference interaction from primitives | Median < 5 minutes |
| *(v2.2)* Library effects that ship as open recipes (editable primitives) where the primitives can express them | 100% |
