### Phase 66 (Keyframing): auto-key, and keyframes you can select, move, copy and paste

#### Added
- **● Auto-key** in the timeline toolbar. While it is on, any animatable property that changes on an existing layer (typing in the inspector, dragging on the canvas, nudging, an agent) also gets a keyframe at the playhead holding the new value, in the same undo step. Changing it again at the same moment replaces that keyframe. It is a hook inside the document store's commit (`setCommitHook`, `applyAutoKey`), so it covers every way of editing.
- **Selecting keyframes:** click one (the playhead goes to it), Shift or Ctrl-click to add, **Shift-drag on empty lane** to box-select. The toolbar says how many are selected.
- **Moving:** drag the selection; frame-snapped, the spacing is kept, it stops at the composition's edges, one undo step.
- **Copy keys / Paste keys** (Ctrl+C and Ctrl+V with the pointer over the timeline). One copied layer pastes onto every selected layer; several map onto the selected layers in order. Paste lands at the playhead.
- **Align to playhead**, **Distribute** (three or more, evenly in time), **Slower** and **Faster** (×1.25 and ×0.8 around the first key), **Delete keys** (Delete or Backspace). A ◆ button on each property row adds a keyframe at the playhead.
- `src/core/timeline/keyframeOps.ts`; commands `timeline.addKeyframe`, `selectKeyframes`, `selectAllKeyframes`, `clearKeyframeSelection`, `moveKeyframes`, `alignKeyframes`, `distributeKeyframes`, `scaleKeyframeTime`, `deleteKeyframes`, `copyKeyframes`, `pasteKeyframes`, `setRecord`.
- Tests: 14 unit tests (including "3 recorded changes make 3 keyframes, playback matches `evaluate()`, undo removes them") and 3 e2e journeys.

#### Not done
- Keyframes can't be moved between properties or layers by dragging (copy and paste does it). The value of an auto-keyed property is also left as the layer's own value (turning the stopwatch off keeps the last recorded value, as After Effects does).
