### Phase 19 (Incremental updates & measurement API)

The stage now re-renders only what an edit touches, keeps each layer's DOM element in a registry, and can measure layers in document space. A 500-layer document stays responsive while you edit it.

#### Added
- Per-layer rendering: `StoreRenderLayer` subscribes to its own layer and its own list of drawn children (a plan store that returns the same array while a layer's children are unchanged). A property edit re-renders that layer only; adding or removing a layer re-renders its parent and the new layer.
- `LayerNodeRegistry` (layer id → element) filled through a `nodeRef` on every render definition, and `StageRenderer`, reachable with `getStageRenderer()`: `measure(layerIds)` returns document-space rectangles, batched into one read pass per animation frame and cached until a `ResizeObserver`, a `MutationObserver` or a window resize says something moved; `measureNow` is the synchronous form.
- `bindFocusScope`: a stage frame holds the canvas focus scope while the pointer is over it.
- `/editor/stage-lab` (500 layers in the real stage) and `tests/e2e/stage-incremental.spec.ts`; unit tests for the plan store, the registry, the batching and the cache, and for structural sharing.

#### Fixed
- The stage frame no longer uses `sandbox="allow-same-origin"`: in WebKit that dropped every event to the frame, so the stage could not be clicked or typed into. A `script-src 'none'` Content-Security-Policy (response header plus meta tag) keeps scripts out instead, and a test tries three ways of running code in the frame in all three browsers. (Phase 18; see decision record 0009.)

#### Measured (quiet laptop)
- 500 layers mount in 15 ms (Chromium), 42 ms (Firefox), 34 ms (WebKit). Edits reach the stage's DOM in 2–7 ms in all three.

#### Not done
- Wheel and pinch over the frame still don't reach the canvas' zoom (Phase 20). Per-frame animation writes through the registry are Phase 57.
