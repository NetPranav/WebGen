# Decision 0002: One Time Model (Compositions for Web Triggers and AE Timelines)

**Status:** Decided. **Date:** 2026-09-26. **Owner:** ROADMAP Phase 46 (`DOCS/Initial/ROADMAP.md`). It closes AUD-36 when Phase 46's gate passes. **Code:** `src/core/document/compositions.ts`, `migrations/v4-to-v5.ts`, `references.ts`; schema v5.

The number 0002 was reserved for this record when the roadmap was written (Phase 46.2); 0003 and 0004 came first.

## 1. The problem

Before v5 there were two ideas of time and no place where they met:
- **Web triggers:** a clip starts when its layer is hovered, pressed, scrolled into view or scrolled.
- **After Effects:** a composition with a duration, fps, work area and markers, layers with time bars, and nested compositions.

An AE-style timeline (Phase 52) had nothing to draw, and the kernel (Phase 9) had no composition time to evaluate (AUD-36).

## 2. One model

**Every clip plays in exactly one composition.**

| Clip trigger | Composition | Playback |
|---|---|---|
| `mount`, `time` | **`main`** (`comp_main`, one per document): the always-playing timeline | — |
| `hover`, `focus` | an **interaction composition** | `play-reverse`: forward while the trigger holds, reversed when it ends |
| `press`, `custom` | an interaction composition | `restart`: from the start each time it fires |
| `scrollProgress` | an interaction composition | `scrub` when its `scrollTrigger.scrub` is set, otherwise `play` |
| `drag`, `pointerMove` | an interaction composition | `scrub`: the gesture's progress is the time |
| `inView` | an interaction composition | `play`: once, from the start |

An interaction composition records its trigger: `{ on, layerId, event?, playback }`. Its trigger layer is the layer whose hover, press or view it listens to. It may hold clips on other layers, so hovering a card can animate its image. `toggle` is also available for authored compositions, alternating forward and reverse on each firing.

This is the same model as AE's, not a second one. A hover interaction is a short composition that the trigger plays forward and back. A scroll interaction is a composition scrubbed by scroll progress. The timeline (Phase 52) shows interaction compositions as their own tabs, with the trigger in the tab header, so the web model stays visible.

A clip keeps its own `trigger`, and it must match its composition's: validation refuses a hover clip in `main`. This keeps every existing reader (the stage, the emitters, the legacy Sequencer) working unchanged until Phase 10 and Phase 57 move them onto compositions.

## 3. Layer time bars, stored sparsely

In a composition, a layer has `{ start, in, out, stretch, markers? }` in composition seconds:
- `start` is where the layer's own time 0 sits (AE "start time"; it may be negative);
- the layer is active from `in` (inclusive) to `out` (exclusive);
- `stretch` 2 plays at half speed.

**A layer with no entry spans the whole composition** (start 0, in 0, out = duration, stretch 1). So a new layer needs no composition write, and the Phase 7 reference documents needed no change.

A clip is placed with an `offset` from its layer's time 0. Its own `delay`, `repeat`, `repeatDelay` and `direction` then apply as before. The whole chain is pure maths and golden-tested:

```
layer time  = (t − start) / stretch        (null outside [in, out))
clip time   = clipTime(clip, layer time − offset)   → { phase: before | active | after, iteration, time }
```

At the end of the last pass a clip is `after` and holds its last frame. In a repeat delay it holds the end of the pass that just played.

## 4. Nesting

A **precomp** is a composition placed inside another with `{ start, in, out, stretch, timeRemap? }`.
- Child time is `(t − start) / stretch`.
- With a time remap, child time is the remap at that local time. Keys are linear, or step when `hold`; outside the keys the value is clamped.
- Past the child's end nothing shows, unless the child loops.

Rules for nesting:
- Only `precomp` compositions nest. `main` always plays, and interaction compositions belong to their trigger.
- Loops (a composition containing itself, directly or through others) are refused.
- A precomp placed twice shows two times at once (`compositionTimes` returns both).

Easing of time-remap keys is left to Phase 9's easing library. Phase 46 defines linear and hold, which is what AE's remap defaults to.

**Effect instances** (Phase 7.4) are compositions with exposed props:
- a definition's template may carry its own `composition` (duration, fps, loop, markers);
- an instance places that timeline with `time: { compositionId, start, stretch }`.

## 5. Markers

Compositions, layer bars and nested placements carry markers: `{ id, time, label, duration?, event?, comment? }`. A marker with an `event` fires that custom event when playback reaches it. Clips and compositions with a `custom` trigger on that event then run, so a marker can start an interaction. In export, markers become timeline labels or callbacks (Phase 27).

## 6. Keeping it consistent: the write boundary

The legacy editor writes clips and knows nothing about compositions. So `syncCompositions` runs inside the store's single `commit`, after every write, and does the following:
- keeps the main composition;
- places each unplaced clip where its trigger says (`comp_<clipId>` for a new interaction);
- moves a clip whose trigger changed;
- removes the placements, layer bars and nested placements of deleted things, and interaction compositions left empty or with no trigger layer;
- grows a composition to fit one pass of its clips (main only grows), with a work area that spanned to the end following it.

The sync writes nothing when nothing is wrong, so it never adds an empty undo step. A test checks it produces no patches on a synced document. The v4 → v5 migration, repair and `createDocumentFromLayers` use the same function.

## 7. Migration v4 → v5

The migration adds `comp_main` (at least 5 s, and long enough for one pass of each of its clips, at 60 fps), then places every clip as in §2. **Nothing else changes, so the demo renders identically:**
- a unit test loads the real v4 demo export and compares every v4 entity;
- a browser test (`composition-migration.spec.ts`) imports that export and compares it, pixel for pixel, with the native v5 demo.

Every placement is reported.

## 8. Consequences

- **Phase 9:** `evaluate(doc, compositionId, layerId, t, inputs)` resolves time through `layerBar` → `clipTime` → nesting (`compositionTimes`) before it interpolates.
- **Phase 45:** the transport's `compositionId`, `workArea` and `fps` read the composition.
- **Phase 52:** it draws these bars, markers and nested compositions.
- **Phase 72:** Blueprint `Play`, `Seek` and `Reverse` actions name a composition (`params.composition`, checked by the validator).
- **Phases 10 and 57:** the stage and emitters stop reading `clip.trigger` and read the composition's trigger. Then the duplicated field can be dropped in a later schema version.
