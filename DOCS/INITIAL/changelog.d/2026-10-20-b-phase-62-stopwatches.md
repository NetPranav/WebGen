### Phase 62 (Twirl-downs & stopwatches): open a layer, click a stopwatch, start keyframing

In the Layer Timeline each layer opens into groups and properties, and each property has a stopwatch. Turning it on starts keyframing; turning it off removes the keyframes. U shows only what is animated.

#### Added
- A **P** twirl on every layer row opens its six groups: Transform, Appearance, Effects, States, Behaviours and Links. Transform lists Position X and Y, Scale (and X, Y), Rotation and Skew X and Y; Appearance lists Opacity, Corner radius, Fill colour, Border colour and Border width (only what the layer's kind allows). Effects, States, Behaviours and Links list what the layer has.
- A stopwatch on each property row. On: one keyframe at the playhead holding the current value (what the layer shows there, animation included), in the layer's first clip in the composition or a new clip named "Keyframes" that covers the composition; a keyframe later than the clip's end lengthens the clip. Off: the property's tracks are removed (an empty "Keyframes" clip goes too). Each is one undo step and survives save and reload.
- Keyframe diamonds on the property's row, placed through the layer's bar (click one to move the playhead to it), and the property's value at the playhead (ten times a second) for animated properties.
- **U** over the timeline reveals only the animated properties of the selected layers; pressing it again returns to how the twirls were; a quick second press (UU) shows the modified ones (animated, or changed from the kind's default).
- Commands: `timeline.setStopwatch`, `timeline.setReveal` (typed) and `timeline.revealAnimated` (U). `buildTimelineItems`, `animatedProperties` and `setStopwatch` in `src/core/timeline/`.
- Tests: 12 unit tests (the twirl-downs, the stopwatch on and off, round trips through undo, redo and a reload through the document validator, keyframes through a moved bar, U and UU) and `tests/e2e/stopwatch.spec.ts` (twirl open, stopwatch on and off, undo, save and reload, U and UU).

#### Fixed
- The Layer Timeline now takes the `timeline` focus scope, so the transport keys (Space, J, K, L, arrows) work with the pointer over it too.

#### Not done
- Moving, copying and easing keyframes (Phases 66 and 67), twirls for nested compositions and layer markers (65), a stopwatch for properties that switch rather than blend (shadows, strings). The Effects, States, Behaviours and Links groups only list what exists.
