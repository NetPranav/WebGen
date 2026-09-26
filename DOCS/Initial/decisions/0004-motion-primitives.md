# Decision 0004: The Motion Primitives (MDM schema v4)

**Status:** Decided. **Date:** 2026-09-26. **Owner:** ROADMAP Phase 7 (`DOCS/Initial/ROADMAP.md`). **Code:** `src/core/document/` (`motion.ts`, `signals.ts`, `effects.ts`, `effect-definition.ts`, `graph.ts`, `kinetics.ts`, `behaviour-presets.ts`, `references.ts`, `migrations/v3-to-v4.ts`).

Phase 7 makes the Motion Document able to *express* every effect the product promises: timed, state-based, reactive, GPU, Blueprint-driven and kinetic. It adds types and validation only. The runtimes are later phases (9 for evaluation, 11 for states, 12 and 59–60 for reactivity, 61–67 for GPU effects, 72–74 for Blueprints, 88–91 for kinetics). This record lists the choices a later phase would otherwise have to guess.

## 1. One document, more collections

Schema v4 adds nine top-level collections next to `clips`, `states` and `behaviours`: `sequences`, `transitions`, `bindings`, `surfaces`, `inputTapes`, `graphs`, `effects`, `components` and `generators`. Every entity is stored by id and, where it belongs to a layer, names that layer (`layerId`; `ownerLayerId` for bindings; `groupLayerId` for generators; graphs may be frame-wide with `ownerLayerId: null`). This matches Phase 2's shape (flat records, referential checks in one validator) and keeps per-layer subscriptions (Phase 41) simple.

Deleting a layer removes everything that belongs to it or points at it (`removeLayerDependents`). The one exception is a Split group that loses a piece: the group is **detached** (it no longer claims to spell its source text) and its remaining pieces are re-indexed, because deleting one letter shouldn't delete a word.

## 2. Strictness

The new entity types are **strict**: an unknown key is a validation error. That is the gate's "no escape hatches": a document can't smuggle behaviour through fields no reader knows. The v2-era entities (layers, clips, states, keyframes, tracks) keep Zod's default, which **drops** unknown keys on parse. Making them strict would turn stored projects with a stray field into unloadable ones, and dropped keys can't act as a hidden escape hatch.

