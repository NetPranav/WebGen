### Phase 68 (Retire the legacy animation panels), part 1: the Animation panel lives in the document

Closes most of AUD-39. The phase stays in progress (see Not done).

#### Changed
- The Content Browser's **Animation panel** now shows the **selected layer's clips**. A track in the panel is a clip; its from and to are the first and last keyframe of each property. Adding a preset, changing the trigger, the from and to values, duration, delay, easing, renaming and deleting are all document commands: one undo step each, saved with the project, exported with it. Before, the tracks were React state seeded from a constant, so a reload lost them and undo ignored them.
- With no layer selected the panel says so instead of showing a made-up "Untitled" stack. Renaming the stack renames the layer.
- `src/core/animation/stackAdapter.ts`: `stackForLayer`, `addStackTrack`, `updateStackTrack`, `setStackTrigger`, `setStackPropertyValue`, `removeStackTrack`.

#### Removed
- `INITIAL_ELEMENT_TRACKS` and the panel's local track state. A unit test greps `src` for the constant.

#### Added
- Tests: 12 unit tests (read-back with units, the kernel plays what the panel describes, each trigger goes to its composition, undo, save and reload).

#### Not done
- The Motion Sequencer panel is still next to the Layer Timeline: six e2e specs drive it, and it needs to be replaced with the timeline in them first.
- `AnimationSample` and `useProjectStore.animationSamples` are still the input of the GSAP, Vue and Git exporters, the engine runtime and validator and the Details inspector's old animation editor. Moving those onto document clips belongs with static export (Lane A, Phase 49).
