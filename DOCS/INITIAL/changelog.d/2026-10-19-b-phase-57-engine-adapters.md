### Phase 57 (Engine adapters & the kernel on the stage): playing and scrubbing now animate the canvas

The stage shows the transport's time. Press play, or drag the playhead, and the real layers move, eased exactly as the evaluation kernel says. Partly closes AUD-09 (the preview runs the kernel; the Web Animations adapter is Phase 58).

#### Added
- `src/core/engine/stage/`: the `EngineAdapter` interface (`mount`, `play`, `pause`, `seek`, `setInputs`, `invalidate`, `dispose`, plus capabilities), `KernelAdapter` (applies `evaluate()` to each animated layer's element), `styleWrites` (kernel output → CSS: units, one `transform` from every `transform.*` and the frame rotation, sizes never negative) and `installStageEngine`.
- `StageHost` installs the engine. It runs in the frame scheduler's `apply` phase, reads the transport, and writes through the `LayerNodeRegistry` (Phase 19). No React state, no `postMessage`.
- `/editor/stage-lab` has a "Load 10 animations" button (ten reference animations), and `StageHost` exposes `window.__LL_ENGINE__` (kernel answer, seek, play, pause) when `window.__LL_TEST__` is set.
- Tests: 14 unit tests (including the ten reference animations at five times each) and `tests/e2e/stage-engine.spec.ts` (ten animations × five times match the kernel within 0.5 px in the real stage; play moves a layer and pause holds it; scrubbing back to 0 restores the first keyframe).

#### Changed
- The stage lab page runs the transport driver itself (it has no editor shell).

#### Not done
- Routing to Web Animations (Phase 58), handing over between scrubbing and playing (Phase 59) and the parity overlay (Phase 60). Everything runs on the kernel adapter for now.
- A style the engine put back after a layer stopped animating is the value React drew when the engine first wrote it; a base-property edit made during playback on the very property being animated is drawn again by the next frame's write.

#### Shared hot spots touched
- `src/editor/stage/StageHost.tsx` (Lane A's Phase 18/19 file): one `useEffect` that installs the engine, and the test seam. No behaviour change when nothing is animated.