Layer values are type-checked for every property added from v4 on (the registry's `typed` flag: `render.role`, shape parameters, counters, stroke caps). Older paths are type-checked where Phase 7 introduced the check: in **state snapshots** and **keyframes**, which must match their property's value type. Layer values of older paths gain the check as Phase 22's inspector types their writers, so existing projects keep loading.

## 3. Easing is a string grammar

Clip and keyframe easings stay strings, which is what GSAP, CSS and Motion users type and what the 51 presets already store. `parseEasing()` defines the grammar and gives the kernel (9.1) structure: `linear`/`none`, GSAP families with directions and parameters (`back.out(1.7)`), CSS keywords, `cubic-bezier(…)` with x in [0, 1], `steps(n[, position])`, Motion names, and springs (`spring(bounce: 0.3, time: 0.6)` or `spring(stiffness: 300, damping: 20)`). A test parses every easing literal in `src/` so the grammar can't drift from real data.

**A keyframe's `ease` is the ease of the segment that ends at it** (the GSAP `to` convention the presets were written in). The roadmap's "easing-out" is the same curve seen from the previous keyframe, so no data changes. A keyframe with `hold: true` keeps its value until the next one, and discrete properties always hold. Keyframes are sorted by time. **Two keyframes at one time are an instant jump:** the later one holds from that time. The legacy Sequencer adds keyframes at the playhead without replacing, and a jump is a real motion, so this isn't refused.

**Values are typed at the write boundary.** The store coerces every keyframe value it writes to its property's type (`coercePropertyValue`: `"20px"` → 20, `"1"` → 1, an unreadable value → the property default) and extends a clip to cover its last keyframe. So older UI that writes strings (the legacy Sequencer, retired in Phases 23/57) keeps producing valid documents. The same coercion runs in the v3 → v4 migration and in repair.

## 4. Springs have two faces

`SpringSchema` accepts a **perceptual** spring `{ bounce: 0–1, time: s }` (what Simple mode shows, Law 17) or a **physical** one `{ stiffness, damping, mass? }` (Pro). Phase 9.1 defines the 1:1 mapping. Everything that springs (transitions, behaviours, lags, effectors, home springs, the `spring` operator) takes either.

## 5. Bindings are stored structured, and the text form round-trips

A binding is stored as `{ expr: { signal, operators[] }, target, blend?, guard?, priority? }`, so the AI, the rules and the UI address fields rather than text. `parseBinding` and `formatBinding` implement engine spec §3.3's text form, and `parse(format(b))` equals `b`. Layer references are `self`, `parent` or a layer id. The text form also accepts names, which `resolveLayerRefs` turns into ids before storing.

When a binding targets a set (a tag, or a group's pieces), `self` in its signals means **each target**, so `proximity(self)` on `tag:dockItem` measures each item's own distance.

**Additions to the spec grammar** (the spec's §3 is updated to match):

| Addition | Why |
|---|---|
| `pointer.velocity` (vec2, px/s) | Spec §12.3 used it, but §3.1 didn't list it |
| A numeric literal as a constant signal (`0 \|> spring(…)`) | `spring-to` needs a constant to spring toward |
| `component(x \| y)` | Picks one axis of a vec2 chain, so `pointer.ndc` can drive `rotateY`. §9 had written this as `transform.x/y` |
| `spring(bounce: b, time: t)` | The perceptual spring (Law 17) |
| `position(pin, x \| y)` | A single-axis follow |

Model-level refusals (the rules engine adds policy on top in Phase 8):
- A continuous binding to a `layout`- or `none`-class property is refused with `[SIG_LAYOUT]` (engine spec §6, decision 0003).
- A discrete property accepts only `blend replace` (grammar 6.9).
- A uniform or param target must be declared by the target layer's surface, when the surface declares its uniforms.

## 6. Behaviours are binding presets

The behaviour catalogue keeps the PRD's names and adds `proximity`: `follow-pointer`, `magnet`, `tilt`, `proximity`, `spring-to`, `inertia`, `noise`, `loop` and `shader-uniform` (the roadmap's `uniformDriver`). Each has typed params. `behaviourToBindings()` expands a behaviour into the one reactive model:
- bindings for the continuous ones;
- a draggable **body** for `inertia` (momentum after release is physics, 91.2);
- a looping **clip** for `loop` (a timed cycle isn't a signal chain).

The inspector shows the behaviour, and Pro mode can open it into what it expands to.

## 7. Surfaces live on `effectSurface` layers

A `Surface` (role, program, passes, fallback chain ending in `poster`, cost tier, declared uniforms and params, touch and reduced-motion policies, poster) is drawn by a layer of the new `effectSurface` archetype. There is one surface per layer. A `background` surface can't be top-level, because it fills its parent (grammar 3.F.1).

Grammar §13.3 defines six 3.F types, but the rule table doesn't know them yet, so `effectSurface` maps to the `Canvas` grammar type with a `TODO(P8)`. Phase 8 compiles §13 and remaps it by the surface's role and program.

Library effects are **definitions** outside the document (`EffectDefinitionSchema`, engine spec §11 plus PRD §5.3). Documents hold **instances**: `{ effectId, version, propOverrides, bindingOverrides, seed }`. `validateEffectInstance` checks an instance against its definition: the same major version, known props with valid values, and known binding keys.

## 8. Interaction graphs declare their pins

A graph node has a `kind` (event, action, flow, pure), a `type` from that kind's vocabulary (grammar §13.7 and §14.6, plus Blueprint flow and pure nodes), `params`, and **its own pins**. Phase 72.2 will add per-type signatures. Until then, the model checks the wiring:
- event nodes have one exec output, and action nodes have one exec input;
- a wire goes from an output to an input of the same kind, with compatible data types;
- each exec output has one wire (fan out with Sequence), and each data input has one wire;
- pure data has no cycles;
- custom events and variables are declared on the graph.

Node params that name layers (`layer`, `target`, `collider`) must resolve, including `tag:` and `Group[*]` forms.

## 9. Track K types

| Type | Where it lives |
|---|---|
| `render.role` | A registry property (content, helper) |
| Pins | `Layer.pins` (custom points in px or %). The 10 preset pins always exist and can't be redefined |
| Tags | `Layer.tags` |
| Follow, Field, Effector, Collider and Body | Components, one of each per layer except effectors, which stack in `order` |
| Split and Clone groups | Generators |

The group layer's children are **exactly** its pieces, in index order (grammar 3.G). A Split that isn't detached must spell its source text: graphemes without whitespace for letters, words for words. Per-piece `count` is the number of pieces and isn't stored.

An effector needs a field on the same layer (grammar 14.4). Input-family layers can't be dynamic bodies. A pointer Follow must declare a touch behaviour (6.22).

## 10. Shapes

Rectangle, ellipse, line, polygon, star and arrow are `vector` archetypes on the SVG grammar type (3.E.2). Their geometry is the layer's frame. Fill, stroke, dash and caps are the existing `svg.*` paths, and each shape adds its own parameters: `shape.cornerRadius[.corner]`, `shape.sides`, `shape.points`, `shape.innerRadius`, `shape.vertexRadius`, `shape.startCap` and `shape.endCap`, and `shape.head*`/`shape.shaftWidth`. Integer and range constraints are checked.

A line runs across its frame's width at mid-height; rotate the frame to angle it. `shape.sides` and `shape.points` hold when keyframed, because changing them re-topologises the outline.

## 11. Migration v3 → v4

`migrateV3ToV4` makes these changes, and **reports every one**:
- adds the empty collections;
- gives behaviours typed params: the type's defaults, plus any v3 param whose name (or known alias) and type match;
- sorts keyframes (a stable sort, so equal times stay an instant jump);
- types keyframe and state values by their property (`"20px"` → 20; an unreadable value takes the property default);
- extends a clip to cover its last keyframe;
- replaces clip easings the grammar doesn't know with `power1.out`, the GSAP default;
- removes unknown keyframe eases;
- makes a stagger set exactly one of `each` and `amount`.

`loadDocument` chains v1 → v2 → v3 → v4, and `normalizeDocument` repairs the same issues in v4 data.
