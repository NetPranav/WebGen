### Phase 18 (Stage host v2: live DOM frames, no HTML strings)

The canvas stage is now a live DOM frame drawn by the Phase 17 render definitions. Editing no longer rebuilds an HTML string or reloads the frame, and the script-free frame closes the XSS exposure that decision record 0008 found.

#### Added
- `public/stage-frame.html` (a static, script-free document), `StageFrame` (an iframe with `sandbox="allow-same-origin"` and a React portal into it, with the editor's fonts copied in and the command dispatcher installed on its window) and `StageHost` (the active page drawn by `RenderTree`; clicks report the layer id).
- `frameBridge.ts`: the typed bridge for the logic sandbox (source, origin and schema checked; messages addressed to the editor's origin).
- Decision record 0009 (render host). Tests: the frame bridge, a scan of all of `src/` for wildcard `postMessage` targets, the stage's structure, and `tests/e2e/stage-host.spec.ts`.

#### Changed
- `WhiteboardCanvas` draws `StageHost`; the logic sandbox (`SandboxHost`) is full-edition only, loaded through `afterTrackPanels.tsx`, and covered by `check:bundle-scope`.
- The sandbox's frame script, `MockApiServer` and `HotReloadEngine` no longer post to `"*"`.
- The render gallery draws inside a stage frame, so it shows what the canvas shows.
- The showcase demo is drawn from layer geometry and props: it loses the old stage's body padding and container defaults.

#### Fixed
- Copied `@font-face` URLs are made absolute (relative ones resolved to a missing path and stalled the page's `load`).

#### Not done
- The inspector's fields still don't write to the document (Phases 33–34); incremental per-layer rendering, the node registry and `renderer.measure()` are Phase 19; wheel and pinch over the frame don't reach the canvas' zoom (Phase 20).
